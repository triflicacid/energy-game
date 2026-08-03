import { describe, expect, it } from "vitest";
import {
  KW_PER_MW,
  elecPowerMW,
  energyFromPowerAndTime,
  kwToMw,
  mechPowerKW,
  money,
  mwToKw,
  simHours,
  waterML,
  materialQty,
  energyMWh,
} from "./units";

describe("unit constructors", () => {
  it("preserve their numeric value", () => {
    expect(simHours(4)).toBe(4);
    expect(money(100)).toBe(100);
    expect(elecPowerMW(2.5)).toBe(2.5);
    expect(mechPowerKW(750)).toBe(750);
    expect(energyMWh(12)).toBe(12);
    expect(materialQty(50)).toBe(50);
    expect(waterML(200)).toBe(200);
  });
});

describe("energyFromPowerAndTime", () => {
  it("multiplies MW by hours to give MWh", () => {
    expect(energyFromPowerAndTime(elecPowerMW(2), simHours(3))).toBe(6);
  });

  it("returns zero when power is zero", () => {
    expect(energyFromPowerAndTime(elecPowerMW(0), simHours(10))).toBe(0);
  });

  it("returns zero when duration is zero", () => {
    expect(energyFromPowerAndTime(elecPowerMW(5), simHours(0))).toBe(0);
  });
});

describe("kwToMw and mwToKw", () => {
  it("1000 kW equals 1 MW", () => {
    expect(kwToMw(KW_PER_MW)).toBe(1);
  });

  it("1 MW equals 1000 kW", () => {
    expect(mwToKw(1)).toBe(KW_PER_MW);
  });

  it("round-trips without loss", () => {
    expect(kwToMw(mwToKw(7))).toBe(7);
    expect(mwToKw(kwToMw(3000))).toBe(3000);
  });
});

