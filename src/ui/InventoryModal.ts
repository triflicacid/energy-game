// full, sortable company-inventory popup opened from InventoryPanel's heading
// reads Application/CampaignState; never mutates simulation state

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";
import { buildInventoryEmptyEl, buildInventoryRowEl, collectInventoryRows, sortInventoryRows, type InventorySortMode } from "./InventoryRows";

const SORT_OPTIONS: readonly { readonly mode: InventorySortMode; readonly label: string }[] = [
  { mode: "name", label: "Name" },
  { mode: "qty-desc", label: "Qty ↓" },
  { mode: "qty-asc", label: "Qty ↑" },
];

/**
 * full, sortable inventory popup.
 * built on native <dialog>/showModal(): focus trap, ::backdrop, and Esc-to-close come for free.
 * updates from `tick:after` while open; never polls per animation frame.
 */
export class InventoryModal implements Disposable {
  private readonly dialog: HTMLDialogElement;
  private readonly list: HTMLElement;
  private readonly sortBtns = new Map<InventorySortMode, HTMLButtonElement>();
  private sortMode: InventorySortMode = "qty-desc";
  private readonly unsubscribeTick: () => void;

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
      if (this.dialog.open) this.render();
    });
  }

  /** renders the current inventory and opens the modal */
  public open(): void {
    this.render();
    this.dialog.showModal();
  }

  /** unsubscribes from clock events and detaches the dialog from the DOM */
  public dispose(): void {
    this.unsubscribeTick();
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
        this.render();
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

  private render(): void {
    const rows = sortInventoryRows(collectInventoryRows(this.app), this.sortMode);
    this.list.replaceChildren(...rows.map(buildInventoryRowEl));
    if (rows.length === 0) {
      this.list.appendChild(buildInventoryEmptyEl());
    }
  }
}
