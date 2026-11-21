// A list of options in the shadow root of its control: the source of its
// options, the active option, aria-activedescendant, the pointer. The host
// owns the active index, as `ComboboxBase` does with `comboboxReducer()`.
import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { ListboxOption } from "../components/listbox/listbox.type.js";
import { collectionKeyMove, moveIndex, type CollectionMove } from "../state/collection.js";
import { ListboxController, listboxStyles, listboxTokens } from "./listbox.js";

class List extends LitElement {
  // The controller can't adopt its sheets: its host does.
  static styles = [listboxTokens, listboxStyles];

  @property({ attribute: false })
  options?: readonly ListboxOption[];

  @state()
  activeIndex = -1;

  picked: ListboxOption[] = [];

  list = new ListboxController(this, {
    labelledBy: "label",
    options: () => this.available,
    activeIndex: () => this.activeIndex,
    activate: (index) => {
      this.activeIndex = index;
    },
    select: (option) => this.picked.push(option),
  });

  /** The options of the last render: other ones have no active option. */
  #rendered?: readonly ListboxOption[];

  get available() {
    return this.options ?? this.list.childOptions;
  }

  protected willUpdate() {
    if (this.available !== this.#rendered) {
      this.#rendered = this.available;
      this.activeIndex = -1;
    }
  }

  render() {
    return html`
      <span id="label">Fruits</span>
      <input
        id="control"
        aria-controls=${this.list.id}
        aria-activedescendant=${this.list.activeDescendant}
        @keydown=${this.#keydown}
      />
      ${this.list.render()}
    `;
  }

  #keydown = (event: KeyboardEvent) => {
    const to = collectionKeyMove(event.key, { axis: "vertical" });
    const active = this.list.activeOption;
    if (to) {
      this.activeIndex = moveIndex(this.available, this.activeIndex, to);
    } else if (event.key === "Enter" && active) {
      this.picked.push(active);
    } else {
      return;
    }
    event.preventDefault();
  };

  move(to: CollectionMove) {
    this.activeIndex = moveIndex(this.available, this.activeIndex, to);
    return this.updateComplete;
  }

  get active() {
    return this.list.activeOption?.value;
  }

  get input() {
    return this.renderRoot.querySelector<HTMLInputElement>("#control")!;
  }

  get listbox() {
    return this.renderRoot.querySelector<HTMLElement>("#listbox")!;
  }

  /** The options the list renders, as text. */
  get shown() {
    return Array.from(this.renderRoot.querySelectorAll('[role="option"]'), (option) =>
      option.textContent!.trim(),
    );
  }
}
customElements.define("t-listbox", List);

const fruits: ListboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana", disabled: true },
  { value: "cherry", label: "Cherry" },
];

async function mount(markup = "") {
  const list = new List();
  list.innerHTML = markup;
  document.body.append(list);
  await list.updateComplete;
  return list;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("ListboxController: options", () => {
  it("renders the options of its host, labelled by the element it is given", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;

    expect(list.listbox.getAttribute("role")).toBe("listbox");
    expect(list.listbox.getAttribute("aria-labelledby")).toBe("label");
    expect(list.input.getAttribute("aria-controls")).toBe(list.listbox.id);
    expect(list.shown).toEqual(["Apple", "Banana", "Cherry"]);
    const banana = list.renderRoot.querySelector("#option-1")!;
    expect(banana.getAttribute("aria-disabled")).toBe("true");
  });

  it("reads the <option> children, and follows their changes without touching them", async () => {
    const list = await mount(`
      <option value="apple">Apple</option>
      <option value="banana" label="Yellow banana"></option>
      <option disabled>Cherry</option>
    `);
    expect(list.shown).toEqual(["Apple", "Yellow banana", "Cherry"]);
    await list.move("last");
    expect(list.active).toBe("banana");

    const date = document.createElement("option");
    date.textContent = "Date";
    list.append(date);
    list.querySelector("option")!.textContent = "Green apple";
    await list.updateComplete;
    // The mutations are delivered after the current task's microtasks.
    await new Promise((resolve) => setTimeout(resolve));
    await list.updateComplete;

    expect(list.shown).toEqual(["Green apple", "Yellow banana", "Cherry", "Date"]);
    // New options: the active one would be another.
    expect(list.active).toBeUndefined();
    expect(list.querySelectorAll("option")).toHaveLength(4);
    expect(list.querySelector("option")!.outerHTML).toBe(
      '<option value="apple">Green apple</option>',
    );
  });

  it("lets its host prefer a property to the children", async () => {
    const list = await mount(`<option>Kiwi</option>`);
    list.options = fruits;
    await list.updateComplete;
    expect(list.shown).toEqual(["Apple", "Banana", "Cherry"]);

    list.options = undefined;
    await list.updateComplete;
    expect(list.shown).toEqual(["Kiwi"]);
  });
});

describe("ListboxController: the active option", () => {
  it("moves through the enabled options, looping at the ends", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;

    await list.move("next");
    expect(list.active).toBe("apple");
    await list.move("next");
    expect(list.active).toBe("cherry");
    await list.move("next");
    expect(list.active).toBe("apple");
    await list.move("previous");
    expect(list.active).toBe("cherry");
    await list.move("none");
    expect(list.active).toBeUndefined();
    await list.move("previous");
    expect(list.active).toBe("cherry");
    await list.move("first");
    expect(list.active).toBe("apple");
  });

  it("names the active option in aria-activedescendant and aria-selected", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;
    expect(list.input.hasAttribute("aria-activedescendant")).toBe(false);

    await list.move("last");

    const active = list.renderRoot.querySelector('[aria-selected="true"]')!;
    expect(active.id).toBe("option-2");
    expect(list.input.getAttribute("aria-activedescendant")).toBe(active.id);
    expect(list.renderRoot.querySelectorAll('[aria-selected="false"]')).toHaveLength(2);
  });

  it("moves with the arrow keys and picks with Enter", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;
    list.input.focus();

    await userEvent.keyboard("{Enter}");
    expect(list.picked).toEqual([]);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(list.picked).toEqual([fruits[2]]);
  });

  it("scrolls the list, not the page, to the active option", async () => {
    const list = await mount();
    list.listbox.style.maxBlockSize = "4rem";
    list.options = Array.from({ length: 20 }, (_, index) => ({ value: `Option ${index}` }));
    await list.updateComplete;

    await list.move("last");
    await list.updateComplete;

    const box = list.listbox.getBoundingClientRect();
    const last = list.renderRoot.querySelector("#option-19")!.getBoundingClientRect();
    expect(list.listbox.scrollTop).toBeGreaterThan(0);
    expect(last.bottom).toBeLessThanOrEqual(box.bottom);
    expect(window.scrollY).toBe(0);

    await list.move("first");
    await list.updateComplete;
    expect(list.listbox.scrollTop).toBe(0);
  });
});

describe("ListboxController: the pointer", () => {
  it("activates the option under the pointer, and picks it on click, the focus staying on the control", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;
    list.input.focus();

    const cherry = list.renderRoot.querySelector<HTMLElement>("#option-2")!;
    await userEvent.hover(cherry);
    await list.updateComplete;
    expect(list.active).toBe("cherry");

    await userEvent.click(cherry);
    expect(list.picked).toEqual([fruits[2]]);
    expect(list.shadowRoot!.activeElement).toBe(list.input);
  });

  it("ignores a disabled option", async () => {
    const list = await mount();
    list.options = fruits;
    await list.updateComplete;

    const banana = list.renderRoot.querySelector<HTMLElement>("#option-1")!;
    await userEvent.hover(banana);
    // Forced: Playwright never clicks an element with aria-disabled="true".
    await userEvent.click(banana, { force: true });
    await list.updateComplete;

    expect(list.active).toBeUndefined();
    expect(list.picked).toEqual([]);
  });
});

describe("ListboxController: a host rendered on a server (ADR 0014)", () => {
  it("reads the children after the first render, which matches the server's", async () => {
    // What a declarative shadow root leaves: a shadow root before the upgrade.
    const list = document.createElement("t-listbox-late") as List;
    list.innerHTML = `<option>Kiwi</option>`;
    list.attachShadow({ mode: "open" });
    class Late extends List {}
    document.body.append(list);
    customElements.define("t-listbox-late", Late);

    const first: string[][] = [];
    const late = list as List;
    // The first render has no option, as on the server.
    first.push(late.list.childOptions.map(({ value }) => value));
    await late.updateComplete;
    await late.updateComplete;
    expect(first).toEqual([[]]);
    expect(late.shown).toEqual(["Kiwi"]);
  });
});
