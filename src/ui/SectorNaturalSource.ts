// QuantitySource config for the current sector's natural quantities: innate woodland biomass,
// local water stock, and known finite reserves.
//
// assumes a single sector, matching the M00 hand-authored centre sector; revisit the "sole
// sector" lookup once X00 introduces a real sector graph.

import type { Application } from "@application";
import type { SectorSerialState } from "@simulation/CampaignState";
import type { QuantityRow } from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

const WOODLAND_ROW_ID = "woodland";
const WATER_ROW_ID = "water";

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
      label: "Innate woodland biomass",
      unit: "kg",
      iconId: undefined, // no dedicated small icon yet (A01); renders the standard missing-icon placeholder
    });
  }

  if (natural.waterStockM3 !== null) {
    rows.push({
      id: WATER_ROW_ID,
      qty: natural.waterStockM3,
      label: "Local water",
      unit: "m³",
      iconId: "icon-water",
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

/** the current sector's natural quantities as a QuantitySource, for `QuantityPanel`/`QuantityModal` */
export const SECTOR_NATURAL_SOURCE: QuantitySource = {
  title: "Sector resources",
  emptyMessage: " No resources found.",
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
  subscribeRefresh: (app, refresh) => [
    app.getEvents().subscribe("tick:after", refresh),
    app.getEvents().subscribe("sector-natural:changed", refresh),
  ],
};
