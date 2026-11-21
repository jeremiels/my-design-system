// A date picker: its control, the calendar that takes the focus, the pick,
// Escape, the form. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Calendar } from "../calendar/calendar.js";
import type { DatePicker } from "./date-picker.js";

async function mount(attributes = "") {
  const form = document.createElement("form");
  form.setAttribute("lang", "en-GB");
  form.innerHTML = `<u-date-picker label="Arrival" name="arrival" placeholder="Choose a date" ${attributes}></u-date-picker>`;
  document.body.append(form);
  const picker = form.querySelector<DatePicker>("u-date-picker")!;
  await picker.updateComplete;
  const root = picker.shadowRoot!;
  const control = root.querySelector<HTMLElement>('[part~="button"]')!;
  const popup = root.querySelector<HTMLElement>('[part~="popup"]')!;
  const calendar = root.querySelector<Calendar>('[part~="calendar"]')!;
  const events: string[] = [];
  picker.addEventListener("input", () => events.push("input"));
  picker.addEventListener("change", () => events.push(`change:${picker.value}`));
  return { form, picker, control, popup, calendar, events };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a labelled combobox that opens a dialog, and shows the date in the page's language", async () => {
  const { form, control } = await mount('value="2026-11-21"');
  await expect.element(control).toHaveRole("combobox");
  await expect.element(control).toHaveAccessibleName("Arrival");
  expect(control.getAttribute("aria-haspopup")).toBe("dialog");
  expect(control.textContent).toContain("21 November 2026");
  expect([...new FormData(form)]).toEqual([["arrival", "2026-11-21"]]);
});

it("gives the focus to the calendar, picks with its keys, and gives it back to the control", async () => {
  const { picker, control, popup, calendar, events } = await mount('value="2026-11-21"');
  control.focus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  await expect
    .poll(() => (calendar.shadowRoot!.activeElement as HTMLElement | null)?.dataset.date)
    .toBe("2026-11-21");
  await userEvent.keyboard("{ArrowRight}{Enter}");
  expect(picker.value).toBe("2026-11-22");
  expect(events).toEqual(["input", "change:2026-11-22"]);
  await expect.poll(() => popup.matches(":popover-open")).toBe(false);
  expect(picker.shadowRoot!.activeElement).toBe(control);
});

it("closes on Escape without a change, back to the control", async () => {
  const { picker, control, popup, events } = await mount('value="2026-11-21"');
  control.focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  await userEvent.keyboard("{ArrowDown}{Escape}");
  await expect.poll(() => popup.matches(":popover-open")).toBe(false);
  expect(picker.value).toBe("2026-11-21");
  expect(events).toEqual([]);
  expect(picker.shadowRoot!.activeElement).toBe(control);
});

it("blocks its form while required and empty, with the browser's message", async () => {
  const { form, picker, control } = await mount("required");
  expect(control.textContent).toContain("Choose a date");
  expect(form.checkValidity()).toBe(false);
  expect(picker.validationMessage).not.toBe("");
});
