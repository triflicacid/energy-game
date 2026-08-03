// pure camera transform functions for the world sector and campaign map views; no DOM or canvas

/** maximum allowed zoom level in sector detail view */
export const MAX_ZOOM = 10;

/** view mode: sector detail grid or campaign map hex overview */
export type ViewMode = "sector" | "campaign";

/**
 * returns the minimum zoom level that fits the entire sector within the viewport without clipping.
 * returns 1 as a safe fallback when either the viewport or sector dimensions are zero.
 * @param viewportW logical CSS pixel width of the viewport
 * @param viewportH logical CSS pixel height of the viewport
 * @param sectorCols number of tile columns in the sector
 * @param sectorRows number of tile rows in the sector
 * @param cellSize logical CSS pixel size of one tile
 */
export function getMinZoom(
  viewportW: number,
  viewportH: number,
  sectorCols: number,
  sectorRows: number,
  cellSize: number,
): number {
  if (viewportW <= 0 || viewportH <= 0 || sectorCols <= 0 || sectorRows <= 0) return 1;
  const sectorW = sectorCols * cellSize;
  const sectorH = sectorRows * cellSize;
  return Math.min(viewportW / sectorW, viewportH / sectorH);
}

/**
 * clamps zoom to [minZoom, MAX_ZOOM].
 * @param zoom candidate zoom value
 * @param minZoom lower bound, typically from getMinZoom
 */
export function clampZoom(zoom: number, minZoom: number): number {
  return Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
}

/**
 * clamps pan so the visible world area stays within the sector grid boundaries.
 * when the viewport is larger than the sector at the current zoom, the sector is
 * centered in the viewport; pan values may be negative in this case.
 * @param panX candidate horizontal pan (world CSS pixels at viewport left edge)
 * @param panY candidate vertical pan (world CSS pixels at viewport top edge)
 * @param zoom current zoom level
 * @param viewportW logical CSS pixel width of the viewport
 * @param viewportH logical CSS pixel height of the viewport
 * @param sectorCols number of tile columns in the sector
 * @param sectorRows number of tile rows in the sector
 * @param cellSize logical CSS pixel size of one tile
 */
export function clampPan(
  panX: number,
  panY: number,
  zoom: number,
  viewportW: number,
  viewportH: number,
  sectorCols: number,
  sectorRows: number,
  cellSize: number,
): { panX: number; panY: number } {
  const sectorW = sectorCols * cellSize;
  const sectorH = sectorRows * cellSize;
  const visibleW = viewportW / zoom;
  const visibleH = viewportH / zoom;
  // when the sector is smaller than the viewport in a given axis, center it (fixed negative offset);
  // when it is larger, bound pan from 0 to the scrollable extent
  const clampAxis = (pan: number, sectorSize: number, visible: number): number => {
    if (sectorSize < visible) return -(visible - sectorSize) / 2;
    return Math.max(0, Math.min(pan, sectorSize - visible));
  };
  return {
    panX: clampAxis(panX, sectorW, visibleW),
    panY: clampAxis(panY, sectorH, visibleH),
  };
}

/**
 * calculates the new panX/panY after a zoom so that the given screen point maps to the same
 * world position before and after the zoom change.
 * @param panX current horizontal pan
 * @param panY current vertical pan
 * @param oldZoom zoom level before the change
 * @param screenX CSS pixel x of the pivot point (relative to canvas top-left)
 * @param screenY CSS pixel y of the pivot point (relative to canvas top-left)
 * @param newZoom zoom level after the change
 */
export function zoomTowardPoint(
  panX: number,
  panY: number,
  oldZoom: number,
  screenX: number,
  screenY: number,
  newZoom: number,
): { panX: number; panY: number } {
  const worldX = screenX / oldZoom + panX;
  const worldY = screenY / oldZoom + panY;
  return {
    panX: worldX - screenX / newZoom,
    panY: worldY - screenY / newZoom,
  };
}

/**
 * converts a screen-space point (logical CSS pixels, relative to canvas top-left) to the
 * corresponding world-space position.
 * @param screenX CSS pixel x relative to canvas left
 * @param screenY CSS pixel y relative to canvas top
 * @param panX current horizontal pan (world CSS pixels at viewport left edge)
 * @param panY current vertical pan (world CSS pixels at viewport top edge)
 * @param zoom current zoom level
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return { x: screenX / zoom + panX, y: screenY / zoom + panY };
}

/**
 * converts a world-space position to a screen-space point (logical CSS pixels, relative to
 * the canvas top-left).
 * @param worldX world-space x coordinate
 * @param worldY world-space y coordinate
 * @param panX current horizontal pan
 * @param panY current vertical pan
 * @param zoom current zoom level
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return { x: (worldX - panX) * zoom, y: (worldY - panY) * zoom };
}




