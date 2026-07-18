import { MODULE_ID } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

const PANEL_ID = "qolct-brush-panel";

const enabled = () => isEnabled(SETTINGS.brushPanel);

/* -------------------------------------------- */
/*  Brush state (Foundry's default drawing cfg) */
/* -------------------------------------------- */

function configKey() {
  return foundry.canvas.layers.DrawingsLayer.DEFAULT_CONFIG_SETTING;
}

function getBrush() {
  let defaults = {};
  try {
    defaults = game.settings.get("core", configKey()) ?? {};
  } catch {
    defaults = {};
  }
  return {
    color: normalizeHex(defaults.strokeColor) ?? normalizeHex(game.user.color) ?? "#ffffff",
    width: Number(defaults.strokeWidth) || 8
  };
}

async function setBrush(patch) {
  const current = foundry.utils.deepClone(game.settings.get("core", configKey()) ?? {});
  await game.settings.set("core", configKey(), foundry.utils.mergeObject(current, patch));
  // Also restyle currently selected drawings, so the palette works on selections
  const selected = canvas.drawings?.controlled ?? [];
  if (selected.length) {
    await canvas.scene.updateEmbeddedDocuments("Drawing", selected.map((d) => ({ _id: d.id, ...patch })));
  }
  syncPanel();
}

function normalizeHex(color) {
  if (!color) return null;
  try {
    return foundry.utils.Color.from(color).css;
  } catch {
    return null;
  }
}

/* -------------------------------------------- */
/*  Palette                                     */
/* -------------------------------------------- */

const getPalette = () => game.settings.get(MODULE_ID, SETTINGS.brushPalette) ?? [];
const setPalette = (colors) => game.settings.set(MODULE_ID, SETTINGS.brushPalette, colors);

/* -------------------------------------------- */
/*  Panel UI                                    */
/* -------------------------------------------- */

export function togglePanel() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();
  else buildPanel();
}

function buildPanel() {
  const i18n = (k) => game.i18n.localize(`QOLCT.Brush.${k}`);
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <header>
      <i class="fas fa-paintbrush"></i> ${i18n("Title")}
      <button type="button" class="qolct-close"><i class="fas fa-xmark"></i></button>
    </header>
    <div class="qolct-row">
      <input type="color" name="color" data-tooltip="${i18n("Color")}">
      <input type="text" name="hex" maxlength="7" spellcheck="false" data-tooltip="${i18n("Hex")}">
    </div>
    <div class="qolct-row">
      <i class="fas fa-grip-lines"></i>
      <input type="range" name="width" min="1" max="40" step="1" data-tooltip="${i18n("Width")}">
      <span class="qolct-width-val"></span>
    </div>
    <div class="qolct-palette" data-tooltip="${i18n("PaletteHint")}"></div>`;
  document.body.appendChild(panel);

  panel.querySelector(".qolct-close").addEventListener("click", () => panel.remove());
  panel.querySelector('[name="color"]').addEventListener("change", (ev) => {
    setBrush({ strokeColor: ev.target.value });
  });
  panel.querySelector('[name="hex"]').addEventListener("change", (ev) => {
    const v = ev.target.value.trim().replace(/^([0-9a-f]{6})$/i, "#$1");
    const hex = /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
    if (hex) setBrush({ strokeColor: hex });
    else syncPanel();
  });
  const range = panel.querySelector('[name="width"]');
  range.addEventListener("input", (ev) => {
    panel.querySelector(".qolct-width-val").textContent = ev.target.value;
  });
  range.addEventListener("change", (ev) => {
    setBrush({ strokeWidth: Number(ev.target.value) || 1 });
  });

  syncPanel();
}

function syncPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const brush = getBrush();
  panel.querySelector('[name="color"]').value = brush.color;
  panel.querySelector('[name="hex"]').value = brush.color;
  panel.querySelector('[name="width"]').value = brush.width;
  panel.querySelector(".qolct-width-val").textContent = brush.width;
  renderPalette(panel, brush);
}

function renderPalette(panel, brush) {
  const box = panel.querySelector(".qolct-palette");
  box.innerHTML = "";
  const palette = getPalette();
  for (const color of palette) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "qolct-swatch";
    swatch.style.background = color;
    if (color === brush.color) swatch.classList.add("active");
    swatch.addEventListener("click", () => setBrush({ strokeColor: color }));
    swatch.addEventListener("contextmenu", async (ev) => {
      ev.preventDefault();
      await setPalette(palette.filter((c) => c !== color));
      syncPanel();
    });
    box.appendChild(swatch);
  }
  const add = document.createElement("button");
  add.type = "button";
  add.className = "qolct-swatch qolct-add";
  add.innerHTML = `<i class="fas fa-plus"></i>`;
  add.dataset.tooltip = game.i18n.localize("QOLCT.Brush.Add");
  add.addEventListener("click", async () => {
    if (!palette.includes(brush.color)) {
      await setPalette([...palette, brush.color]);
      syncPanel();
    }
  });
  box.appendChild(add);
}

/* -------------------------------------------- */

function onGetSceneControlButtons(controls) {
  if (!enabled()) return;
  const drawings = controls.drawings;
  if (!drawings?.tools) return;
  drawings.tools.qolctBrush = {
    name: "qolctBrush",
    order: 99,
    title: "QOLCT.Controls.BrushPanel",
    icon: "fas fa-paintbrush",
    button: true,
    onChange: () => togglePanel()
  };
}

export function init() {
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
  Hooks.on("canvasTearDown", () => document.getElementById(PANEL_ID)?.remove());
}
