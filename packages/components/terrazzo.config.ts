// `npm run tokens`: the sheet of each component, base or controller,
// src/{components,bases}/*/*.tokens.css and src/controllers/*.tokens.css,
// from the DTCG tokens of @unicorne/tokens (ADR 0002, ADR 0003): its tokens on
// `:host`, one `:host([attribute="context"])` rule per context of its
// modifiers. The page sheet is @unicorne/tokens/tokens.css. The output is
// committed, like custom-elements.json, and `npm run tokens:check` fails when
// it is out of date.
import { createRequire } from "node:module";
import { defineConfig } from "@terrazzo/cli";
import { tokensCss } from "@unicorne/tokens/terrazzo-plugin";

const resolver = createRequire(import.meta.url).resolve("@unicorne/tokens/resolver.json");

export default defineConfig({
  tokens: [resolver],
  outDir: "./src/",
  plugins: [
    tokensCss({
      prefix: "u",
      // The web binding: which host attribute selects each modifier's context.
      components: {
        button: {
          file: "bases/button/button.tokens.css",
          attributes: { "button-variant": "variant", "button-size": "size" },
        },
        alert: {
          file: "components/alert/alert.tokens.css",
          attributes: { "alert-variant": "variant" },
        },
        modal: { file: "components/modal/modal.tokens.css" },
        icon: { file: "components/icon/icon.tokens.css" },
        field: { file: "bases/field/field.tokens.css" },
        combobox: { file: "bases/combobox/combobox.tokens.css" },
        listbox: { file: "controllers/listbox.tokens.css" },
        toggle: { file: "bases/toggle/toggle.tokens.css" },
        checkbox: { file: "components/checkbox/checkbox.tokens.css" },
        switch: { file: "components/switch/switch.tokens.css" },
        radio: { file: "components/radio/radio.tokens.css" },
        "choice-group": { file: "bases/choice-group/choice-group.tokens.css" },
        picker: { file: "bases/picker/picker.tokens.css" },
        select: { file: "components/select/select.tokens.css" },
        slider: { file: "components/slider/slider.tokens.css" },
        tabs: { file: "components/tabs/tabs.tokens.css" },
        tab: { file: "components/tab/tab.tokens.css" },
        details: { file: "components/details/details.tokens.css" },
        breadcrumb: { file: "components/breadcrumb/breadcrumb.tokens.css" },
        pagination: { file: "components/pagination/pagination.tokens.css" },
        toolbar: { file: "components/toolbar/toolbar.tokens.css" },
        popup: { file: "bases/popup/popup.tokens.css" },
        drawer: { file: "components/drawer/drawer.tokens.css" },
        popover: { file: "components/popover/popover.tokens.css" },
        tooltip: { file: "components/tooltip/tooltip.tokens.css" },
        toaster: { file: "components/toaster/toaster.tokens.css" },
        calendar: { file: "components/calendar/calendar.tokens.css" },
        "date-picker": { file: "components/date-picker/date-picker.tokens.css" },
      },
    }),
  ],
});
