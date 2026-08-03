// shelf-based sprite atlas packer — pure logic, no file I/O

export type SpriteEntry = {
  readonly id: string;
  readonly atlasRow?: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly footprintW: number;
  readonly footprintH: number;
};

export type PackedEntry = SpriteEntry & {
  readonly atlasX: number;
  readonly atlasY: number;
};

export type PackResult = {
  readonly entries: readonly PackedEntry[];
  readonly atlasWidth: number;
  readonly atlasHeight: number;
};

export type AtlasPackerOptions = {
  readonly padding: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
};

/**
 * packs sprites into a single atlas page using a shelf-based row algorithm.
 * input sprites are sorted deterministically so the same inputs always produce
 * the same placement.
 */
export class AtlasPacker {
  private readonly padding: number;
  private readonly maxWidth: number;
  private readonly maxHeight: number;

  public constructor(options: AtlasPackerOptions) {
    this.padding = options.padding;
    this.maxWidth = options.maxWidth;
    this.maxHeight = options.maxHeight;
  }

  /** packs the given sprites and returns their atlas placements */
  public pack(sprites: readonly SpriteEntry[]): PackResult {
    this.validate(sprites);

    const sorted = this.sort(sprites);
    const usesExplicitRows = sorted.length > 0 && sorted[0].atlasRow !== undefined;
    const entries: PackedEntry[] = [];

    let shelfX = this.padding;
    let shelfY = this.padding;
    let shelfHeight = 0;
    let usedWidth = 0;
    let currentRow = sorted[0]?.atlasRow;

    for (const sprite of sorted) {
      const needed = sprite.pixelWidth + this.padding;
      const startsExplicitRow = usesExplicitRows && sprite.atlasRow !== currentRow;

      if (entries.length > 0 && (startsExplicitRow || shelfX + needed > this.maxWidth)) {
        shelfY += shelfHeight + this.padding;
        shelfX = this.padding;
        shelfHeight = 0;
      }
      currentRow = sprite.atlasRow;

      const bottom = shelfY + sprite.pixelHeight + this.padding;
      if (bottom > this.maxHeight) {
        throw new RangeError(
          `sprite "${sprite.id}" would exceed max atlas height of ${this.maxHeight}px`,
        );
      }

      entries.push({ ...sprite, atlasX: shelfX, atlasY: shelfY });

      shelfX += needed;
      shelfHeight = Math.max(shelfHeight, sprite.pixelHeight);
      usedWidth = Math.max(usedWidth, shelfX);
    }

    const atlasHeight = shelfY + shelfHeight + this.padding;
    const atlasWidth = nextPowerOfTwo(Math.max(usedWidth, 1));
    const atlasHeightPow2 = nextPowerOfTwo(Math.max(atlasHeight, 1));

    return { entries, atlasWidth, atlasHeight: atlasHeightPow2 };
  }

  private validate(sprites: readonly SpriteEntry[]): void {
    const seen = new Set<string>();
    const usesExplicitRows = sprites.some(s => s.atlasRow !== undefined);
    const rowWidths = new Map<number, number>();

    for (const s of sprites) {
      if (seen.has(s.id)) {
        throw new Error(`duplicate sprite id: "${s.id}"`);
      }
      seen.add(s.id);

      if (s.pixelWidth <= 0 || s.pixelHeight <= 0) {
        throw new RangeError(
          `sprite "${s.id}" has invalid dimensions: ${s.pixelWidth}x${s.pixelHeight}`,
        );
      }
      if (s.pixelWidth + this.padding * 2 > this.maxWidth) {
        throw new RangeError(
          `sprite "${s.id}" width ${s.pixelWidth}px exceeds max atlas width ${this.maxWidth}px`,
        );
      }
      if (s.pixelHeight + this.padding * 2 > this.maxHeight) {
        throw new RangeError(
          `sprite "${s.id}" height ${s.pixelHeight}px exceeds max atlas height ${this.maxHeight}px`,
        );
      }

      if (usesExplicitRows) {
        if (!Number.isInteger(s.atlasRow) || (s.atlasRow ?? -1) < 0) {
          throw new RangeError(`sprite "${s.id}" must have a non-negative integer atlasRow`);
        }
        const row = s.atlasRow as number;
        rowWidths.set(row, (rowWidths.get(row) ?? this.padding) + s.pixelWidth + this.padding);
      }
    }

    for (const [row, width] of rowWidths) {
      if (width > this.maxWidth) {
        throw new RangeError(
          `atlas row ${row} requires ${width}px and exceeds max atlas width ${this.maxWidth}px`,
        );
      }
    }
  }

  /** sorts by explicit row, then height desc, width desc, and id asc — deterministic */
  private sort(sprites: readonly SpriteEntry[]): SpriteEntry[] {
    return [...sprites].sort((a, b) => {
      if (a.atlasRow !== b.atlasRow) return (a.atlasRow ?? 0) - (b.atlasRow ?? 0);
      if (b.pixelHeight !== a.pixelHeight) return b.pixelHeight - a.pixelHeight;
      if (b.pixelWidth !== a.pixelWidth) return b.pixelWidth - a.pixelWidth;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }
}

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

