<script setup lang="ts">
import {
  MessageProcessor,
  type ActionPayload,
  type Catalog,
  type ComponentApi,
  type SurfaceModel,
} from "@a2ui/web_core";
import { onBeforeUnmount, ref, shallowRef } from "vue";
import { answer, requestForm, type AgentMessage } from "./assistant";

const props = defineProps<{ catalog: Catalog<ComponentApi>; catalogId: string }>();

/** The surface the agent fills; none once it deletes it. */
const surface = shallowRef<SurfaceModel | undefined>();
/** The last action the agent received, as its transport carries it. */
const received = ref<ActionPayload | null>(null);

/** Sends the agent's messages to the renderer, as its transport would. */
const deliver = (messages: AgentMessage[]) => processor.processMessages(messages as never);

const processor = new MessageProcessor(
  [props.catalog],
  (action) => {
    received.value = action;
    // The agent answers after a round trip.
    setTimeout(() => deliver(answer(action)));
  },
  { version: "1.0" },
);
processor.onSurfaceCreated((created) => (surface.value = created));
processor.onSurfaceDeleted(() => (surface.value = undefined));
deliver(requestForm(props.catalogId));

onBeforeUnmount(() => processor.dispose());
</script>

<template>
  <main class="page">
    <h1 class="acme-text-heading-xl">Assistant</h1>
    <p class="prompt">Vous : « Je voudrais un accès à l'outil de suivi. »</p>

    <section id="surface" aria-label="Réponse de l'assistant">
      <a2ui-surface v-if="surface" :surface="surface"></a2ui-surface>
      <p v-else>Demande annulée.</p>
    </section>

    <section v-if="received" aria-labelledby="received-heading">
      <h2 id="received-heading" class="acme-text-heading-sm">Ce que l'agent reçoit</h2>
      <pre id="received">{{
        JSON.stringify({ name: received.name, context: received.context }, null, 2)
      }}</pre>
    </section>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--u-spacing-lg);
  max-inline-size: 32rem;
  margin-inline: auto;
  padding: var(--u-spacing-lg) var(--u-spacing-md);
}

.prompt {
  margin: 0;
  color: var(--u-color-text-default);
}

pre {
  overflow-x: auto;
  font: var(--u-text-body-sm);
}
</style>
