import type { ReactiveController, ReactiveControllerHost } from "lit";

/** The work of a load: it stops when `signal` aborts, a newer load replacing it. */
export type LoadTask<T> = (signal: AbortSignal) => Promise<T>;

export interface LoadControllerOptions {
  /**
   * Milliseconds between the last `load()` and the start of its task: the
   * calls in between start nothing, while the user types for instance. Read
   * at each call. `0` by default.
   */
  delay?: () => number;
  /**
   * Milliseconds a task runs before `slow` turns `true`: an indicator then
   * shows, but not for a fast answer. `500` by default.
   */
  slowDelay?: number;
}

/**
 * Reactive controller: loads data for its host, from a server for instance,
 * one load at a time (ADR 0026). Each `load()` replaces the previous one:
 * it aborts its task, and drops its result. The host renders again at each
 * change of `pending`, `loading`, `slow` and `value`.
 *
 * A task that rejects keeps `value` as it was cleared: `undefined`. The
 * error reaches the page's error handlers (`reportError()`), as an uncaught
 * one would. A task that handles its own errors resolves with what to show.
 *
 * On a server, nothing loads: `load()` runs in the browser, after a user's
 * action.
 *
 * @example
 * #loader = new LoadController<readonly Row[]>(this, { delay: () => 300 });
 *
 * #search(text: string) {
 *   this.#loader.load((signal) => fetch(`/rows?q=${text}`, { signal }).then((r) => r.json()));
 * }
 */
export class LoadController<T> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: LoadControllerOptions;

  /** The delay before the task starts. */
  #timer?: ReturnType<typeof setTimeout>;

  /** The delay before `slow` turns `true`. */
  #slowTimer?: ReturnType<typeof setTimeout>;

  /** Aborts the task that runs: the current one, compared by reference. */
  #abort?: AbortController;

  #slow = false;

  #value?: T;

  constructor(host: ReactiveControllerHost, options: LoadControllerOptions = {}) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** Whether a load waits for its delay, or runs. */
  get pending(): boolean {
    return this.#timer !== undefined || this.#abort !== undefined;
  }

  /** Whether a task runs. */
  get loading(): boolean {
    return this.#abort !== undefined;
  }

  /** Whether a task has run longer than `slowDelay`. */
  get slow(): boolean {
    return this.#slow;
  }

  /** The result of the last task that resolved, `undefined` before it and after `clear()`. */
  get value(): T | undefined {
    return this.#value;
  }

  /**
   * Starts `task` after the delay, unless another `load()` or `clear()`
   * comes first. Aborts the task that runs. `value` stays as it is until
   * the new task resolves.
   */
  load(task: LoadTask<T>): void {
    this.#cancel();
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      void this.#run(task);
    }, this.#options.delay?.() ?? 0);
    this.#host.requestUpdate();
  }

  /** Aborts the load, and forgets `value`. */
  clear(): void {
    const changed = this.pending || this.#value !== undefined;
    this.#cancel();
    this.#value = undefined;
    if (changed) {
      this.#host.requestUpdate();
    }
  }

  hostDisconnected(): void {
    // Out of the document, nobody waits for the answer.
    if (this.pending) {
      this.#cancel();
      this.#host.requestUpdate();
    }
  }

  async #run(task: LoadTask<T>): Promise<void> {
    const abort = new AbortController();
    this.#abort = abort;
    this.#slowTimer = setTimeout(() => {
      this.#slow = true;
      this.#host.requestUpdate();
    }, this.#options.slowDelay ?? 500);
    this.#host.requestUpdate();
    try {
      const value = await task(abort.signal);
      if (abort === this.#abort) {
        this.#value = value;
      }
    } catch (error) {
      if (abort === this.#abort) {
        this.#value = undefined;
        reportError(error);
      }
    }
    if (abort === this.#abort) {
      this.#end();
      this.#host.requestUpdate();
    }
  }

  /** Stops the delay and the task, without a render. */
  #cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    const abort = this.#abort;
    this.#end();
    abort?.abort();
  }

  #end(): void {
    clearTimeout(this.#slowTimer);
    this.#slowTimer = undefined;
    this.#abort = undefined;
    this.#slow = false;
  }
}
