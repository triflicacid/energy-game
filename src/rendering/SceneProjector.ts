// builds the renderer-facing WorldScene from read-only campaign state and content definitions

import type { IndexedCatalog } from "@content";
import type {
  ReadonlyCampaignState,
  ReservoirPresentationCellSerialState,
  TownPresentationCellSerialState,
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

function isTownPresentationCell(cell: { readonly kind: string }): cell is TownPresentationCellSerialState {
  return cell.kind === "town";
}

function isReservoirPresentationCell(cell: { readonly kind: string }): cell is ReservoirPresentationCellSerialState {
  return cell.kind === "reservoir";
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

  // site overlays and facilities are derived from top-level site state by sectorId
  const sectorSites = Object.values(state.sites)
    .filter(site => site.sectorId === sectorId)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const site of sectorSites) {

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

  // towns: placement/tier come from sector-owned presentation state
  const townCells = sector.presentationCells.filter(isTownPresentationCell);
  const townCellByTownId = new Map(townCells.map(cell => [cell.townId, cell]));
  const sectorTownIds = Object.values(state.towns)
    .filter(town => town.sectorId === sectorId)
    .map(town => town.id)
    .sort((a, b) => a.localeCompare(b));
  for (const townId of sectorTownIds) {
    const cell = townCellByTownId.get(townId);
    if (!cell) {
      console.warn(`SceneProjector: no town presentation cell for town "${townId}" in sector "${sector.definitionId}"`);
      continue;
    }
    entities.push({ col: cell.col, row: cell.row, spriteId: resolveTownSpriteId(cell.tier) });
  }

  // reservoir autotile: connect any cardinally adjacent reservoir cells
  const reservoirCells = sector.presentationCells.filter(isReservoirPresentationCell);
  const reservoirPositions = new Set(reservoirCells.map(c => `${c.col},${c.row}`));
  for (const cell of reservoirCells) {
    const mask = reservoirConnectionMask((dx, dy) => {
      return reservoirPositions.has(`${cell.col + dx},${cell.row + dy}`);
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

