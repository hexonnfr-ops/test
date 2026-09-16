import { describe, expect, it } from "vitest";
import {
  DEFAULT_ULTRA_VISUAL_SETTINGS,
  normalizeUltraVisualSettings,
} from "../../src/client/ultra/UltraVisualSettings";

describe("UltraVisualSettings", () => {
  it("keeps the four visual systems independent", () => {
    const settings = normalizeUltraVisualSettings({
      ultraGraphics: true,
      real3D: false,
      betterUI: true,
      cinematicEffects: false,
    });

    expect(settings.ultraGraphics).toBe(true);
    expect(settings.real3D).toBe(false);
    expect(settings.betterUI).toBe(true);
    expect(settings.cinematicEffects).toBe(false);
  });

  it("clamps numeric controls to safe renderer ranges", () => {
    const settings = normalizeUltraVisualSettings({
      countryColorStrength: 500,
      terrainHeight: -3,
      waveHeight: Number.POSITIVE_INFINITY,
    });

    expect(settings.countryColorStrength).toBe(100);
    expect(settings.terrainHeight).toBe(0);
    expect(settings.waveHeight).toBe(DEFAULT_ULTRA_VISUAL_SETTINGS.waveHeight);
  });
});
