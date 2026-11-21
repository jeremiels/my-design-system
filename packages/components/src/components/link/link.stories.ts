import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Link } from "./link";

const meta = preview.meta({
  title: "Components/Link",
  component: "u-link",
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          'A link to a page: a native `<a>` that takes the focus of the host, inline in a sentence. With `target="_blank"`, an icon follows its text and `new-window-label` ends its accessible name (ADR 0034). A link that looks like a button is a `u-button-link`.',
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`
    <p>Read the <u-link href="#help">help of the service</u-link> before you send a request.</p>
  `,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<Link>("u-link")!;
    await link.updateComplete;
    const anchor = link.shadowRoot!.querySelector("a")!;
    await expect(anchor).toHaveAccessibleName("help of the service");
    // The host takes the focus for its link.
    link.focus();
    expect(link.shadowRoot!.activeElement).toBe(anchor);
  },
});

export const NewWindow = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          '`target="_blank"` opens a new window: the icon shows it, and the accessible name ends with `new-window-label`, here in French. `rel` is `noopener` by default.',
      },
    },
  },
  render: () => html`
    <p lang="fr">
      Consultez la
      <u-link
        href="https://www.service-public.fr"
        target="_blank"
        new-window-label="(nouvelle fenêtre)"
        >fiche du service public</u-link
      >.
    </p>
  `,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<Link>("u-link")!;
    await link.updateComplete;
    const anchor = link.shadowRoot!.querySelector("a")!;
    await expect(anchor).toHaveAccessibleName("fiche du service public (nouvelle fenêtre)");
    expect(anchor.rel).toBe("noopener");
    expect(
      link.shadowRoot!.querySelector('[part~="icon"]')!.shadowRoot!.querySelector("svg"),
    ).toBeTruthy();
  },
});

export const Current = meta.story({
  parameters: {
    docs: {
      description: {
        story: '`current` marks the link of the page the user is on: `aria-current="page"`.',
      },
    },
  },
  render: () => html`
    <ul>
      <li><u-link href="#requests" current>Requests</u-link></li>
      <li><u-link href="#archive">Archive</u-link></li>
    </ul>
  `,
  play: async ({ canvasElement }) => {
    const [current, other] = [...canvasElement.querySelectorAll<Link>("u-link")];
    await current!.updateComplete;
    expect(current!.shadowRoot!.querySelector("a")!.getAttribute("aria-current")).toBe("page");
    expect(other!.shadowRoot!.querySelector("a")!.hasAttribute("aria-current")).toBe(false);
  },
});
