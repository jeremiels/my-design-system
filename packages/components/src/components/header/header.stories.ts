import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Header } from "./header";

const meta = preview.meta({
  title: "Components/Header",
  component: "u-header",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The header of a page, its `banner` landmark: the logo, the service name linked to its home page, its tagline, the quick accesses, and the main navigation under them (ADR 0034).",
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`
    <u-header service-name="Requests" tagline="The requests of the city" href="#">
      <u-link slot="actions" href="#help">Help</u-link>
      <u-button slot="actions" variant="neutral" appearance="outlined">Sign in</u-button>
      <nav slot="navigation" aria-label="Main">
        <u-link href="#requests" current>Requests</u-link>
        <u-link href="#reports">Reports</u-link>
      </nav>
    </u-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<Header>("u-header")!;
    await header.updateComplete;
    expect(header.getAttribute("role")).toBe("banner");
    const name = header.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="service-name"]')!;
    await expect(name).toHaveAccessibleName("Requests");
    expect(name.getAttribute("href")).toBe("#");
  },
});
