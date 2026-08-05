// html panels, dialogs, tooltips, and research display
// calls application methods, does not mutate simulation state directly

import type { Application } from "@application";
import { SPEED_MULTIPLIERS, type SpeedMultiplier } from "@simulation/SimulationClock";
import { Keyboard } from "@platform/Keyboard";
import type { Disposable } from "@shared/Disposable";
import iconPause from "./icon-pause.svg?raw";
import iconResume from "./icon-resume.svg?raw";

export { InventoryPanel } from "./InventoryPanel";
export { getDock, type DockSide } from "./Dock";
export { hasIcon, resolveIconStyle, type ResolvedIconStyle } from "./IconResolver";

/** returns the first element matching selector under root, or throws if none exists */
function queryRequired<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`UiShell: expected an element matching "${selector}"`);
  return el;
}

/**
 * minimal UI shell: time controls and a tick display.
 * subscribes to clock events for invalidation; no animation-frame polling.
 * full panels and research display will be added in U02.
 */
export class UiShell implements Disposable {
  private readonly container: HTMLElement;
  private readonly tickDisplay: HTMLElement;
  private readonly fpsDisplay: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly speedBtns = new Map<SpeedMultiplier, HTMLButtonElement>();
  private readonly keyboard: Keyboard;
  private readonly unsubscribePaused: () => void;
  private readonly unsubscribeResumed: () => void;
  private readonly unsubscribeTick: () => void;
  private readonly unsubscribeSpace: () => void;

  public constructor(private readonly app: Application) {
    this.container = this.buildControls();
    app.getUiRootEl().appendChild(this.container);

    this.tickDisplay = queryRequired<HTMLElement>(this.container, "[data-tick-display]");
    this.fpsDisplay = queryRequired<HTMLElement>(this.container, "[data-fps-display]");
    this.pauseBtn = queryRequired<HTMLButtonElement>(this.container, "[data-pause-btn]");

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
    this.setActiveSpeedBtn(1);

    this.keyboard = new Keyboard(window);
    this.unsubscribeSpace = this.keyboard.onKeyDownForKey(" ", (event) => {
      // prevent page scroll; only toggle when focus is not in a text input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      if (app.getClock().isPaused()) {
        app.resume();
      } else {
        app.pause();
      }
    });
  }

  /** removes event subscriptions and detaches the toolbar from the DOM */
  public dispose(): void {
    this.unsubscribePaused();
    this.unsubscribeResumed();
    this.unsubscribeTick();
    this.unsubscribeSpace();
    this.keyboard.dispose();
    this.container.remove();
  }

  private syncPauseButton(paused: boolean): void {
    this.pauseBtn.innerHTML = paused ? iconResume : iconPause;
    this.pauseBtn.setAttribute("aria-label", paused ? "resume" : "pause");
    this.pauseBtn.setAttribute("aria-pressed", String(paused));
  }

  private setActiveSpeedBtn(speed: SpeedMultiplier): void {
    for (const [s, btn] of this.speedBtns) {
      btn.classList.toggle("toolbar-speed-btn--active", s === speed);
    }
  }

  private buildControls(): HTMLElement {
    const bar = document.createElement("div");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "simulation controls");
    bar.classList.add("toolbar");

    const pauseBtn = document.createElement("button");
    pauseBtn.setAttribute("data-pause-btn", "");
    pauseBtn.setAttribute("type", "button");
    pauseBtn.classList.add("toolbar-btn", "toolbar-btn--icon");
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
      btn.classList.add("toolbar-btn");
      btn.addEventListener("click", () => {
        this.app.setSpeed(s as SpeedMultiplier);
        this.setActiveSpeedBtn(s as SpeedMultiplier);
      });
      this.speedBtns.set(s as SpeedMultiplier, btn);
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
    fpsDisplay.classList.add("toolbar-fps");
    fpsDisplay.textContent = "0 fps";
    bar.appendChild(fpsDisplay);

    return bar;
  }
}
