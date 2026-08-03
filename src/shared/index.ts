// shared utilities and types with no dependencies on other game layers

export type { Brand } from "./brand";
export type {
  EventMap,
  Listener,
  Unsubscribe,
  ListenerErrorHandler,
} from "./EventBus";
export { EventBus } from "./EventBus";
export type {
  SimHours,
  Money,
  ElecPowerMW,
  MechPowerKW,
  EnergyMWh,
  MaterialQty,
  WaterML,
} from "./units";
export {
  KW_PER_MW,
  simHours,
  money,
  elecPowerMW,
  mechPowerKW,
  energyMWh,
  materialQty,
  waterML,
  energyFromPowerAndTime,
  kwToMw,
  mwToKw,
} from "./units";
export type { ScaleEntry, ScaledValue } from "./ScaleFormatter";
export {
  ScaleFormatter,
  ELEC_POWER_FORMATTER,
  MECH_POWER_FORMATTER,
  ENERGY_FORMATTER,
  WATER_FORMATTER,
  MONEY_FORMATTER,
} from "./ScaleFormatter";
export type {
  SectorId,
  TownId,
  SiteId,
  FacilityId,
  ContractId,
  ConstructionJobId,
} from "./IdCounter";
export {
  IdCounter,
  makeSectorId,
  makeTownId,
  makeSiteId,
  makeFacilityId,
  makeContractId,
  makeConstructionJobId,
} from "./IdCounter";
export type { RngState } from "./Rng";
export { Rng, seedFromString } from "./Rng";
export type { JsonSerializable } from "./JsonSerializable";
