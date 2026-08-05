import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_STATE_VERSION,
  createCampaignState,
  serializeCampaignState,
  deserializeCampaignState,
} from "./CampaignState";

describe("createCampaignState", () => {
  it("sets the correct version and seed", () => {
    const state = createCampaignState({ seed: 42 });
    expect(state.version).toBe(CAMPAIGN_STATE_VERSION);
    expect(state.seed).toBe(42);
  });

  it("initializes rng state from the seed", () => {
    const state = createCampaignState({ seed: 99 });
    expect(state.rng.s).toBe(99);
  });

  it("starts the clock at tick 0, paused, at speed 1", () => {
    const state = createCampaignState({ seed: 1 });
    expect(state.clock.tick).toBe(0);
    expect(state.clock.gameTime).toBe(0);
    expect(state.clock.paused).toBe(true);
    expect(state.clock.speed).toBe(1);
  });

  it("initializes all id counters at zero", () => {
    const { idCounters } = createCampaignState({ seed: 1 });
    expect(idCounters.sectors).toBe(0);

    expect(idCounters.features).toBe(0);
    expect(idCounters.towns).toBe(0);
    expect(idCounters.facilities).toBe(0);
    expect(idCounters.contracts).toBe(0);
    expect(idCounters.constructionJobs).toBe(0);
  });

  it("defaults money to zero", () => {
    expect(createCampaignState({ seed: 1 }).money).toBe(0);
  });

  it("uses the provided startingMoney", () => {
    expect(createCampaignState({ seed: 1, startingMoney: 500 }).money).toBe(500);
  });

  it("initializes all entity collections as empty", () => {
    const state = createCampaignState({ seed: 1 });
    expect(Object.keys(state.sectors)).toHaveLength(0);
    expect(Object.keys(state.towns)).toHaveLength(0);
    expect(Object.keys(state.facilities)).toHaveLength(0);
    expect(Object.keys(state.contracts)).toHaveLength(0);
    expect(Object.keys(state.inventory.quantities)).toHaveLength(0);
  });

  it("initializes research with no completed nodes and no in-progress nodes", () => {
    const { research } = createCampaignState({ seed: 1 });
    expect(research.completed).toHaveLength(0);
    expect(Object.keys(research.progress)).toHaveLength(0);
  });

  it("initializes history as empty", () => {
    expect(createCampaignState({ seed: 1 }).history).toHaveLength(0);
  });
});

describe("serializeCampaignState / deserializeCampaignState", () => {
  it("round-trips through JSON", () => {
    const state = createCampaignState({ seed: 7, startingMoney: 250 });
    const restored = deserializeCampaignState(serializeCampaignState(state));
    expect(restored.seed).toBe(state.seed);
    expect(restored.money).toBe(state.money);
    expect(restored.version).toBe(state.version);
    expect(restored.clock).toEqual(state.clock);
    expect(restored.rng).toEqual(state.rng);
  });

  it("round-trips every sector feature variant", () => {
    const state = createCampaignState({ seed: 7 });
    state.sectors = {
      "sector:1": {
        id: "sector:1",
        definitionId: "centre",
        accessState: "buildable",
        features: [
          {
            id: "feature:1",
            kind: "woodland",
            origin: { col: 2, row: 3 },
            dimensions: { width: 2, height: 1 },
          },
          {
            id: "feature:2",
            kind: "town",
            townId: "town:1",
            origin: { col: 4, row: 5 },
            tier: 3,
          },
          {
            id: "feature:3",
            kind: "facility",
            facilityId: "facility:1",
            origin: { col: 6, row: 7 },
            dimensions: { width: 2, height: 1 },
          },
          {
            id: "feature:4",
            kind: "reservoir",
            cells: [{ col: 8, row: 7 }, { col: 9, row: 7 }],
          },
        ],
      },
    };
    const restored = deserializeCampaignState(serializeCampaignState(state));
    expect(restored.sectors).toEqual(state.sectors);
  });

  it("produces plain JSON-compatible data with no class instances", () => {
    const state = createCampaignState({ seed: 1 });
    const serialized = serializeCampaignState(state);
    expect(() => JSON.stringify(serialized)).not.toThrow();
    // plain object, not a class instance
    expect(Object.getPrototypeOf(serialized)).toBe(Object.prototype);
  });

  it("throws TypeError on null", () => {
    expect(() => deserializeCampaignState(null)).toThrow(TypeError);
  });

  it("throws TypeError on a non-object primitive", () => {
    expect(() => deserializeCampaignState("string")).toThrow(TypeError);
    expect(() => deserializeCampaignState(42)).toThrow(TypeError);
  });

  it("throws TypeError on mismatched version", () => {
    const raw = serializeCampaignState(createCampaignState({ seed: 1 })) as Record<string, unknown>;
    raw["version"] = 999;
    expect(() => deserializeCampaignState(raw)).toThrow(TypeError);
  });

  it("rejects version 5 saves without migration", () => {
    const raw = serializeCampaignState(createCampaignState({ seed: 1 })) as Record<string, unknown>;
    raw["version"] = 5;
    expect(() => deserializeCampaignState(raw)).toThrow(/expected 6, got 5/);
  });

  it("does not embed content definition catalogs in state", () => {
    // content bundles use array-of-definition shape; runtime entity maps are plain objects
    const serialized = serializeCampaignState(createCampaignState({ seed: 1 })) as Record<string, unknown>;
    expect(serialized).not.toHaveProperty("resources");
    expect(serialized).not.toHaveProperty("recipes");
    expect(serialized).not.toHaveProperty("researchNodes");
    // facility instances are keyed by id as an object, never a definition array
    expect(Array.isArray(serialized["facilities"])).toBe(false);
  });

  it("two campaigns with the same seed produce identical serialized states", () => {
    const a = serializeCampaignState(createCampaignState({ seed: 55 }));
    const b = serializeCampaignState(createCampaignState({ seed: 55 }));
    expect(a).toEqual(b);
  });
});


