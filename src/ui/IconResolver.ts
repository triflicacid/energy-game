// UI-layer icon resolution: crops sprites out of the same world atlas sheet the canvas
// renderer already loads. There is no second icon-loading pipeline.

import { ATLAS_HEIGHT, ATLAS_WIDTH, WORLD_ATLAS_URL, WORLD_SPRITES, type WorldSpriteId } from "@rendering";

/** CSS background properties that crop one sprite out of the atlas sheet */
export type ResolvedIconStyle = {
  readonly backgroundImage: string;
  readonly backgroundPosition: string;
  readonly backgroundSize: string;
  readonly width: string;
  readonly height: string;
};

/** narrows a content-defined iconId string to a sprite id known to the world atlas */
export function hasIcon(iconId: string): iconId is WorldSpriteId {
  return Object.hasOwn(WORLD_SPRITES, iconId);
}

/** returns CSS background properties that display the given sprite from the world atlas */
export function resolveIconStyle(iconId: WorldSpriteId): ResolvedIconStyle {
  const sprite = WORLD_SPRITES[iconId];
  return {
    backgroundImage: `url(${WORLD_ATLAS_URL})`,
    backgroundPosition: `-${sprite.x}px -${sprite.y}px`,
    backgroundSize: `${ATLAS_WIDTH}px ${ATLAS_HEIGHT}px`,
    width: `${sprite.w}px`,
    height: `${sprite.h}px`,
  };
}
