#!/usr/bin/env node
// `acme-mcp`: the MCP server of ACME's documentation, over stdio, with ACME's
// own tool, `get_texts` (ADR 0039 of the base).
import { defineTool, serveStdio } from "@unicorne/mcp";
import { loadAcmeDocs, texts } from "../dist/docs.js";

await serveStdio({
  name: "acme-design-system",
  version: "0.0.0",
  docs: loadAcmeDocs,
  tools: {
    get_texts: defineTool({
      title: "Get ACME's texts",
      description:
        "Gives ACME's texts: the default label of each property, in French. Reuse them in the interfaces you write: « Fermer », « Page suivante ».",
      input: {},
      run: () => JSON.stringify(texts, null, 2),
    }),
  },
});
