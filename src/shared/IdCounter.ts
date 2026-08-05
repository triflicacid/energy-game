import type { Brand } from "./brand";

// runtime entity identifiers
// these are assigned at campaign runtime, not derived from content definitions

/** unique runtime identifier for a sector */
export type SectorId = Brand<string, "SectorId">;

/** unique runtime identifier for a town */
export type TownId = Brand<string, "TownId">;

/** unique runtime identifier for a facility instance */
export type FacilityId = Brand<string, "FacilityId">;

/** unique runtime identifier for a contract */
export type ContractId = Brand<string, "ContractId">;

/** unique runtime identifier for a construction job */
export type ConstructionJobId = Brand<string, "ConstructionJobId">;

/** stable identifier for a content-defined resource, sourced from ResourceDef.id */
export type ResourceId = Brand<string, "ResourceId">;

/** stable identifier for a content-defined biome, sourced from BiomeDef or sector fixture data */
export type BiomeId = Brand<string, "BiomeId">;

/** counter-based runtime ID generator; state is serializable for save and load */
export class IdCounter {
  private count: number;

  public constructor(initial = 0) {
    this.count = initial;
  }

  /** increments the counter and returns the new value */
  public next(): number {
    return ++this.count;
  }

  /** returns the current count without incrementing */
  public peek(): number {
    return this.count;
  }

  /** sets the counter to value; use when restoring from a saved campaign */
  public restore(value: number): void {
    this.count = value;
  }
}

/** creates a new SectorId using counter */
export function makeSectorId(counter: IdCounter): SectorId {
  return `sector:${counter.next()}` as SectorId;
}

/** creates a new TownId using counter */
export function makeTownId(counter: IdCounter): TownId {
  return `town:${counter.next()}` as TownId;
}


/** creates a new FacilityId using counter */
export function makeFacilityId(counter: IdCounter): FacilityId {
  return `facility:${counter.next()}` as FacilityId;
}

/** creates a new ContractId using counter */
export function makeContractId(counter: IdCounter): ContractId {
  return `contract:${counter.next()}` as ContractId;
}

/** creates a new ConstructionJobId using counter */
export function makeConstructionJobId(counter: IdCounter): ConstructionJobId {
  return `job:${counter.next()}` as ConstructionJobId;
}

/** wraps a validated content string as a ResourceId */
export function makeResourceId(id: string): ResourceId {
  return id as ResourceId;
}

/** wraps a validated content string as a BiomeId */
export function makeBiomeId(id: string): BiomeId {
  return id as BiomeId;
}

