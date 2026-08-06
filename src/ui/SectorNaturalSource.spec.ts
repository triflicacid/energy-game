import { afterEach, describe, expect, it } from "vitest";
import { setCheatsEnabled } from "@platform/CheatFlags";
import { Application } from "@application";
import { SECTOR_NATURAL_SOURCE } from "./SectorNaturalSource";

function makeApp(): Application {
  return new Application({} as HTMLCanvasElement, {} as HTMLElement);
}

describe("SECTOR_NATURAL_SOURCE", () => {
  afterEach(() => {
    setCheatsEnabled(false);
  });

  it("collectRows is empty for the fresh centre sector (no woodland, water, or reserves yet)", () => {
    const app = makeApp();
    expect(SECTOR_NATURAL_SOURCE.collectRows(app)).toEqual([]);
    app.dispose();
  });

  it("collectRows includes woodland biomass once set, but not water (still null)", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorWoodlandBiomass("sector:1", 500);

    const rows = SECTOR_NATURAL_SOURCE.collectRows(app);
    expect(rows).toEqual([{ id: "woodland", qty: 500, label: "Innate woodland biomass", unit: "kg", iconId: undefined }]);

    app.dispose();
  });

  it("collectRows includes water stock once set", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorWaterStock("sector:1", 1200);

    const rows = SECTOR_NATURAL_SOURCE.collectRows(app);
    expect(rows).toEqual([{ id: "water", qty: 1200, label: "Local water", unit: "m³", iconId: "icon-water" }]);

    app.dispose();
  });

  it("collectRows includes a reserve resolved against the catalog, flagged unsurveyed until surveyed", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorReserveQuantity("sector:1", "timber", 80);

    const rows = SECTOR_NATURAL_SOURCE.collectRows(app);
    // the cheat method itself marks reserves surveyed; unsurveyed can only be observed once a
    // non-cheat source (extraction/survey systems) populates a reserve — not yet implemented
    expect(rows).toEqual([{ id: "timber", qty: 80, label: "timber", unit: "kg", iconId: "icon-timber", unsurveyed: false }]);

    app.dispose();
  });

  it("cheatSetQuantity dispatches woodland/water/reserve ids to the matching Application method", () => {
    const app = makeApp();
    setCheatsEnabled(true);

    SECTOR_NATURAL_SOURCE.cheatSetQuantity?.(app, "woodland", 10);
    SECTOR_NATURAL_SOURCE.cheatSetQuantity?.(app, "water", 20);
    SECTOR_NATURAL_SOURCE.cheatSetQuantity?.(app, "timber", 30);

    const natural = app.getCampaignState().sectors["sector:1"].natural;
    expect(natural.innateWoodlandBiomassKg).toBe(10);
    expect(natural.waterStockM3).toBe(20);
    expect(natural.reserves.timber).toEqual({ remainingQuantity: 30, surveyed: true });

    app.dispose();
  });
});
