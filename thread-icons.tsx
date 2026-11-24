import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { experimental_useRpcQuery } from "@get-bb/plugin-sdk/app";
import { threadIconContract } from "./thread-icon-contract";
import { ThreadIconGlyph } from "./thread-icon-glyph";
import type { ThreadIconStyles } from "./thread-icon-options";

const emptyIcons: ThreadIconStyles = {};
const listSelector = '[data-sidebar="content"] [data-bb-plugin="thread-list"]';
const anchorSelector = "[data-sidebar-thread-shortcut-target][data-sidebar-rename-anchor]";

export function useThreadIconStylesQuery() {
  return experimental_useRpcQuery({ contract: threadIconContract, method: "getThreadIconStyles", input: null });
}

export function useThreadIcons(): ThreadIconStyles {
  return useThreadIconStylesQuery().data ?? emptyIcons;
}

export function SidebarThreadIcons({ icons }: { icons: ThreadIconStyles }) {
  const [targets, setTargets] = useState<ReadonlyMap<HTMLElement, HTMLElement>>();
  useLayoutEffect(() => {
    const mounted = new Map<HTMLElement, HTMLElement>();
    let list: HTMLElement | null = null;

    function sync() {
      list = document.querySelector<HTMLElement>(listSelector);
      const keep = new Set<HTMLElement>();
      let changed = false;
      for (const anchor of Array.from(list?.querySelectorAll<HTMLElement>(anchorSelector) ?? [])) {
        if (!icons[anchor.dataset.sidebarThreadId ?? ""]) continue;
        // BB exposes a per-provider icon renderer. Mount a sibling to override only this row.
        const title = anchor.nextElementSibling?.querySelector(".bb-thread-title");
        if (!title?.parentElement) continue;
        const before = title.parentElement.querySelector(":scope > [data-sidebar-thread-provider]") ?? title;
        keep.add(anchor);
        let target = mounted.get(anchor);
        if (!target) {
          target = document.createElement("span");
          target.setAttribute("data-project-section-thread-icon", "");
          target.setAttribute("aria-hidden", "true");
          mounted.set(anchor, target);
          changed = true;
        }
        if (target.nextElementSibling !== before) before.before(target);
      }
      for (const [anchor, target] of mounted) {
        if (keep.has(anchor)) continue;
        target.remove();
        mounted.delete(anchor);
        changed = true;
      }
      if (changed) setTargets(new Map(mounted));
    }

    setTargets(undefined);
    if (Object.keys(icons).length === 0) return;
    sync();
    let frame = 0;
    const observer = new MutationObserver((records) => {
      if (frame || (list?.isConnected && !records.some(({ target }) => list?.contains(target)))) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      for (const target of mounted.values()) target.remove();
    };
  }, [icons]);

  return [...targets ?? []].map(([anchor, target], index) => {
    const threadId = anchor.dataset.sidebarThreadId ?? "";
    const style = icons[threadId];
    return style ? createPortal(<ThreadIconGlyph {...style} />, target, `${threadId}:${index}`) : null;
  });
}
