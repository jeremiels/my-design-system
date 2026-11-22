import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import {
  checkMarkup,
  findComponent,
  formatComponent,
  formatComponentList,
  formatDiagnostics,
  formatSearchResults,
  searchDocs,
  type DesignSystemDocs,
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

/** The extensions of the files `check` reads in a folder. */
const MARKUP_FILES = new Set([".html", ".htm", ".vue"]);

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
    } else if (given || MARKUP_FILES.has(extname(path))) {
      files.push(path);
    }
  };
  for (const path of paths) {
    await walk(path, true);
  }
  return files;
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
    summary: "Finds the components whose docs hold every word.",
    usage: "<words>",
    run(args, { docs, json, out, err, name }) {
      const query = args.join(" ");
      if (!query) {
        err(`Usage: ${name} search <words>`);
        return 2;
      }
      const results = searchDocs(docs, query);
      out(
        json
          ? JSON.stringify(
              results.map(({ component, score, matches }) => ({
                name: component.name,
                tag: component.tag,
                summary: component.summary,
                score,
                matches,
              })),
              null,
              2,
            )
          : formatSearchResults(query, results),
      );
      return results.length > 0 ? 0 : 1;
    },
  },
  check: {
    summary:
      "Checks the components in HTML and Vue files: tags, attributes, values, events, slots.",
    usage: "<files or folders>",
    async run(args, { docs, json, out, err, name }) {
      if (args.length === 0) {
        err(`Usage: ${name} check <files or folders>`);
        return 2;
      }
      const diagnostics = [];
      for (const file of await markupFiles(args)) {
        const source = await readFile(file, "utf8");
        diagnostics.push(...checkMarkup(docs, source, { file: relative(process.cwd(), file) }));
      }
      out(json ? JSON.stringify(diagnostics, null, 2) : formatDiagnostics(diagnostics));
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
 * `list`, `show`, `search` and `check`, and the commands it adds. Its help
 * and its output speak of that design system only.
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
      `${options.name}: the components of ${name}.`,
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
