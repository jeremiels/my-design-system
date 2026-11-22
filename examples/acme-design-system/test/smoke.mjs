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

// --- ACME's A2UI catalog (ADR 0052 of the base): its build writes it with `acme a2ui`.
{
  const { Catalog } = await import("@a2ui/web_core");
  const text = await readFile(join(root, "a2ui-catalog.json"), "utf8");
  const document = JSON.parse(text);
  const names = Object.keys(document.components);
  const catalog = Catalog.fromJson(document);
  record(
    "a2ui-catalog.json offers ACME's card, and no component outside ACME's catalog",
    catalog.id === "https://acme.example/a2ui/v1/catalog.json" &&
      names.includes("Card") &&
      names.includes("TextField") &&
      !names.includes("Checkbox") &&
      !names.includes("RadioGroup"),
    names.join(", "),
  );
  record(
    "its instructions name A2UI components, never a tag or a package of the base",
    document.instructions.includes("`Textarea`") && !/`u-|@unicorne\//.test(text),
    `${document.instructions.split("\n").length} lines`,
  );
  const { spawnSync } = await import("node:child_process");
  const printed = spawnSync("node", ["bin/acme.js", "a2ui"], { cwd: root, encoding: "utf8" });
  record(
    "`acme a2ui` prints the published document",
    printed.status === 0 && JSON.stringify(JSON.parse(printed.stdout)) === JSON.stringify(document),
    `exit ${printed.status}`,
  );
  const a2ui = await readFile(join(root, "dist/a2ui.js"), "utf8");
  record(
    "dist/a2ui.js imports the base's adapters, and dist/index.js nothing of A2UI",
    a2ui.includes('from "@unicorne/a2ui"') &&
      !a2ui.includes("A2uiLitElement") &&
      !dist.includes("a2ui"),
    `dist/a2ui.js imports @unicorne/a2ui: ${a2ui.includes('from "@unicorne/a2ui"')}`,
  );
}

// --- ACME in a browser
// ACME publishes its values alone too: a page of another design system loads
// them for an ACME zone, without a second copy of the base's tokens (ADR 0013).
const themeSheet = await readFile(join(root, "dist/theme.css"), "utf8");
const stylesSheet = await readFile(join(root, "dist/styles.css"), "utf8");
record(
  "dist/theme.css has ACME's values only, on [data-brand=acme]",
  /\[data-brand=["']?acme["']?\]/.test(themeSheet) &&
    !themeSheet.includes("--u-palette-neutral-0:") &&
    stylesSheet.includes("--u-palette-neutral-0:"),
  `theme.css: ${themeSheet.length} bytes, styles.css: ${stylesSheet.length} bytes`,
);

/** The paths each page requested, by page. */
let requested = new Set();
const server = createServer(async (request, response) => {
  let path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(
    /^\/+/,
    "",
  );
  // An icon's module, as the components import it: `@unicorne/icons/<name>`.
  // The import map maps the prefix to js/; the package's exports add `.js`.
  if (path.startsWith("node_modules/@unicorne/icons/js/") && !extname(path)) {
    path += ".js";
  }
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
  // `information` (ACME's icon), and a modal, whose close button shows
  // `close`: of the base's icons, only `close` and `success` load on demand.
  // The chevrons and the icon of `link` are static imports of the components
  // that draw them (ADR 0032): this page, without a bundler, loads every
  // module of the base.
  const loadedBaseIcons = [...full]
    .filter(
      (path) =>
        path.startsWith("node_modules/@unicorne/icons/js/") &&
        !path.endsWith("/index.js") &&
        !/\/(chevron-[a-z-]+|external-link)\.js$/.test(path),
    )
    .map((path) => path.slice(path.lastIndexOf("/") + 1, -".js".length))
    .sort();
  record(
    "the page downloads only the icons it renders",
    loadedBaseIcons.join() === "close,success",
    `base icons downloaded: ${loadedBaseIcons.join(", ") || "none"} (expected: close, success)`,
  );

  // Chromium anchors the autocomplete's list in CSS: the fallback stays on the server.
  const floating = [...full].filter((path) => path.includes("@floating-ui"));
  record(
    "the page doesn't download Floating UI where CSS anchors the popovers",
    floating.length === 0,
    `Floating UI files downloaded: ${floating.join(", ") || "none"}`,
  );

  // `acme.define(Alert)`: the alert and its icon, without ACME's button.
  await runPage("test/zones.html");

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

// --- ACME's documentation tools: `acme` and `acme-mcp`, as a user runs them.
{
  const { spawnSync } = await import("node:child_process");
  const { mkdtemp, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const acmeCli = (...args) =>
    spawnSync("node", [join(root, "bin/acme.js"), ...args], { encoding: "utf8" });

  const listed = JSON.parse(acmeCli("list", "--json").stdout).map(({ tag }) => tag);
  record(
    "acme lists ACME's catalog under its prefix: its card, no button-link",
    listed.includes("acme-card") &&
      listed.includes("acme-button") &&
      !listed.includes("acme-button-link"),
    `${listed.length} components`,
  );

  const button = acmeCli("show", "button").stdout;
  record(
    "acme show: the button's rules, ACME's import, its look and its French texts",
    button.includes("await acme.define(Button);") &&
      button.includes("pill corners") &&
      button.includes("## When to use"),
    button.split("\n").slice(0, 3).join(" | "),
  );
  const modal = acmeCli("show", "modal").stdout;
  record(
    "acme show: ACME's texts are the defaults",
    modal.includes('`"Fermer"`'),
    'close-label = "Fermer"',
  );

  const folder = await mkdtemp(join(tmpdir(), "acme-"));
  await writeFile(
    join(folder, "page.html"),
    [
      `<acme-button variant="big">Go</acme-button>`,
      `<u-button>x</u-button>`,
      `<acme-text-field></acme-text-field>`,
      `<acme-card></acme-card>`,
    ].join("\n"),
  );
  const checked = acmeCli("check", folder);
  record(
    "acme check: an error on a value ACME's button doesn't take, exit code 1",
    checked.status === 1 && checked.stdout.includes('variant="big"'),
    checked.stdout.trim().split("\n").at(-1),
  );
  record(
    "acme check: the usage rules of the base and of ACME, with their guidelines",
    checked.stdout.includes('<acme-text-field> needs "label". (required-attribute)') &&
      checked.stdout.includes("Donnez au champ un `label`") &&
      checked.stdout.includes('<acme-card> needs "heading". (required-attribute)') &&
      checked.stdout.includes("Donnez à la carte un `heading`") &&
      checked.stdout.includes("3 errors"),
    "text-field label, card heading",
  );
  // The tokens in CSS (ADR 0043 of the base), with ACME's values.
  const styles = await mkdtemp(join(tmpdir(), "acme-css-"));
  await writeFile(
    join(styles, "app.css"),
    [
      ".card {",
      "  gap: var(--u-spacing-medium);",
      "  background: var(--u-palette-brand-600);",
      "  border-color: #7a4aba;",
      "}",
      ".card-title {",
      "  color: var(--u-color-action-text);",
      "  background: var(--u-color-surface-default);",
      "}",
    ].join("\n"),
  );
  const css = acmeCli("check", styles);
  record(
    "acme check: the tokens in CSS, an unknown one, a primitive, a raw color of ACME's",
    css.status === 1 &&
      css.stdout.includes("ACME has no token `--u-spacing-medium`.") &&
      css.stdout.includes("`--u-palette-brand-600` is a primitive") &&
      css.stdout.includes("`#7a4aba` in border-color") &&
      css.stdout.includes("`var(--u-color-action-background)`"),
    css.stdout.trim().split("\n").at(-1),
  );
  // The pairs of the tokens (ADR 0046 of the base): documented, and checked.
  record(
    "acme token and check: the pairs of a token, and a text on a background it doesn't allow",
    acmeCli("token", "color.action.text").stdout.includes(
      "- **MUST** be paired with `--u-color-action-background`",
    ) && css.stdout.includes("`--u-color-action-text` on `--u-color-surface-default`"),
    "color.action.text on color.surface.default",
  );
  // The Lit templates of a script (ADR 0048 of the base), at their place in the file.
  const litFolder = await mkdtemp(join(tmpdir(), "acme-lit-"));
  await writeFile(
    join(litFolder, "view.ts"),
    'import { html } from "lit";\nexport const view = () => html`<acme-card heading="Titre"><acme-buton>Go</acme-buton></acme-card>`;\n',
  );
  const lit = acmeCli("check", litFolder);
  record(
    "acme check: the Lit templates of a script, with the name a typo meant",
    lit.status === 1 &&
      lit.stdout.includes(
        "view.ts:2:59 error ACME has no <acme-buton>. Did you mean <acme-button>?",
      ),
    lit.stdout.trim().split("\n")[0],
  );

  // The safe fixes of check (ADR 0045 of the base): written in the file.
  const fixFolder = await mkdtemp(join(tmpdir(), "acme-fix-"));
  await writeFile(join(fixFolder, "app.css"), ".card { padding: 16px; }\n");
  const fixedRun = acmeCli("check", fixFolder, "--fix");
  const fixedCss = await readFile(join(fixFolder, "app.css"), "utf8");
  record(
    "acme check --fix: a raw value becomes its token, in the file",
    fixedRun.status === 0 &&
      fixedRun.stdout.includes("Fixed 1 problem in 1 file.") &&
      fixedCss === ".card { padding: var(--u-spacing-md); }\n",
    fixedCss.trim(),
  );

  // ACME's icons over the base's (ADR 0044 of the base): listed, and checked.
  const iconFolder = await mkdtemp(join(tmpdir(), "acme-icons-"));
  await writeFile(join(iconFolder, "page.html"), `<acme-icon name="stra"></acme-icon>`);
  const iconCheck = acmeCli("check", iconFolder);
  const favorites = acmeCli("icons", "favorite").stdout;
  // The old name of a renamed icon (ADR 0049 of the base): listed, and fixed.
  await writeFile(join(iconFolder, "old.html"), `<acme-icon name="favorite"></acme-icon>`);
  const renamed = acmeCli("check", join(iconFolder, "old.html"));
  record(
    "acme check: the old name of a renamed icon, with a safe fix to its new name",
    renamed.stdout.includes(
      'name="favorite" on <acme-icon>: the icon is renamed "star". (deprecated-icon) [fix]',
    ) && acmeCli("icons", "star").stdout.includes("Also: `favorite` (deprecated)."),
    renamed.stdout.trim().split("\n")[0],
  );
  record(
    "acme icons: ACME's star among the base's icons, and check knows their names",
    favorites.includes("- `star` — A favorite") &&
      acmeCli("icons").stdout.includes("12 icons") &&
      iconCheck.status === 1 &&
      iconCheck.stdout.includes('ACME has no icon "stra". Close: "star".'),
    iconCheck.stdout.trim().split("\n")[0],
  );
  record(
    "acme has ACME's own command, texts",
    acmeCli("texts").stdout.includes("`closeLabel`: Fermer"),
    "closeLabel: Fermer",
  );

  // ACME's tokens (ADR 0042 of the base): the base's, with ACME's values.
  const action = acmeCli("token", "color.action.background").stdout;
  const padding = acmeCli("token", "card.padding").stdout;
  const body = acmeCli("token", "--u-font-family-body").stdout;
  record(
    "acme token: ACME's values, its card's prefix, the base's descriptions it keeps",
    action.includes("- default: `#7a4aba`") &&
      padding.includes("# `--acme-card-padding`") &&
      body.includes("Text of the page and of the components.") &&
      body.includes("Georgia"),
    action.split("\n").find((line) => line.startsWith("- default")),
  );

  // ACME's text styles (ADR 0051 of the base): its classes, in its sheet and its docs.
  const heading = acmeCli("token", "text.heading.xl").stdout;
  await writeFile(join(iconFolder, "text.html"), `<h1 class="acme-text-heading-xxl">Demandes</h1>`);
  const unknownStyle = acmeCli("check", join(iconFolder, "text.html")).stdout;
  record(
    "acme text styles: ACME's classes in theme.css and in its docs, checked by check",
    /\.acme-text-heading-xl\s*\{/.test(themeSheet) &&
      heading.includes('In HTML: `class="acme-text-heading-xl"`.') &&
      unknownStyle.includes(
        'Did you mean "acme-text-heading-xl"? (unknown-text-style) [suggestion]',
      ),
    unknownStyle.trim().split("\n")[0],
  );

  // The usage rules of a group of tokens (ADR 0050 of the base), with the tokens.
  const spacing = acmeCli("tokens", "spacing").stdout;
  record(
    "acme tokens spacing: the rules of the group, and what check verifies of them",
    spacing.includes("## Rules of `spacing`") && spacing.includes("_Partly checked by `check`._"),
    spacing.split("\n").find((line) => line.startsWith("- **MUST**")),
  );

  // Nothing of what ACME builds on, but the names of the events and tokens,
  // which every design system shares.
  const { loadAcmeDocs } = await import(pathToFileURL(join(root, "dist/docs.js")).href);
  const { formatComponent, formatIconList, formatToken, formatTokenList } =
    await import("@unicorne/catalog");
  const docs = await loadAcmeDocs();
  const everything = [
    ...docs.components.map((component) => formatComponent(docs, component, "agent")),
    ...docs.tokens.map((token) => formatToken(docs, token)),
    ...["primitive", "semantic", "component"].map((level) => formatTokenList(docs, { level })),
    ...docs.tokenGroups.map(({ name }) => formatTokenList(docs, { group: name })),
    formatIconList(docs),
  ].join("\n");
  const leaks = everything
    .replace(/`u-(?:close|cancel|select|toggle|sort|remove)`/g, "")
    .replace(/--u-[\w-]+/g, "")
    .match(/unicorne|socle|\bADR\b|<u-[a-z]|`u-[a-z]|`\w+(?:Base|Controller)`|the base/gi);
  record(
    "ACME's documentation says nothing of what it builds on",
    leaks === null,
    `leaks: ${leaks ?? "none"}`,
  );

  // acme-mcp, through an MCP client, over stdio.
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const client = new Client({ name: "smoke", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({ command: "node", args: [join(root, "bin/acme-mcp.js")] }),
  );
  const instructions = client.getInstructions() ?? "";
  const tools = (await client.listTools()).tools.map(({ name }) => name);
  const card = await client.callTool({ name: "get_component", arguments: { name: "card" } });
  const texts = await client.callTool({ name: "get_texts", arguments: {} });
  const purple = await client.callTool({ name: "search_docs", arguments: { query: "#7A4ABA" } });
  const radius = await client.callTool({
    name: "get_token",
    arguments: { name: "button.border-radius" },
  });
  const markup = await client.callTool({
    name: "check_markup",
    arguments: {
      markup: `<acme-modal><acme-button><acme-icon name="x"></acme-icon></acme-button></acme-modal>`,
    },
  });
  await client.close();
  record(
    "acme-mcp serves ACME's documentation, and its own tool",
    instructions.startsWith("ACME:") &&
      tools.includes("check_markup") &&
      tools.includes("get_texts") &&
      card.content[0].text.includes("Utilisez `card` pour résumer") &&
      texts.content[0].text.includes("Fermer"),
    `tools: ${tools.join(", ")}`,
  );
  record(
    "acme-mcp finds ACME's tokens, by value too",
    tools.includes("list_tokens") &&
      purple.content[0].text.startsWith("- `--u-color-action-background` `#7a4aba`") &&
      radius.content[0].text.includes("- default: `9999px`"),
    purple.content[0].text.split("\n")[0],
  );
  const reported = markup.content[0].text;
  record(
    "acme-mcp check_markup reports the usage rules, with their guidelines",
    reported.includes('<acme-modal> needs "label".') &&
      reported.includes("<acme-button> has no name") &&
      reported.includes("Donnez à la modale un `label`") &&
      !/unicorne|socle/i.test(reported),
    reported.split("\n").at(-1),
  );
}

for (const { name, ok, detail } of results) console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
