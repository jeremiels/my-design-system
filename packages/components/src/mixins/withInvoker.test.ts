// A component that renders a native <button> sends commands like a native
// invoker button: the browser does it, from the target `withInvoker` gives
// its inner button. Chromium has Invoker Commands: these tests check the
// native path, not the polyfill.
import { html, LitElement } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import "../define.js";
import type { Button } from "../components/button/button.js";
import { CommandsController } from "../controllers/commands.js";
import { withInvoker } from "./withInvoker.js";

class Invoker extends withInvoker(LitElement) {
  render() {
    return html`<button type="button"><slot></slot></button>`;
  }
}
customElements.define("t-invoker", Invoker);

class Target extends LitElement {
  received: { command: string; source: Element | null }[] = [];

  constructor() {
    super();
    new CommandsController(this, (event) =>
      this.received.push({ command: event.command, source: event.source }),
    );
  }
}
customElements.define("t-command-target", Target);

/** Renders an invoker and its target in its own shadow root. */
class Host extends LitElement {
  render() {
    return html`
      <t-invoker commandfor="target" command="--go">Go</t-invoker>
      <t-command-target id="target"></t-command-target>
    `;
  }
}
customElements.define("t-invoker-host", Host);

function mount(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  return container;
}

/** Clicks the native button inside the component, as a user does. */
async function click(invoker: LitElement) {
  await invoker.updateComplete;
  invoker.shadowRoot!.querySelector("button")!.click();
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("withInvoker", () => {
  it("sends a custom command to the element commandfor names", async () => {
    const container = mount(`
      <t-invoker commandfor="target" command="--go">Go</t-invoker>
      <t-command-target id="target"></t-command-target>
    `);
    const invoker = container.querySelector<Invoker>("t-invoker")!;
    const target = container.querySelector<Target>("t-command-target")!;

    await click(invoker);

    // The source is retargeted to the host: the inner button is in its shadow root.
    expect(target.received).toEqual([{ command: "--go", source: invoker }]);
  });

  it("finds the target in the shadow root it's rendered in", async () => {
    const host = mount("<t-invoker-host></t-invoker-host>").querySelector<Host>("t-invoker-host")!;
    await host.updateComplete;
    const invoker = host.shadowRoot!.querySelector<Invoker>("t-invoker")!;
    const target = host.shadowRoot!.querySelector<Target>("t-command-target")!;

    await click(invoker);

    expect(target.received).toEqual([{ command: "--go", source: invoker }]);
  });

  it("prefers commandForElement to commandfor", async () => {
    const container = mount(`
      <t-invoker commandfor="first" command="--go">Go</t-invoker>
      <t-command-target id="first"></t-command-target>
      <t-command-target id="second"></t-command-target>
    `);
    const invoker = container.querySelector<Invoker>("t-invoker")!;
    const [first, second] = container.querySelectorAll<Target>("t-command-target");
    invoker.commandForElement = second;

    await click(invoker);

    expect(first.received).toEqual([]);
    expect(second.received).toHaveLength(1);
  });

  it("finds a target rendered after its last update", async () => {
    const container = mount(`<t-invoker commandfor="later" command="--go">Go</t-invoker>`);
    const invoker = container.querySelector<Invoker>("t-invoker")!;
    await invoker.updateComplete;
    const target = document.createElement("t-command-target") as Target;
    target.id = "later";
    container.append(target);

    await click(invoker);

    expect(target.received).toHaveLength(1);
  });

  it("gives its button no command without a target", async () => {
    const container = mount(`<t-invoker commandfor="missing" command="--go">Go</t-invoker>`);
    const invoker = container.querySelector<Invoker>("t-invoker")!;
    await invoker.updateComplete;

    // The polyfill throws on a button with `command` and no `commandfor`.
    const button = invoker.shadowRoot!.querySelector("button")!;
    expect(button.hasAttribute("command")).toBe(false);
    expect(button.commandForElement).toBeNull();
  });

  it("runs a built-in command on a native dialog", async () => {
    const container = mount(`
      <t-invoker commandfor="dialog" command="show-modal">Open</t-invoker>
      <dialog id="dialog" aria-label="Native">Native dialog</dialog>
    `);
    const dialog = container.querySelector("dialog")!;

    await click(container.querySelector<Invoker>("t-invoker")!);

    expect(dialog.open).toBe(true);
    expect(dialog.matches(":modal")).toBe(true);
    dialog.close();
  });

  it("sends nothing from a disabled button", async () => {
    const container = mount(`
      <u-button disabled commandfor="target" command="--go">Go</u-button>
      <t-command-target id="target"></t-command-target>
    `);
    const button = container.querySelector<Button>("u-button")!;
    const target = container.querySelector<Target>("t-command-target")!;

    await click(button);

    expect(target.received).toEqual([]);
  });
});

describe("CommandsController", () => {
  it("receives the custom commands of a native invoker button", () => {
    const container = mount(`
      <button type="button" commandfor="target" command="--go">Go</button>
      <t-command-target id="target"></t-command-target>
    `);
    const button = container.querySelector("button")!;
    const target = container.querySelector<Target>("t-command-target")!;

    button.click();

    expect(target.received).toEqual([{ command: "--go", source: button }]);
  });

  it("never receives a built-in command: the browser keeps those for dialogs and popovers", () => {
    const container = mount(`
      <button type="button" commandfor="target" command="show-modal">Open</button>
      <t-command-target id="target"></t-command-target>
    `);
    const target = container.querySelector<Target>("t-command-target")!;

    container.querySelector("button")!.click();

    expect(target.received).toEqual([]);
  });
});
