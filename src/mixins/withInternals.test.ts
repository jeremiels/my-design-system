// `attachInternals()` works once per element: a second call is a bug in the
// class chain, and must surface instead of leaving the element without its
// internals (submit and reset would silently do nothing).
import { LitElement } from "lit";
import { expect, it } from "vitest";
import { withInternals } from "./withInternals.js";

class Internals extends withInternals(LitElement) {
  get attached() {
    return this.internals;
  }
}
customElements.define("t-internals", Internals);

class AttachesItself extends LitElement {
  constructor() {
    super();
    this.attachInternals();
  }
}
class AttachedTwice extends withInternals(AttachesItself) {}
customElements.define("t-attached-twice", AttachedTwice);

it("attaches the element's internals", () => {
  expect(new Internals().attached).toBeInstanceOf(ElementInternals);
});

it("lets an error from attachInternals() propagate", () => {
  expect(() => new AttachedTwice()).toThrow(DOMException);
});
