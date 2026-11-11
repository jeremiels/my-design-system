/**
 * Registers the whole catalog under the library's default `my-` prefix:
 * for Storybook, the demo, and apps using the library without a brand.
 * Importing this module is the side effect. A brand design system calls
 * `defineComponents()` with its own prefix instead (ADR 0001, D1).
 */
import type { Alert } from "./components/alert/alert.js";
import type { ButtonLink } from "./components/button/button-link.js";
import type { Button } from "./components/button/button.js";
import type { Modal } from "./components/modal/modal.js";
import { allComponents } from "./registry/catalog.js";
import { defineComponents } from "./registry/define-components.js";

defineComponents({ prefix: "my", components: allComponents });

declare global {
  interface HTMLElementTagNameMap {
    "my-alert": Alert;
    "my-button": Button;
    "my-button-link": ButtonLink;
    "my-modal": Modal;
  }
}
