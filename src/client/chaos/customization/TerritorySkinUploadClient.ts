import { TerritorySkinAssetSchema, type TerritorySkinAsset } from "../../../chaos/customization/TerritorySkin";

const CLIENT_MAX_BYTES = 3 * 1024 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function validateTerritorySkinFile(file: File): Promise<void> {
  if (!ACCEPTED.has(file.type)) throw new Error("Use PNG, JPG/JPEG or WebP");
  if (file.size <= 0 || file.size > CLIENT_MAX_BYTES) {
    throw new Error("Image must be between 1 byte and 3 MiB");
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.width > 4096 || bitmap.height > 4096) {
      throw new Error("Image dimensions must be at most 4096×4096");
    }
  } finally {
    bitmap.close();
  }
}

export async function uploadTerritorySkin(file: File, signal?: AbortSignal): Promise<TerritorySkinAsset> {
  await validateTerritorySkinFile(file);
  const response = await fetch("/api/chaos/territory-skin", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
    signal,
    credentials: "same-origin",
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json && typeof json.error === "string"
        ? json.error
        : `Upload failed (${response.status})`;
    throw new Error(message);
  }
  if (typeof json !== "object" || json === null || !("asset" in json)) {
    throw new Error("Upload server returned invalid metadata");
  }
  return TerritorySkinAssetSchema.parse(json.asset);
}
