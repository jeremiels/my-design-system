export type Constructor<T = {}> = new (...args: any[]) => T;

// Common component sizes
export type ComponentSize = "small" | "medium" | "large";

// Semantic variants shared across components
export type SemanticVariant =
  | "success"
  | "danger"
  | "warning"
  | "information";

// Button-specific variants (includes semantic variants)
export type ButtonVariant = "primary" | "secondary" | SemanticVariant;
