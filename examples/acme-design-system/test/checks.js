// Runs in the browser against ACME's build (dist/), registered the way an app
// does it, and publishes its results on `window.__results`.
import "/dist/define.js";
import { AcmeButton } from "/dist/acme-button.js";
import { acme, AcmeCard, Button, ButtonLink, Icon } from "/dist/index.js";
import { contrastFailures } from "@unicorne/tokens/testing";
import { alertIconSvg, check, parsed, publish } from "./support.js";

const $ = (selector) => document.querySelector(selector);
const style = (element) => getComputedStyle(element);
/** The computed value of a CSS color, for comparisons. */
function resolveColor(color) {
  const probe = document.createElement("div");
  probe.style.color = color;
  document.body.append(probe);
  const value = style(probe).color;
  probe.remove();
  return value;
}

const tags = ["acme-button", "acme-card", "acme-modal", "acme-alert", "acme-icon"];
await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
await Promise.all([...document.querySelectorAll(tags.join(","))].map((el) => el.updateComplete));
// The icons inside the alerts: `updateComplete` waits for their load.
const alertIcons = [...document.querySelectorAll("acme-alert")].map((alert) =>
  alert.shadowRoot.querySelector('[part~="icon"]'),
);
await Promise.all(alertIcons.map((icon) => icon.updateComplete));

await check("acme-button is ACME's button, extending the base's", () => {
  const button = $("#button");
  return [
    button instanceof AcmeButton && button instanceof Button,
    `AcmeButton: ${button instanceof AcmeButton}, Button: ${button instanceof Button}`,
  ];
});

await check("ACME's theme reaches the base's components", () => {
  const actual = style($("#button").shadowRoot.querySelector('[part~="button"]')).backgroundColor;
  // ACME's palette.brand.600 (tokens/primitive/palette.tokens.json).
  const expected = resolveColor("#7a4aba");
  return [actual === expected, `background ${actual}, expected ${expected}`];
});

await check("ACME's colors keep WCAG AA contrast in both themes", () => {
  const failures = ["light", "dark"].flatMap((theme) => {
    document.documentElement.dataset.theme = theme;
    return contrastFailures().map(
      ({ foreground, background, ratio, minimum }) =>
        `${theme}: ${foreground} on ${background} ${ratio.toFixed(2)}:1 < ${minimum}:1`,
    );
  });
  delete document.documentElement.dataset.theme;
  return [failures.length === 0, failures.join(" | ") || "every pair passes"];
});

await check("ACME's button styles apply on top of the base's", () => {
  const inner = style($("#button").shadowRoot.querySelector('[part~="button"]'));
  const pill = inner.borderTopLeftRadius !== "0px";
  return [
    inner.textTransform === "uppercase" && pill,
    `text-transform ${inner.textTransform}, radius ${inner.borderTopLeftRadius}`,
  ];
});

await check("ACME's card reads its own tokens, generated from its DTCG tokens", () => {
  const card = $("#card");
  const padding = style(card).getPropertyValue("--acme-card-padding").trim();
  const inner = style(card.shadowRoot.querySelector('[part~="card"]'));
  return [
    padding === "1.5rem" && inner.paddingTop === "24px",
    `--acme-card-padding: ${padding}, padding ${inner.paddingTop}`,
  ];
});

await check("the modal's close button is ACME's button", () => {
  const close = $("#modal").shadowRoot.querySelector('[part~="close-button"]');
  return [close instanceof AcmeButton, `close button <${close?.localName}>`];
});

await check("ACME's own card renders ACME's button", () => {
  const card = $("#card");
  const action = card.shadowRoot.querySelector('[part~="action"]');
  const heading = card.shadowRoot.querySelector('[part~="heading"]')?.textContent;
  return [
    card instanceof AcmeCard && action instanceof AcmeButton && heading === "Offre",
    `action <${action?.localName}> (AcmeButton: ${action instanceof AcmeButton}), heading "${heading}"`,
  ];
});

await check("ACME's alert renders ACME's version of a base icon", async () => {
  const { icon, svg } = await alertIconSvg($("#alert"));
  const AcmeIcon = customElements.get("acme-icon");
  // ACME's loader, not the base's: the base's information icon never loads.
  const { default: markup } = await AcmeIcon.icons.information();
  const isAcme = svg === parsed(markup);
  return [
    icon instanceof Icon && AcmeIcon.icons.information !== Icon.icons.information && isAcme,
    `<${icon.localName}> (Icon: ${icon instanceof Icon}), renders ACME's markup: ${isAcme}`,
  ];
});

await check("ACME's own icons render, by name", () => {
  const box = $("#star").shadowRoot.querySelector('[part~="icon"]');
  return [
    box.querySelector("svg") !== null && box.getAttribute("aria-label") === "Favori",
    `svg: ${box.querySelector("svg") !== null}, role ${box.getAttribute("role")}, label "${box.getAttribute("aria-label")}"`,
  ];
});

await check("ACME offers part of the base: no button-link", async () => {
  const rejected = await acme.define(ButtonLink).then(
    () => "registered",
    (error) => String(error),
  );
  return [
    !customElements.get("acme-button-link") && rejected.includes("isn't in the catalog of acme"),
    `acme-button-link defined: ${Boolean(customElements.get("acme-button-link"))}; define(ButtonLink): ${rejected}`,
  ];
});

await check("only the acme- prefix is registered", () => {
  const defaults = ["u-button", "u-modal"].filter((tag) => customElements.get(tag));
  return [defaults.length === 0, `default tags registered: ${defaults.join(", ") || "none"}`];
});

publish();
