import { Icon } from "@unicorne/components";
// Generated from icons/*.svg by `unicorne-icons`, before the build.
import { acmeIcons } from "../../icons/index.js";

/**
 * ACME's icons: the base's set, with ACME's version of `information` and
 * ACME's own icons. Registered as the `icon` override, so every ACME
 * component that renders an icon (alert…) renders ACME's. Each icon still
 * loads on demand, from ACME's build or from @unicorne/icons.
 *
 * @element acme-icon
 * @summary The base icon, with ACME's icons.
 */
export class AcmeIcon extends Icon {
  static override icons = { ...Icon.icons, ...acmeIcons };
}
