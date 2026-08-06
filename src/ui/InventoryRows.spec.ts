import { describe, expect, it } from "vitest";
import type { ResourceDef } from "@content";
import { makeResourceId } from "@shared";
import { sortInventoryRows, type InventoryRow } from "./InventoryRows";

function resource(id: string): ResourceDef {
  return {
    id: makeResourceId(id),
    category: "organic",
    unit: "kg",
    storable: true,
    importable: true,
    renewable: true,
    waste: false,
    hazardous: false,
    iconId: `icon-${id}`,
  };
}

function row(resourceId: string, qty: number): InventoryRow {
  return { resourceId, qty, resource: resource(resourceId) };
}

describe("sortInventoryRows", () => {
  it("sorts by name ascending", () => {
    const rows = [row("wood-waste", 5), row("timber", 5), row("lumber", 5)];
    const sorted = sortInventoryRows(rows, "name");
    expect(sorted.map((r) => r.resourceId)).toEqual(["lumber", "timber", "wood-waste"]);
  });

  it("sorts by quantity descending", () => {
    const rows = [row("a", 10), row("b", 250), row("c", 100)];
    const sorted = sortInventoryRows(rows, "qty-desc");
    expect(sorted.map((r) => r.resourceId)).toEqual(["b", "c", "a"]);
  });

  it("sorts by quantity ascending", () => {
    const rows = [row("a", 10), row("b", 250), row("c", 100)];
    const sorted = sortInventoryRows(rows, "qty-asc");
    expect(sorted.map((r) => r.resourceId)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const rows = [row("b", 1), row("a", 2)];
    const original = [...rows];
    sortInventoryRows(rows, "name");
    expect(rows).toEqual(original);
  });

  it("falls back to resourceId for name sort when the resource is unresolved", () => {
    const rows: InventoryRow[] = [
      { resourceId: "zzz", qty: 1, resource: undefined },
      { resourceId: "aaa", qty: 1, resource: undefined },
    ];
    const sorted = sortInventoryRows(rows, "name");
    expect(sorted.map((r) => r.resourceId)).toEqual(["aaa", "zzz"]);
  });
});
