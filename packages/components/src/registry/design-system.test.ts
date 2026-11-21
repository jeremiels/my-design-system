import { html } from "lit/static-html.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Alert } from "../components/alert/alert.js";
import { DSBaseElement } from "../bases/base-element.js";
import { ButtonLink } from "../components/button-link/button-link.js";
import { Button } from "../components/button/button.js";
import { Icon } from "../components/icon/icon.js";
import { Modal } from "../components/modal/modal.js";
import { designSystem } from "./design-system.js";

// The custom element registry is global to the page: every test uses its
// own prefix.
let count = 0;
const uniquePrefix = () => `ds${++count}x`;

const BRAND_SVG = '<svg id="brand" viewBox="0 0 24 24"></svg>';

async function render<T extends Element>(tag: string): Promise<T> {
  const element = document.createElement(tag);
  document.body.append(element);
  await (element as unknown as DSBaseElement).updateComplete;
  return element as unknown as T;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("designSystem", () => {
  it("registers nothing until define()", () => {
    const prefix = uniquePrefix();
    designSystem({ prefix });
    expect(customElements.get(`${prefix}-button`)).toBeUndefined();
  });

  it("registers the requested components and those they render", async () => {
    const prefix = uniquePrefix();
    const tags = await designSystem({ prefix }).define(Alert);

    expect(tags).toEqual({ alert: `${prefix}-alert`, icon: `${prefix}-icon` });
    expect(customElements.get(`${prefix}-button`)).toBeUndefined();
  });

  it("loads only the overrides of the components it registers", async () => {
    class BrandButton extends Button {}
    const loadButton = vi.fn(async () => BrandButton);
    const prefix = uniquePrefix();
    const brand = designSystem({ prefix, overrides: { button: loadButton } });

    await brand.define(Alert);
    expect(loadButton).not.toHaveBeenCalled();

    await brand.define(Modal);
    expect(loadButton).toHaveBeenCalledOnce();
    const modal = await render<Modal>(`${prefix}-modal`);
    expect(modal.shadowRoot!.querySelector(`${prefix}-button`)).toBeInstanceOf(BrandButton);
  });

  it("takes an override given as a class", async () => {
    class BrandButton extends Button {}
    const prefix = uniquePrefix();
    await designSystem({ prefix, overrides: { button: BrandButton } }).define(Button);
    expect(customElements.get(`${prefix}-button`)?.prototype).toBeInstanceOf(BrandButton);
  });

  it("renders its icons in every component, over the base's", async () => {
    const prefix = uniquePrefix();
    await designSystem({ prefix, icons: { information: BRAND_SVG } }).define(Alert);

    const icons = (customElements.get(`${prefix}-icon`) as unknown as typeof Icon).icons;
    expect(icons.information).toBe(BRAND_SVG);
    expect(icons.success).toBe(Icon.icons.success);
    const alert = await render<Alert>(`${prefix}-alert`);
    const icon = alert.shadowRoot!.querySelector<Icon>(`${prefix}-icon`)!;
    await icon.updateComplete;
    expect(icon.shadowRoot!.querySelector("svg")?.id).toBe("brand");
  });

  it("adds its icons to an override of the icon component", async () => {
    class BrandIcon extends Icon {
      static override icons = { ...Icon.icons, star: BRAND_SVG };
    }
    const prefix = uniquePrefix();
    await designSystem({
      prefix,
      overrides: { icon: async () => BrandIcon },
      icons: { information: BRAND_SVG },
    }).define(Icon);

    const registered = customElements.get(`${prefix}-icon`) as unknown as typeof Icon;
    expect(registered.prototype).toBeInstanceOf(BrandIcon);
    expect(registered.icons).toMatchObject({ star: BRAND_SVG, information: BRAND_SVG });
  });

  it("registers the class each component gives for its settings, by no name (A3)", async () => {
    const received: unknown[] = [];
    class Badge extends DSBaseElement {
      static override componentName = "badge";
      static override forDesignSystem<T extends typeof DSBaseElement>(
        this: T,
        settings: Parameters<typeof DSBaseElement.forDesignSystem>[0],
      ): T {
        received.push(settings);
        return class extends (this as typeof DSBaseElement) {} as unknown as T;
      }
    }
    const prefix = uniquePrefix();
    const brand = designSystem({ prefix, icons: { star: BRAND_SVG } });
    await brand.define(Badge);
    await brand.withPrefix(`${prefix}y`).define(Badge);

    // Called once: both prefixes register the same class.
    expect(received).toEqual([{ icons: { star: BRAND_SVG } }]);
    const registered = customElements.get(`${prefix}-badge`)!;
    expect(registered.prototype).toBeInstanceOf(Badge);
    expect(Object.getPrototypeOf(customElements.get(`${prefix}y-badge`))).toBe(
      Object.getPrototypeOf(registered),
    );
  });

  it("registers a component as is when it takes no setting", async () => {
    const prefix = uniquePrefix();
    await designSystem({ prefix }).define(Icon);
    const registered = customElements.get(`${prefix}-icon`) as unknown as typeof Icon;
    expect(registered.icons).toBe(Icon.icons);
    expect(Object.getPrototypeOf(registered)).toBe(Icon);
  });

  it("refuses a component outside its catalog", async () => {
    const brand = designSystem({ prefix: uniquePrefix(), catalog: ["button", "alert"] });
    await expect(brand.define(ButtonLink)).rejects.toThrow(
      `"button-link" isn't in the catalog of ${brand.prefix}: button, alert.`,
    );
  });

  it("registers the components a cataloged component renders, listed or not", async () => {
    class Card extends DSBaseElement {
      static override componentName = "card";
      static override dependencies = [Button];
      render() {
        const button = this.tagFor(Button);
        return html`<${button}>Action</${button}>`;
      }
    }
    const prefix = uniquePrefix();
    const tags = await designSystem({ prefix, catalog: ["card"] }).define(Card);

    expect(Object.keys(tags).sort()).toEqual(["button", "card"]);
    const card = await render<Card>(`${prefix}-card`);
    expect(card.shadowRoot!.querySelector(`${prefix}-button`)).toBeInstanceOf(Button);
  });

  it("refuses an override class registered under another name", () => {
    expect(() => designSystem({ prefix: uniquePrefix(), overrides: { buton: Button } })).toThrow(
      "overrides.buton of",
    );
  });

  it("refuses a loader that doesn't give a component class", async () => {
    const brand = designSystem({
      prefix: uniquePrefix(),
      // A module instead of its class.
      overrides: { button: async () => ({ Button }) as never },
    });
    await expect(brand.define(Button)).rejects.toThrow("must be, or load, a component class");
  });

  it("refuses an override that doesn't extend the class it replaces", async () => {
    class NotAButton extends DSBaseElement {
      static override componentName = "button";
    }
    const brand = designSystem({ prefix: uniquePrefix(), overrides: { button: NotAButton } });
    await expect(brand.define(Button)).rejects.toThrow("must extend Button");
  });

  it("retries a failed load on the next define()", async () => {
    class BrandButton extends Button {}
    const loadButton = vi
      .fn<() => Promise<typeof Button>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(BrandButton);
    const prefix = uniquePrefix();
    const brand = designSystem({ prefix, overrides: { button: loadButton } });

    await expect(brand.define(Button)).rejects.toThrow("offline");
    await brand.define(Button);
    expect(customElements.get(`${prefix}-button`)?.prototype).toBeInstanceOf(BrandButton);
  });

  it("registers with the same classes on every call, concurrent or not", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    class BrandButton extends Button {}
    const loadButton = vi.fn(async () => BrandButton);
    const prefix = uniquePrefix();
    const brand = designSystem({
      prefix,
      overrides: { button: loadButton },
      icons: { information: BRAND_SVG },
    });

    await Promise.all([brand.define(Modal), brand.define(Button, Alert)]);
    await brand.define(Alert, Modal);

    expect(loadButton).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it("refuses an empty define() and an invalid prefix", async () => {
    await expect(designSystem({ prefix: uniquePrefix() }).define()).rejects.toThrow(
      "define() needs the components to register",
    );
    expect(() => designSystem({ prefix: "My-DS" })).toThrow("Invalid prefix");
  });

  it("registers under another prefix, with the same overrides, icons and labels (ADR 0012)", async () => {
    class BrandButton extends Button {}
    const first = uniquePrefix();
    const second = uniquePrefix();
    const brand = designSystem({
      prefix: first,
      overrides: { button: BrandButton },
      icons: { close: BRAND_SVG },
      labels: { closeLabel: "Fermer" },
    });

    await brand.define(Modal);
    const isolated = brand.withPrefix(second);
    const tags = await isolated.define(Modal);

    expect(isolated.prefix).toBe(second);
    expect(tags).toMatchObject({ modal: `${second}-modal`, button: `${second}-button` });
    for (const prefix of [first, second]) {
      const modal = await render<Modal>(`${prefix}-modal`);
      const button = modal.shadowRoot!.querySelector(`${prefix}-button`)!;
      expect(button).toBeInstanceOf(BrandButton);
      expect(modal.closeLabel).toBe("Fermer");
      const icon = button.querySelector<Icon>(`${prefix}-icon`)!;
      await icon.updateComplete;
      expect(icon.shadowRoot!.querySelector("svg#brand")).not.toBeNull();
    }
  });

  it("gives its labels as defaults: an attribute or a property of the element wins", async () => {
    const prefix = uniquePrefix();
    await designSystem({ prefix, labels: { closeLabel: "Fermer", unknownLabel: "x" } }).define(
      Modal,
      Alert,
    );

    expect((await render<Modal>(`${prefix}-modal`)).closeLabel).toBe("Fermer");

    document.body.innerHTML = `<${prefix}-modal close-label="Quitter"></${prefix}-modal>`;
    expect(document.querySelector<Modal>(`${prefix}-modal`)!.closeLabel).toBe("Quitter");

    const set = document.createElement(`${prefix}-modal`) as Modal;
    set.closeLabel = "Annuler";
    document.body.append(set);
    await set.updateComplete;
    expect(set.closeLabel).toBe("Annuler");

    // A component without the property ignores the label.
    const alert = await render<Alert>(`${prefix}-alert`);
    expect("closeLabel" in alert).toBe(false);
    expect("unknownLabel" in alert).toBe(false);
  });

  it("tells its tags from the others, for Vue's isCustomElement", () => {
    const brand = designSystem({ prefix: "acme", version: "2.1.0" });
    expect(brand.version).toBe("2.1.0");
    expect(brand.isCustomElement("acme-button")).toBe(true);
    expect(brand.isCustomElement("acmebutton")).toBe(false);
    expect(brand.isCustomElement("u-button")).toBe(false);
    expect(brand.withPrefix("acme2").isCustomElement("acme2-button")).toBe(true);
  });
});
