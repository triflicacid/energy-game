import { describe, expect, it, beforeEach } from "vitest";
import { buildIndexedCatalog, loadBundledContent } from "@content";
import type { IndexedCatalog } from "@content";
import { createCampaignState } from "./CampaignState";
import type { CampaignState } from "./CampaignState";
import { createCentreSector, CentreSectorError } from "./CentreSector";

// load and validate the real bundled content once for all tests
function loadCatalog(): IndexedCatalog {
  const load = loadBundledContent();
  if (!load.ok) throw new Error(`content load failed: ${JSON.stringify(load.issues)}`);
  const result = buildIndexedCatalog(load.bundle);
  if (!result.ok) throw new Error(`catalog build failed: ${JSON.stringify(result.issues)}`);
  return result.catalog;
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

  it("adds a forest site and a waterwheel site", () => {
    createCentreSector(state, catalog);
    const allTags = Object.values(state.sites).flatMap((s) => s.tags);
    expect(allTags).toContain("forest");
    expect(allTags).toContain("waterwheel-site");
  });

  it("sector siteIds match the created site entries", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    if (!sector) throw new Error("sector missing");
    for (const siteId of sector.siteIds) {
      expect(state.sites[siteId]).toBeDefined();
    }
    expect(sector.siteIds.length).toBe(Object.keys(state.sites).length);
  });

  it("each site references the sector id", () => {
    createCentreSector(state, catalog);
    const sectorId = Object.keys(state.sectors)[0];
    if (!sectorId) throw new Error("sector id missing");
    for (const site of Object.values(state.sites)) {
      expect(site.sectorId).toBe(sectorId);
    }
  });

  it("each site has no facility assigned initially", () => {
    createCentreSector(state, catalog);
    for (const site of Object.values(state.sites)) {
      expect(site.facilityId).toBeNull();
    }
  });

  it("adds exactly one town", () => {
    createCentreSector(state, catalog);
    expect(Object.keys(state.towns)).toHaveLength(1);
  });

  it("town is an independent entity with its own id", () => {
    createCentreSector(state, catalog);
    const town = Object.values(state.towns)[0];
    expect(typeof town?.id).toBe("string");
    expect(town?.id.length).toBeGreaterThan(0);
  });

  it("town references the sector id, not embedded state", () => {
    createCentreSector(state, catalog);
    const sectorId = Object.keys(state.sectors)[0];
    const town = Object.values(state.towns)[0];
    if (!sectorId || !town) throw new Error("sector or town missing");
    expect(town.sectorId).toBe(sectorId);
  });

  it("sector townIds contains the town id", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    const townId = Object.keys(state.towns)[0];
    if (!sector || !townId) throw new Error("sector or town missing");
    expect(sector.townIds).toContain(townId);
  });

  it("idCounters are advanced after creation", () => {
    createCentreSector(state, catalog);
    expect(state.idCounters.sectors).toBeGreaterThan(0);
    expect(state.idCounters.sites).toBeGreaterThan(0);
    expect(state.idCounters.towns).toBeGreaterThan(0);
  });

  it("calling twice produces two sectors with different ids", () => {
    createCentreSector(state, catalog);
    createCentreSector(state, catalog);
    expect(Object.keys(state.sectors)).toHaveLength(2);
    const ids = Object.keys(state.sectors);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("throws CentreSectorError when the centre definition is absent", () => {
    // build a catalog without any sectors
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const noSectors = buildIndexedCatalog({ ...load.bundle, sectors: [] });
    if (!noSectors.ok) throw new Error(JSON.stringify(noSectors.issues));
    expect(() => createCentreSector(state, noSectors.catalog)).toThrow(CentreSectorError);
  });

  it("throws CentreSectorError when a site template uses an unknown tag", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    // inject a sector def with an unknown tag, bypassing semantic validation
    // by directly constructing a catalog-like object
    const manipulatedCatalog = {
      ...catalog,
      sectors: new Map([
        ["centre", {
          id: "centre",
          name: "Test",
          biome: "temperate",
          distanceFromCentre: 0,
          siteTemplates: [{ templateId: "bad-site", tags: ["mystery-tag-xyz"] }],
          hasTown: false,
          initialAccessState: "buildable" as const,
        }],
      ]),
    } as unknown as IndexedCatalog;
    expect(() => createCentreSector(state, manipulatedCatalog)).toThrow(CentreSectorError);
  });

  it("state serializes cleanly after creation", () => {
    createCentreSector(state, catalog);
    expect(() => JSON.stringify(state)).not.toThrow();
  });
});



