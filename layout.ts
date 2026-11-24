import { manageSectionDrag, type SectionMove } from "./section-drag";
import type { FolderKind } from "./server";

const listSelector = '[data-sidebar="content"] [data-bb-plugin="thread-list"]';
const groupSelector = [
  '[data-sidebar-visibility-group^="section:"]',
  '[data-sidebar-visibility-group^="project:"]',
  '[data-sidebar-visibility-group^="machine:"]',
].join(", ");
const groupAttribute = "data-sidebar-visibility-group";
type Memberships = Readonly<Record<FolderKind, ReadonlySet<string>>>;
const folderMarker = "data-project-section-folder";
const memberMarker = "data-project-section-folder-member";
const hiddenMarker = "data-project-section-folder-hidden";

function toggleSectionHeading(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
  const title = event.target.closest("span.truncate");
  if (!title?.closest(listSelector)) return;
  // The native section, project, machine and environment headings share this button.
  const toggle = title.nextElementSibling;
  if (!(toggle instanceof HTMLButtonElement) || toggle.disabled ||
    !toggle.matches("button[data-sidebar-rename-anchor][aria-expanded]")) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.type === "click" && event.detail <= 1) toggle.click();
}

export function manageFolderLayout(
  host: HTMLElement,
  filterHost: HTMLElement,
  resultsHost: HTMLElement,
  onKind: (kind: FolderKind | null) => void,
  onMove: (move: SectionMove) => void,
) {
  const marked = new Set<HTMLElement>();
  const drag = manageSectionDrag(host, onMove);
  const headingClicks = new AbortController();
  window.addEventListener("click", toggleSectionHeading, { capture: true, signal: headingClicks.signal });
  window.addEventListener("dblclick", toggleSectionHeading, { capture: true, signal: headingClicks.signal });
  let sectionList: HTMLElement | null = null;
  let newThreadButton: HTMLElement | null = null;
  let memberships: Memberships = { section: new Set(), project: new Set(), machine: new Set() };
  let topIds: ReadonlySet<string> = new Set();
  let collapsed = true;
  let filtering = false;

  function syncFilter(list: HTMLElement | null, scroller: HTMLElement | null) {
    if (sectionList !== list) {
      sectionList?.removeAttribute("data-project-section-filtering");
      sectionList = list;
    }
    const button = scroller?.parentElement?.querySelector<HTMLElement>(
      '[data-sidebar-header-slot] button[aria-label^="New thread"]',
    ) ?? null;
    if (newThreadButton !== button) {
      newThreadButton?.removeAttribute("data-project-section-new-thread");
      newThreadButton = button;
    }
    button?.setAttribute("data-project-section-new-thread", "");
    if (!list?.parentElement || !scroller) {
      filterHost.remove();
      resultsHost.remove();
      return;
    }
    if (filterHost.nextElementSibling !== scroller) scroller.before(filterHost);
    if (resultsHost.nextElementSibling !== list) list.before(resultsHost);
    resultsHost.hidden = !filtering;
    list.toggleAttribute("data-project-section-filtering", filtering);
  }

  function reset(element: HTMLElement) {
    element.removeAttribute(memberMarker);
    element.removeAttribute(hiddenMarker);
    element.style.removeProperty("--project-folder-order");
    marked.delete(element);
  }

  function sync() {
    const list = document.querySelector<HTMLElement>(listSelector);
    const scroller = list?.closest<HTMLElement>('[data-sidebar="content"]') ?? null;
    syncFilter(list, scroller);
    const firstGroup = list?.querySelector<HTMLElement>(groupSelector);
    const parent = firstGroup?.parentElement;
    const key = firstGroup?.getAttribute(groupAttribute)?.split(":")[0];
    const kind = key === "section" || key === "project" || key === "machine" ? key : null;
    onKind(kind);
    const groups = parent
      ? Array.from(parent.querySelectorAll<HTMLElement>(`:scope > :is(${groupSelector})`))
      : [];
    if (!kind || !parent || groups.length === 0) {
      drag.sync(null, []);
      host.remove();
      for (const element of marked) {
        element.removeAttribute(folderMarker);
        reset(element);
      }
      return;
    }

    const membership = memberships[kind];
    const idFor = (group: HTMLElement) => group.getAttribute(groupAttribute)?.split(":")[1];
    const members = groups.filter((group) =>
      membership.has(idFor(group) ?? ""),
    );
    const memberSet = new Set(members);
    const otherChildren = Array.from(parent.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== host && !memberSet.has(child),
    );

    // BB owns the project nodes. Insert only our header and leave React's
    // existing nodes in place, including during a reorder.
    const firstMember = members[0] ?? null;
    if (host.parentElement !== parent || host.nextElementSibling !== firstMember) {
      parent.insertBefore(host, firstMember);
    }

    const visualOrder = [...otherChildren, host, ...members];
    const nativeOrderMatches = visualOrder.every((element, index) => element === parent.children[index]);
    if (nativeOrderMatches) {
      parent.removeAttribute(folderMarker);
    } else {
      // A native drag or newly created section can temporarily interleave
      // groups. Keep the folder contiguous until the next membership change.
      parent.setAttribute(folderMarker, "");
    }

    const visible = new Set([parent, ...visualOrder]);
    for (const element of marked) {
      if (!visible.has(element)) {
        element.removeAttribute(folderMarker);
        reset(element);
      }
    }

    marked.add(parent);
    visualOrder.forEach((element, index) => {
      const member = memberSet.has(element);
      element.toggleAttribute(memberMarker, member);
      element.toggleAttribute(hiddenMarker, member && collapsed);
      if (nativeOrderMatches) element.style.removeProperty("--project-folder-order");
      else element.style.setProperty("--project-folder-order", String(index));
      marked.add(element);
    });

    const draggableRows = filtering ? [] : groups.flatMap((group) => {
      const id = idFor(group);
      if (!id || topIds.has(id) || (collapsed && memberSet.has(group))) return [];
      if (kind === "project") {
        const header = group.querySelector<HTMLElement>('[data-sidebar-project-id] [data-sidebar-sticky-tier="label"]');
        return header ? [{ id, header, inFolder: memberSet.has(group) }] : [];
      }
      if (kind === "machine") {
        const header = group.querySelector<HTMLElement>('[data-sidebar-sticky-tier="label"]');
        return header ? [{ id, header, inFolder: memberSet.has(group) }] : [];
      }
      const section = group.querySelector<HTMLElement>("[data-sidebar-section-id]");
      const header = section?.querySelector<HTMLElement>(
        ":scope > [data-sidebar-sticky-tier=label], :scope > [data-sidebar-rename-row]",
      );
      return header ? [{ id, header, inFolder: memberSet.has(group) }] : [];
    });
    drag.sync(filtering ? null : scroller, draggableRows);
  }

  let frame = 0;
  const observer = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return {
    update(state: { memberships: Memberships; top: ReadonlySet<string>; collapsed: boolean; filtering: boolean }) {
      memberships = state.memberships;
      topIds = state.top;
      collapsed = state.collapsed;
      filtering = state.filtering;
      sync();
    },
    dispose() {
      observer.disconnect();
      drag.dispose();
      headingClicks.abort();
      syncFilter(null, null);
      cancelAnimationFrame(frame);
      host.remove();
      for (const element of marked) {
        element.removeAttribute(folderMarker);
        reset(element);
      }
    },
  };
}
