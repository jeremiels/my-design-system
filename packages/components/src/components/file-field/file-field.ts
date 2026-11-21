import { nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import { html } from "lit/static-html.js";
import { FieldBase, fieldIds } from "../../bases/field/field-base.js";
import type { FormValue } from "../../mixins/withFormControl.js";
import { TagGroup } from "../tag-group/tag-group.js";
import { Tag } from "../tag/tag.js";
import tagTokens from "../tag/tag.tokens.css" with { type: "css" };
import fileFieldStyles from "./file-field.css" with { type: "css" };
import fileFieldTokens from "./file-field.tokens.css" with { type: "css" };

/** The units of a file size, from `Intl.NumberFormat`, by powers of 1000. */
const SIZE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

/**
 * A file field: the user picks files, or drops them on its button, and the
 * form submits them (ADR 0028). Its control is a native
 * `<input type="file">`: its button opens the system's picker, and the
 * browser writes its text, in the browser's language.
 *
 * Under it, a `tag-group` lists the files chosen, each with its name and
 * size (`fileMessage`), and a button that removes it: the user corrects a
 * choice of several files without picking them all again. A removal fires
 * `input`, then `change`.
 *
 * The form receives each file under `name`. `required` needs a file.
 * `accept` filters the picker, as on a native input: the server checks the
 * files it receives. `value` is that of the native input, the name of the
 * first file after a fake path; `files` holds the files.
 *
 * A read-only field shows its files, and changes nothing.
 *
 * @element u-file-field
 * @summary A labelled field that picks files to submit with a form.
 * @csspart input - The native `<input type="file">`.
 * @csspart files - The `tag-group` of the files chosen.
 * @csspart file - The `tag` of a file.
 * @tokens file-field - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/file-field/`): `npm run analyze` documents them.
 * @tokens tag - The tokens of its list of files, shared with `tag`: `npm run analyze` documents them.
 */
export class FileField extends FieldBase {
  static override componentName = "file-field";

  /** Lists the files with the `tag-group` and `tag` of its own registration. */
  static override dependencies = [...FieldBase.dependencies, TagGroup, Tag];

  static styles = [super.styles ?? [], fileFieldTokens, tagTokens, fileFieldStyles];

  /** The types of file the picker offers: extensions or MIME types, as on a native input. */
  @property({ type: String })
  accept?: string;

  /** Whether the user can choose several files. */
  @property({ type: Boolean })
  multiple = false;

  /** The accessible name of the list of files chosen. */
  @property({ type: String, attribute: "files-label" })
  filesLabel = "Files chosen";

  /**
   * Writes the text of a file in the list: its name and its size, in the
   * page's language, by default. The remove button's name holds it.
   * Property only.
   */
  @property({ attribute: false })
  fileMessage: (file: File) => string = (file) => `${file.name} (${this.#size(file.size)})`;

  /** The files chosen. */
  @state()
  private chosen: readonly File[] = [];

  /** The files chosen, in order. Read-only: the user chooses them. */
  get files(): readonly File[] {
    return this.chosen;
  }

  /** Each file under `name`, as a native file input submits them. */
  protected override get formValue(): FormValue {
    if (!this.name || this.chosen.length === 0) {
      return null;
    }
    const data = new FormData();
    for (const file of this.chosen) {
      data.append(this.name, file);
    }
    return data;
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#setFiles([]);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    // A value the application empties empties the files, as on a native input.
    if (changedProperties.has("value") && this.value === "" && this.chosen.length > 0) {
      this.#setFiles([]);
    }
  }

  protected renderControl() {
    const tagGroup = this.tagFor(TagGroup);
    const tag = this.tagFor(Tag);
    const editable = !this.isDisabled && !this.readOnly;
    return html`
      <input
        part="input"
        class="control"
        id=${fieldIds.control}
        type="file"
        accept=${ifDefined(this.accept)}
        ?multiple=${this.multiple}
        ?required=${this.required}
        ?disabled=${!editable}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      ${
        this.chosen.length > 0
          ? html`<${tagGroup} part="files" class="files" label=${this.filesLabel}>
              ${repeat(
                this.chosen,
                (file) => file,
                (file) =>
                  html`<${tag}
                    part="file"
                    ?removable=${editable}
                    @u-remove=${() => this.#remove(file)}
                    >${this.fileMessage(file)}</${tag}
                  >`,
              )}
            </${tagGroup}>`
          : nothing
      }
    `;
  }

  /** The user chose files: the field takes them. */
  protected override handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.chosen = Array.from(input.files ?? []);
    super.handleInput(event);
  }

  /** Gives the native input `files`: the browser validates them, and the field shows them. */
  #setFiles(files: readonly File[]): void {
    this.chosen = files;
    const input = this.renderRoot?.querySelector<HTMLInputElement>(`#${fieldIds.control}`);
    if (!input) {
      return;
    }
    if (files.length === 0) {
      input.value = "";
    } else {
      const transfer = new DataTransfer();
      for (const file of files) {
        transfer.items.add(file);
      }
      input.files = transfer.files;
    }
    this.value = input.value;
  }

  /**
   * The user removed `file`: as a new choice, `input` then `change`. The
   * list moves the focus to another file; after the last one, it goes to
   * the input.
   */
  #remove(file: File): void {
    this.#setFiles(this.chosen.filter((chosen) => chosen !== file));
    this.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true, inputType: "deleteContent" }),
    );
    this.handleChange();
    if (this.chosen.length === 0) {
      void this.updateComplete.then(() =>
        this.renderRoot.querySelector<HTMLInputElement>(`#${fieldIds.control}`)?.focus(),
      );
    }
  }

  /** `size` bytes, in the unit that keeps it below 1000, in the page's language. */
  #size(size: number): string {
    let unit = 0;
    let value = size;
    while (value >= 1000 && unit < SIZE_UNITS.length - 1) {
      value /= 1000;
      unit++;
    }
    return new Intl.NumberFormat(this.language, {
      style: "unit",
      unit: SIZE_UNITS[unit],
      unitDisplay: "short",
      maximumFractionDigits: unit === 0 ? 0 : 1,
    }).format(value);
  }
}
