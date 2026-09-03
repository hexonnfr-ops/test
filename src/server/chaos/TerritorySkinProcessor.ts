import { createHash } from "node:crypto";
import sharp from "sharp";
import { TerritorySkinAsset } from "../../chaos/customization/TerritorySkin";
import {
  DEFAULT_MAX_SOURCE_DIMENSION,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_OPTIMIZED_DIMENSION,
  safeStorageObjectName,
  validateDecodedDimensions,
  validateUploadEnvelope,
} from "../../chaos/customization/TerritorySkinValidation";
import { StorageProvider } from "../../chaos/storage/StorageProvider";

export interface TerritorySkinProcessingLimits {
  maxUploadBytes: number;
  maxSourceDimension: number;
  optimizedDimension: number;
}

export const DEFAULT_TERRITORY_SKIN_LIMITS: TerritorySkinProcessingLimits = {
  maxUploadBytes: DEFAULT_MAX_UPLOAD_BYTES,
  maxSourceDimension: DEFAULT_MAX_SOURCE_DIMENSION,
  optimizedDimension: DEFAULT_OPTIMIZED_DIMENSION,
};

export class TerritorySkinProcessor {
  constructor(
    private readonly storage: StorageProvider,
    private readonly limits: TerritorySkinProcessingLimits = DEFAULT_TERRITORY_SKIN_LIMITS,
  ) {}

  async process(bytes: Uint8Array, declaredMime: string): Promise<TerritorySkinAsset> {
    validateUploadEnvelope(bytes, declaredMime, {
      maxBytes: this.limits.maxUploadBytes,
      maxSourceDimension: this.limits.maxSourceDimension,
    });

    const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pipeline = sharp(input, {
      failOn: "warning",
      limitInputPixels: this.limits.maxSourceDimension ** 2,
      animated: false,
      sequentialRead: true,
    });
    const metadata = await pipeline.metadata();
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Unable to decode image dimensions");
    }
    validateDecodedDimensions(
      metadata.width,
      metadata.height,
      this.limits.maxSourceDimension,
    );

    // Re-encoding deliberately drops EXIF/IPTC/XMP metadata. Auto-orient is
    // applied before resize so phone photos do not appear rotated in-game.
    const { data, info } = await pipeline
      .autoOrient()
      .resize({
        width: this.limits.optimizedDimension,
        height: this.limits.optimizedDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, alphaQuality: 90, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    const sha256 = createHash("sha256").update(data).digest("hex");
    const mime = "image/webp" as const;
    const key = safeStorageObjectName(sha256, mime);

    let publicUrl = this.storage.getPublicUrl(key);
    if (!(await this.storage.exists(key))) {
      const stored = await this.storage.upload({
        key,
        bytes: data,
        contentType: mime,
        cacheControl: "public, max-age=31536000, immutable",
      });
      publicUrl = stored.publicUrl;
    }

    return {
      id: sha256,
      sha256,
      mime,
      width: info.width,
      height: info.height,
      byteLength: data.byteLength,
      publicUrl,
    };
  }
}
