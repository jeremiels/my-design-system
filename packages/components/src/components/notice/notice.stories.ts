import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent } from "storybook/test";
import type { Notice } from "./notice";

const meta = preview.meta({
  title: "Components/Notice",
  component: "u-notice",
  tags: ["autodocs"],
  argTypes: {
    variant: { control: { type: "select" }, options: ["information", "warning", "danger"] },
    dismissible: { control: "boolean" },
  },
  args: { variant: "information", dismissible: false },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "A banner of important information for the whole service, above its header (ADR 0034). Not a live region: it reads as content. Its message says its nature first: the color and the icon don't say it alone.",
      },
    },
  },
});

export const Default = meta.story({
  render: (args) => html`
    <u-notice variant=${args.variant} ?dismissible=${args.dismissible}>
      Information: the service is closed on Monday 30 November, for maintenance.
    </u-notice>
  `,
  play: async ({ canvasElement }) => {
    const notice = canvasElement.querySelector<Notice>("u-notice")!;
    await notice.updateComplete;
    // Content, not a live region.
    expect(notice.shadowRoot!.querySelector("[role]")).toBeNull();
  },
});

export const Variants = meta.story({
  render: () => html`
    <div style="display: grid; gap: 1rem">
      <u-notice>Information: new opening hours from 1 December.</u-notice>
      <u-notice variant="warning">Warning: the requests of November close on the 30th.</u-notice>
      <u-notice variant="danger">Outage: the service can't receive files until 6 pm.</u-notice>
    </div>
  `,
});

export const Dismissible = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`dismissible` adds a close button, named by `close-label`. It hides the notice and fires `u-close`: the application keeps the choice, and moves the focus.",
      },
    },
  },
  render: () => html`
    <u-notice dismissible close-label="Fermer le bandeau" lang="fr"
      >Information : le service ferme lundi.</u-notice
    >
  `,
  play: async ({ canvasElement }) => {
    const notice = canvasElement.querySelector<Notice>("u-notice")!;
    await notice.updateComplete;
    const onClose = fn();
    notice.addEventListener("u-close", onClose);
    const button = notice.shadowRoot!.querySelector<HTMLElement>('[part~="close-button"]')!;
    const control = button.shadowRoot!.querySelector("button")!;
    await expect(control).toHaveAccessibleName("Fermer le bandeau");
    await userEvent.click(control);
    expect(notice.hidden).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    notice.hidden = false;
  },
});
