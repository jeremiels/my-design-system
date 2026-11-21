// A select in a form: its value, its keys (APG select-only combobox),
// typeahead, the real keyboard and pointer. Chromium.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Select } from "./select.js";

async function mount(attributes = "") {
  const form = document.createElement("form");
  form.innerHTML = `
    <u-select label="Country" name="country" ${attributes}>
      <option value="fr">France</option>
      <option value="be">Belgique</option>
      <option value="ch" disabled>Suisse</option>
      <option value="bj">Bénin</option>
      <option value="ca">Canada</option>
    </u-select>`;
  document.body.append(form);
  const select = form.querySelector<Select>("u-select")!;
  await select.updateComplete;
  await select.updateComplete;
  const control = select.shadowRoot!.querySelector<HTMLElement>('[part~="button"]')!;
  const popup = select.shadowRoot!.querySelector<HTMLElement>('[part~="popup"]')!;
  const events: string[] = [];
  select.addEventListener("input", () => events.push("input"));
  select.addEventListener("change", () => events.push(`change:${select.value}`));
  const active = () =>
    select
      .shadowRoot!.getElementById(control.getAttribute("aria-activedescendant") ?? "")
      ?.textContent?.trim();
  return { form, select, control, popup, events, active };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a labelled combobox that shows the selected option, and submits its value", async () => {
  const { form, control } = await mount('value="be"');
  await expect.element(control).toHaveRole("combobox");
  await expect.element(control).toHaveAccessibleName("Country");
  expect(control.textContent).toContain("Belgique");
  expect([...new FormData(form)]).toEqual([["country", "be"]]);
});

it("shows its placeholder while no option is selected", async () => {
  const { control } = await mount('placeholder="Choose a country"');
  expect(control.textContent).toContain("Choose a country");
});

describe("its keys", () => {
  it("opens on the selected option, moves, and picks with Enter", async () => {
    const { select, control, popup, events, active } = await mount('value="be"');
    control.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(() => popup.matches(":popover-open")).toBe(true);
    await select.updateComplete;
    expect(active()).toBe("Belgique");
    // Suisse is disabled: skipped.
    await userEvent.keyboard("{ArrowDown}");
    await select.updateComplete;
    expect(active()).toBe("Bénin");
    await userEvent.keyboard("{Enter}");
    expect(select.value).toBe("bj");
    expect(events).toEqual(["input", "change:bj"]);
    await expect.poll(() => popup.matches(":popover-open")).toBe(false);
    expect(select.shadowRoot!.activeElement).toBe(control);
  });

  it("opens on the first option with Home, on the last with End", async () => {
    const { select, control, active } = await mount('value="be"');
    control.focus();
    await userEvent.keyboard("{End}");
    await select.updateComplete;
    expect(active()).toBe("Canada");
    await userEvent.keyboard("{Home}");
    await select.updateComplete;
    expect(active()).toBe("France");
  });

  it("closes on Escape without changing the value", async () => {
    const { select, control, popup, events } = await mount('value="be"');
    control.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Escape}");
    await expect.poll(() => popup.matches(":popover-open")).toBe(false);
    expect(select.value).toBe("be");
    expect(events).toEqual([]);
  });

  it("picks the active option on Tab", async () => {
    const { select, control } = await mount('value="fr"');
    control.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Tab}");
    expect(select.value).toBe("be");
  });

  // The same letter again: the next option that starts with it, whatever the
  // time between the keys. The typed text and its delay are tested in Node
  // (state/typeahead.test.ts): a busy machine slows the real keys down.
  it("makes active the option whose label starts with the typed letter, then the next one", async () => {
    const { select, control, active } = await mount();
    control.focus();
    await userEvent.keyboard("b");
    await select.updateComplete;
    expect(active()).toBe("Belgique");
    expect(select.open).toBe(true);
    await userEvent.keyboard("b");
    await select.updateComplete;
    expect(active()).toBe("Bénin");
    await userEvent.keyboard("{Enter}");
    expect(select.value).toBe("bj");
  });
});

// The test page has no token sheet: an empty control has no size there.
it("picks an option on a click, and the label focuses the control", async () => {
  const { select, control, popup } = await mount('placeholder="Choose"');
  await userEvent.click(control);
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  const option = [...select.shadowRoot!.querySelectorAll<HTMLElement>('[part~="option"]')].find(
    (element) => element.textContent?.trim() === "Canada",
  )!;
  await userEvent.click(option);
  expect(select.value).toBe("ca");
  control.blur();
  await userEvent.click(select.shadowRoot!.querySelector("label")!);
  expect(select.shadowRoot!.activeElement).toBe(control);
});

it("blocks its form while required and empty, with the browser's message", async () => {
  const { form, select, control } = await mount("required");
  expect(form.checkValidity()).toBe(false);
  await select.updateComplete;
  expect(select.validationMessage).not.toBe("");
  expect(select.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
    select.validationMessage,
  );
  expect(control.getAttribute("aria-invalid")).toBe("true");
  select.value = "fr";
  await select.updateComplete;
  expect(form.checkValidity()).toBe(true);
});

it("doesn't open while read-only or disabled", async () => {
  const { select, control, popup } = await mount('readonly placeholder="Choose"');
  control.focus();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(control);
  expect(popup.matches(":popover-open")).toBe(false);
  select.readOnly = false;
  select.disabled = true;
  await select.updateComplete;
  expect(control.tabIndex).toBe(-1);
  expect(control.getAttribute("aria-disabled")).toBe("true");
});

it("is restored by the form's reset", async () => {
  const { form, select, control } = await mount('value="fr"');
  control.focus();
  await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
  expect(select.value).toBe("be");
  form.reset();
  await select.updateComplete;
  expect(select.value).toBe("fr");
  expect(control.textContent).toContain("France");
});

describe("with multiple", () => {
  async function mountMultiple(attributes = "") {
    const form = document.createElement("form");
    form.innerHTML = `
      <u-select label="Languages" name="languages" multiple placeholder="Choose" ${attributes}>
        <option value="fr" selected>French</option>
        <option value="en">English</option>
        <option value="de" disabled>German</option>
        <option value="es">Spanish</option>
      </u-select>`;
    document.body.append(form);
    const select = form.querySelector<Select>("u-select")!;
    await select.updateComplete;
    await select.updateComplete;
    const control = select.shadowRoot!.querySelector<HTMLElement>('[part~="button"]')!;
    return { form, select, control };
  }

  it("chooses several options with Space, the list open, and submits each value", async () => {
    const { form, select, control } = await mountMultiple();
    expect(select.values).toEqual(["fr"]);
    expect([...new FormData(form)]).toEqual([["languages", "fr"]]);
    const changes: string[][] = [];
    select.addEventListener("change", () => changes.push([...select.values]));
    control.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown} ");
    await select.updateComplete;
    expect(select.open).toBe(true);
    expect(select.values).toEqual(["fr", "en"]);
    expect(select.value).toBe("fr");
    await userEvent.keyboard("{ArrowUp} ");
    expect(changes).toEqual([["fr", "en"], ["en"]]);
    await select.updateComplete;
    const listbox = select.shadowRoot!.querySelector('[part~="listbox"]')!;
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    expect(control.textContent).toContain("English");
    expect([...new FormData(form)]).toEqual([["languages", "en"]]);
  });

  it("is restored by the form's reset, and blocks the form while required and empty", async () => {
    const { form, select } = await mountMultiple("required");
    select.values = [];
    await select.updateComplete;
    expect(form.checkValidity()).toBe(false);
    form.reset();
    await select.updateComplete;
    expect(select.values).toEqual(["fr"]);
    expect(form.checkValidity()).toBe(true);
  });
});
