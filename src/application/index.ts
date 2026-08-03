// application lifecycle, startup, and typed operations used by the ui
// not imported by simulation, content, or generation

import { EventBus } from "@shared/EventBus";
import type { Disposable } from "@shared/Disposable";
import {
  SimulationClock,
  type SimClockEventMap,
  type SpeedMultiplier,
} from "@simulation/SimulationClock";
import { FrameLoopController } from "@simulation/FrameLoopController";

/** merged event map for the application bus; grows as subsystems are added */
export type AppEventMap = SimClockEventMap;

/** real-time milliseconds that represent one simulation tick at speed 1 */
export const MS_PER_TICK_AT_SPEED_1 = 1_000;

/**
 * application shell: owns the event bus, simulation clock, and frame loop.
 *
 * the UI and rendering layers receive subscriptions through `events` and
 * read clock state directly; they must not publish on the bus or mutate
 * simulation state.
 */
export class Application implements Disposable {
  private readonly bus: EventBus<AppEventMap>;
  private readonly frameLoop: FrameLoopController;
  private readonly clock: SimulationClock;
  private accumulatedMs = 0;
  private lastTimestamp: number | null = null;
  private started = false;
  private disposed = false;

  public constructor(
    private readonly canvasEl: HTMLCanvasElement,
    private readonly uiRootEl: HTMLElement,
  ) {
    this.bus = new EventBus<AppEventMap>();
    this.clock = new SimulationClock(this.bus);
    this.clock.pause();
    this.frameLoop = new FrameLoopController(this.onFrame);
  }

  /** returns the canvas element this application renders into */
  public getCanvasEl(): HTMLCanvasElement {
    return this.canvasEl;
  }

  /** returns the DOM root for HTML UI panels */
  public getUiRootEl(): HTMLElement {
    return this.uiRootEl;
  }

  /**
   * returns a read-only subscription handle to the application event bus.
   * UI and rendering subscribe here; they must not publish through this handle.
   */
  public getEvents(): Pick<EventBus<AppEventMap>, "subscribe" | "once"> {
    return this.bus;
  }

  /** returns the simulation clock; consumers may read state but must not advance it */
  public getClock(): SimulationClock {
    return this.clock;
  }

  /** current measured rendering FPS (0 when the loop is not running) */
  public getFps(): number {
    return this.frameLoop.getActualFps();
  }

  /** starts the frame loop; subsequent calls are no-ops */
  public start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.frameLoop.start();
  }

  /** pauses the simulation clock; the frame loop continues for rendering */
  public pause(): void {
    this.clock.pause();
  }

  /** resumes the simulation clock */
  public resume(): void {
    this.clock.resume();
  }

  /**
   * changes the wall-clock speed multiplier and resets the tick accumulator
   * so the change takes effect from the next frame without a phantom burst of ticks
   */
  public setSpeed(speed: SpeedMultiplier): void {
    this.clock.setSpeed(speed);
    this.accumulatedMs = 0;
  }

  /**
   * disposes the application: cancels the frame loop, clears all event
   * subscriptions, and releases resources.  calling more than once is safe.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frameLoop.isActive()) {
      this.frameLoop.stop();
    }
    this.bus.dispose();
  }

  private readonly onFrame = (timestamp: number): void => {
    if (this.disposed) return;

    if (this.lastTimestamp !== null && !this.clock.isPaused()) {
      const elapsed = timestamp - this.lastTimestamp;
      const msPerTick = MS_PER_TICK_AT_SPEED_1 / this.clock.getSpeed();
      this.accumulatedMs += elapsed;

      const ticksToRun = Math.floor(this.accumulatedMs / msPerTick);
      if (ticksToRun > 0) {
        this.accumulatedMs -= ticksToRun * msPerTick;
        this.clock.advanceTick(ticksToRun);
      }
    }

    // always update lastTimestamp so pausing does not cause a burst of ticks on resume
    this.lastTimestamp = timestamp;
  };
}

/** creates and returns a new Application bound to the given DOM elements */
export function createApplication(
  canvas: HTMLCanvasElement,
  uiRoot: HTMLElement,
): Application {
  return new Application(canvas, uiRoot);
}
