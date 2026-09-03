# Territory Chaos — Implementation Plan

> Independent modified fork target based on `openfrontio/OpenFrontIO` commit `61789260bbb3bd2e1a0d7e42b4e1f0ceaf61ffe1` (2026-09-03).
>
> Primary title intentionally does **not** use “OpenFront”, to comply with the upstream AGPL Section 7 anti-misrepresentation term. The UI will say **“Based on OpenFront”** and preserve `© OpenFront and Contributors` in visible legal notices.

## 1. Verified baseline

Current upstream architecture at the pinned commit:

- `src/client` — browser client, lobby UI, transport, WebGL2 renderer.
- `src/client/render/gl` — GPU renderer and render passes.
- `src/client/render/gl/passes/TerritoryPass.ts` — territory ownership/fill pass.
- `src/client/render/gl/passes/SkinAtlasArray.ts` — GPU texture-array loader for territory skins.
- `src/client/render/gl/shaders/map-overlay/territory.frag.glsl` — owner-mask + skin sampling shader.
- `src/core` — deterministic game simulation, schemas, map/game types and configuration.
- `src/core/Schemas.ts` — authoritative Zod/zbin wire schemas including `GameConfigSchema`.
- `src/core/configuration/Config.ts` — runtime simulation configuration.
- `src/server` — authoritative WebSocket game/lobby server.
- `src/server/GameServer.ts` — room lifecycle, intents, join/reconnect/start.
- `src/server/ConfigPatch.ts` — host-editable configuration allowlist.
- `src/server/IntentAuthorization.ts` — host/admin permission checks.
- `resources` — redistributable CC BY-SA 4.0 assets/maps.
- `proprietary` — restricted OpenFront assets; intentionally excluded from Territory Chaos.
- `tests` — Vitest suites, including server and wire protocol tests.

The upstream already uses server-authoritative intents and delta-driven territory rendering. Territory Chaos extends those paths rather than replacing them.

## 2. Licensing constraints

Pinned commit license set:

- Code: GNU AGPL-3.0 plus upstream Section 7 attribution / anti-misrepresentation terms.
- `/resources`: CC BY-SA 4.0, attribution required.
- `/proprietary`: All Rights Reserved; excluded from this independent fork.
- External/CDN/premium OpenFront assets: not imported or fetched.

Required product notices:

- `Territory Chaos — Based on OpenFront` on the main menu / credits.
- `© OpenFront and Contributors` retained in a reasonably visible location.
- `Credits / Open Source` screen with AGPL notice and source-code link.
- Source for the running modified version must remain accessible to network users under AGPL-3.0 §13.

## 3. Target architecture

New modules are intentionally isolated so Classic remains close to upstream:

```text
src/chaos/
  config/
    GameConfigV1.ts
    Presets.ts
    Randomizer.ts
  modes/
    ModeRegistry.ts
  events/
    ChaosEvent.ts
    DeterministicChaosRng.ts
  customization/
    TerritorySkin.ts
    TerritorySkinValidation.ts
  social/
    ProximityChat.ts
  storage/
    StorageProvider.ts
    LocalStorageProvider.ts
  protocol/
    ChaosProtocol.ts

src/client/chaos/
  customization/
    TerritorySkinController.ts
  components/
    CustomGameModal.ts
    TerritoryCustomizer.ts

src/server/chaos/
  TerritorySkinService.ts
  RoomStateStore.ts
  ProximityChatService.ts
```

Integration points:

1. Extend `GameConfigSchema` with a single optional versioned `chaos` block. Classic leaves it undefined.
2. Add `chaos` to `ConfigPatch.COPIED_KEYS` so only authorized hosts can mutate it before start.
3. Freeze/normalize custom rules at game start and feed simulation modifiers through `Config` methods instead of scattered magic constants.
4. Store only territory skin metadata on the game/player state: asset id/hash, public optimized URL, mode and visual parameters.
5. Reuse the existing WebGL `SkinAtlasArray`; extend its per-owner metadata so the shader supports `cover`, `contain`, `tile`, `center-logo`, `flag-texture`, `dynamic` and `stretch`.
6. Never send raw upload bytes through game ticks.
7. Compute proximity chat server-side from shared-border / territory-distance data; clients only receive messages they are authorized to hear.

## 4. GameConfig strategy

`GameConfigV1` is a strict, JSON-serializable, versioned custom rule document. It does not replace upstream `GameConfig`; it becomes the validated extension block.

Properties are grouped into:

- `general`
- `economy`
- `combat`
- `expansion`
- `alliances`
- `naval`
- `buildings`
- `victory`
- `chaos`
- `events`
- `visuals`
- `social`

Every numeric field has an absolute server-side safety ceiling even when `unhinged=true`.

## 5. Territory skin pipeline

### Upload

1. Client performs early checks: PNG/JPEG/WebP only, max configured bytes, dimensions bounded.
2. Server receives or authorizes upload.
3. Server validates magic bytes + MIME agreement.
4. Decode image with a safe image decoder.
5. Strip metadata by re-encoding.
6. Resize to max 1024×1024.
7. Re-encode optimized WebP/PNG.
8. SHA-256 hash optimized bytes.
9. Deduplicate by hash.
10. Persist with `StorageProvider`.
11. Store/replicate metadata only.

SVG and arbitrary HTML are never accepted.

### GPU render

The existing shader already clips sampling to tiles whose owner id matches the territory. Territory Chaos extends only the UV transform and owner metadata. Territory geometry changes therefore automatically change the visible mask without CPU image recomposition.

GPU resources:

- one `TEXTURE_2D_ARRAY` atlas per active game/client;
- per-owner skin-layer lookup texture;
- per-owner anchor/bounds/mode/opacity metadata textures;
- lazy layer loading;
- atlas disposal on game exit.

## 6. Proximity chat

“Nearby” is deterministic and server authoritative.

Default rule:

- A player hears another player if their territories currently share a border, or if the minimum territory distance is within `social.proximityChat.radiusTiles`.
- Team/alliance chat can optionally bypass proximity.
- Spectators do not leak hidden information unless host rules explicitly allow it.
- Server rate-limits chat and filters invalid recipients.

This makes proximity meaningful for a territory RTS instead of pretending players have avatars walking on the map.

## 7. Multiplayer/state

The existing authoritative server remains the source of truth for:

- troop/population counts;
- territory ownership;
- attack outcome;
- resources/cooldowns;
- RNG events;
- winner/elimination.

Chaos events use a deterministic server seed and event index so replay/debug can reproduce them.

Room state abstraction:

```ts
interface RoomStateStore {
  load(roomId: string): Promise<RoomSnapshot | null>;
  save(roomId: string, snapshot: RoomSnapshot, ttlSeconds: number): Promise<void>;
  delete(roomId: string): Promise<void>;
  acquireLease(roomId: string, owner: string, ttlMs: number): Promise<boolean>;
}
```

## 8. Vercel strategy

Vercel Functions support WebSockets with Fluid compute in current 2026 platform documentation, but a connection is pinned to one Function instance and closes at the Function maximum duration. An authoritative RTS cannot keep its only room/tick state in that process.

Two production profiles:

### Recommended stable profile

- Static/client build + HTTP API: Vercel.
- Redis-compatible durable room metadata/state: external managed Redis.
- Object storage: Vercel Blob-compatible adapter or S3-compatible provider.
- Authoritative game server: long-lived Node service built from the same repository.
- `REALTIME_URL` selects it without code edits.

### Vercel-only experimental profile

- Fluid WebSocket Function.
- Redis-backed lease + snapshots/pubsub.
- Mandatory reconnect/resync.
- No critical room state held exclusively in Function memory.

This profile must pass the E2E multiplayer/reconnect test before being advertised as production-ready.

## 9. Delivery phases

### A — Baseline
- Pin upstream commit.
- Import code excluding `/proprietary`.
- Run `npm run inst`, `npm test`, `npm run lint`, `npm run build-prod`.

### B — Clean fork
- Territory Chaos branding.
- Original/free replacement assets.
- Credits + source link + notices.

### C — Custom GameConfig
- Add `GameConfigV1` schemas, presets, randomizer.
- Add server-side config normalization and tests.

### D — Lobby
- Host settings, ready state, invite code, private password metadata, browser filters.

### E — Gameplay
- Route modifiers through existing `Config` methods.
- Ensure game reaches victory normally.

### F/G — Territory customization + WebGL skins
- Upload/validation/storage.
- Synchronize metadata.
- Extend existing atlas/shader modes.

### H — Custom UI
- Searchable categorized custom-game editor.

### I — Chaos
- Seeded event registry, comeback/revenge/bounty/leader-tax and disaster events.

### J — Graphics
- Quality tiers and optional GPU effects, never required for gameplay.

### K — Production
- Vercel client/API deployment and state/storage adapters.
- Realtime deployment profile.

### L — Polish
- E2E, responsive UI, profiling, network/bandwidth checks.

## 10. Tests required before “playable” claim

- GameConfig validation/serialization/import.
- Classic config produces upstream-equivalent values.
- Host permissions.
- Lobby create/join/leave/reconnect.
- Deterministic RNG.
- Territory skin metadata validation.
- Upload file signature/dimensions/size.
- GPU skin mode math.
- Proximity chat recipient selection.
- Protocol size/rate limits.
- Two-client E2E through victory and return-to-lobby.

## 11. Main risks

1. Upstream evolves quickly; fork stays pinned until merge/test cycles are complete.
2. Proprietary asset references must be removed/replaced before production build.
3. Custom numeric modifiers can destabilize deterministic simulation; all modifiers require hard ceilings and replay tests.
4. WebGL texture-array layer limits vary by device; LOW mode must fall back to color/pattern-only territory.
5. Vercel WebSocket lifecycle is finite; authoritative state must survive reconnect/instance migration before a Vercel-only realtime profile is considered production-safe.
