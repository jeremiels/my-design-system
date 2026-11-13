export type Constructor<T = {}> = new (...args: any[]) => T;

// Accepts abstract classes too, so mixins can compose over abstract bases
// (e.g. `ButtonBase`) as well as concrete ones.
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

// Common component sizes
export type ComponentSize = "small" | "medium" | "large";

// Semantic variants shared across components
export type SemanticVariant = "success" | "danger" | "warning" | "information";
