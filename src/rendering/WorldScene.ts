// renderer-facing immutable scene model; no canvas, atlas, camera, or simulation state

import type { WorldSpriteId } from "./generated/world-atlas";

/**
 * a single draw command in the world scene.
 * col and row are logical grid cell coordinates, 0-indexed from the sector's top-left.
 */
export type SceneCell = {
  readonly col: number;
  readonly row: number;
  readonly spriteId: WorldSpriteId;
};

/**
 * layered world render scene for one sector.
 * arrays are in deterministic sorted order and ready for the renderer to iterate in sequence.
 * draw order within each layer: row asc, col asc, spriteId asc.
 */
export type WorldScene = {
  /** grid width in cells */
  readonly cols: number;
  /** grid height in cells */
  readonly rows: number;
  /** opaque biome background tiles — one entry per grid cell */
  readonly biomes: readonly SceneCell[];
  /** transparent ground-level overlays: reservoir water, ground features */
  readonly groundOverlays: readonly SceneCell[];
  /** persistent resources and town entities: standing forests, towns */
  readonly entities: readonly SceneCell[];
  /** constructed facilities */
  readonly facilities: readonly SceneCell[];
};

