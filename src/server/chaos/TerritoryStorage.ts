import { LocalStorageProvider } from "../../chaos/storage/LocalStorageProvider";
import { StorageProvider } from "../../chaos/storage/StorageProvider";
import { VercelBlobStorageProvider } from "../../chaos/storage/VercelBlobStorageProvider";

let singleton: StorageProvider | undefined;

export function territoryStorage(): StorageProvider {
  if (singleton !== undefined) return singleton;

  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "local") {
    if (process.env.GAME_ENV === "prod") {
      throw new Error("STORAGE_PROVIDER=local is not allowed in production");
    }
    singleton = new LocalStorageProvider(
      process.env.STORAGE_LOCAL_DIR ?? ".data/uploads",
      process.env.STORAGE_PUBLIC_BASE_URL ?? "http://localhost:3000/uploads/",
    );
    return singleton;
  }

  if (provider === "vercel-blob") {
    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
    if (!publicBaseUrl) {
      throw new Error("STORAGE_PUBLIC_BASE_URL is required for Vercel Blob");
    }
    singleton = new VercelBlobStorageProvider({
      publicBaseUrl,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return singleton;
  }

  throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}

export function resetTerritoryStorageForTests(): void {
  singleton = undefined;
}
