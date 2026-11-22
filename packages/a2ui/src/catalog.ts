/**
 * The A2UI catalog of a design system, in the browser (ADR 0052): the
 * catalog document its build generated, with an adapter for each component.
 * The application gives it to the A2UI renderer's `MessageProcessor`.
 */
import { Catalog, type ComponentApi } from "@a2ui/web_core";
import type { WebComponentImplementation } from "@a2ui/web_core/universal";
import type { DesignSystem, DSBaseElement } from "@unicorne/components";
import { componentAdapter, stackAdapter, textAdapter } from "./adapters.ts";
import type { A2uiCatalogDocument } from "./document.ts";
import {
  isComponentMapping,
  mergeMappings,
  socleMappings,
  type A2uiMappingLayer,
} from "./mappings.ts";

type ComponentClass = typeof DSBaseElement;

/** The options of `a2uiCatalog()`. */
export interface A2uiCatalogOptions {
  /** The design system whose components render the catalog: they are registered with its overrides. */
  readonly designSystem: DesignSystem;
  /** The catalog document its build generated: `a2ui-catalog.json`. */
  readonly document: A2uiCatalogDocument | Readonly<Record<string, unknown>>;
  /**
   * The classes of the components the mappings render, by component name:
   * the base's, `{ "text-field": TextField, … }`, with those of the design
   * system over them, `{ card: AcmeCard }`.
   */
  readonly components: Readonly<Record<string, ComponentClass>>;
  /** The mappings it added to the base's, or replaced: the same as for the document. */
  readonly mappings?: A2uiMappingLayer;
  /** The class of a text style: `heading-lg` → `acme-text-heading-lg` by default. */
  readonly textClass?: (style: string) => string;
}

/** `TextField` → `text-field`. */
const kebab = (name: string) => name.replace(/(?<=[a-z0-9])([A-Z])/g, "-$1").toLowerCase();

/**
 * The A2UI catalog of a design system, for the renderer (ADR 0052). It
 * registers the components the document names, with the design system's
 * overrides, then gives each A2UI component an adapter:
 * `<prefix>-a2ui-<name>`, defined by the renderer when it mounts a surface.
 *
 * @throws When the document names an A2UI component without a mapping, or a
 * component without a class.
 *
 * @example
 * import { acme } from "@acme/design-system";
 * import { a2uiCatalog, socleComponents } from "@unicorne/a2ui";
 * import document from "@acme/design-system/a2ui-catalog.json";
 *
 * const catalog = await a2uiCatalog({ designSystem: acme, document, components: socleComponents });
 * const processor = new MessageProcessor([catalog], sendToAgent);
 */
export async function a2uiCatalog(options: A2uiCatalogOptions): Promise<Catalog<ComponentApi>> {
  const { designSystem, components } = options;
  const mappings = mergeMappings(socleMappings, options.mappings);
  const loaded = Catalog.fromJson(options.document as Record<string, unknown>);
  const apis = [...loaded.components.values()];

  const classOf = (component: string) => {
    const found = components[component];
    if (!found) {
      throw new Error(`A2UI catalog ${loaded.id}: no class for the component "${component}".`);
    }
    return found;
  };
  const classes = new Set<ComponentClass>();
  for (const api of apis) {
    const mapping = mappings[api.name];
    if (!mapping) {
      throw new Error(`A2UI catalog ${loaded.id}: no mapping for the component "${api.name}".`);
    }
    if (isComponentMapping(mapping)) {
      classes.add(classOf(mapping.component));
      if (mapping.options && "component" in mapping.options) {
        classes.add(classOf(mapping.options.component));
      }
    }
  }
  const tags = await designSystem.define(...classes);
  const textClass = options.textClass ?? ((style) => `${designSystem.prefix}-text-${style}`);
  const definitions = (options.document as A2uiCatalogDocument).components ?? {};

  const implementations = apis.map((api): WebComponentImplementation => {
    const mapping = mappings[api.name]!;
    const tagName = `${designSystem.prefix}-a2ui-${kebab(api.name)}`;
    let element: CustomElementConstructor;
    if (isComponentMapping(mapping)) {
      // The A2UI properties of its attributes: the others are rendered, bound, or sent.
      const handled = new Set([
        "component",
        "action",
        "options",
        "child",
        "children",
        mapping.text,
        mapping.value?.property,
      ]);
      const schema = definitions[api.name] as { properties?: Record<string, unknown> } | undefined;
      const properties = Object.keys(schema?.properties ?? {}).filter((key) => !handled.has(key));
      element = componentAdapter(
        api,
        mapping,
        {
          component: tags[mapping.component]!,
          option:
            mapping.options && "component" in mapping.options
              ? tags[mapping.options.component]
              : undefined,
        },
        properties,
      );
    } else if (mapping.kind === "text") {
      element = textAdapter(api, textClass);
    } else {
      element = stackAdapter(api, mapping.kind);
    }
    return {
      name: api.name,
      schema: api.schema,
      ...(api.allowedParents ? { allowedParents: api.allowedParents } : {}),
      ...(api.allowedChildren ? { allowedChildren: api.allowedChildren } : {}),
      tagName,
      // A second catalog of the same design system reuses the adapters: a tag
      // is defined once.
      element: customElements.get(tagName) ?? element,
    };
  });
  // The document of a design system declares no function: the renderer runs
  // none of its own, so the catalog is one `MessageProcessor` takes.
  return loaded.withEntries(implementations, []) as unknown as Catalog<ComponentApi>;
}
