import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Progress } from "./progress";

const meta = preview.meta({
  title: "Components/Progress",
  component: "u-progress",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-progress` component shows how much of a task is done. Without `value`, as on a native `<progress>`, the task's length is unknown and the bar moves.",
      },
    },
  },
});

/** The bar of the story's progress, once rendered. */
async function trackOf(canvasElement: HTMLElement) {
  const progress = canvasElement.querySelector<Progress>("u-progress")!;
  await progress.updateComplete;
  return {
    progress,
    track: progress.shadowRoot!.querySelector<HTMLElement>('[part~="track"]')!,
    indicator: progress.shadowRoot!.querySelector<HTMLElement>('[part~="indicator"]')!,
    value: progress.shadowRoot!.querySelector<HTMLElement>('[part~="value"]')!,
  };
}

export const Default = meta.story({
  render: () =>
    html`<div lang="en"><u-progress label="Sending the file" value="40"></u-progress></div>`,
  play: async ({ canvasElement }) => {
    const { progress, track, indicator, value } = await trackOf(canvasElement);
    expect(track.getAttribute("role")).toBe("progressbar");
    expect(track.getAttribute("aria-valuenow")).toBe("40");
    expect(track.getAttribute("aria-valuemax")).toBe("100");
    expect(track.getAttribute("aria-valuetext")).toBe("40%");
    expect(value.textContent).toBe("40%");
    const ratio = indicator.getBoundingClientRect().width / track.clientWidth;
    expect(ratio).toBeCloseTo(0.4, 1);
    // The bar is named by its visible label.
    const label = progress.shadowRoot!.getElementById(track.getAttribute("aria-labelledby")!)!;
    expect(label.textContent).toBe("Sending the file");
  },
});

export const Indeterminate = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Without `value`: no share, no value, the bar moves.",
      },
    },
  },
  render: () => html`<u-progress label="Preparing the export"></u-progress>`,
  play: async ({ canvasElement }) => {
    const { track, indicator, value } = await trackOf(canvasElement);
    expect(track.hasAttribute("aria-valuenow")).toBe(false);
    expect(track.hasAttribute("aria-valuetext")).toBe(false);
    expect(value.textContent).toBe("");
    expect(getComputedStyle(indicator).animationName).toBe("pass");
  },
});

export const ValueMessage = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`valueMessage` writes the value, read and shown: here, files out of `max`, in the page's language.",
      },
    },
  },
  render: () => html`
    <u-progress
      label="Sending your documents"
      value="3"
      max="10"
      .valueMessage=${(value: number, max: number) => `${value} files of ${max}`}
    ></u-progress>
  `,
  play: async ({ canvasElement }) => {
    const { track, value } = await trackOf(canvasElement);
    expect(track.getAttribute("aria-valuetext")).toBe("3 files of 10");
    expect(value.textContent).toBe("3 files of 10");
  },
});
