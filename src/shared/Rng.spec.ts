import { describe, expect, it } from "vitest";
import { Rng, seedFromString } from "./Rng";

describe("Rng", () => {
  it("same seed produces the same sequence", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const results = Array.from({ length: 10 }, () => [a.next(), b.next()]);
    const allSame = results.every(([x, y]) => x === y);
    expect(allSame).toBe(false);
  });

  it("next returns values in [0, 1)", () => {
    const rng = new Rng(999);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt returns integers within [min, max)", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(3, 10);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("nextBool returns only true or false", () => {
    const rng = new Rng(123);
    for (let i = 0; i < 50; i++) {
      expect(typeof rng.nextBool()).toBe("boolean");
    }
  });

  it("getState and restore continue the same sequence", () => {
    const rng = new Rng(55);
    // advance a few steps
    rng.next();
    rng.next();
    const state = rng.getState();
    // record the next 10 values
    const expected = Array.from({ length: 10 }, () => rng.next());
    // restore and replay
    rng.restore(state);
    const actual = Array.from({ length: 10 }, () => rng.next());
    expect(actual).toEqual(expected);
  });

  it("restore on a fresh instance reproduces the same sequence", () => {
    const source = new Rng(77);
    source.next();
    const state = source.getState();
    const expected = Array.from({ length: 10 }, () => source.next());

    const replica = new Rng(0);
    replica.restore(state);
    const actual = Array.from({ length: 10 }, () => replica.next());
    expect(actual).toEqual(expected);
  });

  it("getState returns a plain serializable object", () => {
    const rng = new Rng(11);
    rng.next();
    const state = rng.getState();
    expect(typeof state.s).toBe("number");
    // must survive a JSON round-trip
    const restored = JSON.parse(JSON.stringify(state)) as typeof state;
    rng.restore(restored);
    const a = rng.next();
    rng.restore(state);
    const b = rng.next();
    expect(a).toBe(b);
  });
});

describe("seedFromString", () => {
  it("same string produces the same seed", () => {
    expect(seedFromString("hello")).toBe(seedFromString("hello"));
  });

  it("different strings produce different seeds", () => {
    expect(seedFromString("alpha")).not.toBe(seedFromString("beta"));
  });

  it("empty string produces a deterministic seed", () => {
    expect(seedFromString("")).toBe(seedFromString(""));
  });

  it("seed is a 32-bit integer", () => {
    const s = seedFromString("test");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(-2147483648);
    expect(s).toBeLessThanOrEqual(2147483647);
  });

  it("seed drives an rng that produces consistent values", () => {
    const seed = seedFromString("campaign-2026");
    const a = new Rng(seed);
    const b = new Rng(seed);
    expect(a.next()).toBe(b.next());
  });
});

