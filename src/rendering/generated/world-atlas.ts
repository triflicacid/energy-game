// AUTO-GENERATED — do not edit manually. run `pnpm atlas` to regenerate.
// atlas: 2048x512

export type WorldSpriteId =
  | "biome-coastal" | "biome-cold" | "biome-desert" | "biome-mountain" | "biome-offshore" | "biome-temperate" | "biome-volcanic" | "biome-wetland" | "reservoir-water-00" | "reservoir-water-01" | "reservoir-water-02" | "reservoir-water-03" | "reservoir-water-04" | "reservoir-water-05" | "reservoir-water-06" | "reservoir-water-07" | "reservoir-water-08" | "reservoir-water-09" | "reservoir-water-0a" | "reservoir-water-0b" | "reservoir-water-0c" | "reservoir-water-0d" | "reservoir-water-0e" | "reservoir-water-0f" | "forest-site" | "town" | "town-tier-1" | "town-tier-2" | "town-tier-3" | "town-tier-4" | "town-tier-5" | "town-tier-6" | "waterwheel" | "mechanical-workshop" | "innate-woodland-mature-full" | "innate-woodland-nearly-empty" | "innate-woodland-semi-harvested-sparse" | "planted-forest-freshly-planted" | "planted-forest-growing" | "planted-forest-mature-full" | "planted-forest-nearly-empty" | "planted-forest-semi-harvested-sparse";

export type AtlasSpriteDescriptor = {
  readonly id: WorldSpriteId;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly footprintW: number;
  readonly footprintH: number;
};

export const ATLAS_WIDTH = 2048;
export const ATLAS_HEIGHT = 512;

export const WORLD_SPRITES: Readonly<Record<WorldSpriteId, AtlasSpriteDescriptor>> = {
  "biome-coastal": { id: "biome-coastal", x: 2, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-cold": { id: "biome-cold", x: 68, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-desert": { id: "biome-desert", x: 134, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-mountain": { id: "biome-mountain", x: 200, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-offshore": { id: "biome-offshore", x: 266, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-temperate": { id: "biome-temperate", x: 332, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-volcanic": { id: "biome-volcanic", x: 398, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "biome-wetland": { id: "biome-wetland", x: 464, y: 2, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-00": { id: "reservoir-water-00", x: 2, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-01": { id: "reservoir-water-01", x: 68, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-02": { id: "reservoir-water-02", x: 134, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-03": { id: "reservoir-water-03", x: 200, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-04": { id: "reservoir-water-04", x: 266, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-05": { id: "reservoir-water-05", x: 332, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-06": { id: "reservoir-water-06", x: 398, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-07": { id: "reservoir-water-07", x: 464, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-08": { id: "reservoir-water-08", x: 530, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-09": { id: "reservoir-water-09", x: 596, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0a": { id: "reservoir-water-0a", x: 662, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0b": { id: "reservoir-water-0b", x: 728, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0c": { id: "reservoir-water-0c", x: 794, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0d": { id: "reservoir-water-0d", x: 860, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0e": { id: "reservoir-water-0e", x: 926, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "reservoir-water-0f": { id: "reservoir-water-0f", x: 992, y: 68, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "forest-site": { id: "forest-site", x: 2, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town": { id: "town", x: 68, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-1": { id: "town-tier-1", x: 134, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-2": { id: "town-tier-2", x: 200, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-3": { id: "town-tier-3", x: 266, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-4": { id: "town-tier-4", x: 332, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-5": { id: "town-tier-5", x: 398, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "town-tier-6": { id: "town-tier-6", x: 464, y: 134, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "waterwheel": { id: "waterwheel", x: 2, y: 200, w: 64, h: 80, anchorX: 0, anchorY: 16, footprintW: 1, footprintH: 1 },
  "mechanical-workshop": { id: "mechanical-workshop", x: 68, y: 200, w: 128, h: 64, anchorX: 0, anchorY: 0, footprintW: 2, footprintH: 1 },
  "innate-woodland-mature-full": { id: "innate-woodland-mature-full", x: 2, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "innate-woodland-nearly-empty": { id: "innate-woodland-nearly-empty", x: 68, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "innate-woodland-semi-harvested-sparse": { id: "innate-woodland-semi-harvested-sparse", x: 134, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "planted-forest-freshly-planted": { id: "planted-forest-freshly-planted", x: 200, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "planted-forest-growing": { id: "planted-forest-growing", x: 266, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "planted-forest-mature-full": { id: "planted-forest-mature-full", x: 332, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "planted-forest-nearly-empty": { id: "planted-forest-nearly-empty", x: 398, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 },
  "planted-forest-semi-harvested-sparse": { id: "planted-forest-semi-harvested-sparse", x: 464, y: 282, w: 64, h: 64, anchorX: 0, anchorY: 0, footprintW: 1, footprintH: 1 }
} as const;
