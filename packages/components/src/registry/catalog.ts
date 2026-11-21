import { Alert } from "../components/alert/alert.js";
import { Autocomplete } from "../components/autocomplete/autocomplete.js";
import { Combobox } from "../components/combobox/combobox.js";
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
import { Badge } from "../components/badge/badge.js";
import { FileField } from "../components/file-field/file-field.js";
import { Progress } from "../components/progress/progress.js";
import { Spinner } from "../components/spinner/spinner.js";
import { Step } from "../components/step/step.js";
import { Stepper } from "../components/stepper/stepper.js";
import { TableCell } from "../components/table-cell/table-cell.js";
import { TableHeaderCell } from "../components/table-header-cell/table-header-cell.js";
import { TableRow } from "../components/table-row/table-row.js";
import { Table } from "../components/table/table.js";
import { TagGroup } from "../components/tag-group/tag-group.js";
import { Tag } from "../components/tag/tag.js";
import { TreeItem } from "../components/tree-item/tree-item.js";
import { Tree } from "../components/tree/tree.js";
import { TextField } from "../components/text-field/text-field.js";
import { Textarea } from "../components/textarea/textarea.js";
import type { ListboxSelectEvent } from "../events/listbox-select.js";
import type { ModalCancelEvent } from "../events/modal-cancel.js";
import type { ModalCloseEvent } from "../events/modal-close.js";
import type { PopupToggleEvent } from "../events/popup-toggle.js";
import type { TableSortEvent } from "../events/table-sort.js";
import type { TagRemoveEvent } from "../events/tag-remove.js";
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
  Combobox,
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
  TreeItem,
  Tree,
  Spinner,
  Progress,
  Badge,
  Tag,
  TagGroup,
  FileField,
  Step,
  Stepper,
  TableCell,
  TableHeaderCell,
  TableRow,
  Table,
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
  badge: { element: Badge; events: {} };
  autocomplete: { element: Autocomplete; events: { "u-select": ListboxSelectEvent } };
  combobox: { element: Combobox; events: { "u-select": ListboxSelectEvent } };
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
  "file-field": { element: FileField; events: {} };
  drawer: { element: Drawer; events: { "u-cancel": ModalCancelEvent; "u-close": ModalCloseEvent } };
  icon: { element: Icon; events: {} };
  menu: { element: Menu; events: { "u-toggle": PopupToggleEvent } };
  "menu-item": { element: MenuItem; events: {} };
  modal: { element: Modal; events: { "u-cancel": ModalCancelEvent; "u-close": ModalCloseEvent } };
  "number-field": { element: NumberField; events: {} };
  pagination: { element: Pagination; events: {} };
  progress: { element: Progress; events: {} };
  popover: { element: Popover; events: { "u-toggle": PopupToggleEvent } };
  radio: { element: Radio; events: {} };
  "radio-group": { element: RadioGroup; events: {} };
  select: { element: Select; events: {} };
  slider: { element: Slider; events: {} };
  spinner: { element: Spinner; events: {} };
  step: { element: Step; events: {} };
  stepper: { element: Stepper; events: {} };
  switch: { element: Switch; events: {} };
  tab: { element: Tab; events: {} };
  "tab-panel": { element: TabPanel; events: {} };
  tabs: { element: Tabs; events: {} };
  table: { element: Table; events: { "u-sort": TableSortEvent } };
  "table-cell": { element: TableCell; events: {} };
  "table-header-cell": { element: TableHeaderCell; events: {} };
  "table-row": { element: TableRow; events: {} };
  tag: { element: Tag; events: { "u-remove": TagRemoveEvent } };
  "tag-group": { element: TagGroup; events: {} };
  toaster: { element: Toaster; events: { "u-close": ToastCloseEvent } };
  toolbar: { element: Toolbar; events: {} };
  tooltip: { element: Tooltip; events: { "u-toggle": PopupToggleEvent } };
  tree: { element: Tree; events: {} };
  "tree-item": { element: TreeItem; events: {} };
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
