import type { SectionPlacement } from "./server";

export type SectionMove = {
  sectionId: string;
  inFolder: boolean;
  placement: SectionPlacement;
};

type SectionRow = { id: string; header: HTMLElement; inFolder: boolean };
type Target = Omit<SectionMove, "sectionId">;
type Drag = {
  id: string;
  header: HTMLElement;
  pointerId: number;
  x: number;
  y: number;
  active: boolean;
};

export function manageSectionDrag(host: HTMLElement, onMove: (move: SectionMove) => void) {
  let container: HTMLElement | null = null;
  let rows: SectionRow[] = [];
  let drag: Drag | null = null;
  let frame = 0;
  let pointer = { x: 0, y: 0 };
  const headers = new Set<HTMLElement>();
  let suppressClickUntil = 0;
  const controller = new AbortController();
  const { signal } = controller;
  const line = document.createElement("div");
  line.className = "project-section-drop-line";
  line.setAttribute("aria-hidden", "true");

  function clearTarget() {
    line.remove();
    host.removeAttribute("data-project-section-drop");
  }

  function end() {
    if (drag?.active) suppressClickUntil = performance.now() + 350;
    drag?.header.removeAttribute("data-project-section-drag-source");
    drag = null;
    cancelAnimationFrame(frame);
    frame = 0;
    host.removeAttribute("data-project-section-dragging");
    clearTarget();
  }

  window.addEventListener("pointerdown", (event) => {
    if (!drag) suppressClickUntil = 0;
    if (event.button !== 0 || !event.isPrimary || event.pointerType === "touch" || drag ||
      !(event.target instanceof Element)) return;
    const target = event.target;
    const row = rows.find(({ header }) => header.contains(target));
    if (!row) return;
    const control = target.closest("button, a, input, textarea, select, [contenteditable], [role=menuitem]");
    // A collapsed BB header uses an invisible full-row button for plain clicks.
    if (control && row.header.contains(control) && !control.matches('button[aria-hidden="true"][tabindex="-1"]')) return;
    // Cancel the compatibility mousedown used by BB's mouse sensor. Pointer
    // cancellation does not suppress click or double-click.
    event.preventDefault();
    event.stopPropagation();
    drag = {
      id: row.id, header: row.header, pointerId: event.pointerId,
      x: event.clientX, y: event.clientY, active: false,
    };
  }, { signal, capture: true });
  window.addEventListener("click", (event) => {
    if (event.detail === 0 || performance.now() > suppressClickUntil ||
      !(event.target instanceof Node) || !container?.contains(event.target)) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopPropagation();
  }, { signal, capture: true });

  function targetAt(x: number, y: number): Target | null {
    clearTarget();
    const bounds = container?.getBoundingClientRect();
    if (!drag || !bounds || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      return null;
    }

    const hit = document.elementFromPoint(x, y);
    if (hit?.closest("[data-project-section-drop-zone]")) {
      host.setAttribute("data-project-section-drop", "outside");
      return { inFolder: false, placement: { side: "end" } };
    }
    if (hit?.closest(".project-section-folder__header") && host.contains(hit)) {
      host.setAttribute("data-project-section-drop", "inside");
      return { inFolder: true, placement: { side: "start" } };
    }

    const row = rows.find(({ id, header }) => id !== drag?.id && header.contains(hit));
    if (!row) return null;
    const rect = row.header.getBoundingClientRect();
    const side = y < (rect.top + rect.bottom) / 2 ? "before" : "after";
    line.style.left = `${rect.left}px`;
    line.style.width = `${rect.width}px`;
    line.style.top = `${side === "before" ? rect.top : rect.bottom}px`;
    document.body.append(line);
    return { inFolder: row.inFolder, placement: { side, anchor: row.id } };
  }

  function tick() {
    frame = 0;
    if (!drag?.active || !container) return;
    const bounds = container.getBoundingClientRect();
    const { x, y } = pointer;
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      const margin = 36;
      const previous = container.scrollTop;
      if (y - bounds.top < margin) container.scrollTop -= Math.ceil((margin - y + bounds.top) / 3);
      if (bounds.bottom - y < margin) container.scrollTop += Math.ceil((margin - bounds.bottom + y) / 3);
      if (previous !== container.scrollTop) frame = requestAnimationFrame(tick);
    }
    targetAt(x, y);
  }

  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!drag.active) {
      if (Math.hypot(pointer.x - drag.x, pointer.y - drag.y) < 5) return;
      drag.active = true;
      host.setAttribute("data-project-section-dragging", "");
      drag.header.setAttribute("data-project-section-drag-source", "");
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }, { signal });
  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { id, active } = drag;
    const target = active ? targetAt(event.clientX, event.clientY) : null;
    end();
    if (target) onMove({ sectionId: id, ...target });
  }, { signal });
  window.addEventListener("pointercancel", (event) => {
    if (event.pointerId === drag?.pointerId) end();
  }, { signal });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drag) {
      event.stopPropagation();
      end();
    }
  }, { signal, capture: true });
  window.addEventListener("blur", end, { signal });

  return {
    sync(nextContainer: HTMLElement | null, nextRows: SectionRow[]) {
      container = nextContainer;
      rows = nextRows;
      const nextHeaders = new Set(rows.map(({ header }) => header));
      for (const header of headers) {
        if (nextHeaders.has(header)) continue;
        header.removeAttribute("data-project-section-draggable");
        headers.delete(header);
      }
      for (const { id, header } of rows) {
        if (headers.has(header)) continue;
        header.setAttribute("data-project-section-draggable", id);
        headers.add(header);
      }
      if (!container) end();
    },
    dispose() {
      controller.abort();
      end();
      for (const header of headers) {
        header.removeAttribute("data-project-section-draggable");
      }
    },
  };
}
