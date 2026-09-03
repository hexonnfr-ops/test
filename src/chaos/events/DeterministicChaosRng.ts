export interface DeterministicRngSnapshot {
  seed: string;
  state: number;
  draws: number;
}

/** FNV-1a 32-bit string hash; deterministic across browsers/Node. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Small deterministic PRNG for game-rule/event selection.
 * Simulation randomness must never use Math.random().
 */
export class DeterministicChaosRng {
  private state: number;
  private draws = 0;

  constructor(private readonly seed: string, state?: number, draws = 0) {
    this.state = (state ?? hashSeed(seed)) >>> 0;
    if (this.state === 0) this.state = 0x9e3779b9;
    this.draws = Math.max(0, Math.trunc(draws));
  }

  nextUint32(): number {
    // xorshift32
    let x = this.state >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    this.draws++;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new Error("RNG integer bounds must be integers");
    }
    if (maxInclusive < minInclusive) {
      throw new Error("RNG max must be >= min");
    }
    const span = maxInclusive - minInclusive + 1;
    if (span <= 0 || span > 0x1_0000_0000) {
      throw new Error("RNG integer span is unsupported");
    }
    return minInclusive + Math.floor(this.nextFloat() * span);
  }

  bool(probability = 0.5): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error("Probability must be between 0 and 1");
    }
    return this.nextFloat() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Cannot pick from an empty list");
    return items[this.int(0, items.length - 1)];
  }

  weightedPick<T>(entries: readonly { value: T; weight: number }[]): T {
    const valid = entries.filter(
      (entry) => Number.isFinite(entry.weight) && entry.weight > 0,
    );
    if (valid.length === 0) throw new Error("No positive weighted entries");
    const total = valid.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.nextFloat() * total;
    for (const entry of valid) {
      roll -= entry.weight;
      if (roll < 0) return entry.value;
    }
    return valid[valid.length - 1].value;
  }

  snapshot(): DeterministicRngSnapshot {
    return { seed: this.seed, state: this.state >>> 0, draws: this.draws };
  }

  static fromSnapshot(snapshot: DeterministicRngSnapshot): DeterministicChaosRng {
    return new DeterministicChaosRng(snapshot.seed, snapshot.state, snapshot.draws);
  }
}
