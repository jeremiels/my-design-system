#!/usr/bin/env node
// `acme`: the command line of ACME's documentation, with ACME's own command,
// `texts` (ADR 0039 of the base).
import { createCli } from "@unicorne/cli";
import { loadAcmeDocs, texts } from "../dist/docs.js";

process.exitCode = await createCli({
  name: "acme",
  docs: loadAcmeDocs,
  commands: {
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
