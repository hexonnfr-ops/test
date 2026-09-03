import { readFile, writeFile } from "node:fs/promises";

async function patchFile(path, transforms) {
  let text = await readFile(path, "utf8");
  for (const transform of transforms) {
    if (text.includes(transform.after)) continue;
    if (!text.includes(transform.before)) {
      throw new Error(`Overlay patch anchor not found in ${path}: ${transform.label}`);
    }
    text = text.replace(transform.before, transform.after);
  }
  await writeFile(path, text);
}

// ---------------------------------------------------------------------------
// Shared protocol / authoritative config
// ---------------------------------------------------------------------------
await patchFile("src/core/Schemas.ts", [
  {
    label: "chaos schema imports",
    before: 'import { zb } from "../../zbin";',
    after:
      'import { zb } from "../../zbin";\nimport { GameConfigV1Schema } from "../chaos/config/GameConfigV1";\nimport { TerritoryAppearanceSchema } from "../chaos/customization/TerritorySkin";',
  },
  {
    label: "GameConfig chaos extension",
    before:
      '  startingGold: zb.uint({ max: 1000000000 }).nullable().optional(),\n  hostCheats: z',
    after:
      '  startingGold: zb.uint({ max: 1000000000 }).nullable().optional(),\n  // Territory Chaos extension. Undefined is the strict Classic compatibility path.\n  chaos: GameConfigV1Schema.optional(),\n  hostCheats: z',
  },
  {
    label: "Player territory appearance",
    before:
      '  cosmetics: PlayerCosmeticsSchema.optional(),\n  isLobbyCreator: z.boolean().optional(),',
    after:
      '  cosmetics: PlayerCosmeticsSchema.optional(),\n  territoryAppearance: TerritoryAppearanceSchema.optional(),\n  isLobbyCreator: z.boolean().optional(),',
  },
  {
    label: "join territory appearance",
    before:
      '  cosmetics: PlayerCosmeticRefsSchema.optional(),\n  turnstileToken: z.string().nullable(),',
    after:
      '  cosmetics: PlayerCosmeticRefsSchema.optional(),\n  // User uploads are verified against trusted storage before Client creation.\n  territoryAppearance: TerritoryAppearanceSchema.optional(),\n  turnstileToken: z.string().nullable(),',
  },
]);

await patchFile("src/core/game/Game.ts", [
  {
    label: "territory bounds in name/view placement metadata",
    before:
      'export interface NameViewData {\n  x: number;\n  y: number;\n  size: number;\n}',
    after:
      'export interface NameViewData {\n  x: number;\n  y: number;\n  size: number;\n  // Reused by Territory Chaos GPU skins. Produced at the same low-frequency\n  // cadence as name placement so territory-wide UVs do not require a new\n  // per-frame CPU scan.\n  territoryBounds?: {\n    minX: number;\n    minY: number;\n    maxX: number;\n    maxY: number;\n  };\n}',
  },
]);

await patchFile("src/server/ConfigPatch.ts", [
  {
    label: "host-editable chaos config",
    before: '  "overtime",\n  "anonymizeNames",',
    after: '  "overtime",\n  "chaos",\n  "anonymizeNames",',
  },
]);

// ---------------------------------------------------------------------------
// Server join/upload trust boundary
// ---------------------------------------------------------------------------
await patchFile("src/server/Client.ts", [
  {
    label: "Client territory appearance import",
    before: 'import { ClientID, PlayerCosmetics, Winner } from "../core/Schemas";',
    after:
      'import { ClientID, PlayerCosmetics, Winner } from "../core/Schemas";\nimport type { TerritoryAppearance } from "../chaos/customization/TerritorySkin";',
  },
  {
    label: "Client territory appearance storage",
    before:
      '    public readonly trusted: boolean = false,\n  ) {}',
    after:
      '    public readonly trusted: boolean = false,\n    public readonly territoryAppearance?: TerritoryAppearance,\n  ) {}',
  },
]);

await patchFile("src/server/Worker.ts", [
  {
    label: "territory server imports",
    before: 'import { ServerEnv } from "./ServerEnv";',
    after:
      'import { ServerEnv } from "./ServerEnv";\nimport { registerTerritorySkinRoutes } from "./chaos/TerritorySkinRoutes";\nimport { TerritorySkinService } from "./chaos/TerritorySkinService";\nimport { territoryStorage } from "./chaos/TerritoryStorage";',
  },
  {
    label: "register territory skin routes",
    before:
      '  app.use("/api", (_req, res, next) => {\n    setNoStoreHeaders(res);\n    next();\n  });\n\n  // Create a new private game.',
    after:
      '  app.use("/api", (_req, res, next) => {\n    setNoStoreHeaders(res);\n    next();\n  });\n\n  // Territory Chaos upload/static routes are registered after the global\n  // request limiter and no-store policy but before lobby creation routes.\n  registerTerritorySkinRoutes(app);\n\n  // Create a new private game.',
  },
  {
    label: "verify join territory appearance",
    before:
      '        // Create client and add to game\n        const client = new Client(',
    after:
      '        const territoryAppearance =\n          clientMsg.territoryAppearance === undefined\n            ? undefined\n            : await new TerritorySkinService(territoryStorage()).verifyAppearance(\n                clientMsg.territoryAppearance,\n              );\n\n        // Create client and add to game\n        const client = new Client(',
  },
  {
    label: "pass verified appearance to Client",
    before:
      '          clientMsg.spectator === true,\n          trusted,\n        );',
    after:
      '          clientMsg.spectator === true,\n          trusted,\n          territoryAppearance,\n        );',
  },
]);

await patchFile("src/server/GameServer.ts", [
  {
    label: "include territory appearance in game roster",
    before:
      '        clientID: c.clientID,\n        cosmetics: c.cosmetics,\n        isLobbyCreator: this.lobbyCreatorID === c.clientID,',
    after:
      '        clientID: c.clientID,\n        cosmetics: c.cosmetics,\n        territoryAppearance: c.territoryAppearance,\n        isLobbyCreator: this.lobbyCreatorID === c.clientID,',
  },
]);

// ---------------------------------------------------------------------------
// Client join + GameView propagation
// ---------------------------------------------------------------------------
await patchFile("src/client/ClientGameRunner.ts", [
  {
    label: "LobbyConfig territory appearance import",
    before: 'import { Config } from "src/core/configuration/Config";',
    after:
      'import { Config } from "src/core/configuration/Config";\nimport type { TerritoryAppearance } from "../chaos/customization/TerritorySkin";',
  },
  {
    label: "LobbyConfig territory appearance",
    before:
      'export interface LobbyConfig {\n  cosmetics: PlayerCosmeticRefs;',
    after:
      'export interface LobbyConfig {\n  cosmetics: PlayerCosmeticRefs;\n  territoryAppearance?: TerritoryAppearance;',
  },
]);

await patchFile("src/client/Transport.ts", [
  {
    label: "send territory appearance during join",
    before:
      '      cosmetics: this.lobbyConfig.cosmetics,\n      turnstileToken: this.lobbyConfig.turnstileToken,',
    after:
      '      cosmetics: this.lobbyConfig.cosmetics,\n      territoryAppearance: this.lobbyConfig.territoryAppearance,\n      turnstileToken: this.lobbyConfig.turnstileToken,',
  },
]);

await patchFile("src/client/Main.ts", [
  {
    label: "territory appearance store import",
    before: 'import { ClientEnv } from "src/client/ClientEnv";',
    after:
      'import { ClientEnv } from "src/client/ClientEnv";\nimport { getSavedTerritoryAppearance } from "./chaos/customization/TerritoryAppearanceStore";\nimport "./chaos/components/TerritoryCustomizer";',
  },
  {
    label: "join saved territory appearance",
    before:
      '      cosmetics: await getPlayerCosmeticsRefs({\n        verified: resolvedName.verified,\n      }),\n      turnstileToken:',
    after:
      '      cosmetics: await getPlayerCosmeticsRefs({\n        verified: resolvedName.verified,\n      }),\n      territoryAppearance: getSavedTerritoryAppearance(),\n      turnstileToken:',
  },
]);

await patchFile("src/client/view/GameView.ts", [
  {
    label: "GameView territory appearance import",
    before:
      'import { ClientID, GameID, Player, PlayerCosmetics } from "../../core/Schemas";',
    after:
      'import { ClientID, GameID, Player, PlayerCosmetics } from "../../core/Schemas";\nimport type { TerritoryAppearance } from "../../chaos/customization/TerritorySkin";',
  },
  {
    label: "GameView territory appearance map",
    before:
      '  private _cosmetics: Map<string, PlayerCosmetics> = new Map();\n\n  private _map: GameMap;',
    after:
      '  private _cosmetics: Map<string, PlayerCosmetics> = new Map();\n  private _territoryAppearances: Map<string, TerritoryAppearance> = new Map();\n\n  private _map: GameMap;',
  },
  {
    label: "initialize territory appearance map",
    before:
      '    this._cosmetics = new Map(\n      humans.map((h) => [h.clientID, h.cosmetics ?? {}]),\n    );',
    after:
      '    this._cosmetics = new Map(\n      humans.map((h) => [h.clientID, h.cosmetics ?? {}]),\n    );\n    this._territoryAppearances = new Map(\n      humans\n        .filter((h) => h.territoryAppearance !== undefined)\n        .map((h) => [h.clientID, h.territoryAppearance!]),\n    );',
  },
  {
    label: "pass territory appearance to PlayerView",
    before:
      '              : undefined) ??\n            {},\n        );',
    after:
      '              : undefined) ??\n            {},\n          this._territoryAppearances.get(pu.clientID ?? ""),\n        );',
  },
]);

await patchFile("src/client/view/PlayerView.ts", [
  {
    label: "PlayerView territory appearance import",
    before: 'import { ClientID, PlayerCosmetics } from "../../core/Schemas";',
    after:
      'import { ClientID, PlayerCosmetics } from "../../core/Schemas";\nimport type { TerritoryAppearance } from "../../chaos/customization/TerritorySkin";',
  },
  {
    label: "PlayerView territory appearance constructor",
    before:
      '    public nameData: NameViewData | undefined,\n    public cosmetics: PlayerCosmetics,\n  ) {',
    after:
      '    public nameData: NameViewData | undefined,\n    public cosmetics: PlayerCosmetics,\n    public readonly territoryAppearance?: TerritoryAppearance,\n  ) {',
  },
  {
    label: "custom primary territory color",
    before:
      '        this.cosmetics.color?.color ??\n          pattern?.colorPalette?.primaryColor ??',
    after:
      '        this.territoryAppearance?.primaryColor ??\n          this.cosmetics.color?.color ??\n          pattern?.colorPalette?.primaryColor ??',
  },
  {
    label: "custom border territory color",
    before:
      '      pattern?.colorPalette?.secondaryColor ??\n        this.cosmetics.color?.color ??\n        maybeFocusedBorderColor.toHex(),',
    after:
      '      this.territoryAppearance?.borderColor ??\n        pattern?.colorPalette?.secondaryColor ??\n        this.cosmetics.color?.color ??\n        maybeFocusedBorderColor.toHex(),',
  },
]);

// Reuse the existing low-frequency territory/name analysis to provide a stable
// whole-territory bounding box for GPU UVs. Ownership itself remains clipped by
// the authoritative tile owner texture every frame.
await patchFile("src/client/hud/NameBoxCalculator.ts", [
  {
    label: "spawn territory bounds",
    before:
      '  return {\n    x: Math.ceil(game.x(spawnTile)),\n    y: Math.ceil(game.y(spawnTile) - fontSize / 3),\n    size: fontSize,\n  };',
    after:
      '  const sx = game.x(spawnTile);\n  const sy = game.y(spawnTile);\n  return {\n    x: Math.ceil(sx),\n    y: Math.ceil(sy - fontSize / 3),\n    size: fontSize,\n    territoryBounds: {\n      minX: sx - SPAWN_REGION_DIAMETER / 2,\n      minY: sy - SPAWN_REGION_DIAMETER / 2,\n      maxX: sx + SPAWN_REGION_DIAMETER / 2,\n      maxY: sy + SPAWN_REGION_DIAMETER / 2,\n    },\n  };',
  },
  {
    label: "calculate total territory bounds once per name-placement refresh",
    before:
      'export function placeName(game: Game, player: Player): NameViewData {\n  const boundingBox =\n    player.largestClusterBoundingBox ??\n    calculateBoundingBox(game, player.borderTiles());',
    after:
      'export function placeName(game: Game, player: Player): NameViewData {\n  const territoryBoundingBox = calculateBoundingBox(game, player.borderTiles());\n  const boundingBox =\n    player.largestClusterBoundingBox ?? territoryBoundingBox;',
  },
  {
    label: "emit total territory bounds",
    before:
      '  return {\n    x: Math.ceil(center.x),\n    y: Math.ceil(center.y),\n    size: fontSize,\n  };',
    after:
      '  return {\n    x: Math.ceil(center.x),\n    y: Math.ceil(center.y),\n    size: fontSize,\n    territoryBounds: {\n      minX: territoryBoundingBox.min.x,\n      minY: territoryBoundingBox.min.y,\n      maxX: territoryBoundingBox.max.x,\n      maxY: territoryBoundingBox.max.y,\n    },\n  };',
  },
]);

// Renderer-specific GPU textures/shader modifications live in a separate
// patch module to keep this bootstrap readable.
await import("./applyTerritoryChaosRendererOverlay.mjs");

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------
const packagePath = "package.json";
const pkg = JSON.parse(await readFile(packagePath, "utf8"));
pkg.dependencies ??= {};
pkg.dependencies["@vercel/blob"] ??= "^2.8.0";
pkg.dependencies.sharp ??= "^0.35.4";
const sortedDependencies = Object.fromEntries(
  Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
);
pkg.dependencies = sortedDependencies;
await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log("Territory Chaos overlay integration applied.");
