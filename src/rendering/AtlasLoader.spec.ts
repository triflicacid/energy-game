import { describe, it, expect, vi } from "vitest";
import { AtlasLoader } from "./AtlasLoader";
import type { LoadableImage } from "./AtlasLoader";

type StubImage = LoadableImage & {
  triggerLoad(): void;
  triggerError(): void;
  getAssignedSrc(): string;
};

function makeStub(): StubImage {
  let onload: (() => void) | null = null;
  let onerror: (() => void) | null = null;
  let src = "";
  return {
    get onload() { return onload; },
    set onload(v) { onload = v; },
    get onerror() { return onerror; },
    set onerror(v) { onerror = v; },
    get src() { return src; },
    set src(v) { src = v; },
    triggerLoad() { onload?.(); },
    triggerError() { onerror?.(); },
    getAssignedSrc() { return src; },
  };
}

describe("AtlasLoader", () => {
  it("starts in loading state with no image", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    expect(loader.getState()).toBe("loading");
    expect(loader.getImage()).toBeNull();
  });

  it("sets image src to the provided url", () => {
    const stub = makeStub();
    new AtlasLoader("atlas.png", () => stub);
    expect(stub.getAssignedSrc()).toBe("atlas.png");
  });

  it("transitions to ready state and exposes the image on load", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    stub.triggerLoad();
    expect(loader.getState()).toBe("ready");
    expect(loader.getImage()).toBe(stub);
  });

  it("transitions to error state and returns null image on load failure", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    stub.triggerError();
    expect(loader.getState()).toBe("error");
    expect(loader.getImage()).toBeNull();
  });

  it("notifies onStateChange subscribers on successful load", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    const callback = vi.fn();
    loader.onStateChange(callback);
    stub.triggerLoad();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("notifies onStateChange subscribers on load failure", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    const callback = vi.fn();
    loader.onStateChange(callback);
    stub.triggerError();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("notifies all registered subscribers", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    loader.onStateChange(cb1);
    loader.onStateChange(cb2);
    stub.triggerLoad();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("does not notify unsubscribed listeners", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    const callback = vi.fn();
    const unsubscribe = loader.onStateChange(callback);
    unsubscribe();
    stub.triggerLoad();
    expect(callback).not.toHaveBeenCalled();
  });

  it("unsubscribing a second time is safe", () => {
    const stub = makeStub();
    const loader = new AtlasLoader("test.png", () => stub);
    const callback = vi.fn();
    const unsubscribe = loader.onStateChange(callback);
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("calls the factory exactly once", () => {
    const stub = makeStub();
    const factory = vi.fn().mockReturnValue(stub);
    new AtlasLoader("test.png", factory);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

