<script setup lang="ts">
import type { TextField } from "@acme/design-system";
import { computed, reactive, ref, useTemplateRef, watch } from "vue";

interface Account {
  name: string;
  email: string;
  username: string;
  bio: string;
}

const empty = (): Account => ({ name: "", email: "", username: "", bio: "" });

/** The form's model: each field is bound to it with `v-model`. */
const account = reactive(empty());

/** The data the form submitted, as the browser builds it (`FormData`). */
const submitted = ref<Record<string, string> | null>(null);

const greeting = computed(() => (account.name ? `Bonjour, ${account.name} !` : "Bonjour !"));

/** The presentation's length limit, and its hint: a property bound to the model. */
const BIO_MAX = 200;
const bioHint = computed(
  () => `${BIO_MAX} caractères au plus : il en reste ${BIO_MAX - account.bio.length}.`,
);

// A check of the app, beyond the browser's constraints: the field shows its
// message like the browser's, and blocks the submission.
const TAKEN = ["admin", "root"];
const usernameField = useTemplateRef<TextField>("username");
watch(
  () => account.username,
  (username) =>
    usernameField.value?.setCustomValidity(
      TAKEN.includes(username.toLowerCase())
        ? "Cet identifiant est déjà pris : choisissez-en un autre."
        : "",
    ),
);

/** Called only once every field is valid: the browser blocks the submission before. */
function submit(event: SubmitEvent) {
  const data = new FormData(event.target as HTMLFormElement);
  submitted.value = Object.fromEntries([...data].map(([name, value]) => [name, String(value)]));
}

/** The form's reset empties the fields; the model follows. */
function reset() {
  Object.assign(account, empty());
  submitted.value = null;
}

/** The model changes: the fields follow. */
function prefill() {
  Object.assign(account, {
    name: "Ada Lovelace",
    email: "ada@example.com",
    username: "ada",
    bio: "Mathématicienne.",
  });
}
</script>

<template>
  <main class="page">
    <h1>Créer un compte</h1>
    <p id="greeting">{{ greeting }}</p>

    <form class="form" @submit.prevent="submit" @reset="reset">
      <acme-text-field
        v-model.trim="account.name"
        label="Nom"
        name="name"
        autocomplete="name"
        required
        error-label="Erreur :"
        error-message="Saisissez votre nom."
      ></acme-text-field>
      <acme-text-field
        v-model="account.email"
        label="E-mail"
        name="email"
        type="email"
        autocomplete="email"
        required
        hint="Format : nom@exemple.fr"
        error-label="Erreur :"
        error-message="Saisissez une adresse e-mail au format nom@exemple.fr."
      ></acme-text-field>
      <acme-text-field
        ref="username"
        v-model="account.username"
        label="Identifiant"
        name="username"
        autocomplete="username"
        required
        minlength="3"
        hint="3 caractères au moins"
        error-label="Erreur :"
        error-message="Choisissez un identifiant de 3 caractères au moins."
      ></acme-text-field>
      <acme-textarea
        v-model="account.bio"
        label="Présentation (facultatif)"
        name="bio"
        rows="4"
        :maxlength="BIO_MAX"
        :hint="bioHint"
      ></acme-textarea>

      <div class="actions">
        <acme-button type="submit">Créer le compte</acme-button>
        <acme-button type="reset" variant="secondary">Effacer</acme-button>
        <acme-button variant="secondary" @click="prefill">Préremplir</acme-button>
      </div>
    </form>

    <acme-alert v-if="submitted" id="submitted" type="success">
      Compte créé : {{ submitted.name }}, {{ submitted.email }}, {{ submitted.username }}.
      <template v-if="submitted.bio">Présentation : {{ submitted.bio }}</template>
    </acme-alert>
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

.form {
  display: grid;
  gap: var(--u-spacing-md);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--u-spacing-sm);
}
</style>
