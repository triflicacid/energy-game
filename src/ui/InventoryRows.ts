// shared inventory row data + sorting + DOM row rendering
// used by both the docked InventoryPanel (top 10) and the full InventoryModal (all rows)
// reads Application/CampaignState; never mutates simulation state

import type { Application } from "@application";
import type { ResourceDef } from "@content";
import { hasIcon, resolveIconStyle } from "./IconResolver";

export type InventorySortMode = "name" | "qty-asc" | "qty-desc";

export type InventoryRow = {
  readonly resourceId: string;
  readonly qty: number;
  readonly resource: ResourceDef | undefined;
};

/** derives a readable placeholder label from a resource id; real localization lands later */
export function placeholderLabel(resourceId: string): string {
  return resourceId
    .split("-")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** trims float noise for display without implying false precision */
export function formatQuantity(qty: number): string {
  return (Math.round(qty * 100) / 100).toLocaleString();
}

/** returns every non-zero inventory resource as a row, resolved against the catalog */
export function collectInventoryRows(app: Application): InventoryRow[] {
  const { quantities } = app.getCampaignState().inventory;
  const catalog = app.getCatalog();
  return Object.entries(quantities)
    .filter(([, qty]) => qty !== 0)
    .map(([resourceId, qty]) => ({ resourceId, qty, resource: catalog.getResource(resourceId) }));
}

/** pure comparator sort; returns a new array, never mutates the input */
export function sortInventoryRows(rows: readonly InventoryRow[], mode: InventorySortMode): InventoryRow[] {
  const sorted = [...rows];
  switch (mode) {
    case "name":
      sorted.sort((a, b) => (a.resource?.id ?? a.resourceId).localeCompare(b.resource?.id ?? b.resourceId));
      break;
    case "qty-asc":
      sorted.sort((a, b) => a.qty - b.qty);
      break;
    case "qty-desc":
      sorted.sort((a, b) => b.qty - a.qty);
      break;
  }
  return sorted;
}

/** builds one <li> row: icon, label, quantity+unit */
export function buildInventoryRowEl(row: InventoryRow): HTMLElement {
  const el = document.createElement("li");
  el.classList.add("inventory-row");
  el.appendChild(buildInventoryIconEl(row.resource));

  const label = document.createElement("span");
  label.classList.add("inventory-label");
  label.textContent = placeholderLabel(row.resource?.id ?? row.resourceId);
  el.appendChild(label);

  const qtyEl = document.createElement("span");
  qtyEl.classList.add("inventory-qty");
  qtyEl.textContent = row.resource ? `${formatQuantity(row.qty)} ${row.resource.unit}` : formatQuantity(row.qty);
  el.appendChild(qtyEl);

  return el;
}

/** returns the icon element for a row: the resolved sprite crop, or a visible placeholder */
function buildInventoryIconEl(resource: ResourceDef | undefined): HTMLElement {
  const icon = document.createElement("span");
  icon.classList.add("inventory-icon");

  if (resource !== undefined && hasIcon(resource.iconId)) {
    Object.assign(icon.style, resolveIconStyle(resource.iconId));
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", resource.id);
  } else {
    icon.classList.add("inventory-icon--missing");
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", "missing icon");
    icon.textContent = "?";
  }
  return icon;
}

/** builds an empty-state <li> shown when there are no rows to display */
export function buildInventoryEmptyEl(): HTMLElement {
  const empty = document.createElement("li");
  empty.classList.add("inventory-empty");
  empty.textContent = "No resources in inventory.";
  return empty;
}
