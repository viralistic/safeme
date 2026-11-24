# Contributing to Safety Map

Safety Map is open source under the AGPL-3.0 licence. Nobody owns it. Anyone can
run it for their own city, and anyone who runs a changed copy shares their
changes.

## Before you change anything

Read `AGENTS.md`. The golden rules are not up for debate in a pull request:

1. Privacy is a feature: fuzz locations, no public descriptions, reports expire.
2. No person-labeling: categories describe behaviour and places, never who someone is.
3. Not an emergency tool: every relevant screen says to call 112.
4. Copy is calm and concrete. No em dashes, no emoji.

## Run it

```bash
npm install
```

```bash
npm run dev:api
```

```bash
npm run dev
```

```bash
npm test
```

## Common changes

| You want to | Change |
| --- | --- |
| Add a report category | `src/lib/categories.ts`, an icon in `src/components/app/Icon.tsx`, next steps in `src/lib/nextSteps.ts`, the English label in `src/lib/i18n.en.ts` |
| Add or fix English copy | `src/lib/i18n.en.ts`; wrap new Dutch copy in `t()` |
| Add a language | copy `src/lib/i18n.en.ts`, add the language to `src/lib/i18n.ts` and the switch in `Jij.tsx` |
| Run it for another city | the `PUBLIC_CITY_*` settings in `.env.example` |
| Change moderation rules | `server/moderation.ts`, with a test in `tests/moderation.test.ts` |

## Pull requests

- Keep them small and say what problem they solve for people on the street.
- Add or update a test for anything in `server/` or `src/lib/`.
- `npm test` and `npm run build` pass.
- Screenshots for visible changes, at phone width.

## Moderating

Moderators work in the partner portal at `/partner`. Ask an existing moderator
for an invite code. Moderators decide on reports the AI or the rules flagged,
approve police accounts and invite buurtteams.
