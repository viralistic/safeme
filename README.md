# Safety Map

Map-based personal safety app for the Netherlands. People report an unsafe
situation on a fuzzed location, others nearby see a live heat map. Privacy first.
Not an emergency tool: for emergencies call 112.

- `AGENTS.md`: the product spec and golden rules.
- `design/`: tokens, liquid glass recipe, HUD style, reference art.

## Stack

- Astro 5 site with React islands, Tailwind 4 (tokens from `design/tokens.css`), Geist self-hosted.
- MapLibre GL with self-hosted PMTiles (`docs/self-hosted-tiles.md`), Three.js globe, PDOK (Dutch government) for place search.
- `server/`: a small Node API with SQLite (built into Node 22). It serves the site, the API and the map tiles from one process on your own server.
- Moderation: rules plus an optional AI first pass (`server/moderation.ts`), Telegram alerts, and people who decide.
- Optional: self-hosted n8n (`docs/n8n.md`), Plausible (EU) for analytics.

Open source under the AGPL-3.0 licence (`LICENSE`). Nobody owns it: if you run a
changed copy for others, you share your changes too.

## Run it

Needs Node 22.18 or newer.

```bash
npm install
```

Local development, API and site together (Astro proxies `/api` to the API):

```bash
npm run dev:api
```

```bash
npm run dev
```

Open http://localhost:4321 for the homepage and http://localhost:4321/app for the app.

## Go live on your server

One process serves the site, the API and the tiles. Copy `.env.example` to `.env` and fill it in.

```bash
npm run build
```

```bash
npm start
```

Or with Docker, behind Caddy or nginx for HTTPS (then set `TRUST_PROXY=true`):

```bash
docker build -t safety-map . && docker run -p 8787:8787 -v safety-map-data:/data -v ./tiles:/tiles --env-file .env safety-map
```

Back up `DATA_DIR` every night, for example with `sqlite3 data/safety-map.db ".backup data/backup.db"` from cron.

## What is in the app

| Feature | Where |
| --- | --- |
| Live heat map with fuzzed pins, Vanavond view, calm summary | `/app` |
| Two-tap reporting, including Donkere plek, Rook of alarm, Explosie of knal | `/app` |
| Private signals (Uitbuiting): never public, police see them once two people report the same place | `/app`, `/partner` |
| Bel me op speaker: fake calls with your own recorded voices, kept on the phone | `/app#/bellen` |
| Walking routes that avoid recent danger reports | search a place on the map |
| English for visitors (automatic for non-Dutch phones, switch under Jij) | `src/lib/i18n.en.ts` |
| Partner portal for police (politie.nl, approved by a moderator), buurtteams and moderators (invite codes) | `/partner` |
| Buurtteam avondwandeling shown on the public map | `/partner` |
| Moderation queue, AI first pass, Telegram alerts | `/partner`, `server/moderation.ts` |

## Privacy rules, where they live

| Rule | Code |
| --- | --- |
| Fuzz to a 100m grid before writing | `server/app.ts` (`fuzz`), client pre-fuzzes too |
| No public notes, no signalement | `/api/pins` only returns public columns; notes go to moderation only |
| Reports expire by category | `src/lib/categories.ts` `ttlMinutes`; notes wiped on expiry, rows after 30 days |
| Pseudonymous reporters | random bearer token, only its hash is stored |
| Rate limits | 5 per hour, 1 per cell per 30 min, plus per-IP limits on salted hashes |
| No trackers | no third-party scripts except optional Plausible |
| Notes never describe people | `server/moderation.ts` strips them, abuse goes to a person |

## API

| Method | Path | |
| --- | --- | --- |
| POST | `/api/session` | New pseudonymous token |
| GET | `/api/pins` | Live public pins |
| GET | `/api/events` | Server-sent events, `change` on every update |
| POST | `/api/reports` | `{ type, category, severity, lat, lon, note? }` |
| POST | `/api/reports/:id/confirm` | "Dit herken ik ook" |
| GET | `/api/walks` | Active buurtteam walks |
| POST | `/api/partner/signup`, `/api/partner/login` | Partner accounts |
| GET | `/api/partner/map` | Heat map over 7 to 90 days, reports per hour, private signals, walks |
| POST / DELETE | `/api/partner/walks` | Start or stop an avondwandeling |
| GET / POST | `/api/partner/queue`, `/api/partner/reports/:id` | Moderation |
| GET / POST | `/api/partner/accounts`, `/api/partner/invites` | Approve partners, invite codes |
| POST | `/api/reports/:id/flag` | `{ reason: onjuist \| persoon \| spam }` |
| PUT / DELETE | `/api/push` | Web Push subscription with a fuzzed area |
| GET / POST | `/api/admin/reports...` | Moderation, see `docs/n8n.md` |

## Tests

```bash
npm test
```

Covers fuzzing, labels, the copy rules (no em dashes, no emoji) and the API
(auth, fuzzing, public fields, rate limits, confirm, flags, moderation, expiry).
