// Shared by the browser checks of the test pages: each page publishes its
// results on `window.__results`, which test/smoke.mjs reads.
export const results = [];

export async function check(name, run) {
  try {
    const [ok, detail] = await run();
    results.push({ name, ok, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: `threw ${error}` });
  }
}

/** An `<svg>` as the browser parses it, for comparisons. */
export function parsed(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return template.content.querySelector("svg").outerHTML;
}

/** The rendered `<svg>` of the icon an alert renders, once loaded. */
export async function alertIconSvg(alert) {
  await alert.updateComplete;
  const icon = alert.shadowRoot.querySelector('[part~="icon"]');
  await icon.updateComplete;
  return { icon, svg: icon.shadowRoot.querySelector("svg")?.outerHTML };
}

export function publish() {
  results.push({
    name: "no runtime errors",
    ok: window.__errors.length === 0,
    detail: window.__errors.join(" | ") || "none",
  });
  window.__results = results;
}
