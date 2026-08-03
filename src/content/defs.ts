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

/** immutable definition of a buildable facility */
export type FacilityDef = {
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
};

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

/** all typed content definitions produced by a successful load */
export type ContentBundle = {
  readonly resources: readonly ResourceDef[];
  readonly recipes: readonly RecipeDef[];
  readonly facilities: readonly FacilityDef[];
  readonly upgrades: readonly UpgradeDef[];
  readonly researchNodes: readonly ResearchNodeDef[];
  readonly sectors: readonly SectorDef[];
};
