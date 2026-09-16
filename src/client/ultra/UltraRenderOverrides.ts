import type { RenderSettings } from "../render/gl/RenderSettings";
import type { UltraVisualSettings } from "./UltraVisualSettings";

/**
 * Applies the first OpenFront Ultra visual layer directly to the real WebGL
 * renderer settings. This intentionally changes presentation only: simulation,
 * networking and authoritative game state are untouched.
 */
export function applyUltraRenderOverrides(
  settings: RenderSettings,
  ultra: UltraVisualSettings,
): void {
  if (!ultra.ultraGraphics) return;

  // Natural terrain/ocean palette with enough contrast for strategic overlays.
  settings.terrain.backgroundColor = "#050b12";
  settings.terrain.oceanColor = "#0b3552";
  settings.terrain.sandColor = "#b8aa75";
  settings.terrain.plainsColor = "#5f8156";
  settings.terrain.highlandColor = "#776f59";
  settings.terrain.mountainColor = "#c3c6c4";

  // Keep ownership readable without burying the terrain under opaque country
  // paint. 0% still keeps a faint tactical overlay; 100% approaches classic.
  const tint = ultra.countryColorStrength / 100;
  settings.mapOverlay.territoryAlpha = 0.18 + tint * 0.72;
  settings.mapOverlay.territorySaturation = 0.86 + tint * 0.14;
  settings.mapOverlay.trailAlpha = Math.max(settings.mapOverlay.trailAlpha, 0.78);
  settings.mapOverlay.highlightBrighten = Math.max(
    settings.mapOverlay.highlightBrighten,
    0.18,
  );
  settings.mapOverlay.highlightThicken = Math.max(
    settings.mapOverlay.highlightThicken,
    1.15,
  );

  settings.lighting.enabled = true;
  settings.lighting.ambient = ultra.cinematicEffects ? 0.62 : 0.74;
  settings.railroad.railAlpha = Math.max(settings.railroad.railAlpha, 0.78);
  settings.railroad.railThickness = Math.max(
    settings.railroad.railThickness,
    1.08,
  );
}
