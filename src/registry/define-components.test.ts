import { nothing } from "lit";
import { html } from "lit/static-html.js";
import { afterEach, describe, expect, it } from "vitest";
import { DSBaseElement } from "../components/base-element.js";
import { Alert } from "../components/alert/alert.js";
import { Button } from "../components/button/button.js";
import { Modal } from "../components/modal/modal.js";
import { allComponents } from "./catalog.js";
import { defineComponents } from "./define-components.js";

// The custom element registry is global to the page: every test registers
// under its own prefix.
let count = 0;
const uniquePrefix = () => `t${++count}x`;

async function render<T extends Element>(tag: string): Promise<T> {
  const element = document.createElement(tag);
  document.body.append(element);
  await (element as unknown as DSBaseElement).updateComplete;
  return element as unknown as T;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("defineComponents", () => {
  it("registers each component as <prefix>-<componentName> and returns the tags", () => {
    const prefix = uniquePrefix();
    const tags = defineComponents({ prefix, components: allComponents });

    expect(tags).toEqual({
      button: `${prefix}-button`,
      "button-link": `${prefix}-button-link`,
      alert: `${prefix}-alert`,
      modal: `${prefix}-modal`,
    });
    expect(customElements.get(`${prefix}-button`)?.prototype).toBeInstanceOf(Button);
    expect(customElements.get(`${prefix}-modal`)?.prototype).toBeInstanceOf(Modal);
  });

  it("registers the dependencies of the listed components", async () => {
    const prefix = uniquePrefix();
    const tags = defineComponents({ prefix, components: [Modal] });

    expect(Object.keys(tags).sort()).toEqual(["button", "modal"]);
    const modal = await render<Modal>(`${prefix}-modal`);
    expect(modal.shadowRoot!.querySelector(`${prefix}-button`)).toBeInstanceOf(Button);
  });

  it("lets two prefixes coexist, each modal rendering its own button", async () => {
    const first = uniquePrefix();
    const second = uniquePrefix();
    defineComponents({ prefix: first, components: [Modal] });
    defineComponents({ prefix: second, components: [Modal] });

    const firstModal = await render<Modal>(`${first}-modal`);
    const secondModal = await render<Modal>(`${second}-modal`);
    expect(firstModal.shadowRoot!.querySelector(`${first}-button`)).not.toBeNull();
    expect(secondModal.shadowRoot!.querySelector(`${second}-button`)).not.toBeNull();
  });

  it("uses an override everywhere in its registration", async () => {
    class BrandButton extends Button {}
    const prefix = uniquePrefix();
    defineComponents({ prefix, components: allComponents, overrides: { button: BrandButton } });

    expect(customElements.get(`${prefix}-button`)?.prototype).toBeInstanceOf(BrandButton);
    const modal = await render<Modal>(`${prefix}-modal`);
    expect(modal.shadowRoot!.querySelector(`${prefix}-button`)).toBeInstanceOf(BrandButton);
  });

  it("registers a brand component and the catalog components it renders", async () => {
    class Card extends DSBaseElement {
      static override componentName = "card";
      static override dependencies = [Button];
      render() {
        const button = this.tagFor(Button);
        return html`<${button}>Action</${button}>`;
      }
    }
    const prefix = uniquePrefix();
    defineComponents({ prefix, components: [Card] });

    const card = await render<Card>(`${prefix}-card`);
    expect(card.shadowRoot!.querySelector(`${prefix}-button`)).toBeInstanceOf(Button);
  });

  it("rejects an override that doesn't extend the class it replaces", () => {
    class NotAButton extends DSBaseElement {
      static override componentName = "button";
    }
    expect(() =>
      defineComponents({
        prefix: uniquePrefix(),
        components: [Button],
        overrides: { button: NotAButton },
      }),
    ).toThrow("overrides.button (NotAButton) must extend Button.");
  });

  it("rejects overrides for components it doesn't register", () => {
    class BrandModal extends Modal {}
    expect(() =>
      defineComponents({
        prefix: uniquePrefix(),
        components: [Alert],
        overrides: { modal: BrandModal },
      }),
    ).toThrow("overrides for unregistered components: modal");
  });

  it("rejects two unrelated classes for the same component name", () => {
    class OtherButton extends Button {}
    expect(() =>
      defineComponents({ prefix: uniquePrefix(), components: [Button, OtherButton] }),
    ).toThrow(`"button" is already Button, which doesn't extend OtherButton`);
  });

  it("rejects classes without a componentName", () => {
    class Unnamed extends DSBaseElement {}
    expect(() => defineComponents({ prefix: uniquePrefix(), components: [Unnamed] })).toThrow(
      "Unnamed can't be registered",
    );
  });

  it.each(["", "Acme", "my-ds", "1x"])("rejects the invalid prefix %j", (prefix) => {
    expect(() => defineComponents({ prefix, components: [Alert] })).toThrow("Invalid prefix");
  });

  it("registers nothing when one of its tags is already taken", () => {
    const prefix = uniquePrefix();
    customElements.define(`${prefix}-alert`, class extends HTMLElement {});

    expect(() => defineComponents({ prefix, components: allComponents })).toThrow(
      `Already defined: <${prefix}-alert>`,
    );
    expect(customElements.get(`${prefix}-button`)).toBeUndefined();
  });
});

describe("tagFor", () => {
  class Probe extends DSBaseElement {
    static override componentName = "probe";
    static override dependencies = [Button];
    resolve(component: typeof DSBaseElement) {
      return this.tagFor(component);
    }
    render() {
      return nothing;
    }
  }

  it("refuses a component missing from static dependencies", async () => {
    const prefix = uniquePrefix();
    defineComponents({ prefix, components: [Probe, Alert] });
    const probe = await render<Probe>(`${prefix}-probe`);

    expect(() => probe.resolve(Alert)).toThrow("which is missing from its static dependencies");
  });

  it("refuses to resolve tags outside defineComponents()", async () => {
    const tag = `${uniquePrefix()}-probe`;
    customElements.define(tag, class extends Probe {});
    const probe = await render<Probe>(tag);

    expect(() => probe.resolve(Button)).toThrow("register components with defineComponents()");
  });
});
