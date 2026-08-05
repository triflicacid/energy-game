// generates innate-woodland and planted-forest lifecycle sprites

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const OUTPUT_DIR = join(resolve(import.meta.dirname, ".."), "assets", "sprites", "world");
const DARK_FOLIAGE = "#1e4820";
const MID_FOLIAGE = "#2a6828";
const LIGHT_FOLIAGE = "#3a8838";
const TRUNK = "#5a3212";
const CUT_WOOD = "#8a5525";

type ForestSprite = {
  readonly id: string;
  readonly shapes: readonly string[];
};

function rect(x: number, y: number, width: number, height: number, fill: string): string {
  return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

function tree(x: number, groundY: number, canopyWidth: number, canopyHeight: number): readonly string[] {
  const canopyY = groundY - canopyHeight - 2;
  const trunkX = x + Math.floor((canopyWidth - 1) / 2);
  const highlightWidth = Math.max(1, canopyWidth - 2);

  return [
    rect(trunkX, groundY - 3, canopyWidth >= 5 ? 2 : 1, 3, TRUNK),
    rect(x + 1, canopyY, Math.max(1, canopyWidth - 2), 1, DARK_FOLIAGE),
    rect(x, canopyY + 1, canopyWidth, canopyHeight - 1, DARK_FOLIAGE),
    rect(x + 1, canopyY + 2, highlightWidth, Math.max(1, Math.floor(canopyHeight / 2)), MID_FOLIAGE),
    rect(x + Math.floor(canopyWidth / 2), canopyY + 1, 1, Math.max(1, Math.floor(canopyHeight / 3)), LIGHT_FOLIAGE),
  ];
}

function sapling(x: number, groundY: number, height: number): readonly string[] {
  const crownY = groundY - height;
  return [
    rect(x + 1, crownY + 1, 1, height - 1, TRUNK),
    rect(x, crownY, 3, 2, MID_FOLIAGE),
    rect(x + 1, crownY, 1, 1, LIGHT_FOLIAGE),
  ];
}

function stump(x: number, groundY: number): readonly string[] {
  return [rect(x, groundY - 2, 2, 2, TRUNK), rect(x, groundY - 2, 2, 1, CUT_WOOD)];
}

function createForestSvg(sprite: ForestSprite): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">',
    `  <!-- ${sprite.id} -->`,
    ...sprite.shapes,
    "</svg>",
    "",
  ].join("\n");
}

const sprites: readonly ForestSprite[] = [
  {
    id: "innate-woodland-mature-full",
    shapes: [...tree(0, 14, 5, 7), ...tree(5, 14, 6, 10), ...tree(11, 14, 5, 8)],
  },
  {
    id: "innate-woodland-semi-harvested-sparse",
    shapes: [...tree(1, 14, 5, 8), ...stump(7, 14), ...tree(10, 14, 4, 6), ...stump(14, 14)],
  },
  {
    id: "innate-woodland-nearly-empty",
    shapes: [...stump(1, 14), ...stump(4, 14), ...tree(7, 14, 4, 6), ...stump(12, 14)],
  },
  {
    id: "planted-forest-freshly-planted",
    shapes: [...sapling(0, 14, 3), ...sapling(4, 14, 3), ...sapling(8, 14, 3), ...sapling(12, 14, 3)],
  },
  {
    id: "planted-forest-growing",
    shapes: [...tree(0, 14, 4, 5), ...tree(4, 14, 4, 7), ...tree(8, 14, 4, 6), ...tree(12, 14, 4, 7)],
  },
  {
    id: "planted-forest-mature-full",
    shapes: [...tree(0, 14, 4, 8), ...tree(4, 14, 4, 9), ...tree(8, 14, 4, 8), ...tree(12, 14, 4, 9)],
  },
  {
    id: "planted-forest-semi-harvested-sparse",
    shapes: [...tree(0, 14, 4, 8), ...stump(5, 14), ...tree(8, 14, 4, 8), ...stump(13, 14)],
  },
  {
    id: "planted-forest-nearly-empty",
    shapes: [...stump(1, 14), ...stump(5, 14), ...tree(8, 14, 4, 6), ...stump(13, 14)],
  },
];

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const sprite of sprites) {
  writeFileSync(join(OUTPUT_DIR, `${sprite.id}.svg`), createForestSvg(sprite), "utf8");
}

console.log(`generated ${sprites.length} forest lifecycle sprites`);

