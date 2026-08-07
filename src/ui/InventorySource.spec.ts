import { afterEach, describe, expect, it } from "vitest";
import { setCheatsEnabled } from "@platform/CheatFlags";
import { Application } from "@application";
import { INVENTORY_SOURCE } from "./InventorySource";

function makeApp(): Application {
  return new Application({} as HTMLCanvasElement, {} as HTMLElement);
}

describe("INVENTORY_SOURCE", () => {
  afterEach(() => {
    setCheatsEnabled(false);
  });

  it("collectRows resolves label, unit, and icon for every non-zero inventory resource", () => {
    const app = makeApp();
    const rows = INVENTORY_SOURCE.collectRows(app);

    const timber = rows.find((row) => row.id === "timber");
    expect(timber).toEqual({ id: "timber", qty: 250, label: "Timber", unit: "kg", iconId: "icon-timber" });

    app.dispose();
  });

  it("collectRows omits a resource once its quantity hits zero", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetInventoryQuantity("timber", 0);

    const rows = INVENTORY_SOURCE.collectRows(app);
    expect(rows.some((row) => row.id === "timber")).toBe(false);

    app.dispose();
  });

  it("cheatSetQuantity delegates to Application.cheatSetInventoryQuantity", () => {
    const app = makeApp();
    setCheatsEnabled(true);

    INVENTORY_SOURCE.cheatSetQuantity?.(app, "timber", 42);
    expect(app.getCampaignState().inventory.quantities.timber).toBe(42);

    app.dispose();
  });

  it("listAddableRows offers catalog resources not currently in the inventory", () => {
    const app = makeApp();
    const candidates = INVENTORY_SOURCE.listAddableRows?.(app) ?? [];

    expect(candidates.some((c) => c.id === "wood-waste")).toBe(true); // starts at 0
    expect(candidates.some((c) => c.id === "timber")).toBe(false); // already 250
    expect(candidates.some((c) => c.id === "lumber")).toBe(false); // already 100

    app.dispose();
  });

  it("listAddableRows no longer offers a resource once it's added", () => {
    const app = makeApp();
    setCheatsEnabled(true);
    app.cheatSetInventoryQuantity("wood-waste", 100);

    const candidates = INVENTORY_SOURCE.listAddableRows?.(app) ?? [];
    expect(candidates.some((c) => c.id === "wood-waste")).toBe(false);

    app.dispose();
  });

  it("cheatRemoveRow zeroes the quantity, which removes the row from collectRows", () => {
    const app = makeApp();
    setCheatsEnabled(true);

    INVENTORY_SOURCE.cheatRemoveRow?.(app, "timber");
    expect(app.getCampaignState().inventory.quantities.timber).toBe(0);
    expect(INVENTORY_SOURCE.collectRows(app).some((row) => row.id === "timber")).toBe(false);

    app.dispose();
  });

  it("cheatRemoveRow makes the resource addable again", () => {
    const app = makeApp();
    setCheatsEnabled(true);

    INVENTORY_SOURCE.cheatRemoveRow?.(app, "timber");
    expect(INVENTORY_SOURCE.listAddableRows?.(app).some((c) => c.id === "timber")).toBe(true);

    app.dispose();
  });
});
