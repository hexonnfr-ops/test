import { z } from "zod";

export const ProximityChatConfigSchema = z
  .object({
    enabled: z.boolean(),
    radiusTiles: z.number().int().min(0).max(512),
    sharedBorderCountsAsNearby: z.boolean(),
    alliesAlwaysHear: z.boolean(),
    teammatesAlwaysHear: z.boolean(),
  })
  .strict();

export type ProximityChatConfig = z.infer<typeof ProximityChatConfigSchema>;

export interface PlayerTerritoryPresence {
  clientId: string;
  ownerId: number;
  alive: boolean;
  spectator: boolean;
  teamId?: string;
  alliedOwnerIds: ReadonlySet<number>;
}

/**
 * Read-only server-side index backed by authoritative territory ownership.
 * Implementations can use border ownership caches and a bounded BFS/distance
 * field rather than scanning the complete map per chat message.
 */
export interface TerritoryProximityIndex {
  sharesBorder(ownerA: number, ownerB: number): boolean;
  minDistanceTiles(ownerA: number, ownerB: number, maxDistance: number): number | null;
}

export function resolveProximityRecipients(
  sender: PlayerTerritoryPresence,
  players: readonly PlayerTerritoryPresence[],
  index: TerritoryProximityIndex,
  configInput: ProximityChatConfig,
): string[] {
  const config = ProximityChatConfigSchema.parse(configInput);

  if (!config.enabled || sender.spectator || !sender.alive) {
    return [];
  }

  const recipients: string[] = [];
  for (const candidate of players) {
    if (candidate.clientId === sender.clientId) continue;
    if (candidate.spectator || !candidate.alive) continue;

    if (
      config.teammatesAlwaysHear &&
      sender.teamId !== undefined &&
      sender.teamId === candidate.teamId
    ) {
      recipients.push(candidate.clientId);
      continue;
    }

    if (
      config.alliesAlwaysHear &&
      sender.alliedOwnerIds.has(candidate.ownerId)
    ) {
      recipients.push(candidate.clientId);
      continue;
    }

    if (
      config.sharedBorderCountsAsNearby &&
      index.sharesBorder(sender.ownerId, candidate.ownerId)
    ) {
      recipients.push(candidate.clientId);
      continue;
    }

    if (config.radiusTiles > 0) {
      const distance = index.minDistanceTiles(
        sender.ownerId,
        candidate.ownerId,
        config.radiusTiles,
      );
      if (distance !== null && distance <= config.radiusTiles) {
        recipients.push(candidate.clientId);
      }
    }
  }

  return recipients;
}

export function sanitizeChatText(input: string, maxLength = 280): string {
  const normalized = input.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (normalized.length === 0) {
    throw new Error("Chat message is empty");
  }
  const codePoints = Array.from(normalized);
  if (codePoints.length > maxLength) {
    throw new Error(`Chat message exceeds ${maxLength} characters`);
  }
  return normalized;
}
