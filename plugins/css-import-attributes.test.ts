import { describe, expect, it } from "vitest";
import {
  CssImportError,
  findUncompiledCssImports,
  rewriteCssImports,
} from "./css-import-attributes.js";

describe("rewriteCssImports", () => {
  it("rewrites a default import with the type: css attribute", () => {
    const code = `import styles from "./a.css" with { type: "css" };\nconsole.log(styles);\n`;
    expect(rewriteCssImports(code, "a.ts")).toBe(
      `import styles from "./a.css?css-sheet";\nconsole.log(styles);\n`,
    );
  });

  it("keeps single quotes and a missing semicolon as they were", () => {
    const code = `import styles from './a.css' with {type:'css'}\nexport { styles };\n`;
    expect(rewriteCssImports(code, "a.js")).toBe(
      `import styles from './a.css?css-sheet'\nexport { styles };\n`,
    );
  });

  it("keeps the line count of a multi-line attribute clause", () => {
    const code = `import styles from "./a.css" with {\n  type: "css",\n};\nconst after = styles;\n`;
    const rewritten = rewriteCssImports(code, "a.ts")!;
    expect(rewritten.split("\n")).toHaveLength(code.split("\n").length);
    expect(rewritten.split("\n")[3]).toBe("const after = styles;");
  });

  it("rewrites a re-export", () => {
    const code = `export { default as styles } from "./a.css" with { type: "css" };\n`;
    expect(rewriteCssImports(code, "a.ts")).toBe(
      `export { default as styles } from "./a.css?css-sheet";\n`,
    );
  });

  it("rewrites every import, with non-ASCII text before them", () => {
    const code = [
      `// Thème — é à ü 🎨`,
      `import a from "./a.css" with { type: "css" };`,
      `import b from "./b.css" with { type: "css" };`,
    ].join("\n");
    expect(rewriteCssImports(code, "a.ts")).toBe(
      [
        `// Thème — é à ü 🎨`,
        `import a from "./a.css?css-sheet";`,
        `import b from "./b.css?css-sheet";`,
      ].join("\n"),
    );
  });

  it("parses TypeScript with decorators", () => {
    const code = [
      `import styles from "./a.css" with { type: "css" };`,
      `@customElement("my-a")`,
      `export class A extends LitElement {`,
      `  @property({ type: String }) label: string = "";`,
      `  static styles = [styles];`,
      `}`,
    ].join("\n");
    expect(rewriteCssImports(code, "a.ts")).toContain(`from "./a.css?css-sheet";`);
  });

  it("leaves side-effect imports, Vite query forms and other files alone", () => {
    expect(rewriteCssImports(`import "./main.css";\n`, "a.ts")).toBeNull();
    expect(rewriteCssImports(`import text from "./a.css?inline";\n`, "a.ts")).toBeNull();
    expect(rewriteCssImports(`import url from "./a.css?url";\n`, "a.ts")).toBeNull();
    expect(rewriteCssImports(`import { html } from "lit";\n`, "a.ts")).toBeNull();
    expect(rewriteCssImports(`import type Sheet from "./a.css";\n`, "a.ts")).toBeNull();
  });

  it("returns null on a syntax error so Vite reports it", () => {
    expect(rewriteCssImports(`import styles from "./a.css" with {`, "a.ts")).toBeNull();
  });

  it("rejects a value import of a .css file without the attribute", () => {
    const code = `const x = 1;\nimport styles from "./a.css";\n`;
    expect(() => rewriteCssImports(code, "a.ts")).toThrow(CssImportError);
    try {
      rewriteCssImports(code, "a.ts");
    } catch (error) {
      expect((error as CssImportError).pos).toBe(code.indexOf("import"));
    }
    expect(() => rewriteCssImports(`export { default } from "./a.css";\n`, "a.ts")).toThrow(
      CssImportError,
    );
  });

  it("rejects a dynamic import of a CSS module script", () => {
    const code = `const sheet = await import("./a.css", { with: { type: "css" } });\n`;
    expect(() => rewriteCssImports(code, "a.ts")).toThrow(/Dynamic import\(\)/);
  });
});

describe("findUncompiledCssImports", () => {
  it("finds CSS imports left in minified output", () => {
    const code = `import a from"./a.css"with{type:"css"};import"./b.css";const c=import("./c.css?inline");`;
    expect(findUncompiledCssImports(code, "chunk.js")).toEqual([
      "./a.css",
      "./b.css",
      "./c.css?inline",
    ]);
  });

  it("ignores CSS import examples inside strings", () => {
    const code = `const doc = "import a from \\"./a.css\\" with { type: \\"css\\" };";\nimport { html } from "lit";`;
    expect(findUncompiledCssImports(code, "chunk.js")).toEqual([]);
  });
});
