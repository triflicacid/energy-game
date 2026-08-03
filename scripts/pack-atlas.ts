// atlas packing build script
// usage:
//   node scripts/pack-atlas.ts [--check]
//   --check  compare output with existing files; exit 1 if stale (for CI)

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import sharp from "sharp";
import { AtlasPacker, type SpriteEntry } from "../src/rendering/AtlasPacker.ts";
import { generateDescriptor } from "../src/rendering/DescriptorWriter.ts";

const CHECK_MODE = process.argv.includes("--check");
const ROOT = resolve(import.meta.dirname, "..");
const SPRITES_DIR = join(ROOT, "assets", "sprites");

type SpriteManifest = {
  atlasId: string;
  cellSize: number;
  padding: number;
  maxWidth: number;
  maxHeight: number;
  outputPng: string;
  outputTs: string;
  sprites: {
    id: string;
    src: string;
    atlasRow?: number;
    pixelWidth: number;
    pixelHeight: number;
    footprintW: number;
    footprintH: number;
    anchorX: number;
    anchorY: number;
  }[];
};

async function run(manifestPath: string): Promise<void> {
  const manifest: SpriteManifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const entries: SpriteEntry[] = manifest.sprites.map(s => ({
    id: s.id,
    atlasRow: s.atlasRow,
    pixelWidth: s.pixelWidth,
    pixelHeight: s.pixelHeight,
    anchorX: s.anchorX,
    anchorY: s.anchorY,
    footprintW: s.footprintW,
    footprintH: s.footprintH,
  }));

  const packer = new AtlasPacker({
    padding: manifest.padding,
    maxWidth: manifest.maxWidth,
    maxHeight: manifest.maxHeight,
  });

  const packed = packer.pack(entries);

  const atlasImage = sharp({
    create: {
      width: packed.atlasWidth,
      height: packed.atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composites: sharp.OverlayOptions[] = await Promise.all(
    packed.entries.map(async (entry) => {
      const srcEntry = manifest.sprites.find(s => s.id === entry.id);
      if (!srcEntry) throw new Error(`missing manifest entry for "${entry.id}"`);
      const srcPath = join(SPRITES_DIR, srcEntry.src);
      if (!existsSync(srcPath)) throw new Error(`source file not found: ${srcPath}`);

      const buf = await sharp(readFileSync(srcPath))
        .resize(entry.pixelWidth, entry.pixelHeight, { fit: "fill" })
        .png()
        .toBuffer();

      return { input: buf, left: entry.atlasX, top: entry.atlasY };
    }),
  );

  const pngBuffer = await atlasImage.composite(composites).png({ compressionLevel: 9 }).toBuffer();

  const tsSource = generateDescriptor({
    atlasId: manifest.atlasId,
    atlasWidth: packed.atlasWidth,
    atlasHeight: packed.atlasHeight,
    entries: packed.entries,
  });

  const outPng = join(ROOT, manifest.outputPng);
  const outTs = join(ROOT, manifest.outputTs);

  if (CHECK_MODE) {
    checkFile(outPng, pngBuffer, manifest.outputPng);
    checkFile(outTs, Buffer.from(tsSource, "utf8"), manifest.outputTs);
    console.log(`atlas check passed: ${manifest.atlasId}`);
    return;
  }

  mkdirSync(dirname(outPng), { recursive: true });
  writeFileSync(outPng, pngBuffer);
  writeFileSync(outTs, tsSource, "utf8");
  console.log(
    `atlas packed: ${manifest.atlasId}  ` +
    `${packed.atlasWidth}x${packed.atlasHeight}  ` +
    `${packed.entries.length} sprites → ${manifest.outputPng}`,
  );
}

function checkFile(path: string, expected: Buffer, label: string): void {
  if (!existsSync(path)) {
    console.error(`stale: ${label} does not exist — run \`pnpm atlas\` to generate`);
    process.exit(1);
  }
  const actual = readFileSync(path);
  const expectedHash = sha256(expected);
  const actualHash = sha256(actual);
  if (expectedHash !== actualHash) {
    console.error(`stale: ${label} is out of date — run \`pnpm atlas\` to regenerate`);
    process.exit(1);
  }
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

const manifestPath = join(SPRITES_DIR, "world.manifest.json");
await run(manifestPath);


