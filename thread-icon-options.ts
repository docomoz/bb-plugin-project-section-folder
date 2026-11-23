export const threadIcons = {
  Repeat: "Automations",
  Calendar: "Calendar",
  Clock: "Schedule",
  Zap: "Lightning",
  Bell: "Reminders",
  Star: "Star",
  Flag: "Priority",
  Bookmark: "Bookmark",
  Folder: "Folder",
  File: "Document",
  Code: "Code",
  Terminal: "Terminal",
  Bug: "Bug",
  GitBranch: "Branch",
  ChartBar: "Analytics",
  Search: "Research",
  Globe: "Web",
  MapPin: "Places",
  Palette: "Design",
  MessageSquare: "Discussion",
  Settings: "Settings",
  Bot: "Agent",
  ListTodo: "Tasks",
  Brain: "Ideas",
  Beaker: "Experiments",
  Mail: "Email",
  Mic: "Meetings",
  News01: "News",
  Link: "Links",
  Lock: "Private",
  UserRound: "People",
  Coffee: "Personal",
} as const;

export type ThreadIcon = keyof typeof threadIcons;
export type ThreadIcons = Readonly<Record<string, ThreadIcon | undefined>>;

// Keep the saved IDs while rendering names registered by BB.
const glyphByIcon: Partial<Record<ThreadIcon, string>> = {
  Bell: "BellDot",
  Flag: "Target",
  Bookmark: "Pin",
  ChartBar: "ChartColumn",
  MapPin: "Explore",
};

export function threadIconGlyph(icon: ThreadIcon): string {
  return glyphByIcon[icon] ?? icon;
}

export function isThreadIcon(value: string): value is ThreadIcon {
  return Object.hasOwn(threadIcons, value);
}
