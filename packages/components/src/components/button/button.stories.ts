import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent } from "storybook/test";
import type { Button } from "./button";

const meta = preview.meta({
  title: "Components/Button",
  component: "u-button",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
      defaultValue: "medium",
    },
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "neutral", "success", "danger", "warning", "information"],
    },
    appearance: {
      control: { type: "select" },
      options: ["filled", "outlined", "plain"],
    },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    slot: { control: "text" },
  },
  args: {
    size: "medium",
    variant: "primary",
    appearance: "filled",
    disabled: false,
    loading: false,
    slot: "Button",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "A button that triggers an action or submits a form. Its `variant` sets its colors, its `appearance` how they paint it (`filled`, `outlined`, `plain`), its `size` its size. It is also the building block of the other components: the close button of a modal, the pages of a pagination, the trigger of a menu are `u-button` elements (ADR 0031).",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "The default button with customizable size, variant, and disabled state.",
      },
    },
  },
  render: (args) => html`
    <u-button
      size="${ifDefined(args.size)}"
      variant="${ifDefined(args.variant)}"
      appearance="${ifDefined(args.appearance)}"
      ?disabled="${args.disabled}"
      ?loading="${args.loading}"
      >${args.slot}</u-button
    >
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const inner = button.shadowRoot!.querySelector("button")!;
    // Focus is delegated to the native <button>: focus() and autofocus work on the host.
    button.focus();
    expect(button.shadowRoot!.activeElement).toBe(inner);
    // Its native click is the button's event: it reaches the host.
    const onClick = fn();
    button.addEventListener("click", onClick);
    await userEvent.click(inner);
    expect(onClick).toHaveBeenCalledOnce();
  },
});

export const Sizes = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Buttons in different sizes: small, medium, and large.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <u-button size="small">Small</u-button>
    <u-button size="medium">Medium</u-button>
    <u-button size="large">Large</u-button>
  `,
});

export const Variants = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Buttons in different variants: primary, secondary, neutral, success, danger, warning, and information.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <u-button variant="primary">Primary</u-button>
    <u-button variant="secondary">Secondary</u-button>
    <u-button variant="neutral">Neutral</u-button>
    <u-button variant="success">Success</u-button>
    <u-button variant="danger">Danger</u-button>
    <u-button variant="warning">Warning</u-button>
    <u-button variant="information">Information</u-button>
  `,
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll<Button>("u-button")];
    await Promise.all(buttons.map((button) => button.updateComplete));
    const backgrounds = buttons.map((button) => {
      // Base, disabled-mixin, generated tokens and button sheets (CSS module
      // scripts), all adopted.
      expect(button.shadowRoot!.adoptedStyleSheets).toHaveLength(4);
      const inner = button.shadowRoot!.querySelector(".button")!;
      expect(getComputedStyle(inner).display).toBe("inline-grid");
      return getComputedStyle(inner).backgroundColor;
    });
    // Each variant resolves to its own semantic token.
    expect(new Set(backgrounds).size).toBe(buttons.length);
  },
});

const VARIANTS = ["primary", "secondary", "neutral", "success", "danger", "warning", "information"];

export const Appearances = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Each variant in each appearance: `filled`, `outlined` (a border in the variant's color, no fill) and `plain` (the variant's color on the text only). Every appearance keeps the same size.",
      },
    },
  },
  render: () => html`
    ${["filled", "outlined", "plain"].map(
      (appearance) => html`
        <p>
          ${VARIANTS.map(
            (variant) =>
              html`<u-button variant=${variant} appearance=${appearance}>${variant}</u-button> `,
          )}
        </p>
      `,
    )}
  `,
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll<Button>("u-button")];
    await Promise.all(buttons.map((button) => button.updateComplete));
    const inner = (button: Button) => button.shadowRoot!.querySelector(".button")!;
    const filled = buttons.filter((button) => button.appearance === "filled");
    const outlined = buttons.filter((button) => button.appearance === "outlined");
    const plain = buttons.filter((button) => button.appearance === "plain");
    // Outlined and plain have no fill; outlined draws its border in the variant's color.
    for (const button of [...outlined, ...plain]) {
      expect(getComputedStyle(inner(button)).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    }
    for (const button of outlined) {
      expect(getComputedStyle(inner(button)).borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
    }
    // The variant still sets the color of an outlined or plain button.
    expect(new Set(plain.map((button) => getComputedStyle(inner(button)).color)).size).toBe(
      VARIANTS.length,
    );
    // One size for the three appearances.
    const heights = new Set(buttons.map((button) => button.getBoundingClientRect().height));
    expect(heights.size).toBe(1);
    expect(filled).toHaveLength(VARIANTS.length);
  },
});

export const IconOnly = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A button whose content is an icon gets its accessible name from `label`. It is square.",
      },
      canvas: { sourceState: "shown" },
    },
  },
  render: () => html`
    <u-button variant="neutral" appearance="plain" label="Close"
      ><u-icon name="close"></u-icon
    ></u-button>
    <u-button variant="danger" appearance="outlined" label="Delete"
      ><u-icon name="danger"></u-icon
    ></u-button>
  `,
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll<Button>("u-button")];
    await Promise.all(buttons.map((button) => button.updateComplete));
    const close = buttons[0]!.shadowRoot!.querySelector("button")!;
    await expect(close).toHaveAccessibleName("Close");
    for (const button of buttons) {
      const { width, height } = button.getBoundingClientRect();
      expect(Math.round(width)).toBe(Math.round(height));
    }
  },
});

export const Loading = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "While its action runs, a `loading` button shows a spinner over its label and ignores clicks, but keeps the focus and its name. Announce the end of the action in a live region.",
      },
    },
  },
  render: () => html`<u-button loading>Save</u-button>`,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const inner = button.shadowRoot!.querySelector("button")!;
    expect(button.shadowRoot!.querySelector('[part~="spinner"]')).not.toBeNull();
    expect(inner.getAttribute("aria-disabled")).toBe("true");
    await expect(inner).toHaveAccessibleName("Save");
    const onClick = fn();
    button.addEventListener("click", onClick);
    await userEvent.click(inner);
    expect(onClick).not.toHaveBeenCalled();
    button.focus();
    expect(button.shadowRoot!.activeElement).toBe(inner);
  },
});

export const PopupTrigger = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The trigger of a popup: `popup` gives its kind (`aria-haspopup`), `expanded` says whether it is open (`aria-expanded`), and `current` marks the item of a set the button stands for (`aria-current`). `menu` and `popover` render their trigger this way.",
      },
    },
  },
  render: () => html`
    <u-button variant="neutral" appearance="outlined" popup="menu">Actions</u-button>
    <u-button variant="neutral" appearance="outlined" popup="dialog" expanded>Shipping</u-button>
    <u-button tabindex="-1" variant="neutral" appearance="plain">Pointer only</u-button>
  `,
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll<Button>("u-button")];
    await Promise.all(buttons.map((button) => button.updateComplete));
    const [menu, dialog, pointer] = buttons.map((button) =>
      button.shadowRoot!.querySelector("button")!,
    );
    expect(menu!.getAttribute("aria-haspopup")).toBe("menu");
    expect(menu!.getAttribute("aria-expanded")).toBe("false");
    expect(dialog!.getAttribute("aria-expanded")).toBe("true");
    // A negative tabindex on the host reaches the native control.
    expect(pointer!.tabIndex).toBe(-1);
  },
});

export const Disclosure = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A button that shows or hides a part of the page, the disclosure pattern: `expandable` gives it `aria-expanded`, from `expanded`. The application changes `expanded` and the part on `click`. A button that stays pressed is a `toggle-button`.",
      },
    },
  },
  render: () => html`
    <u-button
      variant="neutral"
      appearance="outlined"
      expandable
      @click=${(event: Event) => {
        const button = event.currentTarget as Button;
        button.expanded = !button.expanded;
        (button.nextElementSibling as HTMLElement).hidden = !button.expanded;
      }}
      >Filters</u-button
    >
    <p hidden>Status, date and amount.</p>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const control = button.shadowRoot!.querySelector("button")!;
    const region = canvasElement.querySelector("p")!;
    expect(control.getAttribute("aria-expanded")).toBe("false");
    // No popup: aria-haspopup stays off.
    expect(control.hasAttribute("aria-haspopup")).toBe(false);
    await userEvent.click(control);
    await button.updateComplete;
    expect(control.getAttribute("aria-expanded")).toBe("true");
    expect(region.hidden).toBe(false);
  },
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Buttons in disabled state.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <u-button disabled>Disabled</u-button>
    <u-button variant="secondary" disabled>Disabled Secondary</u-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const onClick = fn();
    button.addEventListener("click", onClick);
    // Programmatic click: `pointer-events: none` would make userEvent refuse.
    button.shadowRoot!.querySelector<HTMLButtonElement>(".button")!.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-disabled")).toBe("true");
  },
});

export const SubmitsForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'With `type="submit"`, the button submits its ancestor form through ElementInternals — a button rendered in shadow DOM has no form owner otherwise.',
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <u-button type="submit">Submit</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const onSubmit = fn();
    canvasElement.querySelector("form")!.addEventListener("submit", onSubmit);
    await userEvent.click(button.shadowRoot!.querySelector(".button")!);
    expect(onSubmit).toHaveBeenCalledOnce();
  },
});

export const InDisabledFieldset = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Inside a `<fieldset disabled>`, the button is disabled like a native one: it neither clicks nor submits its form.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <fieldset disabled>
        <legend>Disabled fieldset</legend>
        <u-button type="submit">Submit</u-button>
      </fieldset>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("u-button")!;
    await button.updateComplete;
    const onSubmit = fn();
    canvasElement.querySelector("form")!.addEventListener("submit", onSubmit);
    // Programmatic click: `pointer-events: none` would make userEvent refuse.
    button.shadowRoot!.querySelector<HTMLButtonElement>("button")!.click();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(button.matches(":disabled")).toBe(true);
    expect(button.shadowRoot!.querySelector("button")!.disabled).toBe(true);
  },
});
