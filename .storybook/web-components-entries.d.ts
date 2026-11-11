// `@storybook/web-components` ships this preview entry without type
// declarations; preview.ts composes it into definePreview().
declare module "@storybook/web-components/entry-preview-argtypes" {
  import type { ArgTypesEnhancer, Parameters } from "storybook/internal/types";
  import type { WebComponentsRenderer } from "@storybook/web-components";

  export const parameters: Parameters;
  export const argTypesEnhancers: ArgTypesEnhancer<WebComponentsRenderer>[];
}
