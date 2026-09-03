import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { TerritorySkinProcessor } from "./TerritorySkinProcessor";
import { territoryStorage } from "./TerritoryStorage";

const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

function maxUploadBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_SIZE ?? 3 * 1024 * 1024);
  if (!Number.isSafeInteger(configured) || configured < 1024 || configured > 4 * 1024 * 1024) {
    return 3 * 1024 * 1024;
  }
  return configured;
}

function maxSourceDimension(): number {
  const configured = Number(process.env.MAX_UPLOAD_DIMENSION ?? 4096);
  return Number.isSafeInteger(configured) && configured >= 256 && configured <= 8192
    ? configured
    : 4096;
}

function optimizedDimension(): number {
  const configured = Number(process.env.OPTIMIZED_SKIN_DIMENSION ?? 1024);
  return Number.isSafeInteger(configured) && configured >= 128 && configured <= 2048
    ? configured
    : 1024;
}

export function registerTerritorySkinRoutes(app: Express): void {
  if ((process.env.STORAGE_PROVIDER ?? "local") === "local") {
    const root = path.resolve(process.env.STORAGE_LOCAL_DIR ?? ".data/uploads");
    app.use(
      "/uploads",
      express.static(root, {
        immutable: true,
        maxAge: "1y",
        fallthrough: false,
        dotfiles: "deny",
      }),
    );
  }

  const rawImage = express.raw({
    type: ["image/png", "image/jpeg", "image/webp"],
    limit: maxUploadBytes(),
  });

  app.post(
    "/api/chaos/territory-skin",
    uploadRateLimit,
    rawImage,
    async (req, res) => {
      try {
        const declaredMime = req.headers["content-type"]?.split(";", 1)[0]?.trim();
        if (
          declaredMime !== "image/png" &&
          declaredMime !== "image/jpeg" &&
          declaredMime !== "image/webp"
        ) {
          return res.status(415).json({ error: "unsupported_image_type" });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "empty_image" });
        }

        const processor = new TerritorySkinProcessor(territoryStorage(), {
          maxUploadBytes: maxUploadBytes(),
          maxSourceDimension: maxSourceDimension(),
          optimizedDimension: optimizedDimension(),
        });
        const asset = await processor.process(req.body, declaredMime);
        return res.status(201).json({ asset });
      } catch (error) {
        const message = error instanceof Error ? error.message : "upload_failed";
        // Do not echo stack traces, paths, provider tokens or decoder internals.
        const safe = /image|mime|dimension|limit|upload|decode|unsupported|empty/i.test(message)
          ? message.slice(0, 160)
          : "upload_failed";
        return res.status(400).json({ error: safe });
      }
    },
  );
}
