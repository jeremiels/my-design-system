// Custom Elements Manifest (ADR 0001, D5): generated from the components'
// JSDoc and TypeScript by `npm run analyze`, committed so API changes show up
// in review, and published with the package (`customElements` field).
export default {
  globs: ["src/**/*.ts"],
  exclude: [
    "src/**/*.stories.ts",
    "src/**/*.test.ts",
    "src/**/*.d.ts",
    // Registration plumbing, not components (its anonymous subclass would be
    // reported as one).
    "src/registry/**",
    "src/define.ts",
  ],
  outdir: ".",
  litelement: true,
  plugins: [
    {
      // `dispatchEvent(new ClickEvent(...))` yields an unnamed event next to
      // the documented one (`@fires u-click`): keep documented events only.
      name: "drop-unnamed-events",
      packageLinkPhase({ customElementsManifest }) {
        for (const module of customElementsManifest.modules) {
          for (const declaration of module.declarations ?? []) {
            if (declaration.events) {
              declaration.events = declaration.events.filter((event) => event.name);
            }
          }
        }
      },
    },
  ],
};
