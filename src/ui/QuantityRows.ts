// generic quantity-row data, sorting, and DOM row rendering
// shared by every docked-card + popup pair (company inventory, sector natural resources, ...)
// pure/presentational: renders whatever QuantityRow values a QuantitySource hands it; never reads
// Application/CampaignState directly (see QuantitySource.ts for that boundary)

import { hasIcon, resolveIconStyle } from "./IconResolver";

export type QuantitySortMode = "name" | "qty-asc" | "qty-desc";

/** one displayable quantity row; a QuantitySource resolves its own state into these */
export type QuantityRow = {
  /** stable key identifying this row within its source, e.g. a resourceId or "woodland" */
  readonly id: string;
  readonly qty: number;
  readonly label: string;
  readonly unit: string | undefined;
  /** world-atlas sprite id; undefined renders the standard missing-icon placeholder */
  readonly iconId: string | undefined;
  /** true when this value is an unconfirmed survey estimate rather than a known reading */
  readonly unsurveyed?: boolean;
};

/** trims float noise for display without implying false precision */
export function formatQuantity(qty: number): string {
  return (Math.round(qty * 100) / 100).toLocaleString();
}

/** pure comparator sort; returns a new array, never mutates the input */
export function sortQuantityRows(rows: readonly QuantityRow[], mode: QuantitySortMode): QuantityRow[] {
  const sorted = [...rows];
  switch (mode) {
    case "name":
      sorted.sort((a, b) => a.label.localeCompare(b.label));
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
export type QuantityRowCheatOptions = {
  /** called with the row id and the new quantity, already clamped to zero or above */
  readonly onSetQuantity: (id: string, qty: number) => void;
  /** amount the chevrons add/subtract per click; defaults to 1 */
  readonly step?: number;
};

/** formats a row's quantity+unit for display, e.g. "250 kg" */
function formatRowQuantity(row: QuantityRow): string {
  return row.unit ? `${formatQuantity(row.qty)} ${row.unit}` : formatQuantity(row.qty);
}

/** builds one `<li>` row: icon, label, quantity+unit (optionally editable via cheat controls) */
export function buildQuantityRowEl(row: QuantityRow, cheat?: QuantityRowCheatOptions): HTMLElement {
  const el = document.createElement("li");
  el.classList.add("quantity-row");
  el.classList.toggle("quantity-row--unsurveyed", row.unsurveyed === true);
  el.appendChild(buildQuantityIconEl(row));

  const label = document.createElement("span");
  label.classList.add("quantity-label");
  label.textContent = row.unsurveyed ? `${row.label} (unsurveyed)` : row.label;
  el.appendChild(label);

  el.appendChild(cheat ? buildCheatQtyEl(row, cheat) : buildStaticQtyEl(row));

  return el;
}

/** plain readonly quantity display */
function buildStaticQtyEl(row: QuantityRow): HTMLElement {
  const qtyEl = document.createElement("span");
  qtyEl.classList.add("quantity-qty");
  qtyEl.textContent = formatRowQuantity(row);
  return qtyEl;
}

/** cheat mode quantity: down and up chevrons plus a click to edit value */
function buildCheatQtyEl(row: QuantityRow, cheat: QuantityRowCheatOptions): HTMLElement {
  const step = cheat.step ?? 1;
  const wrap = document.createElement("span");
  wrap.classList.add("quantity-qty", "quantity-qty--cheat");

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.classList.add("quantity-qty-chevron");
  downBtn.textContent = "▼";
  downBtn.setAttribute("aria-label", `decrease ${row.id} by ${step}`);
  downBtn.addEventListener("click", () => cheat.onSetQuantity(row.id, row.qty - step));

  const valueBtn = document.createElement("button");
  valueBtn.type = "button";
  valueBtn.classList.add("quantity-qty-value");
  valueBtn.textContent = formatRowQuantity(row);
  valueBtn.setAttribute("aria-label", `set ${row.id} quantity, currently ${formatRowQuantity(row)}`);
  valueBtn.addEventListener("click", () => wrap.replaceChild(buildQtyInputEl(row, cheat, valueBtn), valueBtn));

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.classList.add("quantity-qty-chevron");
  upBtn.textContent = "▲";
  upBtn.setAttribute("aria-label", `increase ${row.id} by ${step}`);
  upBtn.addEventListener("click", () => cheat.onSetQuantity(row.id, row.qty + step));

  wrap.append(downBtn, valueBtn, upBtn);
  return wrap;
}

/** builds the numeric input that replaces a cheat quantity value while it's being edited */
function buildQtyInputEl(row: QuantityRow, cheat: QuantityRowCheatOptions, valueBtn: HTMLElement): HTMLElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.classList.add("quantity-qty-input");
  input.value = String(row.qty);

  let committed = false;
  const commit = (): void => {
    if (committed) return;
    committed = true;
    const parsed = Number(input.value);
    if (Number.isFinite(parsed)) {
      cheat.onSetQuantity(row.id, parsed);
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
function buildQuantityIconEl(row: QuantityRow): HTMLElement {
  const icon = document.createElement("span");
  icon.classList.add("quantity-icon");

  if (row.iconId !== undefined && hasIcon(row.iconId)) {
    Object.assign(icon.style, resolveIconStyle(row.iconId));
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", row.id);
  } else {
    icon.classList.add("quantity-icon--missing");
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", "missing icon");
    icon.textContent = "?";
  }
  return icon;
}

/** builds an empty-state <li> shown when a source has no rows to display */
export function buildQuantityEmptyEl(message: string): HTMLElement {
  const empty = document.createElement("li");
  empty.classList.add("quantity-empty");
  empty.textContent = message;
  return empty;
}
