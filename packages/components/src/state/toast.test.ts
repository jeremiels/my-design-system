// The queue of a toaster, without a browser (ADR 0010).
import { expect, it } from "vitest";
import { addToast, emptyToastQueue, removeToast } from "./toast.ts";

const message = (text: string) => ({ message: text, variant: "information" as const, duration: 0 });

it("adds the messages with growing ids, newest last", () => {
  const first = addToast(emptyToastQueue, message("Saved"));
  const second = addToast(first.queue, message("Sent"));
  expect(second.queue.toasts.map((toast) => [toast.id, toast.message])).toEqual([
    [1, "Saved"],
    [2, "Sent"],
  ]);
  expect(second.toast.id).toBe(2);
});

it("drops the oldest messages past the maximum", () => {
  let queue = emptyToastQueue;
  for (const text of ["a", "b", "c"]) {
    queue = addToast(queue, message(text), 3).queue;
  }
  const result = addToast(queue, message("d"), 3);
  expect(result.queue.toasts.map((toast) => toast.message)).toEqual(["b", "c", "d"]);
  expect(result.dropped.map((toast) => toast.message)).toEqual(["a"]);
});

it("removes a message, and keeps the same queue for an unknown id", () => {
  const { queue } = addToast(emptyToastQueue, message("Saved"));
  expect(removeToast(queue, 1).toasts).toEqual([]);
  expect(removeToast(queue, 9)).toBe(queue);
});
