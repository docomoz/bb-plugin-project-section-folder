import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  experimental_resolveThreadStatus as resolveThreadStatus,
  experimental_useProviders,
  experimental_useRpcQuery,
  useBbContext,
  type PluginSidebarProject,
  type PluginSidebarSection,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { z } from "zod";
import { FilteredThreadRow } from "./filtered-thread-row";
import type { FolderKind } from "./server";
import type { ThreadIcons } from "./thread-icon-options";

export type ThreadFilter = "all" | "active" | "waiting" | "unread";
const options: readonly { value: ThreadFilter; title: string; hint?: string }[] = [
  { value: "all", title: "All" },
  { value: "active", title: "Active" },
  { value: "waiting", title: "Input", hint: "Threads that need your input" },
  { value: "unread", title: "Unread" },
];
const emptyState: Record<Exclude<ThreadFilter, "all">, string> = {
  active: "No active threads",
  waiting: "No threads need input",
  unread: "No unread threads",
};
const rowPreferences = z.object({
  showProviderIcons: z.boolean(),
  showRowMetadata: z.boolean(),
  rowActions: z.array(z.string()),
});
const threadListContract = {
  listPreferences: { input: z.null(), output: z.object({ preferences: rowPreferences }) },
};
const defaultRowPreferences = { showProviderIcons: true, showRowMetadata: false, rowActions: ["bb--core/archive"] };

export const NO_MACHINE = "no-machine";
type NamedItem = { id: string; name: string };

export function threadGroupKey(thread: PluginSidebarThread, kind: FolderKind | null): string | null {
  if (kind === "project") return thread.projectId;
  if (kind === "machine") return thread.host?.id ?? NO_MACHINE;
  return thread.sectionId;
}

type Props = {
  filter: ThreadFilter;
  onFilterChange: (filter: ThreadFilter) => void;
  threads: readonly PluginSidebarThread[];
  threadIcons: ThreadIcons;
  sections: readonly PluginSidebarSection[];
  projects: readonly PluginSidebarProject[];
  machines: readonly NamedItem[];
  kind: FolderKind | null;
  resultsHost: HTMLElement;
};

export function ThreadFilters({ filter, onFilterChange, threads, threadIcons, sections, projects, machines, kind, resultsHost }: Props) {
  const { threadId } = useBbContext();
  const { providers } = experimental_useProviders();
  const { data, refetch } = experimental_useRpcQuery({
    contract: threadListContract,
    pluginId: "thread-list",
    method: "listPreferences",
    input: null,
    enabled: filter !== "all",
  });
  useEffect(() => {
    if (filter !== "all") void refetch();
  }, [filter, refetch]);
  const preferences = data?.preferences ?? defaultRowPreferences;
  const providersById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const matches = useMemo(() => {
    const visible = threads.filter((thread) => !thread.isHidden && !thread.isArchived);
    return {
      active: visible.filter((thread) => !thread.hasPendingInteraction && resolveThreadStatus({
        thread,
        hiddenThreads: [],
        hasUnsubmittedDraft: false,
        rowStatus: null,
      }).isWorking),
      waiting: visible.filter((thread) => thread.hasPendingInteraction),
      unread: visible.filter((thread) => thread.isUnread),
    };
  }, [threads]);

  const groups = useMemo(() => {
    const result = new Map<string | null, PluginSidebarThread[]>();
    if (filter === "all") return result;
    const ordered = [...matches[filter]].sort(
      (a, b) => b.latestAttentionAt - a.latestAttentionAt || b.updatedAt - a.updatedAt,
    );
    for (const thread of ordered) {
      const groupKey = threadGroupKey(thread, kind);
      const group = result.get(groupKey);
      if (group) group.push(thread);
      else result.set(groupKey, [thread]);
    }
    return result;
  }, [filter, kind, matches]);
  const names = useMemo(() => {
    const items = kind === "machine" ? machines
      : kind === "project" ? projects.filter(({ isPersonal }) => !isPersonal) : sections;
    return new Map(items.map(({ id, name }) => [id, name]));
  }, [kind, machines, projects, sections]);

  return (
    <div className="project-section-filters">
      <div className="project-section-filters__controls" role="group" aria-label="Thread filters">
        {options.map(({ value, title, hint }) => (
          <button
            key={value}
            type="button"
            data-thread-filter={value}
            title={hint}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {title}
            {value !== "all" && <span className="project-section-filters__count">{matches[value].length}</span>}
          </button>
        ))}
      </div>
      {filter !== "all" && createPortal(
        <div className="project-section-filters__results" data-filter-results={filter}>
          {groups.size === 0 && (
            <p role="status">{emptyState[filter]}</p>
          )}
          {[...groups].map(([sectionId, items]) => (
            <section key={sectionId ?? "threads"} data-filter-section={sectionId ?? "threads"}>
              <h3>{names.get(sectionId ?? "") ?? (kind === "machine" ? "Unknown machine" : "Threads")}</h3>
              {items.map((thread) => (
                <FilteredThreadRow
                  key={thread.id}
                  thread={thread}
                  selected={threadId === thread.id}
                  icon={threadIcons[thread.id]}
                  provider={preferences.showProviderIcons ? providersById.get(thread.providerId) : undefined}
                  showMetadata={preferences.showRowMetadata}
                  rowActions={preferences.rowActions}
                />
              ))}
            </section>
          ))}
        </div>,
        resultsHost,
      )}
    </div>
  );
}
