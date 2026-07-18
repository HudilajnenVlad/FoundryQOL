import { SETTINGS, isEnabled } from "./settings.mjs";
import { unionBounds, rotatePoint, docSize } from "./group-rotation.mjs";

/** Screen-pixel distance of the rotation knob above the selection, and knob radius. */
const OFFSET = 45;
const KNOB_R = 9;
const MIN_SIZE = 8; // smallest allowed object dimension when scaling down

let hud = null;   // PIXI.Container {rotKnob, scaleKnob}
let guide = null; // PIXI.Container {gfx, label} shown while dragging
let drag = null;  // {mode, layer, objects, pivot, originals, ...}

const enabled = () => isEnabled(SETTINGS.rotationHandle);

function activeTargetLayer() {
  const layer = canvas.activeLayer;
  const dn = layer?.constructor?.documentName;
  return dn === "Tile" || dn === "Drawing" ? layer : null;
}

const isDrawing = (obj) => obj.document.documentName === "Drawing";

function destroyHud() {
  if (hud) {
    hud.destroy({ children: true });
    hud = null;
  }
}

function destroyGuide() {
  if (guide) {
    guide.destroy({ children: true });
    guide = null;
  }
}

/* -------------------------------------------- */
/*  Geometry                                    */
/* -------------------------------------------- */

/**
 * Where the rotation knob lives. For a single object it follows the object's
 * own rotation (sits above the object's rotated top edge, like Roll20); for a
 * group it sits above the axis-aligned union bounds.
 * @returns {{pos: {x,y}, stem: {x,y}, angle: number}}
 */
function rotationKnobPlacement(objects, scale) {
  if (objects.length === 1) {
    const doc = objects[0].document;
    const { w, h } = docSize(doc);
    const c = { x: doc.x + w / 2, y: doc.y + h / 2 };
    const rad = Math.toRadians(doc.rotation ?? 0);
    return {
      pos: rotatePoint({ x: c.x, y: c.y - h / 2 - OFFSET / scale }, c, rad),
      stem: rotatePoint({ x: c.x, y: c.y - h / 2 }, c, rad),
      angle: doc.rotation ?? 0
    };
  }
  const b = unionBounds(objects);
  const cx = (b.minX + b.maxX) / 2;
  return {
    pos: { x: cx, y: b.minY - OFFSET / scale },
    stem: { x: cx, y: b.minY },
    angle: 0
  };
}

/** The pivot the rotation is applied around. */
function rotationPivot(objects) {
  if (objects.length === 1) {
    const doc = objects[0].document;
    const { w, h } = docSize(doc);
    return { x: doc.x + w / 2, y: doc.y + h / 2 };
  }
  const b = unionBounds(objects);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

function captureOriginals(objects) {
  return objects.map((obj) => {
    const doc = obj.document;
    const { w, h } = docSize(doc);
    return {
      obj,
      x: doc.x,
      y: doc.y,
      rotation: doc.rotation ?? 0,
      w,
      h,
      points: isDrawing(obj) && doc.shape.points ? [...doc.shape.points] : null
    };
  });
}

/** Compute the previewed/committed state of one object for a rotation by delta. */
function rotatedState(orig, pivot, delta) {
  const rad = Math.toRadians(delta);
  const center = rotatePoint({ x: orig.x + orig.w / 2, y: orig.y + orig.h / 2 }, pivot, rad);
  return {
    x: center.x - orig.w / 2,
    y: center.y - orig.h / 2,
    rotation: (((orig.rotation + delta) % 360) + 360) % 360
  };
}

/** Compute the previewed/committed state of one object for a uniform scale about pivot. */
function scaledState(orig, pivot, factor) {
  const cx = pivot.x + (orig.x + orig.w / 2 - pivot.x) * factor;
  const cy = pivot.y + (orig.y + orig.h / 2 - pivot.y) * factor;
  const w = orig.w * factor;
  const h = orig.h * factor;
  const state = { x: cx - w / 2, y: cy - h / 2, w, h };
  if (orig.points) state.points = orig.points.map((p) => p * factor);
  return state;
}

/* -------------------------------------------- */
/*  Local (client-side) preview                 */
/* -------------------------------------------- */

function applyPreview(orig, state) {
  const doc = orig.obj.document;
  const changes = { x: state.x, y: state.y };
  if (state.rotation !== undefined) changes.rotation = state.rotation;
  if (state.w !== undefined) {
    if (isDrawing(orig.obj)) {
      changes["shape.width"] = state.w;
      changes["shape.height"] = state.h;
      if (state.points) changes["shape.points"] = state.points;
    } else {
      changes.width = state.w;
      changes.height = state.h;
    }
  }
  doc.updateSource(changes);
  orig.obj.renderFlags.set({ refresh: true });
  orig.obj.applyRenderFlags();
}

function revertPreview() {
  if (!drag) return;
  for (const orig of drag.originals) {
    applyPreview(orig, {
      x: orig.x,
      y: orig.y,
      rotation: orig.rotation,
      w: orig.w,
      h: orig.h,
      points: orig.points ?? undefined
    });
  }
}

/* -------------------------------------------- */
/*  HUD rendering                               */
/* -------------------------------------------- */

/** Create or reposition the rotation and scale knobs for the current selection. */
export function updateHandle() {
  if (drag) return; // repositioned manually during a drag
  const layer = enabled() ? activeTargetLayer() : null;
  const objects = layer?.controlled ?? [];
  if (!layer || objects.length === 0) return destroyHud();

  if (!hud || hud.parent !== layer) {
    destroyHud();
    hud = new PIXI.Container();
    hud.rotKnob = hud.addChild(new PIXI.Container());
    hud.rotKnob.gfx = hud.rotKnob.addChild(new PIXI.Graphics());
    hud.rotKnob.eventMode = "static";
    hud.rotKnob.cursor = "pointer";
    hud.rotKnob.on("pointerdown", (ev) => onDragStart(ev, "rotate"));
    hud.scaleKnob = hud.addChild(new PIXI.Container());
    hud.scaleKnob.gfx = hud.scaleKnob.addChild(new PIXI.Graphics());
    hud.scaleKnob.eventMode = "static";
    hud.scaleKnob.cursor = "nwse-resize";
    hud.scaleKnob.on("pointerdown", (ev) => onDragStart(ev, "scale"));
    layer.addChild(hud);
  }
  positionHud(objects);
}

function positionHud(objects) {
  const scale = canvas.stage.scale.x || 1;
  const r = KNOB_R / scale;

  // Rotation knob — follows the object's rotation for single selections
  const place = rotationKnobPlacement(objects, scale);
  const rot = hud.rotKnob;
  rot.position.set(place.pos.x, place.pos.y);
  rot.rotation = Math.toRadians(place.angle);
  const gfx = rot.gfx;
  gfx.clear();
  gfx.lineStyle(2 / scale, 0x000000, 0.5);
  gfx.moveTo(0, r);
  gfx.lineTo(0, OFFSET / scale);
  gfx.lineStyle(2 / scale, 0x000000, 0.9);
  gfx.beginFill(0xffffff, 0.95);
  gfx.drawCircle(0, 0, r);
  gfx.endFill();
  gfx.lineStyle(1.5 / scale, 0x000000, 0.9);
  gfx.arc(0, 0, r * 0.5, -Math.PI * 0.25, Math.PI);
  rot.hitArea = new PIXI.Circle(0, 0, r * 1.6);

  // Scale knob — bottom-right corner of the union bounds
  const b = unionBounds(objects);
  const sk = hud.scaleKnob;
  sk.position.set(b.maxX + 6 / scale, b.maxY + 6 / scale);
  const sg = sk.gfx;
  sg.clear();
  sg.lineStyle(2 / scale, 0x000000, 0.9);
  sg.beginFill(0xffffff, 0.95);
  sg.drawRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  sg.endFill();
  sk.hitArea = new PIXI.Rectangle(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
}

function drawGuide(cursor, text, from) {
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
  gfx.moveTo(from.x, from.y);
  gfx.lineTo(cursor.x, cursor.y);
  guide.label.text = text;
  guide.label.scale.set(1 / scale);
  guide.label.position.set(cursor.x, cursor.y - 12 / scale);
}

/* -------------------------------------------- */
/*  Drag handling                               */
/* -------------------------------------------- */

function normalizeDelta(degrees) {
  return ((degrees % 360) + 540) % 360 - 180;
}

function onDragStart(event, mode) {
  event.stopPropagation();
  const layer = activeTargetLayer();
  if (!layer || !layer.controlled.length) return;
  const objects = [...layer.controlled];
  const p = event.getLocalPosition(canvas.stage);
  const originals = captureOriginals(objects);

  if (mode === "rotate") {
    const pivot = rotationPivot(objects);
    drag = {
      mode, layer, objects, originals, pivot,
      startAngle: Math.atan2(p.y - pivot.y, p.x - pivot.x),
      delta: 0
    };
  } else {
    const b = unionBounds(objects);
    const pivot = { x: b.minX, y: b.minY }; // scale away from the top-left corner
    const startDist = Math.hypot(p.x - pivot.x, p.y - pivot.y) || 1;
    const minDim = Math.min(...originals.map((o) => Math.min(o.w, o.h)));
    drag = {
      mode, layer, objects, originals, pivot, startDist,
      minFactor: Math.min(1, MIN_SIZE / minDim),
      factor: 1
    };
  }
  canvas.stage.on("pointermove", onDragMove);
  canvas.stage.on("pointerup", onDragEnd);
  canvas.stage.on("pointerupoutside", onDragEnd);
}

function onDragMove(event) {
  if (!drag) return;
  const p = event.getLocalPosition(canvas.stage);
  const scale = canvas.stage.scale.x || 1;

  if (drag.mode === "rotate") {
    let delta = Math.toDegrees(Math.atan2(p.y - drag.pivot.y, p.x - drag.pivot.x) - drag.startAngle);
    delta = normalizeDelta(delta);
    delta = event.shiftKey ? delta.toNearest(15) : Math.round(delta);
    drag.delta = delta;
    for (const orig of drag.originals) applyPreview(orig, rotatedState(orig, drag.pivot, delta));
    // Keep the knob under the cursor's orbit
    if (hud) {
      const place = rotationKnobPlacement(drag.objects, scale);
      hud.rotKnob.position.set(place.pos.x, place.pos.y);
      hud.rotKnob.rotation = Math.toRadians(place.angle + (drag.objects.length > 1 ? drag.delta : 0));
      const b = unionBounds(drag.objects);
      hud.scaleKnob.position.set(b.maxX + 6 / scale, b.maxY + 6 / scale);
    }
    drawGuide(p, `${delta > 0 ? "+" : ""}${delta}°`, drag.pivot);
  } else {
    let factor = Math.hypot(p.x - drag.pivot.x, p.y - drag.pivot.y) / drag.startDist;
    factor = Math.clamp(factor, drag.minFactor, 20);
    drag.factor = factor;
    for (const orig of drag.originals) applyPreview(orig, scaledState(orig, drag.pivot, factor));
    if (hud) {
      const b = unionBounds(drag.objects);
      hud.scaleKnob.position.set(b.maxX + 6 / scale, b.maxY + 6 / scale);
      const place = rotationKnobPlacement(drag.objects, scale);
      hud.rotKnob.position.set(place.pos.x, place.pos.y);
    }
    drawGuide(p, `×${factor.toFixed(2)}`, drag.pivot);
  }
}

async function onDragEnd() {
  canvas.stage.off("pointermove", onDragMove);
  canvas.stage.off("pointerup", onDragEnd);
  canvas.stage.off("pointerupoutside", onDragEnd);
  if (!drag) return;
  const current = drag;
  destroyGuide();
  revertPreview();
  drag = null;

  if (current.mode === "rotate") {
    // Route through rotateMany so group rotation (when enabled) applies the
    // shared-center behavior and a single selected object rotates in place.
    if (current.delta) await current.layer.rotateMany({ delta: current.delta });
  } else if (current.factor !== 1) {
    const updates = current.originals.map((orig) => {
      const s = scaledState(orig, current.pivot, current.factor);
      const update = { _id: orig.obj.id, x: s.x, y: s.y };
      if (isDrawing(orig.obj)) {
        update["shape.width"] = s.w;
        update["shape.height"] = s.h;
        if (s.points) update["shape.points"] = s.points;
      } else {
        update.width = s.w;
        update.height = s.h;
      }
      return update;
    });
    await canvas.scene.updateEmbeddedDocuments(current.layer.constructor.documentName, updates);
  }
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
    hud = null; // destroyed with the canvas
    guide = null;
  });
}
