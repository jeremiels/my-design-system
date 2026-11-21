import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent } from "storybook/test";
import type { Calendar } from "./calendar";

const meta = preview.meta({
  title: "Components/Calendar",
  component: "u-calendar",
  tags: ["autodocs"],
  args: {
    value: "2026-11-21",
    min: "",
    max: "",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-calendar` component shows the days of a month in a grid, to pick a date. The keys follow the ARIA date picker; the names and the first day of the week follow the language of the page. `u-date-picker` shows one in its popup.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A click or Enter picks a day: `value` takes it, in the format of HTML, and `change` fires.",
      },
    },
  },
  render: (args) => html`
    <u-calendar
      value=${ifDefined(args.value || undefined)}
      min=${ifDefined(args.min || undefined)}
      max=${ifDefined(args.max || undefined)}
    ></u-calendar>
  `,
  play: async ({ canvasElement }) => {
    const calendar = canvasElement.querySelector<Calendar>("u-calendar")!;
    await calendar.updateComplete;
    const onChange = fn();
    calendar.addEventListener("change", onChange);
    await userEvent.click(calendar.shadowRoot!.querySelector('[data-date="2026-11-24"]')!);
    expect(calendar.value).toBe("2026-11-24");
    expect(onChange).toHaveBeenCalledOnce();
  },
});

export const Bounds = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "With `min` and `max`, the days outside show but can't be picked; the buttons stop at their months. Here in French: the weeks start on Monday.",
      },
    },
  },
  render: () => html`
    <div lang="fr">
      <u-calendar
        value="2026-11-21"
        min="2026-11-09"
        max="2026-11-27"
        previous-label="Mois précédent"
        next-label="Mois suivant"
      ></u-calendar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const calendar = canvasElement.querySelector<Calendar>("u-calendar")!;
    await calendar.updateComplete;
    const root = calendar.shadowRoot!;
    expect(root.querySelector("th")!.getAttribute("abbr")).toBe("lundi");
    expect(root.querySelector('[data-date="2026-11-30"]')!.getAttribute("aria-disabled")).toBe(
      "true",
    );
  },
});
