import { describe, it, expect, vi } from "vitest";
import { WorldAtlasPainter, MISSING_SPRITE_COLOR } from "./WorldAtlasPainter";
import { WORLD_SPRITES } from "./generated/world-atlas";
import type { LoadableImage } from "./AtlasLoader";

function makeCtx() {
  return {
    imageSmoothingEnabled: true,
    drawImage: vi.fn(),
    fillStyle: "",
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const fakeAtlas = {} as unknown as LoadableImage;

describe("WorldAtlasPainter.drawSprite", () => {
  const painter = new WorldAtlasPainter();

  it("disables image smoothing before drawing", () => {
    const ctx = makeCtx();
    painter.drawSprite(ctx, fakeAtlas, "biome-temperate", 0, 0);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it("passes the atlas image as the first argument to drawImage", () => {
    const ctx = makeCtx();
    const atlas = { tag: "atlas" } as unknown as LoadableImage;
    painter.drawSprite(ctx, atlas, "forest-site", 0, 0);
    const [img] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(img).toBe(atlas);
  });

  it("uses the correct source rectangle from the descriptor", () => {
    const ctx = makeCtx();
    const desc = WORLD_SPRITES["biome-temperate"];
    painter.drawSprite(ctx, fakeAtlas, "biome-temperate", 0, 0);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
    expect(call[1]).toBe(desc.x);
    expect(call[2]).toBe(desc.y);
    expect(call[3]).toBe(desc.w);
    expect(call[4]).toBe(desc.h);
  });

  it("draws destination size matching the sprite dimensions", () => {
    const ctx = makeCtx();
    const desc = WORLD_SPRITES["biome-temperate"];
    painter.drawSprite(ctx, fakeAtlas, "biome-temperate", 0, 0);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
    expect(call[7]).toBe(desc.w);
    expect(call[8]).toBe(desc.h);
  });

  it("places a zero-anchor sprite at the exact cell destination", () => {
    const ctx = makeCtx();
    painter.drawSprite(ctx, fakeAtlas, "biome-temperate", 128, 192);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
    // dx = destX - anchorX = 128 - 0; dy = destY - anchorY = 192 - 0
    expect(call[5]).toBe(128);
    expect(call[6]).toBe(192);
  });

  it("subtracts anchorY from destY for the overhanging waterwheel sprite", () => {
    const ctx = makeCtx();
    const desc = WORLD_SPRITES["waterwheel"];
    expect(desc.anchorY).toBe(16);
    painter.drawSprite(ctx, fakeAtlas, "waterwheel", 0, 64);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
    // the top 16px of the sprite extends above the cell, aligning the main content to the cell
    expect(call[6]).toBe(64 - 16);
  });

  it("draws the two-cell workshop at the cell origin with its full width", () => {
    const ctx = makeCtx();
    const desc = WORLD_SPRITES["mechanical-workshop"];
    expect(desc.footprintW).toBe(2);
    expect(desc.anchorX).toBe(0);
    painter.drawSprite(ctx, fakeAtlas, "mechanical-workshop", 64, 0);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0] as number[];
    expect(call[5]).toBe(64);  // dx = destX - 0
    expect(call[6]).toBe(0);   // dy = destY - 0
    expect(call[7]).toBe(desc.w); // full 128px width
  });

  it("covers all 16 reservoir autotile variants without error", () => {
    const painter2 = new WorldAtlasPainter();
    for (let mask = 0; mask <= 0xf; mask += 1) {
      const id = `reservoir-water-${mask.toString(16).padStart(2, "0")}` as Parameters<typeof painter2.drawSprite>[2];
      const ctx = makeCtx();
      expect(() => painter2.drawSprite(ctx, fakeAtlas, id, 0, 0)).not.toThrow();
    }
  });
});

describe("WorldAtlasPainter.drawFallback", () => {
  const painter = new WorldAtlasPainter();

  it("disables image smoothing", () => {
    const ctx = makeCtx();
    painter.drawFallback(ctx, 0, 0, 64);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it("fills with the missing sprite color", () => {
    const ctx = makeCtx();
    painter.drawFallback(ctx, 0, 0, 64);
    expect(ctx.fillStyle).toBe(MISSING_SPRITE_COLOR);
  });

  it("fills a cellSize-sized rectangle at the destination", () => {
    const ctx = makeCtx();
    painter.drawFallback(ctx, 128, 192, 64);
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([128, 192, 64, 64]);
  });
});

