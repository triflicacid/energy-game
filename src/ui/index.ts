// html panels, dialogs, tooltips, and research display
// calls application methods, does not mutate simulation state directly

import type { Application } from "@application";
import { SPEED_MULTIPLIERS, type SpeedMultiplier } from "@simulation/SimulationClock";
import iconPause from "./icon-pause.svg?raw";
import iconResume from "./icon-resume.svg?raw";

/**
 * minimal UI shell: time controls and a tick display.
 * subscribes to clock events for invalidation; no animation-frame polling.
 * full panels and research display will be added in U02.
 */
export class UiShell {
  private readonly container: HTMLElement;
  private readonly tickDisplay: HTMLElement;
  private readonly fpsDisplay: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly unsubscribePaused: () => void;
  private readonly unsubscribeResumed: () => void;
  private readonly unsubscribeTick: () => void;

  public constructor(private readonly app: Application) {
    this.container = this.buildControls();
    app.getUiRootEl().appendChild(this.container);

    this.tickDisplay = this.container.querySelector<HTMLElement>("[data-tick-display]")!;
    this.fpsDisplay = this.container.querySelector<HTMLElement>("[data-fps-display]")!;
    this.pauseBtn = this.container.querySelector<HTMLButtonElement>("[data-pause-btn]")!;

    this.unsubscribePaused = app.getEvents().subscribe("clock:paused", () => {
      this.syncPauseButton(true);
    });
    this.unsubscribeResumed = app.getEvents().subscribe("clock:resumed", () => {
      this.syncPauseButton(false);
    });
    this.unsubscribeTick = app.getEvents().subscribe("tick:after", ({ tick, gameTime }) => {
      this.tickDisplay.textContent = `tick ${tick} / hour ${gameTime}`;
      this.fpsDisplay.textContent = `${Math.round(app.getFps())} fps`;
    });

    this.syncPauseButton(app.getClock().isPaused());
  }

  /** removes event subscriptions and detaches the toolbar from the DOM */
  public dispose(): void {
    this.unsubscribePaused();
    this.unsubscribeResumed();
    this.unsubscribeTick();
    this.container.remove();
  }

  private syncPauseButton(paused: boolean): void {
    this.pauseBtn.innerHTML = paused ? iconResume : iconPause;
    this.pauseBtn.setAttribute("aria-label", paused ? "resume" : "pause");
    this.pauseBtn.setAttribute("aria-pressed", String(paused));
  }

  private buildControls(): HTMLElement {
    const bar = document.createElement("div");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "simulation controls");
    bar.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      "right:0",
      "display:flex",
      "align-items:center",
      "gap:8px",
      "padding:8px 12px",
      "background:rgba(0,0,0,0.65)",
      "color:#e0e0e0",
      "font:14px/1 monospace",
      "user-select:none",
    ].join(";");

    const pauseBtn = document.createElement("button");
    pauseBtn.setAttribute("data-pause-btn", "");
    pauseBtn.setAttribute("type", "button");
    pauseBtn.style.cssText = "cursor:pointer;padding:4px 10px;display:inline-flex;align-items:center";
    pauseBtn.addEventListener("click", () => {
      if (this.app.getClock().isPaused()) {
        this.app.resume();
      } else {
        this.app.pause();
      }
    });
    bar.appendChild(pauseBtn);

    for (const s of SPEED_MULTIPLIERS) {
      const btn = document.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("aria-label", `speed ${s}x`);
      btn.textContent = `${s}x`;
      btn.style.cssText = "cursor:pointer;padding:4px 8px";
      btn.addEventListener("click", () => {
        this.app.setSpeed(s as SpeedMultiplier);
      });
      bar.appendChild(btn);
    }

    const display = document.createElement("span");
    display.setAttribute("data-tick-display", "");
    display.setAttribute("aria-live", "polite");
    display.setAttribute("aria-atomic", "true");
    display.textContent = "tick 0 / hour 0";
    bar.appendChild(display);

    const fpsDisplay = document.createElement("span");
    fpsDisplay.setAttribute("data-fps-display", "");
    fpsDisplay.setAttribute("aria-live", "off");
    fpsDisplay.style.cssText = "margin-left:auto;opacity:0.6";
    fpsDisplay.textContent = "0 fps";
    bar.appendChild(fpsDisplay);

    return bar;
  }
}
