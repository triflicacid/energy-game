// defines the pluggable contract QuantityPanel/QuantityModal are generic over. Everything about a
// given docked-card + popup pair — the company inventory, the sector natural-resource summary, and
// whatever comes next — is one of these; the panel/modal code itself never changes.

import type { Application } from "@application";
import type { Unsubscribe } from "@shared";
import type { QuantityRow, QuantitySortMode } from "./QuantityRows";

export type QuantitySource = {
  /** shown as both the docked card heading and the popup heading */
  readonly title: string;
  /** shown in place of the row list when collectRows() returns nothing */
  readonly emptyMessage: string;
  /** sort mode the docked card always uses, and the popup opens with */
  readonly defaultSortMode: QuantitySortMode;
  /** reads current rows fresh from application/campaign state; called on every render */
  collectRows(app: Application): QuantityRow[];
  /** cheat-only setter for one row's quantity; omit if this source is never cheat-editable */
  cheatSetQuantity?(app: Application, id: string, qty: number): void;
  /** events that should trigger a re-render while the docked card or popup is visible */
  subscribeRefresh(app: Application, refresh: () => void): Unsubscribe[];
};
