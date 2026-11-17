import type { ReactiveController, ReactiveControllerHost } from "lit";
import { loadInvokers } from "../polyfills/invokers.js";

/**
 * Reactive controller: lets a component take commands from invoker buttons
 * (Invoker Commands, ADR 0008): a native `<button commandfor="id"
 * command="--name">`, or a component with `withInvoker` (`button`).
 *
 * The browser runs a built-in command (`show-modal`) only on a native
 * `<dialog>` or popover, and never sends it to a custom element. A component
 * takes custom commands, prefixed with `--`.
 *
 * `handle` runs a command sent to the component: `event.command` is its
 * name, `event.source` the button, retargeted to its host. Handle the
 * component's `--` commands and ignore the others: the polyfill also sends
 * built-in ones.
 *
 * Where Invoker Commands are missing, the first connected component loads
 * invokers-polyfill: the page's native invoker buttons need it too.
 *
 * @example
 * class AcmeDrawer extends DSBaseElement {
 *   constructor() {
 *     super();
 *     new CommandsController(this, (event) => this.handleCommand(event));
 *   }
 * }
 */
export class CommandsController implements ReactiveController {
  constructor(host: ReactiveControllerHost & HTMLElement, handle: (event: CommandEvent) => void) {
    host.addController(this);
    // `command` doesn't bubble: the browser dispatches it on the target.
    host.addEventListener("command", (event) => handle(event as CommandEvent));
  }

  hostConnected(): void {
    void loadInvokers();
  }
}
