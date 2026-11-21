import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Spinner } from "./spinner";

const meta = preview.meta({
  title: "Components/Spinner",
  component: "u-spinner",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-spinner` component shows that something loads, for an unknown time. It is a `progressbar` without a value, named by `label`, or else by `loading-label`. With reduced motion, it turns slower.",
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`<u-spinner label="Sending the file"></u-spinner>`,
  play: async ({ canvasElement }) => {
    const spinner = canvasElement.querySelector<Spinner>("u-spinner")!;
    await spinner.updateComplete;
    const ring = spinner.shadowRoot!.querySelector<HTMLElement>('[part~="spinner"]')!;
    expect(ring.getAttribute("role")).toBe("progressbar");
    expect(ring.getAttribute("aria-label")).toBe("Sending the file");
    expect(ring.hasAttribute("aria-valuenow")).toBe(false);
    expect(getComputedStyle(ring).animationName).toBe("spin");
  },
});

export const Sizes = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`small` inside a control, `medium` next to text, `large` for a whole region. Without `label`, its name is `loading-label`.",
      },
    },
  },
  render: () => html`
    <div style="display: flex; align-items: center; gap: 1rem">
      <u-spinner size="small"></u-spinner>
      <u-spinner></u-spinner>
      <u-spinner size="large"></u-spinner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const spinners = [...canvasElement.querySelectorAll<Spinner>("u-spinner")];
    await Promise.all(spinners.map((spinner) => spinner.updateComplete));
    const [small, medium, large] = spinners.map((spinner) => spinner.getBoundingClientRect().width);
    expect(small).toBeLessThan(medium!);
    expect(medium).toBeLessThan(large!);
    const ring = spinners[0]!.shadowRoot!.querySelector('[part~="spinner"]')!;
    expect(ring.getAttribute("aria-label")).toBe("Loading…");
  },
});
