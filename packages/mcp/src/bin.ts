#!/usr/bin/env node
// `unicorne-mcp`: the MCP server of the base's documentation, over stdio. A
// design system builds its own with `serveStdio()` and its documentation
// (ADR 0039).
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { serveStdio } from "./server.ts";

await serveStdio({ name: "unicorne", version: "0.0.0", docs: loadSocleDocs });
