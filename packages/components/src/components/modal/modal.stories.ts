import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Modal } from "./modal";

const meta = preview.meta({
  title: "Components/Modal",
  component: "u-modal",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
    label: { control: "text" },
    slot: { control: "text" },
  },
  args: {
    open: false,
    label: "Example dialog",
    slot: "Modal content",
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `u-modal` component displays content in a modal dialog. Open it with the `open` property, or with an element in its `trigger` slot. `label` gives the dialog its accessible name.",
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
 * Default modal in closed state
 */
export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A closed modal, opened by the button in its `trigger` slot.",
      },
    },
  },
  render: (args) => html`
    <u-modal ?open=${args.open} label=${args.label}>
      <u-button slot="trigger">Open modal</u-button>
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
        story: "The modal in open state displaying the dialog.",
      },
    },
  },
  render: (args) => html`<u-modal open label=${args.label}>${args.slot}</u-modal>`,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    expect(modal.getAttribute("open")).toBe("");
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Example dialog");
  },
});

/**
 * Interaction test: opening the modal
 */
export const OpeningModal = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Clicking the trigger opens the modal and moves focus to its close button.",
      },
    },
  },
  render: (args) => html`
    <u-modal label=${args.label}>
      <u-button slot="trigger">Open modal</u-button>
      ${args.slot}
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    const trigger = canvasElement.querySelector<HTMLElement>('[slot="trigger"]')!;
    expect(modal.open).toBe(false);

    await userEvent.click(trigger);
    await modal.updateComplete;

    expect(modal.open).toBe(true);
    const closeButton = modal.shadowRoot!.querySelector('[part~="close-button"]')!;
    expect(closeButton.matches(":focus-within")).toBe(true);
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
          "The close button, the Escape key and `open = false` close the modal; each fires `u-close`.",
      },
    },
  },
  render: (args) => html`<u-modal open label=${args.label}>${args.slot}</u-modal>`,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const onClose = fn();
    modal.addEventListener("u-close", onClose);

    await userEvent.click(modal.shadowRoot!.querySelector('[part~="close-button"]')!);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(modal.open).toBe(false);

    // Escape closes the native <dialog> by itself, but userEvent's synthetic
    // keys can't trigger it: close the dialog directly, as Escape would.
    modal.open = true;
    await modal.updateComplete;
    modal.shadowRoot!.querySelector("dialog")!.close();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(modal.open).toBe(false);
  },
});

/**
 * Interaction test: moving an open modal in the DOM
 */
export const MovedWhileOpen = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Moved in the DOM while open (a portal, a reordered list…), the modal stays modal: backdrop, inert page, Escape. It neither closes nor fires `u-close`.",
      },
    },
  },
  render: (args) => html`<u-modal open label=${args.label}>${args.slot}</u-modal>`,
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
  },
});

/**
 * Content slot test
 */
export const WithCustomContent = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Modal displaying custom slot content.",
      },
    },
  },
  render: () => html`
    <u-modal open label="Custom title">
      <h2>Custom Title</h2>
      <p>This is custom content in the modal.</p>
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("u-modal");
    const shadow = modal?.shadowRoot;
    const slot = shadow?.querySelector("slot:not([name])");

    expect(slot).toBeTruthy();
    expect(modal?.textContent).toContain("Custom Title");
  },
});
