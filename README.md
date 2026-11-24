# Sidebar Folders

Organize sections, projects, or machines in a collapsible folder in the BB sidebar. Find active threads, threads waiting for input, or unread updates. Give each thread one of 72 icons and choose from nine colors or the default gray.

## Screenshots

| Sidebar folders and filters | Change a thread icon and color | Configure a folder |
| --- | --- | --- |
| ![Expanded Projects folder, sidebar filters, and threads with colored icons](docs/screenshots/custom-sidebar.jpg) | ![Change icon picker with an icon grid and color palette](docs/screenshots/change-icon.jpg) | ![Projects folder settings with a name, icon choices, and section checkboxes](docs/screenshots/folder-settings.jpg) |

## Install

Requires **BB 0.50.1** or later, **Plugin SDK 0.6.157** or later, and BB's built-in thread list.

In BB, open **Settings → Plugins → Install from source** and paste:

```text
git:https://github.com/docomoz/bb-plugin-project-section-folder.git@v0.2.4
```

You can also pass the same source to `bb plugin install`.

## Organize the sidebar

- **Custom** groups your BB sections. **Projects** groups projects and **Machines** groups machines. Each mode has its own folder settings.
- Drag a group by its heading onto the folder, or open **⋯** beside the folder and check the groups you want inside. To take a group out, uncheck it or drop it on **Move above folder**.
- Use **Folder name** and **Folder icon** in the same menu. Clear the name and save to restore its default. Choose **No icon** to remove the icon.
- Open **⋯ → Change icon** on a thread to choose from a grid of 72 icons and 9 optional colors besides the default gray. The grid covers strategy, meetings, digests, analytics, maps, AI, health, workouts, expenses, family, and more. On phones it switches to 8 columns with larger targets. Choose **Provider default** and save to restore the provider icon. BB saves each thread’s icon and color across windows.
- **Active** shows threads where an agent is working. **Input** shows threads waiting for a reply or confirmation. **Unread** includes unread threads in collapsed groups. **All** returns to the regular sidebar.
- Filtered rows use the same icon sizing, spacing, and thread menu as **All**. Both provider icons and custom icons appear in the filters.

The folder starts empty. It appears in modes with groups you can put inside it. Folder settings are stored on your BB server. The plugin uses BB's thread and sidebar APIs and requires no external service.

## Verify locally

```sh
npm ci
npm run check
bb plugin build .
```

To load the working copy, pass its absolute path to `bb plugin install path:/path/to/bb-plugin-project-section-folder`. If you already use the plugin, build the copy at its installed path and run `bb plugin reload project-section-folder`.

The plugin's bundled skill documents the configuration RPC.

The additional lifestyle icons are from [Lucide](https://lucide.dev/). See [its license](LICENSE-lucide).
