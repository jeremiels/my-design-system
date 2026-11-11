export interface ClickEventDetail {
  /** The native click (or Enter/Space-triggered) event that caused this event. */
  originalEvent: MouseEvent;
}

export class ClickEvent extends Event {
  readonly detail: ClickEventDetail;

  constructor(detail: ClickEventDetail) {
    super("u-click", { bubbles: true, cancelable: false, composed: true });
    this.detail = detail;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-click": ClickEvent;
  }
}
