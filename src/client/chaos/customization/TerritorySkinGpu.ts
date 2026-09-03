import type {
  TerritoryAppearance,
  TerritorySkinMode,
} from "../../../chaos/customization/TerritorySkin";

export interface TerritorySkinBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TerritorySkinGpuMetadata {
  /** minX, minY, maxX, maxY */
  bounds: readonly [number, number, number, number];
  /** modeId, opacity, scale, rotationRadians */
  params: readonly [number, number, number, number];
  /** offsetX, offsetY, imageAspect, repeat */
  extra: readonly [number, number, number, number];
}

export const TERRITORY_SKIN_MODE_ID: Readonly<Record<TerritorySkinMode, number>> = {
  stretch: 1,
  cover: 2,
  contain: 3,
  tile: 4,
  "center-logo": 5,
  "flag-texture": 6,
  dynamic: 7,
};

export function encodeTerritorySkinGpuMetadata(
  appearance: TerritoryAppearance,
  bounds: TerritorySkinBounds,
): TerritorySkinGpuMetadata {
  const asset = appearance.asset;
  if (asset === undefined) {
    throw new Error("Cannot encode GPU metadata without a territory skin asset");
  }
  const width = Math.max(1, bounds.maxX - bounds.minX + 1);
  const height = Math.max(1, bounds.maxY - bounds.minY + 1);
  if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) {
    throw new Error("Territory skin bounds must be finite");
  }
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    throw new Error("Territory skin bounds are inverted");
  }

  const render = appearance.render;
  const imageAspect = asset.width / Math.max(1, asset.height);
  const repeat =
    render.mode === "flag-texture" ? render.flagRepeat : render.tileScale;

  // Dynamic mode grows with territory area but remains bounded by the user's
  // explicit limits. The shader still clips by the exact owner mask, so this
  // only controls UV scale; it never changes ownership geometry.
  const areaScale = Math.sqrt(width * height) / 128;
  const dynamicScale = Math.min(
    render.dynamicMaxScale,
    Math.max(render.dynamicMinScale, areaScale),
  );
  const effectiveScale = render.mode === "dynamic" ? render.scale * dynamicScale : render.scale;

  return {
    bounds: [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
    params: [
      TERRITORY_SKIN_MODE_ID[render.mode],
      render.opacity,
      effectiveScale,
      (render.rotationDeg * Math.PI) / 180,
    ],
    extra: [render.offsetX, render.offsetY, imageAspect, repeat],
  };
}

export function gpuMetadataKey(metadata: TerritorySkinGpuMetadata): string {
  // Used only as a client-side change detector to avoid redundant texture
  // uploads. Values originate from validated bounded schemas, so a compact
  // stable join is sufficient and avoids object allocation in render code.
  return `${metadata.bounds.join(",")}|${metadata.params.join(",")}|${metadata.extra.join(",")}`;
}
