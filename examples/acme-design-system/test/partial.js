// An app that registers part of ACME's catalog: `acme.define(Alert)`, the way
// an app showing alerts only does it. test/smoke.mjs checks what it downloads.
import { acme, Alert } from "/dist/index.js";
import { alertIconSvg, check, parsed, publish } from "./support.js";

await acme.define(Alert);

await check("a partial registration defines what it uses, and what that renders", () => {
  const tags = ["acme-alert", "acme-icon", "acme-button", "acme-modal", "acme-card"];
  const defined = tags.filter((tag) => customElements.get(tag));
  return [defined.join() === "acme-alert,acme-icon", `defined: ${defined.join(", ")}`];
});

await check("ACME's icons reach a partial registration", async () => {
  const { svg } = await alertIconSvg(document.querySelector("#alert"));
  const { default: markup } = await customElements.get("acme-icon").icons.information();
  return [svg === parsed(markup), `renders ACME's information icon: ${svg === parsed(markup)}`];
});

publish();
