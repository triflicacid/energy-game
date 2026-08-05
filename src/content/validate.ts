// structural validators for content definition types

import type { ResourceId } from "@shared/IdCounter";
import { makeBiomeId } from "@shared/IdCounter";
import type {
  BuildingDef,
  ContentBundle,
  ExtractorSourceKind,
  InnateWoodlandDef,
  PlantedForestProfileDef,
  RecipeDef,
  ResearchNodeDef,
  ResourceDef,
  ResourceRef,
  SectorAccessState,
  SectorDef,
  SectorReserveDef,
  SectorWaterDef,
  SiteTemplateDef,
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

/** reads any finite number from an object, including negative values; returns null if absent or non-finite */
function readFiniteNum(o: Record<string, unknown>, f: string): number | null {
  const v = o[f];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** reads a finite integer from an object, including negative values; returns null if absent, non-finite, or fractional */
function readIntNum(o: Record<string, unknown>, f: string): number | null {
  const v = o[f];
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) ? v : null;
}

/** reads a resource's mandatory icon reference; must be a non-empty string starting with "icon-" */
function readIconId(
  o: Record<string, unknown>,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  id: string | null,
): string | null {
  const v = o["iconId"];
  if (typeof v !== "string" || v.trim().length === 0) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "iconId", message: "must be a non-empty string" });
    return null;
  }
  if (!v.startsWith("icon-")) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "iconId", message: 'must start with "icon-"' });
    return null;
  }
  return v;
}

/**
 * fields that would introduce a per-building/per-facility material inventory.
 * the game uses exactly one company-wide inventory; rejecting these keys keeps
 * content from silently growing a second storage concept.
 */
const FORBIDDEN_INVENTORY_KEYS: readonly string[] = [
  "inventory",
  "warehouse",
  "warehouseInventory",
  "localInventory",
  "facilityInventory",
  "sectorInventory",
  "generalInventory",
];

/** structural guard: rejects any per-building inventory field on a raw content object */
function checkNoInventoryKeys(
  o: Record<string, unknown>,
  catalog: string,
  index: number,
  id: string | null,
  issues: ValidationIssue[],
): void {
  for (const key of FORBIDDEN_INVENTORY_KEYS) {
    if (key in o) {
      issues.push({
        catalog,
        itemIndex: index,
        itemId: id,
        path: key,
        message: "must not be defined — the game uses exactly one company-wide inventory, not a per-building inventory",
      });
    }
  }
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
  const iconId = readIconId(o, issues, catalog, index, id);

  if (!id || !category || !unit || storable === null || importable === null || renewable === null || waste === null || hazardous === null || !iconId) return null;
  return { id: id as ResourceId, category, unit, storable, importable, renewable, waste, hazardous, iconId };
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

const VALID_BUILDING_TYPES: ReadonlySet<string> = new Set(["generic", "extractor"]);
const VALID_SOURCE_KINDS: ReadonlySet<string> = new Set<ExtractorSourceKind>(["reserve", "woodland", "water"]);

/** validates one raw building entry, accumulating issues and returning the typed def or null */
export function validateBuildingDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): BuildingDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });

  checkNoInventoryKeys(o, catalog, index, id, issues);

  const behaviorId = readStr(o, "behaviorId");
  if (!behaviorId) issues.push({ catalog, itemIndex: index, itemId: id, path: "behaviorId", message: "must be a non-empty string" });
  const validSiteTags = readStringArray(o, "validSiteTags", issues, catalog, index, id);
  const constructionCost = readResourceRefArray(o, "constructionCost", issues, catalog, index, id);
  const constructionMoneyBase = readNum(o, "constructionMoneyBase", false);
  if (constructionMoneyBase === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionMoneyBase", message: "must be a finite non-negative number" });
  const constructionTimeHours = readNum(o, "constructionTimeHours", true);
  if (constructionTimeHours === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "constructionTimeHours", message: "must be a finite positive number" });
  const requiredResearch = readStringArray(o, "requiredResearch", issues, catalog, index, id);
  const recipeIds = readStringArray(o, "recipeIds", issues, catalog, index, id);
  const upgradeIds = readStringArray(o, "upgradeIds", issues, catalog, index, id);
  const capabilities = readStringArray(o, "capabilities", issues, catalog, index, id);

  const rawType = o["type"];
  let type: "generic" | "extractor" | null = null;
  if (typeof rawType !== "string" || !VALID_BUILDING_TYPES.has(rawType)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "type", message: `must be one of: ${[...VALID_BUILDING_TYPES].join(", ")}` });
  } else {
    type = rawType as "generic" | "extractor";
  }

  if (!id || !behaviorId || !validSiteTags || !constructionCost || constructionMoneyBase === null || constructionTimeHours === null || !requiredResearch || !recipeIds || !upgradeIds || !capabilities || !type) {
    return null;
  }

  // spriteId is optional; present only for buildings with authored sprites
  const rawSprite = o["spriteId"];
  const spriteId = typeof rawSprite === "string" && rawSprite.trim().length > 0 ? rawSprite : undefined;
  const base = {
    id, behaviorId, validSiteTags, constructionCost, constructionMoneyBase, constructionTimeHours,
    requiredResearch, recipeIds, upgradeIds, capabilities,
    ...(spriteId !== undefined ? { spriteId } : {}),
  };

  if (type === "generic") {
    return { ...base, type: "generic" };
  }

  // type === "extractor"
  const rawSourceKind = o["sourceKind"];
  let sourceKind: ExtractorSourceKind | null = null;
  if (typeof rawSourceKind !== "string" || !VALID_SOURCE_KINDS.has(rawSourceKind)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "sourceKind", message: `must be one of: ${[...VALID_SOURCE_KINDS].join(", ")}` });
  } else {
    sourceKind = rawSourceKind as ExtractorSourceKind;
  }
  const compatibleResourceIds = readStringArray(o, "compatibleResourceIds", issues, catalog, index, id);
  const capacityPerHour = readNum(o, "capacityPerHour", true);
  if (capacityPerHour === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "capacityPerHour", message: "must be a finite positive number" });

  if (!sourceKind || !compatibleResourceIds || capacityPerHour === null) return null;
  return { ...base, type: "extractor", sourceKind, compatibleResourceIds, capacityPerHour };
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

/** validates the "innateWoodland" field: null (no woodland) or a valid definition object */
function validateInnateWoodlandDef(
  o: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  sectorId: string | null,
): InnateWoodlandDef | null | undefined {
  if (!(field in o)) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: field, message: "must be an object or null" });
    return undefined;
  }
  const v = o[field];
  if (v === null) return null;
  const rec = asRecord(v);
  if (!rec) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: field, message: "must be an object or null" });
    return undefined;
  }
  const maxBiomassKg = readNum(rec, "maxBiomassKg", true);
  if (maxBiomassKg === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.maxBiomassKg`, message: "must be a finite positive number" });
  const initialBiomassKg = readNum(rec, "initialBiomassKg", false);
  if (initialBiomassKg === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.initialBiomassKg`, message: "must be a finite non-negative number" });
  const viabilityThresholdKg = readNum(rec, "viabilityThresholdKg", false);
  if (viabilityThresholdKg === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.viabilityThresholdKg`, message: "must be a finite non-negative number" });
  const growthRateKgPerHour = readNum(rec, "growthRateKgPerHour", false);
  if (growthRateKgPerHour === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.growthRateKgPerHour`, message: "must be a finite non-negative number" });
  if (maxBiomassKg === null || initialBiomassKg === null || viabilityThresholdKg === null || growthRateKgPerHour === null) return undefined;
  if (initialBiomassKg > maxBiomassKg) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.initialBiomassKg`, message: "must not exceed maxBiomassKg" });
    return undefined;
  }
  return { maxBiomassKg, initialBiomassKg, viabilityThresholdKg, growthRateKgPerHour };
}

/** validates the "water" field: null (no local water source) or a valid definition object */
function validateSectorWaterDef(
  o: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  sectorId: string | null,
): SectorWaterDef | null | undefined {
  if (!(field in o)) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: field, message: "must be an object or null" });
    return undefined;
  }
  const v = o[field];
  if (v === null) return null;
  const rec = asRecord(v);
  if (!rec) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: field, message: "must be an object or null" });
    return undefined;
  }
  const maxStockM3 = readNum(rec, "maxStockM3", true);
  if (maxStockM3 === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.maxStockM3`, message: "must be a finite positive number" });
  const initialStockM3 = readNum(rec, "initialStockM3", false);
  if (initialStockM3 === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.initialStockM3`, message: "must be a finite non-negative number" });
  const baselineInflowM3PerHour = readNum(rec, "baselineInflowM3PerHour", false);
  if (baselineInflowM3PerHour === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.baselineInflowM3PerHour`, message: "must be a finite non-negative number" });
  if (maxStockM3 === null || initialStockM3 === null || baselineInflowM3PerHour === null) return undefined;
  if (initialStockM3 > maxStockM3) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `${field}.initialStockM3`, message: "must not exceed maxStockM3" });
    return undefined;
  }
  return { maxStockM3, initialStockM3, baselineInflowM3PerHour };
}

/** validates one raw finite-reserve entry within a sector's "reserves" array */
function validateSectorReserveDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
  sectorId: string | null,
  reserveIndex: number,
): SectorReserveDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `reserves[${reserveIndex}]`, message: "must be an object" });
    return null;
  }
  const resourceId = readStr(o, "resourceId");
  if (!resourceId) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `reserves[${reserveIndex}].resourceId`, message: "must be a non-empty string" });
  const initialQuantity = readNum(o, "initialQuantity", false);
  if (initialQuantity === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `reserves[${reserveIndex}].initialQuantity`, message: "must be a finite non-negative number" });
  const surveyed = readBool(o, "surveyed");
  if (surveyed === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `reserves[${reserveIndex}].surveyed`, message: "must be a boolean" });
  if (!resourceId || initialQuantity === null || surveyed === null) return null;
  return { resourceId, initialQuantity, surveyed };
}

/** reads the "reserves" array field, validating every entry */
function readReservesArray(
  o: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  catalog: string,
  index: number,
  sectorId: string | null,
): SectorReserveDef[] | null {
  const v = o[field];
  if (!Array.isArray(v)) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: field, message: "must be an array" });
    return null;
  }
  let ok = true;
  const result: SectorReserveDef[] = [];
  for (let i = 0; i < v.length; i++) {
    const r = validateSectorReserveDef(v[i], catalog, index, issues, sectorId, i);
    if (r === null) { ok = false; } else { result.push(r); }
  }
  return ok ? result : null;
}

/** validates one raw planted-forest lifecycle profile entry, accumulating issues and returning the typed def or null */
export function validatePlantedForestProfileDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
): PlantedForestProfileDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: null, path: "", message: "must be an object" });
    return null;
  }
  const id = readStr(o, "id");
  if (!id) issues.push({ catalog, itemIndex: index, itemId: null, path: "id", message: "must be a non-empty string" });
  const maxBiomassKg = readNum(o, "maxBiomassKg", true);
  if (maxBiomassKg === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "maxBiomassKg", message: "must be a finite positive number" });
  const growthRateKgPerHour = readNum(o, "growthRateKgPerHour", false);
  if (growthRateKgPerHour === null) issues.push({ catalog, itemIndex: index, itemId: id, path: "growthRateKgPerHour", message: "must be a finite non-negative number" });

  const nearlyEmptyMaxFraction = readNum(o, "nearlyEmptyMaxFraction", false);
  if (nearlyEmptyMaxFraction === null || nearlyEmptyMaxFraction > 1) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "nearlyEmptyMaxFraction", message: "must be a finite number between 0 and 1" });
  }
  const semiHarvestedMaxFraction = readNum(o, "semiHarvestedMaxFraction", false);
  if (semiHarvestedMaxFraction === null || semiHarvestedMaxFraction > 1) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "semiHarvestedMaxFraction", message: "must be a finite number between 0 and 1" });
  }
  const matureMinFraction = readNum(o, "matureMinFraction", false);
  if (matureMinFraction === null || matureMinFraction > 1) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "matureMinFraction", message: "must be a finite number between 0 and 1" });
  }

  if (
    !id || maxBiomassKg === null || growthRateKgPerHour === null ||
    nearlyEmptyMaxFraction === null || nearlyEmptyMaxFraction > 1 ||
    semiHarvestedMaxFraction === null || semiHarvestedMaxFraction > 1 ||
    matureMinFraction === null || matureMinFraction > 1
  ) {
    return null;
  }
  if (!(nearlyEmptyMaxFraction <= semiHarvestedMaxFraction && semiHarvestedMaxFraction <= matureMinFraction)) {
    issues.push({
      catalog, itemIndex: index, itemId: id, path: "matureMinFraction",
      message: "fraction thresholds must satisfy nearlyEmptyMaxFraction <= semiHarvestedMaxFraction <= matureMinFraction",
    });
    return null;
  }
  return { id, maxBiomassKg, growthRateKgPerHour, nearlyEmptyMaxFraction, semiHarvestedMaxFraction, matureMinFraction };
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
  buildings: unknown,
  upgrades: unknown,
  researchNodes: unknown,
  sectors: unknown = [],
  plantedForestProfiles: unknown = [],
): { bundle: ContentBundle; issues: readonly ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const bundle: ContentBundle = {
    resources: validateCatalog(resources, "resources", validateResourceDef, issues),
    recipes: validateCatalog(recipes, "recipes", validateRecipeDef, issues),
    buildings: validateCatalog(buildings, "buildings", validateBuildingDef, issues),
    upgrades: validateCatalog(upgrades, "upgrades", validateUpgradeDef, issues),
    researchNodes: validateCatalog(researchNodes, "researchNodes", validateResearchNodeDef, issues),
    sectors: validateCatalog(sectors, "sectors", validateSectorDef, issues),
    plantedForestProfiles: validateCatalog(plantedForestProfiles, "plantedForestProfiles", validatePlantedForestProfileDef, issues),
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

/** validates one raw site template entry within a sector definition */
export function validateSiteTemplateDef(
  raw: unknown,
  catalog: string,
  index: number,
  issues: ValidationIssue[],
  sectorId: string | null,
  templateIndex: number,
): SiteTemplateDef | null {
  const o = asRecord(raw);
  if (!o) {
    issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `siteTemplates[${templateIndex}]`, message: "must be an object" });
    return null;
  }
  const templateId = readStr(o, "templateId");
  if (!templateId) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `siteTemplates[${templateIndex}].templateId`, message: "must be a non-empty string" });
  const tags = readStringArray(o, "tags", issues, catalog, index, sectorId);
  const x = readFiniteNum(o, "x");
  if (x === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `siteTemplates[${templateIndex}].x`, message: "must be a finite number" });
  const y = readFiniteNum(o, "y");
  if (y === null) issues.push({ catalog, itemIndex: index, itemId: sectorId, path: `siteTemplates[${templateIndex}].y`, message: "must be a finite number" });
  if (!templateId || !tags || x === null || y === null) return null;
  return { templateId, tags, x, y };
}

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

  const rawTemplates = o["siteTemplates"];
  let siteTemplates: SiteTemplateDef[] | null = null;
  if (!Array.isArray(rawTemplates)) {
    issues.push({ catalog, itemIndex: index, itemId: id, path: "siteTemplates", message: "must be an array" });
  } else {
    siteTemplates = [];
    let ok = true;
    for (let i = 0; i < rawTemplates.length; i++) {
      const t = validateSiteTemplateDef(rawTemplates[i], catalog, index, issues, id, i);
      if (t === null) { ok = false; } else { siteTemplates.push(t); }
    }
    if (!ok) siteTemplates = null;
  }

  const innateWoodland = validateInnateWoodlandDef(o, "innateWoodland", issues, catalog, index, id);
  const water = validateSectorWaterDef(o, "water", issues, catalog, index, id);
  const reserves = readReservesArray(o, "reserves", issues, catalog, index, id);

  if (
    !id || !name || !biome || distanceFromCentre === null || diameter === null || gridQ === null || gridR === null ||
    hasTown === null || !initialAccessState || !siteTemplates ||
    innateWoodland === undefined || water === undefined || !reserves
  ) {
    return null;
  }
  return {
    id, name, biome: makeBiomeId(biome), distanceFromCentre, diameter, gridQ, gridR, siteTemplates, hasTown, initialAccessState,
    innateWoodland, water, reserves,
  };
}
