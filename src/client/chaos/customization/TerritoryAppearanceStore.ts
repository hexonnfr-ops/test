import {
  TerritoryAppearance,
  TerritoryAppearanceSchema,
} from "../../../chaos/customization/TerritorySkin";

const STORAGE_KEY = "territory-chaos:appearance:v1";

export function getSavedTerritoryAppearance(): TerritoryAppearance | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    const result = TerritoryAppearanceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function saveTerritoryAppearance(input: unknown): TerritoryAppearance {
  const parsed = TerritoryAppearanceSchema.parse(input);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  window.dispatchEvent(
    new CustomEvent("territory-chaos:appearance-changed", { detail: parsed }),
  );
  return parsed;
}

export function clearTerritoryAppearance(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("territory-chaos:appearance-changed"));
}
