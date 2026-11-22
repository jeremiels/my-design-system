/**
 * The adapters (ADR 0052): A2UI elements that render the components of a
 * design system. The A2UI renderer gives each one the resolved properties of
 * its node; the adapter passes them to the component it renders, writes the
 * user's input back to the data model, and sends the action.
 */
import { nothing, type PropertyValues, type TemplateResult } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import { html, unsafeStatic } from "lit/static-html.js";
import type { ComponentApi } from "@a2ui/web_core";
import { A2uiLitElement, type A2uiChildRef } from "@a2ui/web_core/universal";
import type { ComponentMapping } from "./mappings.ts";

/** The resolved properties of a node, by A2UI name. */
type Props = Record<string, unknown>;

/** An option the agent gives: `{ value, label }`. */
interface Option {
  readonly value: string;
  readonly label: string;
}

/** `setValue` for `value`: the setter the A2UI renderer gives a bound property. */
const setterOf = (property: string) => `set${property[0]!.toUpperCase()}${property.slice(1)}`;

/**
 * The base of the adapters: an A2UI element that renders in the light DOM,
 * so the page's classes (text styles) and its theme reach the component.
 */
abstract class Adapter extends A2uiLitElement {
  protected override createRenderRoot() {
    return this;
  }

  /** The resolved properties of its node; `undefined` before the renderer gives it one. */
  protected get props(): Props | undefined {
    return this.controller?.props as Props | undefined;
  }

  /** Its child nodes. */
  protected renderChildren(children: unknown): unknown {
    return Array.isArray(children)
      ? (children as A2uiChildRef[]).map((child) => this.renderNode(child))
      : nothing;
  }
}

/** The tags an adapter renders: the component's, and its children's (`radio` of `radio-group`). */
export interface AdapterTags {
  readonly component: string;
  readonly option?: string;
}

/**
 * An adapter class for a component of the design system. `properties` are
 * the A2UI properties it passes on as they are: those of the attributes.
 */
export function componentAdapter(
  api: ComponentApi,
  mapping: ComponentMapping,
  tags: AdapterTags,
  properties: readonly string[],
): CustomElementConstructor {
  const tag = unsafeStatic(tags.component);
  const option = tags.option ? unsafeStatic(tags.option) : undefined;
  return class extends Adapter {
    protected override readonly api = api;
    readonly #inner = createRef<HTMLElement & Record<string, unknown>>();
    #listening = false;

    override render(): TemplateResult | typeof nothing {
      const props = this.props;
      if (!props) {
        return nothing;
      }
      const options = (props.options ?? []) as Option[];
      return html`<${tag} ${ref(this.#inner)}
        >${mapping.text ? String(props[mapping.text] ?? "") : nothing}${
          mapping.children
            ? this.renderChildren(
                mapping.children === "child" ? [props.child].filter(Boolean) : props.children,
              )
            : nothing
        }${
          option
            ? repeat(
                options,
                ({ value }) => value,
                ({ value, label }) => html`<${option} .value=${value} .label=${label}></${option}>`,
              )
            : nothing
        }</${tag}
      >`;
    }

    protected override updated(changed: PropertyValues): void {
      super.updated(changed);
      const element = this.#inner.value;
      const props = this.props;
      if (!element || !props) {
        return;
      }
      for (const property of properties) {
        if (props[property] !== undefined) {
          element[property] = props[property];
        }
      }
      if (mapping.options && "property" in mapping.options) {
        element[mapping.options.property] = props.options ?? [];
      }
      if (mapping.value) {
        const { property } = mapping.value;
        const value = props[property] ?? (typeof element[property] === "boolean" ? false : "");
        // Not while it is the same: the field would lose its caret.
        if (element[property] !== value) {
          element[property] = value;
        }
      }
      if (!this.#listening) {
        this.#listening = true;
        if (mapping.value) {
          const { property, event } = mapping.value;
          element.addEventListener(event, () => {
            const set = this.props?.[setterOf(property)];
            if (typeof set === "function") {
              set(element[property]);
            }
          });
        }
        if (mapping.action) {
          element.addEventListener(mapping.action, () => {
            const action = this.props?.action;
            if (typeof action === "function") {
              void action();
            }
          });
        }
      }
    }
  };
}

const ALIGN: Readonly<Record<string, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

/** `Row` or `Column`: a flex container, whose gap is a spacing token. */
export function stackAdapter(api: ComponentApi, kind: "row" | "column"): CustomElementConstructor {
  return class extends Adapter {
    protected override readonly api = api;

    override render(): TemplateResult | typeof nothing {
      const props = this.props;
      if (!props) {
        return nothing;
      }
      const align = String(props.align ?? (kind === "row" ? "end" : "stretch"));
      const style = {
        display: "flex",
        "flex-direction": kind,
        "flex-wrap": kind === "row" ? "wrap" : "nowrap",
        gap: `var(--u-spacing-${String(props.gap ?? "md")})`,
        "align-items": ALIGN[align] ?? "stretch",
      };
      return html`<div style=${styleMap(style)}>${this.renderChildren(props.children)}</div>`;
    }
  };
}

/** `Text`: a paragraph, or a heading of its `level`, with the class of its text style. */
export function textAdapter(
  api: ComponentApi,
  textClass: (style: string) => string,
): CustomElementConstructor {
  return class extends Adapter {
    protected override readonly api = api;

    override render(): TemplateResult | typeof nothing {
      const props = this.props;
      if (!props) {
        return nothing;
      }
      const level = Number(props.level);
      const element = unsafeStatic(level >= 1 && level <= 6 ? `h${level}` : "p");
      const style = typeof props.style === "string" ? props.style : "body-md";
      return html`<${element} class=${textClass(style)} style="margin: 0"
        >${String(props.text ?? "")}</${element}
      >`;
    }
  };
}
