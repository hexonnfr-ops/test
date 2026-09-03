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
      '  cosmetics: PlayerCosmeticRefsSchema.optional(),\n  // Custom territory data is independently validated by TerritorySkinService.\n  territoryAppearance: TerritoryAppearanceSchema.optional(),\n  turnstileToken: z.string().nullable(),',
  },
]);

await patchFile("src/server/ConfigPatch.ts", [
  {
    label: "host-editable chaos config",
    before: '  "overtime",\n  "anonymizeNames",',
    after: '  "overtime",\n  "chaos",\n  "anonymizeNames",',
  },
]);

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
    label: "territory service imports",
    before: 'import { SocketIngress } from "./SocketIngress";',
    after:
      'import { SocketIngress } from "./SocketIngress";\nimport { TerritorySkinService } from "./chaos/TerritorySkinService";\nimport { territoryStorage } from "./chaos/TerritoryStorage";',
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
    before: 'import {',
    after:
      'import { getSavedTerritoryAppearance } from "./chaos/customization/TerritoryAppearanceStore";\nimport {',
  },
  {
    label: "join saved territory appearance",
    before:
      '      cosmetics: await getPlayerCosmeticsRefs({\n        verified: resolvedName.verified,\n      }),\n      turnstileToken:',
    after:
      '      cosmetics: await getPlayerCosmeticsRefs({\n        verified: resolvedName.verified,\n      }),\n      territoryAppearance: getSavedTerritoryAppearance(),\n      turnstileToken:',
  },
]);

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
