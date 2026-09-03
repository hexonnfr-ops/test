import { del, head, put } from "@vercel/blob";
import {
  assertSafeStorageKey,
  StorageProvider,
  StoredObject,
  UploadObjectInput,
} from "./StorageProvider";

export interface VercelBlobStorageProviderOptions {
  /** e.g. https://abc123.public.blob.vercel-storage.com/ */
  publicBaseUrl: string;
  token?: string;
}

/**
 * Content-addressed public storage for optimized territory skins.
 * `addRandomSuffix: false` is intentional: SHA-256 keys already prevent
 * collisions and let every server derive/verify the canonical URL.
 */
export class VercelBlobStorageProvider implements StorageProvider {
  private readonly base: string;

  constructor(private readonly options: VercelBlobStorageProviderOptions) {
    const parsed = new URL(options.publicBaseUrl);
    if (parsed.protocol !== "https:") {
      throw new Error("Vercel Blob public base URL must use HTTPS");
    }
    this.base = parsed.toString().endsWith("/") ? parsed.toString() : `${parsed.toString()}/`;
  }

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    assertSafeStorageKey(input.key);
    const result = await put(input.key, input.bytes, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: input.contentType,
      cacheControlMaxAge: 31_536_000,
      token: this.options.token,
    });

    const expected = this.getPublicUrl(input.key);
    if (result.url !== expected) {
      // Fail closed if the configured base URL points at a different store.
      await del(result.url, { token: this.options.token }).catch(() => undefined);
      throw new Error("Vercel Blob returned an unexpected storage URL");
    }

    return {
      key: input.key,
      publicUrl: result.url,
      byteLength: input.bytes.byteLength,
      etag: result.etag,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeStorageKey(key);
    await del(this.getPublicUrl(key), { token: this.options.token });
  }

  getPublicUrl(key: string): string {
    assertSafeStorageKey(key);
    return new URL(key, this.base).toString();
  }

  async exists(key: string): Promise<boolean> {
    assertSafeStorageKey(key);
    try {
      await head(this.getPublicUrl(key), { token: this.options.token });
      return true;
    } catch (error) {
      const status = (error as { status?: number; statusCode?: number }).status ??
        (error as { statusCode?: number }).statusCode;
      if (status === 404) return false;
      const name = (error as { name?: string }).name;
      if (name === "BlobNotFoundError") return false;
      throw error;
    }
  }
}
