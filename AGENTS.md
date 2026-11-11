# Copilot Instructions for My Design System

## Project Overview

- **Purpose:** TypeScript design system on [Lit](https://lit.dev/) providing reusable web components (e.g., `my-button`, `my-modal`).
- **Build:** [Vite](https://vitejs.dev/) (v8 beta) bundles to ES modules; Lit is external (consumers install separately).
- **Testing:** [Vitest](https://vitest.dev/) with Storybook integration; tests run in Chromium via Playwright.
- **Linting:** [Oxlint](https://oxlint.com/) for TypeScript with `oxfmt` for formatting.
- **Node:** v24.8.0+; npm v11.6.0+

## Key Directories & Files

- `src/index.ts` — Main entry point; exports all public components (ES modules only).
- `src/components/` — Web components live here; each component gets its own folder (e.g., `button/`, `modal/`). Each component folder includes:
  - `component-name.ts` — The main component class
  - `component-name.css` — Its shadow-DOM styles, imported as a `CSSStyleSheet` (see Component Styles below)
  - `component-name.type.ts` — Types local to that component
  - `component-name.stories.ts` — Storybook stories and visual tests
  - Variant files (e.g., `button-link.ts` + `button-link.css`) for extended behaviors
- `src/mixins/` — Reusable behavior mixins (e.g., `withDisabled.ts`, `withInternals.ts`) that compose with components; a mixin with styles keeps them in a sibling `.css` file (`withDisabled.css`).
- `plugins/css-import-attributes.ts` — Local Vite plugin implementing `import sheet from "./x.css" with { type: "css" }` (Vite has no native support); unit-tested in `css-import-attributes.test.ts`.
- `src/events/` — Custom event classes for the whole design system, one file per event, named `{owner}-{event}.ts` (e.g., `button-click.ts` → `MyClickEvent`). Centralized regardless of how many components currently dispatch a given event — an event's name/shape is public API the moment it exists (it augments the global `GlobalEventHandlersEventMap`), unlike a private type, so this is the one place to scan "what does this design system emit" as it grows.
- `src/types/` — Shared types like `ComponentSize`, `SemanticVariant`, `ButtonVariant` (from `common.ts`).
- `src/components/MyDSBaseElement.ts` — Minimal base class with shadow DOM defaults (`box-sizing`, `[hidden]`) and `dir`/`lang` reactive properties.
- `src/styles/` — CSS organized by layer:
  - `main.css` — Entry point; imports and declares layer order
  - `layers/reset.css` — CSS reset for baseline consistency
  - `layers/tokens.css` — Token imports; organizes subdirectories
  - `layers/base.css` — Global element styles
  - `layers/utilities.css` — Utility classes (e.g., `.visually-hidden`)
  - `layers/shame.css` — Emergency overrides (must be documented with reason/ticket)
  - `tokens/` — Token files (color, spacing, typography) each declare `@layer tokens.{name}`
- `.storybook/` — Storybook config, setup files, and vitest integration

## Component Patterns

- **Base Class:** Extend `DSBaseElement` (`src/components/MyDSBaseElement.ts`) which provides shadow DOM defaults and inherits from `LitElement`.
- **Mixins:** Compose behaviors using mixins like `withDisabled()`. A mixin extends `Base` directly (real class composition, not a style-only merge) and adds properties/methods on top of it. Mixin signature:
  ```ts
  export function withDisabled<T extends Constructor<LitElement>>(Base: T);
  ```
  Call it with the base you want composed in — e.g. `withDisabled(DSBaseElement)` for the standard shadow-DOM defaults. `Base`'s own `static styles` are picked up automatically and merged with the mixin's own styles.
- **Properties & Types:** Use `@property()` decorator and types from `src/types/common.ts`:
  - `ComponentSize = "small" | "medium" | "large"`
  - `SemanticVariant = "success" | "danger" | "warning" | "information"` — Shared across components for semantic meaning
  - `ButtonVariant = "primary" | "secondary" | SemanticVariant` — Button-specific variants extending semantic variants
- **Custom Elements:** Register with `@customElement('my-component-name')` and declare in `HTMLElementTagNameMap` interface.
- **Accessibility:** Mixins like `withDisabled` manage aria attributes (e.g., `aria-disabled`). Use shadow DOM `:host` selectors for focus/hidden states.
- **ElementInternals:** `attachInternals()` can only be called once per element. Components that need form participation, custom states (`:state()`), or `ElementInternals`-based ARIA must apply `withInternals()` and read `this.internals` — never call `this.attachInternals()` directly (see `src/docs/mixins/withInternals.md`). Most display-only components don't need it.
- **Custom Events:** Dispatch events as typed `Event` subclasses from `src/events/`, not a generic string-keyed `emit()` helper. One file per event, named `{owner}-{event}.ts` (e.g. `button-click.ts`) so names stay collision-free as more components add events. Each class hardcodes its own `bubbles`/`cancelable`/`composed` and augments `GlobalEventHandlersEventMap` so listeners get a typed `event.detail` for free:
  ```ts
  export class MyClickEvent extends Event {
    readonly detail: { originalEvent: MouseEvent };
    constructor(detail: { originalEvent: MouseEvent }) {
      super("my-click", { bubbles: true, cancelable: false, composed: true });
      this.detail = detail;
    }
  }
  declare global {
    interface GlobalEventHandlersEventMap {
      "my-click": MyClickEvent;
    }
  }
  ```
  Dispatch with `this.dispatchEvent(new MyClickEvent({ originalEvent: e }))`.

## Workflows

- **Development:**
  - Start dev server: `npm run dev` (Vite server on localhost)
  - Build library: `npm run build` (runs tsc then vite build → ES module in dist/)
  - Preview build: `npm run preview`
- **Storybook:**
  - Start Storybook: `npm run storybook` (port 6006)
  - Build Storybook: `npm run build-storybook`
  - Tests: Vitest automatically runs `.stories.ts` files in browser via Storybook addon
- **Testing:**
  - Run all tests: `npx vitest` (`unit` project: plugin tests in Node; `storybook` project: stories in Chromium via Playwright)
  - Setup: `.storybook/vitest.setup.ts` configures Storybook test environment
- **Linting & Formatting:**
  - Lint: `npm run lint` (oxlint, auto-fixes issues)
  - Format check: `npm run fmt:check` (oxfmt)
  - Format: `npm run fmt`

## CSS Architecture & Layer Organization

- **Cascade Layers:** CSS organized into layers with explicit priority: `reset > tokens > base > components > utilities > shame`
- **Main Entry:** `src/styles/main.css` imports layer files and declares layer order
- **Token Pattern:** Each token file declares its own `@layer tokens.{name}` block (self-documenting approach):
  ```css
  /* src/styles/tokens/color.css */
  @layer tokens.color {
    :root {
      --color-primary: hsl(210, 100%, 50%);
    }
  }
  ```
  Then `src/styles/layers/tokens.css` imports without `layer()` function and declares sub-layer order:
  ```css
  @import "../tokens/color.css";
  @import "../tokens/spacing.css";
  @import "../tokens/typography.css";
  @layer tokens.color, tokens.spacing, tokens.typography;
  ```
  This avoids nested layer syntax errors during minification.
- **Reset & Utilities:** Provides baseline styles and helper classes (e.g., `.visually-hidden`)
- **Shame Layer:** For emergency `!important` overrides only — must be documented with issue/ticket reference
- **Three-Tier Tokens:** primitive (`tokens/color.css`, etc.) → semantic (`tokens/semantic.css`, intent-based aliases like `--color-action-bg`) → component (`--my-button-background-color`, declared on `:host`, defaulting to a semantic token — never a literal). Components must not hardcode colors/spacing/radius/motion; see [CSS Architecture Documentation](src/docs/architecture/css-architecture.mdx) for the full pattern.

## Conventions & Key Points

- **No Lit Bundling:** Lit is marked as `external` in `vite.config.ts` — consumers install separately.
- **Aliases:** Use `@/` for `src/` imports (configured in `vite.config.ts`).
- **Strict TypeScript:** Strict mode enabled; follow type safety rigorously.
- **Accessibility:** Use `a11y` Storybook addon; tests run via vitest in real browser.
- **Component Exports:** Only export public components from `src/index.ts`.
- **Build Output:** `npm run build` produces ES module in `dist/` (bundled CSS included).
- **Component Styles:** Each component/mixin keeps its styles in a sibling `.css` file, imported as a CSS module script and appended to `static styles` after the inherited ones — never inline Lit `css` tagged templates:
  ```ts
  import alertStyles from "./alert.css" with { type: "css" };
  // ...
  static styles = [DSBaseElement.styles ?? [], alertStyles];
  ```
  The default export is a constructable `CSSStyleSheet` (typed in `src/css-modules.d.ts`). `plugins/css-import-attributes.ts` makes this work in Vite, Storybook and Vitest (`vitest.config.ts` merges `vite.config.ts`), and inlines the minified CSS into the built JS, so consumers need no CSS-import support. Don't use a default import of a `.css` file without `with { type: "css" }`, and don't import the global `src/styles/` sheets this way — those are document-level, not shadow-DOM, styles. The plugin errors on such misuse (value import without the attribute, dynamic `import()` of a CSS module) and fails the build if any `.css` import is left in the shipped JS (Safari has no CSS module scripts).
  **When Vite supports `type: "css"` natively** (vitejs/vite#18534): delete the plugin, check that the build output still has no `.css` imports (keep the `findUncompiledCssImports` check), and drop `src/css-modules.d.ts` if `vite/client` types these imports.

## Examples

- **Component Import:**
  ```ts
  import { Button } from "@/components/button/button.ts";
  ```
- **Mixin Usage:**
  ```ts
  export class MyComponent extends withDisabled(DSBaseElement) {
    /* ... */
  }
  ```

## See Also

- [CSS Architecture Documentation](src/docs/architecture/css-architecture.mdx) — Detailed CSS layer organization and patterns
- [Withes Documentation](src/docs/mixins/withDisabled.md) — Mixin patterns and composition
- [withInternals Documentation](src/docs/mixins/withInternals.md) — `ElementInternals` sharing across mixins/components
- `.oxlintrc.json` — Linting rules
- `vite.config.ts` — Build configuration, plugins and external dependencies
- `vitest.config.ts` — Test runner and browser configuration
- `.storybook/` — Storybook setup and testing integration

---

For questions about project-specific patterns, review the referenced files or ask for clarification.
