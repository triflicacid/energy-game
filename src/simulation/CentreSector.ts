// applies the hand-authored centre-sector fixture into campaign state

import type { IndexedCatalog } from "@content";
import type { CampaignState } from "./CampaignState";
import initialCentreMapJson from "./fixtures/initial-centre-map.json";

/** kept for compatibility with older call sites/tests */
export class CentreSectorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CentreSectorError";
  }
}

/**
 * applies the static centre-sector fixture into campaign state.
 * the fixture is user-editable JSON and is cloned into state on each fresh map.
 *
 * `catalog` remains in the signature for compatibility; it is intentionally unused.
 */
export function createCentreSector(state: CampaignState, _catalog: IndexedCatalog): void {
  const initialCentreMap = initialCentreMapJson as {
    readonly idCounters: { readonly sectors: number; readonly sites: number; readonly towns: number };
    readonly sectors: Readonly<Record<string, CampaignState["sectors"][string]>>;
    readonly sites: Readonly<Record<string, CampaignState["sites"][string]>>;
    readonly towns: Readonly<Record<string, CampaignState["towns"][string]>>;
  };

  state.sectors = JSON.parse(JSON.stringify(initialCentreMap.sectors));
  state.sites = JSON.parse(JSON.stringify(initialCentreMap.sites));
  state.towns = JSON.parse(JSON.stringify(initialCentreMap.towns));
  state.idCounters = {
    ...state.idCounters,
    sectors: initialCentreMap.idCounters.sectors,
    sites: initialCentreMap.idCounters.sites,
    towns: initialCentreMap.idCounters.towns,
  };
}

