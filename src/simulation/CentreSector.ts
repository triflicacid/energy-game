// stamps the hand-authored centre sector, its sites, and a starting town into campaign state

import type { IndexedCatalog } from "@content";
import { IdCounter, makeSectorId, makeSiteId, makeTownId } from "@shared/IdCounter";
import type { CampaignState } from "./CampaignState";

/** thrown when the centre sector cannot be created due to a missing definition or invalid content */
export class CentreSectorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CentreSectorError";
  }
}

/**
 * stamps the hand-authored centre sector, its sites, and a starting town into campaign state.
 * mutates state's sectors, sites, towns, and idCounters fields.
 * @throws CentreSectorError if the "centre" sector definition is absent from the catalog,
 *   or if a site template tag is not declared in any facility's validSiteTags
 */
export function createCentreSector(state: CampaignState, catalog: IndexedCatalog): void {
  const def = catalog.sectors.get("centre");
  if (!def) {
    throw new CentreSectorError('sector definition "centre" not found in catalog');
  }

  // collect every tag declared across all facility validSiteTags
  const knownSiteTags = new Set<string>();
  for (const facility of catalog.facilities.values()) {
    for (const tag of facility.validSiteTags) {
      knownSiteTags.add(tag);
    }
  }

  // validate all site template tags before mutating state
  for (const template of def.siteTemplates) {
    for (const tag of template.tags) {
      if (!knownSiteTags.has(tag)) {
        throw new CentreSectorError(
          `site template "${template.templateId}" uses tag "${tag}" not declared in any facility's validSiteTags`,
        );
      }
    }
  }

  const sectorCounter = new IdCounter(state.idCounters.sectors);
  const siteCounter = new IdCounter(state.idCounters.sites);
  const townCounter = new IdCounter(state.idCounters.towns);

  const sectorId = makeSectorId(sectorCounter);

  const newSites = { ...state.sites };
  const siteIds: string[] = [];
  for (const template of def.siteTemplates) {
    const siteId = makeSiteId(siteCounter);
    newSites[siteId] = { id: siteId, sectorId, templateId: template.templateId, tags: template.tags, facilityId: null };
    siteIds.push(siteId);
  }

  const newTowns = { ...state.towns };
  const townIds: string[] = [];
  if (def.hasTown) {
    const townId = makeTownId(townCounter);
    newTowns[townId] = { id: townId, sectorId };
    townIds.push(townId);
  }

  state.sectors = {
    ...state.sectors,
    [sectorId]: {
      id: sectorId,
      definitionId: def.id,
      accessState: def.initialAccessState,
      townIds,
      siteIds,
    },
  };
  state.sites = newSites;
  state.towns = newTowns;
  state.idCounters = {
    ...state.idCounters,
    sectors: sectorCounter.peek(),
    sites: siteCounter.peek(),
    towns: townCounter.peek(),
  };
}

