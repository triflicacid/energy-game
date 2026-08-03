export const RESERVOIR_CONNECTION = {
  NORTH: 0x1,
  EAST: 0x2,
  SOUTH: 0x4,
  WEST: 0x8,
} as const;

const RESERVOIR_SPRITE_IDS = [
  "reservoir-water-00",
  "reservoir-water-01",
  "reservoir-water-02",
  "reservoir-water-03",
  "reservoir-water-04",
  "reservoir-water-05",
  "reservoir-water-06",
  "reservoir-water-07",
  "reservoir-water-08",
  "reservoir-water-09",
  "reservoir-water-0a",
  "reservoir-water-0b",
  "reservoir-water-0c",
  "reservoir-water-0d",
  "reservoir-water-0e",
  "reservoir-water-0f",
] as const;

export type ReservoirSpriteId = (typeof RESERVOIR_SPRITE_IDS)[number];
export type ReservoirNeighbourLookup = (deltaX: number, deltaY: number) => boolean;

/** Returns the cardinal N=1, E=2, S=4, W=8 connection mask for one reservoir cell. */
export function reservoirConnectionMask(isConnected: ReservoirNeighbourLookup): number {
  let mask = 0;
  if (isConnected(0, -1)) mask |= RESERVOIR_CONNECTION.NORTH;
  if (isConnected(1, 0)) mask |= RESERVOIR_CONNECTION.EAST;
  if (isConnected(0, 1)) mask |= RESERVOIR_CONNECTION.SOUTH;
  if (isConnected(-1, 0)) mask |= RESERVOIR_CONNECTION.WEST;
  return mask;
}

/** Resolves a validated cardinal connection mask to its generated atlas sprite ID. */
export function reservoirSpriteId(mask: number): ReservoirSpriteId {
  if (!Number.isInteger(mask) || mask < 0 || mask >= RESERVOIR_SPRITE_IDS.length) {
    throw new RangeError(`invalid reservoir connection mask: ${mask}`);
  }
  return RESERVOIR_SPRITE_IDS[mask];
}

