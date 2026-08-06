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
 * updates from `tick:after` and `inventory:changed` (so cheat edits made in the popup show up here
 * immediately too); never polls every animation frame.
 * the whole card is not a <button> but behaves like one (role, tabindex, Enter/Space) and opens
 * the full sortable inventory in `InventoryModal`.
 */
export class InventoryPanel implements Disposable {
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly modal: InventoryModal;
  private readonly unsubscribeTick: () => void;
  private readonly unsubscribeInventoryChanged: () => void;

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

    this.update();
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      this.update();
    });
    this.unsubscribeInventoryChanged = app.getEvents().subscribe("inventory:changed", () => {
      this.update();
    });
  }

  /** unsubscribes from clock/inventory events, disposes the modal, and detaches the panel from the DOM */
  public dispose(): void {
    this.unsubscribeTick();
    this.unsubscribeInventoryChanged();
    this.modal.dispose();
    this.panel.remove();
  }

  /** reads the latest inventory state and rebuilds the card; safe to call anytime, including from outside */
  public update(): void {
    const rows = sortInventoryRows(collectInventoryRows(this.app), "qty-desc");
    const shown = rows.slice(0, DOCKED_ROW_LIMIT);

    // no cheat arg here: quantity editing only ever appears in the InventoryModal popup, never this docked card
    this.list.replaceChildren(...shown.map((row) => buildInventoryRowEl(row)));
    if (rows.length === 0) {
      this.list.appendChild(buildInventoryEmptyEl());
    }

    this.hint.textContent =
      rows.length > shown.length ? `Showing ${shown.length} of ${rows.length} — click to view all` : "Click to view all";
  }
}
