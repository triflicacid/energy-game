// resolves world sprite IDs to atlas source rectangles and draws them onto a canvas context

import { WORLD_SPRITES, type WorldSpriteId } from "./generated/world-atlas";
import type { LoadableImage } from "./AtlasLoader";

/** magenta drawn when a sprite cannot be resolved or the atlas is unavailable */
export const MISSING_SPRITE_COLOR = "#ff00ff";

/**
 * draws world atlas sprites onto a CanvasRenderingContext2D.
 * callers identify sprites by WorldSpriteId; atlas coordinates are resolved internally.
 * image smoothing is disabled before every draw to preserve pixel-art crispness.
 *
 * anchor convention: anchorX/anchorY are subtracted from destX/destY so that a sprite
 * whose visual content extends above its cell top is positioned correctly.
 * for the waterwheel (anchorY=16), drawY = destY - 16 places the top 16px of the sprite
 * above the cell, and the remaining 64px within it.
 */
export class WorldAtlasPainter {
  /**
   * draws a single sprite onto ctx.
   * destX and destY are the logical CSS pixel coordinates of the cell top-left.
   * @param ctx the 2d rendering context
   * @param atlas the loaded atlas image
   * @param id the sprite to draw
   * @param destX logical x of the cell top-left
   * @param destY logical y of the cell top-left
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    atlas: LoadableImage,
    id: WorldSpriteId,
    destX: number,
    destY: number,
  ): void {
    ctx.imageSmoothingEnabled = false;
    const desc = WORLD_SPRITES[id];
    const dx = Math.round(destX - desc.anchorX);
    const dy = Math.round(destY - desc.anchorY);
    ctx.drawImage(
      atlas as unknown as CanvasImageSource,
      desc.x, desc.y, desc.w, desc.h,
      dx, dy, desc.w, desc.h,
    );
  }

  /**
   * draws a magenta fallback rectangle at the cell position.
   * called when the atlas has failed to load or a sprite ID cannot be resolved at runtime.
   * @param ctx the 2d rendering context
   * @param destX logical x of the cell top-left
   * @param destY logical y of the cell top-left
   * @param cellSize logical pixels per cell
   */
  public drawFallback(
    ctx: CanvasRenderingContext2D,
    destX: number,
    destY: number,
    cellSize: number,
  ): void {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = MISSING_SPRITE_COLOR;
    ctx.fillRect(Math.round(destX), Math.round(destY), cellSize, cellSize);
  }
}

