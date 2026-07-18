export const MODULE_ID = "qol-canvas-tools";

/**
 * Wrap a method on a prototype, using libWrapper when it is active.
 * The wrapper receives (wrapped, ...args) and `this` bound to the instance,
 * matching libWrapper's MIXED calling convention.
 * @param {string} path     Dot-separated path from globalThis, e.g.
 *                          "foundry.canvas.placeables.Tile.prototype._canControl"
 * @param {Function} wrapper
 */
export function wrapMethod(path, wrapper) {
  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register(MODULE_ID, path, wrapper, "MIXED");
    return;
  }
  const parts = path.split(".");
  const name = parts.pop();
  const target = parts.reduce((obj, key) => obj?.[key], globalThis);
  const original = target?.[name];
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | Cannot patch ${path}: method not found`);
    return;
  }
  target[name] = function (...args) {
    return wrapper.call(this, original.bind(this), ...args);
  };
}
