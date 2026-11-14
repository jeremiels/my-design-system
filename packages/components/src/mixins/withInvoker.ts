import type { LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { invokersReady, loadInvokers, nativeInvokers } from "../polyfills/invokers.js";
import type { AbstractConstructor, Constructor } from "../types/common.js";

export declare class InvokerInterface {
  commandFor?: string;
  command?: string;
  commandForElement: Element | null;
  /** The native `<button>` that sends the command. */
  protected get invokerControl(): HTMLButtonElement | null;
}

/**
 * Mixin: makes a component that renders a native `<button>` an invoker, as
 * `<button commandfor command>` is (Invoker Commands). The component takes
 * `commandfor` and `command`, and hands them to its native button: the
 * browser sends the command, runs the built-in ones on a native `<dialog>`
 * or popover, and retargets `event.source` to the host.
 *
 * Where Invoker Commands are missing, the first component with a `command`
 * loads invokers-polyfill.
 */
export function withInvoker<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class InvokerElement extends Base {
    /**
     * `id` of the element the button controls, in the button's tree: the
     * document, or the shadow root the button is rendered in. Needs `command`.
     */
    @property({ type: String, attribute: "commandfor" })
    commandFor?: string;

    /**
     * Command sent on click: a built-in one for a native `<dialog>` or
     * popover (`show-modal`, `close`, `toggle-popover`…), or a custom one,
     * prefixed with `--`, for a component (`--show-modal` for `modal`).
     */
    @property({ type: String })
    command?: string;

    /**
     * The element the button controls. Takes precedence over `commandfor`,
     * and reaches an element of an enclosing shadow root, like the native
     * property.
     */
    @property({ attribute: false })
    commandForElement: Element | null = null;

    constructor(...args: any[]) {
      super(...args);
      // On the host, in the capture phase: before the native activation
      // reads the button's target. A target rendered after the button's last
      // update (a framework's later render) is found there.
      this.addEventListener("click", this.#syncOnClick, { capture: true });
    }

    /**
     * The native `<button>` that sends the command: the first `button` of the
     * shadow root. Override it when the template renders another one first.
     */
    protected get invokerControl(): HTMLButtonElement | null {
      return this.renderRoot?.querySelector("button") ?? null;
    }

    protected updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);
      this.#sync();
    }

    /** `commandForElement`, or the element `commandfor` names in the host's tree. */
    #target(): Element | null {
      if (this.commandForElement) {
        return this.commandForElement;
      }
      if (!this.commandFor) {
        return null;
      }
      const root = this.getRootNode();
      return root instanceof Document || root instanceof ShadowRoot
        ? root.getElementById(this.commandFor)
        : null;
    }

    /** Hands the command and its target to the native button. Returns the target. */
    #sync(): Element | null {
      const control = this.invokerControl;
      const target = this.command ? this.#target() : null;
      if (!control) {
        return target;
      }
      if (!invokersReady()) {
        if (this.command) {
          void loadInvokers().then(() => this.requestUpdate());
        }
        return target;
      }
      // Both or neither: the polyfill throws on a `command` without `commandfor`.
      if (target && this.command) {
        control.setAttribute("command", this.command);
      } else {
        control.removeAttribute("command");
      }
      if (control.commandForElement !== target) {
        control.commandForElement = target;
      }
      return target;
    }

    #syncOnClick = (event: Event) => {
      const control = this.invokerControl;
      if (!control || !event.composedPath().includes(control)) {
        return;
      }
      const before = invokersReady() ? control.commandForElement : null;
      const target = this.#sync();
      // The polyfill handles the click first, in the document's capture
      // phase, with the target the button had then. It had none for a target
      // rendered since, or in a shadow root other than the document (it
      // rejects those): send the custom command here instead.
      if (
        !nativeInvokers &&
        target &&
        before !== target &&
        this.command?.startsWith("--") &&
        typeof CommandEvent === "function"
      ) {
        target.dispatchEvent(
          new CommandEvent("command", { command: this.command, source: this, cancelable: true }),
        );
      }
    };
  }
  // Through `unknown`: protected members make the interface nominal.
  return InvokerElement as unknown as Constructor<InvokerInterface> & T;
}
