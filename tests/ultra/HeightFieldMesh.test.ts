import { describe, expect, it } from "vitest";
import {
  buildHeightFieldMesh,
  terrainByteToHeight,
} from "../../src/client/ultra/renderer/HeightFieldMesh";

describe("HeightFieldMesh", () => {
  it("creates genuine indexed xyz terrain geometry", () => {
    const land = 0x80;
    const terrain = new Uint8Array([
      land | 0,
      land | 10,
      land | 0,
      land | 20,
    ]);
    const mesh = buildHeightFieldMesh(terrain, 2, 2);

    expect(mesh.positions.length).toBe(12);
    expect(mesh.normals.length).toBe(12);
    expect(mesh.uvs.length).toBe(8);
    expect(Array.from(mesh.indices)).toEqual([0, 2, 1, 1, 2, 3]);
    expect(mesh.positions[2]).toBe(0);
    expect(mesh.positions[5]).toBeGreaterThan(0);
    expect(mesh.positions[11]).toBeGreaterThan(mesh.positions[5]);
  });

  it("keeps ocean below the coastline and mountains above it", () => {
    const deepOcean = 10;
    const shorelineLand = 0x80 | 0x40;
    const mountain = 0x80 | 25;

    expect(terrainByteToHeight(deepOcean)).toBeLessThan(0);
    expect(terrainByteToHeight(shorelineLand)).toBeGreaterThan(0);
    expect(terrainByteToHeight(mountain)).toBeGreaterThan(
      terrainByteToHeight(shorelineLand),
    );
  });

  it("supports LOD sampling while preserving the final map edge", () => {
    const terrain = new Uint8Array(7 * 5).fill(0x80 | 8);
    const mesh = buildHeightFieldMesh(terrain, 7, 5, { stride: 3 });

    expect(mesh.columns).toBe(3); // x = 0, 3, 6
    expect(mesh.rows).toBe(3); // y = 0, 3, 4
    const last = mesh.positions.length - 3;
    expect(mesh.positions[last]).toBe(6);
    expect(mesh.positions[last + 1]).toBe(4);
  });
});
