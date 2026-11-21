import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Button } from "../button/button";
import type { TagGroup } from "../tag-group/tag-group";
import type { Tag } from "./tag";

const meta = preview.meta({
  title: "Components/Tag",
  component: "u-tag",
  subcomponents: { TagGroup: "u-tag-group" },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-tag` component is a keyword: a category, a filter applied, a value chosen. Several tags go in a `u-tag-group`, a named list. A `removable` tag fires `u-remove`; the application removes it, and the group moves the focus to a neighbor.",
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`
    <u-tag-group label="Topics">
      <u-tag>Housing</u-tag>
      <u-tag>Transport</u-tag>
      <u-tag>Health</u-tag>
    </u-tag-group>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<TagGroup>("u-tag-group")!;
    await group.updateComplete;
    expect(group.getAttribute("role")).toBe("list");
    expect(group.getAttribute("aria-label")).toBe("Topics");
    for (const tag of group.querySelectorAll("u-tag")) {
      expect(tag.getAttribute("role")).toBe("listitem");
    }
  },
});

export const Removable = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Filters applied: the application removes a tag on its `u-remove`. The name of each remove button holds the tag's text (`removeMessage`).",
      },
    },
  },
  render: () => html`
    <u-tag-group
      label="Filters applied"
      @u-remove=${(event: Event) => (event.target as Element).remove()}
    >
      <u-tag removable>Paris</u-tag>
      <u-tag removable>Lyon</u-tag>
      <u-tag removable>Marseille</u-tag>
    </u-tag-group>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<TagGroup>("u-tag-group")!;
    const tags = [...group.querySelectorAll<Tag>("u-tag")];
    await Promise.all(tags.map((tag) => tag.updateComplete));
    const button = (tag: Tag) => tag.shadowRoot!.querySelector<Button>('[part~="remove-button"]')!;
    await button(tags[0]!).updateComplete;
    // The remove button is a `u-button`, named by `label` on its native control.
    await expect(button(tags[0]!).shadowRoot!.querySelector("button")!).toHaveAccessibleName(
      "Remove Paris",
    );

    // The focus moves to the tag that takes its place.
    await userEvent.click(button(tags[0]!));
    await waitFor(() => expect(tags[0]!.isConnected).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(tags[1]));

    // The last tag: to the one before it.
    await userEvent.click(button(tags[2]!));
    await waitFor(() => expect(document.activeElement).toBe(tags[1]));
  },
});
