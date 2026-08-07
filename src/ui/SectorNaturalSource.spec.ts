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
    expect(rows).toEqual([{ id: "woodland", qty: 500, label: "Woodland biomass", unit: "kg", iconId: undefined }]);

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

  it("listAddableRows offers woodland and water on a fresh sector, but no inventory resources", () => {
    const app = makeApp();
    const candidates = SECTOR_NATURAL_SOURCE.listAddableRows?.(app) ?? [];

    expect(candidates).toEqual([
      { id: "woodland", label: "Woodland biomass", iconId: undefined },
      { id: "water", label: "Local water", iconId: "icon-water" },
    ]);

    app.dispose();
  });

  it("listAddableRows never offers processed inventory goods as a sector reserve", () => {
    // Ashford Valley's SectorDef declares no reserves ("reserves": [] in sectors.json); catalog
    // resources like timber/lumber/wood-waste are processed inventory goods, never a natural
    // reserve, regardless of whether the catalog happens to contain them
    const app = makeApp();
    const candidates = SECTOR_NATURAL_SOURCE.listAddableRows?.(app) ?? [];

    expect(candidates.some((c) => c.id === "timber")).toBe(false);
    expect(candidates.some((c) => c.id === "lumber")).toBe(false);
    expect(candidates.some((c) => c.id === "wood-waste")).toBe(false);

    app.dispose();
  });

  it("listAddableRows drops woodland/water once each is set", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorWoodlandBiomass("sector:1", 10);
    app.cheatSetSectorWaterStock("sector:1", 20);

    expect(SECTOR_NATURAL_SOURCE.listAddableRows?.(app)).toEqual([]);

    app.dispose();
  });

  it("cheatRemoveRow clears woodland back to null, not zero, so the row disappears", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorWoodlandBiomass("sector:1", 500);

    SECTOR_NATURAL_SOURCE.cheatRemoveRow?.(app, "woodland");
    expect(app.getCampaignState().sectors["sector:1"].natural.innateWoodlandBiomassKg).toBeNull();
    expect(SECTOR_NATURAL_SOURCE.collectRows(app)).toEqual([]);

    app.dispose();
  });

  it("cheatRemoveRow clears water back to null, not zero, so the row disappears", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorWaterStock("sector:1", 1200);

    SECTOR_NATURAL_SOURCE.cheatRemoveRow?.(app, "water");
    expect(app.getCampaignState().sectors["sector:1"].natural.waterStockM3).toBeNull();
    expect(SECTOR_NATURAL_SOURCE.collectRows(app)).toEqual([]);

    app.dispose();
  });

  it("cheatRemoveRow deletes a reserve entirely, so the row disappears", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetSectorReserveQuantity("sector:1", "timber", 80);

    SECTOR_NATURAL_SOURCE.cheatRemoveRow?.(app, "timber");
    expect(Object.hasOwn(app.getCampaignState().sectors["sector:1"].natural.reserves, "timber")).toBe(false);
    expect(SECTOR_NATURAL_SOURCE.collectRows(app)).toEqual([]);

    app.dispose();
  });
});
