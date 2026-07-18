import { MODULE_ID } from "./patch.mjs";

export const SETTINGS = {
  backgroundTiles: "backgroundTiles",
  groupRotation: "groupRotation",
  rotationHandle: "rotationHandle",
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
