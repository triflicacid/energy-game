import { describe, expect, it } from "vitest";
import { ContentLoader, loadBundledContent } from "./ContentLoader";

// helpers to build minimal valid raw items

function validResource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-resource",
    category: "organic",
    unit: "kg",
    storable: true,
    importable: false,
    renewable: true,
    waste: false,
    hazardous: false,
    iconId: "icon-test-resource",
    ...overrides,
  };
}

function validRecipe(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-recipe",
    inputs: [],
    outputs: [{ resourceId: "timber", qty: 10 }],
    byproducts: [],
    durationHours: 1,
    mechPowerKW: 0,
    requiredResearch: [],
    requiredCapabilities: [],
    ...overrides,
  };
}

function validBuilding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-building",
    type: "generic",
    behaviorId: "forestGrowth",
    validSiteTags: ["forest"],
    constructionCost: [{ resourceId: "timber", qty: 10 }],
    constructionMoneyBase: 100,
    constructionTimeHours: 24,
    requiredResearch: [],
    recipeIds: [],
    upgradeIds: [],
    capabilities: ["forestry"],
    ...overrides,
  };
}

function validExtractorBuilding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return validBuilding({
    id: "test-mine",
    type: "extractor",
    behaviorId: "fuelExtractor",
    validSiteTags: ["extraction-site"],
    sourceKind: "reserve",
    compatibleResourceIds: ["iron-ore"],
    capacityPerHour: 10,
    ...overrides,
  });
}

function validUpgrade(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-upgrade",
    applicableFacilityIds: ["test-building"],
    requiredResearch: [],
    exclusionGroup: null,
    constructionCost: [],
    constructionMoneyBase: 50,
    constructionTimeHours: 8,
    ...overrides,
  };
}

function validResearchNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-node",
    era: "opening",
    parentIds: [],
    researchCost: 0,
    unlockIds: [],
    ...overrides,
  };
}

function validSector(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "centre",
    name: "Ashford Valley",
    biome: "temperate",
    distanceFromCentre: 0,
    diameter: 12,
    gridQ: 0,
    gridR: 0,
    siteTemplates: [{ templateId: "s1", tags: ["forest"], x: -3, y: 2 }],
    hasTown: true,
    initialAccessState: "buildable",
    innateWoodland: null,
    water: null,
    reserves: [],
    ...overrides,
  };
}

function load(
  resources: unknown[] = [validResource()],
  recipes: unknown[] = [validRecipe()],
  buildings: unknown[] = [validBuilding()],
  upgrades: unknown[] = [],
  researchNodes: unknown[] = [validResearchNode()],
) {
  return new ContentLoader().load({ resources, recipes, buildings, upgrades, researchNodes });
}

// --- bundled fixtures ---

describe("loadBundledContent", () => {
  it("returns ok:true for the bundled fixture data", () => {
    const result = loadBundledContent();
    expect(result.ok).toBe(true);
  });

  it("bundle contains all catalogs", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.bundle.resources.length).toBeGreaterThan(0);
    expect(result.bundle.recipes.length).toBeGreaterThan(0);
    expect(result.bundle.buildings.length).toBeGreaterThan(0);
    expect(result.bundle.researchNodes.length).toBeGreaterThan(0);
    expect(result.bundle.sectors.length).toBeGreaterThan(0);
    expect(result.bundle.plantedForestProfiles.length).toBeGreaterThan(0);
  });

  it("fixture resources include timber, wood-waste, and lumber, each with an iconId", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const timber = result.bundle.resources.find((r) => r.id === "timber");
    const woodWaste = result.bundle.resources.find((r) => r.id === "wood-waste");
    const lumber = result.bundle.resources.find((r) => r.id === "lumber");
    expect(timber?.iconId).toBe("icon-timber");
    expect(woodWaste?.iconId).toBe("icon-wood-waste");
    expect(lumber?.iconId).toBe("icon-lumber");
  });

  it("fixture buildings include forestry-operation, waterwheel, and mechanical-workshop, all type generic", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const ids = result.bundle.buildings.map((b) => b.id);
    expect(ids).toContain("forestry-operation");
    expect(ids).toContain("waterwheel");
    expect(ids).toContain("mechanical-workshop");
    expect(result.bundle.buildings.every((b) => b.type === "generic")).toBe(true);
  });

  it("mechanical-workshop has the research capability", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const workshop = result.bundle.buildings.find((b) => b.id === "mechanical-workshop");
    expect(workshop?.capabilities).toContain("research");
  });

  it("fixture research nodes include all four opening nodes", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const ids = result.bundle.researchNodes.map((n) => n.id);
    expect(ids).toContain("basic-forestry");
    expect(ids).toContain("waterwheel-construction");
    expect(ids).toContain("mechanical-workshop-construction");
    expect(ids).toContain("basic-prospecting");
  });

  it("fixture centre sector has medium innate woodland and water, reflecting a valley setting", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const centre = result.bundle.sectors.find((s) => s.id === "centre");
    expect(centre).toBeDefined();
    expect(centre?.innateWoodland).not.toBeNull();
    expect(centre?.innateWoodland?.initialBiomassKg).toBeGreaterThan(0);
    expect(centre?.innateWoodland?.initialBiomassKg).toBeLessThanOrEqual(centre?.innateWoodland?.maxBiomassKg ?? 0);
    expect(centre?.water).not.toBeNull();
    expect(centre?.water?.initialStockM3).toBeGreaterThan(0);
    expect(centre?.water?.initialStockM3).toBeLessThanOrEqual(centre?.water?.maxStockM3 ?? 0);
    expect(centre?.reserves).toEqual([]);
  });

  it("centre sector starts as buildable with distance zero", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const centre = result.bundle.sectors.find((s) => s.id === "centre");
    expect(centre?.distanceFromCentre).toBe(0);
    expect(centre?.initialAccessState).toBe("buildable");
    expect(centre?.diameter).toBeGreaterThan(0);
    expect(centre?.gridQ).toBe(0);
    expect(centre?.gridR).toBe(0);
  });

  it("fixture planted-forest profile has ascending lifecycle fraction thresholds", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const profile = result.bundle.plantedForestProfiles.find((p) => p.id === "standard-planted-forest");
    if (!profile) throw new Error("standard-planted-forest profile missing from bundled fixtures");
    expect(profile.nearlyEmptyMaxFraction).toBeLessThanOrEqual(profile.semiHarvestedMaxFraction);
    expect(profile.semiHarvestedMaxFraction).toBeLessThanOrEqual(profile.matureMinFraction);
  });
});

// --- structural validation ---

describe("ContentLoader resource validation", () => {
  it("accepts a valid resource", () => {
    const result = load();
    expect(result.ok).toBe(true);
  });

  it("rejects a missing id field", () => {
    const result = load([validResource({ id: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues.find((i) => i.path === "id");
    expect(issue).toBeDefined();
    expect(issue?.catalog).toBe("resources");
    expect(issue?.itemIndex).toBe(0);
  });

  it("rejects an empty id string", () => {
    const result = load([validResource({ id: "" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "id")).toBe(true);
  });

  it("rejects a non-boolean storable field", () => {
    const result = load([validResource({ storable: "yes" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues.find((i) => i.path === "storable");
    expect(issue?.message).toContain("boolean");
  });

  it("rejects a non-object resource item", () => {
    const result = load(["not-an-object"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "")).toBe(true);
  });

  it("rejects a missing iconId", () => {
    const result = load([validResource({ iconId: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "iconId")).toBe(true);
  });

  it("rejects an iconId not prefixed with icon-", () => {
    const result = load([validResource({ iconId: "timber-icon" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues.find((i) => i.path === "iconId");
    expect(issue?.message).toContain("icon-");
  });
});

describe("ContentLoader recipe validation", () => {
  it("rejects a non-array recipes catalog", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: "bad",
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "recipes" && i.itemIndex === -1)).toBe(true);
  });

  it("rejects a negative durationHours", () => {
    const result = load(undefined, [validRecipe({ durationHours: -1 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "durationHours")).toBe(true);
  });

  it("rejects zero durationHours", () => {
    const result = load(undefined, [validRecipe({ durationHours: 0 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "durationHours")).toBe(true);
  });

  it("rejects a resource ref with missing resourceId", () => {
    const result = load(undefined, [validRecipe({ outputs: [{ qty: 10 }] })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "outputs[0].resourceId")).toBe(true);
  });

  it("rejects a resource ref with zero qty", () => {
    const result = load(undefined, [validRecipe({ outputs: [{ resourceId: "timber", qty: 0 }] })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "outputs[0].qty")).toBe(true);
  });

  it("accepts zero mechPowerKW", () => {
    const result = load(undefined, [validRecipe({ mechPowerKW: 0 })]);
    expect(result.ok).toBe(true);
  });
});

describe("ContentLoader building validation", () => {
  it("rejects a missing behaviorId", () => {
    const result = load(undefined, undefined, [validBuilding({ behaviorId: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "behaviorId")).toBe(true);
  });

  it("rejects a non-array validSiteTags", () => {
    const result = load(undefined, undefined, [validBuilding({ validSiteTags: "forest" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "validSiteTags")).toBe(true);
  });

  it("rejects a negative constructionMoneyBase", () => {
    const result = load(undefined, undefined, [validBuilding({ constructionMoneyBase: -10 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "constructionMoneyBase")).toBe(true);
  });

  it("rejects a missing type", () => {
    const result = load(undefined, undefined, [validBuilding({ type: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "type")).toBe(true);
  });

  it("rejects an unknown type value", () => {
    const result = load(undefined, undefined, [validBuilding({ type: "mystery" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "type")).toBe(true);
  });

  it("rejects a per-building inventory field", () => {
    const result = load(undefined, undefined, [validBuilding({ warehouse: { capacity: 100 } })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "warehouse")).toBe(true);
  });

  it("accepts a valid extractor building", () => {
    const result = load(undefined, undefined, [validExtractorBuilding()]);
    expect(result.ok).toBe(true);
  });

  it("rejects an extractor with an invalid sourceKind", () => {
    const result = load(undefined, undefined, [validExtractorBuilding({ sourceKind: "magic" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "sourceKind")).toBe(true);
  });

  it("rejects an extractor with a non-array compatibleResourceIds", () => {
    const result = load(undefined, undefined, [validExtractorBuilding({ compatibleResourceIds: "iron-ore" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "compatibleResourceIds")).toBe(true);
  });

  it("rejects an extractor with a zero capacityPerHour", () => {
    const result = load(undefined, undefined, [validExtractorBuilding({ capacityPerHour: 0 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "capacityPerHour")).toBe(true);
  });

  it("accepts an extractor with an empty compatibleResourceIds for a woodland source", () => {
    const result = load(undefined, undefined, [validExtractorBuilding({ sourceKind: "woodland", compatibleResourceIds: [] })]);
    expect(result.ok).toBe(true);
  });
});

describe("ContentLoader upgrade validation", () => {
  it("accepts a valid upgrade with null exclusionGroup", () => {
    const result = load(undefined, undefined, undefined, [validUpgrade()]);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid upgrade with a string exclusionGroup", () => {
    const result = load(undefined, undefined, undefined, [validUpgrade({ exclusionGroup: "fuel-type" })]);
    expect(result.ok).toBe(true);
  });

  it("rejects an empty string exclusionGroup", () => {
    const result = load(undefined, undefined, undefined, [validUpgrade({ exclusionGroup: "" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "exclusionGroup")).toBe(true);
  });
});

describe("ContentLoader research node validation", () => {
  it("rejects a missing era", () => {
    const result = load(undefined, undefined, undefined, undefined, [validResearchNode({ era: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "era")).toBe(true);
  });

  it("accepts zero researchCost", () => {
    const result = load(undefined, undefined, undefined, undefined, [validResearchNode({ researchCost: 0 })]);
    expect(result.ok).toBe(true);
  });

  it("rejects a negative researchCost", () => {
    const result = load(undefined, undefined, undefined, undefined, [validResearchNode({ researchCost: -5 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "researchCost")).toBe(true);
  });
});

describe("ContentLoader issue accumulation", () => {
  it("reports issues from multiple items, not just the first", () => {
    const result = load([
      validResource({ id: "" }),
      validResource({ id: "" }),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("issue fields contain catalog, itemIndex, itemId, path, and message", () => {
    const result = load([validResource({ category: 42 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues.find((i) => i.path === "category");
    expect(issue?.catalog).toBe("resources");
    expect(typeof issue?.itemIndex).toBe("number");
    expect(issue?.path).toBe("category");
    expect(typeof issue?.message).toBe("string");
  });
});

describe("ContentLoader sector validation", () => {
  it("accepts a valid sector", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector()],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a sector with a missing id", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{ name: "X", biome: "temperate", distanceFromCentre: 0, diameter: 10, gridQ: 0, gridR: 0, siteTemplates: [], hasTown: false, initialAccessState: "buildable", innateWoodland: null, water: null, reserves: [] }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "id")).toBe(true);
  });

  it("rejects a sector with an invalid initialAccessState", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ initialAccessState: "flying" })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "initialAccessState")).toBe(true);
  });

  it("rejects a sector with a negative distanceFromCentre", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ distanceFromCentre: -1 })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "distanceFromCentre")).toBe(true);
  });

  it("rejects a sector with a zero or negative diameter", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ diameter: 0 })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "diameter")).toBe(true);
  });

  it("rejects a sector with a fractional gridQ", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ gridQ: 1.5 })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "gridQ")).toBe(true);
  });

  it("accepts negative gridQ and gridR values", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ distanceFromCentre: 1, gridQ: -2, gridR: -3, initialAccessState: "explored" })],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a site template with a non-array tags field", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ siteTemplates: [{ templateId: "t1", tags: "forest", x: 0, y: 0 }] })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors")).toBe(true);
  });

  it("rejects a site template with a missing x coordinate", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ siteTemplates: [{ templateId: "t1", tags: ["forest"], y: 0 }] })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path.includes(".x"))).toBe(true);
  });

  it("accepts negative site x and y coordinates", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ siteTemplates: [{ templateId: "t1", tags: ["forest"], x: -3, y: -2 }] })],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a sector missing the innateWoodland field", () => {
    const raw = validSector();
    delete (raw as Record<string, unknown>)["innateWoodland"];
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [raw],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "innateWoodland")).toBe(true);
  });

  it("accepts a sector with a fully specified innateWoodland definition", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({
        innateWoodland: { maxBiomassKg: 1000, initialBiomassKg: 500, viabilityThresholdKg: 50, growthRateKgPerHour: 1 },
      })],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an innateWoodland whose initialBiomassKg exceeds maxBiomassKg", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({
        innateWoodland: { maxBiomassKg: 100, initialBiomassKg: 500, viabilityThresholdKg: 50, growthRateKgPerHour: 1 },
      })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "innateWoodland.initialBiomassKg")).toBe(true);
  });

  it("accepts a sector with a fully specified water definition", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({
        water: { maxStockM3: 10000, initialStockM3: 0, baselineInflowM3PerHour: 5 },
      })],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a water definition whose initialStockM3 exceeds maxStockM3", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({
        water: { maxStockM3: 100, initialStockM3: 500, baselineInflowM3PerHour: 5 },
      })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "water.initialStockM3")).toBe(true);
  });

  it("accepts a sector with finite reserve records", () => {
    const result = new ContentLoader().load({
      resources: [validResource({ id: "iron-ore" })],
      recipes: [validRecipe()],
      buildings: [validExtractorBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ reserves: [{ resourceId: "iron-ore", initialQuantity: 5000, surveyed: false }] })],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a reserve record with a missing resourceId", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [validSector({ reserves: [{ initialQuantity: 5000, surveyed: false }] })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "reserves[0].resourceId")).toBe(true);
  });
});

describe("ContentLoader planted-forest profile validation", () => {
  function validProfile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "test-profile",
      maxBiomassKg: 5000,
      growthRateKgPerHour: 2,
      nearlyEmptyMaxFraction: 0.15,
      semiHarvestedMaxFraction: 0.5,
      matureMinFraction: 0.85,
      ...overrides,
    };
  }

  it("accepts a valid profile", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      plantedForestProfiles: [validProfile()],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects thresholds that are out of ascending order", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      plantedForestProfiles: [validProfile({ nearlyEmptyMaxFraction: 0.9, matureMinFraction: 0.1 })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "plantedForestProfiles")).toBe(true);
  });

  it("rejects a fraction above 1", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      buildings: [validBuilding()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      plantedForestProfiles: [validProfile({ matureMinFraction: 1.5 })],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "matureMinFraction")).toBe(true);
  });
});
