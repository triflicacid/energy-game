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
  /** called with the row id to remove it entirely; omit to hide the remove button */
  readonly onRemove?: (id: string) => void;
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
  el.appendChild(buildQuantityIconEl(row.iconId, row.id));

  const label = document.createElement("span");
  label.classList.add("quantity-label");
  label.textContent = row.unsurveyed ? `${row.label} (unsurveyed)` : row.label;
  el.appendChild(label);

  el.appendChild(cheat ? buildCheatQtyEl(row, cheat) : buildStaticQtyEl(row));

  if (cheat?.onRemove) {
    el.appendChild(buildRemoveBtnEl(row, cheat.onRemove));
  }

  return el;
}

/** cheat-only "×" button that removes a row entirely */
function buildRemoveBtnEl(row: QuantityRow, onRemove: (id: string) => void): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("quantity-remove-btn");
  btn.textContent = "×";
  btn.setAttribute("aria-label", `remove ${row.id}`);
  btn.addEventListener("click", () => onRemove(row.id));
  return btn;
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

/**
 * returns the icon element for iconId: the resolved sprite crop, or a visible placeholder.
 * shared by row display and the add picker's option list.
 */
function buildQuantityIconEl(iconId: string | undefined, ariaId: string): HTMLElement {
  const icon = document.createElement("span");
  icon.classList.add("quantity-icon");

  if (iconId !== undefined && hasIcon(iconId)) {
    Object.assign(icon.style, resolveIconStyle(iconId));
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", ariaId);
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

/** an id not currently shown as a row, offered by the cheat-only "add" picker */
export type QuantityAddCandidate = {
  readonly id: string;
  readonly label: string;
  readonly iconId: string | undefined;
};

/**
 * cheat-only "add a resource" tile: a dashed plus square that opens a floating picker of ids not
 * currently shown, each rendered with its own icon. Picking one calls onAdd(id); the caller
 * decides the starting quantity.
 *
 * the picker is a true popup, not inline content: it's appended to portalRoot (the dialog itself,
 * not this row or the scrollable row list) and fixed-positioned under the anchor button, so it is
 * never clipped or forced into the row list's own scroll area.
 */
export function buildQuantityAddRowEl(
  candidates: readonly QuantityAddCandidate[],
  onAdd: (id: string) => void,
  portalRoot: HTMLElement,
): HTMLElement {
  const el = document.createElement("li");
  el.classList.add("quantity-row", "quantity-row--add");

  const iconBtn = document.createElement("button");
  iconBtn.type = "button";
  iconBtn.classList.add("quantity-icon", "quantity-icon--add");
  iconBtn.textContent = "+";
  iconBtn.setAttribute("aria-label", "add a resource");
  iconBtn.setAttribute("aria-haspopup", "listbox");
  iconBtn.addEventListener("click", () => openAddPicker(candidates, onAdd, iconBtn, portalRoot));

  const label = document.createElement("span");
  label.classList.add("quantity-label");
  label.textContent = "Add resource";

  el.append(iconBtn, label);
  return el;
}

/** closes and removes any add picker already open under portalRoot; safe to call when none is open */
export function closeQuantityAddPicker(portalRoot: HTMLElement): void {
  portalRoot.querySelector(":scope > .quantity-add-picker")?.remove();
}

/** builds, positions, and opens the floating candidate picker anchored under anchorEl */
function openAddPicker(
  candidates: readonly QuantityAddCandidate[],
  onAdd: (id: string) => void,
  anchorEl: HTMLElement,
  portalRoot: HTMLElement,
): void {
  closeQuantityAddPicker(portalRoot); // at most one picker open at a time

  const list = document.createElement("div");
  list.classList.add("quantity-add-picker");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "add a resource");

  let settled = false; // an option was picked, or the picker was cancelled; ignore further events
  const close = (): void => {
    if (settled) return;
    settled = true;
    list.remove();
  };

  const options = candidates.map(({ id, label, iconId }) => {
    const option = document.createElement("button");
    option.type = "button";
    option.classList.add("quantity-add-option");
    option.setAttribute("role", "option");
    option.appendChild(buildQuantityIconEl(iconId, id));
    const text = document.createElement("span");
    text.textContent = label;
    option.appendChild(text);
    option.addEventListener("click", () => {
      if (settled) return;
      settled = true;
      list.remove();
      onAdd(id);
    });
    return option;
  });
  list.append(...options);

  // a mousedown on one option while another has focus shifts focus, which fires blur/focusout on
  // the old option; that bubbles to the focusout handler below and can close the picker (removing
  // it from the DOM) before the click event this same gesture is about to produce ever fires —
  // so clicking anything but the initially-focused option silently did nothing. preventDefault on
  // mousedown suppresses the browser's default focus-shift entirely, so no such focusout fires for
  // clicks within the picker; the click event (and onAdd) still fires normally afterward.
  list.addEventListener("mousedown", (event) => event.preventDefault());

  list.addEventListener("keydown", (event) => {
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[Math.min(current + 1, options.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[Math.max(current - 1, 0)]?.focus();
    } else if (event.key === "Escape") {
      close();
      anchorEl.focus();
    }
  });

  // deferred so a focus move between two options in this same list is observed before deciding
  // nothing in the picker has focus any more; also guards a picker already removed some other way
  list.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (list.isConnected && !list.contains(document.activeElement)) close();
    });
  });

  portalRoot.appendChild(list);
  positionAddPicker(list, anchorEl);

  // defer focus so the click that opened the picker finishes first
  queueMicrotask(() => options[0]?.focus());
}

/** fixed-positions the picker directly under its anchor button, clamped to stay on screen */
function positionAddPicker(picker: HTMLElement, anchor: HTMLElement): void {
  const anchorRect = anchor.getBoundingClientRect();
  picker.style.top = `${anchorRect.bottom + 4}px`;
  picker.style.left = `${anchorRect.left}px`;

  const pickerRect = picker.getBoundingClientRect();
  const maxLeft = window.innerWidth - pickerRect.width - 8;
  if (pickerRect.left > maxLeft) {
    picker.style.left = `${Math.max(8, maxLeft)}px`;
  }
}
