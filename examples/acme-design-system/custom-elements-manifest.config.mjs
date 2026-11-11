// The brand's own manifest. `dependencies: true` pulls in the base's manifest
// (its `customElements` field) so components extending the base's classes are
// documented with what they inherit. Its dependency crawl prints
// "Cannot resolve './x.js'" for TypeScript sources (imported as .js); harmless.
export default {
  globs: ["src/**/*.ts"],
  exclude: ["src/define.ts", "src/**/*.d.ts"],
  outdir: ".",
  litelement: true,
  dependencies: true,
};
