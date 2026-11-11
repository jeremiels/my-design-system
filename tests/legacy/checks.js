// Runs inside the browser under test and publishes its results on
// `window.__results` for tests/legacy/run.mjs. This file is NOT transpiled:
// keep its syntax and APIs within the supported matrix (Firefox 115,
// Safari 16.4 — see package.json "browserslist").
// Registers the catalog under the default `u-` prefix, as an app would.
import "/dist/define.js";
import { Button, allComponents, defineComponents } from "/dist/index.js";

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const results = [];

async function check(name, run) {
  try {
    const [ok, detail] = await run();
    results.push({ name, ok, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: `threw ${error}` });
  }
}

const $ = (selector) => document.querySelector(selector);
const shadow = (selector, inner) => $(selector).shadowRoot.querySelector(inner);
const style = (element, pseudo) => getComputedStyle(element, pseudo);

// Every catalog component, as registered by dist/define.js.
const tags = allComponents.map(({ componentName }) => `u-${componentName}`);
await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
await Promise.all([...document.querySelectorAll(tags.join(","))].map((el) => el.updateComplete));

await check("component styles are adopted as constructable sheets", () => {
  const sheets = $("#submit").shadowRoot.adoptedStyleSheets.length;
  const display = style(shadow("#submit", ".button")).display;
  return [sheets === 3 && display === "inline-grid", `${sheets} sheets, display: ${display}`];
});

await check("design tokens reach the shadow DOM", () => {
  const button = style(shadow("#submit", ".button"));
  return [
    button.backgroundColor !== TRANSPARENT && button.paddingLeft !== "0px",
    `background ${button.backgroundColor}, padding-left ${button.paddingLeft}`,
  ];
});

await check("color-mix() semantic tokens resolve", () => {
  // Unsupported color-mix() makes the var() invalid → transparent background.
  const probe = document.createElement("div");
  probe.style.backgroundColor = "var(--u-color-action-bg-hover)";
  document.body.append(probe);
  const color = style(probe).backgroundColor;
  probe.remove();
  return [color !== TRANSPARENT && color !== "", color];
});

await check("disabled button is inert and announced", () => {
  const host = $("#disabled");
  let clicked = false;
  host.addEventListener("u-click", () => {
    clicked = true;
  });
  shadow("#disabled", ".button").click();
  const opacity = Number(style(host).opacity);
  const ariaDisabled = host.getAttribute("aria-disabled");
  return [
    !clicked && ariaDisabled === "true" && opacity < 1,
    `clicked: ${clicked}, aria-disabled: ${ariaDisabled}, opacity: ${opacity}`,
  ];
});

await check("type=submit button submits its form (ElementInternals)", () => {
  let submitted = false;
  $("#form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitted = true;
  });
  shadow("#submit", ".button").click();
  return [submitted, `submitted: ${submitted}`];
});

await check("button-link renders an undecorated link", () => {
  const link = shadow("#link", "a");
  const decoration = style(link).textDecorationLine;
  return [
    link.getAttribute("href") === "#x" && decoration === "none",
    `href ${link.getAttribute("href")}, text-decoration ${decoration}`,
  ];
});

await check("alert roles and variant styles", () => {
  const info = shadow("#info", ".alert");
  const danger = shadow("#danger", ".alert");
  const infoBackground = style(info).backgroundColor;
  const dangerBackground = style(danger).backgroundColor;
  return [
    info.getAttribute("role") === "status" &&
      danger.getAttribute("role") === "alert" &&
      dangerBackground !== TRANSPARENT &&
      dangerBackground !== infoBackground,
    `roles ${info.getAttribute("role")}/${danger.getAttribute("role")}, ` +
      `backgrounds ${infoBackground} / ${dangerBackground}`,
  ];
});

await check("modal opens with a visible backdrop, then closes", async () => {
  const modal = $("#modal");
  const dialog = modal.shadowRoot.querySelector("dialog");
  modal.open = true;
  await modal.updateComplete;
  const opened = dialog.open;
  const backdrop = style(dialog, "::backdrop").backgroundColor;
  modal.closeModal();
  await modal.updateComplete;
  return [
    opened && !dialog.open && backdrop !== TRANSPARENT,
    `opened: ${opened}, backdrop: ${backdrop}, closed: ${!dialog.open}`,
  ];
});

await check("custom states never throw", () => {
  const host = $("#submit");
  host.customStates.set("pressed", true);
  const active = host.customStates.has("pressed");
  host.customStates.set("pressed", false);
  return [true, `:state() supported: ${active}`];
});

await check("a brand prefix and override reach nested components", async () => {
  class AcmeButton extends Button {}
  defineComponents({
    prefix: "acme",
    components: allComponents,
    overrides: { button: AcmeButton },
  });
  const modal = document.createElement("acme-modal");
  document.body.append(modal);
  await modal.updateComplete;
  const inner = modal.shadowRoot.querySelector("acme-button");
  const defaultStillWorks = $("#modal").shadowRoot.querySelector("u-button") !== null;
  modal.remove();
  return [
    inner instanceof AcmeButton && defaultStillWorks,
    `acme-modal renders ${inner ? inner.localName : "nothing"} ` +
      `(AcmeButton: ${inner instanceof AcmeButton}), u-modal still renders u-button: ${defaultStillWorks}`,
  ];
});

await check("no runtime errors", () => [
  window.__errors.length === 0,
  window.__errors.join(" | ") || "none",
]);

window.__results = results;
