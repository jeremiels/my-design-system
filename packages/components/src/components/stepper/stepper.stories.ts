import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Step } from "../step/step";
import type { Stepper } from "./stepper";

const meta = preview.meta({
  title: "Components/Stepper",
  component: "u-stepper",
  subcomponents: { Step: "u-step" },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-stepper` component shows the steps of a task, its `u-step` children, and the current one, `value`. The steps before it are complete. It doesn't navigate: the page's buttons do.",
      },
    },
  },
});

/** The stepper of the story and its steps, once rendered. */
async function stepsIn(canvasElement: HTMLElement) {
  const stepper = canvasElement.querySelector<Stepper>("u-stepper")!;
  const steps = [...stepper.querySelectorAll<Step>("u-step")];
  await stepper.updateComplete;
  await Promise.all(steps.map((step) => step.updateComplete));
  return { stepper, steps };
}

export const Default = meta.story({
  render: () => html`
    <u-stepper label="Your request" value="address">
      <u-step value="identity">Identity</u-step>
      <u-step value="address">Address</u-step>
      <u-step value="documents">Documents</u-step>
      <u-step value="review">Review</u-step>
    </u-stepper>
  `,
  play: async ({ canvasElement }) => {
    const { stepper, steps } = await stepsIn(canvasElement);
    expect(stepper.getAttribute("role")).toBe("list");
    expect(steps.map((step) => step.status)).toEqual([
      "complete",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(steps[1]!.getAttribute("aria-current")).toBe("step");
    expect(steps[0]!.hasAttribute("aria-current")).toBe(false);
    // A complete step says it in words, not by its color alone.
    expect(steps[0]!.shadowRoot!.textContent).toContain("(completed)");

    stepper.value = "review";
    await stepper.updateComplete;
    await Promise.all(steps.map((step) => step.updateComplete));
    expect(steps[3]!.getAttribute("aria-current")).toBe("step");
    expect(steps[2]!.status).toBe("complete");
  },
});

export const Vertical = meta.story({
  parameters: {
    docs: {
      description: {
        story: '`orientation="vertical"`, for a narrow column: the bars along the labels.',
      },
    },
  },
  render: () => html`
    <u-stepper
      label="Your request"
      value="documents"
      orientation="vertical"
      style="max-inline-size: 16rem"
    >
      <u-step value="identity">Identity</u-step>
      <u-step value="address">Address</u-step>
      <u-step value="documents">Supporting documents</u-step>
    </u-stepper>
  `,
  play: async ({ canvasElement }) => {
    const { steps } = await stepsIn(canvasElement);
    const [first, second] = steps.map((step) => step.getBoundingClientRect());
    expect(second!.top).toBeGreaterThanOrEqual(first!.bottom);
    expect(steps.every((step) => step.orientation === "vertical")).toBe(true);
  },
});
