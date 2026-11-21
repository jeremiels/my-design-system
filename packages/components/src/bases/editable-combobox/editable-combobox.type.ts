/**
 * Which options of an editable combobox match the text: those that contain
 * it, those that start with it, or all of them (`none`), when the
 * application filters them itself.
 */
export type ComboboxFilter = "contains" | "starts-with" | "none";

/** What `loadOptions` receives: the text the user typed, and the signal of a newer request. */
export interface OptionsRequest {
  /** The text, trimmed. Never empty. */
  readonly text: string;
  /** Aborts when the user types again or leaves the field: pass it to `fetch()`. */
  readonly signal: AbortSignal;
}
