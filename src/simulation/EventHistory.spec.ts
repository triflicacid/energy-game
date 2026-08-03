import { describe, it, expect } from "vitest";
import { EventHistory, DEFAULT_HISTORY_CAPACITY } from "./EventHistory";
import type { HistoryEntry } from "./EventHistory";

function makeEntry(tick: number, name = "test"): HistoryEntry {
  return { tick, gameTime: tick, name, payload: {} };
}

describe("EventHistory — construction", () => {
  it("starts empty", () => {
    const h = new EventHistory();
    expect(h.size).toBe(0);
    expect(h.getEntries()).toHaveLength(0);
  });

  it("uses the default capacity", () => {
    const h = new EventHistory();
    expect(h.capacity).toBe(DEFAULT_HISTORY_CAPACITY);
  });

  it("accepts a custom capacity", () => {
    const h = new EventHistory(10);
    expect(h.capacity).toBe(10);
  });

  it("throws on zero capacity", () => {
    expect(() => new EventHistory(0)).toThrow(RangeError);
  });

  it("throws on negative capacity", () => {
    expect(() => new EventHistory(-1)).toThrow(RangeError);
  });

  it("throws on fractional capacity", () => {
    expect(() => new EventHistory(1.5)).toThrow(RangeError);
  });
});

describe("EventHistory — append", () => {
  it("appends entries in order", () => {
    const h = new EventHistory(10);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    h.append(makeEntry(3));
    const entries = h.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].tick).toBe(1);
    expect(entries[2].tick).toBe(3);
  });

  it("discards the oldest entry when capacity is exceeded", () => {
    const h = new EventHistory(3);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    h.append(makeEntry(3));
    h.append(makeEntry(4));
    expect(h.size).toBe(3);
    expect(h.getEntries()[0].tick).toBe(2);
    expect(h.getEntries()[2].tick).toBe(4);
  });

  it("never exceeds capacity after many appends", () => {
    const h = new EventHistory(5);
    for (let i = 0; i < 20; i++) h.append(makeEntry(i));
    expect(h.size).toBe(5);
  });
});

describe("EventHistory — getState", () => {
  it("returns a copy that is not affected by later appends", () => {
    const h = new EventHistory(10);
    h.append(makeEntry(1));
    const snap = h.getState();
    h.append(makeEntry(2));
    expect(snap).toHaveLength(1);
  });

  it("copies payload objects so mutations do not propagate", () => {
    const h = new EventHistory(10);
    const payload: Record<string, unknown> = { x: 1 };
    h.append({ tick: 0, gameTime: 0, name: "t", payload });
    const snap = h.getState();
    payload["x"] = 99;
    expect(snap[0].payload["x"]).toBe(1);
  });
});

describe("EventHistory — restore", () => {
  it("rehydrates entries", () => {
    const h = new EventHistory(10);
    h.restore([makeEntry(10), makeEntry(20)]);
    expect(h.size).toBe(2);
    expect(h.getEntries()[0].tick).toBe(10);
    expect(h.getEntries()[1].tick).toBe(20);
  });

  it("trims to capacity when input exceeds it", () => {
    const h = new EventHistory(3);
    h.restore([1, 2, 3, 4, 5].map(n => makeEntry(n)));
    expect(h.size).toBe(3);
    expect(h.getEntries()[0].tick).toBe(3);
  });

  it("replaces any existing entries", () => {
    const h = new EventHistory(10);
    h.append(makeEntry(1));
    h.restore([makeEntry(99)]);
    expect(h.size).toBe(1);
    expect(h.getEntries()[0].tick).toBe(99);
  });

  it("handles an empty slice", () => {
    const h = new EventHistory(10);
    h.append(makeEntry(1));
    h.restore([]);
    expect(h.size).toBe(0);
  });
});

describe("EventHistory — clear", () => {
  it("removes all entries", () => {
    const h = new EventHistory(10);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    h.clear();
    expect(h.size).toBe(0);
    expect(h.getEntries()).toHaveLength(0);
  });
});

