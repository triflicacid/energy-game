import { afterEach, describe, expect, it, vi } from "vitest";
import { Keyboard } from "./Keyboard";
import type { KeyboardEventSource } from "./KeyboardEventSource";

type KeyHandler = (event: KeyboardEvent) => void;
type BlurHandler = () => void;

class FakeWindow implements KeyboardEventSource {
  private readonly keyListeners = new Map<"keydown" | "keyup", Set<KeyHandler>>();
  private readonly blurListeners = new Set<BlurHandler>();

  public addEventListener(type: "keydown" | "keyup", listener: KeyHandler): void;
  public addEventListener(type: "blur", listener: BlurHandler): void;
  public addEventListener(type: "keydown" | "keyup" | "blur", listener: KeyHandler | BlurHandler): void {
    if (type === "blur") {
      this.blurListeners.add(listener as BlurHandler);
      return;
    }
    const set = this.keyListeners.get(type) ?? new Set<KeyHandler>();
    set.add(listener as KeyHandler);
    this.keyListeners.set(type, set);
  }

  public removeEventListener(type: "keydown" | "keyup", listener: KeyHandler): void;
  public removeEventListener(type: "blur", listener: BlurHandler): void;
  public removeEventListener(type: "keydown" | "keyup" | "blur", listener: KeyHandler | BlurHandler): void {
    if (type === "blur") {
      this.blurListeners.delete(listener as BlurHandler);
      return;
    }
    this.keyListeners.get(type)?.delete(listener as KeyHandler);
  }

  public dispatch(type: string, key = "", repeat = false): void {
    if (type === "blur") {
      for (const l of this.blurListeners) l();
      return;
    }
    const event = { key, repeat } as KeyboardEvent;
    for (const l of this.keyListeners.get(type as "keydown" | "keyup") ?? []) l(event);
  }
}

describe("Keyboard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks pressed keys with case-sensitive matching by default", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);

    win.dispatch("keydown", "W");
    expect(kb.hasKeyPressed("W")).toBe(true);
    expect(kb.hasKeyPressed("w")).toBe(false);
    expect(kb.hasKeyPressed("w", { caseInsensitive: true })).toBe(true);

    win.dispatch("keyup", "W");
    expect(kb.hasKeyPressed("W")).toBe(false);
  });

  it("notifies keydown listeners and supports unsubscription", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();

    const unsub = kb.onKeyDown(listener);
    win.dispatch("keydown", "A");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ key: "A" }), "A", false);

    unsub();
    win.dispatch("keydown", "A");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies keyup listeners and supports unsubscription", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();

    const unsub = kb.onKeyUp(listener);
    win.dispatch("keydown", "ArrowUp");
    win.dispatch("keyup", "ArrowUp");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ key: "ArrowUp" }), "ArrowUp");

    unsub();
    win.dispatch("keyup", "ArrowUp");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("onKeyDownForKey fires only for the matching key", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();

    kb.onKeyDownForKey("f", listener);
    win.dispatch("keydown", "F");
    win.dispatch("keydown", "f");
    win.dispatch("keydown", "G");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ key: "f" }), "f", false);
  });

  it("onKeyDownForKey supports case-insensitive matching", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();

    kb.onKeyDownForKey("d", listener, { caseInsensitive: true });
    win.dispatch("keydown", "d");
    win.dispatch("keydown", "D");

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clears pressed key state on blur", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);

    win.dispatch("keydown", "ArrowUp");
    expect(kb.hasKeyPressed("ArrowUp")).toBe(true);

    win.dispatch("blur");
    expect(kb.hasKeyPressed("ArrowUp")).toBe(false);
    expect(Array.from(kb.getPressedKeys())).toHaveLength(0);
  });

  it("dispose detaches listeners and clears tracked state", () => {
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();

    kb.onKeyDown(listener);
    win.dispatch("keydown", "x");
    expect(listener).toHaveBeenCalledTimes(1);

    kb.dispose();
    win.dispatch("keydown", "x");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(kb.hasKeyPressed("x")).toBe(false);
  });

  it("flags a keydown as a double-tap when re-pressed shortly after release", () => {
    vi.useFakeTimers();
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();
    kb.onKeyDown(listener);

    win.dispatch("keydown", "ArrowRight");
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), "ArrowRight", false);

    win.dispatch("keyup", "ArrowRight");
    vi.advanceTimersByTime(100);
    win.dispatch("keydown", "ArrowRight");
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), "ArrowRight", true);
  });

  it("does not flag a double-tap once the gap exceeds the window", () => {
    vi.useFakeTimers();
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();
    kb.onKeyDown(listener);

    win.dispatch("keydown", "ArrowRight");
    win.dispatch("keyup", "ArrowRight");
    vi.advanceTimersByTime(1000);
    win.dispatch("keydown", "ArrowRight");
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), "ArrowRight", false);
  });

  it("ignores OS key-repeat when checking for a double-tap", () => {
    vi.useFakeTimers();
    const win = new FakeWindow();
    const kb = new Keyboard(win);
    const listener = vi.fn();
    kb.onKeyDown(listener);

    win.dispatch("keydown", "ArrowRight");
    win.dispatch("keyup", "ArrowRight");
    vi.advanceTimersByTime(50);
    win.dispatch("keydown", "ArrowRight", true);
    expect(listener).toHaveBeenLastCalledWith(expect.anything(), "ArrowRight", false);
  });
});

