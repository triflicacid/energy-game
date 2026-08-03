import { describe, expect, it } from "vitest";
import {
  IdCounter,
  makeConstructionJobId,
  makeContractId,
  makeFacilityId,
  makeSectorId,
  makeSiteId,
  makeTownId,
} from "./IdCounter";

describe("IdCounter", () => {
  it("starts at zero and first call to next returns 1", () => {
    const c = new IdCounter();
    expect(c.peek()).toBe(0);
    expect(c.next()).toBe(1);
  });

  it("increments on each call to next", () => {
    const c = new IdCounter();
    expect(c.next()).toBe(1);
    expect(c.next()).toBe(2);
    expect(c.next()).toBe(3);
  });

  it("peek does not increment the counter", () => {
    const c = new IdCounter();
    c.next();
    const before = c.peek();
    c.peek();
    expect(c.peek()).toBe(before);
  });

  it("accepts a custom initial value", () => {
    const c = new IdCounter(10);
    expect(c.peek()).toBe(10);
    expect(c.next()).toBe(11);
  });

  it("restore sets the counter so the next id continues from there", () => {
    const c = new IdCounter();
    c.next();
    c.next();
    c.restore(99);
    expect(c.peek()).toBe(99);
    expect(c.next()).toBe(100);
  });
});

describe("id factory functions", () => {
  it("consecutive ids from the same counter are different", () => {
    const c = new IdCounter();
    expect(makeSectorId(c)).not.toBe(makeSectorId(c));
    expect(makeTownId(c)).not.toBe(makeTownId(c));
    expect(makeSiteId(c)).not.toBe(makeSiteId(c));
    expect(makeFacilityId(c)).not.toBe(makeFacilityId(c));
    expect(makeContractId(c)).not.toBe(makeContractId(c));
    expect(makeConstructionJobId(c)).not.toBe(makeConstructionJobId(c));
  });

  it("ids from different entity types with equal counters are different", () => {
    const c1 = new IdCounter();
    const c2 = new IdCounter();
    expect(makeSectorId(c1)).not.toBe(makeTownId(c2));
    expect(makeSiteId(c1)).not.toBe(makeFacilityId(c2));
  });

  it("ids contain their entity prefix", () => {
    const c = new IdCounter();
    expect(makeSectorId(c)).toContain("sector:");
    expect(makeTownId(c)).toContain("town:");
    expect(makeSiteId(c)).toContain("site:");
    expect(makeFacilityId(c)).toContain("facility:");
    expect(makeContractId(c)).toContain("contract:");
    expect(makeConstructionJobId(c)).toContain("job:");
  });
});

