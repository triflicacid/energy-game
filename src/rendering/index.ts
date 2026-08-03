// canvas map renderer; reads simulation state, must not mutate it

import type { Application } from "@application";

/**
 * minimal canvas renderer shell.
 *
 * subscribes to tick:after so the canvas is redrawn whenever the simulation
 * advances.  full sector/sprite rendering will be implemented in U01.
 */
export class CanvasRenderer {
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

  /** placeholder fill; replaced by real tile/sprite rendering in U01 */
  private render(): void {
    const { canvas } = this.ctx;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = "#0a0a1a";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
