<script setup lang="ts">
import {
  sortRows,
  type Table,
  type TableSort,
  type TableSortEvent,
  type Toaster,
  type ToggleButton,
} from "@acme/design-system";
import { computed, reactive, ref, useTemplateRef, watch } from "vue";
import { requests, STATUSES, type Request, type Status } from "./requests.data";

const PAGE_SIZE = 5;
const HIGH_AMOUNT = 500;

/** The requests, as the server sent them; the app changes their status. */
const all = ref<Request[]>(requests());

/** The filters: each one a field of the toolbar, and a tag while it applies. */
const filters = reactive({ status: "" as Status | "", since: "", high: false });
const sort = ref<TableSort>({ key: "receivedOn", direction: "descending" });
const page = ref(1);
/** The rows the agent selected, on every page: the table keeps them. */
const selection = ref<readonly string[]>([]);
/** The rows whose details show. */
const details = ref(new Set<string>());

const dateFormat = new Intl.DateTimeFormat("fr", { dateStyle: "long" });
const amountFormat = new Intl.NumberFormat("fr", { style: "currency", currency: "EUR" });
const date = (value: string) => dateFormat.format(new Date(`${value}T00:00`));

const statusOptions = [
  { value: "", label: "Tous les états" },
  ...Object.entries(STATUSES).map(([value, { label }]) => ({ value, label })),
];

const filtered = computed(() =>
  all.value.filter(
    (request) =>
      (!filters.status || request.status === filters.status) &&
      (!filters.since || request.receivedOn >= filters.since) &&
      (!filters.high || request.amount >= HIGH_AMOUNT),
  ),
);
const sorted = computed(() => sortRows(filtered.value, sort.value, "fr"));
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)));
const shown = computed(() =>
  sorted.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

// Another filter: back to the first page.
watch(filters, () => (page.value = 1));

/** The filters that apply, as removable tags. */
const tags = computed(() => [
  ...(filters.status ? [{ key: "status", text: `État : ${STATUSES[filters.status].label}` }] : []),
  ...(filters.since ? [{ key: "since", text: `Reçues depuis le ${date(filters.since)}` }] : []),
  ...(filters.high ? [{ key: "high", text: `Montant ≥ ${amountFormat.format(HIGH_AMOUNT)}` }] : []),
]);

function removeFilter(key: string) {
  if (key === "status") filters.status = "";
  if (key === "since") filters.since = "";
  if (key === "high") filters.high = false;
}

/** The table shows the sort; the app sorts its data. */
function onSort(event: TableSortEvent) {
  sort.value = { key: event.key, direction: event.direction };
}

function onSelect(event: Event) {
  // Only the table's own `change`: a control of a cell fires its own.
  if (event.target === event.currentTarget) {
    selection.value = (event.currentTarget as Table).values;
  }
}

function toggleDetails(id: string) {
  const next = new Set(details.value);
  if (!next.delete(id)) next.add(id);
  details.value = next;
}

const toaster = useTemplateRef<Toaster>("toaster");

function acceptSelection() {
  const ids = new Set(selection.value);
  for (const request of all.value) {
    if (ids.has(request.id)) request.status = "accepted";
  }
  const count = ids.size;
  selection.value = [];
  toaster.value?.show(count === 1 ? "1 demande acceptée." : `${count} demandes acceptées.`, {
    variant: "success",
  });
}

/** The request the drawer edits, a copy: saved only by « Enregistrer ». */
const editing = ref<Request | null>(null);
const step = computed(() =>
  !editing.value || editing.value.status === "received"
    ? "received"
    : editing.value.status === "review"
      ? "review"
      : "decision",
);

function edit(request: Request) {
  editing.value = { ...request };
}

function save() {
  const draft = editing.value;
  if (!draft) return;
  const index = all.value.findIndex((request) => request.id === draft.id);
  all.value[index] = draft;
  editing.value = null;
  toaster.value?.show(`Demande ${draft.id} enregistrée.`, { variant: "success" });
}
</script>

<template>
  <main class="page">
    <h1>Demandes</h1>

    <section class="filters" aria-label="Filtres">
      <acme-select
        v-model="filters.status"
        label="État"
        placeholder="Tous les états"
        :options="statusOptions"
      ></acme-select>
      <acme-date-picker
        v-model="filters.since"
        label="Reçues depuis le"
        placeholder="Toutes les dates"
      ></acme-date-picker>
      <acme-toggle-button
        :pressed="filters.high"
        @change="filters.high = ($event.target as ToggleButton).pressed"
        >Montant ≥ {{ amountFormat.format(HIGH_AMOUNT) }}</acme-toggle-button
      >
    </section>

    <acme-tag-group v-if="tags.length > 0" id="active-filters" label="Filtres actifs">
      <acme-tag v-for="tag in tags" :key="tag.key" removable @u-remove="removeFilter(tag.key)">{{
        tag.text
      }}</acme-tag>
    </acme-tag-group>

    <div class="bulk">
      <acme-button id="accept" :disabled="selection.length === 0" @click="acceptSelection">
        Accepter la sélection ({{ selection.length }})
      </acme-button>
      <p id="count">{{ filtered.length }} demandes</p>
    </div>

    <acme-table
      id="requests"
      label="Demandes"
      selectable
      :sort-key="sort.key"
      :sort-direction="sort.direction"
      :values="selection"
      @u-sort="onSort"
      @change="onSelect"
    >
      <acme-table-row slot="head">
        <acme-table-header-cell sort-key="id">Demande</acme-table-header-cell>
        <acme-table-header-cell sort-key="applicant">Demandeur</acme-table-header-cell>
        <acme-table-header-cell>Objet</acme-table-header-cell>
        <acme-table-header-cell sort-key="receivedOn">Reçue le</acme-table-header-cell>
        <acme-table-header-cell sort-key="amount" align="end">Montant</acme-table-header-cell>
        <acme-table-header-cell>État</acme-table-header-cell>
        <acme-table-header-cell>Actions</acme-table-header-cell>
      </acme-table-row>
      <template v-for="request in shown" :key="request.id">
        <acme-table-row :value="request.id">
          <acme-table-header-cell scope="row">{{ request.id }}</acme-table-header-cell>
          <acme-table-cell>{{ request.applicant }}</acme-table-cell>
          <acme-table-cell>{{ request.subject }}</acme-table-cell>
          <acme-table-cell>{{ date(request.receivedOn) }}</acme-table-cell>
          <acme-table-cell align="end">{{ amountFormat.format(request.amount) }}</acme-table-cell>
          <acme-table-cell>
            <acme-badge :variant="STATUSES[request.status].variant">{{
              STATUSES[request.status].label
            }}</acme-badge>
          </acme-table-cell>
          <acme-table-cell>
            <span class="row-actions">
              <acme-button
                size="small"
                variant="neutral"
                appearance="plain"
                expandable
                :expanded="details.has(request.id)"
                @click="toggleDetails(request.id)"
                >Détails <span class="visually-hidden">de {{ request.id }}</span></acme-button
              >
              <acme-button
                size="small"
                variant="neutral"
                appearance="outlined"
                @click="edit(request)"
                >Modifier <span class="visually-hidden">{{ request.id }}</span></acme-button
              >
            </span>
          </acme-table-cell>
        </acme-table-row>
        <acme-table-row v-if="details.has(request.id)" class="details">
          <acme-table-cell colspan="7">
            {{ request.subject }} pour {{ request.applicant }}, reçue le
            {{ date(request.receivedOn) }}.
            {{ request.comment ? `Commentaire : ${request.comment}` : "Aucun commentaire." }}
          </acme-table-cell>
        </acme-table-row>
      </template>
      <p slot="empty">Aucune demande ne correspond aux filtres.</p>
    </acme-table>

    <acme-pagination
      label="Pages des demandes"
      :pages="pages"
      :page="page"
      @change="page = ($event.target as HTMLElement & { page: number }).page"
    ></acme-pagination>

    <acme-drawer
      :label="editing ? `Demande ${editing.id}` : 'Demande'"
      :open="editing !== null"
      @u-close="editing = null"
    >
      <form v-if="editing" class="editor" @submit.prevent="save">
        <acme-stepper label="Avancement" :value="step">
          <acme-step value="received">Reçue</acme-step>
          <acme-step value="review">Instruction</acme-step>
          <acme-step value="decision">Décision</acme-step>
        </acme-stepper>
        <acme-select
          v-model="editing.status"
          label="État"
          name="status"
          :options="statusOptions.slice(1)"
        ></acme-select>
        <acme-textarea v-model="editing.comment" label="Commentaire" name="comment"></acme-textarea>
        <acme-file-field
          label="Pièces justificatives"
          name="files"
          multiple
          hint="PDF ou image, 5 Mo au plus par fichier."
          accept=".pdf,image/*"
        ></acme-file-field>
        <div class="actions">
          <acme-button type="submit">Enregistrer</acme-button>
          <acme-button variant="secondary" @click="editing = null">Annuler</acme-button>
        </div>
      </form>
    </acme-drawer>

    <acme-toaster ref="toaster"></acme-toaster>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--u-spacing-md);
  max-inline-size: 64rem;
  margin-inline: auto;
  padding: var(--u-spacing-lg) var(--u-spacing-md);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--u-spacing-md);
}

.filters > acme-select,
.filters > acme-date-picker {
  inline-size: 14rem;
}

.bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--u-spacing-md);
}

.row-actions {
  display: inline-flex;
  gap: var(--u-spacing-xs);
}

.editor {
  display: grid;
  gap: var(--u-spacing-md);
}

.actions {
  display: flex;
  gap: var(--u-spacing-sm);
}
</style>
