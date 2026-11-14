import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Textarea } from "./textarea";

/** The field of the story, once rendered. */
async function fieldIn(canvasElement: HTMLElement) {
  const field = canvasElement.querySelector<Textarea>("u-textarea")!;
  await field.updateComplete;
  const shadow = field.shadowRoot!;
  return {
    field,
    textarea: shadow.querySelector<HTMLTextAreaElement>('[part~="textarea"]')!,
    error: shadow.querySelector<HTMLElement>('[part~="error"]')!,
  };
}

const meta = preview.meta({
  title: "Components/Textarea",
  component: "u-textarea",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Message",
    hint: "",
    rows: 4,
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-textarea` component is a labelled multi-line text input. It shares its label, hint, error message and form behavior with `u-text-field` (`FieldBase`): it submits its value, blocks the submission while invalid, follows the form's reset and a `<fieldset disabled>`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A textarea with its label. Its `input` and `change` events reach the host.",
      },
    },
  },
  render: (args) => html`
    <u-textarea
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      rows=${ifDefined(args.rows)}
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-textarea>
  `,
  play: async ({ canvasElement }) => {
    const { field, textarea } = await fieldIn(canvasElement);
    // Focus is delegated to the native <textarea>: focus() and the label work on the host.
    field.focus();
    expect(field.shadowRoot!.activeElement).toBe(textarea);
    expect(textarea.labels?.[0]?.textContent).toBe("Message");
    expect(textarea.rows).toBe(4);

    const onInput = fn();
    const onChange = fn();
    field.addEventListener("input", onInput);
    field.addEventListener("change", onChange);
    await userEvent.type(textarea, "Hi{Enter}Ada");
    expect(field.value).toBe("Hi\nAda");
    expect(onInput).toHaveBeenCalledTimes(6);
    // user-event doesn't fire `change` across a shadow root: fire it on the
    // inner textarea, as the browser does when the user leaves the field.
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
  },
});

export const Validation = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required textarea. The submission is blocked while it's empty: the browser focuses the textarea and the error shows, then follows each keystroke.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <u-textarea
        label="Message"
        name="message"
        hint="Your question, in a few sentences."
        required
        error-message="Enter your message."
      ></u-textarea>
      <u-button type="submit">Send</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, textarea, error } = await fieldIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    const onSubmit = fn();
    form.addEventListener("submit", onSubmit);
    expect(error.hidden).toBe(true);
    expect(textarea.getAttribute("aria-invalid")).toBe("false");
    expect(textarea.getAttribute("aria-describedby")).toBe("hint");

    const submit = canvasElement.querySelector("u-button")!.shadowRoot!.querySelector("button")!;
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    await field.updateComplete;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain("Enter your message.");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toBe("hint error");
    await waitFor(() => expect(field.shadowRoot!.activeElement).toBe(textarea));

    await userEvent.type(textarea, "Hello");
    await field.updateComplete;
    expect(error.hidden).toBe(true);
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
  },
});

export const InForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The form submits the value under `name`, line breaks included. Its reset restores the `value` attribute.",
      },
    },
  },
  render: () => html`
    <form>
      <u-textarea label="Message" name="message" value="Hi"></u-textarea>
      <u-button type="reset" variant="secondary">Reset</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, textarea } = await fieldIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    expect(field.form).toBe(form);
    expect(new FormData(form).get("message")).toBe("Hi");

    await userEvent.type(textarea, "{Enter}Ada");
    await field.updateComplete;
    expect(new FormData(form).get("message")).toBe("Hi\nAda");

    const reset = canvasElement.querySelector("u-button")!.shadowRoot!.querySelector("button")!;
    await userEvent.click(reset);
    await field.updateComplete;
    expect(field.value).toBe("Hi");
    expect(textarea.value).toBe("Hi");
  },
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A disabled textarea: its form neither submits nor validates it.",
      },
    },
  },
  render: () => html`
    <form>
      <u-textarea label="Message" name="message" value="Hi" required disabled></u-textarea>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, textarea } = await fieldIn(canvasElement);
    expect(textarea.disabled).toBe(true);
    expect(field.willValidate).toBe(false);
    expect(new FormData(canvasElement.querySelector("form")!).has("message")).toBe(false);
  },
});
