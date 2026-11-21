// Tests the Vue app's build (dist/) in Chromium, as a user fills its form:
// v-model in both directions, on a text field, an autocomplete and a textarea, the browser's
// validation, the app's own check, the submitted data and the reset. Playwright is resolved from the
// repository's node_modules.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const dist = join(import.meta.dirname, "../dist");
const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

/** The paths the page requested. */
const requested = [];
const server = createServer(async (request, response) => {
  const path =
    normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^\/+/, "") ||
    "index.html";
  requested.push(path);
  try {
    const body = await readFile(join(dist, path));
    response
      .writeHead(200, {
        "content-type": CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));

/** The state of a field, by its name: the host, its native control, its hint and its error. */
const field = (name) =>
  page
    .locator(`:is(acme-text-field, acme-autocomplete, acme-textarea)[name="${name}"]`)
    .evaluate((element) => {
      const control = element.shadowRoot.querySelector('[part~="input"], [part~="textarea"]');
      const text = (part) => {
        const node = element.shadowRoot.querySelector(`[part~="${part}"]`);
        return node.hidden ? null : node.textContent.replace(/\s+/g, " ").trim();
      };
      return {
        value: element.value,
        input: control.value,
        invalid: control.getAttribute("aria-invalid"),
        hint: text("hint"),
        error: text("error"),
      };
    });
const fields = async () => ({
  name: await field("name"),
  email: await field("email"),
  username: await field("username"),
  city: await field("city"),
  bio: await field("bio"),
});
const greeting = () => page.locator("#greeting").textContent();
const dangerIconLoaded = () => requested.some((path) => /(^|\/)danger-[\w-]+\.js$/.test(path));
const button = (name) => page.getByRole("button", { name, exact: true });

/** Runs a check; an exception fails it. */
async function check(name, run) {
  try {
    const [ok, detail] = await run();
    record(name, ok, detail);
  } catch (error) {
    record(name, false, `threw ${error}`);
  }
}

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole("heading", { name: "Créer un compte" }).waitFor({ timeout: 15_000 });

  await check("the app registers only what it uses, under the acme- prefix", async () => {
    const defined = await page.evaluate(() =>
      [
        ...["acme-text-field", "acme-textarea", "acme-autocomplete"],
        ...["acme-button", "acme-alert", "acme-icon"],
        ...["acme-modal", "acme-card", "u-text-field", "u-textarea", "u-button"],
      ].filter((tag) => customElements.get(tag)),
    );
    return [
      defined.join() ===
        "acme-text-field,acme-textarea,acme-autocomplete,acme-button,acme-alert,acme-icon",
      `defined: ${defined.join(", ")}`,
    ];
  });

  await check("no error shows before the user interacts", async () => {
    const state = await fields();
    const quiet = Object.values(state).every(({ error, invalid }) => !error && invalid === "false");
    return [
      quiet && !dangerIconLoaded(),
      `${JSON.stringify(state)}; danger icon downloaded: ${dangerIconLoaded()}`,
    ];
  });

  await button("Créer le compte").click();
  await check(
    "an invalid form isn't submitted: errors show, the first field has focus",
    async () => {
      const state = await fields();
      const focused = await page.evaluate(
        () =>
          document.activeElement?.getAttribute("name") +
          " > " +
          document.activeElement?.shadowRoot?.activeElement?.getAttribute("part"),
      );
      const submitted = await page.locator("#submitted").count();
      const { bio, city, ...required } = state;
      return [
        submitted === 0 &&
          focused === "name > input" &&
          state.name.error === "Erreur : Saisissez votre nom." &&
          state.email.error === "Erreur : Saisissez une adresse e-mail au format nom@exemple.fr." &&
          Object.values(required).every(({ invalid }) => invalid === "true") &&
          [bio, city].every(({ invalid, error }) => invalid === "false" && error === null),
        `alert: ${submitted}, focus: ${focused}, ${JSON.stringify(state)}`,
      ];
    },
  );

  await check("the error icon downloads with the first error, not before", async () => [
    dangerIconLoaded(),
    `danger icon downloaded: ${dangerIconLoaded()}`,
  ]);

  const name = page.getByRole("textbox", { name: "Nom", exact: true });
  await name.fill("  Ada  ");
  await check("v-model: typing updates the model, and the error follows", async () => {
    const text = await greeting();
    const state = await field("name");
    return [
      text === "Bonjour, Ada !" && state.error === null && state.invalid === "false",
      `greeting "${text}", ${JSON.stringify(state)}`,
    ];
  });

  await name.press("Tab");
  await check("v-model.trim: the field's change event trims its value", async () => {
    const state = await field("name");
    return [state.value === "Ada" && state.input === "Ada", JSON.stringify(state)];
  });

  await page.getByRole("textbox", { name: "Identifiant", exact: true }).fill("admin");
  await check("the app's own check shows its message, through setCustomValidity()", async () => {
    const state = await field("username");
    return [
      state.error === "Erreur : Cet identifiant est déjà pris : choisissez-en un autre.",
      JSON.stringify(state),
    ];
  });

  // The autocomplete: typing filters the suggestions, the keyboard picks one.
  const city = page.getByRole("combobox", { name: "Ville (facultatif)" });
  await city.pressSequentially("ly");
  await check("the autocomplete suggests the cities that match the text", async () => {
    const listbox = page.getByRole("listbox", { name: "Ville (facultatif)" });
    await listbox.waitFor({ timeout: 5_000 });
    const options = await listbox.getByRole("option").allTextContents();
    const expanded = await city.getAttribute("aria-expanded");
    return [
      options.map((text) => text.trim()).join() === "Lyon" && expanded === "true",
      `options: ${options.join(", ")}, aria-expanded: ${expanded}`,
    ];
  });
  await city.press("ArrowDown");
  await city.press("Enter");
  await check("v-model on an autocomplete: a picked suggestion reaches the model", async () => {
    const state = await field("city");
    const expanded = await city.getAttribute("aria-expanded");
    return [
      state.value === "Lyon" && state.input === "Lyon" && expanded === "false",
      `${JSON.stringify(state)}, aria-expanded: ${expanded}`,
    ];
  });

  const bio = "Mathématicienne.\nPremière programmeuse.";
  await page.getByRole("textbox", { name: "Présentation (facultatif)", exact: true }).fill(bio);
  await check(
    "v-model on a textarea: the lines reach the model, and the hint follows",
    async () => {
      const state = await field("bio");
      const hint = `200 caractères au plus : il en reste ${200 - bio.length}.`;
      return [state.value === bio && state.hint === hint, JSON.stringify(state)];
    },
  );

  await button("Préremplir").click();
  await check("v-model: changing the model updates the fields", async () => {
    const state = await fields();
    const expected = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      username: "ada",
      city: "Paris",
      bio: "Mathématicienne.",
    };
    const ok = Object.entries(expected).every(
      ([key, value]) =>
        state[key].value === value && state[key].input === value && state[key].error === null,
    );
    return [ok, JSON.stringify(state)];
  });

  await button("Créer le compte").click();
  await check("a valid form is submitted with the fields' values (FormData)", async () => {
    const alert = page.locator("#submitted");
    await alert.getByText("Compte créé").waitFor({ timeout: 5_000 });
    const text = (await alert.textContent()).replace(/\s+/g, " ").trim();
    return [
      text ===
        "Compte créé : Ada Lovelace, ada@example.com, ada, Paris. Présentation : Mathématicienne.",
      `alert "${text}"`,
    ];
  });

  await button("Effacer").click();
  await check("the form's reset empties the fields and the model", async () => {
    const state = await fields();
    const text = await greeting();
    const alert = await page.locator("#submitted").count();
    const empty = Object.values(state).every(
      ({ value, input, error, invalid }) =>
        value === "" && input === "" && error === null && invalid === "false",
    );
    return [
      empty &&
        state.bio.hint === "200 caractères au plus : il en reste 200." &&
        text === "Bonjour !" &&
        alert === 0,
      `greeting "${text}", alert: ${alert}, ${JSON.stringify(state)}`,
    ];
  });

  // The requests page: a list an agent filters, sorts, selects, pages
  // through, and edits in a drawer.
  await page.goto(`http://127.0.0.1:${server.address().port}/requests.html`);
  await page.getByRole("heading", { name: "Demandes" }).waitFor({ timeout: 15_000 });
  const table = page.locator("#requests");
  /** The rows of the page: their value, `*` when selected. */
  const rows = () =>
    table.evaluate((element) =>
      [...element.querySelectorAll("acme-table-row")]
        .filter((row) => row.value)
        .map((row) => `${row.value}${row.selected ? "*" : ""}`),
    );
  const badges = () => table.locator("acme-badge").allTextContents();
  const amounts = () =>
    table.evaluate((element) =>
      [...element.querySelectorAll("acme-table-row")]
        .filter((row) => row.value)
        .map((row) => Number(row.children[4].textContent.replace(/[^\d,]/g, "").replace(",", "."))),
    );
  const tags = () => page.locator("acme-tag").allTextContents();
  const count = async () => (await page.locator("#count").textContent()).trim();
  const accept = page.locator("#accept");
  const toasts = () =>
    page
      .locator("acme-toaster")
      .evaluate((toaster) => toaster.shadowRoot.textContent.replace(/\s+/g, " ").trim());
  /** The element that has the focus, inside the shadow roots. */
  const focused = () =>
    page.evaluate(() => {
      let element = document.activeElement;
      while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
      return element?.closest?.("[part]")?.getAttribute("part") ?? element?.localName;
    });
  const hostOfFocus = () =>
    page.evaluate(() => {
      let element = document.activeElement;
      while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
      return element.getRootNode().host?.textContent.replace(/\s+/g, " ").trim();
    });

  await check(
    "a table registers its rows and cells, a stepper its steps, a tag group its tags",
    async () => {
      const defined = await page.evaluate(() =>
        [
          "acme-table-row",
          "acme-table-cell",
          "acme-table-header-cell",
          "acme-step",
          "acme-tag",
        ].filter((tag) => customElements.get(tag)),
      );
      return [defined.length === 5, `defined: ${defined.join(", ")}`];
    },
  );

  const first = await rows();
  await check("the table shows a first page of 5 requests, the newest first", async () => {
    const sort = await page
      .locator("acme-table-header-cell", { hasText: "Reçue le" })
      .evaluate((cell) => cell.shadowRoot.querySelector("th").getAttribute("aria-sort"));
    return [first.length === 5 && sort === "descending", `rows: ${first}, aria-sort: ${sort}`];
  });

  await page.getByRole("button", { name: "Montant", exact: true }).click();
  await check("u-sort: the app sorts its data, the table shows the sort", async () => {
    const values = await amounts();
    const sorted = values.every((value, index) => index === 0 || values[index - 1] <= value);
    return [sorted && values.length === 5, `amounts: ${values.join(", ")}`];
  });

  const [a] = await rows();
  await page.getByRole("checkbox", { name: `Sélectionner ${a}` }).click();
  await page.getByRole("button", { name: "Page suivante" }).click();
  const [b] = await rows();
  await page.getByRole("checkbox", { name: `Sélectionner ${b}` }).click();
  await page.getByRole("button", { name: "Page précédente" }).click();
  await check("the selection outlives the page: page 1, page 2, back", async () => {
    const shown = await rows();
    const label = (await accept.textContent()).trim();
    return [
      shown[0] === `${a}*` && label === "Accepter la sélection (2)",
      `rows: ${shown}, button: "${label}"`,
    ];
  });

  await accept.click();
  await check(
    "a button enabled again acts: the statuses change, a toast says it, the selection empties",
    async () => {
      const shown = await rows();
      const first = (await badges())[0];
      const label = (await accept.textContent()).trim();
      const disabled = await accept.evaluate((button) => button.disabled);
      const message = await toasts();
      return [
        first === "Acceptée" &&
          !shown.some((row) => row.endsWith("*")) &&
          disabled &&
          message.includes("2 demandes acceptées."),
        `first status: ${first}, rows: ${shown}, button: "${label}" disabled ${disabled}, toasts: "${message}"`,
      ];
    },
  );

  await page.getByRole("combobox", { name: "État" }).click();
  await page.getByRole("option", { name: "Refusée" }).click();
  await check("a select filters the rows, and a tag says it", async () => {
    const statuses = await badges();
    return [
      statuses.length > 0 &&
        statuses.every((status) => status === "Refusée") &&
        (await tags()).join() === "État : Refusée",
      `statuses: ${statuses}, tags: ${await tags()}, ${await count()}`,
    ];
  });

  await page.getByRole("button", { name: "Retirer État : Refusée" }).click();
  await check("removing the tag removes the filter", async () => {
    const total = await count();
    return [
      (await tags()).length === 0 && total === "23 demandes",
      `tags: ${await tags()}, ${total}`,
    ];
  });

  const high = page.getByRole("button", { name: /^Montant ≥/ });
  await high.click();
  await check("a toggle button filters the high amounts: aria-pressed, and its tag", async () => {
    const pressed = await high.getAttribute("aria-pressed");
    const values = await amounts();
    return [
      pressed === "true" && values.every((value) => value >= 500) && (await tags()).length === 1,
      `aria-pressed: ${pressed}, amounts: ${values}, tags: ${await tags()}`,
    ];
  });
  await high.click();

  const [c] = await rows();
  const details = page.getByRole("button", { name: `Détails de ${c}` });
  await details.click();
  await check("a disclosure button shows a row of details over every column", async () => {
    const expanded = await details.getAttribute("aria-expanded");
    const widths = await table.evaluate((element) => {
      const cell = element.querySelector("acme-table-row.details acme-table-cell");
      const head = element.querySelector('acme-table-row[slot="head"]');
      return [
        cell.shadowRoot.querySelector("td").getBoundingClientRect().width,
        head.getBoundingClientRect().width,
      ];
    });
    return [
      expanded === "true" && widths[0] > widths[1] * 0.9,
      `aria-expanded: ${expanded}, details cell ${widths[0]}px, row ${widths[1]}px`,
    ];
  });

  await page.getByRole("button", { name: `Modifier ${c}` }).click();
  await page.getByRole("dialog", { name: `Demande ${c}` }).waitFor();
  await page.getByRole("combobox", { name: "État" }).last().click();
  await page.getByRole("option", { name: "Refusée" }).click();
  await page.getByRole("textbox", { name: "Commentaire" }).fill("Pièce manquante.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await check("the drawer saves the request: it closes, the row and a toast follow", async () => {
    const open = await page.locator("acme-drawer").evaluate((drawer) => drawer.open);
    const status = (await badges())[0];
    const message = await toasts();
    return [
      !open && status === "Refusée" && message.includes(`Demande ${c} enregistrée.`),
      `open: ${open}, status: ${status}, toasts: "${message}"`,
    ];
  });
  await check("the focus goes back to the button that opened the drawer", async () => {
    const host = await hostOfFocus();
    return [host === `Modifier ${c}`, `focus: ${await focused()} of "${host}"`];
  });

  record("no runtime errors", errors.length === 0, errors.join(" | ") || "none");
} finally {
  await browser.close();
  server.close();
}

for (const { name, ok, detail } of results) console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
process.exit(results.length > 0 && results.every((result) => result.ok) ? 0 : 1);
