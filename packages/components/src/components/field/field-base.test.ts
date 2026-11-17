// Enter in a single-line field submits its form, as in a native <input>
// (HTML's implicit submission): the inner control has no form of its own.
// The real key: a synthetic keydown has no default action to compare with.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { DSBaseElement } from "../base-element.js";

/** Mounts a form, and counts its submissions instead of navigating. */
async function mount(content: string) {
  const form = document.createElement("form");
  form.innerHTML = content;
  const submitters: (HTMLElement | null)[] = [];
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitters.push(event.submitter);
  });
  document.body.append(form);
  await Promise.all(
    Array.from(form.querySelectorAll<DSBaseElement>(":not(:defined), *"), (element) =>
      "updateComplete" in element ? element.updateComplete : undefined,
    ),
  );
  return { form, submitters };
}

/** Presses Enter in the native control of a field. */
async function enterIn(form: HTMLFormElement, selector: string) {
  form.querySelector(selector)!.shadowRoot!.querySelector<HTMLElement>(".control")!.focus();
  await userEvent.keyboard("{Enter}");
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("Enter in a text field", () => {
  it("submits a form that has a submit button of the base", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name" value="Ada"></u-text-field>
      <u-text-field label="City" name="city"></u-text-field>
      <u-button type="submit">Send</u-button>
    `);
    await enterIn(form, "u-text-field");
    expect(submitters).toHaveLength(1);
  });

  it("submits with a native submit button as the submitter", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name"></u-text-field>
      <button id="send">Send</button>
    `);
    await enterIn(form, "u-text-field");
    expect(submitters).toEqual([form.querySelector("#send")]);
  });

  it("doesn't submit when the first submit button is disabled", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name"></u-text-field>
      <u-button type="submit" disabled>Send</u-button>
    `);
    await enterIn(form, "u-text-field");
    expect(submitters).toEqual([]);
  });

  it("submits a form without button when it is its only single-line field", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Search" name="q"></u-text-field>
      <u-textarea label="Notes" name="notes"></u-textarea>
      <u-button>Help</u-button>
    `);
    await enterIn(form, "u-text-field");
    expect(submitters).toHaveLength(1);
  });

  it("doesn't submit a form without button that has several single-line fields", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name"></u-text-field>
      <input name="native" />
    `);
    await enterIn(form, "u-text-field");
    expect(submitters).toEqual([]);
  });

  it("shows the errors of an invalid form instead of submitting it", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name" required></u-text-field>
      <u-button type="submit">Send</u-button>
    `);
    await enterIn(form, "u-text-field");
    const field = form.querySelector<DSBaseElement>("u-text-field")!;
    await field.updateComplete;
    expect(submitters).toEqual([]);
    expect(field.shadowRoot!.querySelector(".control")!.getAttribute("aria-invalid")).toBe("true");
  });
});

it("Enter in a textarea adds a line: it never submits", async () => {
  const { form, submitters } = await mount(`
    <u-textarea label="Notes" name="notes"></u-textarea>
    <u-button type="submit">Send</u-button>
  `);
  await enterIn(form, "u-textarea");
  expect(submitters).toEqual([]);
  expect(form.querySelector<HTMLTextAreaElement & DSBaseElement>("u-textarea")!.value).toBe("\n");
});

describe("Enter in an autocomplete", () => {
  const field = `
    <u-autocomplete label="City" name="city">
      <option>Paris</option>
      <option>Pau</option>
    </u-autocomplete>
    <u-button type="submit">Send</u-button>
  `;

  it("picks the active suggestion, without submitting", async () => {
    const { form, submitters } = await mount(field);
    form.querySelector("u-autocomplete")!.shadowRoot!.querySelector("input")!.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(form.querySelector<HTMLInputElement>("u-autocomplete")!.value).toBe("Paris");
    expect(submitters).toEqual([]);
  });

  it("submits the text when no suggestion is active", async () => {
    const { form, submitters } = await mount(field);
    form.querySelector("u-autocomplete")!.shadowRoot!.querySelector("input")!.focus();
    await userEvent.keyboard("Pa{Enter}");
    expect(submitters).toHaveLength(1);
  });
});

it("announces the number of suggestions while the user types", async () => {
  const { form } = await mount(`
    <u-autocomplete label="City" name="city">
      <option>Paris</option>
      <option>Pau</option>
      <option>Lyon</option>
    </u-autocomplete>
  `);
  const root = form.querySelector("u-autocomplete")!.shadowRoot!;
  const status = root.querySelector('[role="status"]')!;
  expect(status.textContent).toBe("");

  root.querySelector("input")!.focus();
  await userEvent.keyboard("pa");
  await expect.poll(() => status.textContent).toBe("2 suggestions");
  await userEvent.keyboard("x");
  await expect.poll(() => status.textContent).toBe("No suggestions");
  // The focus leaves the field: nothing left to announce.
  root.querySelector("input")!.blur();
  await expect.poll(() => status.textContent).toBe("");
});
