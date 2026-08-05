// read-only HTML panel listing the top of the company-wide inventory
// reads Application/CampaignState; never mutates simulation state
// activating the card opens the full sortable inventory (InventoryModal)

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";
import { getDock } from "./Dock";
import { InventoryModal } from "./InventoryModal";
import { buildInventoryEmptyEl, buildInventoryRowEl, collectInventoryRows, sortInventoryRows } from "./InventoryRows";

const DOCKED_ROW_LIMIT = 10;

/**
 * read-only company-inventory panel.
 * lists the top 10 resources by quantity: icon, label, quantity, unit.
 * updates from `tick:after`, never per-animation-frame polling.
 * the whole card is not a <button> but behaves like one (role, tabindex, Enter/Space) and opens
 * the full sortable inventory in `InventoryModal`.
 */
export class InventoryPanel implements Disposable {
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly modal: InventoryModal;
  private readonly unsubscribeTick: () => void;

  public constructor(private readonly app: Application) {
    this.panel = document.createElement("section");
    this.panel.classList.add("panel", "inventory-panel", "panel--clickable");
    this.panel.setAttribute("role", "button");
    this.panel.setAttribute("tabindex", "0");
    this.panel.setAttribute("aria-haspopup", "dialog");
    this.panel.setAttribute("aria-label", "Inventory — view all");
    this.panel.addEventListener("click", () => this.modal.open());
    this.panel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.modal.open();
    });

    const heading = document.createElement("h2");
    heading.classList.add("panel-heading");
    heading.textContent = "Inventory";
    this.panel.appendChild(heading);

    this.list = document.createElement("ul");
    this.list.classList.add("inventory-list");
    this.panel.appendChild(this.list);

    this.hint = document.createElement("p");
    this.hint.classList.add("inventory-hint");
    this.panel.appendChild(this.hint);

    getDock(app, "dock-right").appendChild(this.panel);

    this.modal = new InventoryModal(app);

    this.render();
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      this.render();
    });
  }

  /** unsubscribes from clock events, disposes the modal, and detaches the panel from the DOM */
  public dispose(): void {
    this.unsubscribeTick();
    this.modal.dispose();
    this.panel.remove();
  }

  private render(): void {
    const rows = sortInventoryRows(collectInventoryRows(this.app), "qty-desc");
    const shown = rows.slice(0, DOCKED_ROW_LIMIT);

    this.list.replaceChildren(...shown.map(buildInventoryRowEl));
    if (rows.length === 0) {
      this.list.appendChild(buildInventoryEmptyEl());
    }

    this.hint.textContent =
      rows.length > shown.length ? `Showing ${shown.length} of ${rows.length} — click to view all` : "Click to view all";
  }
}
