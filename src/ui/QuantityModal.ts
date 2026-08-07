// generic sortable popup for one QuantitySource: full row list, cheat-editable when the source
// supports it and cheats are enabled. Opened from a QuantityPanel's docked card.

import type { Application } from "@application";
import { isCheatsEnabled } from "@platform/CheatFlags";
import type { Disposable } from "@shared/Disposable";
import type { Unsubscribe } from "@shared";
import {
  buildQuantityAddRowEl,
  buildQuantityEmptyEl,
  buildQuantityRowEl,
  closeQuantityAddPicker,
  sortQuantityRows,
  type QuantityRow,
  type QuantitySortMode,
} from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

/** starting quantity given to a row added through the cheat-only add picker */
const CHEAT_ADD_STARTING_QTY = 100;

const SORT_OPTIONS: readonly { readonly mode: QuantitySortMode; readonly label: string }[] = [
  { mode: "name", label: "Name" },
  { mode: "qty-desc", label: "Qty ↓" },
  { mode: "qty-asc", label: "Qty ↑" },
];

/**
 * full, sortable popup for one QuantitySource.
 * built on native <dialog>/showModal(): focus trap, ::backdrop, and escape to close come for free.
 * updates live from the source's refresh events; never polls per frame.
 * row order changes only on open or an explicit sort click; background refreshes patch values in
 * place so a chevron or input click never gets stolen by a row reordering under the pointer.
 */
export class QuantityModal implements Disposable {
  private readonly dialog: HTMLDialogElement;
  private readonly list: HTMLElement;
  private readonly sortBtns = new Map<QuantitySortMode, HTMLButtonElement>();
  private sortMode: QuantitySortMode;
  /** row ids in the order last rendered; carried forward by renderStable() between resorts */
  private displayOrder: string[] = [];
  private readonly unsubscribeRefresh: readonly Unsubscribe[];

  public constructor(
    private readonly app: Application,
    private readonly source: QuantitySource,
  ) {
    this.sortMode = source.defaultSortMode;

    this.dialog = document.createElement("dialog");
    this.dialog.classList.add("quantity-modal");
    this.dialog.setAttribute("aria-label", `full ${source.title.toLowerCase()}`);

    const heading = document.createElement("h2");
    heading.classList.add("panel-heading");
    heading.textContent = source.title;
    this.dialog.appendChild(heading);

    this.dialog.appendChild(this.buildSortBar());

    this.list = document.createElement("ul");
    this.list.classList.add("quantity-list");
    this.dialog.appendChild(this.list);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.classList.add("toolbar-btn", "quantity-modal-close");
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.dialog.close());
    this.dialog.appendChild(closeBtn);

    document.body.appendChild(this.dialog);

    this.syncSortButtons();
    this.unsubscribeRefresh = source.subscribeRefresh(app, () => {
      if (this.dialog.open) this.renderStable();
    });
  }

  /** renders the current rows, freshly sorted, and opens the modal */
  public open(): void {
    this.renderSorted();
    this.dialog.showModal();
  }

  /** unsubscribes from refresh events and detaches the dialog from the DOM */
  public dispose(): void {
    for (const unsubscribe of this.unsubscribeRefresh) unsubscribe();
    this.dialog.remove();
  }

  private buildSortBar(): HTMLElement {
    const bar = document.createElement("div");
    bar.classList.add("quantity-sort-bar");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "sort by");

    for (const { mode, label } of SORT_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.classList.add("toolbar-btn", "quantity-sort-btn");
      btn.addEventListener("click", () => {
        this.sortMode = mode;
        this.syncSortButtons();
        this.renderSorted();
      });
      this.sortBtns.set(mode, btn);
      bar.appendChild(btn);
    }
    return bar;
  }

  private syncSortButtons(): void {
    for (const [mode, btn] of this.sortBtns) {
      btn.classList.toggle("quantity-sort-btn--active", mode === this.sortMode);
      btn.setAttribute("aria-pressed", String(mode === this.sortMode));
    }
  }

  /** resorts by the active sort mode and rebuilds; call on open or when a sort button is clicked */
  private renderSorted(): void {
    // a deliberate resort invalidates row positions outright; close any picker rather than leave
    // it anchored to a row that's about to move or disappear
    closeQuantityAddPicker(this.dialog);
    const rows = sortQuantityRows(this.source.collectRows(this.app), this.sortMode);
    this.displayOrder = rows.map((row) => row.id);
    this.renderRows(rows);
  }

  /**
   * rebuilds from current source state but keeps the previous row order in place: known row ids
   * keep their position, newly present rows are appended, and ones that dropped out are removed.
   * used for background refreshes so a chevron or input the user is mid click on never slides away
   * underneath them; the next explicit sort restores true order.
   */
  private renderStable(): void {
    const byId = new Map(this.source.collectRows(this.app).map((row) => [row.id, row] as const));
    const rows: QuantityRow[] = [];
    for (const id of this.displayOrder) {
      const row = byId.get(id);
      if (!row) continue; // dropped out
      rows.push(row);
      byId.delete(id);
    }
    rows.push(...byId.values()); // rows newly present since the last sort
    this.displayOrder = rows.map((row) => row.id);
    this.renderRows(rows);
  }

  private renderRows(rows: readonly QuantityRow[]): void {
    // deliberately does not close an open add picker here: this runs on every passive background
    // refresh too (tick, cheat-change events), and the picker is a popup owned by this.dialog, not
    // this.list, so rebuilding the row list underneath it does not disturb it. Closing here would
    // yank the picker away mid-click on anything but the fastest possible selection.

    // cheat quantity editing (chevrons plus click to edit), the remove button, and the
    // add-a-resource tile only ever show in this popup, never in the docked QuantityPanel card
    const setQuantity = this.source.cheatSetQuantity;
    const removeRow = this.source.cheatRemoveRow;
    const cheatOn = isCheatsEnabled() && setQuantity !== undefined;
    const cheat = cheatOn
      ? {
          onSetQuantity: (id: string, qty: number) => setQuantity(this.app, id, qty),
          onRemove: removeRow ? (id: string) => removeRow(this.app, id) : undefined,
        }
      : undefined;

    const rowEls = rows.map((row) => buildQuantityRowEl(row, cheat));
    if (rows.length === 0) {
      rowEls.push(buildQuantityEmptyEl(this.source.emptyMessage));
    }
    if (cheatOn && this.source.listAddableRows) {
      const candidates = this.source.listAddableRows(this.app);
      if (candidates.length > 0) {
        const onAdd = (id: string): void => setQuantity(this.app, id, CHEAT_ADD_STARTING_QTY);
        rowEls.push(buildQuantityAddRowEl(candidates, onAdd, this.dialog));
      }
    }
    this.list.replaceChildren(...rowEls);
  }
}
