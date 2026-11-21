import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent, waitFor } from "storybook/test";
import type { OptionsRequest } from "../../bases/editable-combobox/editable-combobox.type";
import type { ListboxOption } from "../../controllers/listbox.type";
import type { Combobox } from "./combobox";

/** Towns and their INSEE codes: the label shows, the code is the value. */
const towns = [
  ["75056", "Paris"],
  ["13055", "Marseille"],
  ["69123", "Lyon"],
  ["31555", "Toulouse"],
  ["06088", "Nice"],
  ["44109", "Nantes"],
  ["34172", "Montpellier"],
  ["67482", "Strasbourg"],
  ["33063", "Bordeaux"],
  ["59350", "Lille"],
  ["35238", "Rennes"],
  ["42218", "Saint-Étienne"],
  ["64445", "Pau"],
  ["93066", "Saint-Denis"],
].map(([value, label]) => ({ value: value!, label: label! }));

/** The field of the story, once rendered, and its inner elements. */
async function fieldIn(canvasElement: HTMLElement) {
  const field = canvasElement.querySelector<Combobox>("u-combobox")!;
  await field.updateComplete;
  const shadow = field.shadowRoot!;
  return {
    field,
    input: shadow.querySelector<HTMLInputElement>('[part~="input"]')!,
    popup: shadow.querySelector<HTMLElement>('[part~="popup"]')!,
    /** The options the list shows, as text. */
    shown: () =>
      Array.from(shadow.querySelectorAll<HTMLElement>('[part~="option"]'), (option) =>
        option.textContent!.trim(),
      ),
  };
}

/** Whether the popup is shown: in the top layer where the Popover API exists. */
function isOpen(popup: HTMLElement) {
  return popup.hasAttribute("data-open") && popup.matches(":popover-open");
}

/**
 * Waits for the entry and exit transitions of the popup: axe, after the play
 * function, would measure a fading list. WebKit may restart a transition.
 */
async function transitionsEnd(popup: HTMLElement) {
  for (;;) {
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
  title: "Components/Combobox",
  component: "u-combobox",
  tags: ["autodocs"],
  argTypes: {
    filter: { control: { type: "select" }, options: ["contains", "starts-with", "none"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Town",
    hint: "",
    filter: "contains",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-combobox` component is a text field whose value is one of its options. Typing filters the options; the user picks one with the arrow keys and Enter, or with a click. The input shows the label of the option, the form receives its value. Leaving the field ends the typing: the input shows the label of the value again, unless the text is the label of a single option. For a free text, use `u-autocomplete`.",
      },
      // The open list is in the browser's top layer: each story gets its own iframe.
      story: { inline: false, iframeHeight: "360px" },
    },
  },
});

export default meta;

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Towns from the `options` property, and their INSEE codes as values. Typing filters them, without case nor accents; `value` changes only on a pick.",
      },
    },
  },
  render: (args) => html`
    <u-combobox
      label=${args.label}
      hint=${args.hint}
      filter=${args.filter}
      ?required=${args.required}
      ?disabled=${args.disabled}
      .options=${towns}
    ></u-combobox>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, popup, shown } = await fieldIn(canvasElement);
    await userEvent.type(input, "par");
    await waitFor(() => expect(shown()).toEqual(["Paris"]));
    expect(field.value).toBe("");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(field.value).toBe("75056");
    expect(input.value).toBe("Paris");
    await transitionsEnd(popup);
  },
});

export const Revert = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The value is Lyon. The user types “pa”, then leaves the field without a pick: the input shows “Lyon” again. Typing “nice” and leaving picks Nice: its label is the text.",
      },
    },
  },
  render: () => html`<u-combobox label="Town" value="69123" .options=${towns}></u-combobox>`,
  play: async ({ canvasElement }) => {
    const { field, input, popup } = await fieldIn(canvasElement);
    expect(input.value).toBe("Lyon");
    // The typing replaces the label: the input is never empty.
    await userEvent.type(input, "pa", {
      initialSelectionStart: 0,
      initialSelectionEnd: input.value.length,
    });
    expect(field.inputValue).toBe("pa");
    await userEvent.tab();
    await waitFor(() => expect(input.value).toBe("Lyon"));
    expect(field.value).toBe("69123");

    // The typing replaces the label: the input is never empty.
    await userEvent.type(input, "nice", {
      initialSelectionStart: 0,
      initialSelectionEnd: input.value.length,
    });
    await userEvent.tab();
    await waitFor(() => expect(field.value).toBe("06088"));
    expect(input.value).toBe("Nice");
    await transitionsEnd(popup);
  },
});

export const LongList = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A thousand options: the list shows the first 100 (`max-options`), and its status line says how many match. The user types more to narrow it.",
      },
    },
  },
  render: () => {
    const offices = Array.from({ length: 1000 }, (_, index) => ({
      value: String(index + 1).padStart(4, "0"),
      label: `Office ${index + 1}`,
    }));
    return html`<u-combobox label="Office" .options=${offices}></u-combobox>`;
  },
  play: async ({ canvasElement }) => {
    const { field, input, popup, shown } = await fieldIn(canvasElement);
    const shadow = field.shadowRoot!;
    input.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    expect(shown()).toHaveLength(100);
    const line = shadow.querySelector<HTMLElement>('[part~="status"]')!;
    expect(line.textContent!.trim()).toBe("1000 suggestions, 100 shown");
    // In view at the bottom of the list, which hasn't scrolled.
    const list = shadow.querySelector<HTMLElement>('[part~="listbox"]')!;
    expect(list.scrollTop).toBe(0);
    const inner = list.getBoundingClientRect().bottom - list.clientTop;
    expect(Math.abs(line.getBoundingClientRect().bottom - inner)).toBeLessThan(1);

    await userEvent.type(input, "99");
    await waitFor(() => expect(shown()).toHaveLength(19));
    expect(shadow.querySelector('[part~="status"]')).toBeNull();
    await userEvent.keyboard("{Escape}");
    await transitionsEnd(popup);
  },
});

export const FromServer = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`loadOptions` receives the text 300 milliseconds after the user's last change, with a signal that aborts when a newer text replaces it. A request that lasts more than half a second shows `loading-label`. Here, a timer of 800 milliseconds stands for the server.",
      },
    },
  },
  render: () => {
    const loadOptions = ({ text, signal }: OptionsRequest) =>
      new Promise<readonly ListboxOption[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          const query = text.toLowerCase();
          resolve(towns.filter(({ label }) => label.toLowerCase().includes(query)));
        }, 800);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });
    return html`<u-combobox label="Town" .loadOptions=${loadOptions}></u-combobox>`;
  },
  play: async ({ canvasElement }) => {
    const { field, input, popup, shown } = await fieldIn(canvasElement);
    const shadow = field.shadowRoot!;
    await userEvent.type(input, "saint");
    await waitFor(() => expect(field.loading).toBe(true));
    await waitFor(() =>
      expect(shadow.querySelector('[part~="status"]')?.textContent?.trim()).toBe("Loading…"),
    );
    expect(isOpen(popup)).toBe(true);
    await waitFor(() => expect(shown()).toEqual(["Saint-Étienne", "Saint-Denis"]));
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await waitFor(() => expect(field.value).toBe("93066"));
    expect(input.value).toBe("Saint-Denis");
    await transitionsEnd(popup);
  },
});

export const InForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required combobox: the form doesn't submit while `value` is empty, whatever the text. It submits the code of the town under `name`.",
      },
    },
  },
  render: () => {
    const submit = (event: SubmitEvent) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      form.querySelector("output")!.value = String(new FormData(form).get("town"));
    };
    return html`
      <form @submit=${submit}>
        <u-combobox label="Town" name="town" required .options=${towns}></u-combobox>
        <button type="submit">Send</button>
        <p>Submitted: <output></output></p>
      </form>
    `;
  },
  play: async ({ canvasElement }) => {
    const { field, input, popup } = await fieldIn(canvasElement);
    const output = canvasElement.querySelector("output")!;
    await userEvent.type(input, "Pa");
    expect(field.checkValidity()).toBe(false);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await waitFor(() => expect(field.value).toBe("64445"));
    await field.updateComplete;
    await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[type="submit"]')!);
    await waitFor(() => expect(output.value).toBe("64445"));
    await transitionsEnd(popup);
  },
});
