import { describe, it, expect } from "vitest";
import { buildIndexedCatalog, loadBundledContent } from "@content";
import type { IndexedCatalog } from "@content";
import { createCampaignState } from "@simulation/CampaignState";
import type { CampaignState } from "@simulation/CampaignState";
import { createCentreSector } from "@simulation/CentreSector";
import {
  projectSectorScene,
  SceneProjectionError,
  type TownPresentationLayouts,
} from "./SceneProjector";

function loadCatalog(): IndexedCatalog {
  const load = loadBundledContent();
  if (!load.ok) throw new Error(`content load failed: ${JSON.stringify(load.issues)}`);
  const result = buildIndexedCatalog(load.bundle);
  if (!result.ok) throw new Error(`catalog build failed: ${JSON.stringify(result.issues)}`);
  return result.catalog;
}

function setupState(): { state: CampaignState; catalog: IndexedCatalog; sectorId: string } {
  const catalog = loadCatalog();
  const state = createCampaignState({ seed: 1 });
  createCentreSector(state, catalog);
  const sectorId = Object.keys(state.sectors)[0];
  if (!sectorId) throw new Error("createCentreSector did not create a sector");
  return { state, catalog, sectorId };
}

describe("projectSectorScene — biomes", () => {
  it("fills every cell of the sector with a biome tile", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    const diameter = catalog.sectors.get("centre")?.diameter ?? 0;
    expect(scene.biomes).toHaveLength(diameter * diameter);
    expect(scene.cols).toBe(diameter);
    expect(scene.rows).toBe(diameter);
  });

  it("uses biome-temperate for the temperate centre sector", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    expect(scene.biomes.every(c => c.spriteId === "biome-temperate")).toBe(true);
  });

  it("biome tiles cover every (col, row) in [0, diameter)", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    const diameter = catalog.sectors.get("centre")?.diameter ?? 0;
    const cells = new Set(scene.biomes.map(c => `${c.col},${c.row}`));
    for (let row = 0; row < diameter; row++) {
      for (let col = 0; col < diameter; col++) {
        expect(cells.has(`${col},${row}`)).toBe(true);
      }
    }
  });
});

describe("projectSectorScene — entities", () => {
  it("emits a forest-site entity for the forest site", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    expect(scene.entities.some(c => c.spriteId === "forest-site")).toBe(true);
  });

  it("places the forest at the correct grid cell from the template offset", () => {
    // centre-forest-1: x=-3, y=2; diameter=12, half=6 → col=3, row=8
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    const forest = scene.entities.find(c => c.spriteId === "forest-site");
    expect(forest).toBeDefined();
    expect(forest?.col).toBe(3);
    expect(forest?.row).toBe(8);
  });

  it("emits a town entity", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    expect(scene.entities.some(c => c.spriteId === "town")).toBe(true);
  });

  it("places the town at the default layout cell (6, 6) for the centre sector", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    const town = scene.entities.find(c => c.spriteId === "town");
    expect(town).toBeDefined();
    expect(town?.col).toBe(6);
    expect(town?.row).toBe(6);
  });

  it("does not emit any entity for the waterwheel-site when no facility is built", () => {
    const { state, catalog, sectorId } = setupState();
    // centre-waterwheel-1: x=2, y=-1 → col=8, row=5
    const scene = projectSectorScene(sectorId, state, catalog);
    const atWaterwheelCell = scene.entities.filter(c => c.col === 8 && c.row === 5);
    expect(atWaterwheelCell).toHaveLength(0);
  });

  it("does not emit a placeholder entity for empty suitability sites", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    const unexpected = scene.entities.filter(
      c => c.spriteId !== "forest-site" && c.spriteId !== "town",
    );
    expect(unexpected).toHaveLength(0);
  });
});

describe("projectSectorScene — facilities", () => {
  it("emits no facility sprites when no facilities are built", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    expect(scene.facilities).toHaveLength(0);
  });

  it("emits a waterwheel sprite when a waterwheel facility is at the waterwheel site", () => {
    const { state, catalog, sectorId } = setupState();
    const waterwheelSite = Object.values(state.sites).find(s => s.tags.includes("waterwheel-site"));
    if (!waterwheelSite) throw new Error("waterwheel site missing from state");

    const facilityId = "facility:1";
    const stateWithFacility: CampaignState = {
      ...state,
      sites: {
        ...state.sites,
        [waterwheelSite.id]: { ...waterwheelSite, facilityId },
      },
      facilities: {
        [facilityId]: { id: facilityId, definitionId: "waterwheel", siteId: waterwheelSite.id },
      },
    };

    const scene = projectSectorScene(sectorId, stateWithFacility, catalog);
    expect(scene.facilities.some(c => c.spriteId === "waterwheel")).toBe(true);
  });

  it("places the waterwheel facility at the correct cell (col=8, row=5)", () => {
    const { state, catalog, sectorId } = setupState();
    const waterwheelSite = Object.values(state.sites).find(s => s.tags.includes("waterwheel-site"));
    if (!waterwheelSite) throw new Error("waterwheel site missing");
    const facilityId = "facility:1";
    const stateWithFacility: CampaignState = {
      ...state,
      sites: { ...state.sites, [waterwheelSite.id]: { ...waterwheelSite, facilityId } },
      facilities: { [facilityId]: { id: facilityId, definitionId: "waterwheel", siteId: waterwheelSite.id } },
    };
    const scene = projectSectorScene(sectorId, stateWithFacility, catalog);
    const ww = scene.facilities.find(c => c.spriteId === "waterwheel");
    expect(ww).toBeDefined();
    // centre-waterwheel-1: x=2, y=-1; half=6 → col=8, row=5
    expect(ww?.col).toBe(8);
    expect(ww?.row).toBe(5);
  });

  it("emits no facility sprite for a definition without a spriteId", () => {
    const { state, catalog, sectorId } = setupState();
    const forestSite = Object.values(state.sites).find(s => s.tags.includes("forest"));
    if (!forestSite) throw new Error("forest site missing");
    const facilityId = "facility:1";
    const stateWithFacility: CampaignState = {
      ...state,
      sites: { ...state.sites, [forestSite.id]: { ...forestSite, facilityId } },
      facilities: { [facilityId]: { id: facilityId, definitionId: "forestry-operation", siteId: forestSite.id } },
    };
    const scene = projectSectorScene(sectorId, stateWithFacility, catalog);
    expect(scene.facilities).toHaveLength(0);
  });
});

describe("projectSectorScene — determinism", () => {
  it("equal state and catalog produce deeply equal scenes", () => {
    const { state, catalog, sectorId } = setupState();
    const scene1 = projectSectorScene(sectorId, state, catalog);
    const scene2 = projectSectorScene(sectorId, state, catalog);
    expect(scene1).toEqual(scene2);
  });

  it("reversing the site record order does not change the output", () => {
    const { state, catalog, sectorId } = setupState();
    const scene1 = projectSectorScene(sectorId, state, catalog);

    const reversedSites = Object.fromEntries(Object.entries(state.sites).reverse());
    const stateReversed: CampaignState = { ...state, sites: reversedSites };
    const scene2 = projectSectorScene(sectorId, stateReversed, catalog);

    expect(scene1).toEqual(scene2);
  });

  it("reversing the town id array does not change the output", () => {
    const { state, catalog, sectorId } = setupState();
    const sector = state.sectors[sectorId];
    if (!sector) throw new Error("sector missing");
    const stateReversed: CampaignState = {
      ...state,
      sectors: {
        ...state.sectors,
        [sectorId]: { ...sector, townIds: [...sector.townIds].reverse() },
      },
    };
    const scene1 = projectSectorScene(sectorId, state, catalog);
    const scene2 = projectSectorScene(sectorId, stateReversed, catalog);
    expect(scene1).toEqual(scene2);
  });

  it("biomes are sorted row-major (row asc, col asc)", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    for (let i = 1; i < scene.biomes.length; i++) {
      const prev = scene.biomes[i - 1];
      const curr = scene.biomes[i];
      if (!prev || !curr) continue;
      const prevKey = prev.row * 1000 + prev.col;
      const currKey = curr.row * 1000 + curr.col;
      expect(currKey).toBeGreaterThanOrEqual(prevKey);
    }
  });

  it("entities are sorted row asc, col asc, spriteId asc", () => {
    const { state, catalog, sectorId } = setupState();
    const scene = projectSectorScene(sectorId, state, catalog);
    for (let i = 1; i < scene.entities.length; i++) {
      const prev = scene.entities[i - 1];
      const curr = scene.entities[i];
      if (!prev || !curr) continue;
      if (curr.row !== prev.row) {
        expect(curr.row).toBeGreaterThan(prev.row);
      } else if (curr.col !== prev.col) {
        expect(curr.col).toBeGreaterThan(prev.col);
      } else {
        expect(curr.spriteId >= prev.spriteId).toBe(true);
      }
    }
  });
});

describe("projectSectorScene — error handling", () => {
  it("throws SceneProjectionError for an unknown sector id", () => {
    const { state, catalog } = setupState();
    expect(() => projectSectorScene("sector:999", state, catalog))
      .toThrow(SceneProjectionError);
  });

  it("throws SceneProjectionError when the sector definition is absent from the catalog", () => {
    const { state, catalog, sectorId } = setupState();
    const catalogWithoutCentre = {
      ...catalog,
      sectors: new Map([...catalog.sectors.entries()].filter(([id]) => id !== "centre")),
    } as unknown as IndexedCatalog;
    expect(() => projectSectorScene(sectorId, state, catalogWithoutCentre))
      .toThrow(SceneProjectionError);
  });

  it("throws SceneProjectionError when the biome sprite is not in the world atlas", () => {
    const { state, catalog, sectorId } = setupState();
    const badSector = { ...catalog.sectors.get("centre"), biome: "nonexistent-biome" as never };
    const catalogBadBiome = {
      ...catalog,
      sectors: new Map([...catalog.sectors.entries(), ["centre", badSector]]),
    } as unknown as IndexedCatalog;
    expect(() => projectSectorScene(sectorId, state, catalogBadBiome))
      .toThrow(SceneProjectionError);
  });

  it("uses a provided townLayouts override instead of the defaults", () => {
    const { state, catalog, sectorId } = setupState();
    const customLayouts: TownPresentationLayouts = new Map([
      ["centre", [{ col: 3, row: 3 }]],
    ]);
    const scene = projectSectorScene(sectorId, state, catalog, customLayouts);
    const town = scene.entities.find(c => c.spriteId === "town");
    expect(town).toBeDefined();
    expect(town?.col).toBe(3);
    expect(town?.row).toBe(3);
  });
});
