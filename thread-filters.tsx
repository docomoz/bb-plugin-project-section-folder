import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  experimental_ThreadActionsContextMenu as ThreadMenu,
  experimental_ThreadStatusGlyph as StatusGlyph,
  experimental_resolveThreadStatus as resolveThreadStatus,
  useBbContext,
  useBbNavigate,
  type PluginSidebarProject,
  type PluginSidebarSection,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import type { FolderKind } from "./server";

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
  sections: readonly PluginSidebarSection[];
  projects: readonly PluginSidebarProject[];
  machines: readonly NamedItem[];
  kind: FolderKind | null;
  resultsHost: HTMLElement;
};

export function ThreadFilters({ filter, onFilterChange, threads, sections, projects, machines, kind, resultsHost }: Props) {
  const navigate = useBbNavigate();
  const { threadId } = useBbContext();
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
                <ThreadMenu
                  key={thread.id}
                  thread={{
                    ...thread,
                    environment: thread.environment?.id
                      ? { id: thread.environment.id, path: thread.environment.path }
                      : null,
                  }}
                >
                  <a
                    href={thread.href}
                    data-sidebar-thread-id={thread.id}
                    data-sidebar-thread-shortcut-target=""
                    aria-current={threadId === thread.id ? "page" : undefined}
                    title={thread.displayTitle}
                    onClick={(event) => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      navigate.toThread(thread.id);
                    }}
                  >
                    <span className="project-section-filters__title">{thread.displayTitle}</span>
                    <StatusGlyph indicator={thread.indicator} size="compact" />
                  </a>
                </ThreadMenu>
              ))}
            </section>
          ))}
        </div>,
        resultsHost,
      )}
    </div>
  );
}
