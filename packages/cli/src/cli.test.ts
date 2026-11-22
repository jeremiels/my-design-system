// The command line of a design system's documentation, and its extension
// (ADR 0039). Node.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extendDocs } from "@unicorne/catalog";
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { describe, expect, it } from "vitest";
import { createCli, type CliOptions } from "./cli.ts";

const socle = await loadSocleDocs();
const acme = extendDocs(socle, {
  name: "ACME",
  prefix: "acme",
  package: "@acme/design-system",
  catalog: ["button", "modal"],
});

/** Runs a command; returns its exit code and what it printed. */
async function run(argv: string[], options: Partial<CliOptions> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await createCli({
    name: "acme",
    docs: acme,
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    ...options,
  }).run(argv);
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("createCli()", () => {
  it("helps with its commands, in the name of the design system", async () => {
    const { code, out } = await run([]);
    expect(code).toBe(0);
    expect(out).toContain("acme: the components of ACME.");
    expect(out).toMatch(/list\s+Lists the components/);
  });

  it("lists, shows and searches, in text or in JSON", async () => {
    expect(
      JSON.parse((await run(["list", "--json"])).out).map(({ tag }: { tag: string }) => tag),
    ).toEqual(["acme-button", "acme-modal"]);
    const shown = await run(["show", "modal"]);
    expect(shown.out).toContain("# <acme-modal>");
    expect(shown.out).toContain('import { Modal } from "@acme/design-system";');
    expect((await run(["search", "fermeture"])).out).toContain("`acme-modal`");
  });

  it("fails on a component it doesn't offer, and on a command it doesn't know", async () => {
    const missing = await run(["show", "tree"]);
    expect(missing.code).toBe(1);
    expect(missing.err).toBe('ACME has no component "tree". List them: acme list.');
    expect((await run(["deploy"])).code).toBe(2);
  });

  it("checks files and folders, and fails on an error", async () => {
    const folder = await mkdtemp(join(tmpdir(), "cli-"));
    await writeFile(join(folder, "page.html"), `<acme-button variant="big">Go</acme-button>\n`);
    await writeFile(join(folder, "notes.txt"), `<acme-button variant="big">`);
    const { code, out } = await run(["check", folder]);
    expect(code).toBe(1);
    expect(out).toContain('page.html:1:14 error variant="big" on <acme-button>');
    expect(out).not.toContain("notes.txt");
    expect(out).toContain("1 error, 0 warnings.");
  });

  it("takes the commands of the design system, and leaves out those it removes", async () => {
    const options: Partial<CliOptions> = {
      commands: {
        check: null,
        brand: {
          summary: "Shows ACME's brand book.",
          run: (_args, { out }) => {
            out("https://acme.example/brand");
            return 0;
          },
        },
      },
    };
    const help = (await run(["help"], options)).out;
    expect(help).toContain("brand");
    expect(help).not.toContain("check");
    expect((await run(["brand"], options)).out).toBe("https://acme.example/brand");
    expect((await run(["check", "."], options)).code).toBe(2);
  });
});
