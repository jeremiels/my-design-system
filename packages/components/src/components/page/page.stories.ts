import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Page } from "./page";

const meta = preview.meta({
  title: "Components/Page",
  component: "u-page",
  subcomponents: { Header: "u-header", Footer: "u-footer", Notice: "u-notice" },
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The layout of a page: a notice, its header, its navigation beside its content, and its footer, with their landmarks (ADR 0034). A skip link comes first: hidden until it has the focus, it moves the focus to the content. Narrower than the navigation plus the content's minimum, the navigation goes above the content.",
      },
    },
  },
});

export const Default = meta.story({
  render: () => html`
    <u-page>
      <u-notice slot="banner" variant="warning"
        >Warning: the requests of November close on the 30th.</u-notice
      >
      <u-header slot="header" service-name="Requests" tagline="The requests of the city" href="#">
        <u-link slot="actions" href="#help">Help</u-link>
        <u-button slot="actions" variant="neutral" appearance="outlined">Sign in</u-button>
      </u-header>
      <u-side-nav slot="navigation" label="Requests">
        <u-side-nav-item label="Dashboard" href="#dashboard"></u-side-nav-item>
        <u-side-nav-item label="Requests">
          <u-side-nav-item label="Received" href="#received" current></u-side-nav-item>
          <u-side-nav-item label="Closed" href="#closed"></u-side-nav-item>
        </u-side-nav-item>
      </u-side-nav>
      <h1>Received requests</h1>
      <p>Twelve requests wait for an answer.</p>
      <u-button>Review the first one</u-button>
      <u-footer slot="footer">
        The requests service of the city.
        <ul slot="links">
          <li><u-link href="#accessibility">Accessibility: partially compliant</u-link></li>
          <li><u-link href="#legal">Legal notice</u-link></li>
          <li><u-link href="#data">Personal data</u-link></li>
        </ul>
      </u-footer>
    </u-page>
  `,
  play: async ({ canvasElement }) => {
    const page = canvasElement.querySelector<Page>("u-page")!;
    await page.updateComplete;
    // The landmarks: banner, navigation, main, contentinfo.
    expect(canvasElement.querySelector("u-header")!.getAttribute("role")).toBe("banner");
    expect(canvasElement.querySelector("u-footer")!.getAttribute("role")).toBe("contentinfo");
    const main = page.shadowRoot!.querySelector("main")!;
    // The skip link comes first, hidden until it has the focus.
    const skip = page.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="skip-link"]')!;
    expect(page.shadowRoot!.firstElementChild!.contains(skip)).toBe(true);
    expect(skip.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    skip.focus();
    expect(skip.getBoundingClientRect().width).toBeGreaterThan(1);
    // It moves the focus to the content; page.test.ts presses Tab after it.
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(page.shadowRoot!.activeElement).toBe(main));
  },
});

export const Narrow = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "On a narrow page, the navigation goes above the content: the layout wraps, without a media query.",
      },
    },
  },
  render: () => html`
    <div style="inline-size: 22rem; border: 1px dashed">
      <u-page>
        <u-header slot="header" service-name="Requests" href="#"></u-header>
        <u-side-nav slot="navigation" label="Requests">
          <u-side-nav-item label="Received" href="#received" current></u-side-nav-item>
          <u-side-nav-item label="Closed" href="#closed"></u-side-nav-item>
        </u-side-nav>
        <h1>Received requests</h1>
      </u-page>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const page = canvasElement.querySelector<Page>("u-page")!;
    await page.updateComplete;
    const nav = canvasElement.querySelector("u-side-nav")!.getBoundingClientRect();
    const main = page.shadowRoot!.querySelector("main")!.getBoundingClientRect();
    expect(main.top).toBeGreaterThanOrEqual(nav.bottom);
    // Right under it: the gap of the page, not the rest of its height.
    expect(main.top - nav.bottom).toBeLessThan(64);
  },
});
