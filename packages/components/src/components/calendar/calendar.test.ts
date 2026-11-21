// A calendar: the grid of the ARIA date picker, the keys, the bounds, the
// language of the page. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Calendar } from "./calendar.js";

async function mount(attributes: string, lang = "en-GB") {
  document.body.innerHTML = `<div lang="${lang}"><u-calendar ${attributes}></u-calendar></div>`;
  const calendar = document.querySelector<Calendar>("u-calendar")!;
  await calendar.updateComplete;
  const changes: string[] = [];
  calendar.addEventListener("change", () => changes.push(calendar.value));
  const focusedDate = () =>
    (calendar.shadowRoot!.activeElement as HTMLElement | null)?.dataset.date;
  return { calendar, changes, focusedDate };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("shows the month of its value, in the language of the page, weeks from Monday", async () => {
  const { calendar } = await mount('value="2026-11-21"');
  const root = calendar.shadowRoot!;
  expect(root.querySelector('[part~="heading"]')!.textContent).toBe("November 2026");
  expect(root.querySelector("th")!.getAttribute("abbr")).toBe("Monday");
  const chosen = root.querySelector<HTMLElement>('[aria-selected="true"]')!;
  expect(chosen.dataset.date).toBe("2026-11-21");
  await expect.element(chosen).toHaveAccessibleName("Saturday, 21 November 2026");
  await expect.element(root.querySelector<HTMLElement>('[part~="grid"]')!).toHaveRole("grid");
});

it("moves the focus with the keys of the date picker, and picks with Enter", async () => {
  const { calendar, changes, focusedDate } = await mount('value="2026-11-30"');
  calendar.focus();
  expect(focusedDate()).toBe("2026-11-30");
  await userEvent.keyboard("{ArrowRight}");
  expect(focusedDate()).toBe("2026-12-01");
  expect(calendar.shadowRoot!.querySelector('[part~="heading"]')!.textContent).toBe(
    "December 2026",
  );
  await userEvent.keyboard("{ArrowUp}{Home}");
  expect(focusedDate()).toBe("2026-11-23");
  await userEvent.keyboard("{PageDown}{Enter}");
  expect(calendar.value).toBe("2026-12-23");
  expect(changes).toEqual(["2026-12-23"]);
});

it("keeps the focus within min and max, and picks no day outside them", async () => {
  const { calendar, changes, focusedDate } = await mount(
    'value="2026-11-20" min="2026-11-10" max="2026-11-25"',
  );
  calendar.focus();
  await userEvent.keyboard("{PageDown}");
  expect(focusedDate()).toBe("2026-11-25");
  const root = calendar.shadowRoot!;
  expect(root.querySelector<HTMLButtonElement>('[part~="next"]')!.disabled).toBe(true);
  const outside = root.querySelector<HTMLElement>('[data-date="2026-11-26"]')!;
  expect(outside.getAttribute("aria-disabled")).toBe("true");
  // Playwright refuses to click an aria-disabled element: a click of the page.
  outside.click();
  expect(changes).toEqual([]);
});

it("starts the weeks on Sunday in American English, and moves to the next month", async () => {
  const { calendar } = await mount('value="2026-11-21"', "en-US");
  const root = calendar.shadowRoot!;
  expect(root.querySelector("th")!.getAttribute("abbr")).toBe("Sunday");
  await userEvent.click(root.querySelector('[part~="next"]')!);
  expect(root.querySelector('[part~="heading"]')!.textContent).toBe("December 2026");
});

it("takes the language of the page through the shadow roots", async () => {
  document.body.innerHTML = `<div lang="fr"><section id="host"></section></div>`;
  const host = document.querySelector("#host")!;
  host.attachShadow({ mode: "open" }).innerHTML = `<u-calendar value="2026-11-21"></u-calendar>`;
  const calendar = host.shadowRoot!.querySelector<Calendar>("u-calendar")!;
  await calendar.updateComplete;
  expect(calendar.shadowRoot!.querySelector('[part~="heading"]')!.textContent).toBe(
    "novembre 2026",
  );
});
