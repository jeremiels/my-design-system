// A combobox: a value restricted to its options, with the real keys and
// focus moves. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Modal } from "../modal/modal.js";
import type { Combobox } from "./combobox.js";

const towns = `
  <option value="75056">Paris</option>
  <option value="64445">Pau</option>
  <option value="69123">Lyon</option>
  <option value="97411">Saint-Denis</option>
  <option value="93066">Saint-Denis</option>`;

async function mount(attributes = "") {
  document.body.innerHTML = `
    <form>
      <u-combobox label="Town" name="town" ${attributes}>${towns}</u-combobox>
      <button id="after" type="button">After</button>
    </form>`;
  const field = document.querySelector<Combobox>("u-combobox")!;
  await field.updateComplete;
  const input = field.shadowRoot!.querySelector("input")!;
  const events: string[] = [];
  for (const type of ["input", "change"]) {
    field.addEventListener(type, () => events.push(`${type}:${field.value}`));
  }
  const submitted = () => new FormData(document.querySelector("form")!).get("town");
  return { field, input, events, submitted };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("filters as the user types, then takes the value of the option picked", async () => {
  const { field, input, events, submitted } = await mount();
  await userEvent.type(input, "par");
  expect(field.value).toBe("");
  expect(field.inputValue).toBe("par");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.value).toBe("75056");
  expect(input.value).toBe("Paris");
  expect(submitted()).toBe("75056");
  expect(events.slice(-2)).toEqual(["input:75056", "change:75056"]);
});

it("shows the label of the value again when the user leaves the field", async () => {
  const { field, input } = await mount('value="69123"');
  expect(input.value).toBe("Lyon");
  // The typing replaces the selected text: the input is never empty.
  input.focus();
  input.select();
  await userEvent.keyboard("Pa");
  expect(field.value).toBe("69123");
  await userEvent.tab();
  expect(document.activeElement).toBe(document.querySelector("#after"));
  await field.updateComplete;
  expect(field.value).toBe("69123");
  expect(input.value).toBe("Lyon");
});

it("picks the only option whose label is the text, on leaving or on Enter", async () => {
  const { field, input, events } = await mount();
  await userEvent.type(input, "lyon");
  await userEvent.tab();
  await field.updateComplete;
  expect(field.value).toBe("69123");
  expect(input.value).toBe("Lyon");
  expect(events.slice(-1)).toEqual(["change:69123"]);

  // Two towns of the same name: the user picks one in the list.
  await userEvent.clear(input);
  await userEvent.type(input, "saint-denis{Enter}");
  await field.updateComplete;
  expect(field.value).toBe("");
  expect(field.inputValue).toBe("saint-denis");
});

it("clears its value when the user empties the input, and fires change on leaving", async () => {
  const { field, input, events } = await mount('value="75056"');
  await userEvent.clear(input);
  expect(field.value).toBe("");
  expect(events).toContain("input:");
  expect(events).not.toContain("change:");
  await userEvent.tab();
  expect(events.slice(-1)).toEqual(["change:"]);
});

it("can't be submitted while required and empty, whatever the text", async () => {
  const { field, input } = await mount("required");
  await userEvent.type(input, "Pa");
  expect(field.checkValidity()).toBe(false);
  expect(field.validity.valueMissing).toBe(true);
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.checkValidity()).toBe(true);
});

it("shows the label again on Escape, list closed, and leaves the modal around it open", async () => {
  document.body.innerHTML = `
    <u-modal label="Delivery">
      <u-combobox label="Town" value="69123">${towns}</u-combobox>
    </u-modal>`;
  const modal = document.querySelector<Modal>("u-modal")!;
  const field = document.querySelector<Combobox>("u-combobox")!;
  await modal.updateComplete;
  modal.showModal();
  await field.updateComplete;
  const input = field.shadowRoot!.querySelector("input")!;
  const popup = field.shadowRoot!.querySelector<HTMLElement>('[part~="popup"]')!;

  await userEvent.clear(input);
  await userEvent.type(input, "pa");
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  // Open: Escape closes the list, and keeps the text.
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => popup.matches(":popover-open")).toBe(false);
  expect(input.value).toBe("pa");
  // Closed: the label of the value. The input was emptied: the value is "".
  await userEvent.keyboard("{Escape}");
  await field.updateComplete;
  expect(input.value).toBe("");
  expect(modal.open).toBe(true);
  // Nothing typed: the modal's.
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => modal.open).toBe(false);
});

it("chooses several options with multiple: tags under the input, one entry per value", async () => {
  const { field, input } = await mount("multiple required");
  const form = document.querySelector("form")!;
  expect(field.validity.valueMissing).toBe(true);
  const listbox = field.shadowRoot!.querySelector('[role="listbox"]')!;

  await userEvent.type(input, "par");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.values).toEqual(["75056"]);
  expect(field.value).toBe("75056");
  // The text empties, the list stays open, with a box per option.
  expect(input.value).toBe("");
  expect(field.open).toBe(true);
  expect(listbox.getAttribute("aria-multiselectable")).toBe("true");

  await userEvent.type(input, "ly");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.values).toEqual(["75056", "69123"]);
  expect(new FormData(form).getAll("town")).toEqual(["75056", "69123"]);
  expect(field.validity.valid).toBe(true);

  // The tags show the labels; one leaves its option out. The list, open,
  // covers them: Escape closes it.
  await userEvent.keyboard("{Escape}");
  const values = field.shadowRoot!.querySelector<HTMLElement>('[part~="values"]')!;
  const tags = [...values.querySelectorAll("*")].filter((element) =>
    element.localName.endsWith("-tag"),
  );
  expect(tags.map((tag) => tag.textContent!.trim())).toEqual(["Paris", "Lyon"]);
  const remove = tags[0]!.shadowRoot!.querySelector<HTMLElement>('[part~="remove-button"]')!;
  await userEvent.click(remove.shadowRoot?.querySelector("button") ?? remove);
  await field.updateComplete;
  expect(field.values).toEqual(["69123"]);

  // Picking a chosen option again leaves it out.
  await userEvent.click(input);
  await userEvent.type(input, "ly");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.values).toEqual([]);
});
