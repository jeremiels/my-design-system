import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect } from "storybook/test";
import { Icon } from "./icon";

const names = Object.keys(Icon.icons);

/** Renders every icon of the canvas, loads included. */
async function rendered(canvasElement: HTMLElement): Promise<Icon[]> {
  const icons = [...canvasElement.querySelectorAll<Icon>("u-icon")];
  await Promise.all(icons.map((icon) => icon.updateComplete));
  return icons;
}

const meta = preview.meta({
  title: "Components/Icon",
  component: "u-icon",
  tags: ["autodocs"],
  argTypes: {
    name: { control: { type: "select" }, options: names },
    label: { control: "text" },
  },
  args: {
    name: "information",
  },
  parameters: {
    docs: {
      description: {
        component:
          "The `u-icon` component displays an icon of `@unicorne/icons` by name. Each icon loads the first time it renders: a page downloads only the icons it shows. It takes the color of the text. Without `label`, it's decorative.",
      },
    },
  },
});

export default meta;

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A decorative icon: assistive technologies ignore it.",
      },
    },
  },
  render: (args) =>
    html`<u-icon name=${ifDefined(args.name)} label=${ifDefined(args.label)}></u-icon>`,
  play: async ({ canvasElement, args }) => {
    const [icon] = await rendered(canvasElement);
    const box = icon.shadowRoot!.querySelector('[part~="icon"]')!;
    expect(box.querySelector("svg")).not.toBeNull();
    if (!args.label) {
      expect(box.getAttribute("aria-hidden")).toBe("true");
      expect(box.getAttribute("role")).toBeNull();
    }
  },
});

export const WithLabel = meta.story({
  parameters: {
    docs: {
      description: {
        story: "An icon that carries meaning on its own: `label` gives it a role and a name.",
      },
    },
  },
  args: { name: "success", label: "Saved" },
  render: (args) =>
    html`<u-icon name=${ifDefined(args.name)} label=${ifDefined(args.label)}></u-icon>`,
  play: async ({ canvasElement }) => {
    const [icon] = await rendered(canvasElement);
    const box = icon.shadowRoot!.querySelector('[part~="icon"]')!;
    expect(box.getAttribute("role")).toBe("img");
    expect(box.getAttribute("aria-label")).toBe("Saved");
    expect(box.hasAttribute("aria-hidden")).toBe(false);
  },
});

export const Gallery = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Every icon of the set, with its name.",
      },
    },
  },
  render: () => html`
    <ul
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 1rem; padding: 0; list-style: none"
    >
      ${names.map(
        (name) => html`
          <li style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem">
            <u-icon name=${name}></u-icon>
            <code>${name}</code>
          </li>
        `,
      )}
    </ul>
  `,
  play: async ({ canvasElement }) => {
    const icons = await rendered(canvasElement);
    expect(icons.map((icon) => icon.name)).toEqual(names);
    for (const icon of icons) {
      expect(icon.shadowRoot!.querySelector("svg"), icon.name).not.toBeNull();
    }
  },
});

export const SizeAndColor = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The application sets the size with the `--u-icon-size` token, and the color with `color`, as for text.",
      },
    },
  },
  render: () => html`
    <p style="color: var(--u-color-danger-text)">
      <u-icon name="danger" style="--u-icon-size: 2rem"></u-icon>
      Text in the same color
    </p>
  `,
  play: async ({ canvasElement }) => {
    const [icon] = await rendered(canvasElement);
    const svg = icon.shadowRoot!.querySelector("svg")!;
    expect(getComputedStyle(icon).inlineSize).toBe("32px");
    expect(getComputedStyle(svg).inlineSize).toBe("32px");
    expect(getComputedStyle(svg).color).toBe(
      getComputedStyle(canvasElement.querySelector("p")!).color,
    );
  },
});
