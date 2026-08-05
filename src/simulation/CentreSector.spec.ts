import { describe, expect, it, beforeEach } from "vitest";
import { buildIndexedCatalog, loadBundledContent } from "@content";
import type { IndexedCatalog } from "@content";
import { createCampaignState } from "./CampaignState";
import type { CampaignState } from "./CampaignState";
import { createCentreSector } from "./CentreSector";

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

  it("sites belonging to the sector are discoverable from top-level site state", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    if (!sector) throw new Error("sector missing");
    const sectorSites = Object.values(state.sites).filter(site => site.sectorId === sector.id);
    expect(sectorSites).toHaveLength(Object.keys(state.sites).length);
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

  it("generates data-driven town presentation cells on the sector", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    const townId = Object.keys(state.towns)[0];
    if (!sector) throw new Error("sector missing");
    if (!townId) throw new Error("town missing");
    const townCells = sector.presentationCells.filter(c => c.kind === "town");
    expect(townCells).toHaveLength(1);
    expect(townCells[0]).toMatchObject({ kind: "town", townId, col: 6, row: 6, tier: 1 });
  });

  it("generates data-driven reservoir presentation cells on the sector", () => {
    createCentreSector(state, catalog);
    const sector = Object.values(state.sectors)[0];
    if (!sector) throw new Error("sector missing");
    const reservoirCells = sector.presentationCells.filter(c => c.kind === "reservoir");
    expect(reservoirCells).toHaveLength(5);
    expect(reservoirCells.some(c => c.col === 9 && c.row === 4 && c.kind === "reservoir")).toBe(true);
    expect(reservoirCells.some(c => c.col === 10 && c.row === 6 && c.kind === "reservoir")).toBe(true);
  });

  it("idCounters are populated from fixture values", () => {
    createCentreSector(state, catalog);
    expect(state.idCounters.sectors).toBe(1);
    expect(state.idCounters.sites).toBe(2);
    expect(state.idCounters.towns).toBe(1);
  });

  it("calling twice re-applies the same fixture state", () => {
    createCentreSector(state, catalog);
    createCentreSector(state, catalog);
    expect(Object.keys(state.sectors)).toEqual(["sector:1"]);
    expect(Object.keys(state.sites)).toEqual(["site:1", "site:2"]);
    expect(Object.keys(state.towns)).toEqual(["town:1"]);
  });

  it("does not depend on center sector definition presence in catalog", () => {
    // fixture copy intentionally ignores content-sector lookup during fresh-map bootstrap
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const noSectors = buildIndexedCatalog({ ...load.bundle, sectors: [] });
    if (!noSectors.ok) throw new Error(JSON.stringify(noSectors.issues));
    expect(() => createCentreSector(state, noSectors.catalog)).not.toThrow();
  });

  it("does not validate site tags against catalog during fixture copy", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    // inject bad sector data in catalog; fixture copy should remain unaffected
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
    expect(() => createCentreSector(state, manipulatedCatalog)).not.toThrow();
  });

  it("state serializes cleanly after creation", () => {
    createCentreSector(state, catalog);
    expect(() => JSON.stringify(state)).not.toThrow();
  });
});



