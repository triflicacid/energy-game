import { describe, it, expect } from "vitest";
import {
  MAX_ZOOM,
  getMinZoom,
  clampZoom,
  clampPan,
  zoomTowardPoint,
  screenToWorld,
  worldToScreen,
} from "./CameraState";

const CS = 64;

describe("MAX_ZOOM", () => {
  it("is 10", () => {
    expect(MAX_ZOOM).toBe(10);
  });
});

describe("getMinZoom", () => {
  it("returns scale that fits sector width when width is the tighter constraint", () => {
    const zoom = getMinZoom(640, 1000, 12, 8, CS);
    expect(zoom).toBeCloseTo(640 / (12 * CS));
  });

  it("returns scale that fits sector height when height is the tighter constraint", () => {
    const zoom = getMinZoom(1000, 480, 8, 12, CS);
    expect(zoom).toBeCloseTo(480 / (12 * CS));
  });

  it("returns the same value when width and height produce equal constraints", () => {
    const zoom = getMinZoom(768, 768, 12, 12, CS);
    expect(zoom).toBeCloseTo(768 / (12 * CS));
  });

  it("returns 1 as fallback when viewport width is zero", () => {
    expect(getMinZoom(0, 600, 12, 12, CS)).toBe(1);
  });

  it("returns 1 as fallback when viewport height is zero", () => {
    expect(getMinZoom(800, 0, 12, 12, CS)).toBe(1);
  });

  it("returns 1 as fallback when both viewport dimensions are zero", () => {
    expect(getMinZoom(0, 0, 12, 12, CS)).toBe(1);
  });

  it("returns 1 as fallback when sector has zero columns", () => {
    expect(getMinZoom(640, 480, 0, 12, CS)).toBe(1);
  });
});

describe("clampZoom", () => {
  it("returns minZoom when the candidate is below it", () => {
    expect(clampZoom(0.1, 0.5)).toBe(0.5);
  });

  it("returns MAX_ZOOM when the candidate exceeds it", () => {
    expect(clampZoom(999, 0.5)).toBe(MAX_ZOOM);
  });

  it("returns the value unchanged when it is within bounds", () => {
    expect(clampZoom(2, 0.5)).toBe(2);
  });

  it("returns minZoom when the candidate exactly equals it", () => {
    expect(clampZoom(0.5, 0.5)).toBe(0.5);
  });

  it("returns MAX_ZOOM when the candidate exactly equals it", () => {
    expect(clampZoom(MAX_ZOOM, 0.5)).toBe(MAX_ZOOM);
  });
});

describe("clampPan", () => {
  it("clamps panX below zero to zero", () => {
    const { panX } = clampPan(-50, 0, 1, 640, 480, 12, 12, CS);
    expect(panX).toBe(0);
  });

  it("clamps panY below zero to zero", () => {
    const { panY } = clampPan(0, -50, 1, 640, 480, 12, 12, CS);
    expect(panY).toBe(0);
  });

  it("clamps panX beyond the right edge of the sector", () => {
    const zoom = 2;
    const sectorW = 12 * CS;
    const visibleW = 640 / zoom;
    const maxPan = sectorW - visibleW;
    const { panX } = clampPan(9999, 0, zoom, 640, 480, 12, 12, CS);
    expect(panX).toBeCloseTo(maxPan);
  });

  it("clamps panY beyond the bottom edge of the sector", () => {
    const zoom = 2;
    const sectorH = 12 * CS;
    const visibleH = 480 / zoom;
    const maxPan = sectorH - visibleH;
    const { panY } = clampPan(0, 9999, zoom, 640, 480, 12, 12, CS);
    expect(panY).toBeCloseTo(maxPan);
  });

  it("centers the sector horizontally when the viewport is wider than the sector", () => {
    const extraW = 100;
    const viewportW = 12 * CS + extraW; // sector=768, viewport=868 → void = 100px → center offset = -50
    const { panX } = clampPan(200, 0, 1, viewportW, 480, 12, 12, CS);
    expect(panX).toBeCloseTo(-50);
  });

  it("centers the sector vertically when the viewport is taller than the sector", () => {
    const extraH = 80;
    const viewportH = 12 * CS + extraH; // sector=768, viewport=848 → void = 80px → center offset = -40
    const { panY } = clampPan(0, 200, 1, 640, viewportH, 12, 12, CS);
    expect(panY).toBeCloseTo(-40);
  });

  it("returns 0,0 unchanged when pan is already at origin", () => {
    const result = clampPan(0, 0, 2, 640, 480, 12, 12, CS);
    expect(result.panX).toBe(0);
    expect(result.panY).toBe(0);
  });
});

describe("zoomTowardPoint", () => {
  it("keeps the world point under the cursor in the same screen position", () => {
    const panX = 0;
    const panY = 0;
    const oldZoom = 1;
    const screenX = 100;
    const screenY = 80;
    const newZoom = 2;
    const { panX: newPanX, panY: newPanY } = zoomTowardPoint(panX, panY, oldZoom, screenX, screenY, newZoom);
    const worldBefore = { x: screenX / oldZoom + panX, y: screenY / oldZoom + panY };
    const worldAfter = { x: screenX / newZoom + newPanX, y: screenY / newZoom + newPanY };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("keeps the pivot point fixed when zooming out", () => {
    const panX = 50;
    const panY = 30;
    const oldZoom = 2;
    const screenX = 320;
    const screenY = 240;
    const newZoom = 1;
    const { panX: newPanX, panY: newPanY } = zoomTowardPoint(panX, panY, oldZoom, screenX, screenY, newZoom);
    const worldBefore = { x: screenX / oldZoom + panX, y: screenY / oldZoom + panY };
    const worldAfter = { x: screenX / newZoom + newPanX, y: screenY / newZoom + newPanY };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("does not change pan when new zoom equals old zoom", () => {
    const { panX, panY } = zoomTowardPoint(50, 80, 2, 300, 200, 2);
    expect(panX).toBeCloseTo(50);
    expect(panY).toBeCloseTo(80);
  });
});

describe("screenToWorld", () => {
  it("converts the screen origin to the pan position when zoom is 1", () => {
    const { x, y } = screenToWorld(0, 0, 100, 200, 1);
    expect(x).toBe(100);
    expect(y).toBe(200);
  });

  it("accounts for zoom by dividing screen delta by zoom", () => {
    const { x, y } = screenToWorld(200, 160, 0, 0, 2);
    expect(x).toBe(100);
    expect(y).toBe(80);
  });

  it("combines pan and zoom correctly", () => {
    const { x, y } = screenToWorld(200, 100, 50, 30, 2);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(80);
  });
});

describe("worldToScreen", () => {
  it("converts the pan position to screen origin when zoom is 1", () => {
    const { x, y } = worldToScreen(100, 200, 100, 200, 1);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it("is the inverse of screenToWorld for arbitrary values", () => {
    const worldX = 150;
    const worldY = 250;
    const panX = 20;
    const panY = 30;
    const zoom = 1.5;
    const screen = worldToScreen(worldX, worldY, panX, panY, zoom);
    const back = screenToWorld(screen.x, screen.y, panX, panY, zoom);
    expect(back.x).toBeCloseTo(worldX);
    expect(back.y).toBeCloseTo(worldY);
  });

  it("scales world distance by zoom", () => {
    const { x, y } = worldToScreen(200, 100, 0, 0, 2);
    expect(x).toBe(400);
    expect(y).toBe(200);
  });
});


