import { describe, expect, it } from "vitest";
import { AtlasPacker, type SpriteEntry } from "./AtlasPacker";

function sprite(id: string, w: number, h: number, extra: Partial<SpriteEntry> = {}): SpriteEntry {
  return { id, pixelWidth: w, pixelHeight: h, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1, ...extra };
}

const packer = new AtlasPacker({ padding: 2, maxWidth: 512, maxHeight: 512 });

describe("AtlasPacker", () => {
  it("places a single sprite at the padding offset", () => {
    const result = packer.pack([sprite("a", 64, 64)]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].atlasX).toBe(2);
    expect(result.entries[0].atlasY).toBe(2);
  });

  it("packs two same-height sprites side by side on one shelf", () => {
    const result = packer.pack([sprite("a", 64, 64), sprite("b", 64, 64)]);
    const [a, b] = [...result.entries].sort((x, y) => x.atlasX - y.atlasX);
    expect(a.atlasY).toBe(b.atlasY);
    expect(b.atlasX).toBe(a.atlasX + 64 + 2);
  });

  it("wraps to a new shelf when width is exceeded", () => {
    const wide = new AtlasPacker({ padding: 2, maxWidth: 70, maxHeight: 512 });
    const result = wide.pack([sprite("a", 64, 32), sprite("b", 64, 32)]);
    const [a, b] = [...result.entries].sort((x, y) => x.atlasY - y.atlasY);
    expect(a.atlasY).toBe(2);
    expect(b.atlasY).toBe(2 + 32 + 2);
  });

  it("is deterministic: same input always produces same output", () => {
    const sprites = [sprite("z", 32, 64), sprite("a", 64, 32), sprite("m", 48, 48)];
    const r1 = packer.pack(sprites);
    const r2 = packer.pack([...sprites].reverse());
    expect(r1.entries.map(e => e.id)).toEqual(r2.entries.map(e => e.id));
    expect(r1.entries.map(e => e.atlasX)).toEqual(r2.entries.map(e => e.atlasX));
  });

  it("sorts by height desc, width desc, id asc", () => {
    const sprites = [sprite("b", 32, 64), sprite("a", 32, 64), sprite("c", 64, 32)];
    const result = packer.pack(sprites);
    const ids = result.entries.map(e => e.id);
    expect(ids[0]).toBe("a");
    expect(ids[1]).toBe("b");
    expect(ids[2]).toBe("c");
  });

  it("starts each explicit atlas row on a separate shelf", () => {
    const result = packer.pack([
      sprite("overlay-b", 32, 48, { atlasRow: 1 }),
      sprite("background", 64, 32, { atlasRow: 0 }),
      sprite("overlay-a", 64, 16, { atlasRow: 1 }),
    ]);

    expect(result.entries.map(entry => entry.id)).toEqual(["background", "overlay-b", "overlay-a"]);
    expect(result.entries.map(entry => entry.atlasY)).toEqual([2, 36, 36]);
  });

  it("packs explicit rows deterministically regardless of input order", () => {
    const sprites = [
      sprite("structure", 128, 64, { atlasRow: 2 }),
      sprite("biome-b", 64, 64, { atlasRow: 0 }),
      sprite("biome-a", 64, 64, { atlasRow: 0 }),
      sprite("town", 64, 64, { atlasRow: 1 }),
    ];

    expect(packer.pack(sprites)).toEqual(packer.pack([...sprites].reverse()));
  });

  it("requires every sprite to declare a row when explicit rows are used", () => {
    expect(() => packer.pack([
      sprite("background", 64, 64, { atlasRow: 0 }),
      sprite("unassigned", 64, 64),
    ])).toThrow(/unassigned.*atlasRow/i);
  });

  it.each([-1, 1.5])("rejects invalid atlas row %s", atlasRow => {
    expect(() => packer.pack([sprite("a", 64, 64, { atlasRow })])).toThrow(/atlasRow/i);
  });

  it("rejects an explicit row that cannot fit on one shelf", () => {
    const narrow = new AtlasPacker({ padding: 2, maxWidth: 100, maxHeight: 512 });
    expect(() => narrow.pack([
      sprite("a", 48, 32, { atlasRow: 0 }),
      sprite("b", 48, 32, { atlasRow: 0 }),
    ])).toThrow(/row 0.*exceeds.*width/i);
  });

  it("throws on duplicate sprite IDs", () => {
    expect(() => packer.pack([sprite("a", 64, 64), sprite("a", 32, 32)])).toThrow(/duplicate/i);
  });

  it("throws when a sprite exceeds max atlas width", () => {
    const tiny = new AtlasPacker({ padding: 2, maxWidth: 50, maxHeight: 512 });
    expect(() => tiny.pack([sprite("a", 64, 64)])).toThrow(/width.*exceeds/i);
  });

  it("throws when a sprite exceeds max atlas height", () => {
    const tiny = new AtlasPacker({ padding: 2, maxWidth: 512, maxHeight: 50 });
    expect(() => tiny.pack([sprite("a", 64, 64)])).toThrow(/height.*exceeds/i);
  });

  it("preserves all sprite fields (anchor, footprint) in packed output", () => {
    const s = sprite("a", 64, 80, { anchorX: 0, anchorY: 16, footprintW: 1, footprintH: 1 });
    const result = packer.pack([s]);
    expect(result.entries[0].anchorY).toBe(16);
    expect(result.entries[0].footprintW).toBe(1);
  });

  it("packs multi-cell sprite without error", () => {
    const s = sprite("workshop", 128, 64, { footprintW: 2, footprintH: 1 });
    const result = packer.pack([s]);
    expect(result.entries[0].pixelWidth).toBe(128);
    expect(result.entries[0].pixelHeight).toBe(64);
  });

  it("atlas dimensions are powers of two", () => {
    const result = packer.pack([sprite("a", 64, 64), sprite("b", 32, 48)]);
    expect(isPowerOfTwo(result.atlasWidth)).toBe(true);
    expect(isPowerOfTwo(result.atlasHeight)).toBe(true);
  });

  it("returns empty result for empty input", () => {
    const result = packer.pack([]);
    expect(result.entries).toHaveLength(0);
  });
});

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

