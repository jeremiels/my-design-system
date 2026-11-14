import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { TextField } from "./text-field";

/** The field of the story, once rendered. */
async function fieldIn(canvasElement: HTMLElement, selector = "u-text-field") {
  const field = canvasElement.querySelector<TextField>(selector)!;
  await field.updateComplete;
  const shadow = field.shadowRoot!;
  return {
    field,
    input: shadow.querySelector<HTMLInputElement>('[part~="input"]')!,
    error: shadow.querySelector<HTMLElement>('[part~="error"]')!,
  };
}

const meta = preview.meta({
  title: "Components/Text field",
  component: "u-text-field",
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["text", "email", "password", "tel", "url", "search"],
    },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Name",
    hint: "",
    type: "text",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-text-field` component is a labelled text input that takes part in its form like a native `<input>`: it submits its value, blocks the submission while invalid, follows the form's reset and a `<fieldset disabled>`. Its error shows once the user has left the field, or once the form has been submitted.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A text field with its label. Its `input` and `change` events reach the host.",
      },
    },
  },
  render: (args) => html`
    <u-text-field
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      type=${ifDefined(args.type)}
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-text-field>
  `,
  play: async ({ canvasElement }) => {
    const { field, input } = await fieldIn(canvasElement);
    // Focus is delegated to the native <input>: focus() and the label work on the host.
    field.focus();
    expect(field.shadowRoot!.activeElement).toBe(input);
    expect(input.labels?.[0]?.textContent).toBe("Name");

    const onInput = fn();
    const onChange = fn();
    field.addEventListener("input", onInput);
    field.addEventListener("change", onChange);
    await userEvent.type(input, "Ada");
    expect(field.value).toBe("Ada");
    expect(onInput).toHaveBeenCalledTimes(3);
    expect(onChange).not.toHaveBeenCalled();
    // The browser commits the change when the user leaves the field, on the
    // inner input: user-event doesn't fire it across a shadow root, so fire it the
    // same way. It doesn't leave the shadow root: the host fires its own, once.
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
    // A value set by the application reaches the input.
    field.value = "Grace";
    await field.updateComplete;
    expect(input.value).toBe("Grace");
  },
});

export const WithHint = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The hint sits between the label and the input, so the browser's autofill doesn't cover it. Assistive technologies read it with the input.",
      },
    },
  },
  render: () => html`
    <u-text-field
      label="Email"
      type="email"
      autocomplete="email"
      hint="Format: name@example.com"
    ></u-text-field>
  `,
  play: async ({ canvasElement }) => {
    const { field, input } = await fieldIn(canvasElement);
    const hint = field.shadowRoot!.querySelector<HTMLElement>('[part~="hint"]')!;
    expect(hint.hidden).toBe(false);
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    expect(input.getAttribute("autocomplete")).toBe("email");
  },
});

export const Validation = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required email field. The submission is blocked while it's invalid: the browser focuses the input and the error shows, then follows each keystroke. `error-message` replaces the browser's message.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <u-text-field
        label="Email"
        name="email"
        type="email"
        required
        error-message="Enter an email address in the format name@example.com."
      ></u-text-field>
      <u-button type="submit">Submit</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, error } = await fieldIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    const onSubmit = fn();
    form.addEventListener("submit", onSubmit);
    // No error before any interaction.
    expect(field.validity.valueMissing).toBe(true);
    expect(error.hidden).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("false");

    const submit = canvasElement.querySelector("u-button")!.shadowRoot!.querySelector("button")!;
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    await field.updateComplete;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain("Enter an email address in the format name@example.com.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    await waitFor(() => expect(field.shadowRoot!.activeElement).toBe(input));

    await userEvent.type(input, "ada");
    await field.updateComplete;
    expect(field.validity.typeMismatch).toBe(true);
    expect(error.hidden).toBe(false);

    await userEvent.type(input, "@example.com");
    await field.updateComplete;
    expect(error.hidden).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.hasAttribute("aria-describedby")).toBe(false);

    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
  },
});

export const InForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The form submits the value under `name`. Its reset restores the `value` attribute and hides the error.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <u-text-field id="name" label="Name" name="name" value="Ada"></u-text-field>
      <u-text-field id="email" label="Email" name="email" type="email" required></u-text-field>
      <u-button type="reset" variant="secondary">Reset</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const name = await fieldIn(canvasElement, "#name");
    const email = await fieldIn(canvasElement, "#email");
    const form = canvasElement.querySelector("form")!;
    expect(name.field.form).toBe(form);
    expect(new FormData(form).get("name")).toBe("Ada");
    expect(new FormData(form).get("email")).toBe("");

    await userEvent.type(name.input, " Lovelace");
    await name.field.updateComplete;
    expect(new FormData(form).get("name")).toBe("Ada Lovelace");
    // Validation shows the error of the empty required field.
    expect(form.checkValidity()).toBe(false);
    await email.field.updateComplete;
    expect(email.error.hidden).toBe(false);

    const reset = canvasElement.querySelector("u-button")!.shadowRoot!.querySelector("button")!;
    await userEvent.click(reset);
    await Promise.all([name.field.updateComplete, email.field.updateComplete]);
    expect(name.field.value).toBe("Ada");
    expect(name.input.value).toBe("Ada");
    expect(new FormData(form).get("name")).toBe("Ada");
    expect(email.error.hidden).toBe(true);
    expect(email.input.getAttribute("aria-invalid")).toBe("false");
  },
});

export const CustomValidity = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A check of the application, through `setCustomValidity()`, as on a native input: its message comes before the others.",
      },
    },
  },
  render: () => html`
    <u-text-field label="Username" name="username" value="admin"></u-text-field>
  `,
  play: async ({ canvasElement }) => {
    const { field, error } = await fieldIn(canvasElement);
    field.setCustomValidity("This username is taken.");
    expect(field.checkValidity()).toBe(false);
    await field.updateComplete;
    expect(field.validity.customError).toBe(true);
    expect(field.validationMessage).toBe("This username is taken.");
    expect(error.textContent).toContain("This username is taken.");

    field.setCustomValidity("");
    await field.updateComplete;
    expect(field.checkValidity()).toBe(true);
    expect(error.hidden).toBe(true);
  },
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A disabled field: its form neither submits nor validates it.",
      },
    },
  },
  render: () => html`
    <form>
      <u-text-field label="Name" name="name" value="Ada" required disabled></u-text-field>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, input } = await fieldIn(canvasElement);
    expect(input.disabled).toBe(true);
    expect(field.getAttribute("aria-disabled")).toBe("true");
    expect(field.willValidate).toBe(false);
    expect(new FormData(canvasElement.querySelector("form")!).has("name")).toBe(false);
  },
});

export const InDisabledFieldset = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Inside a `<fieldset disabled>`, the field is disabled like a native input.",
      },
    },
  },
  render: () => html`
    <form>
      <fieldset disabled>
        <legend>Disabled fieldset</legend>
        <u-text-field label="Name" name="name" required></u-text-field>
      </fieldset>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, input } = await fieldIn(canvasElement);
    await waitFor(() => expect(input.disabled).toBe(true));
    expect(field.matches(":disabled")).toBe(true);
    const form = canvasElement.querySelector("form")!;
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).has("name")).toBe(false);
  },
});
