// generates the TypeScript descriptor source from packing results — no file I/O

import type { PackedEntry } from "./AtlasPacker";

export type DescriptorOptions = {
  readonly atlasId: string;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly entries: readonly PackedEntry[];
};

/** returns the full TypeScript source string for a generated atlas descriptor */
export function generateDescriptor(opts: DescriptorOptions): string {
  const { atlasId, atlasWidth, atlasHeight, entries } = opts;

  const ids = entries.map(e => `"${e.id}"`).join(" | ");
  const upperAtlas = atlasId.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const spriteType = `${upperAtlas.charAt(0).toUpperCase()}${upperAtlas.slice(1)}SpriteId`;
  const spritesConst = `${upperAtlas.toUpperCase().replace(/-/g, "_")}_SPRITES`;

  const entryLines = entries
    .map(e =>
      `  "${e.id}": { id: "${e.id}", x: ${e.atlasX}, y: ${e.atlasY}, ` +
      `w: ${e.pixelWidth}, h: ${e.pixelHeight}, ` +
      `anchorX: ${e.anchorX}, anchorY: ${e.anchorY}, ` +
      `footprintW: ${e.footprintW}, footprintH: ${e.footprintH} }`,
    )
    .join(",\n");

  return [
    `// AUTO-GENERATED — do not edit manually. run \`pnpm atlas\` to regenerate.`,
    `// atlas: ${atlasWidth}x${atlasHeight}`,
    ``,
    `export type ${spriteType} =`,
    `  | ${ids};`,
    ``,
    `export type AtlasSpriteDescriptor = {`,
    `  readonly id: ${spriteType};`,
    `  readonly x: number;`,
    `  readonly y: number;`,
    `  readonly w: number;`,
    `  readonly h: number;`,
    `  readonly anchorX: number;`,
    `  readonly anchorY: number;`,
    `  readonly footprintW: number;`,
    `  readonly footprintH: number;`,
    `};`,
    ``,
    `export const ATLAS_WIDTH = ${atlasWidth};`,
    `export const ATLAS_HEIGHT = ${atlasHeight};`,
    ``,
    `export const ${spritesConst}: Readonly<Record<${spriteType}, AtlasSpriteDescriptor>> = {`,
    entryLines,
    `} as const;`,
    ``,
  ].join("\n");
}



