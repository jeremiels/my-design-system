// The fields with bounds: a number, a date, a slider. Their native input
// validates the bounds and the step. Chromium.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { RangeFieldBase } from "./range-field-base.js";

async function mount(content: string) {
  const form = document.createElement("form");
  form.innerHTML = content;
  document.body.append(form);
  const fields = Array.from(form.querySelectorAll<RangeFieldBase>("*"));
  await Promise.all(fields.map((field) => field.updateComplete));
  await Promise.all(fields.map((field) => field.updateComplete));
  return { form, field: fields[0]! };
}

function input(field: Element) {
  return field.shadowRoot!.querySelector("input")!;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("a number field", () => {
  it("is a native number input, stepped by the arrows", async () => {
    const { form, field } = await mount(
      `<u-number-field label="Quantity" name="quantity" value="2" min="1" max="3"></u-number-field>`,
    );
    expect(input(field).type).toBe("number");
    await expect.element(input(field)).toHaveRole("spinbutton");
    input(field).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(field.value).toBe("3");
    expect([...new FormData(form)]).toEqual([["quantity", "3"]]);
  });

  it("shows the browser's message for a value off its bounds", async () => {
    const { form, field } = await mount(
      `<u-number-field label="Quantity" value="9" max="3"></u-number-field>`,
    );
    expect(form.checkValidity()).toBe(false);
    expect(field.validity.rangeOverflow).toBe(true);
    await field.updateComplete;
    expect(field.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
      input(field).validationMessage,
    );
  });
});

describe("a date field", () => {
  it("submits its date in the format of HTML, and validates its bounds", async () => {
    const { form, field } = await mount(
      `<u-date-field label="Arrival" name="arrival" value="2026-12-24" min="2027-01-01"></u-date-field>`,
    );
    expect(input(field).type).toBe("date");
    expect([...new FormData(form)]).toEqual([["arrival", "2026-12-24"]]);
    expect(field.validity.rangeUnderflow).toBe(true);
    field.value = "2027-01-02";
    await field.updateComplete;
    expect(form.checkValidity()).toBe(true);
  });
});

describe("a slider", () => {
  it("takes the middle of its bounds without a value, and shows it", async () => {
    const { form, field } = await mount(`<u-slider label="Volume" name="volume"></u-slider>`);
    expect(field.value).toBe("50");
    expect([...new FormData(form)]).toEqual([["volume", "50"]]);
    expect(field.shadowRoot!.querySelector('[part~="value"]')!.textContent).toBe("50");
    await expect.element(input(field)).toHaveRole("slider");
    await expect.element(input(field)).toHaveAccessibleName("Volume");
  });

  it("rounds a value to its step, and moves with the arrows, with input then change", async () => {
    const { field } = await mount(`<u-slider label="Volume" value="33" step="10"></u-slider>`);
    expect(field.value).toBe("30");
    const events: string[] = [];
    field.addEventListener("input", () => events.push("input"));
    field.addEventListener("change", () => events.push("change"));
    input(field).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(field.value).toBe("40");
    expect(events).toEqual(["input", "change"]);
  });
});
