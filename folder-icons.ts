export const folderIcons = [
  "Folder",
  "Layers",
  "Star",
  "Globe",
  "Laptop",
  "Code",
  "File",
  "Palette",
  "Zap",
] as const;

export type FolderIcon = typeof folderIcons[number];
