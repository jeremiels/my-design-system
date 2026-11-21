// A form control without a native control: what the mixin alone gives. The
// fields (`FieldBase`) add the validity of their native control.
import { LitElement } from "lit";
import { afterEach, expect, it } from "vitest";
import { withDisabled } from "./withDisabled.js";
import { withFormControl } from "./withFormControl.js";
import { withInternals } from "./withInternals.js";

class Control extends withFormControl(withInternals(withDisabled(LitElement))) {}
customElements.define("t-form-control", Control);

async function mount(content: string) {
  const form = document.createElement("form");
  form.innerHTML = content;
  document.body.append(form);
  const control = form.querySelector<Control>("t-form-control")!;
  await control.updateComplete;
  return { form, control };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("submits its value under its name, and the reset restores the value attribute", async () => {
  const { form, control } = await mount(
    `<t-form-control name="city" value="Paris"></t-form-control>`,
  );
  expect(control.form).toBe(form);
  expect([...new FormData(form)]).toEqual([["city", "Paris"]]);

  control.value = "Lyon";
  await control.updateComplete;
  expect([...new FormData(form)]).toEqual([["city", "Lyon"]]);

  form.reset();
  await control.updateComplete;
  expect(control.value).toBe("Paris");
});

it("restores a value the browser saved", async () => {
  const { control } = await mount(`<t-form-control name="city"></t-form-control>`);
  control.formStateRestoreCallback("Lyon", "restore");
  expect(control.value).toBe("Lyon");
});

it("is invalid with the message of setCustomValidity(), and blocks its form", async () => {
  const { form, control } = await mount(`<t-form-control name="login"></t-form-control>`);
  const invalid: Event[] = [];
  control.addEventListener("invalid", (event) => invalid.push(event));

  control.setCustomValidity("This login is taken.");
  expect(control.validity.customError).toBe(true);
  expect(control.validationMessage).toBe("This login is taken.");
  expect(form.checkValidity()).toBe(false);
  expect(invalid).toHaveLength(1);

  control.setCustomValidity("");
  expect(control.checkValidity()).toBe(true);
});

it("stays invalid after a render", async () => {
  const { control } = await mount(`<t-form-control name="login"></t-form-control>`);
  control.setCustomValidity("This login is taken.");
  control.value = "ada";
  await control.updateComplete;
  expect(control.validity.valid).toBe(false);
});

it("is read-only like a native control: submitted, not validated", async () => {
  const { form, control } = await mount(
    `<t-form-control name="login" value="ada" readonly></t-form-control>`,
  );
  expect(control.readOnly).toBe(true);
  control.setCustomValidity("This login is taken.");
  expect(control.willValidate).toBe(false);
  expect(form.checkValidity()).toBe(true);
  expect([...new FormData(form)]).toEqual([["login", "ada"]]);

  control.readOnly = false;
  await control.updateComplete;
  expect(control.hasAttribute("readonly")).toBe(false);
  expect(control.willValidate).toBe(true);
});

it("isn't validated while disabled, by itself or by its fieldset", async () => {
  const { form, control } = await mount(
    `<fieldset disabled><t-form-control name="login"></t-form-control></fieldset>`,
  );
  expect(control.willValidate).toBe(false);
  form.querySelector("fieldset")!.disabled = false;
  expect(control.willValidate).toBe(true);
  control.disabled = true;
  await control.updateComplete;
  expect(control.willValidate).toBe(false);
});
