/**
 * Registers ACME's whole catalog under the `acme-` prefix. An app that uses
 * everything imports "@acme/design-system/define" once; the others register
 * only what they use with `acme.define()` (src/design-system.ts).
 */
import {
  Alert,
  Autocomplete,
  Badge,
  Button,
  Combobox,
  DatePicker,
  Drawer,
  FileField,
  Footer,
  Header,
  Icon,
  Link,
  Modal,
  Notice,
  Page,
  Pagination,
  Select,
  SideNav,
  Stepper,
  Table,
  TagGroup,
  Textarea,
  TextField,
  Toaster,
  ToggleButton,
} from "@unicorne/components";
import type { TagNameMap } from "@unicorne/components";
import type { AcmeCatalog } from "./catalog.js";
import { AcmeCard } from "./components/acme-card/acme-card.js";
import { acme } from "./design-system.js";

// A table registers its rows and cells, a stepper its steps, a tag group its
// tags, a side navigation its items.
void acme.define(
  Button,
  Alert,
  Modal,
  Drawer,
  Icon,
  TextField,
  Textarea,
  Autocomplete,
  Combobox,
  Select,
  DatePicker,
  FileField,
  ToggleButton,
  Badge,
  TagGroup,
  Table,
  Pagination,
  Stepper,
  Toaster,
  Page,
  Header,
  Footer,
  SideNav,
  Notice,
  Link,
  AcmeCard,
);

declare global {
  interface HTMLElementTagNameMap extends TagNameMap<"acme", AcmeCatalog> {}
}
