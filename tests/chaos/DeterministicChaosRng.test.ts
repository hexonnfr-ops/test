import { describe, expect, it } from "vitest";
import { DeterministicChaosRng } from "../../src/chaos/events/DeterministicChaosRng";


describe("DeterministicChaosRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = new DeterministicChaosRng("same-seed");
    const b = new DeterministicChaosRng("same-seed");
    expect(Array.from({ length: 20 }, () => a.nextUint32())).toEqual(
      Array.from({ length: 20 }, () => b.nextUint32()),
    );
  });

  it("resumes exactly from a snapshot", () => {
    const rng = new DeterministicChaosRng("resume");
    rng.nextUint32();
    rng.nextUint32();
    const resumed = DeterministicChaosRng.fromSnapshot(rng.snapshot());
    expect(resumed.nextUint32()).toBe(rng.nextUint32());
    expect(resumed.nextUint32()).toBe(rng.nextUint32());
  });

  it("rejects invalid probability values", () => {
    const rng = new DeterministicChaosRng("bounds");
    expect(() => rng.bool(-0.01)).toThrow();
    expect(() => rng.bool(1.01)).toThrow();
  });
});
