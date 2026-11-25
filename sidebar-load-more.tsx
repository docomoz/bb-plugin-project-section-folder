import { useEffect, useMemo, useRef } from "react";
import { experimental_useSidebarThreads, useSettings } from "@get-bb/plugin-sdk/app";
import { SectionLoadMore, type LoadMoreOptions } from "./section-load-more";
import { sectionLoadMoreSettings as defaults } from "./section-load-more-settings";

function positiveInt(value: unknown, fallback: number): number {
  const integer = typeof value === "number" ? Math.floor(value) : NaN;
  return integer >= 1 && integer <= 1000 ? integer : fallback;
}

function LoadMoreController({ visible, step, pinnedVisible }: LoadMoreOptions) {
  const controller = useRef<SectionLoadMore | null>(null);
  const { threads } = experimental_useSidebarThreads();
  const unreadThreadIds = useMemo(() => new Set(
    threads.filter((thread) => thread.isUnread && !thread.isHidden && !thread.isArchived)
      .map((thread) => thread.id),
  ), [threads]);

  useEffect(() => {
    // Settings updates flow through update() so expanded sections stay open.
    const instance = new SectionLoadMore({ visible, step, pinnedVisible });
    controller.current = instance;
    instance.start();
    return () => {
      instance.stop();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    controller.current?.update({ visible, step, pinnedVisible });
  }, [visible, step, pinnedVisible]);

  useEffect(() => {
    controller.current?.updateUnreadThreads(unreadThreadIds);
  }, [unreadThreadIds]);

  return null;
}

export function SidebarLoadMore() {
  const { values } = useSettings();
  if (values?.enableLoadMore !== true) return null;

  return <LoadMoreController
    visible={positiveInt(values.visibleThreads, defaults.visibleThreads.default)}
    step={positiveInt(values.loadMoreStep, defaults.loadMoreStep.default)}
    pinnedVisible={values.limitPinnedThreads === false
      ? undefined
      : positiveInt(values.visiblePinnedThreads, defaults.visiblePinnedThreads.default)}
  />;
}
