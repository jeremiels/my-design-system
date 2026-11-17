import { Alert } from "../components/alert/alert.js";
import { Autocomplete } from "../components/autocomplete/autocomplete.js";
import { ButtonLink } from "../components/button/button-link.js";
import { Button } from "../components/button/button.js";
import { Icon } from "../components/icon/icon.js";
import { Modal } from "../components/modal/modal.js";
import { TextField } from "../components/text-field/text-field.js";
import { Textarea } from "../components/textarea/textarea.js";
import type { ListboxSelectEvent } from "../events/listbox-select.js";
import type { ModalCancelEvent } from "../events/modal-cancel.js";
import type { ModalCloseEvent } from "../events/modal-close.js";

/**
 * Every component of the library, for `defineComponents()`. A brand design
 * system usually registers all of them, plus its own:
 * `defineComponents({ prefix: "acme", components: [...allComponents, AcmeCard] })`.
 */
export const allComponents = [
  Button,
  ButtonLink,
  Alert,
  Modal,
  Icon,
  TextField,
  Textarea,
  Autocomplete,
] as const;

/** A component of a catalog, as types: its element, and its own events by name. */
export interface CatalogEntry {
  element: HTMLElement;
  events: Record<string, Event>;
}

/**
 * The base's catalog, as types: component name → its element and its own
 * events. `TagNameMap` and the types of `@unicorne/components/vue` derive the
 * tags of any prefix from it. A design system extends it with its own
 * components, and replaces the entries of those it overrides:
 * `interface AcmeCatalog extends Omit<Catalog, "button"> { button: …; card: … }`.
 */
export interface Catalog {
  alert: { element: Alert; events: {} };
  autocomplete: { element: Autocomplete; events: { "u-select": ListboxSelectEvent } };
  button: { element: Button; events: {} };
  "button-link": { element: ButtonLink; events: {} };
  icon: { element: Icon; events: {} };
  modal: { element: Modal; events: { "u-cancel": ModalCancelEvent; "u-close": ModalCloseEvent } };
  "text-field": { element: TextField; events: {} };
  textarea: { element: Textarea; events: {} };
}

/**
 * The tags of a catalog under a prefix, for `HTMLElementTagNameMap`:
 * `TagNameMap<"acme", AcmeCatalog>` types `document.querySelector("acme-button")`.
 *
 * @example
 * declare global {
 *   interface HTMLElementTagNameMap extends TagNameMap<"acme", AcmeCatalog> {}
 * }
 */
export type TagNameMap<Prefix extends string, C extends { [Name in keyof C]: CatalogEntry }> = {
  [Name in keyof C & string as `${Prefix}-${Name}`]: C[Name]["element"];
};
