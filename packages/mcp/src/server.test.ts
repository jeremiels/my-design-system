// The MCP server of a design system's documentation, and its extension
// (ADR 0039): a client in the same process. Node.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { extendDocs } from "@unicorne/catalog";
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMcpServer, defineTool, type McpServerOptions } from "./server.ts";

const socle = await loadSocleDocs();
const acme = extendDocs(socle, {
  name: "ACME",
  prefix: "acme",
  package: "@acme/design-system",
  catalog: ["button", "modal"],
});

/** A client connected to a server of ACME's documentation. */
async function connect(options: Partial<McpServerOptions> = {}) {
  const server = await createMcpServer({ name: "acme", version: "1.0.0", docs: acme, ...options });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    return (result.content as { text: string }[])[0]!.text;
  };
  return { client, call };
}

describe("createMcpServer()", () => {
  it("tells its agent how to use it, in the name of the design system", async () => {
    const { client } = await connect();
    expect(client.getServerVersion()).toMatchObject({ name: "acme" });
    expect(client.getInstructions()).toContain("ACME: 2 web components, as <acme-…> elements");
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toEqual([
      "list_components",
      "get_component",
      "search_docs",
      "list_icons",
      "list_tokens",
      "get_token",
      "check_markup",
    ]);
    expect(client.getInstructions()).toContain("For CSS: the semantic tokens, as var(--…)");
  });

  it("lists the icons, all or by words (ADR 0044)", async () => {
    const { call } = await connect();
    expect(await call("list_icons", { query: "cross" })).toContain("- `close` — Closes a dialog");
    expect(await call("search_docs", { query: "dismiss" })).toContain("- `close`");
  });

  it("lists the tokens, gets one, and finds the token of a value (ADR 0042)", async () => {
    const { call } = await connect();
    expect(await call("list_tokens")).toContain("`--u-color-action-background` `#1c65c8`");
    expect(await call("list_tokens", { level: "component", group: "button" })).toContain(
      "`--u-button-background-color`",
    );
    const token = await call("get_token", { name: "--u-palette-brand-600" });
    expect(token).toContain("prefer the semantic token of the intent");
    expect(token).toContain("`--u-color-action-background`");
    expect(await call("get_token", { name: "color.nothing" })).toBe(
      'ACME has no token "color.nothing". Call list_tokens for the list.',
    );
    expect(await call("search_docs", { query: "#1C65C8" })).toMatch(
      /^- `--u-color-action-background`/,
    );
  });

  it("lists, gets, searches and checks", async () => {
    const { call } = await connect();
    expect(await call("list_components")).toContain("- `acme-modal`");
    const modal = await call("get_component", { name: "acme-modal" });
    expect(modal).toContain("# <acme-modal>");
    expect(modal).toContain("## When to use");
    expect(await call("get_component", { name: "tree" })).toBe(
      'ACME has no component "tree". Call list_components for the list.',
    );
    expect(await call("search_docs", { query: "submit form" })).toContain("`acme-button`");
    expect(
      await call("check_markup", { markup: `<acme-button variant="big"></acme-button>` }),
    ).toContain("(invalid-value)");
    expect(await call("check_markup", { markup: `<acme-button>Send</acme-button>` })).toBe(
      "No problem found.",
    );
    // The tokens in CSS (ADR 0043).
    expect(
      await call("check_markup", { markup: ".a { gap: var(--u-gap); }", file: "app.css" }),
    ).toContain("app.css:1:6 error ACME has no token `--u-gap`.");
    // The fixed CSS, for the agent to write back (ADR 0045).
    const fixed = await call("check_markup", {
      markup: ".a { padding: 16px; }",
      file: "app.css",
      fix: "safe",
    });
    expect(fixed).toContain(
      "Fixed 1 problem:\n\n```css\n.a { padding: var(--u-spacing-md); }\n```",
    );
    expect(fixed).toContain("No problem left.");
    // A usage rule of the DSDS documents, quoted under the problem.
    expect(await call("check_markup", { markup: `<acme-button></acme-button>` })).toContain(
      "(accessible-name)\n  Donnez au bouton un libellé",
    );
  });

  it("serves each component as a resource", async () => {
    const { client } = await connect();
    const { resources } = await client.listResources();
    expect(resources.map(({ uri }) => uri)).toEqual([
      "acme://components/button",
      "acme://components/modal",
    ]);
    const { contents } = await client.readResource({ uri: "acme://components/modal" });
    expect((contents[0] as { text: string }).text).toContain("# <acme-modal>");
  });

  it("takes the tools of the design system, and leaves out those it removes", async () => {
    const { client, call } = await connect({
      tools: {
        search_docs: null,
        brand_color: defineTool({
          title: "Brand color",
          description: "Gives a color of ACME's brand, by name.",
          input: { name: z.enum(["purple", "pink"]) },
          run: ({ name }) => (name === "purple" ? "#7c3aed" : "#db2777"),
        }),
      },
    });
    const names = (await client.listTools()).tools.map(({ name }) => name);
    expect(names).toContain("brand_color");
    expect(names).not.toContain("search_docs");
    expect(await call("brand_color", { name: "pink" })).toBe("#db2777");
  });
});
