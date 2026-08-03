// generates the complete four-neighbour reservoir-water autotile set

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const OUTPUT_DIR = join(resolve(import.meta.dirname, ".."), "assets", "sprites", "world");
const NORTH = 0x1;
const EAST = 0x2;
const SOUTH = 0x4;
const WEST = 0x8;

function rect(x: number, y: number, width: number, height: number, fill: string): string {
  return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

function createReservoirSvg(mask: number): string {
  const north = (mask & NORTH) !== 0;
  const east = (mask & EAST) !== 0;
  const south = (mask & SOUTH) !== 0;
  const west = (mask & WEST) !== 0;
  const shapes: string[] = [];

  // Rounded dark shoreline and central water body.
  shapes.push(rect(1, 1, 14, 14, "#18241f"));
  shapes.push(rect(2, 1, 12, 14, "#143858"));
  shapes.push(rect(1, 2, 14, 12, "#143858"));

  // Connected arms expose an identical 12-pixel water span at each edge.
  if (north) {
    shapes.push(rect(1, 0, 14, 3, "#18241f"));
    shapes.push(rect(2, 0, 12, 3, "#143858"));
  }
  if (east) {
    shapes.push(rect(13, 1, 3, 14, "#18241f"));
    shapes.push(rect(13, 2, 3, 12, "#143858"));
  }
  if (south) {
    shapes.push(rect(1, 13, 14, 3, "#18241f"));
    shapes.push(rect(2, 13, 12, 3, "#143858"));
  }
  if (west) {
    shapes.push(rect(0, 1, 3, 14, "#18241f"));
    shapes.push(rect(0, 2, 3, 12, "#143858"));
  }

  // Bank highlights appear only on closed shores.
  if (!north) shapes.push(rect(3, 1, 10, 1, "#5a4a2b"));
  if (!east) shapes.push(rect(14, 3, 1, 10, "#443923"));
  if (!south) shapes.push(rect(3, 14, 10, 1, "#2f2c1d"));
  if (!west) shapes.push(rect(1, 3, 1, 10, "#4b4027"));

  // Interior ripples never touch an edge, so every variant joins cleanly.
  shapes.push(rect(3, 5, 5, 1, "#1a5070"));
  shapes.push(rect(9, 9, 4, 1, "#1a5070"));
  shapes.push(rect(5, 12, 3, 1, "#10304d"));

  const hex = mask.toString(16).padStart(2, "0");
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">',
    `  <!-- reservoir-water-${hex}: N=1 E=2 S=4 W=8 -->`,
    ...shapes,
    "</svg>",
    "",
  ].join("\n");
}

mkdirSync(OUTPUT_DIR, { recursive: true });
for (let mask = 0; mask <= 0xf; mask += 1) {
  const hex = mask.toString(16).padStart(2, "0");
  writeFileSync(join(OUTPUT_DIR, `reservoir-water-${hex}.svg`), createReservoirSvg(mask), "utf8");
}

console.log("generated 16 reservoir autotile sprites");


