import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Footer } from "./footer";

const meta = preview.meta({
  title: "Components/Footer",
  component: "u-footer",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The footer of a page, its `contentinfo` landmark: a few words on the service, and the links every page carries. A public service writes its accessibility status among them (ADR 0034).",
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`
    <u-footer>
      The requests service of the city.
      <ul slot="links">
        <li><u-link href="#accessibility">Accessibility: partially compliant</u-link></li>
        <li><u-link href="#legal">Legal notice</u-link></li>
        <li><u-link href="#data">Personal data</u-link></li>
      </ul>
    </u-footer>
  `,
  play: async ({ canvasElement }) => {
    const footer = canvasElement.querySelector<Footer>("u-footer")!;
    await footer.updateComplete;
    expect(footer.getAttribute("role")).toBe("contentinfo");
  },
});
