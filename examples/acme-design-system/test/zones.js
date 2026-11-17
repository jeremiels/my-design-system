// A page of another design system with an ACME zone and a dark zone (ADR 0013
// of the base): the page loads the base's tokens once, and ACME's theme.css.
import { acme, Button } from "/dist/index.js";
import { contrastFailures } from "@unicorne/tokens/testing";
import { check, publish } from "./support.js";

await acme.define(Button);
await Promise.all([...document.querySelectorAll("acme-button")].map((el) => el.updateComplete));

const $ = (selector) => document.querySelector(selector);
/** The background of the native button of an `acme-button`. */
const background = (id) =>
  getComputedStyle($(id).shadowRoot.querySelector('[part~="button"]')).backgroundColor;
/** The computed value of a CSS color inside `parent`, for comparisons. */
function resolveColor(color, parent = document.body) {
  const probe = document.createElement("div");
  probe.style.color = color;
  parent.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

await check("outside ACME's zone, the page keeps the base's values", () => {
  // The base's palette.brand.600.
  const expected = resolveColor("#1c65c8");
  return [
    background("#host") === expected,
    `background ${background("#host")}, expected ${expected}`,
  ];
});

await check("ACME's zone shows ACME's values", () => {
  // ACME's palette.brand.600 (tokens/primitive/palette.tokens.json).
  const expected = resolveColor("#7a4aba");
  return [
    background("#guest") === expected,
    `background ${background("#guest")}, expected ${expected}`,
  ];
});

await check("a dark zone of a light page is dark, and accessible", () => {
  const zone = $("#dark");
  const surface = resolveColor("var(--u-color-surface-default)", zone);
  const expected = resolveColor("var(--u-palette-neutral-950)");
  const failures = contrastFailures(zone);
  return [
    surface === expected &&
      failures.length === 0 &&
      background("#dark-host") !== background("#host"),
    `surface ${surface}, expected ${expected}; contrast failures: ${failures.length}`,
  ];
});

await check("ACME's zone in a dark zone shows the dark step of ACME's palette", () => {
  const zone = $("#dark-acme");
  const expected = resolveColor("var(--u-palette-brand-300)", zone);
  const base = resolveColor("var(--u-palette-brand-300)");
  const failures = contrastFailures(zone);
  return [
    background("#dark-guest") === expected && expected !== base && failures.length === 0,
    `background ${background("#dark-guest")}, expected ${expected} (the base's: ${base}); contrast failures: ${failures.length}`,
  ];
});

await check("a light zone of a dark page is light", () => {
  document.documentElement.dataset.theme = "dark";
  const zone = $("#dark");
  zone.dataset.theme = "light";
  const surface = resolveColor("var(--u-color-surface-default)", zone);
  const page = resolveColor("var(--u-color-surface-default)");
  const result = [
    surface === resolveColor("var(--u-palette-neutral-0)") && page !== surface,
    `zone ${surface}, page ${page}`,
  ];
  zone.dataset.theme = "dark";
  document.documentElement.dataset.theme = "light";
  return result;
});

publish();
