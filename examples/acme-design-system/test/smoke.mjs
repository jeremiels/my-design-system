// Smoke-tests ACME's build in Chromium, and checks what it publishes: no
// copy of the base in dist/, and a manifest documenting inherited API.
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = join(import.meta.dirname, "..");
const CONTENT_TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

// --- What ACME publishes
const dist =
  (await readFile(join(root, "dist/index.js"), "utf8")) +
  (await readFile(join(root, "dist/define.js"), "utf8"));
record(
  "dist/ imports the base instead of bundling it",
  dist.includes('from "@unicorne/components"') && !dist.includes("--u-button-background-color:"),
  `imports @unicorne/components: ${dist.includes('from "@unicorne/components"')}`,
);

/** The SVG markup of each icon of a generated set: name → markup. */
async function iconMarkup(dir) {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".js") && file !== "index.js");
  return new Map(
    await Promise.all(
      files.map(async (file) => [
        file.slice(0, -3),
        (await import(pathToFileURL(join(dir, file)).href)).default,
      ]),
    ),
  );
}
const baseIcons = await iconMarkup(join(root, "node_modules/@unicorne/icons/js"));
const acmeIcons = await iconMarkup(join(root, "src/icons"));
const distFiles = (await readdir(join(root, "dist"))).filter((file) => file.endsWith(".js"));
// The bundler may requote the markup: compare without escaped quotes.
const unescape = (code) => code.replaceAll('\\"', '"');
const distAll = unescape(
  (await Promise.all(distFiles.map((file) => readFile(join(root, "dist", file), "utf8")))).join(
    "\n",
  ),
);
const copied = [...baseIcons]
  .filter(([, markup]) => distAll.includes(markup))
  .map(([name]) => name);
const eager = [...acmeIcons]
  .filter(([, markup]) => unescape(dist).includes(markup))
  .map(([name]) => name);
const missing = [...acmeIcons]
  .filter(([, markup]) => !distAll.includes(markup))
  .map(([name]) => name);
record(
  "dist/ has ACME's icons in their own chunks, and none of the base's",
  copied.length === 0 && eager.length === 0 && missing.length === 0,
  `base icons copied: ${copied.join(", ") || "none"}; ACME icons in index/define: ${eager.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}`,
);

const manifest = JSON.parse(await readFile(join(root, "custom-elements.json"), "utf8"));
const declarations = manifest.modules.flatMap((module) => module.declarations ?? []);
const acmeButton = declarations.find((declaration) => declaration.name === "AcmeButton");
const inherited = {
  attributes: acmeButton?.attributes?.length ?? 0,
  cssProperties: acmeButton?.cssProperties?.length ?? 0,
  cssParts: acmeButton?.cssParts?.length ?? 0,
};
record(
  "the manifest documents what AcmeButton inherits from the base",
  inherited.attributes > 0 && inherited.cssProperties > 0 && inherited.cssParts > 0,
  JSON.stringify(inherited),
);

// --- ACME in a browser
/** The paths each page requested, by page. */
let requested = new Set();
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(
    /^\/+/,
    "",
  );
  requested.add(path);
  if (!["dist/", "test/", "node_modules/"].some((prefix) => path.startsWith(prefix))) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(join(root, path));
    response
      .writeHead(200, {
        "content-type": CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const browser = await chromium.launch();

/** Opens a test page, records its browser checks, and returns the paths it requested. */
async function runPage(path) {
  requested = new Set();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/${path}`);
  await page.waitForFunction(() => window.__results, null, { timeout: 15_000 }).catch(() => {});
  const { browserResults, errors } = await page.evaluate(() => ({
    browserResults: window.__results ?? [],
    errors: window.__errors ?? [],
  }));
  if (browserResults.length === 0)
    record(`browser checks of ${path} ran`, false, errors.join(" | ") || "no result");
  results.push(...browserResults);
  await page.close();
  return requested;
}

try {
  const full = await runPage("test/index.html");

  // The page renders an alert of each type `success` (base icon) and
  // `information` (ACME's icon): of the base's icons, only `success` loads.
  const loadedBaseIcons = [...full]
    .filter(
      (path) => path.startsWith("node_modules/@unicorne/icons/js/") && !path.endsWith("/index.js"),
    )
    .map((path) => path.slice(path.lastIndexOf("/") + 1, -".js".length))
    .sort();
  record(
    "the page downloads only the icons it renders",
    loadedBaseIcons.join() === "success",
    `base icons downloaded: ${loadedBaseIcons.join(", ") || "none"} (expected: success)`,
  );

  // `acme.define(Alert)`: the alert and its icon, without ACME's button.
  const partial = await runPage("test/partial.html");
  record(
    "a partial registration doesn't download the overrides it doesn't use",
    full.has("dist/acme-button.js") && !partial.has("dist/acme-button.js"),
    `dist/acme-button.js downloaded by the full page: ${full.has("dist/acme-button.js")}, by the partial page: ${partial.has("dist/acme-button.js")}`,
  );
} finally {
  await browser.close();
  server.close();
}

for (const { name, ok, detail } of results) console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
