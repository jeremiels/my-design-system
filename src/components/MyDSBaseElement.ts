import { LitElement, css, type CSSResultGroup } from "lit";

/**
 * Minimal base class - only essentials
 */
export class DSBaseElement extends LitElement {
  static styles: CSSResultGroup = [
    css`
      :host {
        box-sizing: border-box;
      }

      :host([hidden]) {
        display: none !important;
      }
    `,
  ];
}
