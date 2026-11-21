import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Select } from "./select";

/** The select of the story, once rendered with its options. */
async function selectIn(canvasElement: HTMLElement, selector = "u-select") {
  const select = canvasElement.querySelector<Select>(selector)!;
  await select.updateComplete;
  await select.updateComplete;
  const shadow = select.shadowRoot!;
  return {
    select,
    control: shadow.querySelector<HTMLElement>('[part~="button"]')!,
    popup: shadow.querySelector<HTMLElement>('[part~="popup"]')!,
    options: () => [...shadow.querySelectorAll<HTMLElement>('[part~="option"]')],
  };
}

/** Waits for the popup's transitions, as the autocomplete stories do: axe and the capture see its final state. */
async function popupSettled(popup: HTMLElement) {
  for (;;) {
    // The callback of the next frame runs before its rendering: wait for two.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = popup.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Select",
  component: "u-select",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Country",
    hint: "",
    placeholder: "Choose a country",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-select` component lets the user pick one value among its options, in a list below the control. Its value is always one of the options: for a free text, use `u-autocomplete`. It takes part in its form like a native `<select>`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A select with `<option>` children. A click or ArrowDown opens the list; Enter picks the active option; typing the start of a label moves to it.",
      },
    },
  },
  render: (args) => html`
    <u-select
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      placeholder=${ifDefined(args.placeholder || undefined)}
      ?required=${args.required}
      ?disabled=${args.disabled}
    >
      <option value="fr">France</option>
      <option value="be">Belgique</option>
      <option value="ch">Suisse</option>
      <option value="ca">Canada</option>
    </u-select>
  `,
  play: async ({ canvasElement }) => {
    const { select, control, popup, options } = await selectIn(canvasElement);
    expect(control).toHaveRole("combobox");
    expect(control).toHaveAccessibleName("Country");
    expect(control.textContent).toContain("Choose a country");
    const onChange = fn();
    select.addEventListener("change", onChange);

    await userEvent.click(control);
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await userEvent.click(options()[3]!);
    expect(select.value).toBe("ca");
    expect(onChange).toHaveBeenCalledOnce();
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(false));
    expect(control.textContent).toContain("Canada");
    await popupSettled(popup);
  },
});

export const Open = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The list open on the selected option, which shows in bold. The active option follows the keys; a disabled one is skipped.",
      },
    },
  },
  render: () => html`
    <u-select label="Delivery" value="express">
      <option value="standard">Standard, in 3 days</option>
      <option value="express">Express, tomorrow</option>
      <option value="night" disabled>Overnight, unavailable</option>
      <option value="pickup">Pick-up in store</option>
    </u-select>
  `,
  play: async ({ canvasElement }) => {
    const { select, control, popup, options } = await selectIn(canvasElement);
    control.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await select.updateComplete;
    const active = options().find((option) => option.getAttribute("aria-selected") === "true");
    expect(active?.textContent).toContain("Express");
    expect(options()[2]!.getAttribute("aria-disabled")).toBe("true");
    await popupSettled(popup);
  },
});

export const WithData = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The options given as data, in `options`: `{ value, label, disabled }`. They take precedence over the `<option>` children.",
      },
    },
  },
  render: () => html`
    <u-select
      label="Size"
      value="m"
      .options=${[
        { value: "s", label: "Small" },
        { value: "m", label: "Medium" },
        { value: "l", label: "Large" },
      ]}
    ></u-select>
  `,
  play: async ({ canvasElement }) => {
    const { control } = await selectIn(canvasElement);
    expect(control.textContent).toContain("Medium");
  },
});

export const RequiredAndDisabled = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required select shows its error once the form is submitted empty. A disabled select can't be focused; a read-only one shows its value and doesn't open.",
      },
    },
  },
  render: () => html`
    <form style="display: grid; gap: 1rem" @submit=${(event: Event) => event.preventDefault()}>
      <u-select
        id="required"
        label="Country"
        placeholder="Choose a country"
        error-message="Choose your country."
        required
      >
        <option value="fr">France</option>
        <option value="be">Belgique</option>
      </u-select>
      <u-select id="disabled" label="Currency" value="eur" disabled>
        <option value="eur">Euro</option>
      </u-select>
      <u-select id="readonly" label="Language" value="fr" readonly>
        <option value="fr">Français</option>
      </u-select>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const required = await selectIn(canvasElement, "#required");
    const form = canvasElement.querySelector("form")!;
    expect(form.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(required.select.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
        "Choose your country.",
      ),
    );
    const disabled = await selectIn(canvasElement, "#disabled");
    expect(disabled.control.tabIndex).toBe(-1);
    const readonly = await selectIn(canvasElement, "#readonly");
    expect(readonly.control.getAttribute("aria-readonly")).toBe("true");
  },
});

export const Multiple = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "With `multiple`, Enter, Space and a click choose an option or leave it out; the list stays open. `values` holds the choices, and the form receives one entry per value.",
      },
    },
  },
  render: () => html`
    <u-select label="Languages" name="languages" placeholder="Choose languages" multiple>
      <option value="fr" selected>French</option>
      <option value="en" selected>English</option>
      <option value="de">German</option>
      <option value="es">Spanish</option>
    </u-select>
  `,
  play: async ({ canvasElement }) => {
    const { select, control, popup, options } = await selectIn(canvasElement);
    expect(select.values).toEqual(["fr", "en"]);
    expect(control.textContent).toContain("French, English");
    await userEvent.click(control);
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await userEvent.click(options()[2]!);
    expect(select.values).toEqual(["fr", "en", "de"]);
    expect(popup.matches(":popover-open")).toBe(true);
    await popupSettled(popup);
  },
});
