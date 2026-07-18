import { MODULE_ID } from "./patch.mjs";
import { SETTINGS, isEnabled } from "./settings.mjs";

const TOOLTIP_ID = "qol-token-tooltip";

/* -------------------------------------------- */
/*  Token / Prototype Token configuration UI    */
/* -------------------------------------------- */

function onRenderTokenConfig(app, html) {
  if (!isEnabled(SETTINGS.tokenTooltip)) return;
  const el = html instanceof HTMLElement ? html : html[0];
  if (!el || el.querySelector(`[name="flags.${MODULE_ID}.tooltip"]`)) return;

  const doc = app.document ?? app.token;
  if (!doc) return;
  const text = foundry.utils.getProperty(doc, `flags.${MODULE_ID}.tooltip`) ?? "";
  const gmOnly = foundry.utils.getProperty(doc, `flags.${MODULE_ID}.tooltipGmOnly`) === true;

  const fieldset = document.createElement("fieldset");
  fieldset.className = "qolct-tooltip-config";
  fieldset.innerHTML = `
    <legend>${game.i18n.localize("QOLCT.TooltipConfig.Legend")}</legend>
    <div class="form-group">
      <label>${game.i18n.localize("QOLCT.TooltipConfig.Text")}</label>
      <div class="form-fields">
        <textarea name="flags.${MODULE_ID}.tooltip" rows="3"></textarea>
      </div>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("QOLCT.TooltipConfig.GmOnly")}</label>
      <div class="form-fields">
        <input type="checkbox" name="flags.${MODULE_ID}.tooltipGmOnly" ${gmOnly ? "checked" : ""}>
      </div>
    </div>`;
  fieldset.querySelector("textarea").value = text;

  // Prefer the Identity tab; fall back to the display-name field's section, or the form end.
  const target =
    el.querySelector('.tab[data-tab="identity"]') ??
    el.querySelector('[data-application-part="identity"]') ??
    el.querySelector('[name="displayName"]')?.closest("fieldset")?.parentElement ??
    el.querySelector("form") ??
    el;
  target.appendChild(fieldset);
}

/* -------------------------------------------- */
/*  Hover display                               */
/* -------------------------------------------- */

function getTooltipElement() {
  let tip = document.getElementById(TOOLTIP_ID);
  if (!tip) {
    tip = document.createElement("div");
    tip.id = TOOLTIP_ID;
    document.body.appendChild(tip);
  }
  return tip;
}

function hideTooltip() {
  document.getElementById(TOOLTIP_ID)?.remove();
}

function showTooltip(token) {
  const doc = token.document;
  const text = (doc.getFlag(MODULE_ID, "tooltip") ?? "").trim();
  if (!text) return;
  if (doc.getFlag(MODULE_ID, "tooltipGmOnly") === true && !game.user.isGM) return;

  const bottom = canvas.stage.worldTransform.apply(
    new PIXI.Point(token.center.x, token.bounds.bottom)
  );
  const tip = getTooltipElement();
  tip.textContent = text;
  tip.style.left = `${Math.round(bottom.x)}px`;
  tip.style.top = `${Math.round(bottom.y + 8)}px`;
}

function onHoverToken(token, hovered) {
  if (!isEnabled(SETTINGS.tokenTooltip)) return;
  if (hovered) showTooltip(token);
  else hideTooltip();
}

export function init() {
  Hooks.on("renderTokenConfig", onRenderTokenConfig);
  Hooks.on("renderPrototypeTokenConfig", onRenderTokenConfig);
  Hooks.on("hoverToken", onHoverToken);
  Hooks.on("canvasPan", hideTooltip);
  Hooks.on("canvasTearDown", hideTooltip);
  Hooks.on("deleteToken", hideTooltip);
}
