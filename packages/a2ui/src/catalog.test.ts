// The A2UI catalog of the base in a surface (ADR 0052): the A2UI renderer
// mounts the adapters, they render the components, write the user's input to
// the data model and send the action.
import "@a2ui/lit";
import { MessageProcessor, type ActionPayload, type SurfaceModel } from "@a2ui/web_core";
import { designSystem } from "@unicorne/components";
import { html, render } from "lit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import document from "../a2ui-catalog.json" with { type: "json" };
import { a2uiCatalog, socleComponents } from "./index.ts";

const ds = designSystem({ prefix: "agent" });
const actions: ActionPayload[] = [];
let processor: MessageProcessor;
const host = window.document.createElement("div");

const surfaceOf = (components: readonly Record<string, unknown>[], dataModel = {}) => [
  {
    version: "1.0",
    createSurface: {
      surfaceId: "form",
      catalogId: document.catalogId,
      sendDataModel: true,
      dataModel,
    },
  },
  { version: "1.0", updateComponents: { surfaceId: "form", components } },
];

const formData = () =>
  (
    processor.getRendererDataModel("1.0") as {
      surfaces: Record<string, { form: Record<string, unknown> }>;
    }
  ).surfaces.form!.form;

/** An element of the surface, through the shadow roots of the components. */
const shadowOf = (selector: string, inner: string) =>
  host.querySelector(selector)!.shadowRoot!.querySelector<HTMLElement>(inner)!;

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeAll(async () => {
  window.document.body.append(host);
  const catalog = await a2uiCatalog({ designSystem: ds, document, components: socleComponents });
  processor = new MessageProcessor([catalog], (action) => void actions.push(action), {
    version: "1.0",
  });
  processor.onSurfaceCreated((surface: SurfaceModel) =>
    render(html`<a2ui-surface .surface=${surface}></a2ui-surface>`, host),
  );
  processor.processMessages(
    surfaceOf(
      [
        {
          id: "root",
          component: "Column",
          children: ["title", "name", "agree", "team", "size", "actions"],
        },
        { id: "title", component: "Text", text: "Demande", style: "heading-lg", level: 2 },
        { id: "name", component: "TextField", label: "Nom", value: { "@path": "/form/name" } },
        {
          id: "agree",
          component: "Checkbox",
          label: "J'accepte",
          checked: { "@path": "/form/agree" },
        },
        {
          id: "team",
          component: "Select",
          label: "Équipe",
          options: [
            { value: "web", label: "Web" },
            { value: "data", label: "Données" },
          ],
          value: { "@path": "/form/team" },
        },
        {
          id: "size",
          component: "RadioGroup",
          label: "Taille",
          options: [
            { value: "s", label: "Petite" },
            { value: "l", label: "Grande" },
          ],
          value: { "@path": "/form/size" },
        },
        { id: "actions", component: "Row", gap: "sm", children: ["send"] },
        {
          id: "send",
          component: "Button",
          text: "Envoyer",
          variant: "success",
          action: { event: { name: "send", context: { name: { "@path": "/form/name" } } } },
        },
      ],
      { form: { name: "", agree: false, team: "", size: "l" } },
    ) as never,
  );
  await settle();
});

afterAll(() => {
  processor.dispose();
  host.remove();
});

describe("a2uiCatalog()", () => {
  it("renders each A2UI component with a component of the design system, in the light DOM", () => {
    expect(host.querySelector("agent-a2ui-text-field > agent-text-field")).not.toBeNull();
    expect(host.querySelector("agent-a2ui-button > agent-button")?.textContent).toBe("Envoyer");
    expect(host.querySelector<HTMLElement & { variant: string }>("agent-button")!.variant).toBe(
      "success",
    );
    expect(host.querySelector("agent-a2ui-text h2.agent-text-heading-lg")?.textContent).toBe(
      "Demande",
    );
  });

  it("renders the options of a radio group as radios of the same registration", () => {
    const radios = [
      ...host.querySelectorAll<HTMLElement & { label: string; checked: boolean }>(
        "agent-radio-group > agent-radio",
      ),
    ];
    expect(radios.map((radio) => radio.label)).toEqual(["Petite", "Grande"]);
    expect(radios.map((radio) => radio.checked)).toEqual([false, true]);
  });

  it("writes the user's input to the data model", async () => {
    await userEvent.fill(shadowOf("agent-text-field", "input"), "Ada");
    await userEvent.click(shadowOf("agent-checkbox", "input"));
    await userEvent.click(host.querySelector<HTMLElement>("agent-radio")!);
    await settle();
    expect(formData()).toMatchObject({ name: "Ada", agree: true, size: "s" });
  });

  it("passes the options of a select, and writes the one the user picks", async () => {
    const select = host.querySelector<HTMLElement & { value: string }>("agent-select")!;
    select.value = "data";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(formData().team).toBe("data");
  });

  it("sends the action of a button, with its context", async () => {
    await userEvent.click(shadowOf("agent-button", "button"));
    await settle();
    expect(actions.at(-1)).toMatchObject({
      name: "send",
      surfaceId: "form",
      sourceComponentId: "send",
      context: { name: "Ada" },
    });
  });

  it("follows the data model the agent updates", async () => {
    processor.processMessages([
      {
        version: "1.0",
        updateDataModel: { surfaceId: "form", path: "/form/name", value: "Grace" },
      },
    ] as never);
    await settle();
    expect(host.querySelector<HTMLElement & { value: string }>("agent-text-field")!.value).toBe(
      "Grace",
    );
  });

  it("reuses its adapters for a second catalog of the same design system", async () => {
    const second = await a2uiCatalog({ designSystem: ds, document, components: socleComponents });
    const first = processor.catalogs[0]!;
    const tag = "agent-a2ui-button";
    expect((second.components.get("Button") as unknown as { element: unknown }).element).toBe(
      customElements.get(tag),
    );
    expect(first.id).toBe(second.id);
  });

  it("fails on a component without a class", async () => {
    await expect(
      a2uiCatalog({ designSystem: designSystem({ prefix: "nope" }), document, components: {} }),
    ).rejects.toThrow(/no class for the component "button"/);
  });
});
