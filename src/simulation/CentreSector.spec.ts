import { describe, expect, it, beforeEach } from "vitest";
import { buildIndexedCatalog, loadBundledContent } from "@content";
import type { IndexedCatalog } from "@content";
import { createCampaignState } from "./CampaignState";
import type { CampaignState } from "./CampaignState";
import { CentreSectorError, createCentreSector, validateCentreMap } from "./CentreSector";
import initialCentreMapJson from "./fixtures/initial-centre-map.json";

function loadCatalog(): IndexedCatalog {
  const load = loadBundledContent();
  if (!load.ok) throw new Error(`content load failed: ${JSON.stringify(load.issues)}`);
  const result = buildIndexedCatalog(load.bundle);
  if (!result.ok) throw new Error(`catalog build failed: ${JSON.stringify(result.issues)}`);
  return result.catalog;
}

type MutableFixture = {
  idCounters: Record<string, number>;
  sectors: Record<string, {
    id: string;
    definitionId: string;
    accessState: string;
    features: Record<string, unknown>[];
  }>;
  towns: Record<string, { id: string; sectorId: string }>;
  facilities: Record<string, { id: string; sectorId: string; definitionId: string }>;
};

function mutableFixture(): MutableFixture {
  return structuredClone(initialCentreMapJson) as unknown as MutableFixture;
}

describe("createCentreSector", () => {
  let state: CampaignState;
  let catalog: IndexedCatalog;

  beforeEach(() => {
    state = createCampaignState({ seed: 1 });
    catalog = loadCatalog();
  });

  it("adds exactly one sector to campaign state", () => {
    createCentreSector(state, catalog);
    expect(Object.keys(state.sectors)).toHaveLength(1);
  });

  it("sector references the centre definition id", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    expect(sector?.definitionId).toBe("centre");
  });

  it("sector access state matches the definition's initialAccessState", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    expect(sector?.accessState).toBe("buildable");
  });

  it("adds exactly one town", () => {
    createCentreSector(state, catalog);
    expect(Object.keys(state.towns)).toHaveLength(1);
  });

  it("town is an independent entity with its own id", () => {
    createCentreSector(state, catalog);
    const town = Object.values(state.towns)[0];
    expect(town?.id).toBe("town:1");
  });

  it("town references the sector id, not embedded state", () => {
    createCentreSector(state, catalog);
    const sectorId = Object.keys(state.sectors)[0];
    const town = Object.values(state.towns)[0];
    if (!sectorId || !town) throw new Error("sector or town missing");
    expect(town.sectorId).toBe(sectorId);
  });

  it("towns belonging to the sector are discoverable from top-level town state", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    const townId = Object.keys(state.towns)[0];
    if (!sector || !townId) throw new Error("sector or town missing");
    const sectorTownIds = Object.values(state.towns)
      .filter(town => town.sectorId === sector.id)
      .map(town => town.id);
    expect(sectorTownIds).toContain(townId);
  });

  it("places the town through a sector feature", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    const townId = Object.keys(state.towns)[0];
    if (!sector) throw new Error("sector missing");
    if (!townId) throw new Error("town missing");
    const townFeatures = sector.features.filter(feature => feature.kind === "town");
    expect(townFeatures).toHaveLength(1);
    expect(townFeatures[0]).toMatchObject({
      id: "feature:2",
      kind: "town",
      townId,
      origin: { col: 6, row: 6 },
      tier: 1,
    });
  });

  it("groups the reservoir cells into one identified feature", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    if (!sector) throw new Error("sector missing");
    const reservoirs = sector.features.filter(feature => feature.kind === "reservoir");
    expect(reservoirs).toHaveLength(1);
    expect(reservoirs[0]?.id).toBe("feature:3");
    expect(reservoirs[0]?.cells).toHaveLength(5);
    expect(reservoirs[0]?.cells).toContainEqual({ col: 9, row: 4 });
    expect(reservoirs[0]?.cells).toContainEqual({ col: 10, row: 6 });
  });

  it("stores existing woodland as a physical feature", () => {
    createCentreSector(state, catalog);
    const sector = state.sectors["sector:1"];
    if (!sector) throw new Error("sector missing");
    expect(sector.features.filter(feature => feature.kind === "woodland")).toEqual([
      {
        id: "feature:1",
        kind: "woodland",
        origin: { col: 3, row: 8 },
        dimensions: { width: 1, height: 1 },
      },
    ]);
  });

  it("does not pre-author a waterwheel location or facility", () => {
    createCentreSector(state, catalog);
    const sector = state.sectors["sector:1"];
    if (!sector) throw new Error("sector missing");
    expect(sector.features.some(feature =>
      feature.kind !== "reservoir" && feature.origin.col === 8 && feature.origin.row === 5,
    )).toBe(false);
    expect(Object.keys(state.facilities)).toHaveLength(0);
  });

  it("idCounters are populated from fixture values", () => {
    createCentreSector(state, catalog);
    expect(state.idCounters.sectors).toBe(1);
    expect(state.idCounters.features).toBe(3);
    expect(state.idCounters.towns).toBe(1);
    expect(state.idCounters.facilities).toBe(0);
  });

  it("calling twice re-applies the same fixture state", () => {
    createCentreSector(state, catalog);
    createCentreSector(state, catalog);
    expect(Object.keys(state.sectors)).toEqual(["sector:1"]);
    expect(Object.keys(state.towns)).toEqual(["town:1"]);
    expect(Object.keys(state.facilities)).toEqual([]);
  });

  it("rejects a fixture whose sector definition is absent from the catalog", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const noSectors = buildIndexedCatalog({ ...load.bundle, sectors: [] });
    if (!noSectors.ok) throw new Error(JSON.stringify(noSectors.issues));
    expect(() => createCentreSector(state, noSectors.catalog)).toThrow(CentreSectorError);
  });

  it("accepts a constructed facility with one matching physical feature", () => {
    const fixture = mutableFixture();
    fixture.idCounters["features"] = 4;
    fixture.idCounters["facilities"] = 1;
    fixture.facilities["facility:1"] = {
      id: "facility:1",
      sectorId: "sector:1",
      definitionId: "waterwheel",
    };
    fixture.sectors["sector:1"]?.features.push({
      id: "feature:4",
      kind: "facility",
      facilityId: "facility:1",
      origin: { col: 8, row: 5 },
      dimensions: { width: 1, height: 1 },
    });
    expect(() => validateCentreMap(fixture, catalog)).not.toThrow();
  });

  it("rejects a facility feature with a dangling reference", () => {
    const fixture = mutableFixture();
    fixture.idCounters["features"] = 4;
    fixture.sectors["sector:1"]?.features.push({
      id: "feature:4",
      kind: "facility",
      facilityId: "facility:999",
      origin: { col: 8, row: 5 },
      dimensions: { width: 1, height: 1 },
    });
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/unknown facility/);
  });

  it("rejects regular feature footprints outside the sector", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features[0];
    if (!feature) throw new Error("feature missing");
    feature["origin"] = { col: 11, row: 8 };
    feature["dimensions"] = { width: 2, height: 1 };
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/complete footprint/);
  });

  it("rejects nonpositive feature dimensions", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features[0];
    if (!feature) throw new Error("feature missing");
    feature["dimensions"] = { width: 0, height: 1 };
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/positive integer/);
  });

  it("rejects invalid town tiers", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features.find(item => item["kind"] === "town");
    if (!feature) throw new Error("town feature missing");
    feature["tier"] = 7;
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/1 through 6/);
  });

  it("rejects duplicate cells inside a reservoir", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features.find(item => item["kind"] === "reservoir");
    if (!feature) throw new Error("reservoir feature missing");
    feature["cells"] = [{ col: 1, row: 1 }, { col: 1, row: 1 }];
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/duplicates another cell/);
  });

  it("rejects overlapping features", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features.find(item => item["kind"] === "reservoir");
    if (!feature) throw new Error("reservoir feature missing");
    feature["cells"] = [{ col: 6, row: 6 }];
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/overlaps another feature/);
  });

  it("rejects dangling feature references", () => {
    const fixture = mutableFixture();
    const feature = fixture.sectors["sector:1"]?.features.find(item => item["kind"] === "town");
    if (!feature) throw new Error("town feature missing");
    feature["townId"] = "town:999";
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/unknown town/);
  });

  it("rejects counters lower than fixture ids", () => {
    const fixture = mutableFixture();
    fixture.idCounters["features"] = 2;
    expect(() => validateCentreMap(fixture, catalog)).toThrow(/idCounters.features must be at least 3/);
  });

  it("state serializes cleanly after creation", () => {
    createCentreSector(state, catalog);
    expect(() => JSON.stringify(state)).not.toThrow();
  });
});



