import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCheatsEnabled } from "@platform/CheatFlags";
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

  it("getCampaignState() returns a state with at least one sector after construction", () => {
    const app = makeApp();
    const state = app.getCampaignState();
    expect(Object.keys(state.sectors).length).toBeGreaterThan(0);
    app.dispose();
  });

  it("getCatalog() returns a catalog with the centre sector definition", () => {
    const app = makeApp();
    const catalog = app.getCatalog();
    expect(catalog.sectors.has("centre")).toBe(true);
    app.dispose();
  });

  it("getCampaignState() seeds the starting inventory from initial-inventory.json", () => {
    const app = makeApp();
    const { quantities } = app.getCampaignState().inventory;
    expect(quantities.timber).toBe(250);
    expect(quantities.lumber).toBe(100);
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

  describe("cheat methods", () => {
    afterEach(() => {
      setCheatsEnabled(false);
    });

    it("cheatSetInventoryQuantity is a no-op while cheats are disabled", () => {
      const app = makeApp();
      app.cheatSetInventoryQuantity("timber", 999);
      expect(app.getCampaignState().inventory.quantities.timber).toBe(250);
      app.dispose();
    });

    it("cheatSetInventoryQuantity sets a quantity, clamped to zero, and publishes inventory:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      const onChanged = vi.fn();
      app.getEvents().subscribe("inventory:changed", onChanged);

      app.cheatSetInventoryQuantity("timber", -5);
      expect(app.getCampaignState().inventory.quantities.timber).toBe(0);
      expect(onChanged).toHaveBeenCalledWith({ resourceId: "timber", qty: 0 });

      app.dispose();
    });

    it("cheatSetInventoryQuantity throws for an unknown resource", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatSetInventoryQuantity("not-a-real-resource", 1)).toThrow();
      app.dispose();
    });

    it("cheatSetSectorWoodlandBiomass is a no-op while cheats are disabled", () => {
      const app = makeApp();
      app.cheatSetSectorWoodlandBiomass("sector:1", 500);
      expect(app.getCampaignState().sectors["sector:1"].natural.innateWoodlandBiomassKg).toBeNull();
      app.dispose();
    });

    it("cheatSetSectorWoodlandBiomass sets biomass, clamped to zero, and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatSetSectorWoodlandBiomass("sector:1", -10);
      expect(app.getCampaignState().sectors["sector:1"].natural.innateWoodlandBiomassKg).toBe(0);
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "woodland", qty: 0 });

      app.dispose();
    });

    it("cheatSetSectorWoodlandBiomass throws for an unknown sector", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatSetSectorWoodlandBiomass("no-such-sector", 1)).toThrow();
      app.dispose();
    });

    it("cheatSetSectorWaterStock sets water stock, clamped to zero, and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatSetSectorWaterStock("sector:1", 1234);
      expect(app.getCampaignState().sectors["sector:1"].natural.waterStockM3).toBe(1234);
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "water", qty: 1234 });

      app.dispose();
    });

    it("setting one natural field leaves the others untouched", () => {
      const app = makeApp();
      setCheatsEnabled(true);

      app.cheatSetSectorReserveQuantity("sector:1", "timber", 50);
      app.cheatSetSectorWaterStock("sector:1", 10);

      const natural = app.getCampaignState().sectors["sector:1"].natural;
      expect(natural.reserves.timber).toEqual({ remainingQuantity: 50, surveyed: true });
      expect(natural.waterStockM3).toBe(10);

      app.dispose();
    });

    it("cheatSetSectorReserveQuantity sets a reserve, clamped to zero, marks it surveyed, and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatSetSectorReserveQuantity("sector:1", "timber", -3);
      const reserve = app.getCampaignState().sectors["sector:1"].natural.reserves.timber;
      expect(reserve).toEqual({ remainingQuantity: 0, surveyed: true });
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "reserve", resourceId: "timber", qty: 0 });

      app.dispose();
    });

    it("cheatSetSectorReserveQuantity throws for an unknown resource", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatSetSectorReserveQuantity("sector:1", "not-a-real-resource", 1)).toThrow();
      app.dispose();
    });

    it("cheatSetSectorReserveQuantity throws for an unknown sector", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatSetSectorReserveQuantity("no-such-sector", "timber", 1)).toThrow();
      app.dispose();
    });

    it("cheatClearSectorWoodlandBiomass is a no-op while cheats are disabled", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      app.cheatSetSectorWoodlandBiomass("sector:1", 500);
      setCheatsEnabled(false);

      app.cheatClearSectorWoodlandBiomass("sector:1");
      expect(app.getCampaignState().sectors["sector:1"].natural.innateWoodlandBiomassKg).toBe(500);

      app.dispose();
    });

    it("cheatClearSectorWoodlandBiomass resets biomass to null (not zero) and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      app.cheatSetSectorWoodlandBiomass("sector:1", 500);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatClearSectorWoodlandBiomass("sector:1");
      expect(app.getCampaignState().sectors["sector:1"].natural.innateWoodlandBiomassKg).toBeNull();
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "woodland", qty: 0 });

      app.dispose();
    });

    it("cheatClearSectorWoodlandBiomass throws for an unknown sector", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatClearSectorWoodlandBiomass("no-such-sector")).toThrow();
      app.dispose();
    });

    it("cheatClearSectorWaterStock resets water to null (not zero) and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      app.cheatSetSectorWaterStock("sector:1", 1200);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatClearSectorWaterStock("sector:1");
      expect(app.getCampaignState().sectors["sector:1"].natural.waterStockM3).toBeNull();
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "water", qty: 0 });

      app.dispose();
    });

    it("cheatClearSectorWaterStock throws for an unknown sector", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatClearSectorWaterStock("no-such-sector")).toThrow();
      app.dispose();
    });

    it("cheatRemoveSectorReserve deletes the entry entirely (not just zeroes it) and publishes sector-natural:changed", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      app.cheatSetSectorReserveQuantity("sector:1", "timber", 80);
      const onChanged = vi.fn();
      app.getEvents().subscribe("sector-natural:changed", onChanged);

      app.cheatRemoveSectorReserve("sector:1", "timber");
      expect(app.getCampaignState().sectors["sector:1"].natural.reserves.timber).toBeUndefined();
      expect(Object.hasOwn(app.getCampaignState().sectors["sector:1"].natural.reserves, "timber")).toBe(false);
      expect(onChanged).toHaveBeenCalledWith({ sectorId: "sector:1", field: "reserve", resourceId: "timber", qty: 0 });

      app.dispose();
    });

    it("cheatRemoveSectorReserve leaves other reserves untouched", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      app.cheatSetSectorReserveQuantity("sector:1", "timber", 80);
      app.cheatSetSectorReserveQuantity("sector:1", "lumber", 40);

      app.cheatRemoveSectorReserve("sector:1", "timber");
      expect(app.getCampaignState().sectors["sector:1"].natural.reserves.lumber).toEqual({
        remainingQuantity: 40,
        surveyed: true,
      });

      app.dispose();
    });

    it("cheatRemoveSectorReserve throws for an unknown sector", () => {
      const app = makeApp();
      setCheatsEnabled(true);
      expect(() => app.cheatRemoveSectorReserve("no-such-sector", "timber")).toThrow();
      app.dispose();
    });
  });
});







