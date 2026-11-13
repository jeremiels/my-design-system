// Smoke-tests ACME's build in Chromium, and checks what it publishes: no
// copy of the base in dist/, and a manifest documenting inherited API.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
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
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(
    /^\/+/,
    "",
  );
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
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/test/index.html`);
  await page.waitForFunction(() => window.__results, null, { timeout: 15_000 }).catch(() => {});
  const { browserResults, errors } = await page.evaluate(() => ({
    browserResults: window.__results ?? [],
    errors: window.__errors ?? [],
  }));
  if (browserResults.length === 0)
    record("browser checks ran", false, errors.join(" | ") || "no result");
  results.push(...browserResults);
} finally {
  await browser.close();
  server.close();
}

for (const { name, ok, detail } of results) console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
