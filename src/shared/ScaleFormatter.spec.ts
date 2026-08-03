import { describe, expect, it } from "vitest";
import {
  ELEC_POWER_FORMATTER,
  ENERGY_FORMATTER,
  MECH_POWER_FORMATTER,
  MONEY_FORMATTER,
  ScaleFormatter,
  WATER_FORMATTER,
} from "./ScaleFormatter";

describe("ScaleFormatter.scale", () => {
  it("picks the first scale whose divisor fits the magnitude", () => {
    const f = new ScaleFormatter([
      { divisor: 1e3, suffix: "G" },
      { divisor: 1, suffix: "M" },
      { divisor: 1e-3, suffix: "k" },
    ]);
    expect(f.scale(5000)).toEqual({ scaled: 5, suffix: "G" });
    expect(f.scale(5)).toEqual({ scaled: 5, suffix: "M" });
    expect(f.scale(0.005)).toEqual({ scaled: 5, suffix: "k" });
  });

  it("falls back to the smallest scale for values below all thresholds", () => {
    const f = new ScaleFormatter([
      { divisor: 1e3, suffix: "G" },
      { divisor: 1, suffix: "M" },
    ]);
    expect(f.scale(0.0001).suffix).toBe("M");
  });

  it("uses absolute value when choosing scale so negatives behave consistently", () => {
    const f = new ScaleFormatter([
      { divisor: 1e3, suffix: "G" },
      { divisor: 1, suffix: "M" },
    ]);
    const pos = f.scale(2000);
    const neg = f.scale(-2000);
    expect(neg.suffix).toBe(pos.suffix);
    expect(neg.scaled).toBe(-pos.scaled);
  });

  it("returns zero in the fallback scale when value is zero", () => {
    const f = new ScaleFormatter([
      { divisor: 1e3, suffix: "G" },
      { divisor: 1, suffix: "M" },
    ]);
    expect(f.scale(0)).toEqual({ scaled: 0, suffix: "M" });
  });

  it("returns value with empty suffix when scales array is empty", () => {
    const f = new ScaleFormatter([]);
    expect(f.scale(42)).toEqual({ scaled: 42, suffix: "" });
  });
});

describe("ScaleFormatter.format", () => {
  it("formats to two decimal places by default", () => {
    const f = new ScaleFormatter([{ divisor: 1, suffix: "M" }]);
    expect(f.format(1.5)).toBe("1.50 M");
  });

  it("respects a custom decimal count", () => {
    const f = new ScaleFormatter([{ divisor: 1, suffix: "M" }]);
    expect(f.format(1.5, 0)).toBe("2 M");
    expect(f.format(1.5, 1)).toBe("1.5 M");
  });
});

describe("predefined formatters", () => {
  it("ELEC_POWER_FORMATTER scales MW input correctly", () => {
    expect(ELEC_POWER_FORMATTER.scale(1500).suffix).toBe("GW");
    expect(ELEC_POWER_FORMATTER.scale(2).suffix).toBe("MW");
    expect(ELEC_POWER_FORMATTER.scale(0.5e-3).suffix).toBe("kW");
  });

  it("MECH_POWER_FORMATTER scales kW input correctly", () => {
    expect(MECH_POWER_FORMATTER.scale(2000).suffix).toBe("MW");
    expect(MECH_POWER_FORMATTER.scale(500).suffix).toBe("kW");
    expect(MECH_POWER_FORMATTER.scale(0.5e-3).suffix).toBe("W");
  });

  it("ENERGY_FORMATTER scales MWh input correctly", () => {
    expect(ENERGY_FORMATTER.scale(2e6).suffix).toBe("TWh");
    expect(ENERGY_FORMATTER.scale(500).suffix).toBe("MWh");
    expect(ENERGY_FORMATTER.scale(0.5e-3).suffix).toBe("kWh");
  });

  it("WATER_FORMATTER scales ML input correctly", () => {
    expect(WATER_FORMATTER.scale(2e6).suffix).toBe("GL");
    expect(WATER_FORMATTER.scale(500).suffix).toBe("ML");
  });

  it("MONEY_FORMATTER scales base currency units correctly", () => {
    expect(MONEY_FORMATTER.scale(2e12).suffix).toBe("T");
    expect(MONEY_FORMATTER.scale(3e9).suffix).toBe("B");
    expect(MONEY_FORMATTER.scale(1.5e6).suffix).toBe("M");
    expect(MONEY_FORMATTER.scale(800e3).suffix).toBe("K");
    expect(MONEY_FORMATTER.scale(500).suffix).toBe("");
  });

  it("MONEY_FORMATTER format omits trailing space for base amounts", () => {
    expect(MONEY_FORMATTER.format(500)).toBe("500.00");
    expect(MONEY_FORMATTER.format(1500)).toBe("1.50 K");
  });
});



