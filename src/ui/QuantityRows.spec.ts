import { describe, expect, it } from "vitest";
import { sortQuantityRows, type QuantityRow } from "./QuantityRows";

function row(id: string, qty: number, label = id): QuantityRow {
  return { id, qty, label, unit: "kg", iconId: `icon-${id}` };
}

describe("sortQuantityRows", () => {
  it("sorts by name ascending", () => {
    const rows = [row("a", 5, "wood-waste"), row("b", 5, "timber"), row("c", 5, "lumber")];
    const sorted = sortQuantityRows(rows, "name");
    expect(sorted.map((r) => r.label)).toEqual(["lumber", "timber", "wood-waste"]);
  });

  it("sorts by quantity descending", () => {
    const rows = [row("a", 10), row("b", 250), row("c", 100)];
    const sorted = sortQuantityRows(rows, "qty-desc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by quantity ascending", () => {
    const rows = [row("a", 10), row("b", 250), row("c", 100)];
    const sorted = sortQuantityRows(rows, "qty-asc");
    expect(sorted.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const rows = [row("b", 1), row("a", 2)];
    const original = [...rows];
    sortQuantityRows(rows, "name");
    expect(rows).toEqual(original);
  });
});
