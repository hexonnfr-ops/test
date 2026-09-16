export const ULTRA_SETTINGS_STORAGE_KEY = "openfront:ultra-visual-settings:v1";
export const ULTRA_SETTINGS_CHANGED_EVENT = "openfront-ultra-settings-changed";

export interface UltraVisualSettings {
  ultraGraphics: boolean;
  real3D: boolean;
  betterUI: boolean;
  cinematicEffects: boolean;
  countryColorStrength: number;
  terrainHeight: number;
  waveHeight: number;
}

export const DEFAULT_ULTRA_VISUAL_SETTINGS: Readonly<UltraVisualSettings> = {
  ultraGraphics: true,
  real3D: false,
  betterUI: true,
  cinematicEffects: true,
  countryColorStrength: 58,
  terrainHeight: 1,
  waveHeight: 1,
};

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeUltraVisualSettings(
  value: Partial<UltraVisualSettings> | null | undefined,
): UltraVisualSettings {
  const defaults = DEFAULT_ULTRA_VISUAL_SETTINGS;
  return {
    ultraGraphics:
      typeof value?.ultraGraphics === "boolean"
        ? value.ultraGraphics
        : defaults.ultraGraphics,
    real3D:
      typeof value?.real3D === "boolean" ? value.real3D : defaults.real3D,
    betterUI:
      typeof value?.betterUI === "boolean" ? value.betterUI : defaults.betterUI,
    cinematicEffects:
      typeof value?.cinematicEffects === "boolean"
        ? value.cinematicEffects
        : defaults.cinematicEffects,
    countryColorStrength: clamp(
      finiteNumber(value?.countryColorStrength, defaults.countryColorStrength),
      0,
      100,
    ),
    terrainHeight: clamp(
      finiteNumber(value?.terrainHeight, defaults.terrainHeight),
      0,
      3,
    ),
    waveHeight: clamp(
      finiteNumber(value?.waveHeight, defaults.waveHeight),
      0,
      3,
    ),
  };
}

export function readUltraVisualSettings(): UltraVisualSettings {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_ULTRA_VISUAL_SETTINGS };
  }

  const raw = localStorage.getItem(ULTRA_SETTINGS_STORAGE_KEY);
  if (raw === null) return { ...DEFAULT_ULTRA_VISUAL_SETTINGS };

  try {
    return normalizeUltraVisualSettings(
      JSON.parse(raw) as Partial<UltraVisualSettings>,
    );
  } catch {
    return { ...DEFAULT_ULTRA_VISUAL_SETTINGS };
  }
}

export function writeUltraVisualSettings(
  value: Partial<UltraVisualSettings>,
): UltraVisualSettings {
  const next = normalizeUltraVisualSettings({
    ...readUltraVisualSettings(),
    ...value,
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ULTRA_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent<UltraVisualSettings>(ULTRA_SETTINGS_CHANGED_EVENT, {
        detail: next,
      }),
    );
  }

  return next;
}
