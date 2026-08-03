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

function validFacility(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-facility",
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

function validUpgrade(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-upgrade",
    applicableFacilityIds: ["test-facility"],
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

function load(
  resources: unknown[] = [validResource()],
  recipes: unknown[] = [validRecipe()],
  facilities: unknown[] = [validFacility()],
  upgrades: unknown[] = [],
  researchNodes: unknown[] = [validResearchNode()],
) {
  return new ContentLoader().load({ resources, recipes, facilities, upgrades, researchNodes });
}

// --- bundled fixtures ---

describe("loadBundledContent", () => {
  it("returns ok:true for the bundled fixture data", () => {
    const result = loadBundledContent();
    expect(result.ok).toBe(true);
  });

  it("bundle contains all six catalogs", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.bundle.resources.length).toBeGreaterThan(0);
    expect(result.bundle.recipes.length).toBeGreaterThan(0);
    expect(result.bundle.facilities.length).toBeGreaterThan(0);
    expect(result.bundle.researchNodes.length).toBeGreaterThan(0);
    expect(result.bundle.sectors.length).toBeGreaterThan(0);
  });

  it("fixture resources include timber and wood-waste", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const ids = result.bundle.resources.map((r) => r.id);
    expect(ids).toContain("timber");
    expect(ids).toContain("wood-waste");
  });

  it("fixture facilities include forestry-operation, waterwheel, and mechanical-workshop", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const ids = result.bundle.facilities.map((f) => f.id);
    expect(ids).toContain("forestry-operation");
    expect(ids).toContain("waterwheel");
    expect(ids).toContain("mechanical-workshop");
  });

  it("mechanical-workshop has the research capability", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const workshop = result.bundle.facilities.find((f) => f.id === "mechanical-workshop");
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

  it("fixture sectors include the centre sector", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const ids = result.bundle.sectors.map((s) => s.id);
    expect(ids).toContain("centre");
  });

  it("centre sector starts as buildable with distance zero", () => {
    const result = loadBundledContent();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const centre = result.bundle.sectors.find((s) => s.id === "centre");
    expect(centre?.distanceFromCentre).toBe(0);
    expect(centre?.initialAccessState).toBe("buildable");
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
});

describe("ContentLoader recipe validation", () => {
  it("rejects a non-array recipes catalog", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: "bad",
      facilities: [validFacility()],
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

describe("ContentLoader facility validation", () => {
  it("rejects a missing behaviorId", () => {
    const result = load(undefined, undefined, [validFacility({ behaviorId: undefined })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "behaviorId")).toBe(true);
  });

  it("rejects a non-array validSiteTags", () => {
    const result = load(undefined, undefined, [validFacility({ validSiteTags: "forest" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "validSiteTags")).toBe(true);
  });

  it("rejects a negative constructionMoneyBase", () => {
    const result = load(undefined, undefined, [validFacility({ constructionMoneyBase: -10 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path === "constructionMoneyBase")).toBe(true);
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
      facilities: [validFacility()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{
        id: "centre",
        name: "Ashford Valley",
        biome: "temperate",
        distanceFromCentre: 0,
        siteTemplates: [{ templateId: "s1", tags: ["forest"] }],
        hasTown: true,
        initialAccessState: "buildable",
      }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a sector with a missing id", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      facilities: [validFacility()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{ name: "X", biome: "temperate", distanceFromCentre: 0, siteTemplates: [], hasTown: false, initialAccessState: "buildable" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "id")).toBe(true);
  });

  it("rejects a sector with an invalid initialAccessState", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      facilities: [validFacility()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{ id: "x", name: "X", biome: "temperate", distanceFromCentre: 0, siteTemplates: [], hasTown: false, initialAccessState: "flying" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "initialAccessState")).toBe(true);
  });

  it("rejects a sector with a negative distanceFromCentre", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      facilities: [validFacility()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{ id: "x", name: "X", biome: "temperate", distanceFromCentre: -1, siteTemplates: [], hasTown: false, initialAccessState: "buildable" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors" && i.path === "distanceFromCentre")).toBe(true);
  });

  it("rejects a site template with a non-array tags field", () => {
    const result = new ContentLoader().load({
      resources: [validResource()],
      recipes: [validRecipe()],
      facilities: [validFacility()],
      upgrades: [],
      researchNodes: [validResearchNode()],
      sectors: [{ id: "x", name: "X", biome: "temperate", distanceFromCentre: 0, siteTemplates: [{ templateId: "t1", tags: "forest" }], hasTown: false, initialAccessState: "buildable" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "sectors")).toBe(true);
  });
});

