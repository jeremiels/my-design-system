#!/usr/bin/env node
// `acme`: the command line of ACME's documentation, with ACME's own command,
// `texts` (ADR 0039 of the base), and `a2ui`, its A2UI catalog (ADR 0052).
import { a2uiCommand } from "@unicorne/a2ui/document";
import { createCli } from "@unicorne/cli";
import { acmeCatalogId, acmeMappings, loadAcmeDocs, texts } from "../dist/docs.js";

process.exitCode = await createCli({
  name: "acme",
  docs: loadAcmeDocs,
  commands: {
    // The build writes its output: `acme a2ui > a2ui-catalog.json`.
    a2ui: a2uiCommand({ catalogId: acmeCatalogId, mappings: acmeMappings }),
    texts: {
      summary: "Lists ACME's texts: the default label of each property, in French.",
      run(_args, { json, out }) {
        out(
          json
            ? JSON.stringify(texts, null, 2)
            : Object.entries(texts)
                .map(([property, text]) => `- \`${property}\`: ${text}`)
                .join("\n"),
        );
        return 0;
      },
    },
  },
}).run(process.argv.slice(2));
