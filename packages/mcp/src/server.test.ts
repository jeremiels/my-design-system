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
      "check_markup",
    ]);
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
    expect(await call("check_markup", { markup: `<acme-button></acme-button>` })).toBe(
      "No problem found.",
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
