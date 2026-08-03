import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@shared/EventBus";
import {
  SimulationClock,
  type SimClockEventMap,
  TICK_DURATION_HOURS,
  SPEED_MULTIPLIERS,
} from "./SimulationClock";
import { simHours } from "@shared/units";

function makeClock() {
  const bus = new EventBus<SimClockEventMap>();
  const clock = new SimulationClock(bus);
  return { clock, bus };
}

describe("SimulationClock — initial state", () => {
  it("starts at tick 0 and gameTime 0", () => {
    const { clock } = makeClock();
    expect(clock.getTick()).toBe(0);
    expect(clock.getGameTime()).toBe(simHours(0));
  });

  it("starts unpaused at speed 1", () => {
    const { clock } = makeClock();
    expect(clock.isPaused()).toBe(false);
    expect(clock.getSpeed()).toBe(1);
  });
});

describe("SimulationClock — advanceTick", () => {
  it("advances tick and gameTime by one per call", () => {
    const { clock } = makeClock();
    clock.advanceTick();
    expect(clock.getTick()).toBe(1);
    expect(clock.getGameTime()).toBe(simHours(1));
  });

  it("advances multiple ticks at once", () => {
    const { clock } = makeClock();
    clock.advanceTick(3);
    expect(clock.getTick()).toBe(3);
    expect(clock.getGameTime()).toBe(simHours(3));
  });

  it("advancing zero ticks is a no-op", () => {
    const { clock } = makeClock();
    clock.advanceTick(0);
    expect(clock.getTick()).toBe(0);
    expect(clock.getGameTime()).toBe(simHours(0));
  });

  it("each tick advances game time by TICK_DURATION_HOURS (1 hour)", () => {
    const { clock } = makeClock();
    clock.advanceTick(10);
    expect(clock.getGameTime()).toBe(simHours(10) * TICK_DURATION_HOURS);
  });

  it("equal tick sequences produce equal state", () => {
    const { clock: a } = makeClock();
    const { clock: b } = makeClock();
    a.advanceTick(5);
    b.advanceTick(3);
    b.advanceTick(2);
    expect(a.getTick()).toBe(b.getTick());
    expect(a.getGameTime()).toBe(b.getGameTime());
  });
});

describe("SimulationClock — advanceTick validation", () => {
  it("throws on negative tick count", () => {
    const { clock } = makeClock();
    expect(() => clock.advanceTick(-1)).toThrow(RangeError);
  });

  it("throws on non-finite tick count (Infinity)", () => {
    const { clock } = makeClock();
    expect(() => clock.advanceTick(Infinity)).toThrow(RangeError);
  });

  it("throws on non-finite tick count (NaN)", () => {
    const { clock } = makeClock();
    expect(() => clock.advanceTick(NaN)).toThrow(RangeError);
  });

  it("throws on fractional tick count", () => {
    const { clock } = makeClock();
    expect(() => clock.advanceTick(1.5)).toThrow(RangeError);
  });
});

describe("SimulationClock — pause / resume", () => {
  it("pause stops tick advancement", () => {
    const { clock } = makeClock();
    clock.pause();
    clock.advanceTick(5);
    expect(clock.getTick()).toBe(0);
    expect(clock.getGameTime()).toBe(simHours(0));
    expect(clock.isPaused()).toBe(true);
  });

  it("resume allows tick advancement again", () => {
    const { clock } = makeClock();
    clock.pause();
    clock.advanceTick(5);
    clock.resume();
    clock.advanceTick(3);
    expect(clock.getTick()).toBe(3);
    expect(clock.getGameTime()).toBe(simHours(3));
  });

  it("pausing an already-paused clock is idempotent", () => {
    const { clock, bus } = makeClock();
    const handler = vi.fn();
    bus.subscribe("clock:paused", handler);
    clock.pause();
    clock.pause();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("resuming a running clock is idempotent", () => {
    const { clock, bus } = makeClock();
    const handler = vi.fn();
    bus.subscribe("clock:resumed", handler);
    clock.resume();
    clock.resume();
    expect(handler).toHaveBeenCalledTimes(0);
  });
});

describe("SimulationClock — events", () => {
  it("publishes tick:before before game time advances", () => {
    const { clock, bus } = makeClock();
    const beforeTimes: number[] = [];
    bus.subscribe("tick:before", ({ gameTime }) => beforeTimes.push(gameTime));
    clock.advanceTick(2);
    expect(beforeTimes).toEqual([simHours(0), simHours(1)]);
  });

  it("publishes tick:after after game time advances", () => {
    const { clock, bus } = makeClock();
    const afterTimes: number[] = [];
    bus.subscribe("tick:after", ({ gameTime }) => afterTimes.push(gameTime));
    clock.advanceTick(2);
    expect(afterTimes).toEqual([simHours(1), simHours(2)]);
  });

  it("tick:before fires before tick:after for each tick", () => {
    const { clock, bus } = makeClock();
    const order: string[] = [];
    bus.subscribe("tick:before", ({ tick }) => order.push(`before:${tick}`));
    bus.subscribe("tick:after", ({ tick }) => order.push(`after:${tick}`));
    clock.advanceTick(2);
    expect(order).toEqual(["before:0", "after:0", "before:1", "after:1"]);
  });

  it("publishes clock:paused on transition to paused", () => {
    const { clock, bus } = makeClock();
    const events: { tick: number }[] = [];
    bus.subscribe("clock:paused", (e) => events.push(e));
    clock.advanceTick(2);
    clock.pause();
    expect(events).toHaveLength(1);
    expect(events[0].tick).toBe(2);
  });

  it("publishes clock:resumed on transition to running", () => {
    const { clock, bus } = makeClock();
    const events: { tick: number }[] = [];
    bus.subscribe("clock:resumed", (e) => events.push(e));
    clock.pause();
    clock.resume();
    expect(events).toHaveLength(1);
    expect(events[0].tick).toBe(0);
  });

  it("does not publish tick events while paused", () => {
    const { clock, bus } = makeClock();
    const handler = vi.fn();
    bus.subscribe("tick:before", handler);
    bus.subscribe("tick:after", handler);
    clock.pause();
    clock.advanceTick(3);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("SimulationClock — speed", () => {
  it("setSpeed stores the multiplier", () => {
    const { clock } = makeClock();
    for (const s of SPEED_MULTIPLIERS) {
      clock.setSpeed(s);
      expect(clock.getSpeed()).toBe(s);
    }
  });

  it("speed does not affect advanceTick directly (driver responsibility)", () => {
    const { clock } = makeClock();
    clock.setSpeed(8);
    clock.advanceTick(1);
    expect(clock.getTick()).toBe(1);
  });
});
