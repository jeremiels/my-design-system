/**
 * Registers ACME's whole catalog under the `acme-` prefix. An app that uses
 * everything imports "@acme/design-system/define" once; the others register
 * only what they use with `acme.define()` (src/design-system.ts).
 */
import {
  Alert,
  Autocomplete,
  Button,
  Icon,
  Modal,
  Textarea,
  TextField,
} from "@unicorne/components";
import type { AcmeButton } from "./components/acme-button/acme-button.js";
import { AcmeCard } from "./components/acme-card/acme-card.js";
import { acme } from "./design-system.js";

void acme.define(Button, Alert, Modal, Icon, TextField, Textarea, Autocomplete, AcmeCard);

declare global {
  interface HTMLElementTagNameMap {
    "acme-alert": Alert;
    "acme-autocomplete": Autocomplete;
    "acme-button": AcmeButton;
    "acme-card": AcmeCard;
    "acme-icon": Icon;
    "acme-modal": Modal;
    "acme-text-field": TextField;
    "acme-textarea": Textarea;
  }
}
