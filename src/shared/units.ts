// canonical internal simulation units
// display formatting and abbreviation strings belong in the ui layer, not here
//
// canonical units:
//   time         SimHours    game hours
//   money        Money       base currency units
//   elec power   ElecPowerMW megawatts
//   mech power   MechPowerKW kilowatts
//   energy       EnergyMWh   megawatt-hours
//   materials    MaterialQty tonnes
//   water        WaterML     megalitres

import type { Brand } from "./brand";

/** simulation time in game hours */
export type SimHours = Brand<number, "SimHours">;

/** money in base currency units */
export type Money = Brand<number, "Money">;

/** electrical power in megawatts */
export type ElecPowerMW = Brand<number, "ElecPowerMW">;

/** mechanical power in kilowatts */
export type MechPowerKW = Brand<number, "MechPowerKW">;

/** electrical energy in megawatt-hours */
export type EnergyMWh = Brand<number, "EnergyMWh">;

/** material quantity in tonnes */
export type MaterialQty = Brand<number, "MaterialQty">;

/** water volume in megalitres */
export type WaterML = Brand<number, "WaterML">;

/** wraps n as SimHours */
export function simHours(n: number): SimHours { return n as SimHours; }

/** wraps n as Money */
export function money(n: number): Money { return n as Money; }

/** wraps n as ElecPowerMW */
export function elecPowerMW(n: number): ElecPowerMW { return n as ElecPowerMW; }

/** wraps n as MechPowerKW */
export function mechPowerKW(n: number): MechPowerKW { return n as MechPowerKW; }

/** wraps n as EnergyMWh */
export function energyMWh(n: number): EnergyMWh { return n as EnergyMWh; }

/** wraps n as MaterialQty */
export function materialQty(n: number): MaterialQty { return n as MaterialQty; }

/** wraps n as WaterML */
export function waterML(n: number): WaterML { return n as WaterML; }

/** kilowatts per megawatt */
export const KW_PER_MW = 1000;

/** computes electrical energy from power and duration: MW * h = MWh */
export function energyFromPowerAndTime(power: ElecPowerMW, hours: SimHours): EnergyMWh {
  return (power * hours) as EnergyMWh;
}

/** converts a kilowatt value to megawatts */
export function kwToMw(kw: number): number {
  return kw / KW_PER_MW;
}

/** converts a megawatt value to kilowatts */
export function mwToKw(mw: number): number {
  return mw * KW_PER_MW;
}

