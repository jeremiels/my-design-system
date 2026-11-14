// ACME's stylesheet: the base's layers and tokens, then ACME's theme.
import "@acme/design-system/styles.css";
import "./app.css";
import { acme, Alert, Button, Textarea, TextField } from "@acme/design-system";
import { createApp } from "vue";
import App from "./App.vue";

// Registers the components the app uses, and those they render (the icon of
// an error, ACME's button): the app downloads nothing else. They are defined
// before Vue renders, so Vue sets their properties and not attributes.
await acme.define(TextField, Textarea, Button, Alert);

createApp(App).mount("#app");
