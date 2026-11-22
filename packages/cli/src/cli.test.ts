// The command line of a design system's documentation, and its extension
// (ADR 0039). Node.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
    expect(out).toContain("acme: the components, the tokens and the icons of ACME.");
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

  it("lists the tokens, shows one, and finds those of a value (ADR 0042)", async () => {
    const list = await run(["tokens"]);
    expect(list.out).toContain("semantic tokens: use them in CSS as `var(--…)`");
    expect(list.out).toContain("`--u-color-action-background` `#1c65c8` · theme:dark `#9cc6ff`");
    expect((await run(["tokens", "component"])).out).toContain("filter by one of these groups");
    expect((await run(["tokens", "--type", "shadow"])).out).toContain("`--u-shadow-overlay`");
    const json = JSON.parse((await run(["tokens", "color.action", "--json"])).out) as {
      id: string;
    }[];
    expect(json.map(({ id }) => id)).toContain("color.action.background");

    const token = await run(["token", "var(--u-color-action-background)"]);
    expect(token.out).toContain("- theme:dark: `#9cc6ff` ← `--u-palette-brand-300`");
    const missing = await run(["token", "color.nothing"]);
    expect(missing.code).toBe(1);
    expect(missing.err).toBe('ACME has no token "color.nothing". List them: acme tokens.');

    const found = JSON.parse((await run(["search", "#1C65C8", "--json"])).out) as {
      kind: string;
      id: string;
    }[];
    expect(found[0]).toMatchObject({ kind: "token", id: "color.action.background" });
  });

  it("lists the icons, all or by words (ADR 0044)", async () => {
    expect((await run(["icons"])).out).toContain("11 icons");
    expect((await run(["icons", "cross"])).out).toContain("- `close` — Closes a dialog");
    const json = JSON.parse((await run(["icons", "status", "--json"])).out) as { name: string }[];
    expect(json.map(({ name }) => name)).toEqual(["danger", "information", "success", "warning"]);
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
    // Its CSS too (ADR 0043): a raw value a token holds.
    await writeFile(join(folder, "app.css"), `.a {\n  padding: 16px;\n}\n`);
    // The Lit templates of its scripts (ADR 0048), not its declaration files.
    const view =
      'import { html } from "lit";\nexport const view = html`<acme-button variant="big">Go</acme-button>`;\n';
    await writeFile(join(folder, "view.ts"), view);
    await writeFile(join(folder, "view.d.ts"), view);
    const { code, out } = await run(["check", folder]);
    expect(code).toBe(1);
    expect(out).toContain('page.html:1:14 error variant="big" on <acme-button>');
    expect(out).toContain("app.css:2:3 warning `16px` in padding: use `var(--u-spacing-md)`.");
    expect(out).toContain('view.ts:2:39 error variant="big" on <acme-button>');
    expect(out).not.toContain("view.d.ts");
    expect(out).not.toContain("notes.txt");
    expect(out).toContain("2 errors, 1 warning.");
  });

  it("writes the fixes with --fix, the unsafe ones with --unsafe too (ADR 0045)", async () => {
    const folder = await mkdtemp(join(tmpdir(), "cli-fix-"));
    const file = join(folder, "app.css");
    await writeFile(file, `.a {\n  padding: 16px;\n  transition: color 150ms;\n}\n`);
    const safe = await run(["check", folder, "--fix"]);
    expect(safe.out).toContain("Fixed 1 problem in 1 file.");
    expect(safe.out).toContain("(raw-value) [unsafe fix]");
    expect(await readFile(file, "utf8")).toContain("padding: var(--u-spacing-md);");
    await run(["check", folder, "--fix", "--unsafe"]);
    expect(await readFile(file, "utf8")).toContain(
      "transition: color var(--u-motion-duration-fast);",
    );
    expect((await run(["check", folder, "--unsafe"])).code).toBe(2);
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
