import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  checkMarkup,
  findComponent,
  formatComponent,
  formatComponentList,
  formatDiagnostics,
  formatSearchResults,
  searchDocs,
  type DesignSystemDocs,
} from "@unicorne/catalog";
import { z } from "zod";

/** A tool of the server: its input, as a shape of zod schemas, and what it answers, as text. */
export interface Tool<Shape extends z.ZodRawShape = z.ZodRawShape> {
  readonly title: string;
  /** What it does and when to call it: an agent chooses tools by their description. */
  readonly description: string;
  readonly input: Shape;
  /** Answers a call: Markdown or JSON, for the agent. */
  run(args: z.infer<z.ZodObject<Shape>>, docs: DesignSystemDocs): string | Promise<string>;
}

/** Declares a tool, with the types of its input. */
export const defineTool = <Shape extends z.ZodRawShape>(tool: Tool<Shape>): Tool<Shape> => tool;

/** The tools every design system's server has. */
export const builtinTools = {
  list_components: defineTool({
    title: "List the components",
    description:
      "Lists the web components of the design system: their tags and summaries. Call it first, then get_component for each component you use.",
    input: {},
    run: (_args, docs) => formatComponentList(docs),
  }),
  get_component: defineTool({
    title: "Get a component",
    description:
      "Returns everything the documentation says of a component: when to use it, its rules, how to import it, its attributes and their values, properties, events, slots, CSS parts and custom properties. Read it before you write the component's markup.",
    input: {
      name: z.string().describe("The component's name or tag: `button` or its tag."),
    },
    run: ({ name }, docs) => {
      const component = findComponent(docs, name);
      return component
        ? formatComponent(docs, component, "agent")
        : `${docs.name} has no component "${name}". Call list_components for the list.`;
    },
  }),
  search_docs: defineTool({
    title: "Search the documentation",
    description:
      "Finds the components whose documentation holds every word of the query, without case nor accents: names, descriptions, attributes, events, rules. Use it to find the component for a need: « date range », « upload ».",
    input: {
      query: z.string().describe("The words to find."),
    },
    run: ({ query }, docs) => formatSearchResults(query, searchDocs(docs, query)),
  }),
  check_markup: defineTool({
    title: "Check markup",
    description:
      "Checks the design system's elements in HTML, or in a Vue single-file component: unknown tags, attributes and properties, values outside an attribute's values, unknown events and slots, and the usage rules a tool can check: a missing label or name, an element outside its parent, a child a component doesn't take. Each problem quotes the rule it breaks. Call it on the markup you wrote, and fix what it reports.",
    input: {
      markup: z.string().describe("The HTML, or the whole .vue file."),
      file: z
        .string()
        .optional()
        .describe("The file name: a name ending with .vue reads the markup as a Vue component."),
    },
    run: ({ markup, file }, docs) => {
      const diagnostics = checkMarkup(docs, markup, file ? { file } : {});
      return diagnostics.length === 0 ? "No problem found." : formatDiagnostics(diagnostics);
    },
  }),
} satisfies Record<string, Tool<z.ZodRawShape>>;

/** The options of `createMcpServer()`. */
export interface McpServerOptions {
  /** The name of the server: `acme-design-system`. */
  readonly name: string;
  readonly version: string;
  /** The documentation it serves, or a function that loads it on the first request. */
  readonly docs: DesignSystemDocs | (() => Promise<DesignSystemDocs>);
  /** Tools to add, or to replace by name. `null` removes a built-in one. */
  readonly tools?: Readonly<Record<string, Tool<z.ZodRawShape> | null>>;
  /** The instructions the client gives its agent: how to use the server. A default speaks of the design system. */
  readonly instructions?: string;
}

/** The instructions of a server, by default. */
export function defaultInstructions(docs: DesignSystemDocs): string {
  return [
    `${docs.name}: ${docs.components.length} web components, as <${docs.prefix}-…> elements, from ${docs.package}.`,
    "Before you write markup with them: list_components to find them, get_component to read each one, its rules and its attributes.",
    "After: check_markup on what you wrote, and fix each problem. Use only documented attributes, values, events and slots.",
  ].join("\n");
}

/**
 * The MCP server of a design system's documentation (ADR 0039): its tools,
 * and a resource per component (`<prefix>://components/<name>`). The server,
 * its tools and their answers speak of that design system only.
 */
export async function createMcpServer(options: McpServerOptions): Promise<McpServer> {
  const docs = typeof options.docs === "function" ? await options.docs() : options.docs;
  const server = new McpServer(
    { name: options.name, version: options.version },
    { instructions: options.instructions ?? defaultInstructions(docs) },
  );
  const tools: Record<string, Tool<z.ZodRawShape> | null> = {
    ...(builtinTools as Record<string, Tool<z.ZodRawShape>>),
    ...options.tools,
  };
  for (const [name, tool] of Object.entries(tools)) {
    if (!tool) {
      continue;
    }
    server.registerTool(
      name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async (args: Record<string, unknown>) => ({
        content: [{ type: "text" as const, text: await tool.run(args as never, docs) }],
      }),
    );
  }
  server.registerResource(
    "component",
    new ResourceTemplate(`${docs.prefix}://components/{name}`, {
      list: () => ({
        resources: docs.components.map((component) => ({
          uri: `${docs.prefix}://components/${component.name}`,
          name: component.tag,
          description: component.summary,
          mimeType: "text/markdown",
        })),
      }),
    }),
    { title: `A component of ${docs.name}`, mimeType: "text/markdown" },
    (uri, { name }) => {
      const component = findComponent(docs, String(name));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: component
              ? formatComponent(docs, component, "agent")
              : `${docs.name} has no component "${String(name)}".`,
          },
        ],
      };
    },
  );
  return server;
}

/** Serves a design system's documentation over the standard input and output: the bin of a design system. */
export async function serveStdio(options: McpServerOptions): Promise<void> {
  const server = await createMcpServer(options);
  await server.connect(new StdioServerTransport());
}
