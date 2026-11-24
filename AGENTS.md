# AGENTS.md — Safety Map

Build guide for AI coding agents (Claude Code, Cursor, v0) and developers. Read
this first. The two HTML prototypes in this package are the visual source of
truth; this file is the spec around them.

## What we are building

A map-based personal safety app for the Netherlands. People report an unsafe or
suspicious situation, pinned to a fuzzed location, in real time. Others nearby
see a live heat map and adjust their route. Privacy-first, informs without
inflaming.

## Golden rules (do not break)

1. Privacy is a feature. Fuzz locations, no public descriptions in MVP, reports
   expire. See "Privacy rules".
2. No person-labeling. Categories describe behaviour and places, never who a
   person is (never "homeless", "addict", ethnicity). A person who seems to need
   help is a welfare signal, not a threat.
3. Not an emergency tool. Every relevant screen shows: for emergencies call 112.
4. Copy: no em dashes, no emoji. Calm, concrete, StoryBrand (user is the hero,
   the app is the guide). Dutch UI, English via `src/lib/i18n.en.ts` (wrap new
   copy in `t()`). The partner portal stays Dutch.
5. Minimal text, lots of whitespace.

## Visual system

- Style: dark topographic HUD. Deep navy base, glowing blue/cyan contour accents,
  poppy red for danger. See `design/topographic-hud-style.md`.
- Tokens: `design/tokens.css` is the single source of truth (colors, type, radius).
- Font: Geist, light. Body 300, headings 500, tight tracking.
- Severity scale: powder blue (low) to oxblood (mid) to poppy red (high). No
  yellow or green.
- Controls: liquid glass. See `design/liquid-glass.md`.
- App icon: `assets/icon.png`.

## Stack

- Framework: Astro 5.x (PWA), React islands for the map, report flow and globe.
- UI: Tailwind + shadcn/ui, tokens from `tokens.css`.
- Map: MapLibre GL. The heat layer colors severity density (grey base, blue to
  dark red to bright red). No Google Maps.
- 3D globe: Three.js (WebGL) sphere with the contour texture, drag to rotate,
  clickable hotspots. See the prototype for the reference implementation.
- Backend: own Node API in `server/` with SQLite (built into Node). No Supabase,
  no American cloud services. Data stays on the EU host that runs it.
- Automation: n8n (self-hosted) for moderation, abuse scoring, ops alerts. See
  `docs/n8n.md`.
- Notifications: Web Push sent by the API (users), Telegram via n8n (ops only).
- Hosting: one Node process (or the Dockerfile) on an EU host. Analytics: Plausible.

## Screens (see app/index.html)

| Screen | Purpose |
| --- | --- |
| Start | 3D globe, StoryBrand headline, 3-step plan, CTA, 112 note |
| Kaart | Live heat map with severity pins, report FAB |
| Melden, stap 1 | Pick wheel of categories, tabs: "Ik zie iets" / "Overkomt mij" |
| Melden, stap 2 | Spectrum slider; the background reddens as danger rises |
| Verzonden | Calm confirmation of what was achieved |
| Melding-detail | Category, time, note, confirm or report abuse |
| Meldingen | Saved area, push toggles |

## Report categories

- Situatie (observed): Drugsgebruik, Overlast, Inbraakpoging, Iemand in nood,
  Onveilig gevoel, Donkere plek, Rook of alarm, Explosie of knal, and the
  private Uitbuiting signal (never on the public map, police only after two
  independent reports of the same place).
- Overkomt mij (incident): follows the same two-tap pattern.
- Severity is a continuous spectrum (not buckets), stored 0 to 100 or mapped to
  low / mid / high.

## Data model

`reports` (SQLite, `server/app.ts`): id, type (situation | incident), category,
severity, lat, lon (fuzzed), created_at, expires_at, note?, reporter_id
(pseudonymous), status (pending | approved | removed), confidence. There is no
signalement column in the MVP.

## Privacy rules (enforce in code)

1. Fuzz every location to a ~100m grid server-side before writing.
2. `signalement` is never on the public map. MVP ships with it off.
3. The public endpoint (`/api/pins`) returns only approved, non-expired pins with
   public columns. Notes reach moderation only.
4. Reporters pseudonymous. No third-party trackers.
5. Reports expire by category.
6. Rate-limit per device and area.

## Build notes

- Geist loads from Google Fonts in the prototypes; self-host via the `geist` npm
  package in production.
- Three.js and MapLibre are bundled from npm.
- Liquid-glass refraction is Chromium-only; it degrades to frosted glass
  elsewhere, which is fine.
- Prototype images are generated placeholders. Replace the globe texture and HUD
  art with your own render or keep the generated set in `reference-images/`.

## Definition of done (per feature)

- Matches `tokens.css`.
- Privacy rules verified where relevant (fuzzing, public fields, expiry).
- Copy has no em dashes, no emoji, calm and concrete.
- Keyboard accessible, AA contrast, color never the only signal.
