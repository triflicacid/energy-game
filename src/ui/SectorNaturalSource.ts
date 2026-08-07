// QuantitySource config for the current sector's natural quantities: innate woodland biomass,
// local water stock, and known finite reserves.
//
// assumes a single sector, matching the M00 hand-authored centre sector; revisit the "sole
// sector" lookup once X00 introduces a real sector graph.

import type { Application } from "@application";
import type { SectorSerialState } from "@simulation/CampaignState";
import type { QuantityAddCandidate, QuantityRow } from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

const WOODLAND_ROW_ID = "woodland";
const WOODLAND_LABEL = "Woodland biomass";
// no dedicated small icon yet (A01); renders the standard missing-icon placeholder
const WOODLAND_ICON_ID = undefined;

const WATER_ROW_ID = "water";
const WATER_LABEL = "Local water";
const WATER_ICON_ID = "icon-water";

/** returns the one sector currently in the campaign, or undefined before the map bootstrap runs */
function getSoleSector(app: Application): SectorSerialState | undefined {
  const { sectors } = app.getCampaignState();
  const sectorId = Object.keys(sectors)[0];
  return sectorId !== undefined ? sectors[sectorId] : undefined;
}

function collectRows(app: Application): QuantityRow[] {
  const sector = getSoleSector(app);
  if (!sector) return [];
  const { natural } = sector;
  const catalog = app.getCatalog();
  const rows: QuantityRow[] = [];

  // null means the sector has none of that kind (see SectorNaturalState); omit, don't show zero
  if (natural.innateWoodlandBiomassKg !== null) {
    rows.push({
      id: WOODLAND_ROW_ID,
      qty: natural.innateWoodlandBiomassKg,
      label: WOODLAND_LABEL,
      unit: "kg",
      iconId: WOODLAND_ICON_ID,
    });
  }

  if (natural.waterStockM3 !== null) {
    rows.push({
      id: WATER_ROW_ID,
      qty: natural.waterStockM3,
      label: WATER_LABEL,
      unit: "m³",
      iconId: WATER_ICON_ID,
    });
  }

  for (const [resourceId, reserve] of Object.entries(natural.reserves)) {
    const resource = catalog.getResource(resourceId);
    rows.push({
      id: resourceId,
      qty: reserve.remainingQuantity,
      label: resource?.id ?? resourceId,
      unit: resource?.unit,
      iconId: resource?.iconId,
      unsurveyed: !reserve.surveyed,
    });
  }

  return rows;
}

/**
 * woodland/water (if currently null) plus every reserve resourceId this sector's own SectorDef
 * actually declares (its `reserves` array) that isn't already present. Never the whole resource
 * catalog: most catalog resources (lumber, wood-waste, ...) are processed inventory goods, not
 * valid natural reserves for any sector, let alone this one.
 */
function listAddableRows(app: Application): QuantityAddCandidate[] {
  const sector = getSoleSector(app);
  if (!sector) return [];
  const { natural } = sector;
  const candidates: QuantityAddCandidate[] = [];

  if (natural.innateWoodlandBiomassKg === null) {
    candidates.push({ id: WOODLAND_ROW_ID, label: WOODLAND_LABEL, iconId: WOODLAND_ICON_ID });
  }
  if (natural.waterStockM3 === null) {
    candidates.push({ id: WATER_ROW_ID, label: WATER_LABEL, iconId: WATER_ICON_ID });
  }

  const catalog = app.getCatalog();
  const sectorDef = catalog.getSector(sector.definitionId);
  for (const { resourceId } of sectorDef?.reserves ?? []) {
    if (resourceId in natural.reserves) continue; // already present
    const resource = catalog.getResource(resourceId);
    candidates.push({ id: resourceId, label: resource?.id ?? resourceId, iconId: resource?.iconId });
  }

  return candidates;
}

/** the current sector's natural quantities as a QuantitySource, for `QuantityPanel`/`QuantityModal` */
export const SECTOR_NATURAL_SOURCE: QuantitySource = {
  title: "Sector resources",
  emptyMessage: "No known natural resources in this sector.",
  defaultSortMode: "qty-desc",
  collectRows,
  cheatSetQuantity: (app, id, qty) => {
    const sector = getSoleSector(app);
    if (!sector) return;
    if (id === WOODLAND_ROW_ID) {
      app.cheatSetSectorWoodlandBiomass(sector.id, qty);
    } else if (id === WATER_ROW_ID) {
      app.cheatSetSectorWaterStock(sector.id, qty);
    } else {
      app.cheatSetSectorReserveQuantity(sector.id, id, qty);
    }
  },
  cheatRemoveRow: (app, id) => {
    const sector = getSoleSector(app);
    if (!sector) return;
    if (id === WOODLAND_ROW_ID) {
      app.cheatClearSectorWoodlandBiomass(sector.id);
    } else if (id === WATER_ROW_ID) {
      app.cheatClearSectorWaterStock(sector.id);
    } else {
      app.cheatRemoveSectorReserve(sector.id, id);
    }
  },
  listAddableRows,
  subscribeRefresh: (app, refresh) => [
    app.getEvents().subscribe("tick:after", refresh),
    app.getEvents().subscribe("sector-natural:changed", refresh),
  ],
};
