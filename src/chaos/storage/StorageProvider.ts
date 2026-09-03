export interface StoredObject {
  key: string;
  publicUrl: string;
  byteLength: number;
  etag?: string;
}

export interface UploadObjectInput {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  cacheControl?: string;
}

export interface StorageProvider {
  upload(input: UploadObjectInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}

export function assertSafeStorageKey(key: string): void {
  if (key.length === 0 || key.length > 512) {
    throw new Error("Invalid storage key length");
  }
  if (key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    throw new Error("Unsafe storage key");
  }
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Unsafe storage path traversal");
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(key)) {
    throw new Error("Storage key contains unsupported characters");
  }
}
