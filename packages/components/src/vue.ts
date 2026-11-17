/**
 * Types for Vue, in an entry of their own (ADR 0014, D1): they tell
 * `vue-tsc` the properties and the events of each tag in a template. Types
 * only: nothing here runs, and an application without Vue never loads them.
 *
 * @example
 * // @acme/design-system/vue
 * import type { VueElements } from "@unicorne/components/vue";
 * declare module "vue" {
 *   interface GlobalComponents extends VueElements<"acme", AcmeCatalog> {}
 * }
 */
import type { LitElement } from "lit";
import type { EmitFn, HTMLAttributes, PublicProps } from "vue";
import type { CatalogEntry } from "./registry/catalog.js";

/**
 * A custom element as Vue's templates see it: its properties as props, its
 * own events as emits. The helper of Vue's guide for custom elements.
 */
export type VueElement<
  Element extends HTMLElement,
  Events extends Record<string, Event>,
> = new () => Element & {
  /** @deprecated For the types of templates only: not a property of the element. */
  $props: HTMLAttributes & Partial<Omit<Element, keyof LitElement>> & PublicProps;
  /** @deprecated For the types of templates only: not a method of the element. */
  $emit: EmitFn<{ [Name in keyof Events]: (event: Events[Name]) => void }>;
};

/** The tags of a catalog under a prefix, for Vue's `GlobalComponents`. */
export type VueElements<Prefix extends string, C extends { [Name in keyof C]: CatalogEntry }> = {
  [Name in keyof C & string as `${Prefix}-${Name}`]: VueElement<
    C[Name]["element"],
    C[Name]["events"]
  >;
};
