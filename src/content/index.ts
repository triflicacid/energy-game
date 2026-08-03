// content loading, validation, and definition catalogs
// no dependency on simulation, rendering, or ui

export type {
  ResourceRef,
  ResourceDef,
  RecipeDef,
  FacilityDef,
  UpgradeDef,
  ResearchNodeDef,
  ContentBundle,
} from "./defs";
export type { ValidationIssue } from "./validate";
export type { RawCatalogs, LoadResult } from "./ContentLoader";
export { ContentLoader, loadBundledContent } from "./ContentLoader";
