import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn } from "storybook/test";
import type { ButtonLink } from "./button-link";

const meta = preview.meta({
  title: "Components/Button link",
  component: "u-button-link",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-button-link` component is a link styled as a button, for navigation. It keeps the semantics of a link (announced as a link, followed with Enter); use `u-button` for actions.",
      },
    },
  },
});

export default meta;

export const Default = meta.story({
  render: () => html`<u-button-link href="#section">Go to the section</u-button-link>`,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<ButtonLink>("u-button-link")!;
    await link.updateComplete;
    const anchor = link.shadowRoot!.querySelector("a")!;
    expect(anchor.getAttribute("href")).toBe("#section");
    // A native link: no role override.
    expect(anchor.hasAttribute("role")).toBe(false);
  },
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A disabled link drops its `href`: it leaves the tab order, can't navigate, and stays announced as a disabled link.",
      },
    },
  },
  render: () => html`<u-button-link href="#section" disabled>Go to the section</u-button-link>`,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<ButtonLink>("u-button-link")!;
    await link.updateComplete;
    const anchor = link.shadowRoot!.querySelector("a")!;
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("role")).toBe("link");
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
    // A link without href still dispatches clicks: they must not reach the host.
    const onClick = fn();
    link.addEventListener("click", onClick);
    anchor.click();
    expect(onClick).not.toHaveBeenCalled();
  },
});
