// A checkbox and a switch in a form: their value, their state, the real
// keyboard and pointer. Chromium.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Checkbox } from "../../components/checkbox/checkbox.js";
import type { Switch } from "../../components/switch/switch.js";

async function mount(content: string) {
  const form = document.createElement("form");
  form.innerHTML = content;
  document.body.append(form);
  const controls = Array.from(form.querySelectorAll<Checkbox | Switch>("u-checkbox, u-switch"));
  await Promise.all(controls.map((control) => control.updateComplete));
  return { form, controls };
}

function input(control: Element) {
  return control.shadowRoot!.querySelector("input")!;
}

// The test page has no token sheet: the drawn control has no size there.
function label(control: Element) {
  return control.shadowRoot!.querySelector("label")!;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("a checkbox", () => {
  it("submits its value while checked, nothing otherwise", async () => {
    const { form, controls } = await mount(`
      <u-checkbox label="News" name="news"></u-checkbox>
      <u-checkbox label="Offers" name="offers" value="yes" checked></u-checkbox>
    `);
    expect([...new FormData(form)]).toEqual([["offers", "yes"]]);
    controls[0]!.checked = true;
    await controls[0]!.updateComplete;
    expect([...new FormData(form)]).toEqual([
      ["news", "on"],
      ["offers", "yes"],
    ]);
  });

  it("toggles on a click of its label, with input then change", async () => {
    const { controls } = await mount(`<u-checkbox label="News" name="news"></u-checkbox>`);
    const checkbox = controls[0]!;
    const events: string[] = [];
    checkbox.addEventListener("input", () => events.push("input"));
    checkbox.addEventListener("change", () => events.push("change"));
    await userEvent.click(label(checkbox));
    expect(checkbox.checked).toBe(true);
    expect(events).toEqual(["input", "change"]);
    await expect.element(input(checkbox)).toHaveAccessibleName("News");
  });

  it("clears indeterminate when the user checks it", async () => {
    const { controls } = await mount(`<u-checkbox label="All" indeterminate></u-checkbox>`);
    const checkbox = controls[0] as Checkbox;
    expect(input(checkbox).indeterminate).toBe(true);
    input(checkbox).focus();
    await userEvent.keyboard(" ");
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);
    await checkbox.updateComplete;
    expect(checkbox.hasAttribute("indeterminate")).toBe(false);
  });

  it("is restored by the form's reset", async () => {
    const { form, controls } = await mount(`<u-checkbox label="News" checked></u-checkbox>`);
    await userEvent.click(label(controls[0]!));
    expect(controls[0]!.checked).toBe(false);
    form.reset();
    expect(controls[0]!.checked).toBe(true);
  });

  it("blocks its form while required and unchecked, and shows the browser's message", async () => {
    const { form, controls } = await mount(`<u-checkbox label="I agree" required></u-checkbox>`);
    const checkbox = controls[0]!;
    expect(form.checkValidity()).toBe(false);
    await checkbox.updateComplete;
    const error = checkbox.shadowRoot!.querySelector('[part="error"]')!;
    expect(error.textContent).toContain(input(checkbox).validationMessage);
    expect(input(checkbox).getAttribute("aria-invalid")).toBe("true");

    await userEvent.click(label(checkbox));
    await checkbox.updateComplete;
    expect(form.checkValidity()).toBe(true);
    expect(error.checkVisibility()).toBe(false);
  });

  it("keeps its state while read-only", async () => {
    const { form, controls } = await mount(
      `<u-checkbox label="News" name="news" readonly checked></u-checkbox>`,
    );
    const checkbox = controls[0]!;
    const events: string[] = [];
    checkbox.addEventListener("change", () => events.push("change"));
    await userEvent.click(label(checkbox));
    expect(checkbox.checked).toBe(true);
    expect(input(checkbox).checked).toBe(true);
    expect(events).toEqual([]);
    expect(input(checkbox).getAttribute("aria-readonly")).toBe("true");
    expect([...new FormData(form)]).toEqual([["news", "on"]]);
  });
});

describe("a switch", () => {
  it("is a native checkbox with the switch role, toggled by Space", async () => {
    const { controls } = await mount(`<u-switch label="Notifications"></u-switch>`);
    const control = controls[0]!;
    await expect.element(input(control)).toHaveRole("switch");
    await expect.element(input(control)).toHaveAccessibleName("Notifications");
    input(control).focus();
    await userEvent.keyboard(" ");
    expect(control.checked).toBe(true);
  });
});
