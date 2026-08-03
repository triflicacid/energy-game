// fixed deterministic simulation clock
// no dependency on requestAnimationFrame, DOM, or wall-clock

import { EventBus } from "@shared/EventBus";
import { type SimHours, simHours } from "@shared/units";

/** one game hour per tick */
export const TICK_DURATION_HOURS: SimHours = simHours(1);

/** supported wall-clock speed multipliers that the application driver may use */
export const SPEED_MULTIPLIERS = [1, 2, 4, 8] as const;
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

/** event payloads published by SimulationClock */
export interface SimClockEventMap {
  /** fired before game time advances; tick = index of the tick about to run */
  "tick:before": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired after game time has advanced; tick = same index, gameTime = new time */
  "tick:after": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired when the clock transitions from running to paused */
  "clock:paused": Readonly<{ tick: number; gameTime: SimHours }>;
  /** fired when the clock transitions from paused to running */
  "clock:resumed": Readonly<{ tick: number; gameTime: SimHours }>;
}

/**
 * Fixed deterministic simulation clock.
 *
 * Each tick represents exactly one game hour. Real-time scheduling is the
 * responsibility of the application layer.
 *
 * advanceTick(n) is the only way to advance game time. It respects the
 * paused flag, so call resume() before advancing in production code.
 * Tests that do not need to test pause semantics should leave the clock
 * unpaused (the default).
 */
export class SimulationClock {
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

  /** current wall-clock speed multiplier; the application driver respects this */
  public getSpeed(): SpeedMultiplier {
    return this.currentSpeed;
  }

  /** sets the wall-clock speed multiplier */
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
   * Advances the clock by n ticks (default 1).
   * Each tick fires "tick:before", advances game time by one hour, then fires "tick:after".
   * Does nothing when paused.
   * @throws if n is negative, non-finite, or not an integer
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

      // advance game time by one hour
      this.currentGameTime = simHours(this.currentGameTime + TICK_DURATION_HOURS);
      this.currentTick += 1;

      this.bus.publish("tick:after", { tick: tickIndex, gameTime: this.currentGameTime });
    }
  }
}
