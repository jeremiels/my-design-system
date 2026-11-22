// The icons of a design system, from its icon manifest, and `unknown-icon`
// (ADR 0044). Node, on the base's documentation.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkMarkup,
  closeIcons,
  extendDocs,
  findComponent,
  findIcon,
  formatComponent,
  fixMarkup,
  formatIconList,
  readIconManifest,
  searchIcons,
  type IconManifest,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

/** ACME's own icons: a new one, renamed from `fave`, and the base's `information` without metadata. */
const acmeIcons: IconManifest = {
  schemaVersion: 1,
  icons: [
    { name: "information", tags: [], categories: [] },
    {
      name: "star",
      description: "A favorite, like `u-button` marks one.",
      tags: ["favorite"],
      categories: ["action"],
      aliases: [{ name: "fave", deprecated: true }, { name: "bookmark-star" }],
    },
  ],
};
const acme = extendDocs(socle, {
  name: "ACME",
  prefix: "acme",
  package: "@acme/design-system",
  icons: acmeIcons,
});

const names = (list: readonly { name: string }[]) => list.map(({ name }) => name);

describe("the icons of a design system", () => {
  it("are those of @unicorne/icons, each with its meaning and its tags", () => {
    expect(socle.icons.length).toBe(11);
    expect(socle.icons.filter(({ description }) => !description)).toEqual([]);
    expect(findIcon(socle, "Close")!.tags).toContain("cross");
  });

  it("finds icons by every word of a query, the name first", () => {
    expect(names(searchIcons(socle, "cross").map(({ icon }) => icon))).toEqual(["close"]);
    expect(names(searchIcons(socle, "status").map(({ icon }) => icon))).toEqual([
      "danger",
      "information",
      "success",
      "warning",
    ]);
    expect(searchIcons(socle, "").length).toBe(11);
    expect(names(closeIcons(socle, "clos"))).toEqual(["close", "chevron-up"]);
  });

  it("adds a brand's icons to the base's, and keeps the metadata it doesn't give", () => {
    expect(acme.icons.length).toBe(12);
    expect(findIcon(acme, "information")!.description).toBe(
      findIcon(socle, "information")!.description,
    );
    // Its texts go through the renaming, like the base's: `acme-button`.
    expect(findIcon(acme, "star")!.description).toBe("A favorite, like `acme-button` marks one.");
  });

  it("refuses a manifest of another version", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "icons-")), "icon-manifest.json");
    await writeFile(file, JSON.stringify({ ...acmeIcons, schemaVersion: 2 }));
    await expect(readIconManifest(file)).rejects.toThrow("this catalog reads version 1");
  });
});

describe("unknown-icon", () => {
  it("fails on a name the set doesn't have, with the names it likely meant", () => {
    const diagnostics = checkMarkup(
      acme,
      [
        `<acme-icon name="cross"></acme-icon>`,
        `<acme-icon name="star"></acme-icon>`,
        `<acme-icon :name="icon"></acme-icon>`,
      ].join("\n"),
      { file: "page.html" },
    );
    expect(diagnostics.map(({ line, rule, message }) => `${line} ${rule}: ${message}`)).toEqual([
      '1 unknown-icon: name="cross" on <acme-icon>: ACME has no icon "cross". Close: "close".',
    ]);
  });
});

describe("the Markdown of the icons", () => {
  it("lists them by category, as the icon component takes them", () => {
    const list = formatIconList(acme);
    expect(list).toContain('12 icons, as `<acme-icon name="…">`.');
    expect(list).toContain("## status");
    expect(list).toContain("- `close` — Closes a dialog");
    expect(formatIconList(acme, "nothing")).toContain("No icon matches.");
  });

  it("leaves nothing of the base in a design system's list", () => {
    expect(
      formatIconList(acme).match(/unicorne|socle|\bADR\b|<u-[a-z]|`u-[a-z]|the base/gi),
    ).toBeNull();
  });

  it("gives the icon component the names it takes", () => {
    expect(formatComponent(acme, findComponent(acme, "icon")!, "agent")).toContain(
      "## Icons\n\n12 icons, by `name`: `chevron-down`,",
    );
  });
});

describe("the aliases of an icon (ADR 0049)", () => {
  it("find an icon by its other names, and list them", () => {
    expect(findIcon(acme, "fave")!.name).toBe("star");
    expect(searchIcons(acme, "bookmark")[0]!.icon.name).toBe("star");
    expect(formatIconList(acme, "star")).toContain("Also: `fave` (deprecated), `bookmark-star`.");
  });

  it("know an alias, and warn on a deprecated one with a safe fix to the new name", () => {
    const source = [
      `<acme-icon name="fave"></acme-icon>`,
      `<acme-icon name="bookmark-star"></acme-icon>`,
    ].join("\n");
    const diagnostics = checkMarkup(acme, source, { file: "page.html" });
    expect(diagnostics.map(({ line, rule, message }) => `${line} ${rule}: ${message}`)).toEqual([
      '1 deprecated-icon: name="fave" on <acme-icon>: the icon is renamed "star".',
    ]);
    expect(fixMarkup(acme, source).output.split("\n")[0]).toBe(
      `<acme-icon name="star"></acme-icon>`,
    );
  });
});
