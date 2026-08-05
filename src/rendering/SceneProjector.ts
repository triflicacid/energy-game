// builds the renderer-facing WorldScene from read-only campaign state and content definitions

import type { IndexedCatalog } from "@content";
import type {
  ReadonlyCampaignState,
  TownVisualTier,
} from "@simulation/CampaignState";
import { reservoirConnectionMask, reservoirSpriteId } from "./ReservoirAutotile";
import { WORLD_SPRITES, type WorldSpriteId } from "./generated/world-atlas";
import type { SceneCell, WorldScene } from "./WorldScene";

/** thrown when a required sector or definition is absent during projection */
export class SceneProjectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SceneProjectionError";
  }
}

function resolveTownSpriteId(tier: TownVisualTier | undefined): WorldSpriteId {
  if (tier === undefined) {
    return "town";
  }
  const spriteId = `town-tier-${tier}` as WorldSpriteId;
  return WORLD_SPRITES[spriteId] ? spriteId : "town";
}

/**
 * projects campaign state for one sector into a deterministic, renderer-facing WorldScene.
 * the returned scene contains no canvas pixels, atlas coordinates, or simulation mutable state.
 *
 * @param sectorId - runtime ID of the sector to project
 * @param state - read-only campaign state
 * @param catalog - indexed content definitions
 * @throws SceneProjectionError if the sector or its definition cannot be resolved
 */
export function projectSectorScene(
  sectorId: string,
  state: ReadonlyCampaignState,
  catalog: IndexedCatalog,
): WorldScene {
  const sector = state.sectors[sectorId];
  if (!sector) {
    throw new SceneProjectionError(`sector "${sectorId}" not found in campaign state`);
  }

  const sectorDef = catalog.sectors.get(sector.definitionId);
  if (!sectorDef) {
    throw new SceneProjectionError(`sector definition "${sector.definitionId}" not found in catalog`);
  }

  const { diameter } = sectorDef;

  // biome sprite ID derived from sector definition; validated against known atlas sprites
  const biomeSpriteId = `biome-${sectorDef.biome}` as WorldSpriteId;
  if (!WORLD_SPRITES[biomeSpriteId]) {
    throw new SceneProjectionError(`biome sprite "${biomeSpriteId}" not found in world atlas`);
  }

  // layer accumulators
  const biomes: SceneCell[] = [];
  const groundOverlays: SceneCell[] = [];
  const entities: SceneCell[] = [];
  const facilities: SceneCell[] = [];

  // biome background: one tile per cell, row-major
  for (let row = 0; row < diameter; row++) {
    for (let col = 0; col < diameter; col++) {
      biomes.push({ col, row, spriteId: biomeSpriteId });
    }
  }

  for (const feature of sector.features) {
    if (feature.kind === "woodland") {
      for (let row = feature.origin.row; row < feature.origin.row + feature.dimensions.height; row++) {
        for (let col = feature.origin.col; col < feature.origin.col + feature.dimensions.width; col++) {
          entities.push({ col, row, spriteId: "innate-woodland-mature-full" });
        }
      }
      continue;
    }

    if (feature.kind === "facility") {
      const facilityState = state.facilities[feature.facilityId];
      if (!facilityState || facilityState.sectorId !== sectorId) {
        console.warn(`SceneProjector: facility feature "${feature.id}" references missing facility "${feature.facilityId}" in sector "${sectorId}"`);
        continue;
      }
      const facilityDef = catalog.facilities.get(facilityState.definitionId);
      if (facilityDef?.spriteId) {
        const spriteId = facilityDef.spriteId as WorldSpriteId;
        if (WORLD_SPRITES[spriteId]) {
          facilities.push({ ...feature.origin, spriteId });
        } else {
          console.warn(`SceneProjector: facility "${facilityDef.id}" spriteId "${facilityDef.spriteId}" not found in world atlas`);
        }
      }
    }
  }

  const referencedTownIds = new Set<string>();
  for (const feature of sector.features) {
    if (feature.kind !== "town") continue;
    const town = state.towns[feature.townId];
    if (!town || town.sectorId !== sectorId) {
      console.warn(`SceneProjector: town feature "${feature.id}" references missing town "${feature.townId}" in sector "${sectorId}"`);
      continue;
    }
    referencedTownIds.add(town.id);
    entities.push({ ...feature.origin, spriteId: resolveTownSpriteId(feature.tier) });
  }
  for (const town of Object.values(state.towns)) {
    if (town.sectorId === sectorId && !referencedTownIds.has(town.id)) {
      console.warn(`SceneProjector: no town feature for town "${town.id}" in sector "${sector.definitionId}"`);
    }
  }

  for (const feature of sector.features) {
    if (feature.kind !== "reservoir") continue;
    const reservoirPositions = new Set(feature.cells.map(cell => `${cell.col},${cell.row}`));
    for (const cell of feature.cells) {
      const mask = reservoirConnectionMask((dx, dy) => {
        return reservoirPositions.has(`${cell.col + dx},${cell.row + dy}`);
      });
      groundOverlays.push({ ...cell, spriteId: reservoirSpriteId(mask) });
    }
  }

  // sort all layers for determinism — same input always produces the same output
  // regardless of Record key insertion order or collection iteration order
  const sortCells = (a: SceneCell, b: SceneCell): number => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return a.spriteId < b.spriteId ? -1 : a.spriteId > b.spriteId ? 1 : 0;
  };

  return {
    cols: diameter,
    rows: diameter,
    biomes: biomes.sort(sortCells),
    groundOverlays: groundOverlays.sort(sortCells),
    entities: entities.sort(sortCells),
    facilities: facilities.sort(sortCells),
  };
}

