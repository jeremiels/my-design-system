export interface MyClickEventDetail {
  /** The native click (or Enter/Space-triggered) event that caused this event. */
  originalEvent: MouseEvent;
}

export class MyClickEvent extends Event {
  readonly detail: MyClickEventDetail;

  constructor(detail: MyClickEventDetail) {
    super("my-click", { bubbles: true, cancelable: false, composed: true });
    this.detail = detail;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "my-click": MyClickEvent;
  }
}
