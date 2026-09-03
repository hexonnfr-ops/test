import {
  TerritoryAppearance,
  TerritoryAppearanceSchema,
} from "../../chaos/customization/TerritorySkin";
import { safeStorageObjectName } from "../../chaos/customization/TerritorySkinValidation";
import { StorageProvider } from "../../chaos/storage/StorageProvider";

/**
 * Trust boundary for territory appearance metadata received from a client.
 * Zod validation alone is not sufficient because a syntactically valid URL
 * could point to attacker-controlled content. The server accepts an asset only
 * if the exact hash-derived object exists in the configured storage provider
 * and the claimed public URL is the provider's canonical URL for that object.
 */
export class TerritorySkinService {
  constructor(private readonly storage: StorageProvider) {}

  async verifyAppearance(input: unknown): Promise<TerritoryAppearance> {
    const appearance = TerritoryAppearanceSchema.parse(input);
    const asset = appearance.asset;
    if (asset === undefined) return appearance;

    if (asset.id !== asset.sha256) {
      throw new Error("Territory skin asset id must equal its content hash");
    }

    const key = safeStorageObjectName(asset.sha256, asset.mime);
    const expectedUrl = this.storage.getPublicUrl(key);
    if (asset.publicUrl !== expectedUrl) {
      throw new Error("Territory skin URL is not owned by configured storage");
    }
    if (!(await this.storage.exists(key))) {
      throw new Error("Territory skin asset does not exist");
    }
    return appearance;
  }
}
