// canvas renderer: loads the world atlas, manages camera state and view modes, draws the sector

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";
import { AtlasLoader } from "./AtlasLoader";
import type { LoadableImage } from "./AtlasLoader";
import { WorldAtlasPainter } from "./WorldAtlasPainter";
import { projectSectorScene } from "./SceneProjector";
import type { WorldScene } from "./WorldScene";
import {
  MAX_ZOOM,
  getMinZoom,
  clampZoom,
  clampPan,
  zoomTowardPoint,
  type ViewMode,
} from "./CameraState";

/** public URL of the world atlas PNG, served from the static/ directory by Vite */
export const WORLD_ATLAS_URL = "./world-atlas.png";

/** logical CSS pixel size of one world cell */
export const CELL_SIZE = 64;

/** zoom factor applied per scroll event step */
const ZOOM_STEP = 1.10;

/**
 * how far below fit-to-sector zoom the camera can bottom out in sector view.
 * at this scale the sector occupies this fraction of the viewport, surrounded by
 * the void background; shift+scrolling outward at this level switches to campaign map.
 * 0.5 means the sector fills half the viewport, with equal void on each side.
 */
const SECTOR_MIN_ZOOM_SCALE = 0.5;

/**
 * zoom multiplier applied on top of the fit-to-sector zoom when a sector is first entered.
 * at 2× the sector overflows the viewport in both dimensions, giving immediate panning room.
 * the player can shift+scroll out to see the whole sector or the campaign map.
 */
const INITIAL_ZOOM_SCALE = 2;

/** fill colors for biome hex nodes in the placeholder campaign map view */
const BIOME_HEX_FILL: Readonly<Record<string, string>> = {
  temperate: "#2a4a2a",
  cold: "#3a4a5a",
  desert: "#6a5a2a",
  wetland: "#2a4a4a",
  mountain: "#5a5a5a",
  volcanic: "#4a2a2a",
  coastal: "#2a3a5a",
  offshore: "#1a2a4a",
};

/** stroke colors for biome hex nodes in the placeholder campaign map view */
const BIOME_HEX_STROKE: Readonly<Record<string, string>> = {
  temperate: "#4a8a4a",
  cold: "#6a8aaa",
  desert: "#aa8a4a",
  wetland: "#4a8a8a",
  mountain: "#8a8a9a",
  volcanic: "#8a4a4a",
  coastal: "#4a6a9a",
  offshore: "#3a5a8a",
};

/**
 * updates the canvas backing buffer to match current logical dimensions scaled by dpr.
 * returns the new logical dimensions if the size or dpr changed, null if unchanged.
 * exported for unit testing.
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
 *
 * manages two view modes on one canvas element:
 * - sector detail: zoomed tile grid with pan/zoom camera
 * - campaign map: placeholder hex overview (full hex design is Phase 5)
 *
 * switching between modes:
 * - press M to toggle (ignored when keyboard focus is inside a text field or dialog)
 * - shift+scroll outward at minimum zoom → campaign map
 * - shift+scroll inward in campaign map → sector view
 * - click in campaign map → sector view
 */
export class CanvasRenderer implements Disposable {
  private readonly app: Application;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlasLoader: AtlasLoader;
  private readonly painter: WorldAtlasPainter;
  private readonly unsubscribeTick: () => void;
  private readonly unsubscribeAtlas: () => void;
  private resizeObserver: ResizeObserver | null = null;
  private logicalW = 0;
  private logicalH = 0;
  private dpr = 1;

  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private lastSectorCols = 12;
  private lastSectorRows = 12;
  private zoomInitialized = false;
  private viewMode: ViewMode = "sector";

  private isDragging = false;
  private hasDragged = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragPanStartX = 0;
  private dragPanStartY = 0;
  private campaignPanX = 0;
  private campaignPanY = 0;
  private dragCamPanStartX = 0;
  private dragCamPanStartY = 0;

  public constructor(app: Application, atlasLoader?: AtlasLoader) {
    this.app = app;
    const canvas = app.getCanvasEl();
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("could not acquire 2d rendering context");
    this.ctx = ctx;
    this.painter = new WorldAtlasPainter();
    this.atlasLoader = atlasLoader ?? new AtlasLoader(WORLD_ATLAS_URL);

    this.unsubscribeAtlas = this.atlasLoader.onStateChange(() => { this.render(); });
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => { this.render(); });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => { this.render(); });
      this.resizeObserver.observe(canvas);
    }

    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("click", this.handleClick);
    canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    if (canvas.style) canvas.style.cursor = "grab";

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", this.handleMouseMove);
      window.addEventListener("mouseup", this.handleMouseUp);
      window.addEventListener("keydown", this.handleKeyDown);
    }

    this.render();
  }

  /** releases all subscriptions, event listeners, and the resize observer */
  public dispose(): void {
    this.unsubscribeTick();
    this.unsubscribeAtlas();
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", this.handleMouseMove);
      window.removeEventListener("mouseup", this.handleMouseUp);
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }

  /** returns the current view mode */
  public getViewMode(): ViewMode { return this.viewMode; }

  /** returns the current camera zoom level */
  public getZoom(): number { return this.zoom; }

  /** returns the current camera pan as world-space logical pixel coordinates */
  public getPan(): { panX: number; panY: number } { return { panX: this.panX, panY: this.panY }; }

  /** returns the current campaign map pan offset in screen-space CSS pixels */
  public getCampaignPan(): { x: number; y: number } { return { x: this.campaignPanX, y: this.campaignPanY }; }

  private checkResize(): void {
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : undefined) ?? 1;
    const result = resizeBackingBuffer(this.ctx.canvas, this.ctx, this.logicalW, this.logicalH, this.dpr, dpr);
    if (result !== null) {
      this.logicalW = result.logicalW;
      this.logicalH = result.logicalH;
      this.dpr = dpr;
    }
  }

  private initializeZoom(cols: number, rows: number): void {
    const fitZoom = getMinZoom(this.logicalW, this.logicalH, cols, rows, CELL_SIZE);
    // start zoomed in so there is immediate panning room; player can zoom out to see the whole sector
    this.zoom = clampZoom(fitZoom * INITIAL_ZOOM_SCALE, fitZoom * SECTOR_MIN_ZOOM_SCALE);
    // clampPan with 0,0 resolves to the centering offset when the sector is smaller than the viewport
    const clamped = clampPan(0, 0, this.zoom, this.logicalW, this.logicalH, cols, rows, CELL_SIZE);
    this.panX = clamped.panX;
    this.panY = clamped.panY;
  }

  private render(): void {
    this.checkResize();
    const { ctx, dpr } = this;

    // clear the full viewport in screen space before applying any camera transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.logicalW, this.logicalH);

    if (this.viewMode === "campaign") {
      this.renderCampaignMap();
      return;
    }

    if (this.atlasLoader.getState() === "error") {
      // magenta fill signals atlas load failure visually in development
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
      return;
    }

    const atlas = this.atlasLoader.getImage();
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
    this.lastSectorCols = scene.cols;
    this.lastSectorRows = scene.rows;

    if (!this.zoomInitialized) {
      this.initializeZoom(scene.cols, scene.rows);
      this.zoomInitialized = true;
    }

    // apply camera transform: world-space → physical pixel space
    ctx.setTransform(
      dpr * this.zoom, 0, 0, dpr * this.zoom,
      Math.round(-this.panX * dpr * this.zoom),
      Math.round(-this.panY * dpr * this.zoom),
    );

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

  /** draws the placeholder campaign map — one hex node per sector; full design is Phase 5 */
  private renderCampaignMap(): void {
    const { ctx, logicalW, logicalH, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, logicalW, logicalH);

    const state = this.app.getCampaignState();
    const catalog = this.app.getCatalog();
    const sectorId = Object.keys(state.sectors)[0];
    const sector = sectorId !== undefined ? state.sectors[sectorId] : undefined;
    const sectorDef = sector !== undefined ? catalog.sectors.get(sector.definitionId) : undefined;

    const cx = logicalW / 2 + this.campaignPanX;
    const cy = logicalH / 2 + this.campaignPanY;
    const r = Math.min(logicalW, logicalH) * 0.18;
    const biome = sectorDef?.biome ?? "temperate";

    // flat-top hexagon (first vertex at angle -30°)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = BIOME_HEX_FILL[biome] ?? "#2a4a2a";
    ctx.fill();
    ctx.strokeStyle = BIOME_HEX_STROKE[biome] ?? "#4a8a4a";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (sectorDef !== undefined) {
      ctx.fillStyle = "#c8d8c8";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sectorDef.name, cx, cy);
    }

    ctx.fillStyle = "#505868";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("M or shift+scroll in to enter sector", cx, logicalH - 16);
  }

  // --- pointer and keyboard event handlers ---

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    // prevent the browser from starting a native element-drag which would swallow mousemove events
    event.preventDefault();
    this.isDragging = true;
    this.hasDragged = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragPanStartX = this.panX;
    this.dragPanStartY = this.panY;
    this.dragCamPanStartX = this.campaignPanX;
    this.dragCamPanStartY = this.campaignPanY;
    if (this.canvas.style) this.canvas.style.cursor = "grabbing";
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.hasDragged = true;

    if (this.viewMode === "campaign") {
      // campaign map pan is unbounded — content follows the cursor directly in screen space
      this.campaignPanX = this.dragCamPanStartX + dx;
      this.campaignPanY = this.dragCamPanStartY + dy;
    } else {
      // sector pan is unbounded — the player can drag into the void
      this.panX = this.dragPanStartX - dx / this.zoom;
      this.panY = this.dragPanStartY - dy / this.zoom;
    }
    this.render();
  };

  private readonly handleMouseUp = (): void => {
    this.isDragging = false;
    if (this.canvas.style) this.canvas.style.cursor = "grab";
  };

  private readonly handleClick = (): void => {
    if (this.viewMode === "campaign" && !this.hasDragged) {
      this.viewMode = "sector";
      this.render();
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    if (this.viewMode === "campaign") {
      // in campaign map: shift+scroll-in re-enters the sector
      if (event.shiftKey && event.deltaY < 0) {
        this.viewMode = "sector";
        this.render();
      }
      return;
    }

    // sector view: both regular scroll and shift+scroll zoom toward the cursor
    const fitZoom = getMinZoom(this.logicalW, this.logicalH, this.lastSectorCols, this.lastSectorRows, CELL_SIZE);
    const lowerBound = fitZoom * SECTOR_MIN_ZOOM_SCALE;

    if (event.shiftKey && event.deltaY > 0 && this.zoom <= lowerBound + 1e-9) {
      // shift+scroll outward at minimum zoom → switch to campaign map
      this.viewMode = "campaign";
      this.render();
      return;
    }

    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const newZoom = clampZoom(this.zoom * factor, lowerBound);
    const { panX, panY } = zoomTowardPoint(this.panX, this.panY, this.zoom, event.offsetX, event.offsetY, newZoom);
    this.zoom = newZoom;
    this.panX = panX;
    this.panY = panY;

    this.render();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== "m") return;
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (active !== null) {
      const tag = (active as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((active as HTMLElement).isContentEditable) return;
      if (typeof active.closest === "function" && active.closest("dialog") !== null) return;
    }
    this.viewMode = this.viewMode === "sector" ? "campaign" : "sector";
    this.render();
  };
}

export { MAX_ZOOM };
