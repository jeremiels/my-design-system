import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import {
  checkMarkup,
  filterTokens,
  findComponent,
  findToken,
  fixMarkup,
  formatComponent,
  formatComponentList,
  formatDiagnostics,
  formatIconList,
  formatSearchResults,
  formatToken,
  formatTokenList,
  searchDocs,
  searchIcons,
  searchTokens,
  type DesignSystemDocs,
  type Diagnostic,
  type TokenFilter,
  type TokenLevel,
} from "@unicorne/catalog";

/** What a command receives. */
export interface CommandContext {
  /** The documentation the CLI consults. */
  readonly docs: DesignSystemDocs;
  /** The name of the command line: `acme`. */
  readonly name: string;
  /** Whether to print JSON, for a script: `--json`. */
  readonly json: boolean;
  /** Prints to the standard output. */
  out(text: string): void;
  /** Prints to the standard error. */
  err(text: string): void;
}

/** A command of the CLI: `acme show button`. */
export interface Command {
  /** What it does, in a line of the help. */
  readonly summary: string;
  /** Its arguments, for the help: `<component>`. */
  readonly usage?: string;
  /** Runs it; returns the exit code. */
  run(args: readonly string[], context: CommandContext): number | Promise<number>;
}

/**
 * The extensions of the files `check` reads in a folder: markup, CSS (ADR
 * 0043), and the scripts whose Lit templates it reads (ADR 0048).
 */
const MARKUP_FILES = new Set([
  ".html",
  ".htm",
  ".vue",
  ".css",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
]);

/** The markup files of `paths`: files as given, folders walked, without `node_modules` nor `dist`. */
async function markupFiles(paths: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  const walk = async (path: string, given: boolean) => {
    const info = await stat(path);
    if (info.isDirectory()) {
      for (const entry of await readdir(path)) {
        if (!["node_modules", "dist"].includes(entry) && !entry.startsWith(".")) {
          await walk(join(path, entry), false);
        }
      }
    } else if (given || (MARKUP_FILES.has(extname(path)) && !path.endsWith(".d.ts"))) {
      files.push(path);
    }
  };
  for (const path of paths) {
    await walk(path, true);
  }
  return files;
}

const TOKEN_LEVELS: readonly string[] = ["primitive", "semantic", "component"];

/**
 * The filter of `tokens`: a level name, a group, and `--type <type>`. A type
 * is an option: `shadow` names both a group and a type.
 */
function tokenFilter(args: readonly string[]): TokenFilter {
  const filter: { level?: TokenLevel; group?: string; type?: string } = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === "--type") {
      filter.type = args[(index += 1)];
    } else if (TOKEN_LEVELS.includes(arg)) {
      filter.level = arg as TokenLevel;
    } else {
      filter.group = arg;
    }
  }
  return filter;
}

/** The commands every design system's CLI has. */
export const builtinCommands: Readonly<Record<string, Command>> = {
  list: {
    summary: "Lists the components.",
    run(_args, { docs, json, out }) {
      out(
        json
          ? JSON.stringify(
              docs.components.map(({ name, tag, summary }) => ({ name, tag, summary })),
              null,
              2,
            )
          : formatComponentList(docs),
      );
      return 0;
    },
  },
  show: {
    summary: "Shows a component: when to use it, its rules and its API.",
    usage: "<component>",
    run([query], { docs, json, out, err, name }) {
      const component = query ? findComponent(docs, query) : undefined;
      if (!component) {
        err(
          query
            ? `${docs.name} has no component "${query}". List them: ${name} list.`
            : `Usage: ${name} show <component>`,
        );
        return query ? 1 : 2;
      }
      out(json ? JSON.stringify(component, null, 2) : formatComponent(docs, component, "human"));
      return 0;
    },
  },
  search: {
    summary:
      "Finds the components, tokens and icons whose docs hold every word, or the tokens of a value (#1c65c8, 16px).",
    usage: "<words or value>",
    run(args, { docs, json, out, err, name }) {
      const query = args.join(" ");
      if (!query) {
        err(`Usage: ${name} search <words or value>`);
        return 2;
      }
      const results = searchDocs(docs, query);
      const tokens = searchTokens(docs, query);
      const icons = searchIcons(docs, query, { limit: 10 });
      out(
        json
          ? JSON.stringify(
              [
                ...results.map(({ component, score, matches }) => ({
                  kind: "component",
                  name: component.name,
                  tag: component.tag,
                  summary: component.summary,
                  score,
                  matches,
                })),
                ...tokens.map(({ token, score, matches }) => ({
                  kind: "token",
                  id: token.id,
                  name: token.name,
                  value: token.value,
                  description: token.description,
                  score,
                  matches,
                })),
                ...icons.map(({ icon, score, matches }) => ({
                  kind: "icon",
                  ...icon,
                  score,
                  matches,
                })),
              ],
              null,
              2,
            )
          : formatSearchResults(query, results, tokens, icons),
      );
      return results.length + tokens.length + icons.length > 0 ? 0 : 1;
    },
  },
  tokens: {
    summary:
      "Lists the tokens: the semantic ones by default, or those of a level (primitive, semantic, component), a group (color.action) or a type.",
    usage: "[level] [group] [--type <type>]",
    run(args, { docs, json, out }) {
      const filter = tokenFilter(args);
      const unfiltered = !filter.level && !filter.group && !filter.type;
      out(
        json
          ? JSON.stringify(filterTokens(docs, unfiltered ? { level: "semantic" } : filter), null, 2)
          : formatTokenList(docs, filter),
      );
      return 0;
    },
  },
  icons: {
    summary:
      "Lists the icons of the set, or those whose name, tags, categories or description hold every word.",
    usage: "[words]",
    run(args, { docs, json, out }) {
      const query = args.join(" ");
      out(
        json
          ? JSON.stringify(
              searchIcons(docs, query).map(({ icon }) => icon),
              null,
              2,
            )
          : formatIconList(docs, query),
      );
      return 0;
    },
  },
  token: {
    summary: "Shows a token: what to use it for, its custom property and its values in each theme.",
    usage: "<token or custom property>",
    run([query], { docs, json, out, err, name }) {
      const token = query ? findToken(docs, query) : undefined;
      if (!token) {
        err(
          query
            ? `${docs.name} has no token "${query}". List them: ${name} tokens.`
            : `Usage: ${name} token <token or custom property>`,
        );
        return query ? 1 : 2;
      }
      out(json ? JSON.stringify(token, null, 2) : formatToken(docs, token));
      return 0;
    },
  },
  check: {
    summary:
      "Checks the components in HTML, Vue files and the Lit templates of scripts: tags, attributes, values, events, slots. And the tokens in their CSS, and in CSS files.",
    usage: "<files or folders> [--fix [--unsafe]]",
    async run(args, { docs, json, out, err, name }) {
      // `--fix` writes the safe fixes, `--unsafe` the others too (ADR 0045).
      const fix = args.includes("--fix");
      const unsafe = args.includes("--unsafe");
      const paths = args.filter((arg) => arg !== "--fix" && arg !== "--unsafe");
      if (paths.length === 0 || (unsafe && !fix)) {
        err(`Usage: ${name} check <files or folders> [--fix [--unsafe]]`);
        return 2;
      }
      const diagnostics: Diagnostic[] = [];
      let fixed = 0;
      let files = 0;
      for (const path of await markupFiles(paths)) {
        const source = await readFile(path, "utf8");
        const file = relative(process.cwd(), path);
        if (fix) {
          const result = fixMarkup(docs, source, { file, unsafe });
          if (result.output !== source) {
            await writeFile(path, result.output);
            fixed += result.fixed;
            files += 1;
          }
          diagnostics.push(...result.diagnostics);
        } else {
          diagnostics.push(...checkMarkup(docs, source, { file }));
        }
      }
      if (json) {
        out(JSON.stringify(diagnostics, null, 2));
      } else {
        out(
          [
            ...(fix
              ? [
                  `Fixed ${fixed} problem${fixed === 1 ? "" : "s"} in ${files} file${files === 1 ? "" : "s"}.`,
                ]
              : []),
            formatDiagnostics(diagnostics),
          ].join("\n"),
        );
      }
      return diagnostics.some(({ severity }) => severity === "error") ? 1 : 0;
    },
  },
};

/** The options of `createCli()`. */
export interface CliOptions {
  /** The name of the command line, in the help: `acme`. */
  readonly name: string;
  /** The documentation it consults, or a function that loads it on the first command. */
  readonly docs: DesignSystemDocs | (() => Promise<DesignSystemDocs>);
  /**
   * Commands to add, or to replace by name. `null` removes a built-in one:
   * `{ check: null }`.
   */
  readonly commands?: Readonly<Record<string, Command | null>>;
  /** Where to print: the process's streams by default. */
  readonly out?: (text: string) => void;
  readonly err?: (text: string) => void;
}

/** A command line. */
export interface Cli {
  /** Its commands, built-in and added. */
  readonly commands: Readonly<Record<string, Command>>;
  /** Runs the command of `argv`, the arguments after the program; returns the exit code. */
  run(argv: readonly string[]): Promise<number>;
}

/**
 * The command line of a design system's documentation (ADR 0039):
 * `list`, `show`, `search` and `check`, `tokens` and `token` (ADR 0042),
 * `icons` (ADR 0044), and the commands it adds. Its help and its output speak of that design system
 * only.
 */
export function createCli(options: CliOptions): Cli {
  const commands = Object.fromEntries(
    Object.entries({ ...builtinCommands, ...options.commands }).filter(
      (entry): entry is [string, Command] => entry[1] !== null,
    ),
  );
  const out = options.out ?? ((text: string) => process.stdout.write(`${text}\n`));
  const err = options.err ?? ((text: string) => process.stderr.write(`${text}\n`));
  let loaded: Promise<DesignSystemDocs> | undefined;
  const docs = () =>
    (loaded ??=
      typeof options.docs === "function" ? options.docs() : Promise.resolve(options.docs));

  const help = async () => {
    const { name } = await docs();
    const width = Math.max(...Object.keys(commands).map((command) => command.length));
    return [
      `${options.name}: the components, the tokens and the icons of ${name}.`,
      "",
      `Usage: ${options.name} <command> [arguments] [--json]`,
      "",
      ...Object.entries(commands).map(
        ([command, { summary, usage }]) =>
          `  ${command.padEnd(width)}  ${summary}${usage ? ` ${options.name} ${command} ${usage}` : ""}`,
      ),
    ].join("\n");
  };

  return {
    commands,
    async run(argv) {
      const json = argv.includes("--json");
      const [command, ...args] = argv.filter((arg) => arg !== "--json");
      if (!command || command === "help" || command === "--help" || command === "-h") {
        out(await help());
        return 0;
      }
      const run = commands[command];
      if (!run) {
        err(`Unknown command "${command}".\n\n${await help()}`);
        return 2;
      }
      return run.run(args, { docs: await docs(), name: options.name, json, out, err });
    },
  };
}
