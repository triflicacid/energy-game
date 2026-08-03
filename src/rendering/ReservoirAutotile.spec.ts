import { describe, expect, it } from "vitest";
import { WORLD_SPRITES } from "./generated/world-atlas";
import {
  RESERVOIR_CONNECTION,
  reservoirConnectionMask,
  reservoirSpriteId,
  type ReservoirNeighbourLookup,
} from "./ReservoirAutotile";

type Offset = readonly [number, number];

function connectedAt(...offsets: readonly Offset[]): ReservoirNeighbourLookup {
  return (deltaX, deltaY) => offsets.some(([x, y]) => x === deltaX && y === deltaY);
}

describe("reservoirConnectionMask", () => {
  const { NORTH, EAST, SOUTH, WEST } = RESERVOIR_CONNECTION;

  it.each([
    ["isolated", [], 0x0],
    ["north endpoint", [[0, -1]], NORTH],
    ["east endpoint", [[1, 0]], EAST],
    ["south endpoint", [[0, 1]], SOUTH],
    ["west endpoint", [[-1, 0]], WEST],
    ["vertical", [[0, -1], [0, 1]], NORTH | SOUTH],
    ["horizontal", [[-1, 0], [1, 0]], EAST | WEST],
    ["north-east corner", [[0, -1], [1, 0]], NORTH | EAST],
    ["south-east corner", [[1, 0], [0, 1]], EAST | SOUTH],
    ["south-west corner", [[0, 1], [-1, 0]], SOUTH | WEST],
    ["north-west corner", [[-1, 0], [0, -1]], NORTH | WEST],
    ["T open west", [[0, -1], [1, 0], [0, 1]], NORTH | EAST | SOUTH],
    ["T open south", [[-1, 0], [0, -1], [1, 0]], NORTH | EAST | WEST],
    ["T open east", [[0, 1], [-1, 0], [0, -1]], NORTH | SOUTH | WEST],
    ["T open north", [[1, 0], [0, 1], [-1, 0]], EAST | SOUTH | WEST],
    ["surrounded", [[0, -1], [1, 0], [0, 1], [-1, 0]], 0xf],
  ] as const)("returns the %s mask", (_name, offsets, expected) => {
    expect(reservoirConnectionMask(connectedAt(...offsets))).toBe(expected);
  });

  it("ignores diagonal-only neighbours", () => {
    expect(reservoirConnectionMask(connectedAt([-1, -1], [1, -1], [1, 1], [-1, 1]))).toBe(0);
  });
});

describe("reservoirSpriteId", () => {
  it("maps all 16 masks to lowercase two-digit hexadecimal IDs", () => {
    for (let mask = 0; mask <= 0xf; mask += 1) {
      const id = reservoirSpriteId(mask);
      expect(id).toBe(`reservoir-water-${mask.toString(16).padStart(2, "0")}`);
      expect(WORLD_SPRITES[id]).toBeDefined();
    }
  });

  it.each([-1, 16, 1.5, Number.NaN])("rejects invalid mask %s", (mask) => {
    expect(() => reservoirSpriteId(mask)).toThrow(RangeError);
  });
});


