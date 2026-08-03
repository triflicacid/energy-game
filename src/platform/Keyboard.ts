import type { KeyboardEventSource } from "./KeyboardEventSource";
import type { Disposable } from "@shared/Disposable";

export type KeyboardKeyDownListener = (event: KeyboardEvent, key: string, doubleTap: boolean) => void;
export type KeyboardKeyUpListener = (event: KeyboardEvent, key: string) => void;

export type KeyboardKeyMatchOptions = {
  caseInsensitive?: boolean;
};

export type KeyboardConfig = {
  /** maximum gap in ms between a key release and next press to count as a double-tap */
  doubleTapWindowMs: number;
};

type KeyDownSubscription = {
  key: string;
  listener: KeyboardKeyDownListener;
  caseInsensitive: boolean;
};

/**
 * tracks keyboard state from a window-like event source and exposes query and subscription APIs.
 * key matching is case-sensitive by default.
 */
export class Keyboard implements Disposable {
  private readonly pressedKeys = new Set<string>();
  private readonly lastKeyUpTime = new Map<string, number>();
  private readonly keyDownListeners = new Set<KeyboardKeyDownListener>();
  private readonly keyUpListeners = new Set<KeyboardKeyUpListener>();
  private readonly keyDownSubscriptions = new Set<KeyDownSubscription>();
  private readonly config: KeyboardConfig;

  public constructor(
    private readonly eventSource: KeyboardEventSource,
    config?: Partial<KeyboardConfig>,
  ) {
    this.config = { doubleTapWindowMs: config?.doubleTapWindowMs ?? 300 };
    this.eventSource.addEventListener("keydown", this.handleKeyDown);
    this.eventSource.addEventListener("keyup", this.handleKeyUp);
    this.eventSource.addEventListener("blur", this.handleBlur);
  }

  /** returns the active configuration */
  public getConfig(): KeyboardConfig {
    return this.config;
  }

  /** returns true when the key is currently held */
  public hasKeyPressed(key: string, options: KeyboardKeyMatchOptions = {}): boolean {
    if (!(options.caseInsensitive ?? false)) {
      return this.pressedKeys.has(key);
    }
    for (const pressed of this.pressedKeys) {
      if (Keyboard.matchesKey(pressed, key, true)) return true;
    }
    return false;
  }

  /** clears all tracked pressed keys */
  public clear(): void {
    this.pressedKeys.clear();
  }

  /** returns a snapshot of currently held keys */
  public getPressedKeys(): ReadonlySet<string> {
    return new Set(this.pressedKeys);
  }

  /** registers a listener for every keydown event; returns a cleanup callback */
  public onKeyDown(listener: KeyboardKeyDownListener): () => void {
    this.keyDownListeners.add(listener);
    return () => { this.keyDownListeners.delete(listener); };
  }

  /** registers a listener for every keyup event; returns a cleanup callback */
  public onKeyUp(listener: KeyboardKeyUpListener): () => void {
    this.keyUpListeners.add(listener);
    return () => { this.keyUpListeners.delete(listener); };
  }

  /** registers a listener for keydown events of one specific key; returns a cleanup callback */
  public onKeyDownForKey(
    key: string,
    listener: KeyboardKeyDownListener,
    options: KeyboardKeyMatchOptions = {},
  ): () => void {
    const sub: KeyDownSubscription = { key, listener, caseInsensitive: options.caseInsensitive ?? false };
    this.keyDownSubscriptions.add(sub);
    return () => { this.keyDownSubscriptions.delete(sub); };
  }

  /** removes window listeners and clears all tracked state and subscriptions */
  public dispose(): void {
    this.eventSource.removeEventListener("keydown", this.handleKeyDown);
    this.eventSource.removeEventListener("keyup", this.handleKeyUp);
    this.eventSource.removeEventListener("blur", this.handleBlur);
    this.pressedKeys.clear();
    this.lastKeyUpTime.clear();
    this.keyDownListeners.clear();
    this.keyUpListeners.clear();
    this.keyDownSubscriptions.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;
    const lastUp = this.lastKeyUpTime.get(key);
    const doubleTap = !event.repeat && lastUp !== undefined && performance.now() - lastUp < this.config.doubleTapWindowMs;
    this.pressedKeys.add(key);

    for (const listener of this.keyDownListeners) {
      listener(event, key, doubleTap);
    }
    for (const sub of this.keyDownSubscriptions) {
      if (Keyboard.matchesKey(key, sub.key, sub.caseInsensitive)) {
        sub.listener(event, key, doubleTap);
      }
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key);
    this.lastKeyUpTime.set(event.key, performance.now());
    for (const listener of this.keyUpListeners) {
      listener(event, event.key);
    }
  };

  private readonly handleBlur = (): void => {
    // clear pressed state to avoid stuck keys when window focus changes
    this.clear();
  };

  private static matchesKey(left: string, right: string, caseInsensitive: boolean): boolean {
    if (!caseInsensitive) return left === right;
    if (left.length === 1 && right.length === 1) return left.toLowerCase() === right.toLowerCase();
    return left === right;
  }
}



