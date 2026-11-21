import chevronDown from "@unicorne/icons/chevron-down";
import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { Icon } from "../../components/icon/icon.js";
import { ComboboxBase } from "../combobox/combobox-base.js";
import { fieldIds } from "../field/field-base.js";
import pickerBaseStyles from "./picker-base.css" with { type: "css" };
import pickerTokens from "./picker.tokens.css" with { type: "css" };

/** Where the popup of a picker opens: on the picked value, or on its first or last item. */
export type PickerEntry = "selected" | "first" | "last";

/**
 * Shared base of the pickers, `select` and `date-picker`: a form field whose
 * control shows the picked value, and opens a popup to pick another one.
 * Abstract: extend `Select` or `DatePicker`, or write a picker with
 * `displayText`, `openPicker()` and `renderPopup()`. The popup and its state
 * are those of `ComboboxBase` (ADR 0018, ADR 0023).
 *
 * The control is a `role="combobox"` element, not a text input: the user
 * picks, and doesn't type. It shows `displayText`, or `placeholder`. Its
 * label isn't a `<label for>`, which names only a native control: the
 * control has `aria-labelledby`, and a click on the label focuses it.
 *
 * Keys of the control, popup closed: ArrowDown, Enter and Space open it on
 * the picked value; ArrowUp and Home on the first item, End on the last. A
 * click opens and closes it. A `required` picker can't be submitted while
 * its value is missing; its message is the browser's, from a hidden native
 * control (`renderValidityProxy()`).
 *
 * @csspart button - The control, `role="combobox"`: the picked value, or the placeholder, and a chevron.
 * @tokens picker - Its tokens (`@cssprop`), shared by the pickers, from `@unicorne/tokens` (`src/component/picker/`): `npm run analyze` documents them.
 */
export abstract class PickerBase extends ComboboxBase {
  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({ "chevron-down": chevronDown });
  }

  static styles = [super.styles ?? [], pickerTokens, pickerBaseStyles];

  /** Shown in the control while nothing is picked: "Choose a country". */
  @property({ type: String })
  placeholder = "";

  /** The text of the control: the picked value, as the user reads it. `""` shows the placeholder. */
  protected abstract get displayText(): string;

  /** Opens the popup, and enters it at `entry`. */
  protected abstract openPicker(entry: PickerEntry): void;

  /** The `aria-haspopup` of the control: what the popup is. */
  protected get popupRole(): "listbox" | "dialog" {
    return "listbox";
  }

  /** The `aria-activedescendant` of the control, for a popup whose focus stays on it. None by default. */
  protected get controlActiveDescendant(): string | typeof nothing {
    return nothing;
  }

  /** Whether the value is missing: `required` and empty. */
  protected get valueMissing(): boolean {
    return this.required && this.value === "";
  }

  /** The control, once rendered. */
  protected get control(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(`#${fieldIds.control}`) ?? null;
  }

  protected override syncValidity(): void {
    this.syncValueValidity(this.valueMissing, this.control ?? undefined);
  }

  /** The hidden native control whose message a missing value shows. A `<select>` by default. */
  protected renderValidityProxy(): unknown {
    return html`<select class="validity-proxy" required hidden tabindex="-1">
      <option value=""></option>
    </select>`;
  }

  protected override renderLabel() {
    return html`<label part="label" class="label" id=${fieldIds.label} @click=${() => this.focus()}
      >${this.renderLabelContent()}</label
    >`;
  }

  protected renderCombobox() {
    const text = this.displayText;
    return html`
      <div
        part="button"
        class="control"
        id=${fieldIds.control}
        role="combobox"
        tabindex=${this.isDisabled ? "-1" : "0"}
        aria-haspopup=${this.popupRole}
        aria-labelledby=${fieldIds.label}
        aria-expanded=${this.comboboxExpanded}
        aria-controls=${this.comboboxControls}
        aria-activedescendant=${this.controlActiveDescendant}
        aria-required=${this.required ? "true" : nothing}
        aria-readonly=${this.readOnly ? "true" : nothing}
        aria-disabled=${this.isDisabled ? "true" : nothing}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @click=${this.#toggle}
        @keydown=${this.handleComboboxKeydown}
      >
        <span class="value${text ? "" : " value--placeholder"}">${text || this.placeholder}</span>
        <${this.tagFor(Icon)} class="chevron" name="chevron-down"></${this.tagFor(Icon)}>
      </div>
      <!-- The browser's message of a missing value, in its language. -->
      ${this.renderValidityProxy()}
    `;
  }

  /** The keys of the popup closed, then those of `ComboboxBase`. */
  protected override handleComboboxKeydown(event: KeyboardEvent): void {
    if (this.isDisabled || this.readOnly || event.isComposing || event.keyCode === 229) {
      return;
    }
    if (this.open) {
      super.handleComboboxKeydown(event);
      return;
    }
    const { key } = event;
    const entry: PickerEntry | undefined =
      key === "ArrowDown" || key === "Enter" || key === " "
        ? "selected"
        : key === "ArrowUp" || key === "Home"
          ? "first"
          : key === "End"
            ? "last"
            : undefined;
    if (entry) {
      event.preventDefault();
      this.openPicker(entry);
    }
  }

  #toggle = () => {
    if (this.isDisabled || this.readOnly) {
      return;
    }
    if (this.open) {
      this.hidePopup();
    } else {
      this.openPicker("selected");
    }
  };
}
