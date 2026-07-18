# QOL Canvas Tools

Quality-of-life module for Foundry VTT v13 with three independent features, each toggleable in module settings.

## Background tile layer

- Select a tile and press the layer-group button in its HUD (right-click the tile) to **send it to the background**: it renders beneath all other tiles and becomes completely click-through — you can't select or move it by accident while working with normal tiles.
- To edit background tiles, enable the **Edit Background Tiles** toggle in the tile scene controls. While it is on, only background tiles are selectable and normal tiles are dimmed. Use the same HUD button to restore a tile from the background.

## Group rotation

When two or more **tiles** or **drawings** are selected, rotating them (mouse wheel with Shift/Ctrl, or keyboard) turns the whole group around its common center instead of spinning each object around its own axis. A single selected object rotates in place as usual. Tokens are unaffected.

## Rotation handle

Selected tiles and drawings show a small round **handle above the selection** (like in Roll20). Drag it to rotate — free rotation in 1° steps, or hold **Shift** to snap to 15°. With several objects selected the whole group turns around its common center (when group rotation is enabled).

Core Foundry shortcuts still work too: hover a selected object and scroll with **Ctrl** (15°) or **Shift** (45°).

## Token tooltips (Roll20 style)

Token Settings (and Prototype Token settings) gain a **Tooltip** section on the Identity tab: a text field and a **GM Only** checkbox. When set, hovering the token shows the note in a small white box under the token — visible to everyone, or only to the GM if the checkbox is ticked.

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this manifest URL and click Install:

```
https://github.com/HudilajnenVlad/qol-canvas-tools/releases/latest/download/module.json
```

(Requires at least one published release — push a tag like `v1.0.0` and the GitHub Action builds it automatically.)

For development, copy (or junction) the `qol-canvas-tools` folder into `FoundryVTT/Data/modules/` and enable it in your world's module management.

Works best with [libWrapper](https://foundryvtt.com/packages/lib-wrapper) installed (optional).
