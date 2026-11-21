// A live region in the shadow root: present from the first render, its text
// changes at each announcement, even for the same message.
import { html, LitElement } from "lit";
import { afterEach, expect, it } from "vitest";
import { AnnounceController, announceStyles } from "./announce.js";

class Announcer extends LitElement {
  static styles = [announceStyles];

  announcer = new AnnounceController(this);

  render() {
    return html`<p>Content</p>
      ${this.announcer.render()}`;
  }
}
customElements.define("t-announcer", Announcer);

class Alerter extends LitElement {
  announcer = new AnnounceController(this, { politeness: "assertive" });

  render() {
    return this.announcer.render();
  }
}
customElements.define("t-alerter", Alerter);

async function mount<T extends LitElement>(tag: string) {
  const host = document.createElement(tag) as T;
  document.body.append(host);
  await host.updateComplete;
  return host;
}

afterEach(() => {
  document.body.replaceChildren();
});

it("renders an empty polite region from the first render, hidden from the screen", async () => {
  const host = await mount<Announcer>("t-announcer");
  const region = host.shadowRoot!.querySelector('[role="status"]')!;
  expect(region.textContent).toBe("");
  expect(region.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  expect(getComputedStyle(region).display).not.toBe("none");
});

it("announces a message at the next render, and empties on an empty one", async () => {
  const host = await mount<Announcer>("t-announcer");
  const region = host.shadowRoot!.querySelector('[role="status"]')!;
  host.announcer.announce("3 results");
  await host.updateComplete;
  expect(region.textContent).toBe("3 results");
  expect(host.announcer.message).toBe("3 results");

  host.announcer.announce("");
  await host.updateComplete;
  expect(region.textContent).toBe("");
});

it("changes the text for the same message: it is announced again", async () => {
  const host = await mount<Announcer>("t-announcer");
  const region = host.shadowRoot!.querySelector('[role="status"]')!;
  const texts: string[] = [];
  for (let i = 0; i < 3; i++) {
    host.announcer.announce("Saved");
    await host.updateComplete;
    texts.push(region.textContent!);
  }
  expect(texts[0]).toBe("Saved");
  expect(texts[1]).not.toBe(texts[0]);
  expect(texts[2]).not.toBe(texts[1]);
  expect(texts.map((text) => text.trim())).toEqual(["Saved", "Saved", "Saved"]);
  expect(host.announcer.message).toBe("Saved");
});

it("renders an assertive region as an alert", async () => {
  const host = await mount<Alerter>("t-alerter");
  expect(host.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
});

it("empties out of the document", async () => {
  const host = await mount<Announcer>("t-announcer");
  host.announcer.announce("3 results");
  await host.updateComplete;
  host.remove();
  document.body.append(host);
  await host.updateComplete;
  expect(host.shadowRoot!.querySelector('[role="status"]')!.textContent).toBe("");
});
