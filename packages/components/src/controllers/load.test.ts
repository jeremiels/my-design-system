// One load at a time, after a delay: the newest replaces the others.
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoadController } from "./load.js";

/** A host without DOM: it counts its render requests. */
function host() {
  const controllers: ReactiveController[] = [];
  const fake = {
    renders: 0,
    addController: (controller: ReactiveController) => controllers.push(controller),
    removeController: () => {},
    requestUpdate: () => {
      fake.renders++;
    },
    updateComplete: Promise.resolve(true),
    disconnect: () => controllers.forEach((controller) => controller.hostDisconnected?.()),
  };
  return fake satisfies ReactiveControllerHost & Record<string, unknown>;
}

/** A task whose answer the test gives, and whose signal it reads. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  let signal!: AbortSignal;
  const task = vi.fn((taskSignal: AbortSignal) => {
    signal = taskSignal;
    return new Promise<T>((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
  });
  return {
    task,
    resolve: (value: T) => resolve(value),
    reject: (error: unknown) => reject(error),
    signal: () => signal,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("starts the task after the delay, and keeps its result", async () => {
  const loader = new LoadController<string>(host(), { delay: () => 300 });
  const { task, resolve } = deferred<string>();
  loader.load(task);
  expect([loader.pending, loader.loading]).toEqual([true, false]);
  await vi.advanceTimersByTimeAsync(299);
  expect(task).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect([loader.pending, loader.loading]).toEqual([true, true]);
  resolve("rows");
  await vi.advanceTimersByTimeAsync(0);
  expect([loader.pending, loader.loading, loader.value]).toEqual([false, false, "rows"]);
});

it("starts only the last of the calls within the delay", async () => {
  const loader = new LoadController<string>(host(), { delay: () => 300 });
  const first = deferred<string>();
  const last = deferred<string>();
  loader.load(first.task);
  await vi.advanceTimersByTimeAsync(200);
  loader.load(last.task);
  await vi.advanceTimersByTimeAsync(300);
  expect(first.task).not.toHaveBeenCalled();
  expect(last.task).toHaveBeenCalledOnce();
});

it("aborts the task a new load replaces, and drops its late answer", async () => {
  const loader = new LoadController<string>(host());
  const first = deferred<string>();
  const last = deferred<string>();
  loader.load(first.task);
  await vi.advanceTimersByTimeAsync(0);
  loader.load(last.task);
  expect(first.signal().aborted).toBe(true);
  // The old value stays until the new task resolves.
  first.resolve("old");
  await vi.advanceTimersByTimeAsync(0);
  expect([loader.loading, loader.value]).toEqual([true, undefined]);
  last.resolve("new");
  await vi.advanceTimersByTimeAsync(0);
  expect(loader.value).toBe("new");
});

it("turns slow once the task runs longer than slowDelay", async () => {
  const loader = new LoadController<string>(host(), { slowDelay: 500 });
  const { task, resolve } = deferred<string>();
  loader.load(task);
  await vi.advanceTimersByTimeAsync(499);
  expect(loader.slow).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(loader.slow).toBe(true);
  resolve("rows");
  await vi.advanceTimersByTimeAsync(0);
  expect(loader.slow).toBe(false);
});

it("reports a rejected task, and forgets the value", async () => {
  const reported = vi.fn();
  vi.stubGlobal("reportError", reported);
  const loader = new LoadController<string>(host());
  const ok = deferred<string>();
  loader.load(ok.task);
  await vi.advanceTimersByTimeAsync(0);
  ok.resolve("rows");
  await vi.advanceTimersByTimeAsync(0);
  const failing = deferred<string>();
  loader.load(failing.task);
  await vi.advanceTimersByTimeAsync(0);
  const error = new Error("offline");
  failing.reject(error);
  await vi.advanceTimersByTimeAsync(0);
  expect(reported).toHaveBeenCalledWith(error);
  expect([loader.loading, loader.value]).toEqual([false, undefined]);
  vi.unstubAllGlobals();
});

it("ignores the rejection of an aborted task", async () => {
  const reported = vi.fn();
  vi.stubGlobal("reportError", reported);
  const loader = new LoadController<string>(host());
  const { task, reject, signal } = deferred<string>();
  loader.load(task);
  await vi.advanceTimersByTimeAsync(0);
  loader.clear();
  reject(signal().reason);
  await vi.advanceTimersByTimeAsync(0);
  expect(reported).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it("clears the value, and stops a load, on clear() and on disconnection", async () => {
  const fake = host();
  const loader = new LoadController<string>(fake, { delay: () => 300 });
  const { task, resolve } = deferred<string>();
  loader.load(task);
  await vi.advanceTimersByTimeAsync(300);
  resolve("rows");
  await vi.advanceTimersByTimeAsync(0);
  loader.clear();
  expect(loader.value).toBeUndefined();

  const next = deferred<string>();
  loader.load(next.task);
  fake.disconnect();
  await vi.advanceTimersByTimeAsync(300);
  expect(next.task).not.toHaveBeenCalled();
  expect(loader.pending).toBe(false);
});

it("asks its host to render at each change", async () => {
  const fake = host();
  const loader = new LoadController<string>(fake);
  const { task, resolve } = deferred<string>();
  loader.load(task);
  expect(fake.renders).toBe(1);
  await vi.advanceTimersByTimeAsync(0);
  expect(fake.renders).toBe(2);
  resolve("rows");
  await vi.advanceTimersByTimeAsync(0);
  expect(fake.renders).toBe(3);
});
