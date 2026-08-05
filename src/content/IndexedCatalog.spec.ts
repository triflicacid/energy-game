import { describe, expect, it } from "vitest";
import { makeResourceId, type BiomeId } from "@shared/IdCounter";
import type { BuildingDef, ContentBundle, ExtractorBuildingDef, ResearchNodeDef, ResourceDef, SectorDef } from "./defs";
import { loadBundledContent } from "./ContentLoader";
import { buildIndexedCatalog } from "./IndexedCatalog";

// minimal valid construction helpers

function resource(id: string, importable = true): ResourceDef {
  return { id: makeResourceId(id), category: "organic", unit: "kg", storable: true, importable, renewable: true, waste: false, hazardous: false, iconId: `icon-${id}` };
}

function researchNode(id: string, parentIds: string[] = [], unlockIds: string[] = []): ResearchNodeDef {
  return { id, era: "opening", parentIds, researchCost: 0, unlockIds };
}

function building(id: string, overrides: Partial<BuildingDef> = {}): BuildingDef {
  return {
    id,
    type: "generic",
    behaviorId: "materialProcessor",
    validSiteTags: [],
    constructionCost: [],
    constructionMoneyBase: 0,
    constructionTimeHours: 1,
    requiredResearch: [],
    recipeIds: [],
    upgradeIds: [],
    capabilities: [],
    ...overrides,
  } as BuildingDef;
}

function extractorBuilding(id: string, overrides: Partial<ExtractorBuildingDef> = {}): ExtractorBuildingDef {
  return {
    ...building(id, { validSiteTags: ["extraction-site"] }),
    type: "extractor",
    sourceKind: "reserve",
    compatibleResourceIds: [],
    capacityPerHour: 10,
    ...overrides,
  } as ExtractorBuildingDef;
}

function sector(id: string, tags: string[][] = [], overrides: Partial<SectorDef> = {}): SectorDef {
  return {
    id,
    name: id,
    biome: "temperate" as BiomeId,
    distanceFromCentre: 0,
    diameter: 10,
    gridQ: 0,
    gridR: 0,
    siteTemplates: tags.map((t, i) => ({ templateId: `${id}-site-${i}`, tags: t, x: i, y: 0 })),
    hasTown: false,
    initialAccessState: "buildable",
    innateWoodland: null,
    water: null,
    reserves: [],
    ...overrides,
  };
}

function bundle(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return {
    resources: [resource("timber")],
    recipes: [],
    buildings: [],
    upgrades: [],
    researchNodes: [researchNode("root")],
    sectors: [],
    plantedForestProfiles: [],
    ...overrides,
  };
}

describe("buildIndexedCatalog with opening fixtures", () => {
  it("returns ok:true for the bundled opening content", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    expect(result.ok).toBe(true);
  });

  it("indexes resources by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getResource("timber")).toBeDefined();
    expect(result.catalog.getResource("wood-waste")).toBeDefined();
    expect(result.catalog.getResource("nonexistent")).toBeUndefined();
  });

  it("indexes buildings by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getBuilding("mechanical-workshop")).toBeDefined();
    expect(result.catalog.getBuilding("waterwheel")).toBeDefined();
  });

  it("indexes research nodes by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getResearchNode("basic-forestry")).toBeDefined();
    expect(result.catalog.getResearchNode("basic-prospecting")).toBeDefined();
  });

  it("indexes planted-forest profiles by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getPlantedForestProfile("standard-planted-forest")).toBeDefined();
  });
});

describe("duplicate ID detection", () => {
  it("reports a duplicate resource ID", () => {
    const result = buildIndexedCatalog(bundle({ resources: [resource("timber"), resource("timber")] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "resources" && i.itemId === "timber")).toBe(true);
  });

  it("reports a duplicate research node ID", () => {
    const result = buildIndexedCatalog(bundle({ researchNodes: [researchNode("root"), researchNode("root")] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "researchNodes" && i.itemId === "root")).toBe(true);
  });

  it("does not report duplicates across different catalogs", () => {
    // "root" as both a resource ID and a research node ID is fine
    const result = buildIndexedCatalog(bundle({
      resources: [resource("root")],
      researchNodes: [researchNode("root")],
    }));
    expect(result.ok).toBe(true);
  });
});

describe("cross-reference validation", () => {
  it("reports a recipe referencing an unknown resource", () => {
    const result = buildIndexedCatalog(bundle({
      recipes: [{
        id: "bad-recipe",
        inputs: [],
        outputs: [{ resourceId: makeResourceId("ghost-wood"), qty: 1 }],
        byproducts: [],
        durationHours: 1,
        mechPowerKW: 0,
        requiredResearch: [],
        requiredCapabilities: [],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "recipes" && i.itemId === "bad-recipe")).toBe(true);
  });

  it("reports a building referencing an unknown recipe", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [building("workshop", { recipeIds: ["nonexistent-recipe"] })],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "buildings" && i.itemId === "workshop")).toBe(true);
  });

  it("reports a building referencing an unknown required research node", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [building("workshop", { requiredResearch: ["advanced-materials"] })],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "buildings" && i.itemId === "workshop")).toBe(true);
  });

  it("reports a research node referencing an unknown parent", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [researchNode("orphan", ["nonexistent-parent"])],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "researchNodes" && i.itemId === "orphan")).toBe(true);
  });

  it("reports a research node unlocking an unknown item", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [researchNode("root", [], ["ghost-building"])],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "researchNodes" && i.itemId === "root")).toBe(true);
  });

  it("accepts a research node unlocking a known building", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [building("my-building", { behaviorId: "forestGrowth" })],
      researchNodes: [researchNode("root", [], ["my-building"])],
    }));
    expect(result.ok).toBe(true);
  });
});

describe("research cycle detection", () => {
  it("reports nodes involved in a two-node prerequisite cycle", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [
        researchNode("a", ["b"]),
        researchNode("b", ["a"]),
      ],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const cycleIds = result.issues.filter((i) => i.message.includes("cycle")).map((i) => i.itemId);
    expect(cycleIds).toContain("a");
    expect(cycleIds).toContain("b");
  });

  it("reports only the cyclic nodes, not unrelated ones", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [
        researchNode("root"),
        researchNode("a", ["root"]),
        researchNode("cycle-1", ["cycle-2"]),
        researchNode("cycle-2", ["cycle-1"]),
      ],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const cycleIds = result.issues.filter((i) => i.message.includes("prerequisite cycle")).map((i) => i.itemId);
    expect(cycleIds).toContain("cycle-1");
    expect(cycleIds).toContain("cycle-2");
    expect(cycleIds).not.toContain("root");
    expect(cycleIds).not.toContain("a");
  });
});

describe("research reachability", () => {
  it("reports a node not reachable from any root", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [
        researchNode("root"),
        // "island" has no parents but is isolated because it has a parent that doesn't exist
        // Actually for this test, let's use a node whose parent chain doesn't lead to a root
        // Make a valid node that is genuinely disconnected: parentIds points to a node
        // that is itself unreachable
        researchNode("mid", ["floating"]),
        researchNode("floating", ["mid"]), // cycle, so floating and mid are unreachable
      ],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const unreachableIds = result.issues
      .filter((i) => i.message.includes("not reachable"))
      .map((i) => i.itemId);
    expect(unreachableIds).toContain("floating");
    expect(unreachableIds).toContain("mid");
  });

  it("does not report reachable nodes as unreachable", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [
        researchNode("root"),
        researchNode("child", ["root"]),
        researchNode("grandchild", ["child"]),
      ],
    }));
    expect(result.ok).toBe(true);
  });
});

describe("resource producibility", () => {
  it("reports a building requiring a non-importable resource with no recipe output", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber", false), resource("mystery-ore", false)],
      buildings: [building("ore-smelter", { constructionCost: [{ resourceId: makeResourceId("mystery-ore"), qty: 10 }] })],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "buildings" && i.itemId === "ore-smelter" && i.message.includes("mystery-ore"))).toBe(true);
  });

  it("accepts a resource that is not importable but is produced by a recipe", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber", true), resource("wood-chips", false)],
      recipes: [{
        id: "chip-timber",
        inputs: [],
        outputs: [{ resourceId: makeResourceId("wood-chips"), qty: 5 }],
        byproducts: [],
        durationHours: 1,
        mechPowerKW: 0,
        requiredResearch: [],
        requiredCapabilities: [],
      }],
      buildings: [building("chipper", { constructionCost: [{ resourceId: makeResourceId("wood-chips"), qty: 2 }], recipeIds: ["chip-timber"] })],
    }));
    expect(result.ok).toBe(true);
  });
});

describe("circular unlock detection", () => {
  it("reports nodes in a two-node research unlock cycle", () => {
    const result = buildIndexedCatalog(bundle({
      researchNodes: [
        researchNode("a", [], ["b"]),
        researchNode("b", [], ["a"]),
      ],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const circularIds = result.issues
      .filter((i) => i.message.includes("circular unlock"))
      .map((i) => i.itemId);
    expect(circularIds).toContain("a");
    expect(circularIds).toContain("b");
  });

  it("does not flag a node that unlocks only buildings", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [building("mill")],
      researchNodes: [researchNode("root", [], ["mill"])],
    }));
    expect(result.ok).toBe(true);
  });
});

describe("aggregated error reporting", () => {
  it("accumulates issues from multiple catalogs in one pass", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber"), resource("timber")], // duplicate
      researchNodes: [researchNode("orphan", ["missing-parent"])], // missing ref
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    const catalogs = new Set(result.issues.map((i) => i.catalog));
    expect(catalogs.has("resources")).toBe(true);
    expect(catalogs.has("researchNodes")).toBe(true);
  });

  it("each issue carries catalog and itemId", () => {
    const result = buildIndexedCatalog(bundle({ resources: [resource("x"), resource("x")] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues[0];
    expect(typeof issue.catalog).toBe("string");
    expect(typeof issue.itemId).toBe("string");
    expect(typeof issue.message).toBe("string");
  });
});

describe("sector site tag validation", () => {
  it("accepts a sector whose site tags all match a known building validSiteTag", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [building("mill", { behaviorId: "forestGrowth", validSiteTags: ["forest"] })],
      sectors: [sector("centre", [["forest"]])],
    }));
    expect(result.ok).toBe(true);
  });

  it("reports a sector site template using a tag absent from all building validSiteTags", () => {
    const result = buildIndexedCatalog(bundle({
      sectors: [sector("centre", [["mystery-tag"]])],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.itemId === "centre" && i.message.includes("mystery-tag"))).toBe(true);
  });

  it("reports a duplicate sector ID", () => {
    const result = buildIndexedCatalog(bundle({
      sectors: [sector("centre"), sector("centre")],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.itemId === "centre")).toBe(true);
  });

  it("indexes sectors by ID in the returned catalog", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getSector("centre")).toBeDefined();
    expect(result.catalog.getSector("nonexistent")).toBeUndefined();
  });

  it("bundled centre sector has forest and waterwheel-site site templates", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const centre = result.catalog.getSector("centre");
    const allTags = centre?.siteTemplates.flatMap((t) => t.tags) ?? [];
    expect(allTags).toContain("forest");
    expect(allTags).toContain("waterwheel-site");
  });
});

describe("extractor buildings", () => {
  it("getExtractors returns only type:extractor buildings", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [
        building("mill", { behaviorId: "forestGrowth" }),
        extractorBuilding("iron-mine", { compatibleResourceIds: ["iron-ore"] }),
      ],
      resources: [resource("timber"), resource("iron-ore")],
      sectors: [sector("centre", [], { reserves: [{ resourceId: "iron-ore", initialQuantity: 100, surveyed: true }] })],
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const extractors = result.catalog.getExtractors();
    expect(extractors).toHaveLength(1);
    expect(extractors[0]?.id).toBe("iron-mine");
  });

  it("reports an extractor referencing an unknown compatible resource", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [extractorBuilding("iron-mine", { compatibleResourceIds: ["ghost-ore"] })],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "buildings" && i.itemId === "iron-mine" && i.message.includes("ghost-ore"))).toBe(true);
  });
});

describe("reserve-to-extractor coverage", () => {
  it("accepts a sector reserve with a compatible extractor", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber"), resource("iron-ore")],
      buildings: [extractorBuilding("iron-mine", { compatibleResourceIds: ["iron-ore"] })],
      sectors: [sector("centre", [], { reserves: [{ resourceId: "iron-ore", initialQuantity: 500, surveyed: true }] })],
    }));
    expect(result.ok).toBe(true);
  });

  it("reports a sector reserve with no compatible extractor", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber"), resource("iron-ore")],
      sectors: [sector("centre", [], { reserves: [{ resourceId: "iron-ore", initialQuantity: 500, surveyed: true }] })],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.itemId === "centre" && i.message.includes("iron-ore"))).toBe(true);
  });

  it("does not require coverage for woodland or water sourceKind extractors", () => {
    const result = buildIndexedCatalog(bundle({
      buildings: [extractorBuilding("forestry", { sourceKind: "woodland", compatibleResourceIds: [] })],
      sectors: [sector("centre")],
    }));
    expect(result.ok).toBe(true);
  });
});
