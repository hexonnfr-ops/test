import { describe, expect, it } from "vitest";
import {
  classicGameConfigV1,
  GameConfigV1Schema,
  serializeGameConfigV1,
} from "../../src/chaos/config/GameConfigV1";


describe("GameConfigV1", () => {
  it("round-trips the classic preset", () => {
    const classic = classicGameConfigV1("test-seed");
    expect(GameConfigV1Schema.parse(JSON.parse(serializeGameConfigV1(classic)))).toEqual(
      classic,
    );
  });

  it("rejects unknown/prototype-like preset fields", () => {
    const config = classicGameConfigV1("strict");
    expect(() => GameConfigV1Schema.parse({ ...config, surpriseAdmin: true })).toThrow();
  });

  it("keeps absolute limits even in unhinged mode", () => {
    const config = classicGameConfigV1("unhinged");
    expect(() =>
      GameConfigV1Schema.parse({
        ...config,
        unhinged: true,
        economy: { ...config.economy, productionMultiplier: 101 },
      }),
    ).toThrow();
  });

  it("allows explicitly absurd but bounded settings", () => {
    const config = classicGameConfigV1("bounded-chaos");
    const parsed = GameConfigV1Schema.parse({
      ...config,
      unhinged: true,
      economy: { ...config.economy, productionMultiplier: 100 },
      chaos: { ...config.chaos, enabled: true, eventIntervalSeconds: 10 },
    });
    expect(parsed.economy.productionMultiplier).toBe(100);
    expect(parsed.chaos.eventIntervalSeconds).toBe(10);
  });
});
