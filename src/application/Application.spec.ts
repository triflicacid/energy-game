import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Application, MS_PER_TICK_AT_SPEED_1 } from "./index";

class FakeScheduler {
  private nextHandle = 1;
  private readonly callbacks = new Map<number, FrameRequestCallback>();

  public readonly requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    const handle = this.nextHandle++;
    this.callbacks.set(handle, cb);
    return handle;
  });

  public readonly cancelAnimationFrame = vi.fn((handle: number) => {
    this.callbacks.delete(handle);
  });

  /** fire the oldest pending RAF callback with the given timestamp */
  public runNext(timestamp: number): void {
    const entry = this.callbacks.entries().next();
    if (entry.done) throw new Error("no pending animation frame callback");
    const [handle, cb] = entry.value;
    this.callbacks.delete(handle);
    cb(timestamp);
  }
}

function makeApp(): Application {
  // Application only stores these references in the constructor;
  // it never calls DOM methods until CanvasRenderer/UiShell do so separately.
  return new Application(
    {} as HTMLCanvasElement,
    {} as HTMLElement,
  );
}

describe("Application", () => {
  let scheduler: FakeScheduler;

  beforeEach(() => {
    scheduler = new FakeScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clock is paused by default on construction", () => {
    const app = makeApp();
    expect(app.getClock().isPaused()).toBe(true);
    app.dispose();
  });

  it("does not start the frame loop before start() is called", () => {
    makeApp();
    expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("start() begins the frame loop exactly once; repeated calls are no-ops", () => {
    const app = makeApp();
    app.start();
    expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

    app.start(); // second call — no-op
    expect(scheduler.requestAnimationFrame).toHaveBeenCalledTimes(1);

    app.dispose();
  });

  it("dispose() stops the frame loop; repeated dispose() calls are safe", () => {
    const app = makeApp();
    app.start();

    app.dispose();
    expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);

    app.dispose(); // no-op
    expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("start() after dispose() is a no-op and does not restart the loop", () => {
    const app = makeApp();
    app.dispose();
    app.start();
    expect(scheduler.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("first frame sets the baseline timestamp; no tick is produced", () => {
    const app = makeApp();
    app.start();
    app.resume();

    scheduler.runNext(0);
    expect(app.getClock().getTick()).toBe(0);

    app.dispose();
  });

  it("advances one tick after exactly MS_PER_TICK_AT_SPEED_1 ms elapses", () => {
    const app = makeApp();
    app.start();
    app.resume();

    scheduler.runNext(0);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1);
    expect(app.getClock().getTick()).toBe(1);

    app.dispose();
  });

  it("accumulates fractional ticks across frames", () => {
    const app = makeApp();
    app.start();
    app.resume();

    scheduler.runNext(0);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1 * 2.5);
    expect(app.getClock().getTick()).toBe(2);

    scheduler.runNext(MS_PER_TICK_AT_SPEED_1 * 3);
    expect(app.getClock().getTick()).toBe(3);

    app.dispose();
  });

  it("paused clock does not accumulate ticks", () => {
    const app = makeApp();
    app.start();

    scheduler.runNext(0);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1);
    expect(app.getClock().getTick()).toBe(0);

    app.dispose();
  });

  it("resuming after pause picks up from the last frame; no burst of ticks", () => {
    const app = makeApp();
    app.start();

    // two frames while paused — lastTimestamp tracks them without accumulating
    scheduler.runNext(0);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1);
    expect(app.getClock().getTick()).toBe(0);

    app.resume();

    // next frame is 1000 ms after the last paused frame → exactly one tick
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1 * 2);
    expect(app.getClock().getTick()).toBe(1);

    app.dispose();
  });

  it("pause() and resume() publish the corresponding bus events", () => {
    const app = makeApp();
    const onPaused = vi.fn();
    const onResumed = vi.fn();
    app.getEvents().subscribe("clock:paused", onPaused);
    app.getEvents().subscribe("clock:resumed", onResumed);

    app.resume();
    expect(onResumed).toHaveBeenCalledTimes(1);

    app.pause();
    expect(onPaused).toHaveBeenCalledTimes(1);

    app.dispose();
  });

  it("setSpeed(2) halves the ms-per-tick so twice as many ticks accumulate", () => {
    const app = makeApp();
    app.start();
    app.resume();

    scheduler.runNext(0);
    app.setSpeed(2);

    scheduler.runNext(500);
    expect(app.getClock().getTick()).toBe(1);

    app.dispose();
  });

  it("setSpeed() resets the accumulator to prevent a phantom burst", () => {
    const app = makeApp();
    app.start();
    app.resume();

    scheduler.runNext(0);
    scheduler.runNext(800);
    expect(app.getClock().getTick()).toBe(0);

    app.setSpeed(1);

    scheduler.runNext(900);
    expect(app.getClock().getTick()).toBe(0);

    app.dispose();
  });

  it("tick:after events are delivered to subscribers on each tick", () => {
    const app = makeApp();
    const onTick = vi.fn();
    app.getEvents().subscribe("tick:after", onTick);
    app.start();
    app.resume();

    scheduler.runNext(0);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1);
    scheduler.runNext(MS_PER_TICK_AT_SPEED_1 * 2);

    expect(onTick).toHaveBeenCalledTimes(2);

    app.dispose();
  });

  it("dispose() clears all subscriptions; no further events are delivered", () => {
    const app = makeApp();
    const onTick = vi.fn();
    app.getEvents().subscribe("tick:after", onTick);
    app.start();

    scheduler.runNext(0);
    app.dispose();

    expect(onTick).not.toHaveBeenCalled();
  });
});







