import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { ToggleButton } from "./toggle-button";

const meta = preview.meta({
  title: "Components/Toggle button",
  component: "u-toggle-button",
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "select" }, options: ["small", "medium", "large"] },
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "neutral", "success", "danger", "warning", "information"],
    },
    appearance: { control: { type: "select" }, options: ["filled", "outlined", "plain"] },
    pressed: { control: "boolean" },
    disabled: { control: "boolean" },
    slot: { control: "text" },
  },
  args: {
    size: "medium",
    variant: "neutral",
    appearance: "outlined",
    pressed: false,
    disabled: false,
    slot: "Bold",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "A button that stays pressed or released (`aria-pressed`): the bold of a text editor, a filter of a list. A click flips `pressed`, then fires `input` and `change`. Its label stays the same in both states. Released, it is drawn like a `button`; pressed, the tokens of `toggle-button` paint it (ADR 0032).",
      },
    },
  },
});

export const Default = meta.story({
  render: (args) => html`
    <u-toggle-button
      size=${ifDefined(args.size)}
      variant=${ifDefined(args.variant)}
      appearance=${ifDefined(args.appearance)}
      ?pressed=${args.pressed}
      ?disabled=${args.disabled}
      >${args.slot}</u-toggle-button
    >
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<ToggleButton>("u-toggle-button")!;
    await button.updateComplete;
    const control = button.shadowRoot!.querySelector("button")!;
    expect(control.getAttribute("aria-pressed")).toBe("false");
    const onInput = fn();
    const onChange = fn();
    button.addEventListener("input", onInput);
    button.addEventListener("change", onChange);
    await userEvent.click(control);
    await button.updateComplete;
    expect(button.pressed).toBe(true);
    expect(button.hasAttribute("pressed")).toBe(true);
    expect(control.getAttribute("aria-pressed")).toBe("true");
    expect(onInput).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
    // Its colors change: the pressed tokens paint the control, once its transition ends.
    await waitFor(() =>
      expect(getComputedStyle(control).backgroundColor).not.toBe("rgba(0, 0, 0, 0)"),
    );
    // Space flips it back, from the keyboard.
    await userEvent.keyboard(" ");
    await button.updateComplete;
    expect(button.pressed).toBe(false);
    // Setting the property fires nothing.
    button.pressed = true;
    await button.updateComplete;
    expect(onChange).toHaveBeenCalledTimes(2);
    button.pressed = false;
    // axe checks the contrast once the colors stop changing.
    await waitFor(() => expect(getComputedStyle(control).backgroundColor).toBe("rgba(0, 0, 0, 0)"));
  },
});

export const InAToolbar = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Toggle buttons in a `toolbar`: one Tab stop, the arrow keys move between them, Space or Enter presses one. An icon-only toggle button takes `label`; its label stays the same pressed or released.",
      },
    },
  },
  render: () => html`
    <u-toolbar label="Format">
      <u-toggle-button pressed>Bold</u-toggle-button>
      <u-toggle-button>Italic</u-toggle-button>
      <u-toggle-button appearance="plain" label="Underline"><u>U</u></u-toggle-button>
    </u-toolbar>
  `,
  play: async ({ canvasElement }) => {
    const [bold, italic, underline] = [
      ...canvasElement.querySelectorAll<ToggleButton>("u-toggle-button"),
    ];
    await Promise.all([bold, italic, underline].map((button) => button!.updateComplete));
    bold!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(italic!.shadowRoot!.activeElement).toBe(italic!.shadowRoot!.querySelector("button"));
    await userEvent.keyboard("{Enter}");
    await italic!.updateComplete;
    expect(italic!.pressed).toBe(true);
    expect(bold!.pressed).toBe(true);
    // axe checks the contrast once the colors stop changing.
    const pressed = getComputedStyle(bold!.shadowRoot!.querySelector("button")!).backgroundColor;
    await waitFor(() =>
      expect(getComputedStyle(italic!.shadowRoot!.querySelector("button")!).backgroundColor).toBe(
        pressed,
      ),
    );
    const control = underline!.shadowRoot!.querySelector("button")!;
    expect(control.getAttribute("aria-label")).toBe("Underline");
    expect(control.getAttribute("aria-pressed")).toBe("false");
  },
});

export const Disabled = meta.story({
  render: () => html`<u-toggle-button disabled pressed>Bold</u-toggle-button>`,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<ToggleButton>("u-toggle-button")!;
    await button.updateComplete;
    const onChange = fn();
    button.addEventListener("change", onChange);
    button.click();
    expect(onChange).not.toHaveBeenCalled();
    expect(button.pressed).toBe(true);
  },
});
