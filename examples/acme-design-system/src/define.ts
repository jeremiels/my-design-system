/**
 * Registers ACME's catalog: every base component under the `acme-` prefix,
 * with ACME's button and icons everywhere a button or an icon is rendered,
 * plus ACME's own components. Apps import "@acme/design-system/define" once.
 */
import { allComponents, defineComponents } from "@unicorne/components";
import type { Alert, ButtonLink, Modal } from "@unicorne/components";
import { AcmeButton } from "./components/acme-button/acme-button.js";
import { AcmeCard } from "./components/acme-card/acme-card.js";
import { AcmeIcon } from "./components/acme-icon/acme-icon.js";

defineComponents({
  prefix: "acme",
  components: [...allComponents, AcmeCard],
  overrides: { button: AcmeButton, icon: AcmeIcon },
});

declare global {
  interface HTMLElementTagNameMap {
    "acme-alert": Alert;
    "acme-button": AcmeButton;
    "acme-button-link": ButtonLink;
    "acme-card": AcmeCard;
    "acme-icon": AcmeIcon;
    "acme-modal": Modal;
  }
}
