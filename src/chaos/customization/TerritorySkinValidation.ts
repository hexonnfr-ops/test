export const DEFAULT_MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const DEFAULT_MAX_SOURCE_DIMENSION = 4096;
export const DEFAULT_OPTIMIZED_DIMENSION = 1024;

export type AllowedImageMime = "image/png" | "image/jpeg" | "image/webp";

export interface UploadValidationLimits {
  maxBytes: number;
  maxSourceDimension: number;
}

export interface ValidatedUploadEnvelope {
  mime: AllowedImageMime;
  byteLength: number;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export function detectImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateUploadEnvelope(
  bytes: Uint8Array,
  declaredMime: string,
  limits: UploadValidationLimits = {
    maxBytes: DEFAULT_MAX_UPLOAD_BYTES,
    maxSourceDimension: DEFAULT_MAX_SOURCE_DIMENSION,
  },
): ValidatedUploadEnvelope {
  if (bytes.byteLength === 0) {
    throw new Error("Image upload is empty");
  }
  if (bytes.byteLength > limits.maxBytes) {
    throw new Error(`Image exceeds ${limits.maxBytes} byte upload limit`);
  }

  const detected = detectImageMime(bytes);
  if (detected === null) {
    throw new Error("Unsupported or invalid image signature");
  }
  if (declaredMime !== detected) {
    throw new Error(`Declared MIME ${declaredMime} does not match ${detected}`);
  }

  return { mime: detected, byteLength: bytes.byteLength };
}

export function validateDecodedDimensions(
  width: number,
  height: number,
  maxDimension = DEFAULT_MAX_SOURCE_DIMENSION,
): void {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("Decoded image dimensions must be integers");
  }
  if (width <= 0 || height <= 0) {
    throw new Error("Decoded image dimensions must be positive");
  }
  if (width > maxDimension || height > maxDimension) {
    throw new Error(`Image dimensions exceed ${maxDimension} px limit`);
  }
  // Avoid decompression bombs with absurd total pixels even if one future
  // caller raises maxDimension without considering total decoded memory.
  if (width * height > maxDimension * maxDimension) {
    throw new Error("Decoded image pixel count exceeds safety limit");
  }
}

export function safeStorageObjectName(sha256: string, mime: AllowedImageMime): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error("Invalid SHA-256 asset id");
  }
  const extension = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
  return `territory-skins/${sha256.slice(0, 2)}/${sha256}.${extension}`;
}
