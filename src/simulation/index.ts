// runtime state and game systems
// no dependency on rendering, ui, or browser apis

export {
  SimulationClock,
  TICK_DURATION_HOURS,
  SPEED_MULTIPLIERS,
  type SimClockEventMap,
  type SpeedMultiplier,
  type ClockSerialState,
} from "./SimulationClock";

export {
  EventHistory,
  DEFAULT_HISTORY_CAPACITY,
  type HistoryEntry,
} from "./EventHistory";

export {
  CAMPAIGN_STATE_VERSION,
  createCampaignState,
  serializeCampaignState,
  deserializeCampaignState,
  type CampaignState,
  type ReadonlyCampaignState,
  type CreateCampaignOptions,
  type IdCounterStates,
  type InventoryState,
  type ResearchProgressState,
  type SectorSerialState,
  type TownSerialState,
  type SiteSerialState,
  type FacilitySerialState,
  type ContractSerialState,
} from "./CampaignState";

export {
  createCentreSector,
  CentreSectorError,
} from "./CentreSector";

export {
  Inventory,
  type InventoryEventMap,
} from "./Inventory";

export {
  RecipeExecutor,
  type RecipeEventMap,
  type RecipeExecutionEventMap,
  type RecipeResult,
} from "./RecipeExecutor";

export {
  ResearchManager,
  type ResearchEventMap,
  type AddPointsResult,
} from "./ResearchManager";

