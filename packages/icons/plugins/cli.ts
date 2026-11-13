#!/usr/bin/env node
// `unicorne-icons <sources> --out <dir> [--svg-out <dir>] [--export <name>] [--max-bytes <n>]`:
// the SVG files of <sources> as an icon set (ADR 0005). See icon-set.ts.
import { parseArgs } from "node:util";
import { MAX_BYTES, readIconSet, writeIconSet } from "./icon-set.ts";

const USAGE =
  "Usage: unicorne-icons <sources> --out <dir> [--svg-out <dir>] [--export <name>] [--max-bytes <n>]";

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "svg-out": { type: "string" },
      export: { type: "string", default: "icons" },
      "max-bytes": { type: "string", default: String(MAX_BYTES) },
    },
  });
  const [sources, ...extra] = positionals;
  const maxBytes = Number(values["max-bytes"]);
  if (!sources || extra.length > 0 || !values.out || !Number.isInteger(maxBytes)) {
    throw new Error(USAGE);
  }
  const icons = await readIconSet(sources, { maxBytes });
  await writeIconSet(icons, {
    out: values.out,
    svgOut: values["svg-out"],
    exportName: values.export,
  });
  console.log(`unicorne-icons: ${icons.size} icons from ${sources} → ${values.out}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
