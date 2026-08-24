import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent } from "storybook/test";
import "./modal";
import type { Modal } from "./modal";

const meta = preview.meta({
  title: "Components/Modal",
  component: "my-modal",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
    slot: { control: "text" },
  },
  args: {
    open: false,
    slot: "Contenu du modal",
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `my-modal` component displays content in a modal dialog. It manages open/closed states and provides user interaction through a dedicated button.",
      },
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
        story: "The default modal in closed state with an open button.",
      },
    },
  },
  render: (args) => html`
    <my-modal ?open=${args.open}>${args.slot}</my-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("my-modal");
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
  render: (args) => html` <my-modal open>${args.slot}</my-modal> `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("my-modal");
    expect(modal).toBeTruthy();
    expect(modal?.getAttribute("open")).toBe("");
  },
});

/**
 * Interaction test: opening the modal
 */
export const OpeningModal = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Test opening the modal by clicking the open button.",
      },
    },
  },
  render: (args) => html`
    <my-modal ?open=${args.open}>${args.slot}</my-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("my-modal") as Modal;
    const shadow = modal?.shadowRoot;
    const openButton = shadow?.querySelector("my-button");

    expect(modal?.open).toBe(false);
    expect(openButton).toBeTruthy();

    await userEvent.click(openButton!);
    await modal?.updateComplete;

    expect(modal?.open).toBe(true);
  },
});

/**
 * Interaction test: closing the modal
 */
export const ClosingModal = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Test closing the modal by clicking the close button.",
      },
    },
  },
  render: () => html` <my-modal open>Modal content here</my-modal> `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("my-modal") as Modal;
    const shadow = modal?.shadowRoot;
    const closeButton = shadow?.querySelector("dialog button");

    expect(modal?.open).toBe(true);
    expect(closeButton).toBeTruthy();

    await userEvent.click(closeButton!);
    await modal?.updateComplete;

    expect(modal?.open).toBe(false);
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
    <my-modal open>
      <h2>Custom Title</h2>
      <p>This is custom content in the modal.</p>
    </my-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector("my-modal");
    const shadow = modal?.shadowRoot;
    const slot = shadow?.querySelector("slot");

    expect(slot).toBeTruthy();
    expect(modal?.textContent).toContain("Custom Title");
  },
});
