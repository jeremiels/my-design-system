// The agent of the assistant page, simulated in the page: what a real agent
// sends over its transport (A2A, AG-UI, MCP), and its answers to the user's
// actions. Its components are those of ACME's A2UI catalog (ADR 0052 of the
// base): ACME's card included.
import type { ActionPayload } from "@a2ui/web_core";

/** An A2UI message the agent sends: version 1.0 of the protocol. */
export type AgentMessage = Readonly<Record<string, unknown>>;

const SURFACE = "request";

/** The access request form: the agent's first answer. */
export function requestForm(catalogId: string): AgentMessage[] {
  return [
    {
      version: "1.0",
      createSurface: {
        surfaceId: SURFACE,
        catalogId,
        sendDataModel: true,
        dataModel: { request: { name: "", email: "", team: "", reason: "" } },
      },
    },
    {
      version: "1.0",
      updateComponents: {
        surfaceId: SURFACE,
        components: [
          {
            id: "root",
            component: "Column",
            gap: "md",
            children: ["title", "intro", "name", "email", "team", "reason", "actions"],
          },
          {
            id: "title",
            component: "Text",
            text: "Demande d'accès",
            style: "heading-lg",
            level: 2,
          },
          {
            id: "intro",
            component: "Alert",
            variant: "information",
            text: "Remplissez ces champs : l'équipe choisie valide la demande.",
          },
          {
            id: "name",
            component: "TextField",
            label: "Nom",
            required: true,
            value: { "@path": "/request/name" },
          },
          {
            id: "email",
            component: "TextField",
            label: "E-mail",
            type: "email",
            hint: "Format : nom@exemple.fr",
            value: { "@path": "/request/email" },
          },
          {
            id: "team",
            component: "Select",
            label: "Équipe",
            placeholder: "Choisissez une équipe",
            options: [
              { value: "web", label: "Web" },
              { value: "data", label: "Données" },
              { value: "support", label: "Support" },
            ],
            value: { "@path": "/request/team" },
          },
          {
            id: "reason",
            component: "Textarea",
            label: "Motif",
            rows: 3,
            value: { "@path": "/request/reason" },
          },
          { id: "actions", component: "Row", gap: "sm", children: ["cancel", "send"] },
          {
            id: "cancel",
            component: "Button",
            text: "Annuler",
            variant: "neutral",
            appearance: "outlined",
            action: { event: { name: "cancel_request" } },
          },
          {
            id: "send",
            component: "Button",
            text: "Envoyer la demande",
            action: {
              event: {
                name: "send_request",
                context: {
                  name: { "@path": "/request/name" },
                  email: { "@path": "/request/email" },
                  team: { "@path": "/request/team" },
                  reason: { "@path": "/request/reason" },
                },
              },
            },
          },
        ],
      },
    },
  ];
}

/** The agent's answer to an action of the user: a card that sums up the request, or nothing left. */
export function answer(action: ActionPayload): AgentMessage[] {
  if (action.name === "cancel_request") {
    return [{ version: "1.0", deleteSurface: { surfaceId: SURFACE } }];
  }
  const { name, team } = action.context as { name?: string; team?: string };
  return [
    {
      version: "1.0",
      updateComponents: {
        surfaceId: SURFACE,
        components: [
          {
            id: "root",
            component: "Card",
            heading: "Demande envoyée",
            children: ["body"],
          },
          { id: "body", component: "Column", gap: "sm", children: ["summary", "badge"] },
          {
            id: "summary",
            component: "Text",
            text: `${name || "Votre demande"} rejoint l'équipe ${team || "choisie"} après validation.`,
          },
          { id: "badge", component: "Badge", variant: "warning", text: "En attente" },
        ],
      },
    },
  ];
}
