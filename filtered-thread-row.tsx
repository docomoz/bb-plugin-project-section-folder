import { useState, type CSSProperties } from "react";
import {
  experimental_Icon as Icon,
  experimental_ProviderIcon as ProviderIcon,
  experimental_ThreadActionsContextMenu as ContextMenu,
  experimental_ThreadActionsMenu as ActionsMenu,
  experimental_ThreadRowMetadata as RowMetadata,
  experimental_ThreadStatusGlyph as StatusGlyph,
  experimental_resolveThreadStatus as resolveThreadStatus,
  experimental_useThreadActions,
  ThreadTitle,
  useBbNavigate,
  useSidebarThreadDraft,
  useSidebarThreadRowStatus,
  useSidebarThreadShortcut,
  type PluginProvidersState,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { threadIconGlyph, type ThreadIcon } from "./thread-icon-options";

type Props = {
  thread: PluginSidebarThread;
  provider?: PluginProvidersState["providers"][number];
  icon?: ThreadIcon;
  selected: boolean;
  showMetadata: boolean;
  rowActions: readonly string[];
};

export function FilteredThreadRow({ thread, provider, icon, selected, showMetadata, rowActions }: Props) {
  const navigate = useBbNavigate();
  const shortcut = useSidebarThreadShortcut(thread.id);
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  const { hasUnsubmittedDraft } = useSidebarThreadDraft(thread.id);
  const status = resolveThreadStatus({ thread, hiddenThreads: [], hasUnsubmittedDraft, rowStatus });
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const actionTarget = {
    ...thread,
    environment: thread.environment?.id
      ? { id: thread.environment.id, path: thread.environment.path }
      : null,
  };
  const actions = experimental_useThreadActions(actionTarget, { keys: rowActions })
    .filter(({ action }) => !action.choices);

  return (
    <ContextMenu thread={actionTarget} onOpenChange={setContextOpen}>
      <div
        className="project-section-filters__row bb-sidebar-hover-actions-row"
        data-project-section-filter-row=""
        data-selected={selected || undefined}
        data-menu-open={menuOpen || contextOpen || undefined}
        style={{ "--bb-sidebar-hover-actions-inset": `${30 * actions.length}px` } as CSSProperties}
      >
        <a
          className="project-section-filters__link bb-sidebar-hover-actions-inset"
          href={thread.href}
          data-sidebar-thread-id={thread.id}
          data-sidebar-thread-shortcut-target=""
          aria-current={selected ? "page" : undefined}
          aria-label={hasUnsubmittedDraft ? `Open ${thread.displayTitle} (unsubmitted draft)` : `Open ${thread.displayTitle}`}
          aria-keyshortcuts={shortcut?.ariaKeyshortcuts}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigate.toThread(thread.id);
          }}
        >
          <span className="project-section-filters__title-line">
            {icon ? (
              <span data-project-section-thread-icon="" aria-hidden="true"><Icon name={threadIconGlyph(icon)} /></span>
            ) : provider && (
              <span className="project-section-filters__provider" data-sidebar-thread-provider={provider.id} title={provider.displayName}>
                <ProviderIcon providerKind="agent" provider={provider} aria-hidden />
              </span>
            )}
            <span className="bb-thread-title" title={thread.displayTitle}><ThreadTitle threadId={thread.id} /></span>
          </span>
          {showMetadata && <span className="project-section-filters__metadata"><RowMetadata thread={thread} /></span>}
        </a>
        <span className="project-section-filters__trailing" data-sidebar-thread-trailing="">
          {shortcut ? <kbd className="project-section-filters__shortcut">{shortcut.label}</kbd> : <>
            <span className="project-section-filters__status bb-sidebar-hover-actions-fade" data-sidebar-hover-actions-open={menuOpen || undefined}>
              <StatusGlyph indicator={status.indicator} rowStatus={status.rowStatus} />
            </span>
            <span className="project-section-filters__actions bb-sidebar-hover-actions" data-sidebar-hover-actions-open={menuOpen || undefined}>
              {actions.map(({ key, action }) => (
                <button key={key} type="button" disabled={action.disabled} title={action.label} aria-label={action.label} onClick={() => void action.run()}>
                  <Icon name={action.icon} aria-hidden />
                </button>
              ))}
              <ActionsMenu
                thread={actionTarget}
                side="right"
                align="start"
                sideOffset={8}
                onOpenChange={setMenuOpen}
                trigger={(props) => (
                  <button {...props} type="button" aria-label="Thread actions" data-thread-actions-trigger="">
                    <Icon name="MoreHorizontal" aria-hidden />
                  </button>
                )}
              />
            </span>
          </>}
        </span>
      </div>
    </ContextMenu>
  );
}
