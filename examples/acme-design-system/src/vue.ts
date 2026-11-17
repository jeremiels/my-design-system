/**
 * Types for the Vue apps of ACME (ADR 0014 of the base): `vue-tsc` checks
 * the properties and the events of every `acme-` tag in a template. An app
 * references this entry once: `/// <reference types="@acme/design-system/vue" />`.
 */
import type { VueElements } from "@unicorne/components/vue";
import type { AcmeCatalog } from "./catalog.js";

declare module "vue" {
  interface GlobalComponents extends VueElements<"acme", AcmeCatalog> {}
}

export {};
