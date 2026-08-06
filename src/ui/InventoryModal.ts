// full, sortable company-inventory popup opened from InventoryPanel's heading
// reads Application/CampaignState; never mutates simulation state

import type { Application } from "@application";
import { isCheatsEnabled } from "@platform/CheatFlags";
import type { Disposable } from "@shared/Disposable";
import {
  buildInventoryEmptyEl,
  buildInventoryRowEl,
  collectInventoryRows,
  sortInventoryRows,
  type InventoryRow,
  type InventorySortMode,
} from "./InventoryRows";

const SORT_OPTIONS: readonly { readonly mode: InventorySortMode; readonly label: string }[] = [
  { mode: "name", label: "Name" },
  { mode: "qty-desc", label: "Qty ↓" },
  { mode: "qty-asc", label: "Qty ↑" },
];

/**
 * full, sortable inventory popup.
 * built on native <dialog>/showModal(): focus trap, ::backdrop, and escape to close come for free.
 * updates live from `tick:after` and, while cheats are on, `inventory:changed`; never polls per frame.
 * row order changes only on open or an explicit sort click; background refreshes patch values in
 * place so a chevron or input click never gets stolen by a row reordering under the pointer.
 */
export class InventoryModal implements Disposable {
  private readonly dialog: HTMLDialogElement;
  private readonly list: HTMLElement;
  private readonly sortBtns = new Map<InventorySortMode, HTMLButtonElement>();
  private sortMode: InventorySortMode = "qty-desc";
  /** resourceIds in the order last rendered; carried forward by renderStable() between resorts */
  private displayOrder: string[] = [];
  private readonly unsubscribeTick: () => void;
  private readonly unsubscribeInventoryChanged: () => void;

  public constructor(private readonly app: Application) {
    this.dialog = document.createElement("dialog");
    this.dialog.classList.add("inventory-modal");
    this.dialog.setAttribute("aria-label", "full inventory");

    const heading = document.createElement("h2");
    heading.classList.add("panel-heading");
    heading.textContent = "Inventory";
    this.dialog.appendChild(heading);

    this.dialog.appendChild(this.buildSortBar());

    this.list = document.createElement("ul");
    this.list.classList.add("inventory-list");
    this.dialog.appendChild(this.list);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.classList.add("toolbar-btn", "inventory-modal-close");
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.dialog.close());
    this.dialog.appendChild(closeBtn);

    document.body.appendChild(this.dialog);

    this.syncSortButtons();
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      if (this.dialog.open) this.renderStable();
    });
    // refresh immediately so cheat edits feel responsive instead of waiting for the next tick
    this.unsubscribeInventoryChanged = app.getEvents().subscribe("inventory:changed", () => {
      if (this.dialog.open) this.renderStable();
    });
  }

  /** renders the current inventory, freshly sorted, and opens the modal */
  public open(): void {
    this.renderSorted();
    this.dialog.showModal();
  }

  /** unsubscribes from clock events and detaches the dialog from the DOM */
  public dispose(): void {
    this.unsubscribeTick();
    this.unsubscribeInventoryChanged();
    this.dialog.remove();
  }

  private buildSortBar(): HTMLElement {
    const bar = document.createElement("div");
    bar.classList.add("inventory-sort-bar");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "sort by");

    for (const { mode, label } of SORT_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.classList.add("toolbar-btn", "inventory-sort-btn");
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
      btn.classList.toggle("inventory-sort-btn--active", mode === this.sortMode);
      btn.setAttribute("aria-pressed", String(mode === this.sortMode));
    }
  }

  /** resorts by the active sort mode and rebuilds; call on open or when a sort button is clicked */
  private renderSorted(): void {
    const rows = sortInventoryRows(collectInventoryRows(this.app), this.sortMode);
    this.displayOrder = rows.map((row) => row.resourceId);
    this.renderRows(rows);
  }

  /**
   * rebuilds from current inventory state but keeps the previous row order in place: known
   * resourceIds keep their position, newly nonzero resources are appended, and ones that dropped
   * to zero are removed. used for background refreshes so a chevron or input the user is mid click
   * on never slides away underneath them; the next explicit sort restores true order.
   */
  private renderStable(): void {
    const byId = new Map(collectInventoryRows(this.app).map((row) => [row.resourceId, row] as const));
    const rows: InventoryRow[] = [];
    for (const id of this.displayOrder) {
      const row = byId.get(id);
      if (!row) continue; // dropped out (qty hit 0)
      rows.push(row);
      byId.delete(id);
    }
    rows.push(...byId.values()); // resources newly present since the last sort
    this.displayOrder = rows.map((row) => row.resourceId);
    this.renderRows(rows);
  }

  private renderRows(rows: readonly InventoryRow[]): void {
    // cheat quantity editing (chevrons plus click to edit) only ever shows in this modal,
    // never in the docked InventoryPanel card
    const cheat = isCheatsEnabled()
      ? { onSetQuantity: (resourceId: string, qty: number) => this.app.cheatSetInventoryQuantity(resourceId, qty) }
      : undefined;
    this.list.replaceChildren(...rows.map((row) => buildInventoryRowEl(row, cheat)));
    if (rows.length === 0) {
      this.list.appendChild(buildInventoryEmptyEl());
    }
  }
}
