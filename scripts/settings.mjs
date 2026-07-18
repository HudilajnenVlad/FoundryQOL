import { MODULE_ID } from "./patch.mjs";

export const SETTINGS = {
  backgroundTiles: "backgroundTiles",
  groupRotation: "groupRotation",
  rotationHandle: "rotationHandle",
  showRotateKnob: "showRotateKnob",
  showScaleKnob: "showScaleKnob",
  drawingStyleBar: "drawingStyleBar",
  brushPanel: "brushPanel",
  brushPalette: "brushPalette",
  tokenTooltip: "tokenTooltip"
};

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.backgroundTiles, {
    name: "QOLCT.Settings.BackgroundTiles.Name",
    hint: "QOLCT.Settings.BackgroundTiles.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.groupRotation, {
    name: "QOLCT.Settings.GroupRotation.Name",
    hint: "QOLCT.Settings.GroupRotation.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.rotationHandle, {
    name: "QOLCT.Settings.RotationHandle.Name",
    hint: "QOLCT.Settings.RotationHandle.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.showRotateKnob, {
    name: "QOLCT.Settings.ShowRotateKnob.Name",
    hint: "QOLCT.Settings.ShowRotateKnob.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.showScaleKnob, {
    name: "QOLCT.Settings.ShowScaleKnob.Name",
    hint: "QOLCT.Settings.ShowScaleKnob.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.brushPanel, {
    name: "QOLCT.Settings.BrushPanel.Name",
    hint: "QOLCT.Settings.BrushPanel.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.brushPalette, {
    scope: "client",
    config: false,
    type: Array,
    default: ["#ffffff", "#000000", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"]
  });

  game.settings.register(MODULE_ID, SETTINGS.drawingStyleBar, {
    name: "QOLCT.Settings.DrawingStyleBar.Name",
    hint: "QOLCT.Settings.DrawingStyleBar.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.tokenTooltip, {
    name: "QOLCT.Settings.TokenTooltip.Name",
    hint: "QOLCT.Settings.TokenTooltip.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}

export function isEnabled(key) {
  return game.settings.get(MODULE_ID, key) === true;
}
