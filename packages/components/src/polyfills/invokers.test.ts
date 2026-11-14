// The polyfill path, in Chromium: this file removes the browser's Invoker
// Commands API before loading the components. Vitest runs each browser test
// file in its own iframe: the other files keep the native API.
//
// The native activation still reads the `commandfor` attribute: the polyfill
// stops the browser's own (trusted) `command` events, and each test checks
// that a command arrives exactly once.
import { html, LitElement } from "lit";
import { afterEach, describe, expect, it } from "vitest";

Reflect.deleteProperty(HTMLButtonElement.prototype, "commandForElement");
Reflect.deleteProperty(HTMLButtonElement.prototype, "command");
Reflect.deleteProperty(globalThis, "CommandEvent");

const { loadInvokers, nativeInvokers } = await import("./invokers.js");
const { withCommands } = await import("../mixins/withCommands.js");
const { withInvoker } = await import("../mixins/withInvoker.js");
await import("../define.js");

class Invoker extends withInvoker(LitElement) {
  render() {
    return html`<button type="button"><slot></slot></button>`;
  }
}
customElements.define("t-polyfilled-invoker", Invoker);

class Target extends withCommands(LitElement) {
  received: string[] = [];

  protected override handleCommand(event: CommandEvent) {
    this.received.push(event.command);
  }
}
customElements.define("t-polyfilled-target", Target);

/** An invoker and its target in a shadow root: the polyfill rejects those. */
class Host extends LitElement {
  render() {
    return html`
      <t-polyfilled-invoker commandfor="target" command="--go">Go</t-polyfilled-invoker>
      <t-polyfilled-target id="target"></t-polyfilled-target>
    `;
  }
}
customElements.define("t-polyfilled-host", Host);

function mount(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  return container;
}

/** After the polyfill: the components hand their button its target again. */
async function settled(element: LitElement) {
  await loadInvokers();
  await element.updateComplete;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("without Invoker Commands", () => {
  it("loads the polyfill", async () => {
    expect(nativeInvokers).toBe(false);
    await loadInvokers();
    expect("commandForElement" in HTMLButtonElement.prototype).toBe(true);
    expect(CommandEvent.toString()).not.toContain("native code");
  });

  it("opens a modal from a button component", async () => {
    const container = mount(`
      <u-button commandfor="modal" command="--show-modal">Open</u-button>
      <u-modal id="modal" label="Polyfilled"></u-modal>
    `);
    const button = container.querySelector<LitElement>("u-button")!;
    const modal = container.querySelector<HTMLElement & { open: boolean }>("u-modal")!;
    await settled(button);

    button.shadowRoot!.querySelector("button")!.click();

    expect(modal.open).toBe(true);
  });

  it("opens a modal from a native button", async () => {
    const container = mount(`
      <button type="button" commandfor="modal" command="--show-modal">Open</button>
      <u-modal id="modal" label="Polyfilled"></u-modal>
    `);
    const modal = container.querySelector<HTMLElement & { open: boolean }>("u-modal")!;
    await loadInvokers();

    container.querySelector("button")!.click();

    expect(modal.open).toBe(true);
  });

  it("sends a command once, to a target in a native button's tree", async () => {
    const container = mount(`
      <button type="button" commandfor="target" command="--go">Go</button>
      <t-polyfilled-target id="target"></t-polyfilled-target>
    `);
    const target = container.querySelector<Target>("t-polyfilled-target")!;
    await loadInvokers();

    container.querySelector("button")!.click();

    expect(target.received).toEqual(["--go"]);
  });

  it("sends a command once, to a target in the same shadow root", async () => {
    const host = mount("<t-polyfilled-host></t-polyfilled-host>").querySelector<Host>(
      "t-polyfilled-host",
    )!;
    await host.updateComplete;
    const invoker = host.shadowRoot!.querySelector<Invoker>("t-polyfilled-invoker")!;
    const target = host.shadowRoot!.querySelector<Target>("t-polyfilled-target")!;
    await settled(invoker);

    invoker.shadowRoot!.querySelector("button")!.click();

    expect(target.received).toEqual(["--go"]);
  });

  it("sends a command once, to a target rendered after its last update", async () => {
    const container = mount(
      `<t-polyfilled-invoker commandfor="later" command="--go">Go</t-polyfilled-invoker>`,
    );
    const invoker = container.querySelector<Invoker>("t-polyfilled-invoker")!;
    await settled(invoker);
    const target = document.createElement("t-polyfilled-target") as Target;
    target.id = "later";
    container.append(target);

    invoker.shadowRoot!.querySelector("button")!.click();

    expect(target.received).toEqual(["--go"]);
  });
});
