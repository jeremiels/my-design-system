<script setup lang="ts">
// Never mounted: `vue-tsc` checks this template with the types of ACME's
// tags (src/env.d.ts). Each `@vue-expect-error` fails the build if the types
// stop refusing the line under it.
import type { ModalCloseEvent } from "@acme/design-system";

function closed(event: ModalCloseEvent) {
  return event.value;
}
</script>

<template>
  <acme-text-field label="Nom" :required="true" :minlength="3"></acme-text-field>
  <!-- @vue-expect-error `required` is a boolean. -->
  <acme-text-field label="Nom" :required="'oui'"></acme-text-field>
  <!-- @vue-expect-error `options` is a list of options, not of strings. -->
  <acme-autocomplete label="Ville" :options="['Paris']"></acme-autocomplete>
  <acme-modal label="Profil" :open="false" @u-close="closed"></acme-modal>
  <!-- @vue-expect-error `u-close` gives a ModalCloseEvent, not a number. -->
  <acme-modal label="Profil" @u-close="(event: number) => event"></acme-modal>
</template>
