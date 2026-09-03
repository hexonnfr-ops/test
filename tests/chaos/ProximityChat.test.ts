import { describe, expect, it } from "vitest";
import {
  resolveProximityRecipients,
  TerritoryProximityIndex,
} from "../../src/chaos/social/ProximityChat";

const index: TerritoryProximityIndex = {
  sharesBorder: (a, b) => (a === 1 && b === 2) || (a === 2 && b === 1),
  minDistanceTiles: (a, b, max) => {
    const distance = Math.abs(a - b) * 10;
    return distance <= max ? distance : null;
  },
};

function player(clientId: string, ownerId: number, teamId?: string) {
  return {
    clientId,
    ownerId,
    teamId,
    alive: true,
    spectator: false,
    alliedOwnerIds: new Set<number>(),
  };
}

describe("proximity chat", () => {
  it("delivers to territory neighbors but not distant players", () => {
    const a = player("a", 1);
    const b = player("b", 2);
    const c = player("c", 20);
    expect(
      resolveProximityRecipients(a, [a, b, c], index, {
        enabled: true,
        radiusTiles: 0,
        sharedBorderCountsAsNearby: true,
        alliesAlwaysHear: false,
        teammatesAlwaysHear: false,
      }),
    ).toEqual(["b"]);
  });

  it("lets teammates bypass proximity when configured", () => {
    const a = player("a", 1, "red");
    const distant = player("distant", 50, "red");
    expect(
      resolveProximityRecipients(a, [a, distant], index, {
        enabled: true,
        radiusTiles: 0,
        sharedBorderCountsAsNearby: false,
        alliesAlwaysHear: false,
        teammatesAlwaysHear: true,
      }),
    ).toEqual(["distant"]);
  });

  it("never broadcasts from spectators", () => {
    const a = { ...player("a", 1), spectator: true };
    const b = player("b", 2);
    expect(
      resolveProximityRecipients(a, [a, b], index, {
        enabled: true,
        radiusTiles: 100,
        sharedBorderCountsAsNearby: true,
        alliesAlwaysHear: true,
        teammatesAlwaysHear: true,
      }),
    ).toEqual([]);
  });
});
