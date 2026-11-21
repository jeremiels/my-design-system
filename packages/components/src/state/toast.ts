/**
 * The queue of a toaster, without DOM nor Lit (ADR 0010): the messages it
 * shows, newest last, at most `max` of them.
 */
import type { SemanticVariant } from "../types/common.js";

/** A message of a toaster. */
export interface Toast {
  readonly id: number;
  readonly message: string;
  /** Sets its colors, its icon and how assistive technologies announce it, as for `alert`. */
  readonly variant: SemanticVariant;
  /** How long it shows, in milliseconds. 0: until the user closes it. */
  readonly duration: number;
}

export interface ToastQueue {
  readonly toasts: readonly Toast[];
  readonly nextId: number;
}

/** No message. */
export const emptyToastQueue: ToastQueue = { toasts: [], nextId: 1 };

/**
 * Adds a message, with the next id. Past `max` messages, the oldest ones
 * leave the queue: `dropped` holds them.
 */
export function addToast(
  queue: ToastQueue,
  toast: Omit<Toast, "id">,
  max = 3,
): { queue: ToastQueue; toast: Toast; dropped: readonly Toast[] } {
  const added: Toast = { ...toast, id: queue.nextId };
  const toasts = [...queue.toasts, added];
  const dropped = toasts.slice(0, Math.max(0, toasts.length - max));
  return {
    queue: { toasts: toasts.slice(dropped.length), nextId: queue.nextId + 1 },
    toast: added,
    dropped,
  };
}

/** Removes the message `id`. The same queue when it isn't there. */
export function removeToast(queue: ToastQueue, id: number): ToastQueue {
  return queue.toasts.some((toast) => toast.id === id)
    ? { ...queue, toasts: queue.toasts.filter((toast) => toast.id !== id) }
    : queue;
}
