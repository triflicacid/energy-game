// canvas renderer: loads the world atlas, manages dpr-aware resizing, and draws the sector view

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";
import { AtlasLoader } from "./AtlasLoader";
import type { LoadableImage } from "./AtlasLoader";
import { WorldAtlasPainter } from "./WorldAtlasPainter";
import { projectSectorScene } from "./SceneProjector";
import type { WorldScene } from "./WorldScene";

/** public URL of the world atlas PNG, served from the static/ directory by Vite */
export const WORLD_ATLAS_URL = "./world-atlas.png";

/** logical CSS pixel size of one world cell */
export const CELL_SIZE = 64;

/**
 * updates the canvas backing buffer to match current logical dimensions scaled by dpr.
 * returns the new logical dimensions if the size or dpr changed, null if unchanged.
 * exported for testing.
 * @param canvas the canvas element to resize
 * @param ctx the rendering context to re-transform after resize
 * @param prevLogicalW previously stored logical width
 * @param prevLogicalH previously stored logical height
 * @param prevDpr previously stored device pixel ratio
 * @param dpr current device pixel ratio
 */
export function resizeBackingBuffer(
  canvas: { width: number; height: number; readonly clientWidth: number; readonly clientHeight: number },
  ctx: { setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void },
  prevLogicalW: number,
  prevLogicalH: number,
  prevDpr: number,
  dpr: number,
): { logicalW: number; logicalH: number } | null {
  const logicalW = canvas.clientWidth || canvas.width;
  const logicalH = canvas.clientHeight || canvas.height;
  if (logicalW === prevLogicalW && logicalH === prevLogicalH && dpr === prevDpr) return null;
  canvas.width = Math.round(logicalW * dpr);
  canvas.height = Math.round(logicalH * dpr);
  // resizing the canvas resets the 2d context state; reapply the dpr transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { logicalW, logicalH };
}

/**
 * canvas renderer for the world sector view.
 * loads the world atlas once, responds to simulation ticks and atlas/size changes,
 * and draws sprites via WorldAtlasPainter.
 * layered scene composition replaces the placeholder drawing in U01c.
 */
export class CanvasRenderer implements Disposable {
  private readonly app: Application;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlasLoader: AtlasLoader;
  private readonly painter: WorldAtlasPainter;
  private readonly unsubscribeTick: () => void;
  private readonly unsubscribeAtlas: () => void;
  private resizeObserver: ResizeObserver | null = null;
  private logicalW = 0;
  private logicalH = 0;
  private dpr = 1;

  public constructor(app: Application, atlasLoader?: AtlasLoader) {
    this.app = app;
    const ctx = app.getCanvasEl().getContext("2d");
    if (!ctx) throw new Error("could not acquire 2d rendering context");
    this.ctx = ctx;
    this.painter = new WorldAtlasPainter();
    this.atlasLoader = atlasLoader ?? new AtlasLoader(WORLD_ATLAS_URL);

    this.unsubscribeAtlas = this.atlasLoader.onStateChange(() => {
      this.render();
    });

    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      this.render();
    });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => { this.render(); });
      this.resizeObserver.observe(app.getCanvasEl());
    }

    this.render();
  }

  /** releases the tick subscription, atlas callback, and resize observer */
  public dispose(): void {
    this.unsubscribeTick();
    this.unsubscribeAtlas();
    this.resizeObserver?.disconnect();
  }

  private checkResize(): void {
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : undefined) ?? 1;
    const result = resizeBackingBuffer(
      this.ctx.canvas,
      this.ctx,
      this.logicalW,
      this.logicalH,
      this.dpr,
      dpr,
    );
    if (result !== null) {
      this.logicalW = result.logicalW;
      this.logicalH = result.logicalH;
      this.dpr = dpr;
    }
  }

  private render(): void {
    this.checkResize();
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.logicalW, this.logicalH);

    const atlas = this.atlasLoader.getImage();

    if (this.atlasLoader.getState() === "error") {
      // magenta fill signals atlas load failure visually in development
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
      return;
    }

    if (!atlas) {
      // dark background while atlas is still loading
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
      return;
    }

    const state = this.app.getCampaignState();
    const sectorIds = Object.keys(state.sectors);
    if (sectorIds.length === 0) return;

    const scene = projectSectorScene(sectorIds[0], state, this.app.getCatalog());
    this.drawScene(atlas, scene);
  }

  /** iterates each scene layer in canonical order and draws sprites via the atlas painter */
  private drawScene(atlas: LoadableImage, scene: WorldScene): void {
    const { ctx, painter } = this;
    const cs = CELL_SIZE;
    for (const layer of [scene.biomes, scene.groundOverlays, scene.entities, scene.facilities]) {
      for (const cell of layer) {
        painter.drawSprite(ctx, atlas, cell.spriteId, cell.col * cs, cell.row * cs);
      }
    }
  }
}

