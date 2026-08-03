// company-wide resource inventory with validated mutations

import type { EventBus } from "@shared/EventBus";
import type { JsonSerializable } from "@shared/JsonSerializable";
import type { ResourceId } from "@shared/IdCounter";
import type { InventoryState } from "./CampaignState";

/** events published by Inventory */
export type InventoryEventMap = {
  "inventory:added": Readonly<{ resourceId: ResourceId; qty: number; newTotal: number }>;
  "inventory:removed": Readonly<{ resourceId: ResourceId; qty: number; newTotal: number }>;
};

/**
 * company-wide resource inventory
 *
 * all quantities are non-negative; operations that would produce a negative
 * quantity are rejected before any state change occurs
 */
export class Inventory<TMap extends InventoryEventMap>
  implements JsonSerializable<InventoryState>
{
  private readonly quantities: Map<ResourceId, number> = new Map();

  public constructor(private readonly bus: EventBus<TMap>) {}

  /** returns the current quantity held for a resource (0 if not tracked) */
  public get(resourceId: ResourceId): number {
    return this.quantities.get(resourceId) ?? 0;
  }

  /** true when at least minQty of the resource is available */
  public has(resourceId: ResourceId, minQty: number): boolean {
    return this.get(resourceId) >= minQty;
  }

  /**
   * adds qty of a resource to the inventory
   * @throws RangeError if qty is not a finite non-negative number
   */
  public add(resourceId: ResourceId, qty: number): void {
    if (!Number.isFinite(qty) || qty < 0) {
      throw new RangeError(`qty must be a finite non-negative number, got ${qty}`);
    }
    const newTotal = this.get(resourceId) + qty;
    this.quantities.set(resourceId, newTotal);
    this.bus.publish("inventory:added", { resourceId, qty, newTotal });
  }

  /**
   * removes qty of a resource from the inventory
   * @throws RangeError if qty is invalid or the current stock is insufficient
   */
  public remove(resourceId: ResourceId, qty: number): void {
    if (!Number.isFinite(qty) || qty < 0) {
      throw new RangeError(`qty must be a finite non-negative number, got ${qty}`);
    }
    const current = this.get(resourceId);
    if (current < qty) {
      throw new RangeError(
        `insufficient ${resourceId}: have ${current}, need ${qty}`,
      );
    }
    const newTotal = current - qty;
    this.quantities.set(resourceId, newTotal);
    this.bus.publish("inventory:removed", { resourceId, qty, newTotal });
  }

  /** returns a serializable snapshot of the current quantities */
  public getState(): InventoryState {
    const quantities: Record<string, number> = {};
    for (const [id, qty] of this.quantities) {
      quantities[id] = qty;
    }
    return { quantities };
  }

  /** restores quantities from a snapshot, replacing any existing state */
  public restore(state: InventoryState): void {
    this.quantities.clear();
    for (const [id, qty] of Object.entries(state.quantities)) {
      this.quantities.set(id as ResourceId, qty);
    }
  }
}

