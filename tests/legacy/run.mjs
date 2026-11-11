// Smoke-tests the built library (dist/) in a real, stock Firefox ESR — the
// oldest Firefox of package.json "browserslist". Vitest/Storybook run
// un-lowered dev sources in Playwright's own (recent, patched) browsers, so
// they can't tell whether what we ship works there; hence WebdriverIO +
// geckodriver against the actual build output.
//
//   npm run test:legacy                                  (builds first)
//   FIREFOX_ESR_BIN=/path/to/firefox node tests/legacy/run.mjs
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { remote } from "webdriverio";

const root = join(import.meta.dirname, "../..");
const SERVED = [
  "dist/",
  "tests/legacy/",
  "node_modules/lit/",
  "node_modules/lit-html/",
  "node_modules/lit-element/",
  "node_modules/@lit/reactive-element/",
];
const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".map": "application/json",
};

const binary =
  process.env.FIREFOX_ESR_BIN ??
  execFileSync(join(root, "scripts/install-firefox-esr.sh"), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
    .trim()
    .split("\n")
    .at(-1);

// Static server for the files the test page needs, and nothing else.
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(
    /^\/+/,
    "",
  );
  if (!SERVED.some((prefix) => path.startsWith(prefix))) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(join(root, path));
    const type = CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
    response.writeHead(200, { "content-type": type }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

let browser;
let failed = true;
try {
  browser = await remote({
    // geckodriver's informational output is logged as warnings; errors still show.
    logLevel: "error",
    capabilities: {
      browserName: "firefox",
      "moz:firefoxOptions": { binary, args: ["-headless"] },
    },
  });
  console.log(`Firefox ${browser.capabilities.browserVersion}`);

  await browser.url(`http://127.0.0.1:${port}/tests/legacy/index.html`);
  await browser
    .waitUntil(() => browser.execute(() => Boolean(window.__results)), { timeout: 20_000 })
    .catch(() => {});
  const { results, errors } = await browser.execute(() => ({
    results: window.__results ?? [],
    errors: window.__errors ?? [],
  }));

  for (const { name, ok, detail } of results) {
    console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
  }
  if (results.length === 0) {
    console.log(`✗ checks did not run — ${errors.join(" | ") || "no error reported"}`);
  }
  failed = results.length === 0 || results.some((result) => !result.ok);
} finally {
  await browser?.deleteSession();
  server.close();
}
process.exit(failed ? 1 : 0);
