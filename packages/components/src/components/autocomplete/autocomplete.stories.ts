import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { ListboxSelectEvent } from "../../events/listbox-select";
import type { Modal } from "../modal/modal";
import type { Autocomplete } from "./autocomplete";

const cities = [
  "Paris",
  "Marseille",
  "Lyon",
  "Toulouse",
  "Nice",
  "Nantes",
  "Montpellier",
  "Strasbourg",
  "Bordeaux",
  "Lille",
  "Rennes",
  "Saint-Étienne",
  "Le Havre",
  "Toulon",
  "Grenoble",
  "Dijon",
  "Angers",
  "Nîmes",
  "Évry-Courcouronnes",
].map((city) => ({ value: city }));

/** The field of the story, once rendered, and its inner elements. */
async function fieldIn(canvasElement: HTMLElement, selector = "u-autocomplete") {
  const field = canvasElement.querySelector<Autocomplete>(selector)!;
  await field.updateComplete;
  const shadow = field.shadowRoot!;
  return {
    field,
    input: shadow.querySelector<HTMLInputElement>('[part~="input"]')!,
    popup: shadow.querySelector<HTMLElement>('[part~="popup"]')!,
    listbox: shadow.querySelector<HTMLElement>('[part~="listbox"]')!,
    /** The suggestions the list shows, as text. */
    shown: () =>
      Array.from(shadow.querySelectorAll<HTMLElement>('[part~="option"]'), (option) =>
        option.textContent!.trim(),
      ),
  };
}

/**
 * Empties the input as a user does: userEvent.clear() wants the focus on the
 * element itself, not on its host.
 */
async function clear(input: HTMLInputElement) {
  await userEvent.tripleClick(input);
  await userEvent.keyboard("{Backspace}");
}

/** Whether the popup is shown: in the top layer where the Popover API exists. */
function isOpen(popup: HTMLElement) {
  return popup.hasAttribute("data-open") && popup.matches(":popover-open");
}

/**
 * Waits for the entry and exit transitions of the popup: axe, after the play
 * function, would measure a fading list. WebKit starts an entry transition
 * with the rendering of a later frame, and may restart it: wait until none
 * runs.
 */
async function transitionsEnd(popup: HTMLElement) {
  for (;;) {
    // The callback of the next frame runs before its rendering: wait for two.
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
  title: "Components/Autocomplete",
  component: "u-autocomplete",
  tags: ["autodocs"],
  argTypes: {
    filter: { control: { type: "select" }, options: ["contains", "starts-with", "none"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "City",
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
          "The `u-autocomplete` component is a text field with suggestions. The list below the input shows the suggestions that match the text; the user picks one with the arrow keys and Enter, or with a click, or keeps typing: the value is the text. The suggestions are the `options` property, or `<option>` children. The field takes part in its form like `u-text-field`.",
      },
      // The open list is in the browser's top layer, shared by the whole Docs
      // page under inline rendering: each story gets its own iframe.
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
          "Suggestions from the `options` property. Typing filters them, without case nor accents; ArrowDown enters the list, Enter picks the active suggestion. `u-select` comes first, then `input` and `change`, as for a typed value.",
      },
    },
  },
  render: (args) => html`
    <u-autocomplete
      label=${args.label}
      hint=${args.hint}
      filter=${args.filter}
      ?required=${args.required}
      ?disabled=${args.disabled}
      .options=${cities}
    ></u-autocomplete>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, popup, listbox, shown } = await fieldIn(canvasElement);
    // The ARIA of the combobox pattern, all in the shadow root of the input.
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-controls")).toBe(listbox.id);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(listbox.getAttribute("aria-labelledby")).toBe("label");
    expect(isOpen(popup)).toBe(false);

    const onSelect = fn();
    const onInput = fn();
    const onChange = fn();
    field.addEventListener("u-select", onSelect);
    field.addEventListener("input", onInput);
    field.addEventListener("change", onChange);

    await userEvent.type(input, "evr");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(field.open).toBe(true);
    expect(shown()).toEqual(["Évry-Courcouronnes"]);
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);

    // Below the input, at least as wide.
    const inputBox = input.getBoundingClientRect();
    const popupBox = popup.getBoundingClientRect();
    expect(popupBox.top).toBeGreaterThanOrEqual(inputBox.bottom);
    expect(popupBox.left).toBeCloseTo(inputBox.left, 0);
    expect(popupBox.width).toBeGreaterThanOrEqual(inputBox.width - 1);

    await clear(input);
    await userEvent.type(input, "lille");
    await waitFor(() => expect(shown()).toEqual(["Lille"]));
    await userEvent.keyboard("{ArrowDown}");
    await field.updateComplete;
    const active = field.shadowRoot!.querySelector('[aria-selected="true"]')!;
    expect(input.getAttribute("aria-activedescendant")).toBe(active.id);
    expect(active.textContent!.trim()).toBe("Lille");

    onInput.mockClear();
    await userEvent.keyboard("{Enter}");
    await field.updateComplete;
    expect(onSelect).toHaveBeenCalledOnce();
    expect((onSelect.mock.calls[0][0] as ListboxSelectEvent).option).toBe(
      cities.find(({ value }) => value === "Lille"),
    );
    expect(field.value).toBe("Lille");
    expect(input.value).toBe("Lille");
    expect(onChange).toHaveBeenCalledOnce();
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(field.shadowRoot!.activeElement).toBe(input);

    // ArrowUp opens the list on the last suggestion, then loops to the first.
    await clear(input);
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    expect(shown()).toHaveLength(cities.length);
    expect(input.getAttribute("aria-activedescendant")).toBe(`option-${cities.length - 1}`);
    await userEvent.keyboard("{ArrowDown}");
    await field.updateComplete;
    expect(input.getAttribute("aria-activedescendant")).toBe("option-0");
    // The list scrolled back to the top to show it.
    expect(listbox.scrollTop).toBe(0);

    // Escape closes the list and keeps the text.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(field.open).toBe(false);

    // Left open, for axe: the list and its options.
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    await transitionsEnd(popup);
  },
});

export const OptionChildren = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Suggestions from `<option>` children, as in a `<datalist>`: their `value`, their `label` or text, and `disabled`. The field reads them, and follows their changes, without changing them: a framework keeps rendering them. Its list shows copies of them. A click on a suggestion picks it, and the focus stays in the input.",
      },
    },
  },
  render: () => html`
    <u-autocomplete label="Fruit">
      <option value="Apple"></option>
      <option value="Apricot"></option>
      <option value="Banana">Banana (ripe)</option>
      <option value="Blueberry" disabled></option>
    </u-autocomplete>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, popup, shown } = await fieldIn(canvasElement);
    await userEvent.type(input, "b");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    expect(shown()).toEqual(["Banana (ripe)", "Blueberry"]);
    const disabled = field.shadowRoot!.querySelector('[part~="option"]:last-child')!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");

    // The keyboard skips the disabled suggestion: ArrowDown loops back.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await field.updateComplete;
    expect(input.getAttribute("aria-activedescendant")).toBe("option-0");

    // A new child shows at once.
    const cherry = document.createElement("option");
    cherry.value = "Blackberry";
    field.append(cherry);
    await waitFor(() => expect(shown()).toEqual(["Banana (ripe)", "Blueberry", "Blackberry"]));

    // A click on a disabled suggestion does nothing; on another, picks it.
    await userEvent.click(disabled);
    expect(field.value).toBe("b");
    const blackberry = field.shadowRoot!.querySelector('[part~="option"]:last-child')!;
    await userEvent.click(blackberry);
    await field.updateComplete;
    expect(field.value).toBe("Blackberry");
    expect(field.shadowRoot!.activeElement).toBe(input);
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    // The children stay as the application wrote them.
    expect(field.querySelectorAll("option")).toHaveLength(5);
    await transitionsEnd(popup);
  },
});

export const StartsWith = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'With `filter="starts-with"`, only the suggestions that start with the text show: "to" finds Toulouse and Toulon, not Montpellier.',
      },
    },
  },
  render: () => html`
    <u-autocomplete label="City" filter="starts-with" .options=${cities}></u-autocomplete>
  `,
  play: async ({ canvasElement }) => {
    const { input, popup, shown } = await fieldIn(canvasElement);
    await userEvent.type(input, "to");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    expect(shown()).toEqual(["Toulouse", "Toulon"]);
    // No suggestion matches: the list closes.
    await userEvent.type(input, "x");
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    await transitionsEnd(popup);
  },
});

export const ServerFilter = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'With `filter="none"`, the application filters the suggestions itself: it listens to `input` and sets `options`, from a server for instance. The list opens when they arrive, if the user is still typing. Here, a timer stands for the server.',
      },
    },
  },
  render: () => {
    const search = (event: Event) => {
      const field = event.currentTarget as Autocomplete;
      const query = field.value.toLowerCase();
      setTimeout(() => {
        field.options = cities.filter(({ value }) => value.toLowerCase().includes(query));
      }, 100);
    };
    return html`<u-autocomplete label="City" filter="none" @input=${search}></u-autocomplete>`;
  },
  play: async ({ canvasElement }) => {
    const { field, input, popup, shown } = await fieldIn(canvasElement);
    await userEvent.type(input, "ille");
    // Nothing yet: the list waits for the answers, one per keystroke.
    expect(field.open).toBe(false);
    await waitFor(() => expect(shown()).toEqual(["Marseille", "Lille"]));
    expect(isOpen(popup)).toBe(true);

    // `preventDefault()` on `u-select` keeps the text.
    field.addEventListener("u-select", (event) => event.preventDefault(), { once: true });
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(field.value).toBe("ille");
    await transitionsEnd(popup);
  },
});

export const InForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "The form submits the text under `name`, picked or typed. Enter picks the active suggestion without submitting the form. The reset closes the list and restores the `value` attribute.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <u-autocomplete label="City" name="city" value="Paris" required .options=${cities}>
      </u-autocomplete>
      <u-button type="submit">Submit</u-button>
      <u-button type="reset" variant="secondary">Reset</u-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, popup } = await fieldIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    const onSubmit = fn();
    form.addEventListener("submit", onSubmit);
    expect(field.form).toBe(form);
    expect(new FormData(form).get("city")).toBe("Paris");

    await clear(input);
    expect(field.validity.valueMissing).toBe(true);
    await userEvent.type(input, "nan");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await field.updateComplete;
    expect(onSubmit).not.toHaveBeenCalled();
    expect(new FormData(form).get("city")).toBe("Nantes");
    expect(input.value).toBe("Nantes");
    expect(field.validity.valid).toBe(true);

    // A typed value: free text, as in a text field. Emptied first: userEvent
    // doesn't see a value the component sets in a shadow root, and would
    // type after the previous text.
    await clear(input);
    await userEvent.type(input, "Nantes-Est");
    await userEvent.keyboard("{Escape}");
    await field.updateComplete;
    expect(new FormData(form).get("city")).toBe("Nantes-Est");

    await clear(input);
    await userEvent.type(input, "pa");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    form.reset();
    await field.updateComplete;
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(field.value).toBe("Paris");
    expect(input.value).toBe("Paris");
    await transitionsEnd(popup);
  },
});

export const InModal = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "In a modal, the list shows above the dialog, in the top layer. Escape closes the list, not the modal; pressed again, it closes the modal.",
      },
    },
  },
  render: () => html`
    <u-button commandfor="modal" command="--show-modal">Open modal</u-button>
    <u-modal id="modal" label="Delivery" open>
      <u-autocomplete label="City" .options=${cities}></u-autocomplete>
    </u-modal>
  `,
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector<Modal>("u-modal")!;
    await modal.updateComplete;
    const { field, input, popup } = await fieldIn(canvasElement);
    const dialog = modal.shadowRoot!.querySelector("dialog")!;
    await waitFor(() => expect(dialog.open).toBe(true));

    await userEvent.type(input, "r");
    await waitFor(() => expect(isOpen(popup)).toBe(true));
    await transitionsEnd(popup);
    // Above the dialog: the point at the center of the list hits the list.
    const box = popup.getBoundingClientRect();
    const hit = field.shadowRoot!.elementFromPoint(box.left + box.width / 2, box.top + 8);
    expect(popup.contains(hit)).toBe(true);

    // Escape closes the list. Its keydown is canceled, which keeps the
    // browser from closing the dialog, and stops there. userEvent's synthetic
    // keys can't close a dialog: src/components/autocomplete/autocomplete.test.ts
    // presses the real key.
    const onPageKey = fn();
    document.addEventListener("keydown", onPageKey);
    const keydowns: KeyboardEvent[] = [];
    input.addEventListener("keydown", (event) => keydowns.push(event));
    await userEvent.keyboard("{Escape}");
    document.removeEventListener("keydown", onPageKey);
    await waitFor(() => expect(isOpen(popup)).toBe(false));
    expect(keydowns.at(-1)!.defaultPrevented).toBe(true);
    expect(onPageKey).not.toHaveBeenCalled();
    expect(modal.open).toBe(true);
    expect(dialog.open).toBe(true);
    await transitionsEnd(popup);
  },
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A disabled field: the arrow keys don't open its list, and its form skips it.",
      },
    },
  },
  render: () => html`
    <u-autocomplete label="City" value="Lyon" disabled .options=${cities}></u-autocomplete>
  `,
  play: async ({ canvasElement }) => {
    const { field, input, popup } = await fieldIn(canvasElement);
    expect(input.disabled).toBe(true);
    expect(field.getAttribute("aria-disabled")).toBe("true");
    field.open = true;
    await field.updateComplete;
    expect(field.open).toBe(false);
    expect(isOpen(popup)).toBe(false);
  },
});
