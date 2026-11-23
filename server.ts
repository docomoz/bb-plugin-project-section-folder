import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { folderIcons } from "./folder-icons";
import { threadIconContract, threadIconsTag } from "./thread-icon-contract";
import type { ThreadIcon } from "./thread-icon-options";

const sectionId = z.string().regex(/^sec_[a-zA-Z0-9_-]+$/);
const projectId = z.string().regex(/^proj_[a-zA-Z0-9_-]+$/);
const machineId = z.string().regex(/^(host_[a-zA-Z0-9_-]+|no-machine)$/);
const itemId = z.union([sectionId, projectId, machineId]);
const sectionFolderSchema = z
  .object({ top: z.array(sectionId).max(100), members: z.array(sectionId).max(1000) })
  .strict();
const folderKind = z.enum(["section", "project", "machine"]);
const folderName = z.string().trim().min(1).max(80);
const folderIcon = z.enum(folderIcons);
const folderSchema = sectionFolderSchema.extend({
  projectMembers: z.array(projectId).max(1000).default([]),
  machineMembers: z.array(machineId).max(1000).default([]),
  names: z.partialRecord(folderKind, folderName).default({}),
  icons: z.partialRecord(folderKind, folderIcon).default({}),
});
export type ProjectFolder = z.infer<typeof folderSchema>;
export type FolderKind = z.infer<typeof folderKind>;

const preferenceSchema = z.object({
  preferences: z.object({
    manualSectionOrder: z.array(z.string()),
    sectionOrder: z.array(z.string()),
    machineSectionOrder: z.array(z.string()),
  }),
});
const mode = {
  section: { preference: "manualSectionOrder", legacyGroup: "sections", key: "members" },
  project: { preference: "sectionOrder", legacyGroup: "projects", key: "projectMembers" },
  machine: { preference: "machineSectionOrder", legacyGroup: "machines", key: "machineMembers" },
} as const;
const folderKey = "project-folder";
const placementSchema = z.discriminatedUnion("side", [
  z.object({ side: z.enum(["start", "end"]) }).strict(),
  z.object({ side: z.enum(["before", "after"]), anchor: itemId }).strict(),
]);
export type SectionPlacement = z.infer<typeof placementSchema>;

export const rpcContract = defineRpcContract({
  getFolder: {
    input: z.null(),
    output: folderSchema,
  },
  configureFolder: {
    input: sectionFolderSchema,
    output: folderSchema,
  },
  setFolderName: {
    input: z.object({ kind: folderKind, name: folderName.nullable() }).strict(),
    output: folderSchema,
  },
  setFolderIcon: {
    input: z.object({ kind: folderKind, icon: folderIcon.nullable() }).strict(),
    output: folderSchema,
  },
  ...threadIconContract,
  setMembership: {
    input: z.object({ sectionId: itemId, inFolder: z.boolean(), placement: placementSchema.optional() }).strict(),
    output: folderSchema,
  },
});

function kindOf(id: string): FolderKind {
  if (id.startsWith("sec_")) return "section";
  if (id.startsWith("proj_")) return "project";
  return "machine";
}

export default function projectSectionFolder(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, [
    "CREATE TABLE thread_icons (thread_id TEXT PRIMARY KEY, icon TEXT NOT NULL)",
  ]);
  const readThreadIcons = db.prepare<[], { thread_id: string; icon: ThreadIcon }>(
    "SELECT thread_id, icon FROM thread_icons",
  );
  const saveThreadIcon = db.prepare<[string, ThreadIcon]>(`
    INSERT INTO thread_icons (thread_id, icon) VALUES (?, ?)
    ON CONFLICT (thread_id) DO UPDATE SET icon = excluded.icon
  `);
  const deleteThreadIcon = db.prepare<[string]>("DELETE FROM thread_icons WHERE thread_id = ?");

  bb.events.on("thread.deleted", ({ thread }) => {
    if (deleteThreadIcon.run(thread.id).changes) bb.rpc.experimental_invalidate([threadIconsTag]);
  });

  async function getFolder(): Promise<ProjectFolder> {
    const value = await bb.storage.kv.get(folderKey);
    const parsed = folderSchema.safeParse(value);
    return parsed.success ? parsed.data : folderSchema.parse({ top: [], members: [] });
  }

  async function persistFolder(folder: ProjectFolder): Promise<ProjectFolder> {
    await bb.storage.kv.set(folderKey, folder);
    bb.realtime.publish("folder-changed", folder);
    return folder;
  }

  async function itemIds(kind: FolderKind): Promise<string[]> {
    switch (kind) {
      case "section":
        return (await bb.sdk.threadSections.list()).map(({ id }) => id);
      case "project":
        return (await bb.sdk.projects.list()).map(({ id }) => id).filter((id) => id !== "proj_personal");
      case "machine":
        return [...(await bb.sdk.hosts.list()).map(({ id }) => id), "no-machine"];
    }
  }

  async function saveFolder(
    folder: ProjectFolder,
    move?: { id: string; placement?: SectionPlacement },
  ): Promise<ProjectFolder> {
    const kind = move ? kindOf(move.id) : "section";
    const { preference, legacyGroup, key } = mode[kind];
    const items = await itemIds(kind);
    const valid = new Set(items);
    const top = kind === "section" ? [...new Set(folder.top)].filter((id) => valid.has(id)) : [];
    const members = [...new Set(folder[key])].filter((id) => valid.has(id) && !top.includes(id));

    const current = await bb.sdk.plugins.callRpc({
      pluginId: "thread-list",
      method: "listPreferences",
      input: null,
      outputSchema: preferenceSchema,
    });
    const previousOrder = current.preferences[preference];
    const keyFor = (id: string) => `${kind}:${id}`;
    const itemKeys = items.map(keyFor);
    const matching = new Set(["pinned", "threads", ...itemKeys]);
    const order = [...new Set([
      ...previousOrder.flatMap((key) => key === legacyGroup ? itemKeys : matching.has(key) ? [key] : []),
      ...matching,
    ])];
    const topKeys = top.map(keyFor);
    const memberKeys = new Set(members.map(keyFor));
    const fixed = topKeys.length > 0 ? ["pinned", "threads", ...topKeys] : [];
    const outside = order.filter((key) => !memberKeys.has(key) && !fixed.includes(key));
    const inside = order.filter((key) => memberKeys.has(key));
    if (move && !valid.has(move.id)) throw new Error("This item is no longer available.");
    if (move?.placement) {
      const key = keyFor(move.id);
      const group = memberKeys.has(key) ? inside : outside;
      const index = group.indexOf(key);
      if (index === -1) throw new Error("This item is no longer available.");
      const placement = move.placement;
      if ("anchor" in placement) {
        const anchor = keyFor(placement.anchor);
        if (anchor === key || !group.includes(anchor)) throw new Error("The drop target has changed.");
        group.splice(index, 1);
        group.splice(group.indexOf(anchor) + Number(placement.side === "after"), 0, key);
      } else {
        group.splice(index, 1);
        group.splice(placement.side === "start" ? 0 : group.length, 0, key);
      }
    }
    const nextOrder = [
      ...fixed,
      ...outside,
      ...inside,
    ];
    if (nextOrder.join() !== previousOrder.join()) {
      await bb.sdk.plugins.callRpc({
        pluginId: "thread-list",
        method: "setPreference",
        input: { key: preference, value: nextOrder },
        outputSchema: z.object({ key: z.literal(preference), value: z.array(z.string()) }),
      });
    }
    return persistFolder({ ...folder, [key]: members, ...(kind === "section" ? { top } : {}) });
  }

  // Start each change from the latest state, including changes from other windows.
  let pending: Promise<unknown> = Promise.resolve();
  function change(operation: () => Promise<ProjectFolder>) {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }

  bb.rpc.register(rpcContract, {
    getFolder,
    getThreadIcons: () => Object.fromEntries(readThreadIcons.all().map(({ thread_id, icon }) => [thread_id, icon])),
    setThreadIcon: async ({ threadId, icon }) => {
      if (icon === null) deleteThreadIcon.run(threadId);
      else {
        const thread = await bb.sdk.threads.get({ threadId });
        if (thread.deletedAt !== null) throw new Error("This thread is no longer available.");
        saveThreadIcon.run(threadId, icon);
      }
      bb.rpc.experimental_invalidate([threadIconsTag]);
      return null;
    },
    configureFolder: (folder) => change(async () => saveFolder({ ...await getFolder(), ...folder })),
    setFolderName: ({ kind, name }) => change(async () => {
      const current = await getFolder();
      const names = { ...current.names };
      if (name === null) delete names[kind];
      else names[kind] = name;
      return persistFolder({ ...current, names });
    }),
    setFolderIcon: ({ kind, icon }) => change(async () => {
      const current = await getFolder();
      const icons = { ...current.icons };
      if (icon === null) delete icons[kind];
      else icons[kind] = icon;
      return persistFolder({ ...current, icons });
    }),
    setMembership: ({ sectionId, inFolder, placement }) => change(async () => {
      const current = await getFolder();
      if (current.top.includes(sectionId)) return current;
      const key = mode[kindOf(sectionId)].key;
      const members = new Set(current[key]);
      if (inFolder) members.add(sectionId);
      else members.delete(sectionId);
      return saveFolder(
        { ...current, [key]: [...members] },
        { id: sectionId, placement },
      );
    }),
  });
}
