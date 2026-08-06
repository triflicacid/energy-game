// generic docked HTML card for one QuantitySource: read-only top-10 summary; click opens the full
// sortable QuantityModal popup. The card itself is always read-only, even with cheats on — cheat
// editing only ever appears in the popup.

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";
import type { Unsubscribe } from "@shared";
import { getDock, type DockSide } from "./Dock";
import { QuantityModal } from "./QuantityModal";
import { buildQuantityEmptyEl, buildQuantityRowEl, sortQuantityRows } from "./QuantityRows";
import type { QuantitySource } from "./QuantitySource";

const DOCKED_ROW_LIMIT = 10;

/**
 * read-only docked card for one QuantitySource.
 * lists its top 10 rows by the source's default sort: icon, label, quantity, unit.
 * updates from the source's refresh events; never polls every animation frame.
 * the whole card is not a <button> but behaves like one (role, tabindex, Enter/Space) and opens
 * the full sortable popup in `QuantityModal`.
 */
export class QuantityPanel implements Disposable {
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly modal: QuantityModal;
  private readonly unsubscribeRefresh: readonly Unsubscribe[];

  public constructor(
    private readonly app: Application,
    private readonly source: QuantitySource,
    dockSide: DockSide = "dock-right",
  ) {
    this.panel = document.createElement("section");
    this.panel.classList.add("panel", "quantity-panel", "panel--clickable");
    this.panel.setAttribute("role", "button");
    this.panel.setAttribute("tabindex", "0");
    this.panel.setAttribute("aria-haspopup", "dialog");
    this.panel.setAttribute("aria-label", `${source.title} — view all`);
    this.panel.addEventListener("click", () => this.modal.open());
    this.panel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.modal.open();
    });

    const heading = document.createElement("h2");
    heading.classList.add("panel-heading");
    heading.textContent = source.title;
    this.panel.appendChild(heading);

    this.list = document.createElement("ul");
    this.list.classList.add("quantity-list");
    this.panel.appendChild(this.list);

    this.hint = document.createElement("p");
    this.hint.classList.add("quantity-hint");
    this.panel.appendChild(this.hint);

    getDock(app, dockSide).appendChild(this.panel);

    this.modal = new QuantityModal(app, source);

    this.update();
    this.unsubscribeRefresh = source.subscribeRefresh(app, () => this.update());
  }

  /** unsubscribes from refresh events, disposes the popup, and detaches the card from the DOM */
  public dispose(): void {
    for (const unsubscribe of this.unsubscribeRefresh) unsubscribe();
    this.modal.dispose();
    this.panel.remove();
  }

  /** reads the latest source state and rebuilds the card; safe to call anytime, including from outside */
  public update(): void {
    const rows = sortQuantityRows(this.source.collectRows(this.app), this.source.defaultSortMode);
    const shown = rows.slice(0, DOCKED_ROW_LIMIT);

    // no cheat arg here: quantity editing only ever appears in the popup, never this docked card
    this.list.replaceChildren(...shown.map((row) => buildQuantityRowEl(row)));
    if (rows.length === 0) {
      this.list.appendChild(buildQuantityEmptyEl(this.source.emptyMessage));
    }

    this.hint.textContent =
      rows.length > shown.length
        ? `Showing ${shown.length} of ${rows.length} — click to view all`
        : "Click to view all";
  }
}
