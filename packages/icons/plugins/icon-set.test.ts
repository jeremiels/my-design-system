import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { iconManifestOf, readIconSet, writeIconManifest, writeIconSet } from "./icon-set.ts";

/** An icon as Figma exports it: fixed dimensions and color, a title. */
const FIGMA_EXPORT = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<title>close</title>
<path d="M6 6L18 18M18 6L6 18" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const svg = (body: string, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

let dirs: string[] = [];
function folder(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "unicorne-icons-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  dirs = [];
});

describe("readIconSet", () => {
  it("optimizes an export: no dimensions, no title, colors following the text", async () => {
    const icons = await readIconSet(folder({ "close.svg": FIGMA_EXPORT }));
    const { inline, standalone } = icons.get("close")!;

    expect(inline).toBe(
      '<svg fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m6 6 12 12m0-12L6 18"/></svg>',
    );
    // A standalone file needs its namespace; inline markup doesn't.
    expect(standalone).toBe(inline.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
  });

  it("keeps `none` and the colors of masks", async () => {
    const icons = await readIconSet(
      folder({
        "masked.svg": svg(
          '<mask id="m"><rect width="24" height="24" fill="#fff"/></mask><path fill="none" stroke="red" mask="url(#m)" d="M0 0h24"/>',
        ),
      }),
    );
    const { inline } = icons.get("masked")!;
    expect(inline).toContain('fill="#fff"');
    expect(inline).toContain('fill="none"');
    expect(inline).toContain('stroke="currentColor"');
  });

  it("reads only .svg files, sorted by name", async () => {
    const dir = folder({
      "b.svg": svg('<path d="M0 0h1"/>'),
      "a.svg": svg('<path d="M0 0h2"/>'),
      "notes.txt": "not an icon",
    });
    expect([...(await readIconSet(dir)).keys()]).toEqual(["a", "b"]);
  });

  it.each([
    ["Close.svg", svg('<path d="M0 0h1"/>'), "isn't an icon name"],
    ["index.svg", svg('<path d="M0 0h1"/>'), "reserved"],
    ["grid.svg", svg('<path d="M0 0h1"/>', "0 0 16 16"), 'viewBox is "0 0 16 16"'],
    ["no-grid.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>', "viewBox is null"],
    ["script.svg", svg("<script>alert(1)</script>"), "<script> isn't allowed"],
    ["object.svg", svg("<foreignObject/>"), "<foreignObject> isn't allowed"],
    ["style.svg", svg("<style>path{fill:red}</style>"), "<style> isn't allowed"],
    ["image.svg", svg('<image href="#a"/>'), "<image> isn't allowed"],
    ["handler.svg", svg('<path onclick="alert(1)" d="M0 0h1"/>'), "onclick on <path>"],
    ["link.svg", svg('<use href="https://example.com/a.svg#b"/>'), "only #fragments"],
    [
      "xlink.svg",
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="a.svg#b"/></svg>',
      "only #fragments",
    ],
    ["malformed.svg", svg("<path"), "malformed.svg"],
  ])("rejects %s", async (file, content, problem) => {
    await expect(readIconSet(folder({ [file]: content }))).rejects.toThrow(problem);
  });

  it("rejects an icon over its budget once optimized", async () => {
    const path = `<path d="${Array.from({ length: 200 }, (_, i) => `M${i % 24} 0l1 ${i % 7}`).join("")}"/>`;
    const dir = folder({ "heavy.svg": svg(path) });
    await expect(readIconSet(dir, { maxBytes: 512 })).rejects.toThrow("over the budget of 512");
    await expect(readIconSet(dir, { maxBytes: 100_000 })).resolves.toHaveProperty("size", 1);
  });

  it("lists every invalid file in one error", async () => {
    const dir = folder({
      "good.svg": svg('<path d="M0 0h1"/>'),
      "bad-grid.svg": svg('<path d="M0 0h1"/>', "0 0 32 32"),
      "bad-script.svg": svg("<script/>"),
    });
    const error = await readIconSet(dir).catch((caught: Error) => caught);
    expect((error as Error).message).toMatch(/bad-grid\.svg[^]*bad-script\.svg/);
    expect((error as Error).message).not.toContain("good.svg");
  });
});

describe("writeIconSet", () => {
  const icons = new Map([
    ["chevron-down", { inline: "<svg>'v'</svg>", standalone: '<svg xmlns="x">v</svg>' }],
    ["close", { inline: "<svg>x</svg>", standalone: '<svg xmlns="x">x</svg>' }],
  ]);

  it("writes one module per icon and an index of loaders, sorted by name", async () => {
    const out = folder();
    const svgOut = folder();
    await writeIconSet(icons, { out, svgOut, exportName: "brandIcons" });

    expect(readdirSync(out).sort()).toEqual([
      "chevron-down.d.ts",
      "chevron-down.js",
      "close.d.ts",
      "close.js",
      "index.d.ts",
      "index.js",
    ]);
    expect(readFileSync(join(out, "chevron-down.js"), "utf8")).toContain(
      "export default '<svg>\\'v\\'</svg>';",
    );
    const index = readFileSync(join(out, "index.js"), "utf8");
    expect(index).toContain("export const brandIcons = Object.freeze({");
    expect(index.indexOf('"chevron-down": () => import("./chevron-down.js")')).toBeLessThan(
      index.indexOf('close: () => import("./close.js")'),
    );
    expect(readFileSync(join(out, "index.d.ts"), "utf8")).toContain(
      'export type IconName = "chevron-down" | "close";',
    );
    expect(readFileSync(join(svgOut, "close.svg"), "utf8")).toBe('<svg xmlns="x">x</svg>\n');
  });

  it("removes the files of a removed icon", async () => {
    const out = folder();
    const svgOut = folder();
    await writeIconSet(icons, { out, svgOut });
    await writeIconSet(new Map([["close", icons.get("close")!]]), { out, svgOut });

    expect(readdirSync(out).sort()).toEqual(["close.d.ts", "close.js", "index.d.ts", "index.js"]);
    expect(readdirSync(svgOut)).toEqual(["close.svg"]);
  });

  it("refuses a folder holding files it didn't write, and changes nothing", async () => {
    const out = folder();
    await writeIconSet(icons, { out });
    writeFileSync(join(out, "main.ts"), "export {};");

    await expect(writeIconSet(icons, { out })).rejects.toThrow("Not written by unicorne-icons");
    expect(readdirSync(out)).toContain("index.js");
    expect(readdirSync(out)).toContain("main.ts");
  });

  it("creates missing folders", async () => {
    const out = join(folder(), "deep", "icons");
    await writeIconSet(icons, { out });
    expect(readdirSync(out)).toContain("index.js");
  });
});

describe("the metadata and the manifest of a set (ADR 0044)", () => {
  const close = svg('<path d="M6 6l12 12"/>');

  it("reads the .json next to an icon, and writes the manifest of the set", async () => {
    const dir = folder({
      "close.svg": close,
      "close.json": JSON.stringify({
        description: "Closes a dialog.",
        tags: ["cross", "dismiss"],
        categories: ["action"],
      }),
      "star.svg": close,
    });
    const icons = await readIconSet(dir);
    expect(icons.get("close")!.metadata).toEqual({
      description: "Closes a dialog.",
      tags: ["cross", "dismiss"],
      categories: ["action"],
    });
    expect(iconManifestOf(icons)).toEqual({
      schemaVersion: 1,
      icons: [
        {
          name: "close",
          description: "Closes a dialog.",
          tags: ["cross", "dismiss"],
          categories: ["action"],
        },
        { name: "star", tags: [], categories: [] },
      ],
    });
    const file = join(dir, "icon-manifest.json");
    await writeIconManifest(icons, file);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(iconManifestOf(icons));
  });

  it("refuses a .json of unknown fields or types, and one without its icon", async () => {
    await expect(
      readIconSet(
        folder({
          "close.svg": close,
          "close.json": JSON.stringify({ keywords: ["x"], tags: "cross" }),
          "star.json": "{}",
        }),
      ),
    ).rejects.toThrow(
      /"keywords" isn't a field[\s\S]*"tags" is a list of words[\s\S]*star\.json: no icon star\.svg/,
    );
  });
});

describe("the aliases of a set (ADR 0049)", () => {
  const close = svg('<path d="M6 6l12 12"/>');

  it("exports each alias with the icon it names, and keeps them in the manifest", async () => {
    const dir = folder({
      "close.svg": close,
      "close.json": JSON.stringify({
        aliases: [
          { name: "cross", deprecated: true, deprecationReason: "alias.name" },
          { name: "x" },
        ],
      }),
    });
    const icons = await readIconSet(dir);
    expect(iconManifestOf(icons).icons[0]!.aliases).toEqual([
      { name: "cross", deprecated: true, deprecationReason: "alias.name" },
      { name: "x" },
    ]);
    const out = join(dir, "out");
    await writeIconSet(icons, { out, exportName: "acmeIcons" });
    const index = readFileSync(join(out, "index.js"), "utf8");
    expect(index).toContain(
      'export const acmeIconAliases = Object.freeze({\n  cross: "close",\n  x: "close",\n});',
    );
    expect(readFileSync(join(out, "index.d.ts"), "utf8")).toContain(
      'export type IconAlias = "cross" | "x";',
    );
  });

  it("refuses an alias that isn't a name, or a reason without a deprecation", async () => {
    await expect(
      readIconSet(
        folder({
          "close.svg": close,
          "close.json": JSON.stringify({ aliases: [{ name: "Bad Name" }] }),
          "star.svg": close,
          "star.json": JSON.stringify({
            aliases: [{ name: "x", deprecationReason: "alias.name" }],
          }),
        }),
      ),
    ).rejects.toThrow(
      /alias "Bad Name" isn't an icon name[\s\S]*"deprecationReason" of alias "x" goes with "deprecated"/,
    );
  });

  it("refuses an alias that names an icon, or another icon's alias", async () => {
    await expect(
      readIconSet(
        folder({
          "close.svg": close,
          "close.json": JSON.stringify({ aliases: [{ name: "star" }, { name: "x" }] }),
          "star.svg": close,
          "star.json": JSON.stringify({ aliases: [{ name: "x" }] }),
        }),
      ),
    ).rejects.toThrow(
      /alias "star" is the name of an icon[\s\S]*alias "x" is already an alias of close/,
    );
  });
});
