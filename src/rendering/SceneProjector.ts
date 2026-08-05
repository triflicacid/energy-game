// builds the renderer-facing WorldScene from read-only campaign state and content definitions

import type { IndexedCatalog } from "@content";
import type { ReadonlyCampaignState } from "@simulation/CampaignState";
import { reservoirConnectionMask, reservoirSpriteId } from "./ReservoirAutotile";
import { WORLD_SPRITES, type WorldSpriteId } from "./generated/world-atlas";
import type { SceneCell, WorldScene } from "./WorldScene";

/** base grid position shared by all presentation cell layout types */
export interface CellLayout {
  readonly col: number;
  readonly row: number;
}

/** maps a sector definition ID to the ordered cell positions of its towns */
export type TownPresentationLayouts = ReadonlyMap<string, readonly CellLayout[]>;

/**
 * default town presentation layouts for all hand-authored sectors.
 * towns have no spatial coordinates in simulation state; this map supplies
 * deterministic grid positions for each sector's towns.
 */
export const DEFAULT_TOWN_LAYOUTS: TownPresentationLayouts = new Map([
  ["centre", [{ col: 6, row: 6 }]],
]);

/**
 * one reservoir water cell in the presentation layer.
 * cells sharing the same joinGroup join visually (their autotile mask connects them);
 * cells in different joinGroups never connect even when adjacent on the grid.
 */
export interface ReservoirCellLayout extends CellLayout {
  /** opaque string key; cells with identical joinGroup form one visual body */
  readonly joinGroup: string;
}

/** maps a sector definition ID to the reservoir cells that should be rendered */
export type ReservoirPresentationLayouts = ReadonlyMap<string, readonly ReservoirCellLayout[]>;

/**
 * deterministic reservoir presentation fixtures for hand-authored sectors.
 * water extent has no simulation state yet; this supplies the rendering fixture
 * until T01 water systems are implemented.
 *
 * centre-sector layout: 2×2 reservoir (cols 9–10, rows 4–5) + one cell at (10, 6).
 * the cell at (9, 5) is directly east of the waterwheel at (8, 5), satisfying adjacency.
 */
export const DEFAULT_RESERVOIR_LAYOUTS: ReservoirPresentationLayouts = new Map([
  [
    "centre",
    [
      { col: 9, row: 4, joinGroup: "res-1" },
      { col: 10, row: 4, joinGroup: "res-1" },
      { col: 9, row: 5, joinGroup: "res-1" },
      { col: 10, row: 5, joinGroup: "res-1" },
      { col: 10, row: 6, joinGroup: "res-1" },
    ],
  ],
]);

/** thrown when a required sector or definition is absent during projection */
export class SceneProjectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SceneProjectionError";
  }
}

/**
 * projects campaign state for one sector into a deterministic, renderer-facing WorldScene.
 * the returned scene contains no canvas pixels, atlas coordinates, or simulation mutable state.
 *
 * @param sectorId - runtime ID of the sector to project
 * @param state - read-only campaign state
 * @param catalog - indexed content definitions
 * @param townLayouts - deterministic town cell positions keyed by sector definition ID
 * @param reservoirLayouts - deterministic reservoir cell fixtures keyed by sector definition ID
 * @throws SceneProjectionError if the sector or its definition cannot be resolved
 */
export function projectSectorScene(
  sectorId: string,
  state: ReadonlyCampaignState,
  catalog: IndexedCatalog,
  townLayouts: TownPresentationLayouts = DEFAULT_TOWN_LAYOUTS,
  reservoirLayouts: ReservoirPresentationLayouts = DEFAULT_RESERVOIR_LAYOUTS,
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
  const half = Math.floor(diameter / 2);

  // build templateId → SiteTemplateDef lookup for O(1) access
  const templateByTemplateId = new Map(sectorDef.siteTemplates.map(t => [t.templateId, t]));

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

  // site overlays and facilities
  for (const siteId of sector.siteIds) {
    const site = state.sites[siteId];
    if (!site) continue;

    const template = templateByTemplateId.get(site.templateId);
    if (!template) {
      // dev warning: site has no matching template; skip without crashing
      console.warn(`SceneProjector: site "${siteId}" templateId "${site.templateId}" not found in sector "${sector.definitionId}"`);
      continue;
    }

    const col = template.x + half;
    const row = template.y + half;

    // forest is a persistent physical resource — draw its overlay when the site has the forest tag
    if (site.tags.includes("forest")) {
      entities.push({ col, row, spriteId: "forest-site" });
    }
    // waterwheel-site and general-site suitability produce no sprite; art appears only when built

    // facility sprite: emitted only when an instance exists at this site
    if (site.facilityId !== null) {
      const facilityState = state.facilities[site.facilityId];
      if (facilityState) {
        const facilityDef = catalog.facilities.get(facilityState.definitionId);
        if (facilityDef?.spriteId) {
          const spriteId = facilityDef.spriteId as WorldSpriteId;
          if (WORLD_SPRITES[spriteId]) {
            facilities.push({ col, row, spriteId });
          } else {
            console.warn(`SceneProjector: facility "${facilityDef.id}" spriteId "${facilityDef.spriteId}" not found in world atlas`);
          }
        }
      }
    }
  }

  // towns: placed at deterministic layout positions independent of simulation coordinates
  const townCells = townLayouts.get(sector.definitionId) ?? [];
  for (let i = 0; i < sector.townIds.length; i++) {
    const cell = townCells[i];
    if (!cell) {
      console.warn(`SceneProjector: no layout cell for town index ${i} in sector "${sector.definitionId}"`);
      continue;
    }
    entities.push({ col: cell.col, row: cell.row, spriteId: "town" });
  }

  // reservoir autotile: build a position→joinGroup lookup for O(1) neighbour queries
  const reservoirCells = reservoirLayouts.get(sector.definitionId) ?? [];
  const reservoirByPos = new Map(reservoirCells.map(c => [`${c.col},${c.row}`, c.joinGroup]));
  for (const cell of reservoirCells) {
    const mask = reservoirConnectionMask((dx, dy) => {
      return reservoirByPos.get(`${cell.col + dx},${cell.row + dy}`) === cell.joinGroup;
    });
    groundOverlays.push({ col: cell.col, row: cell.row, spriteId: reservoirSpriteId(mask) });
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

