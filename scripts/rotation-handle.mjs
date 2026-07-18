import { SETTINGS, isEnabled } from "./settings.mjs";
import { unionBounds } from "./group-rotation.mjs";

/** Screen-pixel distance of the handle above the selection, and handle radius. */
const HANDLE_OFFSET = 45;
const HANDLE_RADIUS = 9;

let handle = null; // PIXI.Container with {gfx}
let guide = null;  // PIXI.Container with {gfx, label} shown while dragging
let drag = null;   // {layer, pivot, startAngle, delta}

const enabled = () => isEnabled(SETTINGS.rotationHandle);

function activeTargetLayer() {
  const layer = canvas.activeLayer;
  const dn = layer?.constructor?.documentName;
  return dn === "Tile" || dn === "Drawing" ? layer : null;
}

function destroyHandle() {
  if (handle) {
    handle.destroy({ children: true });
    handle = null;
  }
}

function destroyGuide() {
  if (guide) {
    guide.destroy({ children: true });
    guide = null;
  }
}

/** Create or reposition the rotation handle for the current selection. */
export function updateHandle() {
  if (drag) return; // don't rebuild mid-drag
  const layer = enabled() ? activeTargetLayer() : null;
  const objects = layer?.controlled ?? [];
  if (!layer || objects.length === 0) return destroyHandle();

  if (!handle || handle.parent !== layer) {
    destroyHandle();
    handle = new PIXI.Container();
    handle.gfx = handle.addChild(new PIXI.Graphics());
    handle.eventMode = "static";
    handle.cursor = "pointer";
    handle.on("pointerdown", onDragStart);
    layer.addChild(handle);
  }

  const { minX, minY, maxX } = unionBounds(objects);
  const scale = canvas.stage.scale.x || 1;
  const r = HANDLE_RADIUS / scale;
  handle.position.set((minX + maxX) / 2, minY - HANDLE_OFFSET / scale);

  const gfx = handle.gfx;
  gfx.clear();
  // Stem connecting the handle to the selection
  gfx.lineStyle(2 / scale, 0x000000, 0.5);
  gfx.moveTo(0, r);
  gfx.lineTo(0, HANDLE_OFFSET / scale);
  // Handle knob
  gfx.lineStyle(2 / scale, 0x000000, 0.9);
  gfx.beginFill(0xffffff, 0.95);
  gfx.drawCircle(0, 0, r);
  gfx.endFill();
  // Small arc hint inside the knob
  gfx.lineStyle(1.5 / scale, 0x000000, 0.9);
  gfx.arc(0, 0, r * 0.5, -Math.PI * 0.25, Math.PI);
  handle.hitArea = new PIXI.Circle(0, 0, r * 1.6);
}

function normalizeDelta(degrees) {
  return ((degrees % 360) + 540) % 360 - 180;
}

function onDragStart(event) {
  event.stopPropagation();
  const layer = activeTargetLayer();
  if (!layer || !layer.controlled.length) return;
  const { minX, minY, maxX, maxY } = unionBounds(layer.controlled);
  const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const p = event.getLocalPosition(canvas.stage);
  drag = {
    layer,
    pivot,
    startAngle: Math.atan2(p.y - pivot.y, p.x - pivot.x),
    delta: 0
  };
  canvas.stage.on("pointermove", onDragMove);
  canvas.stage.on("pointerup", onDragEnd);
  canvas.stage.on("pointerupoutside", onDragEnd);
}

function onDragMove(event) {
  if (!drag) return;
  const p = event.getLocalPosition(canvas.stage);
  let delta = Math.toDegrees(
    Math.atan2(p.y - drag.pivot.y, p.x - drag.pivot.x) - drag.startAngle
  );
  delta = normalizeDelta(delta);
  // Shift snaps to 15°, otherwise whole degrees
  delta = event.shiftKey ? delta.toNearest(15) : Math.round(delta);
  drag.delta = delta;
  drawGuide(p);
}

function drawGuide(cursor) {
  const layer = drag.layer;
  if (!guide || guide.parent !== layer) {
    destroyGuide();
    guide = new PIXI.Container();
    guide.eventMode = "none";
    guide.gfx = guide.addChild(new PIXI.Graphics());
    guide.label = guide.addChild(new PIXI.Text("", {
      fontFamily: "Signika, sans-serif",
      fontSize: 24,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 4
    }));
    guide.label.anchor.set(0.5, 1);
    layer.addChild(guide);
  }
  const scale = canvas.stage.scale.x || 1;
  const gfx = guide.gfx;
  gfx.clear();
  gfx.lineStyle(2 / scale, 0xffffff, 0.8);
  gfx.moveTo(drag.pivot.x, drag.pivot.y);
  gfx.lineTo(cursor.x, cursor.y);
  guide.label.text = `${drag.delta > 0 ? "+" : ""}${drag.delta}°`;
  guide.label.scale.set(1 / scale);
  guide.label.position.set(cursor.x, cursor.y - 12 / scale);
}

async function onDragEnd() {
  canvas.stage.off("pointermove", onDragMove);
  canvas.stage.off("pointerup", onDragEnd);
  canvas.stage.off("pointerupoutside", onDragEnd);
  if (!drag) return;
  const { layer, delta } = drag;
  drag = null;
  destroyGuide();
  // Route through rotateMany so group rotation (when enabled) applies the
  // shared-center behavior and a single selected object rotates in place.
  if (delta) await layer.rotateMany({ delta });
  updateHandle();
}

export function init() {
  const refresh = foundry.utils.debounce(updateHandle, 16);
  Hooks.on("controlTile", refresh);
  Hooks.on("controlDrawing", refresh);
  Hooks.on("refreshTile", refresh);
  Hooks.on("refreshDrawing", refresh);
  Hooks.on("canvasPan", refresh);
  Hooks.on("canvasTearDown", () => {
    drag = null;
    handle = null; // destroyed with the canvas
    guide = null;
  });
}
