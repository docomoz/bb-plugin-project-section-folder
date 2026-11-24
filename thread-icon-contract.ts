import { z } from "zod";
import { threadIconColors, threadIcons, type ThreadIcon, type ThreadIconColor } from "./thread-icon-options";

const threadId = z.string().regex(/^thr_[a-zA-Z0-9_-]+$/);
const threadIcon = z.enum(Object.keys(threadIcons) as ThreadIcon[]);
const threadIconColor = z.enum(Object.keys(threadIconColors) as ThreadIconColor[]).nullable();
export const threadIconsTag = "thread-icons";

export const threadIconContract = {
  getThreadIcons: {
    input: z.null(),
    output: z.record(threadId, threadIcon),
    tags: () => [threadIconsTag],
  },
  getThreadIconStyles: {
    input: z.null(),
    output: z.record(threadId, z.object({ icon: threadIcon, color: threadIconColor })),
    tags: () => [threadIconsTag],
  },
  setThreadIcon: {
    input: z.object({ threadId, icon: threadIcon.nullable(), color: threadIconColor.optional() }).strict(),
    output: z.null(),
  },
};
