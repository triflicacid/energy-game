import { describe, expect, it } from "vitest";
import type { BiomeId } from "@shared/IdCounter";
import { makeResourceId } from "@shared/IdCounter";
import type { ContentBundle, ResearchNodeDef, ResourceDef, SectorDef } from "./defs";
import { loadBundledContent } from "./ContentLoader";
import { buildIndexedCatalog } from "./IndexedCatalog";

// minimal valid construction helpers

function resource(id: string, importable = true): ResourceDef {
  return { id: makeResourceId(id), category: "organic", unit: "kg", storable: true, importable, renewable: true, waste: false, hazardous: false };
}

function researchNode(id: string, parentIds: string[] = [], unlockIds: string[] = []): ResearchNodeDef {
  return { id, era: "opening", parentIds, researchCost: 0, unlockIds };
}

function sector(id: string): SectorDef {
  return {
    id,
    name: id,
    biome: "temperate" as BiomeId,
    distanceFromCentre: 0,
    diameter: 10,
    gridQ: 0,
    gridR: 0,
    hasTown: false,
    initialAccessState: "buildable",
  };
}

function bundle(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return {
    resources: [resource("timber")],
    recipes: [],
    facilities: [],
    upgrades: [],
    researchNodes: [researchNode("root")],
    sectors: [],
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

  it("indexes facilities by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getFacility("mechanical-workshop")).toBeDefined();
    expect(result.catalog.getFacility("waterwheel")).toBeDefined();
  });

  it("indexes research nodes by ID", () => {
    const load = loadBundledContent();
    if (!load.ok) throw new Error(JSON.stringify(load.issues));
    const result = buildIndexedCatalog(load.bundle);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.catalog.getResearchNode("basic-forestry")).toBeDefined();
    expect(result.catalog.getResearchNode("basic-prospecting")).toBeDefined();
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

  it("reports a facility referencing an unknown recipe", () => {
    const result = buildIndexedCatalog(bundle({
      facilities: [{
        id: "workshop",
        behaviorId: "materialProcessor",
        placementRuleId: "general",
        constructionCost: [],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: [],
        recipeIds: ["nonexistent-recipe"],
        upgradeIds: [],
        capabilities: [],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "facilities" && i.itemId === "workshop")).toBe(true);
  });

  it("reports a facility referencing an unknown required research node", () => {
    const result = buildIndexedCatalog(bundle({
      facilities: [{
        id: "workshop",
        behaviorId: "materialProcessor",
        placementRuleId: "general",
        constructionCost: [],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: ["advanced-materials"],
        recipeIds: [],
        upgradeIds: [],
        capabilities: [],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "facilities" && i.itemId === "workshop")).toBe(true);
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
      researchNodes: [researchNode("root", [], ["ghost-facility"])],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "researchNodes" && i.itemId === "root")).toBe(true);
  });

  it("accepts a research node unlocking a known facility", () => {
    const result = buildIndexedCatalog(bundle({
      facilities: [{
        id: "my-facility",
        behaviorId: "forestGrowth",
        placementRuleId: "general",
        constructionCost: [],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: [],
        recipeIds: [],
        upgradeIds: [],
        capabilities: [],
      }],
      researchNodes: [researchNode("root", [], ["my-facility"])],
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
  it("reports a facility requiring a non-importable resource with no recipe output", () => {
    const result = buildIndexedCatalog(bundle({
      resources: [resource("timber", false), resource("mystery-ore", false)],
      facilities: [{
        id: "ore-smelter",
        behaviorId: "materialProcessor",
        placementRuleId: "general",
        constructionCost: [{ resourceId: makeResourceId("mystery-ore"), qty: 10 }],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: [],
        recipeIds: [],
        upgradeIds: [],
        capabilities: [],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.catalog === "facilities" && i.itemId === "ore-smelter" && i.message.includes("mystery-ore"))).toBe(true);
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
      facilities: [{
        id: "chipper",
        behaviorId: "materialProcessor",
        placementRuleId: "general",
        constructionCost: [{ resourceId: makeResourceId("wood-chips"), qty: 2 }],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: [],
        recipeIds: ["chip-timber"],
        upgradeIds: [],
        capabilities: [],
      }],
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

  it("does not flag a node that unlocks only facilities", () => {
    const result = buildIndexedCatalog(bundle({
      facilities: [{
        id: "mill",
        behaviorId: "materialProcessor",
        placementRuleId: "general",
        constructionCost: [],
        constructionMoneyBase: 0,
        constructionTimeHours: 1,
        requiredResearch: [],
        recipeIds: [],
        upgradeIds: [],
        capabilities: [],
      }],
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

describe("sector catalog validation", () => {
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
});

