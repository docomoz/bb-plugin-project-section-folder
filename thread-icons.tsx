import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  experimental_Icon as Icon,
  experimental_THREAD_ACTION_GROUPS,
  experimental_useRpcMutation,
  experimental_useRpcQuery,
  type PluginThreadActionRegistration,
} from "@get-bb/plugin-sdk/app";
import { threadIconContract } from "./thread-icon-contract";
import { isThreadIcon, threadIconGlyph, threadIcons, type ThreadIcon, type ThreadIcons } from "./thread-icon-options";

const defaultChoice = { id: "default", label: "Provider default", icon: "RotateCcw" };
const choices = [defaultChoice, ...(Object.keys(threadIcons) as ThreadIcon[]).map((id) => ({
  id,
  label: threadIcons[id],
  icon: threadIconGlyph(id),
}))];
const emptyIcons: ThreadIcons = {};
const listSelector = '[data-sidebar="content"] [data-bb-plugin="thread-list"]';
const anchorSelector = "[data-sidebar-thread-shortcut-target][data-sidebar-rename-anchor]";

export function useThreadIcons(): ThreadIcons {
  return experimental_useRpcQuery({ contract: threadIconContract, method: "getThreadIcons", input: null }).data ?? emptyIcons;
}

function useChangeIconData() {
  const icons = useThreadIcons();
  const { mutate } = experimental_useRpcMutation({
    contract: threadIconContract,
    method: "setThreadIcon",
    optimistic({ threadId, icon }, cache) {
      cache.update("getThreadIcons", null, (current) => {
        const next = { ...current };
        if (icon === null) delete next[threadId];
        else next[threadId] = icon;
        return next;
      });
    },
  });
  return { icons, mutate };
}

export const changeIconAction: PluginThreadActionRegistration<ReturnType<typeof useChangeIconData>> = {
  id: "change-icon",
  title: "Change icon",
  icon: "Palette",
  group: experimental_THREAD_ACTION_GROUPS.organize,
  order: 95,
  useData: useChangeIconData,
  item: ({ thread, data }) => {
    const current = data.icons[thread.id];
    return {
      label: "Change icon",
      icon: "Palette",
      detail: current ? threadIcons[current] : defaultChoice.label,
      choices: { items: choices.map((choice) => ({ ...choice, selected: choice.id === (current ?? defaultChoice.id) })) },
      async run({ value }) {
        if (value === defaultChoice.id) await data.mutate({ threadId: thread.id, icon: null });
        else if (value && isThreadIcon(value)) await data.mutate({ threadId: thread.id, icon: value });
      },
    };
  },
};

export function SidebarThreadIcons({ icons }: { icons: ThreadIcons }) {
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
    const name = icons[threadId];
    return name ? createPortal(<Icon name={threadIconGlyph(name)} aria-hidden />, target, `${threadId}:${index}`) : null;
  });
}
