// immutable indexed catalog with semantic cross-reference validation

import type { ResourceId } from "@shared/IdCounter";
import type {
  BuildingDef,
  ContentBundle,
  ExtractorBuildingDef,
  PlantedForestProfileDef,
  RecipeDef,
  ResearchNodeDef,
  ResourceDef,
  SectorDef,
  UpgradeDef,
} from "./defs";

/** a single semantic validation failure */
export type SemanticIssue = {
  readonly catalog: string;
  readonly itemId: string;
  readonly message: string;
};

/** discriminated union returned by buildIndexedCatalog */
export type SemanticResult =
  | { readonly ok: true; readonly catalog: IndexedCatalog }
  | { readonly ok: false; readonly issues: readonly SemanticIssue[] };

/** narrows a BuildingDef to its extractor variant */
function isExtractor(b: BuildingDef): b is ExtractorBuildingDef {
  return b.type === "extractor";
}

/**
 * immutable content catalogs indexed by stable string ID.
 * simulation code consumes this rather than raw ContentBundle or JSON.
 */
export class IndexedCatalog {
  public readonly resources: ReadonlyMap<string, ResourceDef>;
  public readonly recipes: ReadonlyMap<string, RecipeDef>;
  public readonly buildings: ReadonlyMap<string, BuildingDef>;
  public readonly upgrades: ReadonlyMap<string, UpgradeDef>;
  public readonly researchNodes: ReadonlyMap<string, ResearchNodeDef>;
  public readonly sectors: ReadonlyMap<string, SectorDef>;
  public readonly plantedForestProfiles: ReadonlyMap<string, PlantedForestProfileDef>;

  public constructor(bundle: ContentBundle) {
    this.resources = new Map(bundle.resources.map((r) => [r.id, r]));
    this.recipes = new Map(bundle.recipes.map((r) => [r.id, r]));
    this.buildings = new Map(bundle.buildings.map((b) => [b.id, b]));
    this.upgrades = new Map(bundle.upgrades.map((u) => [u.id, u]));
    this.researchNodes = new Map(bundle.researchNodes.map((n) => [n.id, n]));
    this.sectors = new Map(bundle.sectors.map((s) => [s.id, s]));
    this.plantedForestProfiles = new Map(bundle.plantedForestProfiles.map((p) => [p.id, p]));
  }

  /** returns a resource definition by ID, or undefined if not found */
  public getResource(id: string): ResourceDef | undefined {
    return this.resources.get(id);
  }

  /** returns a recipe definition by ID, or undefined if not found */
  public getRecipe(id: string): RecipeDef | undefined {
    return this.recipes.get(id);
  }

  /** returns a building definition by ID, or undefined if not found */
  public getBuilding(id: string): BuildingDef | undefined {
    return this.buildings.get(id);
  }

  /** returns every building definition whose type is "extractor" */
  public getExtractors(): readonly ExtractorBuildingDef[] {
    return [...this.buildings.values()].filter(isExtractor);
  }

  /** returns an upgrade definition by ID, or undefined if not found */
  public getUpgrade(id: string): UpgradeDef | undefined {
    return this.upgrades.get(id);
  }

  /** returns a research node definition by ID, or undefined if not found */
  public getResearchNode(id: string): ResearchNodeDef | undefined {
    return this.researchNodes.get(id);
  }

  /** returns a sector definition by ID, or undefined if not found */
  public getSector(id: string): SectorDef | undefined {
    return this.sectors.get(id);
  }

  /** returns a planted-forest lifecycle profile by ID, or undefined if not found */
  public getPlantedForestProfile(id: string): PlantedForestProfileDef | undefined {
    return this.plantedForestProfiles.get(id);
  }
}

/** checks each catalog for duplicate IDs and pushes an issue for each one found */
function checkDuplicateIds(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const catalogs: [string, readonly { id: string }[]][] = [
    ["resources", bundle.resources],
    ["recipes", bundle.recipes],
    ["buildings", bundle.buildings],
    ["upgrades", bundle.upgrades],
    ["researchNodes", bundle.researchNodes],
    ["sectors", bundle.sectors],
    ["plantedForestProfiles", bundle.plantedForestProfiles],
  ];
  for (const [name, items] of catalogs) {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        issues.push({ catalog: name, itemId: item.id, message: `duplicate id "${item.id}"` });
      } else {
        seen.add(item.id);
      }
    }
  }
}

/** checks that all resource IDs referenced by recipes exist in the resources catalog */
function checkRecipeRefs(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const resourceIds = new Set(bundle.resources.map((r) => r.id));
  const researchIds = new Set(bundle.researchNodes.map((n) => n.id));
  for (const recipe of bundle.recipes) {
    for (const ref of [...recipe.inputs, ...recipe.outputs, ...recipe.byproducts]) {
      if (!resourceIds.has(ref.resourceId)) {
        issues.push({ catalog: "recipes", itemId: recipe.id, message: `references unknown resource "${ref.resourceId}"` });
      }
    }
    for (const id of recipe.requiredResearch) {
      if (!researchIds.has(id)) {
        issues.push({ catalog: "recipes", itemId: recipe.id, message: `references unknown research node "${id}"` });
      }
    }
  }
}

/** checks that all IDs referenced by buildings exist in their respective catalogs */
function checkBuildingRefs(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const resourceIds = new Set(bundle.resources.map((r) => r.id));
  const recipeIds = new Set(bundle.recipes.map((r) => r.id));
  const upgradeIds = new Set(bundle.upgrades.map((u) => u.id));
  const researchIds = new Set(bundle.researchNodes.map((n) => n.id));
  for (const building of bundle.buildings) {
    for (const ref of building.constructionCost) {
      if (!resourceIds.has(ref.resourceId)) {
        issues.push({ catalog: "buildings", itemId: building.id, message: `references unknown resource "${ref.resourceId}" in constructionCost` });
      }
    }
    for (const id of building.recipeIds) {
      if (!recipeIds.has(id)) {
        issues.push({ catalog: "buildings", itemId: building.id, message: `references unknown recipe "${id}"` });
      }
    }
    for (const id of building.upgradeIds) {
      if (!upgradeIds.has(id)) {
        issues.push({ catalog: "buildings", itemId: building.id, message: `references unknown upgrade "${id}"` });
      }
    }
    for (const id of building.requiredResearch) {
      if (!researchIds.has(id)) {
        issues.push({ catalog: "buildings", itemId: building.id, message: `references unknown research node "${id}"` });
      }
    }
    if (building.type === "extractor" && building.sourceKind === "reserve") {
      for (const resourceId of building.compatibleResourceIds) {
        if (!resourceIds.has(resourceId as ResourceId)) {
          issues.push({ catalog: "buildings", itemId: building.id, message: `references unknown resource "${resourceId}" in compatibleResourceIds` });
        }
      }
    }
  }
}

/** checks that all IDs referenced by upgrades exist in their respective catalogs */
function checkUpgradeRefs(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const resourceIds = new Set(bundle.resources.map((r) => r.id));
  const buildingIds = new Set(bundle.buildings.map((b) => b.id));
  const researchIds = new Set(bundle.researchNodes.map((n) => n.id));
  for (const upgrade of bundle.upgrades) {
    for (const ref of upgrade.constructionCost) {
      if (!resourceIds.has(ref.resourceId)) {
        issues.push({ catalog: "upgrades", itemId: upgrade.id, message: `references unknown resource "${ref.resourceId}"` });
      }
    }
    for (const id of upgrade.applicableFacilityIds) {
      if (!buildingIds.has(id)) {
        issues.push({ catalog: "upgrades", itemId: upgrade.id, message: `references unknown building "${id}"` });
      }
    }
    for (const id of upgrade.requiredResearch) {
      if (!researchIds.has(id)) {
        issues.push({ catalog: "upgrades", itemId: upgrade.id, message: `references unknown research node "${id}"` });
      }
    }
  }
}

/**
 * checks that parentIds reference known research nodes and that unlockIds reference
 * a known building, upgrade, or research node
 */
function checkResearchNodeRefs(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const researchIds = new Set(bundle.researchNodes.map((n) => n.id));
  const buildingIds = new Set(bundle.buildings.map((b) => b.id));
  const upgradeIds = new Set(bundle.upgrades.map((u) => u.id));
  for (const node of bundle.researchNodes) {
    for (const parentId of node.parentIds) {
      if (!researchIds.has(parentId)) {
        issues.push({ catalog: "researchNodes", itemId: node.id, message: `references unknown research node "${parentId}" as parent` });
      }
    }
    for (const unlockId of node.unlockIds) {
      if (!buildingIds.has(unlockId) && !upgradeIds.has(unlockId) && !researchIds.has(unlockId)) {
        issues.push({ catalog: "researchNodes", itemId: node.id, message: `unlocks unknown item "${unlockId}"` });
      }
    }
  }
}

/**
 * uses kahn's topological sort on the parentIds graph to detect prerequisite cycles.
 * pushes an issue for each node whose in-degree remains above zero after sorting.
 */
function checkResearchCycles(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const node of bundle.researchNodes) {
    inDegree.set(node.id, 0);
    children.set(node.id, []);
  }
  for (const node of bundle.researchNodes) {
    for (const parentId of node.parentIds) {
      if (!children.has(parentId)) continue;
      children.get(parentId)?.push(node.id);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    processed++;
    for (const child of children.get(id) ?? []) {
      const next = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }
  if (processed < bundle.researchNodes.length) {
    for (const [id, deg] of inDegree) {
      if (deg > 0) {
        issues.push({ catalog: "researchNodes", itemId: id, message: `is part of a prerequisite cycle` });
      }
    }
  }
}

/**
 * traverses the research tree from all root nodes (parentIds empty) and pushes an issue
 * for every node that is not reachable from at least one root
 */
function checkResearchReachability(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const node of bundle.researchNodes) {
    children.set(node.id, []);
    if (node.parentIds.length === 0) roots.push(node.id);
  }
  for (const node of bundle.researchNodes) {
    for (const parentId of node.parentIds) {
      children.get(parentId)?.push(node.id);
    }
  }
  const reachable = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || reachable.has(id)) continue;
    reachable.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  for (const node of bundle.researchNodes) {
    if (!reachable.has(node.id)) {
      issues.push({ catalog: "researchNodes", itemId: node.id, message: `is not reachable from any root research node` });
    }
  }
}

/**
 * checks that every resource referenced in construction costs and recipe inputs is either
 * importable or produced as an output or byproduct of at least one recipe
 */
function checkResourceProducibility(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const obtainable = new Set<string>();
  for (const resource of bundle.resources) {
    if (resource.importable) obtainable.add(resource.id);
  }
  for (const recipe of bundle.recipes) {
    for (const ref of [...recipe.outputs, ...recipe.byproducts]) obtainable.add(ref.resourceId);
  }
  for (const building of bundle.buildings) {
    for (const ref of building.constructionCost) {
      if (!obtainable.has(ref.resourceId)) {
        issues.push({ catalog: "buildings", itemId: building.id, message: `requires resource "${ref.resourceId}" which has no production or import path` });
      }
    }
  }
  for (const upgrade of bundle.upgrades) {
    for (const ref of upgrade.constructionCost) {
      if (!obtainable.has(ref.resourceId)) {
        issues.push({ catalog: "upgrades", itemId: upgrade.id, message: `requires resource "${ref.resourceId}" which has no production or import path` });
      }
    }
  }
  for (const recipe of bundle.recipes) {
    for (const ref of recipe.inputs) {
      if (!obtainable.has(ref.resourceId)) {
        issues.push({ catalog: "recipes", itemId: recipe.id, message: `requires resource "${ref.resourceId}" which has no production or import path` });
      }
    }
  }
}

/**
 * uses kahn's topological sort on the research-only unlock graph to detect circular unlock chains.
 * unlockIds that point to buildings or upgrades are ignored — only research-to-research
 * unlock edges are checked.
 */
function checkCircularUnlocks(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const researchIds = new Set(bundle.researchNodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const unlockChildren = new Map<string, string[]>();
  for (const node of bundle.researchNodes) {
    inDegree.set(node.id, 0);
    unlockChildren.set(node.id, []);
  }
  for (const node of bundle.researchNodes) {
    for (const unlockId of node.unlockIds) {
      if (!researchIds.has(unlockId)) continue;
      unlockChildren.get(node.id)?.push(unlockId);
      inDegree.set(unlockId, (inDegree.get(unlockId) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    processed++;
    for (const child of unlockChildren.get(id) ?? []) {
      const next = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }
  if (processed < bundle.researchNodes.length) {
    for (const [id, deg] of inDegree) {
      if (deg > 0) {
        issues.push({ catalog: "researchNodes", itemId: id, message: `is part of a circular unlock chain` });
      }
    }
  }
}

/**
 * checks that every site template tag in every sector definition matches a tag
 * declared in at least one building's validSiteTags, ensuring each site type
 * has at least one building that can be built there
 */
function checkSectorSiteTagRefs(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const knownTags = new Set<string>();
  for (const building of bundle.buildings) {
    for (const tag of building.validSiteTags) {
      knownTags.add(tag);
    }
  }
  for (const sector of bundle.sectors) {
    for (const template of sector.siteTemplates) {
      for (const tag of template.tags) {
        if (!knownTags.has(tag)) {
          issues.push({
            catalog: "sectors",
            itemId: sector.id,
            message: `site template "${template.templateId}" uses tag "${tag}" not found in any building's validSiteTags`,
          });
        }
      }
    }
  }
}

/**
 * checks that every finite reserve resourceId declared by any sector has at least one
 * compatible extractor building (type "extractor", sourceKind "reserve") listing it in
 * compatibleResourceIds — i.e. every extractable reserve type has a compatible facility path.
 */
function checkReserveExtractorCoverage(bundle: ContentBundle, issues: SemanticIssue[]): void {
  const coveredResourceIds = new Set<string>();
  for (const building of bundle.buildings) {
    if (building.type === "extractor" && building.sourceKind === "reserve") {
      for (const resourceId of building.compatibleResourceIds) coveredResourceIds.add(resourceId);
    }
  }
  for (const sector of bundle.sectors) {
    for (const reserve of sector.reserves) {
      if (!coveredResourceIds.has(reserve.resourceId)) {
        issues.push({
          catalog: "sectors",
          itemId: sector.id,
          message: `finite reserve "${reserve.resourceId}" has no compatible extractor building (type "extractor", sourceKind "reserve")`,
        });
      }
    }
  }
}

/**
 * validates a structurally correct ContentBundle for semantic consistency and returns either
 * an immutable IndexedCatalog or a list of accumulated SemanticIssues
 */
export function buildIndexedCatalog(bundle: ContentBundle): SemanticResult {
  const issues: SemanticIssue[] = [];
  checkDuplicateIds(bundle, issues);
  checkRecipeRefs(bundle, issues);
  checkBuildingRefs(bundle, issues);
  checkUpgradeRefs(bundle, issues);
  checkResearchNodeRefs(bundle, issues);
  checkResearchCycles(bundle, issues);
  checkResearchReachability(bundle, issues);
  checkResourceProducibility(bundle, issues);
  checkCircularUnlocks(bundle, issues);
  checkSectorSiteTagRefs(bundle, issues);
  checkReserveExtractorCoverage(bundle, issues);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, catalog: new IndexedCatalog(bundle) };
}
