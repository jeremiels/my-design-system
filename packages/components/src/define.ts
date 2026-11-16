/**
 * Registers the whole catalog under the library's default `u-` prefix:
 * for Storybook, the demo, and apps using the library without a brand.
 * Importing this module is the side effect: `sideEffects` in package.json
 * lists it and its build, or a production build (Storybook's) drops the
 * import. A brand design system calls
 * `defineComponents()` with its own prefix instead (ADR 0001, D1).
 */
import type { Alert } from "./components/alert/alert.js";
import type { Autocomplete } from "./components/autocomplete/autocomplete.js";
import type { ButtonLink } from "./components/button/button-link.js";
import type { Button } from "./components/button/button.js";
import type { Icon } from "./components/icon/icon.js";
import type { Modal } from "./components/modal/modal.js";
import type { TextField } from "./components/text-field/text-field.js";
import type { Textarea } from "./components/textarea/textarea.js";
import { allComponents } from "./registry/catalog.js";
import { defineComponents } from "./registry/define-components.js";

defineComponents({ prefix: "u", components: allComponents });

declare global {
  interface HTMLElementTagNameMap {
    "u-alert": Alert;
    "u-autocomplete": Autocomplete;
    "u-button": Button;
    "u-button-link": ButtonLink;
    "u-icon": Icon;
    "u-modal": Modal;
    "u-text-field": TextField;
    "u-textarea": Textarea;
  }
}
