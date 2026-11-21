import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Button } from "../button/button";
import type { Icon } from "../icon/icon";
import type { Modal } from "./modal";

const meta = preview.meta({
  title: "Components/Modal",
  component: "u-modal",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
    label: { control: "text" },
    closedBy: { control: "select", options: ["closerequest", "any", "none"] },
    slot: { control: "text" },
  },
  args: {
    open: false,
    label: "Example dialog",
    closedBy: "closerequest",
    slot: "Modal content",
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `u-modal` component displays content in a modal dialog. A button opens it without script: `commandfor` names the modal, `command` gives `--show-modal`. Script opens it with `showModal()`. `label` gives the dialog its accessible name.",
      },
      // `<dialog>` opened via showModal() renders in the browser's top
      // layer, which is shared by the whole Docs page under Storybook's
      // default inline rendering — every "open" story would stack its
      // dialog on top of the others. Each story gets its own iframe (and
      // so its own top layer) instead.
      story: { inline: false, iframeHeight: "400px" },
    },
  },
});

export default meta;

/**
 * Reopens the modal once its play function has closed it: every story keeps
 * a way to see the modal.
 */
function opener(id: string, label = "Open modal") {
  return html`<u-button commandfor=${id} command="--show-modal">${label}</u-button>`;
}

/** The native `<button>` inside a `u-button`: the element a user clicks. */
function control(button: Element): HTMLButtonElement {
  return button.shadowRoot!.querySelector("button")!;
}

function closeButton(modal: Modal): HTMLButtonElement {
  return control(modal.shadowRoot!.querySelector('[part~="close-button"]')!);
}

/**
 * Waits for the entry and exit transitions of the modals: axe, which runs
 * after the play function, would measure the contrast of a fading modal.
 */
async function transitionsEnd(root: Element) {
  const animations = [...root.querySelectorAll<Modal>("u-modal")].flatMap(
    (modal) => modal.shadowRoot?.querySelector("dialog")?.getAnimations({ subtree: true }) ?? [],
  );
  await Promise.allSettled(animations.map((animation) => animation.finished));
}

/**
 * Default modal in closed state
 */
export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'A closed modal, opened by a `u-button` with `commandfor="modal"` and `command="--show-modal"`.',
      },
    },
  },
  render: (args) => html`
    <u-button commandfor="modal" command="--show-modal">Open modal</u-button>
    <u-modal id="modal" ?open=${args.open} label=${args.label} closedby=${args.closedBy}>
      ${args.slot}
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("u-modal");
    expect(modal).toBeTruthy();
    expect(modal?.getAttribute("open")).toBeNull();
  },
});

/**
 * Modal in open state
 */
export const Opened = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The `open` attribute opens the modal from the HTML, without a button or script. `label` is its title, a heading that names the dialog. The close button gets the focus.",
      },
    },
  },
  render: (args) => html`
    ${opener("modal")}
    <u-modal id="modal" open label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    expect(modal.getAttribute("open")).toBe("");
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    // The title shows at the top, and names the dialog.
    const heading = modal.shadowRoot!.querySelector<HTMLElement>('[part~="heading"]')!;
    expect(heading.textContent).toBe("Example dialog");
    expect(heading.checkVisibility()).toBe(true);
    await expect(dialog).toHaveAccessibleName("Example dialog");
    // Opened on its first render, before its close button rendered.
    const close = modal.shadowRoot!.querySelector('[part~="close-button"]')!;
    await waitFor(() => expect(close.matches(":focus-within")).toBe(true));
    await transitionsEnd(canvasElement);
  },
});

/**
 * The close button: an icon, with an accessible name
 */
export const CloseButton = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The close button shows the `close` icon. `close-label` gives it its accessible name: translate it with the page, here in French.",
      },
    },
  },
  render: () => html`
    ${opener("fermer", "Ouvrir")}
    <u-modal id="fermer" open label="Exemple" close-label="Fermer">Contenu de la modale</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const icon = modal.shadowRoot!.querySelector<Icon>('[part~="close-icon"]')!;
    await icon.updateComplete;

    await modal.shadowRoot!.querySelector<Button>('[part~="close-button"]')!.updateComplete;
    expect(icon.shadowRoot!.querySelector("svg")).toBeTruthy();
    // The close button is a `u-button`: `close-label` is its `label`, the name of its native control.
    await expect(closeButton(modal)).toHaveAccessibleName("Fermer");

    await transitionsEnd(canvasElement);
    // A square button around the icon.
    const box = closeButton(modal).getBoundingClientRect();
    expect(box.width).toBeCloseTo(box.height, 1);
  },
});

export const HiddenTitle = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`label-hidden` hides the title on screen, for a content that shows its own: `label` still names the dialog.",
      },
    },
  },
  render: () => html`
    ${opener("confirm", "Supprimer")}
    <u-modal id="confirm" open label="Supprimer le fichier ?" label-hidden>
      <p>Le fichier est supprimé définitivement.</p>
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    const heading = modal.shadowRoot!.querySelector<HTMLElement>('[part~="heading"]')!;
    await expect(dialog).toHaveAccessibleName("Supprimer le fichier ?");
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  },
});

/**
 * Interaction test: opening the modal with a command
 */
export const OpeningModal = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Clicking a `u-button` with `--show-modal` opens the modal and moves the focus to its close button, its first focusable element.",
      },
    },
  },
  render: (args) => html`
    <u-button commandfor="modal" command="--show-modal">Open modal</u-button>
    <u-modal id="modal" label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    const trigger = canvasElement.querySelector<Button>("u-button")!;
    await trigger.updateComplete;
    expect(modal.open).toBe(false);

    await userEvent.click(control(trigger));

    await waitFor(() => expect(modal.open).toBe(true));
    expect(modal.shadowRoot!.querySelector("dialog")!.open).toBe(true);
    const close = modal.shadowRoot!.querySelector('[part~="close-button"]')!;
    await waitFor(() => expect(close.matches(":focus-within")).toBe(true));
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: a native invoker button
 */
export const NativeInvoker = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'A native `<button commandfor="modal" command="--show-modal">` opens the modal too: the HTML attributes need no component.',
      },
    },
  },
  render: (args) => html`
    <button type="button" commandfor="modal" command="--show-modal">Open modal</button>
    <u-modal id="modal" label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;

    await userEvent.click(canvasElement.querySelector("button")!);

    await waitFor(() => expect(modal.open).toBe(true));
    expect(modal.shadowRoot!.querySelector("dialog")!.open).toBe(true);
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: opening and closing from script
 */
export const ProgrammaticApi = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          '`showModal()` opens the modal at once. `close("saved")` closes it after its exit transition: `returnValue` and the `value` of `u-close` are `"saved"`.',
      },
    },
  },
  render: (args) => html`
    ${opener("modal")}
    <u-modal id="modal" label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    const onClose = fn();
    modal.addEventListener("u-close", (event) => onClose(event.value));

    modal.showModal();
    expect(dialog.open).toBe(true);
    expect(modal.open).toBe(true);

    modal.close("saved");
    expect(modal.open).toBe(false);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledWith("saved");
    expect(dialog.open).toBe(false);
    expect(modal.returnValue).toBe("saved");

    // Each opening starts without a value.
    modal.showModal();
    expect(modal.returnValue).toBe("");
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: closing the modal
 */
export const ClosingModal = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The close button and Escape fire `u-cancel`, with their `reason`, then close the modal and fire `u-close`. Canceling `u-cancel` keeps it open. `open = false` closes it without `u-cancel`.",
      },
    },
  },
  render: (args) => html`
    ${opener("modal")}
    <u-modal id="modal" open label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    const onCancel = fn();
    const onClose = fn();
    modal.addEventListener("u-cancel", (event) => onCancel(event.reason));
    modal.addEventListener("u-close", onClose);

    await userEvent.click(closeButton(modal));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledWith("close-press");
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(modal.open).toBe(false);

    // Canceled: unsaved changes, for instance.
    modal.showModal();
    const keepOpen = (event: Event) => event.preventDefault();
    modal.addEventListener("u-cancel", keepOpen);
    await userEvent.click(closeButton(modal));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(modal.open).toBe(true);
    expect(dialog.open).toBe(true);
    modal.removeEventListener("u-cancel", keepOpen);

    // Escape fires `cancel` on the native <dialog>, but userEvent's synthetic
    // keys can't trigger it: fire both, as Escape would.
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onCancel).toHaveBeenLastCalledWith("escape-key");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(modal.open).toBe(false);

    // `cancel` without Escape just before: another close request of the
    // system. On Android, the back button or gesture sends one.
    modal.showModal();
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenLastCalledWith("back");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(3));

    modal.open = true;
    await modal.updateComplete;
    modal.open = false;
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(4));
    expect(onCancel).toHaveBeenCalledTimes(4);
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: buttons that close with a value
 */
export const CloseCommands = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Buttons in the content close the modal with a command. `--close` closes it; `--request-close` fires `u-cancel` first. The button's `value` becomes the `returnValue`.",
      },
    },
  },
  render: () => html`
    ${opener("confirm", "Delete the file")}
    <u-modal id="confirm" open label="Delete the file?">
      <p>The file is deleted for good.</p>
      <u-button commandfor="confirm" command="--request-close" value="cancel" variant="secondary">
        Cancel
      </u-button>
      <u-button commandfor="confirm" command="--close" value="delete" variant="danger">
        Delete
      </u-button>
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const [cancel, remove] = canvasElement.querySelectorAll<Button>("u-modal > u-button");
    await remove.updateComplete;
    const onCancel = fn();
    const onClose = fn();
    modal.addEventListener("u-cancel", (event) => onCancel(event.reason));
    modal.addEventListener("u-close", (event) => onClose(event.value));

    await userEvent.click(control(remove));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledWith("delete");
    expect(onCancel).not.toHaveBeenCalled();
    expect(modal.returnValue).toBe("delete");

    modal.showModal();
    await userEvent.click(control(cancel));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledWith("imperative");
    await waitFor(() => expect(onClose).toHaveBeenLastCalledWith("cancel"));
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: what closes the modal
 */
export const ClosedBy = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          '`closedby="any"` adds a click outside to Escape, in every browser: the modal handles it, to give `u-cancel` its `reason`. `closedby="none"` leaves only the close button, the commands and the methods.',
      },
    },
  },
  render: () => html`
    ${opener("any", "Open closedby=any")} ${opener("none", "Open closedby=none")}
    <u-modal id="any" open closedby="any" label="Closed by any">Any</u-modal>
    <u-modal id="none" closedby="none" label="Closed by none">None</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const any = canvasElement.querySelector<Modal>("#any")!;
    const none = canvasElement.querySelector<Modal>("#none")!;
    await any.updateComplete;
    await none.updateComplete;
    const anyDialog = any.shadowRoot!.querySelector("dialog")!;
    // The browser keeps Escape and the back gesture; the modal, the press outside.
    expect(anyDialog.getAttribute("closedby")).toBe("closerequest");
    const onAnyCancel = fn();
    any.addEventListener("u-cancel", (event) => onAnyCancel(event.reason));

    // A press and a release on the backdrop, outside the box.
    const outside = { bubbles: true, composed: true, clientX: 1, clientY: 1 };
    anyDialog.dispatchEvent(new PointerEvent("pointerdown", outside));
    anyDialog.dispatchEvent(new PointerEvent("pointerup", outside));
    expect(onAnyCancel).toHaveBeenCalledOnce();
    expect(onAnyCancel).toHaveBeenCalledWith("outside-press");
    await waitFor(() => expect(anyDialog.open).toBe(false));
    expect(any.open).toBe(false);

    none.showModal();
    const noneDialog = none.shadowRoot!.querySelector("dialog")!;
    const onCancel = fn();
    none.addEventListener("u-cancel", onCancel);
    // Safari ignores closedby="none" and fires `cancel` on Escape.
    noneDialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(noneDialog.open).toBe(true);
    await userEvent.click(closeButton(none));
    await waitFor(() => expect(noneDialog.open).toBe(false));
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: initial focus
 */
export const Autofocus = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "An `autofocus` element of the content gets the focus on opening, before the close button.",
      },
    },
  },
  render: () => html`
    ${opener("rename")}
    <u-modal id="rename" label="Rename">
      <label>Name <input name="name" autofocus /></label>
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;

    modal.showModal();

    await waitFor(() => expect(document.activeElement).toBe(canvasElement.querySelector("input")));
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: the exit transition
 */
export const ExitTransition = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The modal fades out before it closes, then fires `u-close`. Reopened during its exit, it stays open and fires nothing.",
      },
    },
  },
  render: (args) => html`
    ${opener("modal")}
    <u-modal id="modal" open label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    const onClose = fn();
    modal.addEventListener("u-close", onClose);

    modal.close();
    modal.showModal();
    // Longer than the transition.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
    expect(dialog.hasAttribute("data-closing")).toBe(false);
    expect(getComputedStyle(dialog).opacity).toBe("1");

    modal.close();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute("data-closing")).toBe(false);
    await transitionsEnd(canvasElement);
  },
});

/**
 * Interaction test: moving an open modal in the DOM
 */
export const MovedWhileOpen = meta.story({
  // A regression test, not an example: out of the sidebar and the docs page,
  // still run by Vitest. A portal (Vue's Teleport) moves an open modal.
  tags: ["!dev", "!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Moved in the DOM while open (a portal, a reordered list…), the modal stays modal: backdrop, inert page, Escape. It neither closes nor fires `u-close`.",
      },
    },
  },
  render: (args) => html`
    ${opener("modal")}
    <u-modal id="modal" open label=${args.label}>${args.slot}</u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    const onClose = fn();
    modal.addEventListener("u-close", onClose);
    const reopened = new Promise((resolve) =>
      dialog.addEventListener("close", resolve, { once: true }),
    );

    const container = document.createElement("div");
    canvasElement.append(container);
    container.append(modal);
    expect(dialog.matches(":modal")).toBe(true);

    // The close() that reopens it isn't a closing…
    await reopened;
    expect(onClose).not.toHaveBeenCalled();
    expect(modal.open).toBe(true);
    expect(dialog.open).toBe(true);

    // …and the next closing still is one.
    modal.open = false;
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(dialog.open).toBe(false);
    await transitionsEnd(canvasElement);
  },
});
