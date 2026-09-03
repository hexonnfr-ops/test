# Territory Chaos — Deployment

## Supported topology

Territory Chaos keeps the authoritative OpenFront-style Node/WebSocket simulation instead of pretending a short-lived request handler is equivalent to a game server.

### Development

```bash
npm run inst
npm run dev
```

Expected local endpoints after the upstream baseline and Territory Chaos overlay are merged:

- client: Vite dev server
- authoritative game/lobby server: existing OpenFront Node server
- local territory skins: `STORAGE_LOCAL_DIR`

## Production profile A — recommended

Use this until the Vercel-only realtime E2E suite passes under sustained games.

### Vercel

Deploy:

- browser client/static build;
- standard HTTP/API routes used by the fork;
- upload authorization endpoints when using direct object-storage uploads.

Build command:

```bash
npm run build-prod
```

The exact Vercel output directory must follow the upstream Vite config imported at the pinned commit. Do not change the build framework to Next.js merely for deployment; the current game already has a working Vite/WebGL architecture.

### Realtime

Run the existing authoritative Node game server as a long-lived service from the same source tree.

Set on the Vercel deployment:

```env
REALTIME_URL=wss://your-realtime-host.example
```

The browser never calls official OpenFront production APIs.

### Durable state

Set:

```env
REDIS_URL=...
```

The room state adapter is responsible for reconnect metadata, room leases/snapshots and short-lived room records. Dead room keys use TTLs.

### Territory skin storage

Production must not write user uploads into the Git repository or ephemeral function filesystem.

Configure an object-storage implementation of `StorageProvider`:

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=...
STORAGE_ENDPOINT=...
STORAGE_REGION=...
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
```

For a Vercel Blob adapter, only the provider-specific variables should be present. Never expose storage secrets through `VITE_*` variables.

## Production profile B — Vercel-only realtime, experimental until E2E certified

Current Vercel Fluid compute can accept WebSocket connections, but connections are tied to one Function instance and are finite-lived. Therefore the following are mandatory:

1. reconnect with exponential backoff;
2. server-issued resume token;
3. room lease in Redis;
4. durable/sufficiently frequent room snapshots;
5. deterministic event RNG state in the snapshot;
6. idempotent command sequence numbers;
7. resync after reconnect/instance migration;
8. no authoritative state held only in process memory.

Do not call this profile production-ready until two-browser E2E games survive forced WebSocket reconnect and instance replacement without desync.

## Upload architecture

For images up to the configured project limit (default 3 MiB):

1. client validates extension/MIME candidate and dimensions for UX only;
2. server creates/accepts an upload request subject to authentication/room rate limits;
3. bytes are validated by magic signature and decoded server-side;
4. metadata is stripped by re-encoding;
5. image is resized to at most `OPTIMIZED_SKIN_DIMENSION`;
6. optimized bytes are hashed;
7. duplicate hashes reuse an existing object;
8. only asset id/hash/public URL + render parameters enter lobby/game state.

SVG is intentionally rejected.

## Source-code obligation

A deployed AGPL modified version must provide network users a clear source-code link for the corresponding running version.

Set:

```env
SOURCE_CODE_URL=https://github.com/<owner>/<territory-chaos-repository>
GIT_COMMIT=<deployed-commit>
```

The Credits/Open Source UI should expose both values.

## Fresh-clone verification checklist

```bash
npm run inst
npm test
npm run lint
npm run build-prod
```

Then run the two-client E2E scenario before promoting the deployment.

A deployment is not considered valid merely because the home page loads. At minimum, two clients must join the same room, start, attack, receive territory deltas, synchronize a custom territory skin and reach a real winner state.
