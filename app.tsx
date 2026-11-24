import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  definePluginApp,
  experimental_Icon as Icon,
  experimental_useSidebarThreads,
  useBbContext,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import type { FolderKind, ProjectFolder, SectionPlacement, rpcContract } from "./server";
import { folderIcons, type FolderIcon } from "./folder-icons";
import { manageFolderLayout } from "./layout";
import { SidebarLoadMore } from "./sidebar-load-more";
import { NO_MACHINE, ThreadFilters, threadGroupKey, type ThreadFilter } from "./thread-filters";
import { changeIconAction, ThreadIconPickerOverlay } from "./thread-icon-picker";
import { SidebarThreadIcons, useThreadIcons } from "./thread-icons";
import "./app.css";

const collapseKey = "project-section-folder:collapsed";

function FolderNameForm({ name, defaultName, onSave }: {
  name: string;
  defaultName: string;
  onSave: (name: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const value = draft ?? name;
  const nextName = value.trim() || null;
  const canSave = !saving && (nextName ?? defaultName) !== name;

  return (
    <form className="project-section-folder__name-form" onSubmit={(event) => {
      event.preventDefault();
      if (!canSave) return;
      setSaving(true);
      setFailed(false);
      void onSave(nextName).then(
        () => setDraft(null),
        () => setFailed(true),
      ).finally(() => setSaving(false));
    }}>
      <label htmlFor="project-section-folder-name">Folder name</label>
      <div className="project-section-folder__name-controls">
        <input
          id="project-section-folder-name"
          type="text"
          value={value}
          placeholder={defaultName}
          maxLength={80}
          readOnly={saving}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={!canSave}>Save</button>
      </div>
      {failed && <p className="project-section-folder__error" role="alert">Couldn't save the folder name. Try again.</p>}
    </form>
  );
}

function FolderIconPicker({ icon, onSave }: {
  icon: FolderIcon | null;
  onSave: (icon: FolderIcon | null) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const choices = [null, ...folderIcons];

  return (
    <details className="project-section-folder__icon-picker">
      <summary>
        <span>Folder icon</span>
        <Icon name={icon ?? "Minus"} aria-hidden />
        <Icon name="ChevronRight" className="project-section-folder__icon-chevron" aria-hidden />
      </summary>
      <div className="project-section-folder__icon-options" role="group" aria-label="Folder icon" aria-busy={saving}>
        {choices.map((choice) => {
          const label = choice === "Zap" ? "Lightning" : choice ?? "No icon";
          return (
            <button
              key={choice ?? "none"}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={choice === icon}
              aria-disabled={saving}
              onClick={() => {
                if (saving || choice === icon) return;
                setSaving(true);
                setFailed(false);
                void onSave(choice)
                  .catch(() => setFailed(true))
                  .finally(() => setSaving(false));
              }}
            >
              <Icon name={choice ?? "Minus"} aria-hidden />
            </button>
          );
        })}
      </div>
      {failed && <p className="project-section-folder__error" role="alert">Couldn't save the folder icon. Try again.</p>}
    </details>
  );
}

function ProjectSectionFolder() {
  const rpc = useRpc<typeof rpcContract>();
  const threadIcons = useThreadIcons();
  const connection = useRealtimeConnectionState();
  const { projects, sections, threads, experimental_hosts: hosts } = experimental_useSidebarThreads();
  const { threadId } = useBbContext();
  const previousThread = useRef<string | null>(null);
  const [folder, setFolder] = useState<ProjectFolder | null>(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapseKey) !== "false");
  const [showMembership, setShowMembership] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [kind, setKind] = useState<FolderKind | null>(null);
  const [host] = useState(() => document.createElement("div"));
  const [filterHost] = useState(() => document.createElement("div"));
  const [resultsHost] = useState(() => document.createElement("div"));
  const layout = useRef<ReturnType<typeof manageFolderLayout> | null>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const pendingMove = useRef(false);
  const configured = folder !== null;

  useEffect(() => {
    let current = true;
    if (connection !== "connected") return;
    void rpc.call("getFolder", null).then(
      (value) => { if (current) setFolder(value); },
      (reason: unknown) => console.warn("[project-section-folder]", reason),
    );
    return () => { current = false; };
  }, [connection, rpc]);
  useRealtime("folder-changed", (value) => {
    if (value && typeof value === "object" && "top" in value && "members" in value &&
      Array.isArray(value.top) && Array.isArray(value.members)) {
      setFolder(value as ProjectFolder);
    }
  });

  const memberships = useMemo(() => ({
    section: new Set(folder?.members),
    project: new Set(folder?.projectMembers),
    machine: new Set(folder?.machineMembers),
  }), [folder]);
  const top = useMemo(() => new Set(folder?.top), [folder]);
  const machines = useMemo(() => {
    const items = new Map(hosts?.map(({ id, name }) => [id, name]));
    for (const thread of threads) {
      if (thread.isArchived || thread.isHidden || thread.isPinned) continue;
      if (thread.host) {
        if (!items.has(thread.host.id)) items.set(thread.host.id, thread.host.name);
      } else {
        items.set(NO_MACHINE, "No machine");
      }
    }
    return Array.from(items, ([id, name]) => ({ id, name }));
  }, [hosts, threads]);
  const onCollapse = useCallback((value: boolean) => {
    localStorage.setItem(collapseKey, String(value));
    setCollapsed(value);
    if (value) setShowMembership(false);
  }, []);

  const activeThread = threads.find((thread) => thread.id === threadId);
  const activeMember = activeThread ? threadGroupKey(activeThread, kind) : null;
  const membership = memberships[kind ?? "section"];
  useEffect(() => {
    if (!folder || !kind || (threadId && !activeThread)) return;
    const selection = `${kind}:${threadId ?? ""}`;
    if (previousThread.current === selection) return;
    previousThread.current = selection;
    if (activeMember && membership.has(activeMember)) onCollapse(false);
  }, [activeMember, activeThread, folder, kind, membership, onCollapse, threadId]);

  const move = useCallback(({ sectionId, inFolder, placement }: {
    sectionId: string;
    inFolder: boolean;
    placement?: SectionPlacement;
  }) => {
    if (pendingMove.current) return;
    pendingMove.current = true;
    setPending(true);
    setError("");
    const input = { sectionId, inFolder, ...(placement ? { placement } : {}) };
    void rpc.call("setMembership", input).then(
      (saved) => {
        setFolder(saved);
        if (placement && inFolder) onCollapse(false);
      },
      (reason: unknown) => {
        console.warn("[project-section-folder]", reason);
        setError("Couldn't move this item. Try again.");
      },
    ).finally(() => {
      pendingMove.current = false;
      setPending(false);
    });
  }, [onCollapse, rpc]);
  const drop = useRef(move);
  drop.current = move;

  useEffect(() => {
    if (!configured) return;
    const mounted = manageFolderLayout(host, filterHost, resultsHost, setKind, (placement) => drop.current(placement));
    layout.current = mounted;
    return () => {
      mounted.dispose();
      layout.current = null;
    };
  }, [configured, filterHost, host, resultsHost]);
  useEffect(() => {
    layout.current?.update({ memberships, top, collapsed, filtering: filter !== "all" });
  }, [configured, memberships, top, collapsed, filter]);

  if (!folder) return <SidebarThreadIcons icons={threadIcons} />;

  const editable = kind === "machine" ? machines
    : kind === "project" ? projects.filter(({ isPersonal }) => !isPersonal)
    : sections.filter(({ id }) => !top.has(id));
  const defaultFolderLabel = kind === "machine" ? "Machines" : "Projects";
  const folderLabel = (kind && folder.names?.[kind]) || defaultFolderLabel;
  const folderIcon = (kind && folder.icons?.[kind]) ?? null;
  const listLabel = kind === "machine" ? "Machines in folder"
    : kind === "project" ? "Projects in folder" : "Sections in folder";
  const needsAttention = collapsed && threads.some((thread) => {
    const id = threadGroupKey(thread, kind);
    return id && membership.has(id) && !thread.isArchived && !thread.isHidden &&
      (thread.isUnread || thread.hasPendingInteraction);
  });

  return <>
    <SidebarThreadIcons icons={threadIcons} />
    {createPortal(
      <ThreadFilters
        filter={filter}
        onFilterChange={setFilter}
        threads={threads}
        threadIcons={threadIcons}
        sections={sections}
        projects={projects}
        machines={machines}
        kind={kind}
        resultsHost={resultsHost}
      />,
      filterHost,
    )}
    {createPortal(
      <div className="project-section-folder" onKeyDown={(event) => {
        if (showMembership && event.key === "Escape") {
          event.stopPropagation();
          setShowMembership(false);
          settingsButton.current?.focus();
        }
      }}>
        <div data-project-section-drop-zone="" aria-hidden="true">Move above folder</div>
        <div className="project-section-folder__header">
          <button
            className="project-section-folder__toggle"
            type="button"
            aria-expanded={!collapsed}
            onClick={() => onCollapse(!collapsed)}
          >
            {folderIcon && <Icon name={folderIcon} className="project-section-folder__heading-icon" aria-hidden />}
            <span className="project-section-folder__title" title={folderLabel}>{folderLabel}</span>
            <Icon name="ChevronRight" className="project-section-folder__chevron" aria-hidden />
            {needsAttention && <span className="project-section-folder__activity" aria-label="Folder has unread threads or threads that need input" />}
          </button>
          <button
            ref={settingsButton}
            className="project-section-folder__settings"
            type="button"
            aria-label={`${folderLabel} folder settings`}
            title={`${folderLabel} folder settings`}
            aria-expanded={showMembership}
            aria-controls="project-section-folder-settings"
            onClick={() => setShowMembership(!showMembership)}
          >
            <Icon name="MoreHorizontal" aria-hidden />
          </button>
        </div>
        {showMembership && kind && (
          <div key={kind} id="project-section-folder-settings" className="project-section-folder__settings-panel">
            <FolderNameForm
              name={folderLabel}
              defaultName={defaultFolderLabel}
              onSave={async (name) => setFolder(await rpc.call("setFolderName", { kind, name }))}
            />
            <FolderIconPicker
              icon={folderIcon}
              onSave={async (icon) => setFolder(await rpc.call("setFolderIcon", { kind, icon }))}
            />
            <fieldset className="project-section-folder__panel" aria-busy={pending}>
              <legend>{listLabel}</legend>
              {editable.map(({ id, name }) => (
                <label key={id} title={membership.has(id) ? "Move above folder" : "Move into folder"}>
                  <input
                    type="checkbox"
                    checked={membership.has(id)}
                    onChange={(event) => move({ sectionId: id, inFolder: event.target.checked })}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </fieldset>
          </div>
        )}
        {error && <p className="project-section-folder__error" role="alert">{error}</p>}
      </div>,
      host,
    )}
  </>;
}

export default definePluginApp((app) => {
  app.slots.experimental_threadAction(changeIconAction);
  app.slots.experimental_appOverlay({ id: "thread-icon-picker", component: ThreadIconPickerOverlay });
  app.slots.experimental_appOverlay({ id: "sidebar-load-more", component: SidebarLoadMore });
  app.slots.experimental_appOverlay({
    id: "project-section-folder",
    component: ProjectSectionFolder,
  });
});
