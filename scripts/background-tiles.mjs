import { MODULE_ID, wrapMethod } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

/** Session-only, per-client: when true, only background objects are editable. */
let backgroundEditMode = false;

const enabled = () => isEnabled(SETTINGS.backgroundTiles);
const isBackground = (obj) => obj.document.getFlag(MODULE_ID, "background") === true;

/**
 * Decide whether interaction with a tile/drawing is locked by this feature.
 * @returns {boolean} true if the object must not be interacted with right now.
 */
function isLocked(obj) {
  if (!enabled()) return false;
  if (backgroundEditMode) return !isBackground(obj);
  return isBackground(obj);
}

async function toggleBackground(doc) {
  const collection = doc.parent[doc.collectionName];
  if (doc.getFlag(MODULE_ID, "background") === true) {
    const prevSort = doc.getFlag(MODULE_ID, "prevSort") ?? 0;
    await doc.update({
      sort: prevSort,
      [`flags.${MODULE_ID}.-=background`]: null,
      [`flags.${MODULE_ID}.-=prevSort`]: null
    });
  } else {
    const minSort = Math.min(0, ...collection.map((d) => d.sort));
    await doc.update({
      sort: minSort - 100,
      [`flags.${MODULE_ID}.background`]: true,
      [`flags.${MODULE_ID}.prevSort`]: doc.sort
    });
  }
}

/** Apply interactivity and the dimming cue for the current mode to one object. */
function applyLockState(obj) {
  if (!enabled()) return;
  // Let pointer events pass through locked objects so things beneath stay clickable.
  obj.eventMode = isLocked(obj) ? "none" : "static";
  // Dim non-background objects while editing the background layer, as a visual cue.
  const dim = backgroundEditMode && !isBackground(obj);
  if (obj.mesh) obj.mesh.alpha = obj.document.alpha * (dim ? 0.4 : 1);
  else obj.alpha = dim ? 0.4 : 1;
}

function backgroundLayers() {
  return [canvas.tiles, canvas.drawings].filter((l) => l);
}

function setEditMode(active) {
  backgroundEditMode = active;
  for (const layer of backgroundLayers()) {
    layer.releaseAll();
    for (const obj of layer.placeables) applyLockState(obj);
  }
}

function onRenderHUD(hud, html) {
  if (!enabled()) return;
  const el = html instanceof HTMLElement ? html : html[0];
  const doc = hud.object?.document;
  if (!doc || el.querySelector(".qolct-background")) return;

  const active = doc.getFlag(MODULE_ID, "background") === true;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `control-icon qolct-background${active ? " active" : ""}`;
  button.dataset.tooltip = game.i18n.localize(
    active ? "QOLCT.HUD.RestoreFromBackground" : "QOLCT.HUD.SendToBackground"
  );
  button.innerHTML = `<i class="fas fa-layer-group"></i>`;
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    await toggleBackground(doc);
    hud.clear();
  });

  (el.querySelector(".col.left") ?? el).appendChild(button);
}

function onGetSceneControlButtons(controls) {
  if (!enabled()) return;
  for (const name of ["tiles", "drawings"]) {
    const control = controls[name];
    if (!control?.tools) continue;
    control.tools.qolctBackgroundMode = {
      name: "qolctBackgroundMode",
      order: 100,
      title: "QOLCT.Controls.BackgroundMode",
      icon: "fas fa-layer-group",
      toggle: true,
      active: backgroundEditMode,
      onChange: (event, active) => setEditMode(active)
    };
  }
}

function onUpdateDocument(doc, changes) {
  const obj = doc.object;
  if (!obj) return;
  if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) applyLockState(obj);
}

export function init() {
  Hooks.on("renderTileHUD", onRenderHUD);
  Hooks.on("renderDrawingHUD", onRenderHUD);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
  for (const type of ["Tile", "Drawing"]) {
    Hooks.on(`refresh${type}`, applyLockState);
    // Core activates interaction (eventMode = "static") after the draw hook,
    // so defer our application until that synchronous block has finished.
    Hooks.on(`draw${type}`, (obj) => queueMicrotask(() => applyLockState(obj)));
    Hooks.on(`update${type}`, onUpdateDocument);
    for (const method of ["_canControl", "_canHover", "_canDrag"]) {
      wrapMethod(`foundry.canvas.placeables.${type}.prototype.${method}`, function (wrapped, ...args) {
        if (isLocked(this)) return false;
        return wrapped(...args);
      });
    }
  }
}
