# Territory Chaos

**Territory Chaos — Based on OpenFront** is an independent, free, multiplayer territory-RTS fork/mod project built on the open-source OpenFront codebase.

> Upstream copyright notice: **© OpenFront and Contributors**

Territory Chaos keeps the deterministic territory simulation and WebGL renderer, then adds versioned custom-game rules, deterministic Chaos events, user territory appearances, GPU territory skins, social/proximity systems and independent storage/deployment seams.

## License and upstream baseline

Pinned upstream source:

```text
https://github.com/openfrontio/OpenFrontIO
commit 61789260bbb3bd2e1a0d7e42b4e1f0ceaf61ffe1
```

Licenses at that baseline:

- code: GNU AGPL-3.0 with the upstream additional Section 7 attribution / anti-misrepresentation terms;
- upstream `/resources`: CC BY-SA 4.0;
- upstream `/proprietary`: **not redistributable as an independent fork** and intentionally excluded;
- external OpenFront CDN/premium/private assets: not dependencies of Territory Chaos.

See [`CREDITS.md`](./CREDITS.md) and the original `LICENSE`, `LICENSING.md` and `LICENSE-ASSETS` after baseline import.

The primary product title intentionally does not use “OpenFront”. The visible product attribution is:

> Territory Chaos — Based on OpenFront

## Repository bootstrap

This repository contains the Territory Chaos overlay plus a pinned, auditable upstream importer.

From GitHub, run once:

```text
Actions → Import verified OpenFront baseline → Run workflow
```

The workflow:

1. clones only `openfrontio/OpenFrontIO`;
2. checks out the exact pinned commit above;
3. excludes `/proprietary`;
4. preserves Territory Chaos modules/docs;
5. applies `scripts/applyTerritoryChaosOverlay.mjs`;
6. refreshes the lockfile;
7. type-checks;
8. runs Territory Chaos tests;
9. lints the added modules;
10. commits only if validation passes.

No production OpenFront API is needed by the Territory Chaos gameplay runtime.

## Development

After the baseline-import workflow has succeeded:

```bash
git clone https://github.com/hexonnfr-ops/test.git territory-chaos
cd territory-chaos
cp .env.example .env
npm run inst
npm run dev
```

OpenFront's `npm run inst` intentionally uses `npm ci --ignore-scripts`; keep using it for normal installs.

Useful commands:

```bash
npm run start:client
npm run start:server-dev
npm test
npm run lint
npx tsc --noEmit
npx vitest run tests/chaos
```

## Production build

```bash
npm run inst
npm test
npm run lint
npm run build-prod
```

A build is not considered a multiplayer release merely because the static client compiles. The E2E two-browser scenario must pass as described below.

## Architecture

Territory Chaos deliberately keeps the existing Vite + TypeScript + WebGL2 + authoritative lobby/turn server structure instead of rewriting the game into Next.js.

Core additions:

```text
src/chaos/config/                 strict GameConfigV1, presets, randomizer
src/chaos/customization/          territory appearance + upload validation
src/chaos/events/                 deterministic Chaos RNG/events
src/chaos/social/                 proximity-chat recipient rules
src/chaos/storage/                local/Vercel Blob storage adapters
src/client/chaos/                 custom game + territory customization UI/state
src/server/chaos/                 upload processing/storage trust boundary
```

`GameConfigV1` is an optional extension of upstream `GameConfig`. If it is absent, the intended compatibility path is **Classic**.

The server remains authoritative for host permissions, game configuration admission, room lifecycle and intent ordering. The deterministic simulation remains authoritative for troops/resources/territory/combat outcomes; clients submit intentions rather than authoritative results.

## Custom game config

Custom settings are serialized as strict `GameConfigV1` JSON. Unknown keys and out-of-range numeric values are rejected.

Even `unhinged: true` has absolute server ceilings. It permits deliberately ridiculous values without permitting Infinity, NaN, huge payloads or unbounded CPU/network multipliers.

Built-in presets include:

- Classic
- 5 Minute Mayhem
- Naval Madness
- 100x Economy
- Tiny World
- World War
- No Alliances
- Betrayal Simulator
- Speedrun
- 1v1 Competitive
- Zombie Infection
- King Gets Bullied
- Total Chaos

`Randomizer.ts` implements deterministic Balanced / Chaotic / Unhinged generation from a seed.

## Territory images

Supported source uploads:

- PNG
- JPEG/JPG
- WebP
- default max upload: 3 MiB
- default max decoded dimension: 4096 px

SVG is intentionally rejected.

Server pipeline:

1. magic-byte signature validation;
2. MIME/signature agreement check;
3. bounded decode with `sharp`;
4. dimension/pixel ceiling;
5. EXIF orientation application;
6. resize to at most 1024×1024;
7. WebP re-encode (metadata is not retained);
8. SHA-256 of optimized bytes;
9. content-addressed deduplication;
10. upload through `StorageProvider`;
11. only the optimized asset metadata is replicated to players.

The server accepts a territory-image URL during lobby join only when it resolves to the exact hash-derived object in the configured trusted storage provider.

## WebGL territory rendering

Upstream already contains a WebGL2 owner mask and a `TEXTURE_2D_ARRAY` skin atlas. Territory Chaos extends that route instead of compositing images on CPU.

That means the ownership texture continues to define the exact clip mask as borders move. The image itself is uploaded once/cached as a GPU texture layer; territory deltas do not resend raw image bytes.

Target Territory Chaos modes:

- Stretch
- Cover
- Contain
- Tile
- Center Logo
- Flag Texture
- Dynamic

LOW graphics may fall back to color/pattern rendering if the device cannot sustain the texture budget.

## Proximity chat

Proximity is territory-based, not avatar-based.

A sender can be heard when, according to server-authoritative ownership data:

- territories share a border; or
- their minimum territory distance is within the configured tile radius.

Optional team/alliance bypasses are explicit rules. Spectators do not automatically receive proximity traffic that would leak hidden information.

## Storage

### Development

```env
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=.data/uploads
STORAGE_PUBLIC_BASE_URL=http://localhost:3000/uploads/
```

### Vercel Blob

Install/import adds `@vercel/blob`. Configure:

```env
STORAGE_PROVIDER=vercel-blob
STORAGE_PUBLIC_BASE_URL=https://YOUR_STORE.public.blob.vercel-storage.com/
BLOB_READ_WRITE_TOKEN=...
```

The provider uses deterministic SHA-256 paths with `addRandomSuffix: false`; the hash itself provides collision resistance/deduplication.

Never put `BLOB_READ_WRITE_TOKEN` or other storage credentials into Vite/public environment variables.

## Vercel

See [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Recommended production topology:

- client/static + ordinary HTTP API: Vercel;
- object storage: Vercel Blob or another `StorageProvider` implementation;
- durable room/reconnect state: Redis-compatible external store;
- authoritative realtime game process: long-lived Node deployment from this same repository.

A Vercel-only WebSocket profile must not keep the only authoritative game state in Function memory. It remains an experimental target until reconnect/instance-migration E2E is green.

## Environment

Copy [`.env.example`](./.env.example). Only variables actually used by the fork should be enabled in a deployment.

Important variables:

```text
GAME_ENV
GAME_PUBLIC_URL
REALTIME_URL
REDIS_URL
STORAGE_PROVIDER
STORAGE_PUBLIC_BASE_URL
BLOB_READ_WRITE_TOKEN        # server secret; do not expose client-side
MAX_UPLOAD_SIZE
MAX_UPLOAD_DIMENSION
OPTIMIZED_SKIN_DIMENSION
SOURCE_CODE_URL
GIT_COMMIT
```

## Tests

Territory Chaos test modules cover, or are being extended to cover:

- `GameConfigV1` parsing/serialization and hard ceilings;
- deterministic RNG snapshot/replay;
- image magic-byte/MIME validation;
- path traversal resistance;
- proximity-chat recipient selection;
- presets/randomizer;
- storage metadata trust;
- host permissions and config patching;
- custom skin wire metadata;
- renderer UV modes;
- Classic non-regression.

Run:

```bash
npx vitest run tests/chaos
```

## Required two-browser E2E release gate

The release E2E scenario is:

1. Player A creates a custom game.
2. A selects Chaos and modifies several server rules.
3. A uploads a PNG/JPG.
4. Server validates/optimizes/stores it and returns content-addressed metadata.
5. A receives a lobby code.
6. Player B joins that exact lobby.
7. B receives A's territory appearance metadata.
8. Both become Ready.
9. Host starts the real game.
10. Both spawn and can issue attacks.
11. Territory deltas move borders.
12. A's image remains GPU-clipped to A's changing territory on both clients.
13. A deterministic Chaos event fires.
14. A player is genuinely eliminated.
15. The normal winner path resolves the game.
16. Both clients can return to the lobby.
17. The same scenario is repeated with a forced reconnect.

Do not advertise a deployment as production-ready until this gate passes.

## Source code for deployed versions

AGPL network deployments must expose the corresponding source for the running modified version. Set:

```env
SOURCE_CODE_URL=https://github.com/hexonnfr-ops/test
GIT_COMMIT=<deployed commit>
```

and surface those values in the in-game **Credits / Open Source** view.
