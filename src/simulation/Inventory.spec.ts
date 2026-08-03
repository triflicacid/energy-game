import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@shared/EventBus";
import { makeResourceId } from "@shared";
import { Inventory } from "./Inventory";
import type { InventoryEventMap } from "./Inventory";

const rid = makeResourceId;

function makeInventory() {
  const bus = new EventBus<InventoryEventMap>();
  const inventory = new Inventory(bus);
  return { inventory, bus };
}

describe("Inventory — get / has", () => {
  it("returns 0 for an unknown resource", () => {
    const { inventory } = makeInventory();
    expect(inventory.get(rid("wood"))).toBe(0);
  });

  it("has returns false when stock is zero", () => {
    const { inventory } = makeInventory();
    expect(inventory.has(rid("wood"), 1)).toBe(false);
  });

  it("has returns true when stock meets the minimum", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    expect(inventory.has(rid("wood"), 5)).toBe(true);
    expect(inventory.has(rid("wood"), 4)).toBe(true);
  });

  it("has returns false when stock is below the minimum", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    expect(inventory.has(rid("wood"), 6)).toBe(false);
  });
});

describe("Inventory — add", () => {
  it("increases the stock", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 3);
    expect(inventory.get(rid("wood"))).toBe(3);
  });

  it("accumulates across multiple adds", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 2);
    inventory.add(rid("wood"), 5);
    expect(inventory.get(rid("wood"))).toBe(7);
  });

  it("allows adding zero", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 0);
    expect(inventory.get(rid("wood"))).toBe(0);
  });

  it("throws on negative qty", () => {
    const { inventory } = makeInventory();
    expect(() => inventory.add(rid("wood"), -1)).toThrow(RangeError);
  });

  it("throws on non-finite qty", () => {
    const { inventory } = makeInventory();
    expect(() => inventory.add(rid("wood"), Infinity)).toThrow(RangeError);
    expect(() => inventory.add(rid("wood"), NaN)).toThrow(RangeError);
  });

  it("publishes inventory:added with the correct payload", () => {
    const { inventory, bus } = makeInventory();
    const handler = vi.fn();
    bus.subscribe("inventory:added", handler);
    inventory.add(rid("wood"), 3);
    expect(handler).toHaveBeenCalledWith({ resourceId: "wood", qty: 3, newTotal: 3 });
  });

  it("does not change state on a rejected add", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    expect(() => inventory.add(rid("wood"), -1)).toThrow(RangeError);
    expect(inventory.get(rid("wood"))).toBe(5);
  });
});

describe("Inventory — remove", () => {
  it("decreases the stock", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 10);
    inventory.remove(rid("wood"), 4);
    expect(inventory.get(rid("wood"))).toBe(6);
  });

  it("allows removing the exact stock amount", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    inventory.remove(rid("wood"), 5);
    expect(inventory.get(rid("wood"))).toBe(0);
  });

  it("throws when stock is insufficient", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 3);
    expect(() => inventory.remove(rid("wood"), 4)).toThrow(RangeError);
  });

  it("does not change state when removal is rejected", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 3);
    expect(() => inventory.remove(rid("wood"), 99)).toThrow(RangeError);
    expect(inventory.get(rid("wood"))).toBe(3);
  });

  it("throws on negative qty", () => {
    const { inventory } = makeInventory();
    expect(() => inventory.remove(rid("wood"), -1)).toThrow(RangeError);
  });

  it("publishes inventory:removed with the correct payload", () => {
    const { inventory, bus } = makeInventory();
    const handler = vi.fn();
    bus.subscribe("inventory:removed", handler);
    inventory.add(rid("wood"), 10);
    inventory.remove(rid("wood"), 4);
    expect(handler).toHaveBeenCalledWith({ resourceId: "wood", qty: 4, newTotal: 6 });
  });

  it("stock never goes below zero", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    expect(() => inventory.remove(rid("wood"), 6)).toThrow(RangeError);
    expect(inventory.get(rid("wood"))).toBe(5);
  });
});

describe("Inventory — getState / restore", () => {
  it("getState reflects current quantities", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 4);
    inventory.add(rid("coal"), 2);
    const state = inventory.getState();
    expect(state.quantities["wood"]).toBe(4);
    expect(state.quantities["coal"]).toBe(2);
  });

  it("restore rehydrates quantities", () => {
    const { inventory } = makeInventory();
    inventory.restore({ quantities: { wood: 7, iron: 3 } });
    expect(inventory.get(rid("wood"))).toBe(7);
    expect(inventory.get(rid("iron"))).toBe(3);
  });

  it("restore replaces existing quantities", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 5);
    inventory.restore({ quantities: { coal: 1 } });
    expect(inventory.get(rid("wood"))).toBe(0);
    expect(inventory.get(rid("coal"))).toBe(1);
  });

  it("round-trips through getState / restore", () => {
    const { inventory } = makeInventory();
    inventory.add(rid("wood"), 8);
    inventory.add(rid("iron"), 2);
    const state = inventory.getState();

    const { inventory: inv2 } = makeInventory();
    inv2.restore(state);
    expect(inv2.get(rid("wood"))).toBe(8);
    expect(inv2.get(rid("iron"))).toBe(2);
  });
});
