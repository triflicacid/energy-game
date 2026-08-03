// serializable campaign state; no dom, canvas, callbacks, or subscriptions

import type { RngState } from "@shared";
import type { SectorAccessState } from "@content/defs";
import type { ClockSerialState } from "./SimulationClock";
import type { HistoryEntry } from "./EventHistory";

/** current format version; increment on breaking state schema changes */
export const CAMPAIGN_STATE_VERSION = 1;

/** serialized per-entity id counter values */
export type IdCounterStates = {
  readonly sectors: number;
  readonly towns: number;
  readonly sites: number;
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

/** serialized sector instance; content definition referenced by id */
export type SectorSerialState = {
  readonly id: string;
  readonly definitionId: string;
  readonly accessState: SectorAccessState;
  readonly townIds: readonly string[];
  readonly siteIds: readonly string[];
};

/** serialized town instance */
export type TownSerialState = {
  readonly id: string;
  readonly sectorId: string;
};

/** serialized site within a sector */
export type SiteSerialState = {
  readonly id: string;
  readonly sectorId: string;
  /** stable template identifier from SiteTemplateDef; used to recover spatial position */
  readonly templateId: string;
  readonly tags: readonly string[];
  readonly facilityId: string | null;
};

/** serialized facility instance; content definition referenced by id */
export type FacilitySerialState = {
  readonly id: string;
  readonly definitionId: string;
  readonly siteId: string;
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
  sites: Readonly<Record<string, SiteSerialState>>;
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
      towns: 0,
      sites: 0,
      facilities: 0,
      contracts: 0,
      constructionJobs: 0,
    },
    money: startingMoney,
    inventory: { quantities: {} },
    research: { completed: [], progress: {} },
    sectors: {},
    sites: {},
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
