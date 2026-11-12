// The Actions panel shows the events the story's component documents
// (`@fires`, custom-elements.json), and nothing else: its public events.
import type { Decorator } from "@storybook/web-components-vite";
import { action } from "storybook/actions";
import manifest from "../custom-elements.json";

interface Declaration {
  tagName?: string;
  events?: { name: string }[];
}

/** The documented events of each component, by tag (`u-button`). */
const events = new Map(
  (manifest.modules as { declarations?: Declaration[] }[])
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName)
    .map((declaration) => [
      declaration.tagName!,
      (declaration.events ?? []).map((event) => event.name),
    ]),
);

/** Removes the listeners of the story last rendered in each root. */
const detach = new WeakMap<HTMLElement, () => void>();

/**
 * Listens on the story root, for each event of `tag`, to the events whose
 * target is an instance of `tag`. The target is retargeted to the host, so
 * the events of other elements (a slotted trigger, the close button inside
 * a shadow root, a form) are left out.
 */
function listen(root: HTMLElement, tag: string): () => void {
  const removals = (events.get(tag) ?? []).map((name) => {
    const log = action(name);
    const listener = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(tag)) {
        log(event);
      }
    };
    root.addEventListener(name, listener);
    return () => root.removeEventListener(name, listener);
  });
  return () => removals.forEach((remove) => remove());
}

/**
 * Logs an action, named after the event, for each documented event of the
 * story's `component`, from the play function or the user. Listens before
 * rendering: `useEffect` would only run after the play function.
 */
export const withComponentEvents: Decorator = (story, { canvasElement, component, parameters }) => {
  detach.get(canvasElement)?.();
  if (component && !parameters.actions?.disable) {
    detach.set(canvasElement, listen(canvasElement, component));
  }
  return story();
};
