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
import { loadBundledContent } from "@content/ContentLoader";
import { buildIndexedCatalog, type IndexedCatalog } from "@content/IndexedCatalog";
import { createCampaignState, type CampaignState, type ReadonlyCampaignState } from "@simulation/CampaignState";
import { isCheatsEnabled } from "@platform/CheatFlags";
import initialCentreMapJson from "@simulation/fixtures/initial-centre-map.json";
import initialInventoryJson from "@simulation/fixtures/initial-inventory.json";

/** additional events published by Application itself, beyond the clock's own events */
export type AppOwnEventMap = {
  /** fired after a cheat direct inventory mutation; lets panels refresh without waiting for the next tick */
  "inventory:changed": Readonly<{ resourceId: string; qty: number }>;
  /** fired after a cheat direct sector natural-state mutation (woodland, water, or a reserve) */
  "sector-natural:changed": Readonly<{ sectorId: string; field: "woodland" | "water" | "reserve"; resourceId?: string; qty: number }>;
};

/** merged event map for the application bus; grows as subsystems are added */
export type AppEventMap = SimClockEventMap & AppOwnEventMap;

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
  private readonly catalog: IndexedCatalog;
  private readonly campaignState: CampaignState;
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

    const loadResult = loadBundledContent();
    if (!loadResult.ok) {
      throw new Error(`content validation failed: ${loadResult.issues[0]?.message ?? "unknown error"}`);
    }
    const catalogResult = buildIndexedCatalog(loadResult.bundle);
    if (!catalogResult.ok) {
      throw new Error(`content semantic error: ${catalogResult.issues[0]?.message ?? "unknown error"}`);
    }
    this.catalog = catalogResult.catalog;
    this.campaignState = createCampaignState({ seed: 1 });

    // Fresh-map bootstrap comes directly from user-editable JSON fixture.
    const initialCentreMap = initialCentreMapJson as {
      readonly idCounters: { readonly sectors: number; readonly sites: number; readonly towns: number };
      readonly sectors: Readonly<Record<string, CampaignState["sectors"][string]>>;
      readonly sites: Readonly<Record<string, CampaignState["sites"][string]>>;
      readonly towns: Readonly<Record<string, CampaignState["towns"][string]>>;
    };
    this.campaignState.sectors = JSON.parse(JSON.stringify(initialCentreMap.sectors));
    this.campaignState.sites = JSON.parse(JSON.stringify(initialCentreMap.sites));
    this.campaignState.towns = JSON.parse(JSON.stringify(initialCentreMap.towns));
    this.campaignState.idCounters = {
      ...this.campaignState.idCounters,
      sectors: initialCentreMap.idCounters.sectors,
      sites: initialCentreMap.idCounters.sites,
      towns: initialCentreMap.idCounters.towns,
    };

    // Starting inventory is data-driven, same as the centre-map bootstrap above.
    const initialInventory = initialInventoryJson as { readonly quantities: Readonly<Record<string, number>> };
    for (const resourceId of Object.keys(initialInventory.quantities)) {
      if (!this.catalog.getResource(resourceId)) {
        throw new Error(`initial-inventory.json references unknown resource "${resourceId}"`);
      }
    }
    this.campaignState.inventory = JSON.parse(JSON.stringify(initialInventory)) as CampaignState["inventory"];
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

  /** returns the indexed content catalog; consumers must not mutate it */
  public getCatalog(): IndexedCatalog {
    return this.catalog;
  }

  /** returns a read-only snapshot of the current campaign state */
  public getCampaignState(): ReadonlyCampaignState {
    return this.campaignState;
  }

  /** cheat only: directly sets an inventory quantity, clamped to zero or above, ignoring every recipe, extraction, or import rule; does nothing unless cheats are enabled */
  public cheatSetInventoryQuantity(resourceId: string, qty: number): void {
    if (!isCheatsEnabled()) return;
    if (!this.catalog.getResource(resourceId)) {
      throw new Error(`cheatSetInventoryQuantity: unknown resource "${resourceId}"`);
    }
    const clamped = Math.max(0, qty);
    this.campaignState.inventory = {
      quantities: { ...this.campaignState.inventory.quantities, [resourceId]: clamped },
    };
    this.bus.publish("inventory:changed", { resourceId, qty: clamped });
  }

  /** cheat only: directly sets a sector's innate woodland biomass (kg), clamped to zero or above; does nothing unless cheats are enabled */
  public cheatSetSectorWoodlandBiomass(sectorId: string, biomassKg: number): void {
    if (!isCheatsEnabled()) return;
    const sector = this.requireSector(sectorId, "cheatSetSectorWoodlandBiomass");
    const clamped = Math.max(0, biomassKg);
    this.setSectorNatural(sectorId, { ...sector.natural, innateWoodlandBiomassKg: clamped });
    this.bus.publish("sector-natural:changed", { sectorId, field: "woodland", qty: clamped });
  }

  /** cheat only: directly sets a sector's local water stock (cubic meters), clamped to zero or above; does nothing unless cheats are enabled */
  public cheatSetSectorWaterStock(sectorId: string, waterM3: number): void {
    if (!isCheatsEnabled()) return;
    const sector = this.requireSector(sectorId, "cheatSetSectorWaterStock");
    const clamped = Math.max(0, waterM3);
    this.setSectorNatural(sectorId, { ...sector.natural, waterStockM3: clamped });
    this.bus.publish("sector-natural:changed", { sectorId, field: "water", qty: clamped });
  }

  /** cheat only: directly sets one of a sector's finite reserve quantities, clamped to zero or above, and marks it surveyed; does nothing unless cheats are enabled */
  public cheatSetSectorReserveQuantity(sectorId: string, resourceId: string, qty: number): void {
    if (!isCheatsEnabled()) return;
    const sector = this.requireSector(sectorId, "cheatSetSectorReserveQuantity");
    if (!this.catalog.getResource(resourceId)) {
      throw new Error(`cheatSetSectorReserveQuantity: unknown resource "${resourceId}"`);
    }
    const clamped = Math.max(0, qty);
    this.setSectorNatural(sectorId, {
      ...sector.natural,
      reserves: { ...sector.natural.reserves, [resourceId]: { remainingQuantity: clamped, surveyed: true } },
    });
    this.bus.publish("sector-natural:changed", { sectorId, field: "reserve", resourceId, qty: clamped });
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

  /** returns the named sector or throws; shared by every cheatSetSector* method */
  private requireSector(sectorId: string, callerName: string): CampaignState["sectors"][string] {
    const sector = this.campaignState.sectors[sectorId];
    if (!sector) {
      throw new Error(`${callerName}: unknown sector "${sectorId}"`);
    }
    return sector;
  }

  /** replaces one sector's natural-state record; shared by every cheatSetSector* method */
  private setSectorNatural(sectorId: string, natural: CampaignState["sectors"][string]["natural"]): void {
    const sector = this.campaignState.sectors[sectorId];
    if (!sector) return; // callers already validated via requireSector
    this.campaignState.sectors = {
      ...this.campaignState.sectors,
      [sectorId]: { ...sector, natural },
    };
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
