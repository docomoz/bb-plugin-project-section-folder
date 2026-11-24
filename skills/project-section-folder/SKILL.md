---
name: project-section-folder
description: Manage two-level folders and thread filters in the BB sidebar.
---

The folder groups user sections in Custom mode, BB projects in Projects mode, and machines in Machines mode. Each mode has separate membership and order. New installations start with an empty folder. The stock thread list shows All, Active, Input, and Unread in each mode.

Drag an item by its heading onto the folder to put it inside. Drop it on Move above folder to move it out. The insertion line shows where a drop next to another heading will place the item. The folder menu also controls membership. The filters include threads in collapsed groups.

To rename a folder, open its menu and save a new Folder name. Clear the field and save to restore the default. Each mode has its own name.

Open Folder icon in the same menu to choose an icon for the current mode. The choice saves immediately. No icon removes it.

Open **Change icon** in a thread's **⋯** or right-click menu to choose a sidebar icon and color. Icons that are no longer in the grid stay valid for threads that already use them. Choose **Provider default** and save to clear the override.

`bb plugin rpc call project-section-folder getFolder --json` reads the configuration. `configureFolder` accepts `{"top":["sec_..."],"members":["sec_..."]}`. Resolve sections with `bb thread section list --json` before writing. These changes affect layout and the chronological section order.
