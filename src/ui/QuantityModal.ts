// generic sortable popup for one QuantitySource: full row list, cheat-editable when the source
// supports it and cheats are enabled. Opened from a QuantityPanel's docked card.

import type { Application } from "@application";
import { isCheatsEnabled } from "@platform/CheatFlags";
import type { Disposable } from "@shared/Disposable";
import type { Unsubscribe } from "@shared";
import {
  buildQuantityEmptyEl,
  buildQuantityRowEl,
  sortQuantityRows,
  type QuantityRow,
  type QuantitySortMode,
} from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

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
    // cheat quantity editing (chevrons plus click to edit) only ever shows in this popup, never
    // in the docked QuantityPanel card
    const setQuantity = this.source.cheatSetQuantity;
    const cheat =
      isCheatsEnabled() && setQuantity
        ? { onSetQuantity: (id: string, qty: number) => setQuantity(this.app, id, qty) }
        : undefined;
    this.list.replaceChildren(...rows.map((row) => buildQuantityRowEl(row, cheat)));
    if (rows.length === 0) {
      this.list.appendChild(buildQuantityEmptyEl(this.source.emptyMessage));
    }
  }
}
