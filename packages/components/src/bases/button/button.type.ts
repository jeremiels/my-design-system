import type { ComponentSize, SemanticVariant } from "../../types/common.js";

export type ButtonVariant = "primary" | "secondary" | "neutral" | SemanticVariant;

/** How the variant paints the button: a fill, a border, or its text only. */
export type ButtonAppearance = "filled" | "outlined" | "plain";

export type ButtonSize = ComponentSize;

export type ButtonType = "button" | "submit" | "reset";

/** The item of a set the button stands for: `aria-current`. */
export type ButtonCurrent = "page" | "step" | "location" | "date" | "time" | "true";

/** The popup the button opens: `aria-haspopup`. */
export type ButtonPopup = "menu" | "listbox" | "tree" | "grid" | "dialog";
