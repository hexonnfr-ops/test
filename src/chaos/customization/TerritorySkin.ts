import { z } from "zod";

export const TerritorySkinModeSchema = z.enum([
  "stretch",
  "cover",
  "contain",
  "tile",
  "center-logo",
  "flag-texture",
  "dynamic",
]);

export type TerritorySkinMode = z.infer<typeof TerritorySkinModeSchema>;

export const TerritorySkinAssetSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{64}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().min(1).max(1024),
    height: z.number().int().min(1).max(1024),
    byteLength: z.number().int().min(1).max(3 * 1024 * 1024),
    publicUrl: z.string().url().max(2048),
  })
  .strict();

export type TerritorySkinAsset = z.infer<typeof TerritorySkinAssetSchema>;

export const TerritorySkinRenderSchema = z
  .object({
    mode: TerritorySkinModeSchema.default("cover"),
    opacity: z.number().finite().min(0.05).max(1).default(1),
    scale: z.number().finite().min(0.05).max(20).default(1),
    rotationDeg: z.number().finite().min(-180).max(180).default(0),
    offsetX: z.number().finite().min(-2).max(2).default(0),
    offsetY: z.number().finite().min(-2).max(2).default(0),
    tileScale: z.number().finite().min(0.05).max(20).default(1),
    flagRepeat: z.number().finite().min(0.25).max(32).default(4),
    dynamicMinScale: z.number().finite().min(0.05).max(10).default(0.5),
    dynamicMaxScale: z.number().finite().min(0.05).max(20).default(4),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.dynamicMinScale > value.dynamicMaxScale) {
      ctx.addIssue({
        code: "custom",
        path: ["dynamicMinScale"],
        message: "dynamicMinScale must be <= dynamicMaxScale",
      });
    }
  });

export type TerritorySkinRender = z.infer<typeof TerritorySkinRenderSchema>;

export const TerritoryAppearanceSchema = z
  .object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4f8cff"),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1d3d76"),
    gradient: z.boolean().default(false),
    borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
    borderIntensity: z.number().finite().min(0).max(4).default(1),
    territoryAlpha: z.number().finite().min(0.1).max(1).default(1),
    glow: z.number().finite().min(0).max(3).default(0),
    emoji: z.string().max(16).optional(),
    flagCode: z.string().trim().max(32).optional(),
    nationName: z.string().trim().min(1).max(32).optional(),
    asset: TerritorySkinAssetSchema.optional(),
    render: TerritorySkinRenderSchema.default({
      mode: "cover",
      opacity: 1,
      scale: 1,
      rotationDeg: 0,
      offsetX: 0,
      offsetY: 0,
      tileScale: 1,
      flagRepeat: 4,
      dynamicMinScale: 0.5,
      dynamicMaxScale: 4,
    }),
  })
  .strict();

export type TerritoryAppearance = z.infer<typeof TerritoryAppearanceSchema>;

export function parseTerritoryAppearance(input: unknown): TerritoryAppearance {
  return TerritoryAppearanceSchema.parse(input);
}
