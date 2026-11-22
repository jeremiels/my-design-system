#!/usr/bin/env node
// `unicorne`: the command line of the base's documentation. A design system
// builds its own with `createCli()` and its documentation (ADR 0039).
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { createCli } from "./cli.ts";

process.exitCode = await createCli({ name: "unicorne", docs: loadSocleDocs }).run(
  process.argv.slice(2),
);
