// canvas map renderer; reads simulation state, must not mutate it

export {
  RESERVOIR_CONNECTION,
  reservoirConnectionMask,
  reservoirSpriteId,
  type ReservoirNeighbourLookup,
  type ReservoirSpriteId,
} from "./ReservoirAutotile";

export { AtlasLoader, type AtlasLoadState, type ImageFactory, type LoadableImage } from "./AtlasLoader";
export { WorldAtlasPainter, MISSING_SPRITE_COLOR } from "./WorldAtlasPainter";
export { CanvasRenderer, WORLD_ATLAS_URL, CELL_SIZE, MAX_ZOOM, resizeBackingBuffer } from "./CanvasRenderer";
export { type SceneCell, type WorldScene } from "./WorldScene";
export {
  projectSectorScene,
  SceneProjectionError,
  DEFAULT_TOWN_LAYOUTS,
  type TownCellLayout,
  type TownPresentationLayouts,
} from "./SceneProjector";
export {
  getMinZoom,
  clampZoom,
  clampPan,
  zoomTowardPoint,
  screenToWorld,
  worldToScreen,
  type ViewMode,
} from "./CameraState";
