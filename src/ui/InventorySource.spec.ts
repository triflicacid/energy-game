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
});
