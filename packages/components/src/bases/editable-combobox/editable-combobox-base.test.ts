// The long lists and the options from a server, with the real keys
// (ADR 0026). Chromium.
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Autocomplete } from "../../components/autocomplete/autocomplete.js";
import type { Combobox } from "../../components/combobox/combobox.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import type { OptionsRequest } from "./editable-combobox.type.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

/** Town 1 to town `count`. */
function towns(count: number): ListboxOption[] {
  return Array.from({ length: count }, (_, index) => ({
    value: String(index + 1),
    label: `Town ${index + 1}`,
  }));
}

async function mount<T extends Autocomplete | Combobox>(tag: "u-autocomplete" | "u-combobox") {
  document.body.innerHTML = `
    <${tag} label="Town"></${tag}>
    <button id="after" type="button">After</button>`;
  const field = document.querySelector<T>(tag)!;
  await field.updateComplete;
  const root = field.shadowRoot!;
  const input = root.querySelector("input")!;
  return {
    field,
    input,
    popup: root.querySelector<HTMLElement>('[part~="popup"]')!,
    listbox: root.querySelector<HTMLElement>('[role="listbox"]')!,
    shown: () =>
      Array.from(root.querySelectorAll('[role="option"]'), (option) => option.textContent!.trim()),
    status: () => root.querySelector('[part~="status"]')?.textContent?.trim() ?? "",
    announced: () => root.querySelector('[role="status"]')!.textContent!.trim(),
  };
}

/**
 * A fake server: each request waits for the test to answer it. The tests
 * change the text at once (`fill`): typed key by key on a slow machine,
 * each key could start its own request.
 */
function server() {
  const requests: {
    text: string;
    signal: AbortSignal;
    answer: (options: ListboxOption[]) => void;
  }[] = [];
  const loadOptions = vi.fn(
    ({ text, signal }: OptionsRequest) =>
      new Promise<readonly ListboxOption[]>((resolve) => {
        requests.push({ text, signal, answer: resolve });
      }),
  );
  return { requests, loadOptions };
}

it("shows the first options of a long list, and says how many match", async () => {
  const { field, input, shown, status, announced } = await mount<Autocomplete>("u-autocomplete");
  field.options = towns(250);
  await userEvent.type(input, "town");
  await expect.poll(() => shown().length).toBe(100);
  expect(shown()[0]).toBe("Town 1");
  expect(status()).toBe("250 suggestions, 100 shown");
  expect(announced()).toBe("250 suggestions, 100 shown");

  // Typing more narrows the list: every option shows, without a status line.
  await userEvent.type(input, " 12");
  await expect
    .poll(() => shown())
    .toEqual([
      "Town 12",
      "Town 120",
      "Town 121",
      "Town 122",
      "Town 123",
      "Town 124",
      "Town 125",
      "Town 126",
      "Town 127",
      "Town 128",
      "Town 129",
    ]);
  expect(status()).toBe("");
  expect(announced()).toBe("11 suggestions");
});

it("shows every option with max-options set to Infinity", async () => {
  const { field, input, shown, status } = await mount<Autocomplete>("u-autocomplete");
  field.options = towns(150);
  field.setAttribute("max-options", "Infinity");
  await userEvent.type(input, "town");
  await expect.poll(() => shown().length).toBe(150);
  expect(status()).toBe("");
});

it("loads the options for the text, after the delay", async () => {
  const { requests, loadOptions } = server();
  const { field, input, shown, announced, listbox } = await mount<Autocomplete>("u-autocomplete");
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "par");
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]!.text).toBe("par");
  expect(field.loading).toBe(true);
  expect(listbox.getAttribute("aria-busy")).toBe("true");
  // No count while the answer is on its way: not "No suggestions".
  expect(announced()).toBe("");

  requests[0]!.answer([{ value: "Paris" }, { value: "Parthenay" }]);
  await expect.poll(() => shown()).toEqual(["Paris", "Parthenay"]);
  expect(announced()).toBe("2 suggestions");
  expect(field.loading).toBe(false);
  expect(listbox.hasAttribute("aria-busy")).toBe(false);
});

it("aborts the request of an older text, and drops its answer", async () => {
  const { requests, loadOptions } = server();
  const { field, input, shown } = await mount<Autocomplete>("u-autocomplete");
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "pa");
  await expect.poll(() => requests.length).toBe(1);
  await userEvent.fill(input, "pau");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[0]!.signal.aborted).toBe(true);
  requests[0]!.answer([{ value: "Paris" }]);
  requests[1]!.answer([{ value: "Pau" }]);
  await expect.poll(() => shown()).toEqual(["Pau"]);
});

it("shows and announces the loading of a slow request", async () => {
  const { requests, loadOptions } = server();
  const { field, input, popup, shown, status, announced } =
    await mount<Autocomplete>("u-autocomplete");
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "par");
  await expect.poll(() => requests.length).toBe(1);
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  expect(shown()).toEqual([]);
  expect(status()).toBe("Loading…");
  expect(announced()).toBe("Loading…");

  requests[0]!.answer([{ value: "Paris" }]);
  await expect.poll(() => shown()).toEqual(["Paris"]);
  expect(status()).toBe("");
  expect(announced()).toBe("1 suggestion");
});

it("shows options until the first answer, and again once the text is empty", async () => {
  const { requests, loadOptions } = server();
  const { field, input, shown } = await mount<Autocomplete>("u-autocomplete");
  field.options = [{ value: "Paris" }, { value: "Pau" }];
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "par");
  await field.updateComplete;
  expect(shown()).toEqual(["Paris"]);
  await expect.poll(() => requests.length).toBe(1);
  requests[0]!.answer([{ value: "Parthenay" }]);
  await expect.poll(() => shown()).toEqual(["Parthenay"]);

  await userEvent.fill(input, "");
  await field.updateComplete;
  expect(shown()).toEqual(["Paris", "Pau"]);
  expect(requests).toHaveLength(1);
});

it("shows options again once a request fails, and reports its error", async () => {
  const reported = vi.fn();
  vi.stubGlobal("reportError", reported);
  const { field, input, shown } = await mount<Autocomplete>("u-autocomplete");
  field.options = [{ value: "Paris" }, { value: "Pau" }];
  const error = new Error("offline");
  field.loadOptions = vi.fn(() => Promise.reject(error));
  await userEvent.fill(input, "par");
  await expect.poll(() => reported.mock.calls.length).toBe(1);
  expect(reported).toHaveBeenCalledWith(error);
  expect(shown()).toEqual(["Paris"]);
  expect(field.loading).toBe(false);
});

it("picks an option the server gave, and keeps its label once the options change", async () => {
  const { requests, loadOptions } = server();
  const { field, input, shown } = await mount<Combobox>("u-combobox");
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "par");
  await expect.poll(() => requests.length).toBe(1);
  requests[0]!.answer([{ value: "75056", label: "Paris" }]);
  await expect.poll(() => shown()).toEqual(["Paris"]);
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await field.updateComplete;
  expect(field.value).toBe("75056");
  expect(input.value).toBe("Paris");
});

it("aborts the request when the user leaves the field", async () => {
  const { requests, loadOptions } = server();
  const { field, input } = await mount<Combobox>("u-combobox");
  field.loadOptions = loadOptions;
  await userEvent.fill(input, "par");
  await expect.poll(() => requests.length).toBe(1);
  await userEvent.tab();
  await field.updateComplete;
  expect(requests[0]!.signal.aborted).toBe(true);
  expect(field.loading).toBe(false);
  expect(input.value).toBe("");
});
