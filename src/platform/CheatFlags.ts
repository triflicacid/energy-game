// dev only cheat toggle. cheats never gate core simulation or gameplay logic, only
// debug UI affordances and the explicit `cheat*` Application methods they call.
// toggle live from the browser devtools console: window.cheats.enabled = true

let cheatsEnabled = false;

/** returns whether cheat gated UI and Application methods are currently enabled */
export function isCheatsEnabled(): boolean {
  return cheatsEnabled;
}

/** sets the cheat flag; also reachable via window.cheats.enabled (see below) */
export function setCheatsEnabled(value: boolean): void {
  cheatsEnabled = value;
}

declare global {
  interface Window {
    cheats: { enabled: boolean };
  }
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "cheats", {
    configurable: true,
    value: {
      get enabled(): boolean {
        return cheatsEnabled;
      },
      set enabled(value: boolean) {
        setCheatsEnabled(value);
      },
    },
  });
}
