import { MODULE_ID } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

const BAR_ID = "qolct-style-bar";

const enabled = () => isEnabled(SETTINGS.drawingStyleBar);

function selection() {
  return canvas.drawings?.controlled ?? [];
}

function toCss(color, fallback) {
  try {
    return foundry.utils.Color.from(color ?? fallback).css;
  } catch {
    return fallback;
  }
}

async function apply(patch) {
  const sel = selection();
  if (!sel.length) return;
  await canvas.scene.updateEmbeddedDocuments(
    "Drawing",
    sel.map((d) => ({ _id: d.id, ...patch }))
  );
}

function buildBar() {
  const bar = document.createElement("div");
  bar.id = BAR_ID;
  const i18n = (k) => game.i18n.localize(`QOLCT.StyleBar.${k}`);
  bar.innerHTML = `
    <span class="qolct-count"></span>
    <label data-tooltip="${i18n("StrokeColor")}">
      <i class="fas fa-pen"></i>
      <input type="color" name="strokeColor">
    </label>
    <label data-tooltip="${i18n("StrokeWidth")}">
      <i class="fas fa-grip-lines"></i>
      <input type="number" name="strokeWidth" min="0" max="60" step="1">
    </label>
    <label data-tooltip="${i18n("Fill")}">
      <input type="checkbox" name="fillOn">
      <i class="fas fa-fill-drip"></i>
      <input type="color" name="fillColor">
    </label>
    <label data-tooltip="${i18n("Opacity")}">
      <i class="fas fa-circle-half-stroke"></i>
      <input type="range" name="opacity" min="0.1" max="1" step="0.05">
    </label>`;

  bar.querySelector('[name="strokeColor"]').addEventListener("change", (ev) => {
    apply({ strokeColor: ev.target.value });
  });
  bar.querySelector('[name="strokeWidth"]').addEventListener("change", (ev) => {
    apply({ strokeWidth: Math.max(0, Number(ev.target.value) || 0) });
  });
  bar.querySelector('[name="fillOn"]').addEventListener("change", (ev) => {
    apply({ fillType: ev.target.checked ? CONST.DRAWING_FILL_TYPES.SOLID : CONST.DRAWING_FILL_TYPES.NONE });
  });
  bar.querySelector('[name="fillColor"]').addEventListener("change", (ev) => {
    apply({ fillColor: ev.target.value, fillType: CONST.DRAWING_FILL_TYPES.SOLID });
  });
  bar.querySelector('[name="opacity"]').addEventListener("change", (ev) => {
    const v = Number(ev.target.value);
    apply({ strokeAlpha: v, fillAlpha: v });
  });

  document.body.appendChild(bar);
  return bar;
}

function refreshBar() {
  const sel = enabled() ? selection() : [];
  let bar = document.getElementById(BAR_ID);
  if (!sel.length) {
    bar?.remove();
    return;
  }
  if (!bar) bar = buildBar();
  const doc = sel[0].document;
  bar.querySelector(".qolct-count").textContent =
    sel.length > 1 ? game.i18n.format("QOLCT.StyleBar.Count", { count: sel.length }) : "";
  bar.querySelector('[name="strokeColor"]').value = toCss(doc.strokeColor, "#ffffff");
  bar.querySelector('[name="strokeWidth"]').value = doc.strokeWidth ?? 8;
  bar.querySelector('[name="fillOn"]').checked = doc.fillType !== CONST.DRAWING_FILL_TYPES.NONE;
  bar.querySelector('[name="fillColor"]').value = toCss(doc.fillColor, "#ffffff");
  bar.querySelector('[name="opacity"]').value = doc.strokeAlpha ?? 1;
}

export function init() {
  const refresh = foundry.utils.debounce(refreshBar, 30);
  Hooks.on("controlDrawing", refresh);
  Hooks.on("updateDrawing", refresh);
  Hooks.on("deleteDrawing", refresh);
  Hooks.on("canvasTearDown", () => document.getElementById(BAR_ID)?.remove());
}
