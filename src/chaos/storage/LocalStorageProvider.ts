import { createHash } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertSafeStorageKey,
  StorageProvider,
  StoredObject,
  UploadObjectInput,
} from "./StorageProvider";

export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {
    if (!rootDir) throw new Error("Local storage root directory is required");
    if (!/^https?:\/\//.test(publicBaseUrl)) {
      throw new Error("Local storage public base URL must be http(s)");
    }
  }

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    assertSafeStorageKey(input.key);
    const filePath = this.resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes, { flag: "w" });

    const etag = createHash("sha256").update(input.bytes).digest("hex");
    return {
      key: input.key,
      publicUrl: this.getPublicUrl(input.key),
      byteLength: input.bytes.byteLength,
      etag,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeStorageKey(key);
    await rm(this.resolveKey(key), { force: true });
  }

  getPublicUrl(key: string): string {
    assertSafeStorageKey(key);
    const base = this.publicBaseUrl.endsWith("/")
      ? this.publicBaseUrl
      : `${this.publicBaseUrl}/`;
    return new URL(key, base).toString();
  }

  async exists(key: string): Promise<boolean> {
    assertSafeStorageKey(key);
    try {
      await access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  private resolveKey(key: string): string {
    const root = path.resolve(this.rootDir);
    const resolved = path.resolve(root, key);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (resolved !== root && !resolved.startsWith(prefix)) {
      throw new Error("Resolved storage key escaped root directory");
    }
    return resolved;
  }
}
