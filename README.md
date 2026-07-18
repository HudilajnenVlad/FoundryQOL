# QOL Canvas Tools

Quality-of-life module for Foundry VTT v13 with three independent features, each toggleable in module settings.

## Background layer (tiles & drawings)

- Select a tile or drawing and press the layer-group button in its HUD (right-click the object) to **send it to the background**: it renders beneath its siblings and becomes completely click-through — you can't select or move it by accident while working with normal objects.
- To edit background objects, enable the **Edit Background Tiles** toggle in the tile or drawing scene controls. While it is on, only background objects are selectable and the rest are dimmed. Use the same HUD button to restore an object from the background.

## Group rotation

When two or more **tiles** or **drawings** are selected, rotating them (mouse wheel with Shift/Ctrl, or keyboard) turns the whole group around its common center instead of spinning each object around its own axis. A single selected object rotates in place as usual. Tokens are unaffected.

## Rotation & scale handles

Selected tiles, drawings and tokens get Roll20-style handles:

- A **round rotation knob** above the object that follows the object's rotation. Drag it to rotate with a live preview — free rotation in 1° steps, or hold **Shift** to snap to 15°. With several objects selected the whole group turns around its common center (when group rotation is enabled).
- A **square scale knob** at the bottom-right corner. Drag it to stretch or compress the whole selection uniformly, down to a small fraction of the original size (polygons and freehand drawings scale correctly; tokens resize in grid units).

When the scene has a grid, handle rotation **magnetizes to grid directions**: 45° steps on square grids, 30° steps on hexes (sides + corners); hold **Shift** for free rotation. On gridless scenes rotation is free, Shift snaps to 15°. On hex grids token resizing snaps to valid token sizes (0.5 or whole spaces).

Each knob can be hidden individually per user in the module settings.

Core Foundry shortcuts still work: hover a selected object and scroll with **Ctrl** (15°) or **Shift** (45°).

## Brush panel

A paintbrush button in the drawing tools opens a small **brush panel**: color picker + hex code field, thickness slider, and a **customizable quick-access palette** (click a swatch to use it, "+" to save the current color, right-click a swatch to remove it). It sets the defaults for new drawings — and if drawings are selected, restyles them too.

## Drawing style bar

Selecting one or more drawings shows a floating toolbar at the top of the screen: **stroke color, stroke width, fill on/off + color, opacity** — every change applies to the whole selection at once.

## Token tooltips (Roll20 style)

Token Settings (and Prototype Token settings) gain a **Tooltip** section on the Identity tab: a text field and a **GM Only** checkbox. When set, hovering the token shows the note in a small white box under the token — visible to everyone, or only to the GM if the checkbox is ticked.

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this manifest URL and click Install:

```
https://github.com/HudilajnenVlad/FoundryQOL/releases/latest/download/module.json
```

(Requires at least one published release — push a tag like `v1.0.0` and the GitHub Action builds it automatically.)

For development, copy (or junction) the `qol-canvas-tools` folder into `FoundryVTT/Data/modules/` and enable it in your world's module management.

Works best with [libWrapper](https://foundryvtt.com/packages/lib-wrapper) installed (optional).
