// The assistant page: the interface an agent sends, drawn with ACME's
// components by the A2UI renderer (ADR 0052 of the base). Only this page
// downloads the renderer and the adapters.
import "@acme/design-system/styles.css";
import "./app.css";
// Registers <a2ui-surface>, the element that draws a surface.
import "@a2ui/lit";
import { acmeA2uiCatalog } from "@acme/design-system/a2ui";
// The document the agent reads too: the components it may place, and their rules.
import document from "@acme/design-system/a2ui-catalog.json";
import { createApp } from "vue";
import Agent from "./Agent.vue";

// Registers the components of ACME's A2UI catalog, and their adapters.
const catalog = await acmeA2uiCatalog(document);

createApp(Agent, { catalog, catalogId: document.catalogId }).mount("#app");
