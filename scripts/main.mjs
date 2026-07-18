import { registerSettings } from "./settings.mjs";
import * as backgroundTiles from "./background-tiles.mjs";
import * as groupRotation from "./group-rotation.mjs";
import * as rotationHandle from "./rotation-handle.mjs";
import * as tokenTooltip from "./token-tooltip.mjs";

Hooks.once("init", () => {
  registerSettings();
  backgroundTiles.init();
  groupRotation.init();
  rotationHandle.init();
  tokenTooltip.init();
});
