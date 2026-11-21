import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Calendar } from "../calendar/calendar";
import type { DatePicker } from "./date-picker";

/** Waits for the popup's transitions: axe sees its final state. */
async function popupSettled(popup: HTMLElement) {
  for (;;) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = popup.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Date picker",
  component: "u-date-picker",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Arrival",
    hint: "",
    placeholder: "Choose a date",
    min: "",
    max: "",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-date-picker` component picks a date in a `u-calendar` below its control. The value is in the format of HTML, `YYYY-MM-DD`; the control shows it in the language of the page. To type a date, use `u-date-field`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A click or ArrowDown opens the calendar and gives it the focus. A picked day closes it and fires `change`.",
      },
    },
  },
  render: (args) => html`
    <u-date-picker
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      placeholder=${ifDefined(args.placeholder || undefined)}
      min=${ifDefined(args.min || undefined)}
      max=${ifDefined(args.max || undefined)}
      value="2026-11-21"
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-date-picker>
  `,
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector<DatePicker>("u-date-picker")!;
    await picker.updateComplete;
    const root = picker.shadowRoot!;
    const control = root.querySelector<HTMLElement>('[part~="button"]')!;
    const popup = root.querySelector<HTMLElement>('[part~="popup"]')!;
    expect(control).toHaveRole("combobox");
    await userEvent.click(control);
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    const calendar = root.querySelector<Calendar>('[part~="calendar"]')!;
    await userEvent.click(calendar.shadowRoot!.querySelector('[data-date="2026-11-24"]')!);
    expect(picker.value).toBe("2026-11-24");
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(false));
    await popupSettled(popup);
  },
});

export const Open = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The calendar open, in French: the weeks start on Monday, the days outside `min` and `max` can't be picked.",
      },
    },
  },
  render: () => html`
    <div lang="fr">
      <u-date-picker
        label="Date de livraison"
        value="2026-11-21"
        min="2026-11-16"
        previous-month-label="Mois précédent"
        next-month-label="Mois suivant"
      ></u-date-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector<DatePicker>("u-date-picker")!;
    await picker.updateComplete;
    const root = picker.shadowRoot!;
    const control = root.querySelector<HTMLElement>('[part~="button"]')!;
    expect(control.textContent).toContain("21 novembre 2026");
    control.focus();
    await userEvent.keyboard("{ArrowDown}");
    const popup = root.querySelector<HTMLElement>('[part~="popup"]')!;
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await popupSettled(popup);
  },
});

export const Range = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "With `range`, the calendar picks a first day, then a last one, and closes. The value is an ISO 8601 interval, `2026-11-02/2026-11-06`; the control shows the range in the language of the page.",
      },
    },
  },
  render: () => html`
    <div lang="fr">
      <u-date-picker label="Période de congés" range value="2026-11-02/2026-11-06"></u-date-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector<DatePicker>("u-date-picker")!;
    await picker.updateComplete;
    const root = picker.shadowRoot!;
    const control = root.querySelector<HTMLElement>('[part~="button"]')!;
    const text = () => control.textContent!.replace(/\s/g, "");
    expect(text()).toBe("2–6novembre2026");
    await userEvent.click(control);
    const popup = root.querySelector<HTMLElement>('[part~="popup"]')!;
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    const calendar = root.querySelector<Calendar>('[part~="calendar"]')!;
    const day = (date: string) =>
      calendar.shadowRoot!.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
    await userEvent.click(day("2026-11-09"));
    expect(popup.matches(":popover-open")).toBe(true);
    await userEvent.click(day("2026-11-13"));
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(false));
    expect(picker.value).toBe("2026-11-09/2026-11-13");
    expect(text()).toBe("9–13novembre2026");
  },
});
