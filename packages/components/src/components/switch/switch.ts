import { html } from "lit";
import { ToggleBase } from "../toggle/toggle-base.js";
import switchStyles from "./switch.css" with { type: "css" };
import switchTokens from "./switch.tokens.css" with { type: "css" };

/**
 * A switch: a track and its thumb, its label after it, an optional hint and
 * the error message. The user turns on or off a setting that applies at
 * once, without a submit button. For an answer the form submits, use
 * `checkbox`. The native control, the form behavior and the layout are
 * those of `ToggleBase`.
 *
 * The native control has `role="switch"`: assistive technologies announce
 * it as on or off.
 *
 * @element u-switch
 * @summary A labelled on/off switch that takes part in its form.
 * @csspart track - The drawn track.
 * @csspart thumb - The thumb, at the start of the track when off, at its end when on.
 * @tokens switch - Its track's and thumb's tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/switch/`): `npm run analyze` documents them.
 */
export class Switch extends ToggleBase {
  static override componentName = "switch";

  static styles = [super.styles ?? [], switchTokens, switchStyles];

  protected override get controlRole(): string {
    return "switch";
  }

  protected renderIndicator() {
    return html`<span part="track" class="track" aria-hidden="true"
      ><span part="thumb" class="thumb"></span
    ></span>`;
  }
}
