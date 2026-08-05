// structural validators for content definition types

import type { ResourceId } from "@shared/IdCounter";
import { makeBiomeId } from "@shared/IdCounter";
import type {
  ContentBundle,
  FacilityDef,
  RecipeDef,
  ResearchNodeDef,
  ResourceDef,
  ResourceRef,
  SectorAccessState,
  SectorDef,
  UpgradeDef,
} from "./defs";

/** a single structural validation failure with location and description */
export type ValidationIssue = {
  readonly catalog: string;
  readonly itemIndex: number;
  readonly itemId: string | null;
  readonly path: string;
  readonly message: string;
};

/** narrows an unknown value to a plain object, returning null if it is a primitive, null, or array */
function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** reads a non-empty string field from an object, returning null if absent or not a non-empty string */
function readStr(o: Record<string, unknown>, f: string): string | null {
  const v = o[f];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** reads a boolean field from an object, returning null if absent or not a boolean */
function readBool(o: Record<string, unknown>, f: string): boolean | null {
  const v = o[f];
  return typeof v === "boolean" ? v : null;
}

/**
 * reads a finite non-negative number field from an object.
 * when positive is true, zero is also rejected.
 * returns null if absent, non-finite, or out of the allowed range.
 */
function readNum(o: Record<string, unknown>, f: string, positive: boolean): number | null {
  const v = o[f];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  if (positive && v === 0) return null;
  return v as number;
}

/** reads a finite integer from an object, including negative values; returns null if absent, non-finite, or fractional */
function readIntNum(o: Record<string, unknown>, f: string): number | null {
  const v = o[f];
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) ? v : null;
}

/**
 * reads an array-of-strings field from an object.
 * pushes an issue for each element that is not a non-empty string.
 * returns null if the field is not an array or any element is invalid.
 */
function readStringArray(
  o: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  id: string | null,
): string[] | null {
  const v = o[field];
  if (!Array.isArray(v)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: field, message: "must be an array" });
    return null;
  }
  let ok = true;
  const result: string[] = [];
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] === "string" && (v[i] as string).trim().length > 0) {
      result.push(v[i] as string);
    } else {
      issues.push({ catalog, itemIndex: index, itemId: id, path: `${field}[${i}]`, message: "must be a non-empty string" });
      ok = false;
    }
  }
  return ok ? result : null;
}

/**
 * reads an array-of-ResourceRef field from an object.
 * pushes an issue for each element that is not a valid { resourceId, qty } pair.
 * returns null if the field is not an array or any element is invalid.
 */
function readResourceRefArray(
  o: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  id: string | null,
): ResourceRef[] | null {
  const v = o[field];
  if (!Array.isArray(v)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: field, message: "must be an array" });
    return null;
  }
  let ok = true;
  const result: ResourceRef[] = [];
  for (let i = 0; i < v.length; i++) {
    const item = asRecord(v[i]);
    if (!item) {
      issues.push({ catalog, itemIndex: index, itemId: id, path: `${field}[${i}]`, message: "must be an object" });
      ok = false;
      continue;
    }
    const resourceId = readStr(item, "resourceId");
    const qty = readNum(item, "qty", true);
    if (!resourceId) {
      issues.push({ catalog, itemIndex: index, itemId: id, path: `${field}[${i}].resourceId`, message: "must be a non-empty string" });
      ok = false;
    }
    if (qty === null) {
      issues.push({ catalog, itemIndex: index, itemId: id, path: `${field}[${i}].qty`, message: "must be a finite positive number" });
      ok = false;
    }
    if (resourceId && qty !== null) result.push({ resourceId: resourceId as ResourceId, qty });
  }
  return ok ? result : null;
}

/** validates one raw resource entry, accumulating issues and returning the typed def or null */
export function validateResourceDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): ResourceDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const category = readStr(o, "category");
  if (!category) issues.push({ catalog, itemIndex: index, itemId: id, path: "category", message: "must be a non-empty string" });
  const unit = readStr(o, "unit");
  if (!unit) issues.push({ catalog, itemIndex: index, itemId: id, path: "unit", message: "must be a non-empty string" });
  const storable = readBool(o, "storable");
  if (storable === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "storable", message: "must be a boolean" });
  const importable = readBool(o, "importable");
  if (importable === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "importable", message: "must be a boolean" });
  const renewable = readBool(o, "renewable");
  if (renewable === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "renewable", message: "must be a boolean" });
  const waste = readBool(o, "waste");
  if (waste === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "waste", message: "must be a boolean" });
  const hazardous = readBool(o, "hazardous");
  if (hazardous === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "hazardous", message: "must be a boolean" });

  if (!id || !category || !unit || storable === null || importable === null || renewable === null || waste === null || hazardous === null) return null;
  return { id: id as ResourceId, category, unit, storable, importable, renewable, waste, hazardous };
}

/** validates one raw recipe entry, accumulating issues and returning the typed def or null */
export function validateRecipeDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): RecipeDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const inputs = readResourceRefArray(o, "inputs", issues, catalog, index, id);
  const outputs = readResourceRefArray(o, "outputs", issues, catalog, index, id);
  const byproducts = readResourceRefArray(o, "byproducts", issues, catalog, index, id);
  const durationHours = readNum(o, "durationHours", true);
  if (durationHours === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "durationHours", message: "must be a finite positive number" });
  const mechPowerKW = readNum(o, "mechPowerKW", false);
  if (mechPowerKW === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "mechPowerKW", message: "must be a finite non-negative number" });
  const requiredResearch = readStringArray(o, "requiredResearch", issues, catalog, index, id);
  const requiredCapabilities = readStringArray(o, "requiredCapabilities", issues, catalog, index, id);

  if (!id || !inputs || !outputs || !byproducts || durationHours === null || mechPowerKW === null || !requiredResearch || !requiredCapabilities) return null;
  return { id, inputs, outputs, byproducts, durationHours, mechPowerKW, requiredResearch, requiredCapabilities };
}

/** validates one raw facility entry, accumulating issues and returning the typed def or null */
export function validateFacilityDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): FacilityDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const behaviorId = readStr(o, "behaviorId");
  if (!behaviorId) issues.push({ catalog, itemIndex: index, itemId: id, path: "behaviorId", message: "must be a non-empty string" });
  const placementRuleId = readStr(o, "placementRuleId");
  if (!placementRuleId) issues.push({ catalog, itemIndex: index, itemId: id, path: "placementRuleId", message: "must be a non-empty string" });
  const constructionCost = readResourceRefArray(o, "constructionCost", issues, catalog, index, id);
  const constructionMoneyBase = readNum(o, "constructionMoneyBase", false);
  if (constructionMoneyBase === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionMoneyBase", message: "must be a finite non-negative number" });
  const constructionTimeHours = readNum(o, "constructionTimeHours", true);
  if (constructionTimeHours === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionTimeHours", message: "must be a finite positive number" });
  const requiredResearch = readStringArray(o, "requiredResearch", issues, catalog, index, id);
  const recipeIds = readStringArray(o, "recipeIds", issues, catalog, index, id);
  const upgradeIds = readStringArray(o, "upgradeIds", issues, catalog, index, id);
  const capabilities = readStringArray(o, "capabilities", issues, catalog, index, id);

  if (!id || !behaviorId || !placementRuleId || !constructionCost || constructionMoneyBase === null || constructionTimeHours === null || !requiredResearch || !recipeIds || !upgradeIds || !capabilities) return null;
  // spriteId is optional; present only for facilities with authored sprites
  const rawSprite = o["spriteId"];
  const spriteId = typeof rawSprite === "string" && rawSprite.trim().length > 0 ? rawSprite : undefined;
  return { id, behaviorId, placementRuleId, constructionCost, constructionMoneyBase, constructionTimeHours, requiredResearch, recipeIds, upgradeIds, capabilities, ...(spriteId !== undefined ? { spriteId } : {}) };
}

/** validates one raw upgrade entry, accumulating issues and returning the typed def or null */
export function validateUpgradeDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): UpgradeDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const applicableFacilityIds = readStringArray(o, "applicableFacilityIds", issues, catalog, index, id);
  const requiredResearch = readStringArray(o, "requiredResearch", issues, catalog, index, id);
  const constructionCost = readResourceRefArray(o, "constructionCost", issues, catalog, index, id);
  const constructionMoneyBase = readNum(o, "constructionMoneyBase", false);
  if (constructionMoneyBase === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionMoneyBase", message: "must be a finite non-negative number" });
  const constructionTimeHours = readNum(o, "constructionTimeHours", true);
  if (constructionTimeHours === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionTimeHours", message: "must be a finite positive number" });

  // exclusionGroup is optional — null means no group
  const rawExcl = o["exclusionGroup"];
  let exclusionGroup: string | null = null;
  if (rawExcl !== undefined && rawExcl !== null) {
    if (typeof rawExcl === "string" && rawExcl.trim().length > 0) {
      exclusionGroup = rawExcl;
    } else {
      issues.push({ catalog, itemIndex: index, itemId: id, path: "exclusionGroup", message: "must be a non-empty string or null" });
    }
  }

  if (!id || !applicableFacilityIds || !requiredResearch || !constructionCost || constructionMoneyBase === null || constructionTimeHours === null) return null;
  return { id, applicableFacilityIds, requiredResearch, exclusionGroup, constructionCost, constructionMoneyBase, constructionTimeHours };
}

/** validates one raw research node entry, accumulating issues and returning the typed def or null */
export function validateResearchNodeDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): ResearchNodeDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const era = readStr(o, "era");
  if (!era) issues.push({ catalog, itemIndex: index, itemId: id, path: "era", message: "must be a non-empty string" });
  const parentIds = readStringArray(o, "parentIds", issues, catalog, index, id);
  const researchCost = readNum(o, "researchCost", false);
  if (researchCost === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "researchCost", message: "must be a finite non-negative number" });
  const unlockIds = readStringArray(o, "unlockIds", issues, catalog, index, id);

  if (!id || !era || !parentIds || researchCost === null || !unlockIds) return null;
  return { id, era, parentIds, researchCost, unlockIds };
}

/** signature for a function that validates one raw item from a named catalog at a given index */
type CatalogValidator<T> = (raw: unknown, catalog: string, index: number, issues: ValidationIssue[]) => T | null;

/** validates an unknown value as an array of T, accumulating issues for each invalid item */
export function validateCatalog<T>(
  raw: unknown,
  catalogName: string,
  validator: CatalogValidator<T>,
  issues: ValidationIssue[],
): readonly T[] {
  if (!Array.isArray(raw)) {
    issues.push({ catalog: catalogName, itemIndex: -1, itemId: null, path: "", message: "must be an array" });
    return [];
  }
  const results: T[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = validator(raw[i], catalogName, i, issues);
    if (item !== null) results.push(item);
  }
  return results;
}

/** validates a complete set of raw catalog arrays into a ContentBundle */
export function validateBundle(
  resources: unknown,
  recipes: unknown,
  facilities: unknown,
  upgrades: unknown,
  researchNodes: unknown,
  sectors: unknown = [],
): { bundle: ContentBundle; issues: readonly ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const bundle: ContentBundle = {
    resources: validateCatalog(resources, "resources", validateResourceDef, issues),
    recipes: validateCatalog(recipes, "recipes", validateRecipeDef, issues),
    facilities: validateCatalog(facilities, "facilities", validateFacilityDef, issues),
    upgrades: validateCatalog(upgrades, "upgrades", validateUpgradeDef, issues),
    researchNodes: validateCatalog(researchNodes, "researchNodes", validateResearchNodeDef, issues),
    sectors: validateCatalog(sectors, "sectors", validateSectorDef, issues),
  };
  return { bundle, issues };
}

const VALID_ACCESS_STATES: ReadonlySet<string> = new Set<SectorAccessState>([
  "unknown",
  "frontier",
  "explored",
  "surveyed",
  "unlocked",
  "buildable",
]);

/** validates one raw sector definition entry, accumulating issues and returning the typed def or null */
export function validateSectorDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): SectorDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const name = readStr(o, "name");
  if (!name) issues.push({ catalog, itemIndex: index, itemId: id, path: "name", message: "must be a non-empty string" });
  const biome = readStr(o, "biome");
  if (!biome) issues.push({ catalog, itemIndex: index, itemId: id, path: "biome", message: "must be a non-empty string" });
  const distanceFromCentre = readNum(o, "distanceFromCentre", false);
  if (distanceFromCentre === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "distanceFromCentre", message: "must be a finite non-negative number" });
  const diameter = readNum(o, "diameter", true);
  if (diameter === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "diameter", message: "must be a finite positive number" });
  const gridQ = readIntNum(o, "gridQ");
  if (gridQ === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "gridQ", message: "must be a finite integer" });
  const gridR = readIntNum(o, "gridR");
  if (gridR === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "gridR", message: "must be a finite integer" });
  const hasTown = readBool(o, "hasTown");
  if (hasTown === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "hasTown", message: "must be a boolean" });

  const rawAccess = o["initialAccessState"];
  let initialAccessState: SectorAccessState | null = null;
  if (typeof rawAccess !== "string" || !VALID_ACCESS_STATES.has(rawAccess)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "initialAccessState", message: `must be one of: ${[...VALID_ACCESS_STATES].join(", ")}` });
  } else {
    initialAccessState = rawAccess as SectorAccessState;
  }

  if (!id || !name || !biome || distanceFromCentre === null || diameter === null || gridQ === null || gridR === null || hasTown === null || !initialAccessState) return null;
  return { id, name, biome: makeBiomeId(biome), distanceFromCentre, diameter, gridQ, gridR, hasTown, initialAccessState };
}

