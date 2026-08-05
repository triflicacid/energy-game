// serializable campaign state; no dom, canvas, callbacks, or subscriptions

import type { RngState } from "@shared";
import type { SectorAccessState } from "@content/defs";
import type { ClockSerialState } from "./SimulationClock";
import type { HistoryEntry } from "./EventHistory";

/** current format version; increment on breaking state schema changes */
export const CAMPAIGN_STATE_VERSION = 6;

/** serialized per-entity id counter values */
export type IdCounterStates = {
  readonly sectors: number;
  readonly features: number;
  readonly towns: number;
  readonly facilities: number;
  readonly contracts: number;
  readonly constructionJobs: number;
};

/** resource quantities keyed by resource id */
export type InventoryState = {
  readonly quantities: Readonly<Record<string, number>>;
};

/**
 * research tree progress
 *
 * multiple nodes may be in progress simultaneously; each entry records
 * accumulated points for a node that has not yet been completed
 */
export type ResearchProgressState = {
  readonly completed: readonly string[];
  readonly progress: Readonly<Record<string, number>>;
};

/** a canonical sector grid position measured from the top left cell */
export type CellSerialState = {
  readonly col: number;
  readonly row: number;
};

/** supported visual growth tiers for a town feature */
export type TownVisualTier = 1 | 2 | 3 | 4 | 5 | 6;

/** dimensions of a regular rectangular sector feature */
export type FeatureDimensionsSerialState = {
  readonly width: number;
  readonly height: number;
};

/** spatial extent of existing innate woodland */
export type WoodlandFeatureSerialState = {
  readonly id: string;
  readonly kind: "woodland";
  readonly origin: CellSerialState;
  readonly dimensions: FeatureDimensionsSerialState;
};

/** spatial placement of an existing constructed facility */
export type FacilityFeatureSerialState = {
  readonly id: string;
  readonly kind: "facility";
  readonly facilityId: string;
  readonly origin: CellSerialState;
  readonly dimensions: FeatureDimensionsSerialState;
};

/** spatial placement and visual tier of a town entity */
export type TownFeatureSerialState = {
  readonly id: string;
  readonly kind: "town";
  readonly townId: string;
  readonly origin: CellSerialState;
  readonly tier?: TownVisualTier;
};

/** one irregular reservoir and its complete visual join group */
export type ReservoirFeatureSerialState = {
  readonly id: string;
  readonly kind: "reservoir";
  readonly cells: readonly CellSerialState[];
};

/** typed spatial geometry owned by a sector */
export type SectorFeatureSerialState =
  | WoodlandFeatureSerialState
  | FacilityFeatureSerialState
  | TownFeatureSerialState
  | ReservoirFeatureSerialState;

/** serialized sector instance with semantic spatial features */
export type SectorSerialState = {
  readonly id: string;
  readonly definitionId: string;
  readonly accessState: SectorAccessState;
  readonly features: readonly SectorFeatureSerialState[];
};

/** serialized town instance */
export type TownSerialState = {
  readonly id: string;
  readonly sectorId: string;
};

/** serialized facility instance; content definition referenced by id */
export type FacilitySerialState = {
  readonly id: string;
  readonly definitionId: string;
  readonly sectorId: string;
};

/** serialized contract instance; content definition referenced by id */
export type ContractSerialState = {
  readonly id: string;
  readonly definitionId: string;
  readonly townId: string;
};

/**
 * complete serializable campaign state
 *
 * all content is referenced by id; definitions are never embedded here
 */
export type CampaignState = {
  readonly version: typeof CAMPAIGN_STATE_VERSION;
  readonly seed: number;
  rng: RngState;
  clock: ClockSerialState;
  idCounters: IdCounterStates;
  money: number;
  inventory: InventoryState;
  research: ResearchProgressState;
  sectors: Readonly<Record<string, SectorSerialState>>;
  towns: Readonly<Record<string, TownSerialState>>;
  facilities: Readonly<Record<string, FacilitySerialState>>;
  contracts: Readonly<Record<string, ContractSerialState>>;
  history: readonly HistoryEntry[];
};

/** read-only view of campaign state for use in the presentation layer */
export type ReadonlyCampaignState = Readonly<CampaignState>;

/** options for creating a new campaign */
export type CreateCampaignOptions = {
  seed: number;
  startingMoney?: number;
};

/** creates a new campaign state with empty collections and defaults */
export function createCampaignState(opts: CreateCampaignOptions): CampaignState {
  const { seed, startingMoney = 0 } = opts;
  return {
    version: CAMPAIGN_STATE_VERSION,
    seed,
    rng: { s: seed },
    clock: { tick: 0, gameTime: 0, paused: true, speed: 1 },
    idCounters: {
      sectors: 0,
      features: 0,
      towns: 0,
      facilities: 0,
      contracts: 0,
      constructionJobs: 0,
    },
    money: startingMoney,
    inventory: { quantities: {} },
    research: { completed: [], progress: {} },
    sectors: {},
    towns: {},
    facilities: {},
    contracts: {},
    history: [],
  };
}

/** serializes campaign state to a plain JSON-compatible value */
export function serializeCampaignState(state: CampaignState): unknown {
  return JSON.parse(JSON.stringify(state));
}

/**
 * restores campaign state from a plain value
 * @throws TypeError if the data is not an object or the version does not match
 */
export function deserializeCampaignState(data: unknown): CampaignState {
  if (typeof data !== "object" || data === null) {
    throw new TypeError("campaign data must be a non-null object");
  }
  const raw = data as Record<string, unknown>;
  if (raw["version"] !== CAMPAIGN_STATE_VERSION) {
    throw new TypeError(
      `unsupported campaign version: expected ${CAMPAIGN_STATE_VERSION}, got ${String(raw["version"])}`,
    );
  }
  return raw as unknown as CampaignState;
}
