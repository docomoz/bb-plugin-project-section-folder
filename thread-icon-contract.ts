import { z } from "zod";
import { threadIcons, type ThreadIcon } from "./thread-icon-options";

const threadId = z.string().regex(/^thr_[a-zA-Z0-9_-]+$/);
const threadIcon = z.enum(Object.keys(threadIcons) as ThreadIcon[]);
export const threadIconsTag = "thread-icons";

export const threadIconContract = {
  getThreadIcons: {
    input: z.null(),
    output: z.record(threadId, threadIcon),
    tags: () => [threadIconsTag],
  },
  setThreadIcon: {
    input: z.object({ threadId, icon: threadIcon.nullable() }).strict(),
    output: z.null(),
  },
};
