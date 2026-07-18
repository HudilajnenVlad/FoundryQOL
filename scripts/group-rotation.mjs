import { wrapMethod } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

const GROUP_LAYERS = ["Tile", "Drawing"];

/** Pixel size of a placeable document, accounting for Drawings storing size in shape. */
export function docSize(doc) {
  if (doc.shape) return { w: doc.shape.width, h: doc.shape.height };
  return { w: doc.width, h: doc.height };
}

export function unionBounds(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    const b = obj.bounds;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { minX, minY, maxX, maxY };
}

export function rotatePoint(point, pivot, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos
  };
}

async function rotateAsGroup(layer, objects, delta) {
  // Common pivot: center of the union of all controlled objects' bounds.
  const { minX, minY, maxX, maxY } = unionBounds(objects);
  const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const radians = Math.toRadians(delta);

  const updates = objects.map((obj) => {
    const doc = obj.document;
    const { w, h } = docSize(doc);
    const center = rotatePoint({ x: doc.x + w / 2, y: doc.y + h / 2 }, pivot, radians);
    return {
      _id: doc.id,
      x: center.x - w / 2,
      y: center.y - h / 2,
      rotation: (((doc.rotation + delta) % 360) + 360) % 360
    };
  });

  await canvas.scene.updateEmbeddedDocuments(layer.constructor.documentName, updates);
  return objects;
}

export function init() {
  wrapMethod(
    "foundry.canvas.layers.PlaceablesLayer.prototype.rotateMany",
    async function (wrapped, options = {}) {
      const { angle, delta, snap, ids, includeLocked = false } = options;
      const applies =
        isEnabled(SETTINGS.groupRotation) &&
        GROUP_LAYERS.includes(this.constructor.documentName) &&
        angle === undefined &&
        typeof delta === "number";
      if (!applies) return wrapped(options);

      let objects;
      if (typeof this._getMovableObjects === "function") {
        objects = this._getMovableObjects(ids, includeLocked);
      } else {
        objects = this.controlled.filter((o) => includeLocked || !o.document.locked);
      }
      if (objects.length < 2) return wrapped(options);

      // Snap the shared delta (rather than each object's final angle) so the
      // group keeps its shape.
      let d = delta;
      if (snap) d = d.toNearest(snap);
      if (!d) return objects;

      return rotateAsGroup(this, objects, d);
    }
  );
}
