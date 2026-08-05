// applies the hand-authored centre-sector fixture into campaign state

import type { IndexedCatalog } from "@content";
import type { SectorAccessState } from "@content/defs";
import type {
  CampaignState,
  CellSerialState,
  FacilityFeatureSerialState,
  FacilitySerialState,
  IdCounterStates,
  ReservoirFeatureSerialState,
  SectorFeatureSerialState,
  SectorSerialState,
  TownFeatureSerialState,
  TownSerialState,
  TownVisualTier,
  WoodlandFeatureSerialState,
} from "./CampaignState";
import initialCentreMapJson from "./fixtures/initial-centre-map.json";

/** thrown when the centre map fixture is structurally or semantically invalid */
export class CentreSectorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CentreSectorError";
  }
}

/** validated data required to create the hand authored centre sector */
export type CentreMapFixture = {
  readonly idCounters: Pick<IdCounterStates, "sectors" | "features" | "towns" | "facilities">;
  readonly sectors: Readonly<Record<string, SectorSerialState>>;
  readonly towns: Readonly<Record<string, TownSerialState>>;
  readonly facilities: Readonly<Record<string, FacilitySerialState>>;
};

const ACCESS_STATES: ReadonlySet<string> = new Set<SectorAccessState>([
  "unknown", "frontier", "explored", "surveyed", "unlocked", "buildable",
]);

function fail(path: string, message: string): never {
  throw new CentreSectorError(`${path} ${message}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    return fail(`${path}.${key}`, "must be a non empty string");
  }
  return value;
}

function readInteger(record: Record<string, unknown>, key: string, path: string, positive = false): number {
  const value = record[key];
  if (!Number.isInteger(value) || typeof value !== "number" || value < (positive ? 1 : 0)) {
    return fail(`${path}.${key}`, positive ? "must be a positive integer" : "must be a nonnegative integer");
  }
  return value;
}

function readCell(value: unknown, path: string): CellSerialState {
  const cell = asRecord(value, path);
  return {
    col: readInteger(cell, "col", path),
    row: readInteger(cell, "row", path),
  };
}

function assertCellInBounds(cell: CellSerialState, diameter: number, path: string): void {
  if (cell.col >= diameter || cell.row >= diameter) {
    fail(path, `must be within the ${diameter} by ${diameter} sector grid`);
  }
}

function parseFacilities(value: unknown): Record<string, FacilitySerialState> {
  const rawFacilities = asRecord(value, "facilities");
  const facilities: Record<string, FacilitySerialState> = {};
  for (const [key, valueAtKey] of Object.entries(rawFacilities)) {
    const path = `facilities.${key}`;
    const raw = asRecord(valueAtKey, path);
    const id = readString(raw, "id", path);
    if (id !== key) fail(`${path}.id`, "must match its record key");
    facilities[key] = {
      id,
      sectorId: readString(raw, "sectorId", path),
      definitionId: readString(raw, "definitionId", path),
    };
  }
  return facilities;
}

function parseTowns(value: unknown): Record<string, TownSerialState> {
  const rawTowns = asRecord(value, "towns");
  const towns: Record<string, TownSerialState> = {};
  for (const [key, valueAtKey] of Object.entries(rawTowns)) {
    const path = `towns.${key}`;
    const raw = asRecord(valueAtKey, path);
    const id = readString(raw, "id", path);
    if (id !== key) fail(`${path}.id`, "must match its record key");
    towns[key] = { id, sectorId: readString(raw, "sectorId", path) };
  }
  return towns;
}

function parseFeature(
  value: unknown,
  path: string,
  diameter: number,
): SectorFeatureSerialState {
  const raw = asRecord(value, path);
  const id = readString(raw, "id", path);
  const kind = readString(raw, "kind", path);

  if (kind === "woodland" || kind === "facility") {
    const origin = readCell(raw["origin"], `${path}.origin`);
    const dimensionsRaw = asRecord(raw["dimensions"], `${path}.dimensions`);
    const dimensions = {
      width: readInteger(dimensionsRaw, "width", `${path}.dimensions`, true),
      height: readInteger(dimensionsRaw, "height", `${path}.dimensions`, true),
    };
    assertCellInBounds(origin, diameter, `${path}.origin`);
    if (origin.col + dimensions.width > diameter || origin.row + dimensions.height > diameter) {
      fail(`${path}.dimensions`, "must keep the complete footprint within the sector grid");
    }
    if (kind === "woodland") {
      return { id, kind, origin, dimensions } satisfies WoodlandFeatureSerialState;
    }
    return {
      id,
      kind,
      facilityId: readString(raw, "facilityId", path),
      origin,
      dimensions,
    } satisfies FacilityFeatureSerialState;
  }

  if (kind === "town") {
    const origin = readCell(raw["origin"], `${path}.origin`);
    assertCellInBounds(origin, diameter, `${path}.origin`);
    const tierValue = raw["tier"];
    let tier: TownVisualTier | undefined;
    if (tierValue !== undefined) {
      if (!Number.isInteger(tierValue) || typeof tierValue !== "number" || tierValue < 1 || tierValue > 6) {
        fail(`${path}.tier`, "must be an integer from 1 through 6");
      }
      tier = tierValue as TownVisualTier;
    }
    return { id, kind, townId: readString(raw, "townId", path), origin, tier } satisfies TownFeatureSerialState;
  }

  if (kind === "reservoir") {
    if (!Array.isArray(raw["cells"]) || raw["cells"].length === 0) {
      fail(`${path}.cells`, "must be a non empty array");
    }
    const seen = new Set<string>();
    const cells = raw["cells"].map((cellValue, index) => {
      const cellPath = `${path}.cells[${index}]`;
      const cell = readCell(cellValue, cellPath);
      assertCellInBounds(cell, diameter, cellPath);
      const key = `${cell.col},${cell.row}`;
      if (seen.has(key)) fail(cellPath, "duplicates another cell in this reservoir");
      seen.add(key);
      return cell;
    });
    return { id, kind, cells } satisfies ReservoirFeatureSerialState;
  }

  return fail(`${path}.kind`, `has unsupported value "${kind}"`);
}

function featureCells(feature: SectorFeatureSerialState): readonly CellSerialState[] {
  if (feature.kind === "reservoir") return feature.cells;
  if (feature.kind === "town") return [feature.origin];
  const cells: CellSerialState[] = [];
  for (let row = feature.origin.row; row < feature.origin.row + feature.dimensions.height; row++) {
    for (let col = feature.origin.col; col < feature.origin.col + feature.dimensions.width; col++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

function numericId(id: string, prefix: string, path: string): number {
  const match = new RegExp(`^${prefix}:(\\d+)$`).exec(id);
  if (!match?.[1]) return fail(path, `must use the form ${prefix}:number`);
  return Number(match[1]);
}

/** validates unknown centre map data against campaign and content invariants */
export function validateCentreMap(value: unknown, catalog: IndexedCatalog): CentreMapFixture {
  const root = asRecord(value, "centre map");
  const towns = parseTowns(root["towns"]);
  const facilities = parseFacilities(root["facilities"]);
  const rawSectors = asRecord(root["sectors"], "sectors");
  const sectors: Record<string, SectorSerialState> = {};
  const featureIds = new Set<string>();
  const townReferences = new Map<string, number>();
  const facilityReferences = new Map<string, number>();

  for (const [key, valueAtKey] of Object.entries(rawSectors)) {
    const path = `sectors.${key}`;
    const raw = asRecord(valueAtKey, path);
    const id = readString(raw, "id", path);
    if (id !== key) fail(`${path}.id`, "must match its record key");
    const definitionId = readString(raw, "definitionId", path);
    const definition = catalog.sectors.get(definitionId);
    if (!definition) fail(`${path}.definitionId`, `references unknown sector definition "${definitionId}"`);
    const accessStateValue = readString(raw, "accessState", path);
    if (!ACCESS_STATES.has(accessStateValue)) fail(`${path}.accessState`, "is not a valid sector access state");
    if (!Array.isArray(raw["features"])) fail(`${path}.features`, "must be an array");
    const occupied = new Set<string>();
    const features = raw["features"].map((featureValue, index) => {
      const featurePath = `${path}.features[${index}]`;
      const feature = parseFeature(featureValue, featurePath, definition.diameter);
      if (featureIds.has(feature.id)) fail(`${featurePath}.id`, `duplicates feature id "${feature.id}"`);
      featureIds.add(feature.id);
      for (const cell of featureCells(feature)) {
        const cellKey = `${cell.col},${cell.row}`;
        if (occupied.has(cellKey)) fail(featurePath, `overlaps another feature at cell ${cellKey}`);
        occupied.add(cellKey);
      }
      if (feature.kind === "facility") {
        const facility = facilities[feature.facilityId];
        if (!facility) fail(`${featurePath}.facilityId`, `references unknown facility "${feature.facilityId}"`);
        if (facility.sectorId !== id) fail(`${featurePath}.facilityId`, `references a facility in sector "${facility.sectorId}"`);
        facilityReferences.set(facility.id, (facilityReferences.get(facility.id) ?? 0) + 1);
      } else if (feature.kind === "town") {
        const town = towns[feature.townId];
        if (!town) fail(`${featurePath}.townId`, `references unknown town "${feature.townId}"`);
        if (town.sectorId !== id) fail(`${featurePath}.townId`, `references a town in sector "${town.sectorId}"`);
        townReferences.set(town.id, (townReferences.get(town.id) ?? 0) + 1);
      }
      return feature;
    });
    sectors[key] = { id, definitionId, accessState: accessStateValue as SectorAccessState, features };
  }

  for (const town of Object.values(towns)) {
    if (!sectors[town.sectorId]) fail(`towns.${town.id}.sectorId`, `references unknown sector "${town.sectorId}"`);
    if (townReferences.get(town.id) !== 1) fail(`towns.${town.id}`, "must be referenced by exactly one town feature");
  }
  for (const facility of Object.values(facilities)) {
    if (!sectors[facility.sectorId]) fail(`facilities.${facility.id}.sectorId`, `references unknown sector "${facility.sectorId}"`);
    if (!catalog.facilities.has(facility.definitionId)) {
      fail(`facilities.${facility.id}.definitionId`, `references unknown facility definition "${facility.definitionId}"`);
    }
    if (facilityReferences.get(facility.id) !== 1) {
      fail(`facilities.${facility.id}`, "must be referenced by exactly one facility feature");
    }
  }

  const rawCounters = asRecord(root["idCounters"], "idCounters");
  const idCounters = {
    sectors: readInteger(rawCounters, "sectors", "idCounters"),
    features: readInteger(rawCounters, "features", "idCounters"),
    towns: readInteger(rawCounters, "towns", "idCounters"),
    facilities: readInteger(rawCounters, "facilities", "idCounters"),
  };
  const maximums = {
    sectors: Math.max(0, ...Object.keys(sectors).map(id => numericId(id, "sector", `sectors.${id}.id`))),
    features: Math.max(0, ...Array.from(featureIds, id => numericId(id, "feature", `feature ${id}`))),
    towns: Math.max(0, ...Object.keys(towns).map(id => numericId(id, "town", `towns.${id}.id`))),
    facilities: Math.max(0, ...Object.keys(facilities).map(id => numericId(id, "facility", `facilities.${id}.id`))),
  };
  for (const key of Object.keys(maximums) as (keyof typeof maximums)[]) {
    if (idCounters[key] < maximums[key]) fail(`idCounters.${key}`, `must be at least ${maximums[key]}`);
  }

  return { idCounters, sectors, towns, facilities };
}

/** validates and applies the static centre sector fixture to campaign state */
export function createCentreSector(state: CampaignState, catalog: IndexedCatalog): void {
  const initialCentreMap = validateCentreMap(initialCentreMapJson, catalog);
  state.sectors = structuredClone(initialCentreMap.sectors);
  state.towns = structuredClone(initialCentreMap.towns);
  state.facilities = structuredClone(initialCentreMap.facilities);
  state.idCounters = {
    ...state.idCounters,
    sectors: initialCentreMap.idCounters.sectors,
    features: initialCentreMap.idCounters.features,
    towns: initialCentreMap.idCounters.towns,
    facilities: initialCentreMap.idCounters.facilities,
  };
}

