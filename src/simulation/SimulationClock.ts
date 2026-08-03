// fixed deterministic simulation clock
// no dependency on requestAnimationFrame, DOM, or wall clock time

import { EventBus } from "@shared/EventBus";
import { type SimHours, simHours } from "@shared/units";
import type { JsonSerializable } from "@shared/JsonSerializable";

/** supported wall clock speed multipliers that the application driver may use */
export const SPEED_MULTIPLIERS = [1, 2, 4, 8] as const;
/** @see SPEED_MULTIPLIERS */
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

/** one game hour per tick */
export const TICK_DURATION_HOURS: SimHours = simHours(1);

/** plain data snapshot of the clock suitable for serialization */
export type ClockSerialState = {
  readonly tick: number;
  readonly gameTime: number; // SimHours brand is compile-time only
  readonly paused: boolean;
  readonly speed: SpeedMultiplier;
};

/** event payloads published by SimulationClock */
export type SimClockEventMap = {
  /** fired before game time advances; tick is the index of the tick about to run */
  "tick:before": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired after game time has advanced; gameTime is the new value */
  "tick:after": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired when the clock transitions from running to paused */
  "clock:paused": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired when the clock transitions from paused to running */
  "clock:resumed": Readonly<{ tick: number; gameTime: SimHours }>;
};

/**
 * fixed deterministic simulation clock
 *
 * each tick represents exactly one game hour; real time scheduling is the
 * responsibility of the application layer
 *
 * advanceTick is the only way to advance game time; it respects the paused
 * flag so call resume() before advancing in production code
 */
export class SimulationClock implements JsonSerializable<ClockSerialState> {
  private currentTick = 0;
  private currentGameTime: SimHours = simHours(0);
  private paused = false;
  private currentSpeed: SpeedMultiplier = 1;

  public constructor(private readonly bus: EventBus<SimClockEventMap>) {}

  /** number of completed ticks since clock creation */
  public getTick(): number {
    return this.currentTick;
  }

  /** current game time in hours */
  public getGameTime(): SimHours {
    return this.currentGameTime;
  }

  /** true while the clock is paused */
  public isPaused(): boolean {
    return this.paused;
  }

  /** current wall clock speed multiplier; the application driver respects this */
  public getSpeed(): SpeedMultiplier {
    return this.currentSpeed;
  }

  /** sets the wall clock speed multiplier */
  public setSpeed(multiplier: SpeedMultiplier): void {
    this.currentSpeed = multiplier;
  }

  /** pauses the clock; publishes "clock:paused" if it was running */
  public pause(): void {
    if (!this.paused) {
      this.paused = true;
      this.bus.publish("clock:paused", { tick: this.currentTick, gameTime: this.currentGameTime });
    }
  }

  /** resumes the clock; publishes "clock:resumed" if it was paused */
  public resume(): void {
    if (this.paused) {
      this.paused = false;
      this.bus.publish("clock:resumed", { tick: this.currentTick, gameTime: this.currentGameTime });
    }
  }

  /**
   * advances the clock by n ticks (default 1)
   *
   * each tick fires "tick:before", advances game time by one hour, then fires "tick:after"
   * does nothing when paused
   * @throws RangeError if n is negative, non-finite, or not an integer
   */
  public advanceTick(n = 1): void {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new RangeError(
        `tick count must be a finite non-negative integer, got ${n}`,
      );
    }
    if (this.paused) return;

    for (let i = 0; i < n; i++) {
      const tickIndex = this.currentTick;
      const timeBeforeTick = this.currentGameTime;

      this.bus.publish("tick:before", { tick: tickIndex, gameTime: timeBeforeTick });

      this.currentGameTime = simHours(this.currentGameTime + TICK_DURATION_HOURS);
      this.currentTick += 1;

      this.bus.publish("tick:after", { tick: tickIndex, gameTime: this.currentGameTime });
    }
  }

  /** returns a serializable snapshot of the current clock state */
  public getState(): ClockSerialState {
    return {
      tick: this.currentTick,
      gameTime: this.currentGameTime as number,
      paused: this.paused,
      speed: this.currentSpeed,
    };
  }

  /**
   * restores clock state from a snapshot
   * @throws RangeError if any field contains an invalid value
   */
  public restore(state: ClockSerialState): void {
    if (!Number.isFinite(state.tick) || state.tick < 0 || !Number.isInteger(state.tick)) {
      throw new RangeError(`invalid clock tick: ${state.tick}`);
    }
    if (!Number.isFinite(state.gameTime) || state.gameTime < 0) {
      throw new RangeError(`invalid clock gameTime: ${state.gameTime}`);
    }
    if (!(SPEED_MULTIPLIERS as readonly number[]).includes(state.speed)) {
      throw new RangeError(`invalid clock speed: ${state.speed}`);
    }
    this.currentTick = state.tick;
    this.currentGameTime = simHours(state.gameTime);
    this.paused = state.paused;
    this.currentSpeed = state.speed;
  }
}
