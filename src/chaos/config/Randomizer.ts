import { DeterministicChaosRng } from "../events/DeterministicChaosRng";
import { GameConfigV1, GameConfigV1Schema, classicGameConfigV1 } from "./GameConfigV1";

export type RandomizerLevel = "balanced" | "chaotic" | "unhinged";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function ranged(rng: DeterministicChaosRng, min: number, max: number): number {
  return round2(min + (max - min) * rng.nextFloat());
}

export function randomizeGameConfig(
  seed: string,
  level: RandomizerLevel,
): GameConfigV1 {
  const rng = new DeterministicChaosRng(`${seed}:${level}`);
  const base = classicGameConfigV1(seed);

  const scale = level === "balanced" ? 1 : level === "chaotic" ? 2.5 : 8;
  const chaosEnabled = level !== "balanced";

  const randomized: GameConfigV1 = {
    ...base,
    mode:
      level === "balanced"
        ? rng.pick(["classic", "sandbox", "ffa", "teams", "blitz"] as const)
        : rng.pick([
            "chaos",
            "blitz",
            "mega-war",
            "king-of-the-hill",
            "capital",
            "infection",
            "one-pixel-empire",
            "random-rules",
            "revenge",
          ] as const),
    unhinged: level === "unhinged",
    general: {
      ...base.general,
      maxPlayers: rng.int(2, level === "balanced" ? 32 : 64),
      bots: rng.int(0, level === "balanced" ? 20 : 100),
      maxDurationMinutes: rng.int(level === "unhinged" ? 5 : 15, level === "balanced" ? 120 : 180),
      spawnProtectionSeconds: rng.int(0, level === "balanced" ? 30 : 120),
      attackDelaySeconds: rng.int(0, level === "balanced" ? 30 : 60),
    },
    economy: {
      ...base.economy,
      globalSpeed: ranged(rng, 0.75, Math.min(20, 1.5 * scale)),
      productionMultiplier: ranged(rng, 0.5, Math.min(100, 2 * scale)),
      economyMultiplier: ranged(rng, 0.5, Math.min(100, 2 * scale)),
      startingPopulationMultiplier: ranged(rng, 0.5, Math.min(100, 1.5 * scale)),
      startingGoldMultiplier: ranged(rng, 0.5, Math.min(100, 2 * scale)),
      comebackBonus: ranged(rng, 0, level === "balanced" ? 0.25 : 1),
      smallestPlayerBonus: ranged(rng, 0, level === "balanced" ? 0.2 : 1),
      leaderPenalty: ranged(rng, 0, level === "balanced" ? 0.15 : 0.8),
      dynamicScaling: rng.bool(level === "balanced" ? 0.15 : 0.55),
    },
    expansion: {
      ...base.expansion,
      expansionSpeed: ranged(rng, 0.5, Math.min(100, 2 * scale)),
      startingTerritoryMultiplier: ranged(rng, 0.05, Math.min(100, 1.5 * scale)),
      instantExpansion: level === "unhinged" && rng.bool(0.2),
      fogOfWar: rng.bool(level === "balanced" ? 0.2 : 0.45),
      showBorders: true,
    },
    combat: {
      ...base.combat,
      attackPower: ranged(rng, 0.5, Math.min(100, 1.8 * scale)),
      defensePower: ranged(rng, 0.5, Math.min(100, 1.5 * scale)),
      attackCostMultiplier: ranged(rng, 0.25, level === "balanced" ? 2 : 5),
      rangeMultiplier: ranged(rng, 0.5, level === "balanced" ? 2 : 5),
      friendlyFire: chaosEnabled && rng.bool(0.15),
      revengeMeter: chaosEnabled && rng.bool(0.6),
      revengeThreshold: ranged(rng, 0.15, 0.7),
      revengeBonus: ranged(rng, 0.1, level === "balanced" ? 0.5 : 2),
    },
    alliances: {
      ...base.alliances,
      enabled: rng.bool(0.75),
      betrayals: chaosEnabled ? rng.bool(0.8) : true,
      maxAllies: rng.int(0, level === "balanced" ? 8 : 20),
      betrayalPenaltySeconds: chaosEnabled ? rng.int(0, 300) : 0,
    },
    naval: {
      ...base.naval,
      enabled: rng.bool(0.85),
      boatSpeed: ranged(rng, 0.5, level === "unhinged" ? 10 : 3),
      waterNukes: chaosEnabled && rng.bool(0.4),
    },
    buildings: {
      ...base.buildings,
      enabled: true,
      costMultiplier: ranged(rng, 0.25, level === "balanced" ? 2 : 6),
      cooldownMultiplier: ranged(rng, 0.1, level === "balanced" ? 2 : 6),
      instantBuild: level === "unhinged" && rng.bool(0.3),
      nukes: rng.bool(0.8),
    },
    victory: {
      ...base.victory,
      type: rng.pick([
        "territory",
        "last-player",
        "score",
        "king-of-the-hill",
        "capital",
        ...(chaosEnabled ? (["infection"] as const) : []),
      ] as const),
      territoryShare: ranged(rng, 0.5, 0.95),
    },
    chaos: {
      ...base.chaos,
      enabled: chaosEnabled,
      bounty: chaosEnabled && rng.bool(0.65),
      crown: chaosEnabled && rng.bool(0.8),
      leaderTarget: chaosEnabled && rng.bool(0.55),
      borderTroll: chaosEnabled && rng.bool(0.25),
      betrayalAlert: true,
      saltyEmotes: true,
      comeback: chaosEnabled && rng.bool(0.65),
      hotPotato: chaosEnabled && rng.bool(0.35),
      taxTheKing: chaosEnabled && rng.bool(0.55),
      disasters: chaosEnabled && rng.bool(0.65),
      randomRules: chaosEnabled && rng.bool(0.45),
      eventIntervalSeconds:
        level === "unhinged" ? rng.int(10, 45) : rng.int(45, 240),
    },
    visuals: {
      ...base.visuals,
      quality: rng.pick(["medium", "high", "ultra"] as const),
      cameraShake: chaosEnabled && rng.bool(0.25),
    },
    social: {
      ...base.social,
      proximityChat: {
        ...base.social.proximityChat,
        enabled: rng.bool(0.5),
        radiusTiles: rng.int(0, level === "unhinged" ? 256 : 96),
        alliesAlwaysHear: rng.bool(0.5),
      },
    },
  };

  return GameConfigV1Schema.parse(randomized);
}

export function summarizeRandomizedConfig(config: GameConfigV1): string[] {
  const summary = [
    `Mode: ${config.mode}`,
    `Players: ${config.general.maxPlayers} + ${config.general.bots} bots`,
    `Speed: x${config.economy.globalSpeed}`,
    `Production: x${config.economy.productionMultiplier}`,
    `Expansion: x${config.expansion.expansionSpeed}`,
    `Attack: x${config.combat.attackPower}`,
    `Alliances: ${config.alliances.enabled ? "on" : "off"}`,
  ];
  if (config.chaos.enabled) {
    summary.push(`Chaos events: every ~${config.chaos.eventIntervalSeconds}s`);
  }
  if (config.social.proximityChat.enabled) {
    summary.push(`Proximity chat: ${config.social.proximityChat.radiusTiles} tiles`);
  }
  return summary;
}
