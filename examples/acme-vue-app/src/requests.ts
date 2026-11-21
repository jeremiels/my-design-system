// The requests page: a list an agent filters, sorts, selects and pages
// through, and a drawer to edit one request.
import "@acme/design-system/styles.css";
import "./app.css";
import {
  acme,
  Badge,
  Button,
  DatePicker,
  Drawer,
  FileField,
  Footer,
  Header,
  Link,
  Notice,
  Page,
  Pagination,
  Select,
  SideNav,
  Stepper,
  Table,
  TagGroup,
  Textarea,
  Toaster,
  ToggleButton,
} from "@acme/design-system";
import { createApp } from "vue";
import Requests from "./Requests.vue";

// A table registers its rows and cells, a stepper its steps, a tag group its
// tags, a side navigation its items.
await acme.define(
  Page,
  Header,
  Footer,
  SideNav,
  Notice,
  Link,
  Table,
  Pagination,
  Select,
  DatePicker,
  ToggleButton,
  TagGroup,
  Badge,
  Button,
  Drawer,
  Stepper,
  FileField,
  Textarea,
  Toaster,
);

createApp(Requests).mount("#app");
