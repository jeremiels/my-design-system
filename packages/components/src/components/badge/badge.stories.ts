import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Badge } from "./badge";

const meta = preview.meta({
  title: "Components/Badge",
  component: "u-badge",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-badge` component is a short status next to what it qualifies. Its text says the status; `variant` colors it. Several badges form a list.",
      },
    },
  },
});

export const Variants = meta.story({
  render: () => html`
    <ul style="display: flex; gap: 0.5rem; padding: 0; margin: 0; list-style: none">
      <li><u-badge>Received</u-badge></li>
      <li><u-badge variant="success">Accepted</u-badge></li>
      <li><u-badge variant="warning">Incomplete</u-badge></li>
      <li><u-badge variant="danger">Refused</u-badge></li>
    </ul>
  `,
  play: async ({ canvasElement }) => {
    const badges = [...canvasElement.querySelectorAll<Badge>("u-badge")];
    await Promise.all(badges.map((badge) => badge.updateComplete));
    const backgrounds = badges.map(
      (badge) =>
        getComputedStyle(badge.shadowRoot!.querySelector('[part~="badge"]')!).backgroundColor,
    );
    expect(new Set(backgrounds).size).toBe(4);
    // Text, without a role: not a live region.
    expect(badges[0]!.shadowRoot!.querySelector("[role]")).toBeNull();
  },
});
