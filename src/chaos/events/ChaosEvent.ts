import { z } from "zod";
import { GameConfigV1 } from "../config/GameConfigV1";
import { DeterministicChaosRng, DeterministicRngSnapshot } from "./DeterministicChaosRng";

export const ChaosEventTypeSchema = z.enum([
  "meteor",
  "tsunami",
  "rebellion",
  "blackout",
  "storm",
  "contamination",
  "neutral-uprising",
  "uno-reverse",
  "hot-potato",
]);
export type ChaosEventType = z.infer<typeof ChaosEventTypeSchema>;

export interface ChaosEventSelection {
  index: number;
  type: ChaosEventType;
  scheduledTick: number;
  rngAfter: DeterministicRngSnapshot;
}

function weightFor(config: GameConfigV1, type: ChaosEventType): number {
  const w = config.events.weights;
  switch (type) {
    case "meteor":
      return w.meteor;
    case "tsunami":
      return w.tsunami;
    case "rebellion":
      return w.rebellion;
    case "blackout":
      return w.blackout;
    case "storm":
      return w.storm;
    case "contamination":
      return w.contamination;
    case "neutral-uprising":
      return w.neutralUprising;
    case "uno-reverse":
      return w.unoReverse;
    case "hot-potato":
      return w.hotPotato;
  }
}

export class ChaosEventScheduler {
  private readonly rng: DeterministicChaosRng;
  private eventIndex = 0;

  constructor(
    private readonly config: GameConfigV1,
    rngSnapshot?: DeterministicRngSnapshot,
    eventIndex = 0,
  ) {
    this.rng = rngSnapshot
      ? DeterministicChaosRng.fromSnapshot(rngSnapshot)
      : new DeterministicChaosRng(`${config.seed}:chaos-events`);
    this.eventIndex = Math.max(0, Math.trunc(eventIndex));
  }

  next(currentTick: number, ticksPerSecond: number): ChaosEventSelection | null {
    if (!this.config.chaos.enabled || !this.config.chaos.disasters) return null;
    if (!Number.isInteger(currentTick) || currentTick < 0) {
      throw new Error("currentTick must be a non-negative integer");
    }
    if (!Number.isFinite(ticksPerSecond) || ticksPerSecond <= 0) {
      throw new Error("ticksPerSecond must be positive");
    }

    const candidates: ChaosEventType[] = [
      "meteor",
      "tsunami",
      "rebellion",
      "blackout",
      "storm",
      "contamination",
      "neutral-uprising",
      "uno-reverse",
      "hot-potato",
    ];
    const type = this.rng.weightedPick(
      candidates.map((value) => ({ value, weight: weightFor(this.config, value) })),
    );

    // ±20% deterministic jitter prevents events landing at an unnaturally exact cadence.
    const baseSeconds = this.config.chaos.eventIntervalSeconds;
    const jitter = 0.8 + this.rng.nextFloat() * 0.4;
    const delayTicks = Math.max(1, Math.round(baseSeconds * jitter * ticksPerSecond));
    const selected: ChaosEventSelection = {
      index: this.eventIndex++,
      type,
      scheduledTick: currentTick + delayTicks,
      rngAfter: this.rng.snapshot(),
    };
    return selected;
  }

  snapshot(): { rng: DeterministicRngSnapshot; eventIndex: number } {
    return { rng: this.rng.snapshot(), eventIndex: this.eventIndex };
  }
}
