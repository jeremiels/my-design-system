import { Alert } from "../components/alert/alert.js";
import { Autocomplete } from "../components/autocomplete/autocomplete.js";
import { BreadcrumbItem } from "../components/breadcrumb-item/breadcrumb-item.js";
import { Breadcrumb } from "../components/breadcrumb/breadcrumb.js";
import { ButtonLink } from "../components/button-link/button-link.js";
import { Calendar } from "../components/calendar/calendar.js";
import { CheckboxGroup } from "../components/checkbox-group/checkbox-group.js";
import { Checkbox } from "../components/checkbox/checkbox.js";
import { DateField } from "../components/date-field/date-field.js";
import { DatePicker } from "../components/date-picker/date-picker.js";
import { Details } from "../components/details/details.js";
import { Drawer } from "../components/drawer/drawer.js";
import { Button } from "../components/button/button.js";
import { Icon } from "../components/icon/icon.js";
import { MenuItem } from "../components/menu-item/menu-item.js";
import { Menu } from "../components/menu/menu.js";
import { Modal } from "../components/modal/modal.js";
import { NumberField } from "../components/number-field/number-field.js";
import { Pagination } from "../components/pagination/pagination.js";
import { Popover } from "../components/popover/popover.js";
import { RadioGroup } from "../components/radio-group/radio-group.js";
import { Select } from "../components/select/select.js";
import { Slider } from "../components/slider/slider.js";
import { Radio } from "../components/radio/radio.js";
import { Switch } from "../components/switch/switch.js";
import { TabPanel } from "../components/tab-panel/tab-panel.js";
import { Tab } from "../components/tab/tab.js";
import { Tabs } from "../components/tabs/tabs.js";
import { Toaster } from "../components/toaster/toaster.js";
import { Toolbar } from "../components/toolbar/toolbar.js";
import { Tooltip } from "../components/tooltip/tooltip.js";
import { TextField } from "../components/text-field/text-field.js";
import { Textarea } from "../components/textarea/textarea.js";
import type { ListboxSelectEvent } from "../events/listbox-select.js";
import type { ModalCancelEvent } from "../events/modal-cancel.js";
import type { ModalCloseEvent } from "../events/modal-close.js";
import type { PopupToggleEvent } from "../events/popup-toggle.js";
import type { ToastCloseEvent } from "../events/toast-close.js";

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
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
  CheckboxGroup,
  Select,
  NumberField,
  DateField,
  Slider,
  Tab,
  TabPanel,
  Tabs,
  Details,
  BreadcrumbItem,
  Breadcrumb,
  Pagination,
  Toolbar,
  MenuItem,
  Menu,
  Drawer,
  Popover,
  Tooltip,
  Toaster,
  Calendar,
  DatePicker,
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
  breadcrumb: { element: Breadcrumb; events: {} };
  "breadcrumb-item": { element: BreadcrumbItem; events: {} };
  button: { element: Button; events: {} };
  "button-link": { element: ButtonLink; events: {} };
  calendar: { element: Calendar; events: {} };
  checkbox: { element: Checkbox; events: {} };
  "checkbox-group": { element: CheckboxGroup; events: {} };
  "date-field": { element: DateField; events: {} };
  "date-picker": { element: DatePicker; events: {} };
  details: { element: Details; events: {} };
  drawer: { element: Drawer; events: { "u-cancel": ModalCancelEvent; "u-close": ModalCloseEvent } };
  icon: { element: Icon; events: {} };
  menu: { element: Menu; events: { "u-toggle": PopupToggleEvent } };
  "menu-item": { element: MenuItem; events: {} };
  modal: { element: Modal; events: { "u-cancel": ModalCancelEvent; "u-close": ModalCloseEvent } };
  "number-field": { element: NumberField; events: {} };
  pagination: { element: Pagination; events: {} };
  popover: { element: Popover; events: { "u-toggle": PopupToggleEvent } };
  radio: { element: Radio; events: {} };
  "radio-group": { element: RadioGroup; events: {} };
  select: { element: Select; events: {} };
  slider: { element: Slider; events: {} };
  switch: { element: Switch; events: {} };
  tab: { element: Tab; events: {} };
  "tab-panel": { element: TabPanel; events: {} };
  tabs: { element: Tabs; events: {} };
  toaster: { element: Toaster; events: { "u-close": ToastCloseEvent } };
  toolbar: { element: Toolbar; events: {} };
  tooltip: { element: Tooltip; events: { "u-toggle": PopupToggleEvent } };
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
