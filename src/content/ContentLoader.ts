// loading boundary: accepts raw unknown catalogs, validates structure, returns typed bundle

import type { ContentBundle } from "./defs";
import type { ValidationIssue } from "./validate";
import { validateBundle } from "./validate";
import resourcesJson from "./fixtures/resources.json";
import recipesJson from "./fixtures/recipes.json";
import facilitiesJson from "./fixtures/facilities.json";
import upgradesJson from "./fixtures/upgrades.json";
import researchJson from "./fixtures/research.json";
import sectorsJson from "./fixtures/sectors.json";

/** raw catalog inputs accepted by the loader — each field is unknown to enforce validation */
export interface RawCatalogs {
  readonly resources: unknown;
  readonly recipes: unknown;
  readonly facilities: unknown;
  readonly upgrades: unknown;
  readonly researchNodes: unknown;
  /** optional; defaults to an empty array when omitted */
  readonly sectors?: unknown;
}

/** discriminated union returned by the loader */
export type LoadResult =
  | { readonly ok: true; readonly bundle: ContentBundle }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/** validates raw catalog data and returns typed definitions or a list of structural issues */
export class ContentLoader {
  /** validates all catalogs and returns a bundle or accumulated issues */
  public load(raw: RawCatalogs): LoadResult {
    const { bundle, issues } = validateBundle(
      raw.resources,
      raw.recipes,
      raw.facilities,
      raw.upgrades,
      raw.researchNodes,
      raw.sectors ?? [],
    );
    if (issues.length > 0) return { ok: false, issues };
    return { ok: true, bundle };
  }
}

/** loads and validates the bundled fixture definitions */
export function loadBundledContent(): LoadResult {
  const loader = new ContentLoader();
  return loader.load({
    resources: resourcesJson,
    recipes: recipesJson,
    facilities: facilitiesJson,
    upgrades: upgradesJson,
    researchNodes: researchJson,
    sectors: sectorsJson,
  });
}



