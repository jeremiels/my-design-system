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
import type { TagNameMap } from "@unicorne/components";
import type { AcmeCatalog } from "./catalog.js";
import { AcmeCard } from "./components/acme-card/acme-card.js";
import { acme } from "./design-system.js";

void acme.define(Button, Alert, Modal, Icon, TextField, Textarea, Autocomplete, AcmeCard);

declare global {
  interface HTMLElementTagNameMap extends TagNameMap<"acme", AcmeCatalog> {}
}
