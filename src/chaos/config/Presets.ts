import { GameConfigV1, GameConfigV1Schema, classicGameConfigV1 } from "./GameConfigV1";

export type BuiltInPresetId =
  | "classic"
  | "5-minute-mayhem"
  | "naval-madness"
  | "100x-economy"
  | "tiny-world"
  | "world-war"
  | "no-alliances"
  | "betrayal-simulator"
  | "speedrun"
  | "1v1-competitive"
  | "zombie-infection"
  | "king-gets-bullied"
  | "total-chaos";

type ConfigGroupKey =
  | "general"
  | "economy"
  | "expansion"
  | "combat"
  | "alliances"
  | "naval"
  | "buildings"
  | "victory"
  | "chaos"
  | "events"
  | "visuals"
  | "social";

type GameConfigPatch = Omit<Partial<GameConfigV1>, ConfigGroupKey> & {
  [K in ConfigGroupKey]?: Partial<GameConfigV1[K]>;
};

function mergePreset(seed: string, patch: GameConfigPatch): GameConfigV1 {
  const base = classicGameConfigV1(seed);
  return GameConfigV1Schema.parse({
    ...base,
    ...patch,
    general: { ...base.general, ...patch.general },
    economy: { ...base.economy, ...patch.economy },
    expansion: { ...base.expansion, ...patch.expansion },
    combat: { ...base.combat, ...patch.combat },
    alliances: { ...base.alliances, ...patch.alliances },
    naval: { ...base.naval, ...patch.naval },
    buildings: { ...base.buildings, ...patch.buildings },
    victory: { ...base.victory, ...patch.victory },
    chaos: { ...base.chaos, ...patch.chaos },
    events: { ...base.events, ...patch.events },
    visuals: { ...base.visuals, ...patch.visuals },
    social: { ...base.social, ...patch.social },
  });
}

export const BUILT_IN_PRESETS: Readonly<Record<BuiltInPresetId, GameConfigV1>> = {
  classic: classicGameConfigV1("preset-classic"),
  "5-minute-mayhem": mergePreset("preset-5-minute-mayhem", {
    mode: "blitz",
    general: { maxDurationMinutes: 5 },
    economy: { globalSpeed: 3, productionMultiplier: 5 },
    expansion: { expansionSpeed: 4 },
    combat: { attackPower: 1.5, attackCostMultiplier: 0.7 },
  }),
  "naval-madness": mergePreset("preset-naval-madness", {
    mode: "sandbox",
    naval: { enabled: true, boatSpeed: 5, waterNukes: true },
    buildings: { nukes: true, costMultiplier: 0.7 },
  }),
  "100x-economy": mergePreset("preset-100x-economy", {
    mode: "sandbox",
    unhinged: true,
    economy: {
      globalSpeed: 5,
      productionMultiplier: 100,
      economyMultiplier: 100,
      startingPopulationMultiplier: 20,
      startingGoldMultiplier: 100,
    },
  }),
  "tiny-world": mergePreset("preset-tiny-world", {
    mode: "one-pixel-empire",
    expansion: { startingTerritoryMultiplier: 0.05, expansionSpeed: 8 },
    economy: { productionMultiplier: 4 },
  }),
  "world-war": mergePreset("preset-world-war", {
    mode: "mega-war",
    general: { maxPlayers: 64, bots: 64, maxDurationMinutes: 180 },
    economy: { productionMultiplier: 1.5 },
    naval: { enabled: true, boatSpeed: 1.5 },
  }),
  "no-alliances": mergePreset("preset-no-alliances", {
    mode: "ffa",
    alliances: { enabled: false, betrayals: false, maxAllies: 0 },
  }),
  "betrayal-simulator": mergePreset("preset-betrayal-simulator", {
    mode: "chaos",
    alliances: {
      enabled: true,
      betrayals: true,
      maxAllies: 12,
      betrayalPenaltySeconds: 0,
    },
    chaos: { enabled: true, betrayalAlert: true, saltyEmotes: true },
  }),
  speedrun: mergePreset("preset-speedrun", {
    mode: "blitz",
    general: { maxDurationMinutes: 10, spawnProtectionSeconds: 3 },
    economy: { globalSpeed: 2.5, productionMultiplier: 3 },
    expansion: { expansionSpeed: 3 },
  }),
  "1v1-competitive": mergePreset("preset-1v1-competitive", {
    mode: "ffa",
    general: { maxPlayers: 2, bots: 0, spawnProtectionSeconds: 10 },
    chaos: { enabled: false },
    alliances: { enabled: false, maxAllies: 0, betrayals: false },
    visuals: { clipMoments: false, cameraShake: false },
  }),
  "zombie-infection": mergePreset("preset-zombie-infection", {
    mode: "infection",
    victory: { type: "infection" },
    economy: { productionMultiplier: 1.5 },
  }),
  "king-gets-bullied": mergePreset("preset-king-gets-bullied", {
    mode: "chaos",
    chaos: {
      enabled: true,
      crown: true,
      leaderTarget: true,
      taxTheKing: true,
      bounty: true,
    },
    economy: { leaderPenalty: 0.35, smallestPlayerBonus: 0.2 },
  }),
  "total-chaos": mergePreset("preset-total-chaos", {
    mode: "chaos",
    unhinged: true,
    economy: { globalSpeed: 4, productionMultiplier: 8, economyMultiplier: 5 },
    expansion: { expansionSpeed: 5 },
    combat: { attackPower: 2, revengeMeter: true, revengeBonus: 0.75 },
    naval: { boatSpeed: 4, waterNukes: true },
    chaos: {
      enabled: true,
      bounty: true,
      crown: true,
      leaderTarget: true,
      borderTroll: true,
      betrayalAlert: true,
      saltyEmotes: true,
      comeback: true,
      hotPotato: true,
      taxTheKing: true,
      disasters: true,
      randomRules: true,
      eventIntervalSeconds: 20,
    },
  }),
};

export function presetToJson(id: BuiltInPresetId): string {
  return JSON.stringify(BUILT_IN_PRESETS[id]);
}

export function importPresetJson(json: string): GameConfigV1 {
  if (json.length > 64 * 1024) throw new Error("Preset JSON exceeds 64 KiB limit");
  const parsed: unknown = JSON.parse(json);
  return GameConfigV1Schema.parse(parsed);
}
