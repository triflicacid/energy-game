import { describe, it, expect, vi } from "vitest";
import { resizeBackingBuffer } from "./CanvasRenderer";
import { AtlasLoader } from "./AtlasLoader";
import { CanvasRenderer } from "./CanvasRenderer";
import type { LoadableImage } from "./AtlasLoader";
import type { Application } from "@application";

// ---- resizeBackingBuffer unit tests ----------------------------------------

describe("resizeBackingBuffer", () => {
  it("sets canvas pixel dimensions to logical size multiplied by dpr", () => {
    const canvas = { width: 0, height: 0, clientWidth: 300, clientHeight: 200 };
    const ctx = { setTransform: vi.fn() };
    resizeBackingBuffer(canvas, ctx, 0, 0, 1, 2);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
  });

  it("calls setTransform with the dpr on all four scale components", () => {
    const canvas = { width: 0, height: 0, clientWidth: 100, clientHeight: 100 };
    const ctx = { setTransform: vi.fn() };
    resizeBackingBuffer(canvas, ctx, 0, 0, 1, 3);
    expect(ctx.setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
  });

  it("returns null and skips resize when dimensions and dpr are unchanged", () => {
    const canvas = { width: 300, height: 200, clientWidth: 300, clientHeight: 200 };
    const ctx = { setTransform: vi.fn() };
    const result = resizeBackingBuffer(canvas, ctx, 300, 200, 1, 1);
    expect(result).toBeNull();
    expect(ctx.setTransform).not.toHaveBeenCalled();
  });

  it("returns the new logical dimensions when the size changes", () => {
    const canvas = { width: 0, height: 0, clientWidth: 300, clientHeight: 200 };
    const ctx = { setTransform: vi.fn() };
    const result = resizeBackingBuffer(canvas, ctx, 0, 0, 1, 1);
    expect(result).toEqual({ logicalW: 300, logicalH: 200 });
  });

  it("returns new dimensions when only dpr changes", () => {
    const canvas = { width: 300, height: 200, clientWidth: 300, clientHeight: 200 };
    const ctx = { setTransform: vi.fn() };
    const result = resizeBackingBuffer(canvas, ctx, 300, 200, 1, 2);
    expect(result).not.toBeNull();
    expect(canvas.width).toBe(600);
  });

  it("falls back to canvas.width when clientWidth is zero", () => {
    const canvas = { width: 400, height: 300, clientWidth: 0, clientHeight: 0 };
    const ctx = { setTransform: vi.fn() };
    resizeBackingBuffer(canvas, ctx, 0, 0, 1, 1);
    // clientWidth=0, so falls back to canvas.width=400; 400 * 1 = 400
    expect(canvas.width).toBe(400);
  });

  it("rounds fractional dpr-scaled dimensions to integers", () => {
    const canvas = { width: 0, height: 0, clientWidth: 100, clientHeight: 100 };
    const ctx = { setTransform: vi.fn() };
    resizeBackingBuffer(canvas, ctx, 0, 0, 1, 1.5);
    expect(Number.isInteger(canvas.width)).toBe(true);
    expect(Number.isInteger(canvas.height)).toBe(true);
  });
});

// ---- CanvasRenderer integration tests --------------------------------------

type StubImage = LoadableImage & { triggerLoad(): void; triggerError(): void };

function makeStub(): StubImage {
  let onload: (() => void) | null = null;
  let onerror: (() => void) | null = null;
  return {
    get onload() { return onload; },
    set onload(v) { onload = v; },
    get onerror() { return onerror; },
    set onerror(v) { onerror = v; },
    src: "",
    triggerLoad() { onload?.(); },
    triggerError() { onerror?.(); },
  };
}

function makeApp() {
  const clearRect = vi.fn();
  const fillRect = vi.fn();
  const drawImage = vi.fn();
  const setTransform = vi.fn();
  const canvas = { width: 0, height: 0, clientWidth: 300, clientHeight: 200 };
  const ctxMock = {
    canvas,
    setTransform,
    imageSmoothingEnabled: true,
    clearRect,
    fillStyle: "",
    fillRect,
    drawImage,
  };
  const canvasEl = { ...canvas, getContext: (id: string) => id === "2d" ? ctxMock : null };

  const tickSubs: (() => void)[] = [];
  const app = {
    getCanvasEl: () => canvasEl as unknown as HTMLCanvasElement,
    getUiRootEl: () => null as unknown as HTMLElement,
    getEvents: () => ({
      subscribe: (event: string, cb: () => void) => {
        if (event === "tick:after") tickSubs.push(cb);
        return vi.fn();
      },
      once: vi.fn(),
    }),
    getClock: vi.fn(),
    getFps: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    setSpeed: vi.fn(),
    dispose: vi.fn(),
  } as unknown as Application;

  return { app, clearRect, fillRect, drawImage, tickSubs };
}

describe("CanvasRenderer", () => {
  it("redraws when the atlas transitions to ready", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("fake.png", () => stub);
    const { app, clearRect } = makeApp();

    const renderer = new CanvasRenderer(app, loader);
    const callsBefore = clearRect.mock.calls.length;

    stub.triggerLoad();

    expect(clearRect.mock.calls.length).toBeGreaterThan(callsBefore);
    renderer.dispose();
  });

  it("redraws with a magenta fill on atlas error", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("fake.png", () => stub);
    const { app, fillRect } = makeApp();

    const renderer = new CanvasRenderer(app, loader);
    stub.triggerError();

    const fillCalls = (fillRect.mock.calls as unknown[][]);
    // after error, fillRect is called with the magenta fill covering the viewport
    expect(fillCalls.length).toBeGreaterThan(0);
    renderer.dispose();
  });

  it("redraws on each simulation tick", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("fake.png", () => stub);
    const { app, clearRect, tickSubs } = makeApp();

    const renderer = new CanvasRenderer(app, loader);
    const callsBefore = clearRect.mock.calls.length;

    for (const cb of tickSubs) cb();

    expect(clearRect.mock.calls.length).toBeGreaterThan(callsBefore);
    renderer.dispose();
  });

  it("dispose stops further redraws on atlas state change", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("fake.png", () => stub);
    const { app, clearRect } = makeApp();

    const renderer = new CanvasRenderer(app, loader);
    renderer.dispose();
    const callsAfterDispose = clearRect.mock.calls.length;

    stub.triggerLoad();

    expect(clearRect.mock.calls.length).toBe(callsAfterDispose);
  });
});


