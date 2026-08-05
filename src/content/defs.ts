// canonical content definition types used by the loading boundary and simulation

import type { BiomeId, ResourceId } from "@shared/IdCounter";

/** progression states a sector moves through as the player expands */
export type SectorAccessState =
  | "unknown"
  | "frontier"
  | "explored"
  | "surveyed"
  | "unlocked"
  | "buildable";

/** a named construction site template within a sector definition */
export type SiteTemplateDef = {
  /** stable identifier for this site template within its parent sector */
  readonly templateId: string;
  /** facility site-type tags that determine which facilities may be built here */
  readonly tags: readonly string[];
  /** tile offset from the sector centre along the x axis */
  readonly x: number;
  /** tile offset from the sector centre along the y axis */
  readonly y: number;
};

/**
 * definition-time parameters for a sector's innate woodland.
 * null on a SectorDef means that sector has no woodland at all.
 * this is content data; current biomass is tracked separately as runtime sector state.
 */
export type InnateWoodlandDef = {
  readonly maxBiomassKg: number;
  readonly initialBiomassKg: number;
  /** biomass at or below this level is no longer viable and stops growing */
  readonly viabilityThresholdKg: number;
  readonly growthRateKgPerHour: number;
};

/**
 * definition-time parameters for a sector's local water stock.
 * null on a SectorDef means that sector has no local water source.
 * this is content data; current stock is tracked separately as runtime sector state.
 */
export type SectorWaterDef = {
  readonly maxStockM3: number;
  readonly initialStockM3: number;
  readonly baselineInflowM3PerHour: number;
};

/**
 * definition-time finite reserve/endowment record for one resource type.
 * this is a structured sector-state record, not a spawned deposit entity — it carries
 * no deposit ID and is addressed by (sectorId, resourceId) only.
 */
export type SectorReserveDef = {
  readonly resourceId: string;
  readonly initialQuantity: number;
  readonly surveyed: boolean;
};

/** immutable definition of a map sector */
export type SectorDef = {
  readonly id: string;
  readonly name: string;
  /** biome or environment tag used for exploration/construction permission checks */
  readonly biome: BiomeId;
  /** shortest-path distance in sector-graph edges from the designated centre sector */
  readonly distanceFromCentre: number;
  /** sector width and height in tiles; determines visual footprint on the campaign map */
  readonly diameter: number;
  /** axial hex-grid column on the campaign map (0 for the centre sector) */
  readonly gridQ: number;
  /** axial hex-grid row on the campaign map (0 for the centre sector) */
  readonly gridR: number;
  /** site templates pre-defined in this sector */
  readonly siteTemplates: readonly SiteTemplateDef[];
  /** whether a starting town is generated in this sector on campaign initialisation */
  readonly hasTown: boolean;
  /** access state assigned to this sector when a new campaign is created */
  readonly initialAccessState: SectorAccessState;
  /** innate woodland parameters, or null if this sector has no woodland */
  readonly innateWoodland: InnateWoodlandDef | null;
  /** local water parameters, or null if this sector has no local water source */
  readonly water: SectorWaterDef | null;
  /** finite reserve/endowment records for this sector, keyed by resourceId within the array */
  readonly reserves: readonly SectorReserveDef[];
};

/** a quantity of a named resource used in recipes and construction costs */
export type ResourceRef = {
  readonly resourceId: ResourceId;
  readonly qty: number;
};

/** immutable definition of a storable/tradeable material */
export type ResourceDef = {
  readonly id: ResourceId;
  readonly category: string;
  readonly unit: string;
  readonly storable: boolean;
  readonly importable: boolean;
  readonly renewable: boolean;
  readonly waste: boolean;
  readonly hazardous: boolean;
  /** stable sprite ID resolved by every inventory/production UI row; every inventory resource must resolve one */
  readonly iconId: string;
};

/** describes inputs, outputs, power requirements, and duration for one production step */
export type RecipeDef = {
  readonly id: string;
  readonly inputs: readonly ResourceRef[];
  readonly outputs: readonly ResourceRef[];
  readonly byproducts: readonly ResourceRef[];
  readonly durationHours: number;
  readonly mechPowerKW: number;
  readonly requiredResearch: readonly string[];
  readonly requiredCapabilities: readonly string[];
};

/** fields shared by every building definition, regardless of its type */
type BuildingDefBase = {
  readonly id: string;
  readonly behaviorId: string;
  readonly validSiteTags: readonly string[];
  readonly constructionCost: readonly ResourceRef[];
  readonly constructionMoneyBase: number;
  readonly constructionTimeHours: number;
  readonly requiredResearch: readonly string[];
  readonly recipeIds: readonly string[];
  readonly upgradeIds: readonly string[];
  readonly capabilities: readonly string[];
  /** default world sprite ID; omitted for facilities with no authored sprite yet */
  readonly spriteId?: string;
};

/** an ordinary building with no extraction behavior — e.g. waterwheel, workshop, forestry operation */
export type GenericBuildingDef = BuildingDefBase & {
  readonly type: "generic";
};

/** which sector-owned natural-resource pool an extractor building draws from */
export type ExtractorSourceKind = "reserve" | "woodland" | "water";

/**
 * a building that moves sector reserve, woodland, or water into the company inventory.
 * compatibleResourceIds only constrains sourceKind "reserve"; woodland/water extraction
 * draws whatever the sector has and ignores this list.
 */
export type ExtractorBuildingDef = BuildingDefBase & {
  readonly type: "extractor";
  readonly sourceKind: ExtractorSourceKind;
  readonly compatibleResourceIds: readonly string[];
  readonly capacityPerHour: number;
};

/** discriminated union of every building type; `type` is the extension discriminant */
export type BuildingDef = GenericBuildingDef | ExtractorBuildingDef;

/** immutable definition of a facility upgrade */
export type UpgradeDef = {
  readonly id: string;
  readonly applicableFacilityIds: readonly string[];
  readonly requiredResearch: readonly string[];
  readonly exclusionGroup: string | null;
  readonly constructionCost: readonly ResourceRef[];
  readonly constructionMoneyBase: number;
  readonly constructionTimeHours: number;
};

/** immutable definition of a research tree node */
export type ResearchNodeDef = {
  readonly id: string;
  readonly era: string;
  readonly parentIds: readonly string[];
  readonly researchCost: number;
  readonly unlockIds: readonly string[];
};

/**
 * global lifecycle/growth profile for player-planted forests. planted forests are the only
 * separate natural-resource instances; this definition supplies the shared constants that
 * drive their visual-state selection. runtime instances reference a profile by ID.
 */
export type PlantedForestProfileDef = {
  readonly id: string;
  readonly maxBiomassKg: number;
  readonly growthRateKgPerHour: number;
  /** biomass at or below this fraction of max is "nearly empty" */
  readonly nearlyEmptyMaxFraction: number;
  /** biomass at or below this fraction of max (and above nearlyEmptyMaxFraction) is "semi-harvested/sparse" */
  readonly semiHarvestedMaxFraction: number;
  /** biomass at or above this fraction of max is "mature/full" */
  readonly matureMinFraction: number;
};

/** all typed content definitions produced by a successful load */
export type ContentBundle = {
  readonly resources: readonly ResourceDef[];
  readonly recipes: readonly RecipeDef[];
  readonly buildings: readonly BuildingDef[];
  readonly upgrades: readonly UpgradeDef[];
  readonly researchNodes: readonly ResearchNodeDef[];
  readonly sectors: readonly SectorDef[];
  readonly plantedForestProfiles: readonly PlantedForestProfileDef[];
};
