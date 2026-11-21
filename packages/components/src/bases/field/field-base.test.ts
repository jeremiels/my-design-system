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
  const data: FormData[] = [];
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitters.push(event.submitter);
    data.push(new FormData(form, event.submitter));
  });
  document.body.append(form);
  await Promise.all(
    Array.from(form.querySelectorAll<DSBaseElement>(":not(:defined), *"), (element) =>
      "updateComplete" in element ? element.updateComplete : undefined,
    ),
  );
  return { form, submitters, data };
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

  it("submits with the name and value of the first submit button of the base", async () => {
    const { form, data } = await mount(`
      <u-text-field label="Name" name="name" value="Ada"></u-text-field>
      <u-button type="submit" name="action" value="save">Save</u-button>
      <u-button type="submit" name="action" value="delete">Delete</u-button>
    `);
    await enterIn(form, "u-text-field");
    expect(data.map((entries) => [...entries])).toEqual([
      [
        ["name", "Ada"],
        ["action", "save"],
      ],
    ]);
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

  it("submits a form without button whose other fields are a checkbox and a switch", async () => {
    const { form, submitters } = await mount(`
      <u-text-field label="Name" name="name"></u-text-field>
      <u-checkbox label="News" name="news"></u-checkbox>
      <u-switch label="Alerts" name="alerts"></u-switch>
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

describe("a required field (A7)", () => {
  it("shows an indicator after its label, hidden from assistive technologies", async () => {
    const { form } = await mount(`<u-text-field label="Name" required></u-text-field>`);
    const root = form.querySelector("u-text-field")!.shadowRoot!;
    const indicator = root.querySelector('[part="required-indicator"]')!;
    expect(indicator.textContent).toBe("*");
    expect(indicator.checkVisibility()).toBe(true);
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    expect(indicator.parentElement).toBe(root.querySelector("label"));
    await expect.element(root.querySelector("input")!).toHaveAccessibleName("Name");
  });

  it("shows another indicator, or none", async () => {
    const { form } = await mount(`
      <u-text-field label="Name" required required-indicator="(required)"></u-text-field>
      <u-textarea label="Notes" required required-indicator=""></u-textarea>
      <u-text-field label="City"></u-text-field>
    `);
    const [name, notes, city] = Array.from(form.children, (field) =>
      field.shadowRoot!.querySelector('[part="required-indicator"]'),
    );
    expect(name!.textContent).toBe("(required)");
    expect(name!.checkVisibility()).toBe(true);
    expect(notes!.checkVisibility()).toBe(false);
    expect(city!.checkVisibility()).toBe(false);
  });
});

// `:state()` is missing before Chrome 125, Firefox 126 and Safari 17.4.
const supportsStates = CSS.supports("selector(:state(x))");

describe.runIf(supportsStates)("the user-invalid state (A1)", () => {
  it("follows the error shown, as :user-invalid does", async () => {
    const { form } = await mount(`<u-text-field label="Name" name="name" required></u-text-field>`);
    const field = form.querySelector<DSBaseElement>("u-text-field")!;
    expect(field.matches(":state(user-invalid)")).toBe(false);

    form.requestSubmit();
    await field.updateComplete;
    expect(field.matches(":state(user-invalid)")).toBe(true);

    field.shadowRoot!.querySelector("input")!.focus();
    await userEvent.keyboard("Ada");
    await field.updateComplete;
    expect(field.matches(":state(user-invalid)")).toBe(false);

    form.reset();
    await field.updateComplete;
    expect(field.matches(":state(user-invalid)")).toBe(false);
  });
});

describe("a read-only field", () => {
  it("keeps its value, submits it, and isn't validated", async () => {
    const { form } = await mount(`
      <u-text-field label="Name" name="name" value="Ada" readonly required></u-text-field>
      <u-textarea label="Notes" name="notes" readonly required></u-textarea>
      <u-text-field label="Code" name="code" value="b" pattern="a" readonly></u-text-field>
    `);
    const field = form.querySelector<DSBaseElement & { value: string }>("u-text-field")!;
    const input = field.shadowRoot!.querySelector("input")!;
    expect(input.readOnly).toBe(true);
    expect(form.querySelector("u-textarea")!.shadowRoot!.querySelector("textarea")!.readOnly).toBe(
      true,
    );

    input.focus();
    await userEvent.keyboard("ne");
    expect(field.value).toBe("Ada");
    expect(form.checkValidity()).toBe(true);
    expect([...new FormData(form)]).toEqual([
      ["name", "Ada"],
      ["notes", ""],
      ["code", "b"],
    ]);
    // Its constraints don't apply: the field is valid, whatever the engine.
    for (const field of form.children) {
      expect((field as unknown as { validity: ValidityState }).validity.valid).toBe(true);
    }
  });

  it("doesn't open the suggestions of an autocomplete", async () => {
    const { form } = await mount(`
      <u-autocomplete label="City" name="city" readonly>
        <option>Paris</option>
      </u-autocomplete>
    `);
    const root = form.querySelector("u-autocomplete")!.shadowRoot!;
    root.querySelector("input")!.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(root.querySelector<HTMLElement>('[part~="popup"]')!.matches(":popover-open")).toBe(
      false,
    );
    expect(root.querySelector("input")!.getAttribute("aria-expanded")).toBe("false");
  });
});
