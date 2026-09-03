import { describe, expect, it } from "vitest";
import {
  detectImageMime,
  safeStorageObjectName,
  validateDecodedDimensions,
  validateUploadEnvelope,
} from "../../src/chaos/customization/TerritorySkinValidation";


describe("TerritorySkinValidation", () => {
  it("detects supported signatures", () => {
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });

  it("rejects MIME spoofing", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateUploadEnvelope(png, "image/jpeg")).toThrow(/does not match/);
  });

  it("rejects oversized decoded images", () => {
    expect(() => validateDecodedDimensions(4097, 1, 4096)).toThrow();
  });

  it("creates traversal-safe hash paths", () => {
    const hash = "a".repeat(64);
    expect(safeStorageObjectName(hash, "image/webp")).toBe(`territory-skins/aa/${hash}.webp`);
    expect(() => safeStorageObjectName("../evil", "image/png")).toThrow();
  });
});
