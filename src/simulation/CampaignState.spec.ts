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
    expect(idCounters.towns).toBe(0);
    expect(idCounters.sites).toBe(0);
    expect(idCounters.facilities).toBe(0);
    expect(idCounters.plantedForests).toBe(0);
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
    expect(Object.keys(state.sites)).toHaveLength(0);
    expect(Object.keys(state.facilities)).toHaveLength(0);
    expect(Object.keys(state.plantedForests)).toHaveLength(0);
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

describe("sector natural state and planted forests", () => {
  it("a sector's finite reserves are addressed by resourceId only, with no deposit runtime ID", () => {
    const state = createCampaignState({ seed: 1 });
    state.sectors = {
      "sector:1": {
        id: "sector:1",
        definitionId: "centre",
        accessState: "buildable",
        presentationCells: [],
        natural: {
          innateWoodlandBiomassKg: 400,
          waterStockM3: null,
          reserves: {
            "iron-ore": { remainingQuantity: 5000, surveyed: true },
          },
        },
      },
    };
    const reserve = state.sectors["sector:1"]?.natural.reserves["iron-ore"];
    expect(reserve?.remainingQuantity).toBe(5000);
    expect(reserve?.surveyed).toBe(true);
    // addressed by (sectorId, resourceId) — the record key is the resourceId, not a separate deposit ID
    expect(Object.keys(state.sectors["sector:1"]?.natural.reserves ?? {})).toEqual(["iron-ore"]);
  });

  it("plantedForests collection is keyed by planted-forest ID and starts empty", () => {
    const state = createCampaignState({ seed: 1 });
    expect(state.plantedForests).toEqual({});
    state.plantedForests = {
      "planted-forest:1": {
        id: "planted-forest:1",
        sectorId: "sector:1",
        profileId: "standard-planted-forest",
        col: 4,
        row: 4,
        plantedAtTick: 10,
        currentBiomassKg: 50,
        managementPolicy: "rotation",
      },
    };
    expect(Object.keys(state.plantedForests)).toHaveLength(1);
    expect(state.plantedForests["planted-forest:1"]?.sectorId).toBe("sector:1");
  });

  it("planted forest and sector natural state round-trip through serialize/deserialize", () => {
    const state = createCampaignState({ seed: 3 });
    state.sectors = {
      "sector:1": {
        id: "sector:1",
        definitionId: "centre",
        accessState: "buildable",
        presentationCells: [],
        natural: { innateWoodlandBiomassKg: 100, waterStockM3: 200, reserves: {} },
      },
    };
    state.plantedForests = {
      "planted-forest:1": {
        id: "planted-forest:1",
        sectorId: "sector:1",
        profileId: "standard-planted-forest",
        col: 1,
        row: 1,
        plantedAtTick: 0,
        currentBiomassKg: 10,
        managementPolicy: "selective",
      },
    };
    const restored = deserializeCampaignState(serializeCampaignState(state));
    expect(restored.sectors["sector:1"]?.natural).toEqual(state.sectors["sector:1"]?.natural);
    expect(restored.plantedForests).toEqual(state.plantedForests);
  });
});


