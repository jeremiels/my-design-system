import type { LitElement } from "lit";
import { loadInvokers } from "../polyfills/invokers.js";
import type { AbstractConstructor, Constructor } from "../types/common.js";

export declare class CommandsInterface {
  /** Runs a command sent to the component. */
  protected handleCommand(event: CommandEvent): void;
}

/**
 * Mixin: lets a component take commands from invoker buttons (Invoker
 * Commands): a native `<button commandfor="id" command="--name">`, or a
 * component with `withInvoker` (`button`).
 *
 * The browser runs a built-in command (`show-modal`) only on a native
 * `<dialog>` or popover, and never sends it to a custom element. A component
 * takes custom commands, prefixed with `--`.
 *
 * Where Invoker Commands are missing, the first connected component loads
 * invokers-polyfill: the page's native invoker buttons need it too.
 */
export function withCommands<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class CommandsElement extends Base {
    constructor(...args: any[]) {
      super(...args);
      // `command` doesn't bubble: the browser dispatches it on the target.
      this.addEventListener("command", (event) => this.handleCommand(event as CommandEvent));
    }

    connectedCallback(): void {
      super.connectedCallback();
      void loadInvokers();
    }

    /**
     * Runs a command sent to the component: `event.command` is its name,
     * `event.source` the button, retargeted to its host. Does nothing by
     * default. Handle the component's `--` commands and ignore the others:
     * the polyfill also sends built-in ones.
     */
    protected handleCommand(_event: CommandEvent): void {}
  }
  // Through `unknown`: protected members make the interface nominal.
  return CommandsElement as unknown as Constructor<CommandsInterface> & T;
}
