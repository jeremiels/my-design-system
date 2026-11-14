// Tests the Vue app's build (dist/) in Chromium, as a user fills its form:
// v-model in both directions, on a text field and a textarea, the browser's
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
  page.locator(`:is(acme-text-field, acme-textarea)[name="${name}"]`).evaluate((element) => {
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
        ...["acme-text-field", "acme-textarea", "acme-button", "acme-alert", "acme-icon"],
        ...["acme-modal", "acme-card", "u-text-field", "u-textarea", "u-button"],
      ].filter((tag) => customElements.get(tag)),
    );
    return [
      defined.join() === "acme-text-field,acme-textarea,acme-button,acme-alert,acme-icon",
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
      const { bio, ...required } = state;
      return [
        submitted === 0 &&
          focused === "name > input" &&
          state.name.error === "Erreur : Saisissez votre nom." &&
          state.email.error === "Erreur : Saisissez une adresse e-mail au format nom@exemple.fr." &&
          Object.values(required).every(({ invalid }) => invalid === "true") &&
          bio.invalid === "false" &&
          bio.error === null,
        `alert: ${submitted}, focus: ${focused}, ${JSON.stringify(state)}`,
      ];
    },
  );

  await check("the error icon downloads with the first error, not before", async () => [
    dangerIconLoaded(),
    `danger icon downloaded: ${dangerIconLoaded()}`,
  ]);

  const name = page.getByLabel("Nom", { exact: true });
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

  await page.getByLabel("Identifiant", { exact: true }).fill("admin");
  await check("the app's own check shows its message, through setCustomValidity()", async () => {
    const state = await field("username");
    return [
      state.error === "Erreur : Cet identifiant est déjà pris : choisissez-en un autre.",
      JSON.stringify(state),
    ];
  });

  const bio = "Mathématicienne.\nPremière programmeuse.";
  await page.getByLabel("Présentation (facultatif)", { exact: true }).fill(bio);
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
      text === "Compte créé : Ada Lovelace, ada@example.com, ada. Présentation : Mathématicienne.",
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

  record("no runtime errors", errors.length === 0, errors.join(" | ") || "none");
} finally {
  await browser.close();
  server.close();
}

for (const { name, ok, detail } of results) console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
process.exit(results.length > 0 && results.every((result) => result.ok) ? 0 : 1);
