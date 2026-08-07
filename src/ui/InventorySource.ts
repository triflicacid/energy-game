// QuantitySource config for the company-wide inventory: every non-zero resource, sortable by
// name/quantity, cheat-editable in the popup via Application.cheatSetInventoryQuantity.
// this is the only inventory-specific file left — QuantityPanel/QuantityModal are generic.

import type { Application } from "@application";
import type { QuantityAddCandidate, QuantityRow } from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

/** derives a readable placeholder label from a resource id; real localization lands later */
function placeholderLabel(resourceId: string): string {
  return resourceId
    .split("-")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** returns every non-zero inventory resource as a row, resolved against the catalog */
function collectRows(app: Application): QuantityRow[] {
  const { quantities } = app.getCampaignState().inventory;
  const catalog = app.getCatalog();
  return Object.entries(quantities)
    .filter(([, qty]) => qty !== 0)
    .map(([resourceId, qty]) => {
      const resource = catalog.getResource(resourceId);
      return {
        id: resourceId,
        qty,
        label: placeholderLabel(resource?.id ?? resourceId),
        unit: resource?.unit,
        iconId: resource?.iconId,
      };
    });
}

/** every catalog resource with no quantity in the inventory yet */
function listAddableRows(app: Application): QuantityAddCandidate[] {
  const { quantities } = app.getCampaignState().inventory;
  const catalog = app.getCatalog();
  return [...catalog.resources.values()]
    .filter((resource) => (quantities[resource.id] ?? 0) === 0)
    .map((resource) => ({ id: resource.id, label: placeholderLabel(resource.id), iconId: resource.iconId }));
}

/** the company-wide inventory as a QuantitySource, for `QuantityPanel`/`QuantityModal` */
export const INVENTORY_SOURCE: QuantitySource = {
  title: "Inventory",
  emptyMessage: "No resources in inventory.",
  defaultSortMode: "qty-desc",
  collectRows,
  cheatSetQuantity: (app, id, qty) => app.cheatSetInventoryQuantity(id, qty),
  // zeroing the quantity already removes the row: collectRows filters out zero-quantity entries
  cheatRemoveRow: (app, id) => app.cheatSetInventoryQuantity(id, 0),
  listAddableRows,
  subscribeRefresh: (app, refresh) => [
    app.getEvents().subscribe("tick:after", refresh),
    app.getEvents().subscribe("inventory:changed", refresh),
  ],
};
