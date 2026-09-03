import { z } from "zod";

export const TerritoryChaosModeSchema = z.enum([
  "classic",
  "sandbox",
  "chaos",
  "blitz",
  "mega-war",
  "teams",
  "ffa",
  "king-of-the-hill",
  "capital",
  "infection",
  "one-pixel-empire",
  "random-rules",
  "revenge",
  "territory-draft",
]);

export type TerritoryChaosMode = z.infer<typeof TerritoryChaosModeSchema>;

export const GraphicsQualitySchema = z.enum(["low", "medium", "high", "ultra"]);

const MultiplierSchema = z.number().finite().min(0.05).max(100);
const PercentSchema = z.number().finite().min(0).max(5);
const DurationSecondsSchema = z.number().int().min(0).max(86_400);

export const ChaosEventWeightsSchema = z
  .object({
    meteor: z.number().finite().min(0).max(100).default(1),
    tsunami: z.number().finite().min(0).max(100).default(1),
    rebellion: z.number().finite().min(0).max(100).default(1),
    blackout: z.number().finite().min(0).max(100).default(1),
    storm: z.number().finite().min(0).max(100).default(1),
    contamination: z.number().finite().min(0).max(100).default(1),
    neutralUprising: z.number().finite().min(0).max(100).default(1),
    unoReverse: z.number().finite().min(0).max(100).default(0.35),
    hotPotato: z.number().finite().min(0).max(100).default(0.5),
  })
  .strict();

export const GameConfigV1Schema = z
  .object({
    version: z.literal(1),
    mode: TerritoryChaosModeSchema.default("classic"),
    unhinged: z.boolean().default(false),
    seed: z.string().trim().min(1).max(96),

    general: z
      .object({
        description: z.string().trim().max(280).default(""),
        maxPlayers: z.number().int().min(2).max(64).default(32),
        bots: z.number().int().min(0).max(400).default(0),
        spectators: z.boolean().default(true),
        joinInProgress: z.boolean().default(false),
        maxDurationMinutes: z.number().int().min(1).max(360).default(120),
        rounds: z.number().int().min(1).max(25).default(1),
        spawnProtectionSeconds: DurationSecondsSchema.max(900).default(10),
        attackDelaySeconds: DurationSecondsSchema.max(900).default(0),
      })
      .strict(),

    economy: z
      .object({
        globalSpeed: MultiplierSchema.default(1),
        productionMultiplier: MultiplierSchema.default(1),
        economyMultiplier: MultiplierSchema.default(1),
        startingPopulationMultiplier: MultiplierSchema.default(1),
        startingGoldMultiplier: MultiplierSchema.default(1),
        comebackBonus: PercentSchema.default(0),
        smallestPlayerBonus: PercentSchema.default(0),
        leaderPenalty: PercentSchema.default(0),
        dynamicScaling: z.boolean().default(false),
      })
      .strict(),

    expansion: z
      .object({
        expansionSpeed: MultiplierSchema.default(1),
        startingTerritoryMultiplier: MultiplierSchema.default(1),
        instantExpansion: z.boolean().default(false),
        fogOfWar: z.boolean().default(false),
        showBorders: z.boolean().default(true),
      })
      .strict(),

    combat: z
      .object({
        attackPower: MultiplierSchema.default(1),
        defensePower: MultiplierSchema.default(1),
        attackCostMultiplier: MultiplierSchema.default(1),
        rangeMultiplier: MultiplierSchema.default(1),
        friendlyFire: z.boolean().default(false),
        elimination: z.enum(["immediate", "progressive"]).default("immediate"),
        revengeMeter: z.boolean().default(false),
        revengeThreshold: z.number().finite().min(0.05).max(1).default(0.35),
        revengeBonus: z.number().finite().min(0).max(3).default(0.35),
      })
      .strict(),

    alliances: z
      .object({
        enabled: z.boolean().default(true),
        betrayals: z.boolean().default(true),
        maxAllies: z.number().int().min(0).max(63).default(8),
        durationSeconds: DurationSecondsSchema.default(0),
        betrayalPenaltySeconds: DurationSecondsSchema.max(3600).default(0),
      })
      .strict(),

    naval: z
      .object({
        enabled: z.boolean().default(true),
        boatSpeed: MultiplierSchema.default(1),
        waterNukes: z.boolean().default(false),
      })
      .strict(),

    buildings: z
      .object({
        enabled: z.boolean().default(true),
        costMultiplier: MultiplierSchema.default(1),
        cooldownMultiplier: MultiplierSchema.default(1),
        instantBuild: z.boolean().default(false),
        nukes: z.boolean().default(true),
      })
      .strict(),

    victory: z
      .object({
        type: z
          .enum([
            "territory",
            "last-player",
            "score",
            "king-of-the-hill",
            "capital",
            "infection",
          ])
          .default("territory"),
        territoryShare: z.number().finite().min(0.1).max(1).default(0.8),
        scoreTarget: z.number().int().min(1).max(1_000_000_000).default(10_000),
        hillScorePerSecond: z.number().finite().min(0.1).max(10_000).default(1),
        capitalLoss: z
          .enum(["eliminate", "major-penalty", "territory-loss", "transfer"])
          .default("eliminate"),
      })
      .strict(),

    chaos: z
      .object({
        enabled: z.boolean().default(false),
        bounty: z.boolean().default(false),
        crown: z.boolean().default(false),
        leaderTarget: z.boolean().default(false),
        borderTroll: z.boolean().default(false),
        betrayalAlert: z.boolean().default(true),
        saltyEmotes: z.boolean().default(true),
        comeback: z.boolean().default(false),
        hotPotato: z.boolean().default(false),
        taxTheKing: z.boolean().default(false),
        disasters: z.boolean().default(false),
        randomRules: z.boolean().default(false),
        eventIntervalSeconds: z.number().int().min(10).max(3600).default(120),
      })
      .strict(),

    events: z
      .object({
        weights: ChaosEventWeightsSchema.default({
          meteor: 1,
          tsunami: 1,
          rebellion: 1,
          blackout: 1,
          storm: 1,
          contamination: 1,
          neutralUprising: 1,
          unoReverse: 0.35,
          hotPotato: 0.5,
        }),
      })
      .strict(),

    visuals: z
      .object({
        quality: GraphicsQualitySchema.default("high"),
        territorySkins: z.boolean().default(true),
        animatedWater: z.boolean().default(true),
        coastlineGlow: z.boolean().default(true),
        animatedBorders: z.boolean().default(true),
        particles: z.boolean().default(true),
        cameraShake: z.boolean().default(false),
        clipMoments: z.boolean().default(true),
      })
      .strict(),

    social: z
      .object({
        chat: z.boolean().default(true),
        emotes: z.boolean().default(true),
        mapPings: z.boolean().default(true),
        proximityChat: z
          .object({
            enabled: z.boolean().default(false),
            radiusTiles: z.number().int().min(0).max(512).default(0),
            sharedBorderCountsAsNearby: z.boolean().default(true),
            alliesAlwaysHear: z.boolean().default(false),
            teammatesAlwaysHear: z.boolean().default(true),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type GameConfigV1 = z.infer<typeof GameConfigV1Schema>;

export function parseGameConfigV1(input: unknown): GameConfigV1 {
  return GameConfigV1Schema.parse(input);
}

export function safeParseGameConfigV1(input: unknown) {
  return GameConfigV1Schema.safeParse(input);
}

/**
 * Produces the exact persisted/transmitted form. Parsing first is deliberate:
 * imported presets cannot carry prototype keys, unknown fields, NaN or values
 * outside the server's hard limits.
 */
export function serializeGameConfigV1(input: unknown): string {
  return JSON.stringify(parseGameConfigV1(input));
}

export function classicGameConfigV1(seed = "classic"): GameConfigV1 {
  return GameConfigV1Schema.parse({
    version: 1,
    mode: "classic",
    seed,
    general: {},
    economy: {},
    expansion: {},
    combat: {},
    alliances: {},
    naval: {},
    buildings: {},
    victory: {},
    chaos: {},
    events: {},
    visuals: {},
    social: {},
  });
}
