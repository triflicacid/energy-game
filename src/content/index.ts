// content loading, validation, and definition catalogs
// no dependency on simulation, rendering, or ui

export type {
  ResourceRef,
  ResourceDef,
  RecipeDef,
  BuildingDef,
  GenericBuildingDef,
  ExtractorBuildingDef,
  ExtractorSourceKind,
  UpgradeDef,
  ResearchNodeDef,
  SiteTemplateDef,
  SectorDef,
  SectorAccessState,
  InnateWoodlandDef,
  SectorWaterDef,
  SectorReserveDef,
  PlantedForestProfileDef,
  ContentBundle,
} from "./defs";
export type { ValidationIssue } from "./validate";
export type { RawCatalogs, LoadResult } from "./ContentLoader";
export { ContentLoader, loadBundledContent } from "./ContentLoader";
export type { SemanticIssue, SemanticResult } from "./IndexedCatalog";
export { IndexedCatalog, buildIndexedCatalog } from "./IndexedCatalog";
