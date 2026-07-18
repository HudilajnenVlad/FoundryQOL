import { MODULE_ID, wrapMethod } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

/** Session-only, per-client: when true, only background tiles are editable. */
let backgroundEditMode = false;

const enabled = () => isEnabled(SETTINGS.backgroundTiles);
const isBackground = (tile) => tile.document.getFlag(MODULE_ID, "background") === true;

/**
 * Decide whether interaction with a tile is locked by this feature.
 * @returns {boolean} true if the tile must not be interacted with right now.
 */
function isLocked(tile) {
  if (!enabled()) return false;
  if (backgroundEditMode) return !isBackground(tile);
  return isBackground(tile);
}

async function toggleBackground(tileDoc) {
  if (isBackground({ document: tileDoc })) {
    const prevSort = tileDoc.getFlag(MODULE_ID, "prevSort") ?? 0;
    await tileDoc.update({
      sort: prevSort,
      [`flags.${MODULE_ID}.-=background`]: null,
      [`flags.${MODULE_ID}.-=prevSort`]: null
    });
  } else {
    const minSort = Math.min(0, ...tileDoc.parent.tiles.map((t) => t.sort));
    await tileDoc.update({
      sort: minSort - 100,
      [`flags.${MODULE_ID}.background`]: true,
      [`flags.${MODULE_ID}.prevSort`]: tileDoc.sort
    });
  }
}

/** Apply interactivity and the dimming cue for the current mode to one tile. */
function applyLockState(tile) {
  if (!enabled()) return;
  // Let pointer events pass through locked tiles so tiles beneath stay clickable.
  tile.eventMode = isLocked(tile) ? "none" : "static";
  // Dim non-background tiles while editing the background layer, as a visual cue.
  if (tile.mesh) {
    const dim = backgroundEditMode && !isBackground(tile);
    tile.mesh.alpha = tile.document.alpha * (dim ? 0.4 : 1);
  }
}

function setEditMode(active) {
  backgroundEditMode = active;
  canvas.tiles?.releaseAll();
  for (const tile of canvas.tiles?.placeables ?? []) applyLockState(tile);
}

function onRenderTileHUD(hud, html) {
  if (!enabled()) return;
  const el = html instanceof HTMLElement ? html : html[0];
  const tileDoc = hud.object?.document;
  if (!tileDoc || el.querySelector(".qolct-background")) return;

  const active = tileDoc.getFlag(MODULE_ID, "background") === true;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `control-icon qolct-background${active ? " active" : ""}`;
  button.dataset.tooltip = game.i18n.localize(
    active ? "QOLCT.HUD.RestoreFromBackground" : "QOLCT.HUD.SendToBackground"
  );
  button.innerHTML = `<i class="fas fa-layer-group"></i>`;
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    await toggleBackground(tileDoc);
    hud.clear();
  });

  (el.querySelector(".col.left") ?? el).appendChild(button);
}

function onGetSceneControlButtons(controls) {
  if (!enabled()) return;
  const tiles = controls.tiles;
  if (!tiles?.tools) return;
  tiles.tools.qolctBackgroundMode = {
    name: "qolctBackgroundMode",
    order: 100,
    title: "QOLCT.Controls.BackgroundMode",
    icon: "fas fa-layer-group",
    toggle: true,
    active: backgroundEditMode,
    onChange: (event, active) => setEditMode(active)
  };
}

function onUpdateTile(tileDoc, changes) {
  const tile = tileDoc.object;
  if (!tile) return;
  if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) applyLockState(tile);
}

export function init() {
  Hooks.on("renderTileHUD", onRenderTileHUD);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
  Hooks.on("refreshTile", applyLockState);
  // Core activates interaction (eventMode = "static") after the drawTile hook,
  // so defer our application until that synchronous block has finished.
  Hooks.on("drawTile", (tile) => queueMicrotask(() => applyLockState(tile)));
  Hooks.on("updateTile", onUpdateTile);

  for (const method of ["_canControl", "_canHover", "_canDrag"]) {
    wrapMethod(`foundry.canvas.placeables.Tile.prototype.${method}`, function (wrapped, ...args) {
      if (isLocked(this)) return false;
      return wrapped(...args);
    });
  }
}
