// A submit button of a shadow root has no form owner: `u-button` submits
// through a hidden native button, so the form's data and `submit` event are
// those of a native submit button (A4).
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Button } from "./button.js";

async function mount(content: string) {
  const form = document.createElement("form");
  form.innerHTML = content;
  const submissions: { submitter: HTMLElement | null; data: [string, FormDataEntryValue][] }[] = [];
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submissions.push({
      submitter: event.submitter,
      data: [...new FormData(form, event.submitter)],
    });
  });
  document.body.append(form);
  const buttons = Array.from(form.querySelectorAll<Button>("u-button"));
  await Promise.all(buttons.map((button) => button.updateComplete));
  return { form, buttons, submissions };
}

const inner = (button: Button) => button.shadowRoot!.querySelector<HTMLButtonElement>(".button")!;

afterEach(() => {
  document.body.replaceChildren();
});

describe("a submit button", () => {
  it("submits its name and value with the form data", async () => {
    const { form, buttons, submissions } = await mount(`
      <input name="title" value="Draft" />
      <u-button type="submit" name="action" value="publish">Publish</u-button>
    `);
    await userEvent.click(inner(buttons[0]!));

    expect(submissions).toHaveLength(1);
    expect(submissions[0]!.data).toEqual([
      ["title", "Draft"],
      ["action", "publish"],
    ]);
    // A hidden native button, removed once the event has run.
    const { submitter } = submissions[0]!;
    expect(submitter).toBeInstanceOf(HTMLButtonElement);
    expect(submitter!.hidden).toBe(true);
    expect(submitter!.isConnected).toBe(false);
    expect(form.querySelectorAll("button")).toHaveLength(0);
  });

  it("submits no entry of its own without a name", async () => {
    const { buttons, submissions } = await mount(`
      <input name="title" value="Draft" />
      <u-button type="submit" value="publish">Publish</u-button>
    `);
    await userEvent.click(inner(buttons[0]!));
    expect(submissions[0]!.data).toEqual([["title", "Draft"]]);
  });

  it("doesn't submit an invalid form", async () => {
    const { form, buttons, submissions } = await mount(`
      <input name="title" required />
      <u-button type="submit">Publish</u-button>
    `);
    await userEvent.click(inner(buttons[0]!));
    expect(submissions).toEqual([]);
    expect(form.querySelectorAll("button")).toHaveLength(0);
  });

  it("submits the form its form attribute names", async () => {
    const { form, submissions } = await mount(`<input name="title" value="Draft" />`);
    form.id = "post";
    const button = document.createElement("u-button") as Button;
    button.setAttribute("form", "post");
    button.type = "submit";
    button.textContent = "Publish";
    document.body.append(button);
    await button.updateComplete;
    await userEvent.click(inner(button));
    expect(submissions.map(({ data }) => data)).toEqual([[["title", "Draft"]]]);
  });
});

describe("click() on the host", () => {
  it("acts as a click on the inner button, with one click event", async () => {
    const { buttons, submissions } = await mount(
      `<u-button type="submit" name="action" value="save">Save</u-button>`,
    );
    const onClick = vi.fn();
    buttons[0]!.addEventListener("click", onClick);
    buttons[0]!.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(submissions.map(({ data }) => data)).toEqual([[["action", "save"]]]);
  });

  it("does nothing on a disabled button", async () => {
    const { buttons, submissions } = await mount(
      `<u-button type="submit" disabled>Save</u-button>`,
    );
    const onClick = vi.fn();
    buttons[0]!.addEventListener("click", onClick);
    buttons[0]!.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(submissions).toEqual([]);
  });

  it("resets the form of a reset button", async () => {
    const { form, buttons } = await mount(`
      <input name="title" value="Draft" />
      <u-button type="reset">Reset</u-button>
    `);
    form.querySelector("input")!.value = "Changed";
    buttons[0]!.click();
    expect(form.querySelector("input")!.value).toBe("Draft");
  });
});
