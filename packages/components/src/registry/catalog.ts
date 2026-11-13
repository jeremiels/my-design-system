import { Alert } from "../components/alert/alert.js";
import { ButtonLink } from "../components/button/button-link.js";
import { Button } from "../components/button/button.js";
import { Icon } from "../components/icon/icon.js";
import { Modal } from "../components/modal/modal.js";

/**
 * Every component of the library, for `defineComponents()`. A brand design
 * system usually registers all of them, plus its own:
 * `defineComponents({ prefix: "acme", components: [...allComponents, AcmeCard] })`.
 */
export const allComponents = [Button, ButtonLink, Alert, Modal, Icon] as const;
