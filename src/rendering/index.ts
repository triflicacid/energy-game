// canvas map renderer; reads simulation state, must not mutate it

import type { Application } from "@application";
import type { Disposable } from "@shared/Disposable";

export {
  RESERVOIR_CONNECTION,
  reservoirConnectionMask,
  reservoirSpriteId,
  type ReservoirNeighbourLookup,
  type ReservoirSpriteId,
} from "./ReservoirAutotile";

/**
 * minimal canvas renderer shell.
 *
 * subscribes to tick:after so the canvas is redrawn whenever the simulation
 * advances. Atlas drawing begins in U01a; layered sector composition follows in U01c.
 */
export class CanvasRenderer implements Disposable {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly unsubscribeTick: () => void;

  public constructor(app: Application) {
    const ctx = app.getCanvasEl().getContext("2d");
    if (!ctx) throw new Error("could not acquire 2d rendering context");
    this.ctx = ctx;

    this.resize();

    this.unsubscribeTick = app.getEvents().subscribe("tick:after", () => {
      this.render();
    });

    this.render();
  }

  /** releases the event subscription */
  public dispose(): void {
    this.unsubscribeTick();
  }

  /** resize the backing buffer to match the CSS display size */
  private resize(): void {
    const { canvas } = this.ctx;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  /** placeholder fill; replaced by atlas drawing and layered composition in U01a–U01c */
  private render(): void {
    const { canvas } = this.ctx;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = "#0a0a1a";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
