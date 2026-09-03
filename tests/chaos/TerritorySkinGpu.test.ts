import { describe, expect, it } from "vitest";
import { TerritoryAppearanceSchema } from "../../src/chaos/customization/TerritorySkin";
import {
  encodeTerritorySkinGpuMetadata,
  TERRITORY_SKIN_MODE_ID,
} from "../../src/client/chaos/customization/TerritorySkinGpu";

const asset = {
  id: "a".repeat(64),
  sha256: "a".repeat(64),
  mime: "image/webp" as const,
  width: 800,
  height: 400,
  byteLength: 1024,
  publicUrl: "https://example.com/territory.webp",
};

describe("TerritorySkinGpu", () => {
  it("encodes cover mode, aspect ratio and radians", () => {
    const appearance = TerritoryAppearanceSchema.parse({
      asset,
      render: {
        mode: "cover",
        opacity: 0.75,
        scale: 1.5,
        rotationDeg: 90,
        offsetX: 0.25,
        offsetY: -0.5,
        tileScale: 2,
        flagRepeat: 4,
        dynamicMinScale: 0.5,
        dynamicMaxScale: 4,
      },
    });
    const gpu = encodeTerritorySkinGpuMetadata(appearance, {
      minX: 10,
      minY: 20,
      maxX: 109,
      maxY: 69,
    });
    expect(gpu.bounds).toEqual([10, 20, 109, 69]);
    expect(gpu.params[0]).toBe(TERRITORY_SKIN_MODE_ID.cover);
    expect(gpu.params[1]).toBe(0.75);
    expect(gpu.params[2]).toBe(1.5);
    expect(gpu.params[3]).toBeCloseTo(Math.PI / 2);
    expect(gpu.extra).toEqual([0.25, -0.5, 2, 2]);
  });

  it("scales dynamic skins with bounded territory area", () => {
    const appearance = TerritoryAppearanceSchema.parse({
      asset,
      render: {
        mode: "dynamic",
        opacity: 1,
        scale: 1,
        rotationDeg: 0,
        offsetX: 0,
        offsetY: 0,
        tileScale: 1,
        flagRepeat: 4,
        dynamicMinScale: 0.5,
        dynamicMaxScale: 2,
      },
    });
    const gpu = encodeTerritorySkinGpuMetadata(appearance, {
      minX: 0,
      minY: 0,
      maxX: 2047,
      maxY: 2047,
    });
    expect(gpu.params[2]).toBe(2);
  });
});
