/** one entry in a scale table; value is divided by divisor and shown with suffix */
export interface ScaleEntry {
  readonly divisor: number;
  readonly suffix: string;
}

/** result of picking the most readable scale for a value */
export interface ScaledValue {
  readonly scaled: number;
  readonly suffix: string;
}

/**
 * picks the most readable scale for a numeric value from an ordered scale table.
 * scales must be ordered from largest divisor to smallest.
 */
export class ScaleFormatter {
  public constructor(private readonly scales: readonly ScaleEntry[]) {}

  /** returns the scaled value and suffix for the first entry whose divisor fits the magnitude */
  public scale(value: number): ScaledValue {
    const fallback = this.scales.at(-1);
    if (!fallback) {
      return { scaled: value, suffix: "" };
    }
    for (const entry of this.scales) {
      if (Math.abs(value) >= entry.divisor) {
        return { scaled: value / entry.divisor, suffix: entry.suffix };
      }
    }
    return { scaled: value / fallback.divisor, suffix: fallback.suffix };
  }

  /** formats value as a string rounded to decimals places */
  public format(value: number, decimals = 2): string {
    const { scaled, suffix } = this.scale(value);
    return suffix ? `${scaled.toFixed(decimals)} ${suffix}` : scaled.toFixed(decimals);
  }
}

/** formats electrical power values given in MW */
export const ELEC_POWER_FORMATTER = new ScaleFormatter([
  { divisor: 1e6, suffix: "TW" },
  { divisor: 1e3, suffix: "GW" },
  { divisor: 1, suffix: "MW" },
  { divisor: 1e-3, suffix: "kW" },
]);

/** formats mechanical power values given in kW */
export const MECH_POWER_FORMATTER = new ScaleFormatter([
  { divisor: 1e6, suffix: "GW" },
  { divisor: 1e3, suffix: "MW" },
  { divisor: 1, suffix: "kW" },
  { divisor: 1e-3, suffix: "W" },
]);

/** formats electrical energy values given in MWh */
export const ENERGY_FORMATTER = new ScaleFormatter([
  { divisor: 1e6, suffix: "TWh" },
  { divisor: 1e3, suffix: "GWh" },
  { divisor: 1, suffix: "MWh" },
  { divisor: 1e-3, suffix: "kWh" },
]);

/** formats water volumes given in ML */
export const WATER_FORMATTER = new ScaleFormatter([
  { divisor: 1e3, suffix: "GL" },
  { divisor: 1, suffix: "ML" },
  { divisor: 1e-3, suffix: "kL" },
  { divisor: 1e-6, suffix: "L" },
]);

/**
 * formats money values given in base currency units.
 * base amounts below 1000 are formatted as plain numbers with no suffix.
 * the currency symbol is a display concern handled by the ui layer.
 */
export const MONEY_FORMATTER = new ScaleFormatter([
  { divisor: 1e12, suffix: "T" },
  { divisor: 1e9, suffix: "B" },
  { divisor: 1e6, suffix: "M" },
  { divisor: 1e3, suffix: "K" },
  { divisor: 1, suffix: "" },
]);




