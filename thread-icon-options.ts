export const lucideThreadIcons = {
  HeartPulse: "Health",
  Banknote: "Money",
  Wallet: "Expenses",
  Dumbbell: "Workout",
  Apple: "Nutrition",
  GlassWater: "Hydration",
  Moon: "Sleep",
  Footprints: "Steps",
  Bike: "Cycling",
  Flame: "Activity",
  Pill: "Medication",
  Stethoscope: "Doctors",
  Sun: "Daily routine",
  ShoppingBasket: "Groceries",
  Utensils: "Meals",
  Receipt: "Receipts",
  PiggyBank: "Savings",
  CreditCard: "Payments",
  House: "Home",
  Wrench: "Maintenance",
  Gift: "Gifts and holidays",
  Cat: "Pets",
  Leaf: "Outdoors",
  Plane: "Travel",
  CarFront: "Car",
  TrainFront: "Public transit",
  BookOpen: "Reading",
  GraduationCap: "Learning",
  Music: "Music",
  Camera: "Photography",
  Gamepad2: "Games",
  Film: "Movies and shows",
  Headphones: "Audio",
  UsersRound: "Meetings and calls",
  Salad: "Nutrition",
  Send: "Telegram",
  Radar: "Market monitoring",
  Funnel: "Conversion funnel",
  Database: "Data and queries",
  Presentation: "Slides and reviews",
  NotebookPen: "Writing and notes",
  FileCheck: "Contracts and approvals",
  Handshake: "Partnerships",
  Route: "Routes and navigation",
  Layers3: "Map layers",
  Fuel: "Fuel",
  SquareParking: "Parking",
  BedDouble: "Hotels",
  Workflow: "Integrations",
  Rocket: "Releases",
  Server: "Infrastructure",
  Smartphone: "Gadgets",
  Weight: "Body metrics",
  Landmark: "Taxes and public services",
  Gauge: "KPIs",
  Calculator: "Estimates and calculations",
  Megaphone: "Promo and marketing",
  BadgePercent: "Discounts and cashback",
  Briefcase: "Work and career",
  Sparkles: "AI and prompts",
  Puzzle: "Plugins",
  Lightbulb: "Ideas",
  ShoppingBag: "Shopping",
  HandHeart: "Family",
  Ticket: "Events and tickets",
} as const;

export const threadIcons = {
  ...lucideThreadIcons,
  Repeat: "Automations",
  Calendar: "Calendar",
  Clock: "Digests and schedules",
  Zap: "Lightning",
  Bell: "Reminders",
  Star: "Important",
  Flag: "Strategy and goals",
  Bookmark: "Bookmark",
  Folder: "Folder",
  File: "Document",
  Code: "Code and scripts",
  Terminal: "Terminal",
  Bug: "Bug",
  GitBranch: "Branch",
  ChartBar: "Analytics",
  Search: "Research",
  Globe: "Web",
  MapPin: "Places",
  Palette: "Design",
  MessageSquare: "Chats",
  Settings: "Settings",
  Bot: "Agent",
  ListTodo: "Tasks",
  Brain: "Ideas",
  Beaker: "Experiments",
  Mail: "Email",
  Mic: "Voice notes",
  News01: "News",
  Link: "Links",
  Lock: "Private",
  UserRound: "People",
  Coffee: "Personal",
} as const;

export type ThreadIcon = keyof typeof threadIcons;

// The picker follows common thread topics: one topic per desktop row of 12
// (work, product and analytics, documents and AI, development and maps, travel and leisure, health and money).
// 72 icons fill both layouts evenly: 12 × 6 on desktop and 8 × 9 on phones.
// The registry also accepts previously saved icons.
export const threadIconPickerOptions: readonly ThreadIcon[] = [
  "Flag", "Star", "ListTodo", "UsersRound", "Calendar", "Clock", "Bell", "Mail", "Send", "MessageSquare", "Lightbulb", "Briefcase",
  "News01", "Search", "Radar", "ChartBar", "Funnel", "Database", "Beaker", "Calculator", "Megaphone", "BadgePercent", "Handshake", "Presentation",
  "NotebookPen", "File", "FileCheck", "Mic", "GraduationCap", "BookOpen", "Palette", "Link", "Lock", "Sparkles", "Workflow", "Puzzle",
  "Code", "GitBranch", "Bug", "Rocket", "Server", "Settings", "MapPin", "Route", "Layers3", "Fuel", "SquareParking", "CarFront",
  "Plane", "BedDouble", "House", "Wrench", "ShoppingBasket", "ShoppingBag", "Gift", "HandHeart", "Film", "Ticket", "Music", "Smartphone",
  "Salad", "Dumbbell", "HeartPulse", "Moon", "Pill", "Stethoscope", "Footprints", "Weight", "GlassWater", "Banknote", "Wallet", "PiggyBank",
];

export const threadIconColors = {
  red: { label: "Red", css: "light-dark(#b91c1c, #f87171)" },
  orange: { label: "Orange", css: "light-dark(#c2410c, #fb923c)" },
  amber: { label: "Gold", css: "light-dark(#a16207, #fbbf24)" },
  green: { label: "Green", css: "light-dark(#15803d, #4ade80)" },
  teal: { label: "Teal", css: "light-dark(#0f766e, #2dd4bf)" },
  cyan: { label: "Cyan", css: "light-dark(#0e7490, #22d3ee)" },
  blue: { label: "Blue", css: "light-dark(#1d4ed8, #60a5fa)" },
  violet: { label: "Violet", css: "light-dark(#6d28d9, #a78bfa)" },
  pink: { label: "Pink", css: "light-dark(#be185d, #f472b6)" },
} as const;

export type ThreadIconColor = keyof typeof threadIconColors;
export type ThreadIconStyle = { icon: ThreadIcon; color: ThreadIconColor | null };
export type ThreadIconStyles = Readonly<Record<string, ThreadIconStyle | undefined>>;

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
