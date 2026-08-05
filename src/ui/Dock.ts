// lazily-created flex-column container for stacking independent HTML panels under #ui-root
// avoids per-panel pixel-position hacks; each side accumulates panels top-to-bottom

import type { Application } from "@application";

export type DockSide = "dock-left" | "dock-right";

/** returns the dock element for the given side, creating and attaching it on first use */
export function getDock(app: Application, side: DockSide): HTMLElement {
  const root = app.getUiRootEl();
  const existing = root.querySelector<HTMLElement>(`[data-dock="${side}"]`);
  if (existing) return existing;

  const dock = document.createElement("div");
  dock.setAttribute("data-dock", side);
  dock.classList.add("dock", `dock--${side}`);
  root.appendChild(dock);
  return dock;
}
