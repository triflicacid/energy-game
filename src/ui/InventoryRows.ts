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

/** cheat controls attached to a row's quantity; omit to render a plain readonly quantity */
export type InventoryRowCheatOptions = {
  /** called with the resource id and the new quantity, already clamped to zero or above */
  readonly onSetQuantity: (resourceId: string, qty: number) => void;
  /** amount the chevrons add/subtract per click; defaults to 1 */
  readonly step?: number;
};

/** builds one `<li>` row: icon, label, quantity+unit (optionally editable via cheat controls) */
export function buildInventoryRowEl(row: InventoryRow, cheat?: InventoryRowCheatOptions): HTMLElement {
  const el = document.createElement("li");
  el.classList.add("inventory-row");
  el.appendChild(buildInventoryIconEl(row.resource));

  const label = document.createElement("span");
  label.classList.add("inventory-label");
  label.textContent = placeholderLabel(row.resource?.id ?? row.resourceId);
  el.appendChild(label);

  el.appendChild(cheat ? buildCheatQtyEl(row, cheat) : buildStaticQtyEl(row));

  return el;
}

/** formats a row's quantity+unit for display, e.g. "250 kg" */
function formatRowQuantity(row: InventoryRow): string {
  return row.resource ? `${formatQuantity(row.qty)} ${row.resource.unit}` : formatQuantity(row.qty);
}

/** plain readonly quantity display */
function buildStaticQtyEl(row: InventoryRow): HTMLElement {
  const qtyEl = document.createElement("span");
  qtyEl.classList.add("inventory-qty");
  qtyEl.textContent = formatRowQuantity(row);
  return qtyEl;
}

/** cheat mode quantity: down and up chevrons plus a click to edit value */
function buildCheatQtyEl(row: InventoryRow, cheat: InventoryRowCheatOptions): HTMLElement {
  const step = cheat.step ?? 1;
  const wrap = document.createElement("span");
  wrap.classList.add("inventory-qty", "inventory-qty--cheat");

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.classList.add("inventory-qty-chevron");
  downBtn.textContent = "▼";
  downBtn.setAttribute("aria-label", `decrease ${row.resourceId} by ${step}`);
  downBtn.addEventListener("click", () => cheat.onSetQuantity(row.resourceId, row.qty - step));

  const valueBtn = document.createElement("button");
  valueBtn.type = "button";
  valueBtn.classList.add("inventory-qty-value");
  valueBtn.textContent = formatRowQuantity(row);
  valueBtn.setAttribute("aria-label", `set ${row.resourceId} quantity, currently ${formatRowQuantity(row)}`);
  valueBtn.addEventListener("click", () => wrap.replaceChild(buildQtyInputEl(row, cheat, valueBtn), valueBtn));

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.classList.add("inventory-qty-chevron");
  upBtn.textContent = "▲";
  upBtn.setAttribute("aria-label", `increase ${row.resourceId} by ${step}`);
  upBtn.addEventListener("click", () => cheat.onSetQuantity(row.resourceId, row.qty + step));

  wrap.append(downBtn, valueBtn, upBtn);
  return wrap;
}

/** builds the numeric input that replaces a cheat quantity value while it's being edited */
function buildQtyInputEl(row: InventoryRow, cheat: InventoryRowCheatOptions, valueBtn: HTMLElement): HTMLElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.classList.add("inventory-qty-input");
  input.value = String(row.qty);

  let committed = false;
  const commit = (): void => {
    if (committed) return;
    committed = true;
    const parsed = Number(input.value);
    if (Number.isFinite(parsed)) {
      cheat.onSetQuantity(row.resourceId, parsed);
    } else {
      input.replaceWith(valueBtn); // invalid entry; revert without committing
    }
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur(); // commits via the blur handler below
    } else if (event.key === "Escape") {
      committed = true; // suppress the commit that blur triggers after focus loss
      input.replaceWith(valueBtn);
    }
  });
  input.addEventListener("blur", commit);

  // defer focus so the click that spawned the input finishes first
  queueMicrotask(() => {
    input.focus();
    input.select();
  });

  return input;
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
