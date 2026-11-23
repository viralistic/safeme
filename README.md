# Safety Map

Map-based personal safety app for the Netherlands. People report an unsafe
situation on a fuzzed location, others nearby see a live heat map. Privacy first.
Not an emergency tool: for emergencies call 112.

- `AGENTS.md`: the product spec and golden rules.
- `design/`: tokens, liquid glass recipe, HUD style, reference art.

## Stack

- Astro 5 static site with React islands, Tailwind 4 (tokens from `design/tokens.css`), Geist self-hosted.
- MapLibre GL with OpenFreeMap tiles, Three.js globe, PDOK (Dutch government) for place search.
- `server/`: a small Node API with SQLite (built into Node 22). No external backend,
  no American cloud. Run it on any EU host and all data stays there.
- Optional: self-hosted n8n for moderation (`docs/n8n.md`), Plausible (EU) for analytics.

## Run it

Needs Node 22.18 or newer.

```bash
npm install
```

Demo mode (no server, data only in your browser):

```bash
npm run dev
```

Full stack (API on :8787, Astro dev proxies `/api` to it):

```bash
npm run dev:api
```

```bash
PUBLIC_API_URL=/api npm run dev
```

Open http://localhost:4321 for the homepage and http://localhost:4321/app for the app.

## Production

One process serves the site and the API.

```bash
PUBLIC_API_URL=/api npm run build
```

```bash
ADMIN_TOKEN=change-me DATA_DIR=/var/lib/safety-map npm start
```

Or with Docker (put Caddy or nginx in front for HTTPS, then set `TRUST_PROXY=true`):

```bash
docker build -t safety-map . && docker run -p 8787:8787 -v safety-map-data:/data --env-file .env safety-map
```

All settings are in `.env.example`.

## Privacy rules, where they live

| Rule | Code |
| --- | --- |
| Fuzz to a 100m grid before writing | `server/app.ts` (`fuzz`), client pre-fuzzes too |
| No public notes, no signalement | `/api/pins` only returns public columns; notes go to moderation only |
| Reports expire by category | `src/lib/categories.ts` `ttlMinutes`; notes wiped on expiry, rows after 30 days |
| Pseudonymous reporters | random bearer token, only its hash is stored |
| Rate limits | 5 per hour, 1 per cell per 30 min, plus per-IP limits on salted hashes |
| No trackers | no third-party scripts except optional Plausible |

## API

| Method | Path | |
| --- | --- | --- |
| POST | `/api/session` | New pseudonymous token |
| GET | `/api/pins` | Live public pins |
| GET | `/api/events` | Server-sent events, `change` on every update |
| POST | `/api/reports` | `{ type, category, severity, lat, lon, note? }` |
| POST | `/api/reports/:id/confirm` | "Dit herken ik ook" |
| POST | `/api/reports/:id/flag` | `{ reason: onjuist \| persoon \| spam }` |
| PUT / DELETE | `/api/push` | Web Push subscription with a fuzzed area |
| GET / POST | `/api/admin/reports...` | Moderation, see `docs/n8n.md` |

## Tests

```bash
npm test
```

Covers fuzzing, labels, the copy rules (no em dashes, no emoji) and the API
(auth, fuzzing, public fields, rate limits, confirm, flags, moderation, expiry).
