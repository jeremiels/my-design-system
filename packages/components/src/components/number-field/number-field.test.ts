// A number field with formatOptions, with the real keyboard: the format
// without the focus, the number alone with it, the arrows, a text that
// isn't a number, the bounds. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { NumberField } from "./number-field.js";

afterEach(() => {
  document.body.replaceChildren();
});

/** Spaces of every kind as plain spaces: Intl writes narrow no-break ones in French. */
const plain = (text: string | null) => (text ?? "").replace(/[  ]/g, " ");

async function mount(attributes: string) {
  document.body.innerHTML = `<form lang="fr"><u-number-field label="Montant" name="amount" ${attributes}></u-number-field></form>`;
  const field = document.querySelector<NumberField>("u-number-field")!;
  field.formatOptions = { style: "currency", currency: "EUR" };
  await field.updateComplete;
  const input = field.shadowRoot!.querySelector<HTMLInputElement>('[part~="input"]')!;
  return { field, input, form: document.querySelector("form")! };
}

it("shows the number formatted, and the number alone while the user edits it", async () => {
  const { field, input, form } = await mount('value="1250.5"');
  expect(input.getAttribute("role")).toBe("spinbutton");
  expect(plain(input.value)).toBe("1 250,50 €");
  expect(plain(input.getAttribute("aria-valuetext"))).toBe("1 250,50 €");
  expect(input.getAttribute("aria-valuenow")).toBe("1250.5");

  await userEvent.click(input);
  expect(input.value).toBe("1250,5");
  await userEvent.fill(input, "2000,75");
  expect(field.value).toBe("2000.75");
  expect(new FormData(form).get("amount")).toBe("2000.75");
  await userEvent.keyboard("{Tab}");
  expect(plain(input.value)).toBe("2 000,75 €");
});

it("steps the value with the arrows, within the bounds", async () => {
  const { field, input } = await mount('value="98" max="100" step="5"');
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowUp}");
  expect(field.value).toBe("100");
  expect(input.value).toBe("100");
  await userEvent.keyboard("{ArrowDown}");
  expect(field.value).toBe("95");
});

it("shows an error for a text that isn't a number, and for a number past a bound", async () => {
  const { field, input } = await mount('min="0"');
  await userEvent.click(input);
  await userEvent.fill(input, "douze");
  await userEvent.keyboard("{Tab}");
  await field.updateComplete;
  expect(field.value).toBe("");
  expect(field.validity.badInput).toBe(true);
  expect(input.value).toBe("douze");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(field.validationMessage).toBe("“douze” isn't a number.");

  await userEvent.click(input);
  await userEvent.fill(input, "-5");
  await userEvent.keyboard("{Tab}");
  await field.updateComplete;
  expect(field.value).toBe("-5");
  expect(field.validity.rangeUnderflow).toBe(true);
  expect(field.validationMessage).not.toBe("");
});
