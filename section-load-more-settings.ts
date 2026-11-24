export const sectionLoadMoreSettings = {
  enableLoadMore: {
    type: "boolean",
    label: "Enable Load more",
    description: "Limit the initial number of threads in each custom section and in Threads.",
    default: false,
  },
  visibleThreads: {
    type: "number",
    label: "Threads shown per section",
    description: "Top-level threads shown before Load more in Threads and custom sections.",
    default: 5,
  },
  loadMoreStep: {
    type: "number",
    label: "Threads per Load more",
    description: "Threads each Load more click reveals.",
    default: 5,
  },
  limitPinnedThreads: {
    type: "boolean",
    label: "Limit Pinned threads",
    description: "Show older pinned threads behind Load more.",
    default: true,
  },
  visiblePinnedThreads: {
    type: "number",
    label: "Pinned threads shown initially",
    description: "Top-level threads shown before Load more when the Pinned limit is enabled.",
    default: 8,
  },
} as const;
