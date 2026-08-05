// read-only HTML panel listing the single company-wide inventory
// reads Application/CampaignState; never mutates simulation state

import type { Application } from "@application";
import type { ResourceDef } from "@content";
import type { Disposable } from "@shared/Disposable";
import { getDock } from "./Dock";
import { hasIcon, resolveIconStyle } from "./IconResolver";

/** derives a readable placeholder label from a resource id; real localization lands later */
function placeholderLabel(resourceId: string): string {
  return resourceId
    .split("-")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** trims float noise for display without implying false precision */
function formatQuantity(qty: number): string {
  return (Math.round(qty * 100) / 100).toLocaleString();
}

/**
 * read-only company-inventory panel.
 * lists every resource currently held in non-zero quantity: icon, label, quantity, unit.
 * updates from `tick:after`, never per-animation-frame polling.
 */
export class InventoryPanel implements Disposable {
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly unsubscribeTick: () => void;

  public constructor(private readonly app: Application) {
    this.panel = document.createElement("section");
    this.panel.classList.add("panel", "inventory-panel");
    this.panel.setAttribute("aria-label", "inventory");

    const heading = document.createElement("h2");
    heading.classList.add("panel-heading");
    heading.textContent = "Inventory";
    this.panel.appendChild(heading);

    this.list = document.createElement("ul");
    this.list.classList.add("inventory-list");
    this.panel.appendChild(this.list);

    getDock(app, "dock-right").appendChild(this.panel);

    this.render();
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      this.render();
    });
  }

  /** unsubscribes from clock events and detaches the panel from the DOM */
  public dispose(): void {
    this.unsubscribeTick();
    this.panel.remove();
  }

  private render(): void {
    const { quantities } = this.app.getCampaignState().inventory;
    const catalog = this.app.getCatalog();

    const rows = Object.entries(quantities)
      .filter(([, qty]) => qty !== 0)
      .sort(([a], [b]) => a.localeCompare(b));

    this.list.replaceChildren(...rows.map(([resourceId, qty]) => this.buildRow(resourceId, qty, catalog.getResource(resourceId))));

    if (rows.length === 0) {
      const empty = document.createElement("li");
      empty.classList.add("inventory-empty");
      empty.textContent = "No resources in inventory.";
      this.list.appendChild(empty);
    }
  }

  private buildRow(resourceId: string, qty: number, resource: ResourceDef | undefined): HTMLElement {
    const row = document.createElement("li");
    row.classList.add("inventory-row");
    row.appendChild(this.buildIcon(resource));

    const label = document.createElement("span");
    label.classList.add("inventory-label");
    label.textContent = placeholderLabel(resource?.id ?? resourceId);
    row.appendChild(label);

    const qtyEl = document.createElement("span");
    qtyEl.classList.add("inventory-qty");
    qtyEl.textContent = resource ? `${formatQuantity(qty)} ${resource.unit}` : formatQuantity(qty);
    row.appendChild(qtyEl);

    return row;
  }

  /** returns the icon element for a row: the resolved sprite crop, or a visible placeholder */
  private buildIcon(resource: ResourceDef | undefined): HTMLElement {
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
}
