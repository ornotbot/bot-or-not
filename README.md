# Bot or Not | בוט או לא

Daily guessing game: 5 short texts a day, some human, some AI. Spot the bots.
Wordle mechanics, mobile-first web app, no signup. Hebrew-first, bilingual
(HE/EN) from day one.

## What's here

| Piece | Where | Status |
|---|---|---|
| Static frontend (7 screens, RTL Hebrew default + EN toggle) | `public/` | Working |
| API (Cloudflare Pages Functions) | `functions/api/` | Working |
| D1 schema | `schema.sql` | Working |
| Seed content - 3 demo days, ALL PLACEHOLDER | `data/seed-days.json`, `seed.sql` | Placeholder |
| Content pipeline | `content-pipeline/` | Skeleton + TODOs only |

Game mechanics implemented per spec: anon-ID play (localStorage + cookie, no
signup), server-side scoring (labels/tells never reach the client before
submit), streaks (consecutive player-local days, any score counts), live
percentile ("better than X% of players"), per-card global stats, yesterday's
fool-rate as landing-page social proof, client-side canvas share card with
native share sheet, countdown to local midnight, practice archive (past days,
no streak/percentile), and a daily-reminder opt-in (email/WhatsApp) stored in
D1.

Day boundaries are per-player: the client sends its IANA timezone and the
server keys the round to the player's local date.

## Controls

- Swipe RIGHT on a card (or tap HUMAN) = guess human. Swipe LEFT (or tap BOT) = guess AI. The card follows the finger, tilts, and a HUMAN/BOT stamp fades in while dragging; release past the threshold to commit, otherwise it snaps back.
- Swipe DOWN on a card (or tap Back) = return to the previous card to change an answer before submitting.

## Local dev

Requires Node 18+ and wrangler (`npm i -g wrangler`).

```bash
# 1. Create the local D1 database and load schema + seed
npx wrangler d1 create bot-or-not          # once; paste database_id into wrangler.toml
npx wrangler d1 execute bot-or-not --local --file=schema.sql
npx wrangler d1 execute bot-or-not --local --file=seed.sql

# 2. Serve static + functions together
npx wrangler pages dev public --d1 DB=bot-or-not --local
# open http://localhost:8788
```

## Deploy (Cloudflare) - NOT DONE YET

Prereqs: a Cloudflare account (free) and `wrangler login`.

```bash
# 1. Create the D1 database (once)
npx wrangler d1 create bot-or-not
#    -> copy the database_id into wrangler.toml (REPLACE_WITH_D1_DATABASE_ID)

# 2. Apply schema + seed content (remote)
npx wrangler d1 execute bot-or-not --remote --file=schema.sql
npx wrangler d1 execute bot-or-not --remote --file=seed.sql

# 3. Create the Pages project and deploy
npx wrangler pages project create bot-or-not --production-branch main
npx wrangler pages deploy public --project-name bot-or-not
#    -> live at https://bot-or-not.pages.dev

# 4. Bind D1 to the Pages project (dashboard or CLI):
#    Pages -> bot-or-not -> Settings -> Functions -> D1 database bindings
#    -> binding name "DB" -> database "bot-or-not"
#    (or: npx wrangler pages deployment list / dashboard; binding is per-project)

# 5. Optional: custom domain in Pages -> Custom domains.
#    Then update GAME_URL in public/assets/share.js.
```

After binding, redeploy once (`npx wrangler pages deploy public --project-name bot-or-not`)
so the binding picks up.

## Content

The 3 seeded days (2026-09-03 .. 2026-09-05) are placeholder texts, marked
`"placeholder": true` in `data/seed-days.json`. Before launch, replace them
with real content from the pipeline (spec section 2): pre-2023 public
archives for guaranteed-human texts, matched AI twins, QC gates, and a
hand-written one-line "tell" per card in both languages. To add days, append
to `data/seed-days.json` and regenerate:

```bash
node /tmp/makeseed.js   # or re-run the generator snippet in git history
npx wrangler d1 execute bot-or-not --remote --file=seed.sql
```

## API

- `GET  /api/today?tz=&lang=&anon_id=` - today's 5 cards (texts + context only), plus prior result if played
- `POST /api/submit` `{anon_id, tz, lang, date, answers[5]}` - score, reveal (labels, tells, per-card stats), percentile, streak
- `GET  /api/stats?tz=` - yesterday's summary (most-fooling card) for landing social proof
- `GET  /api/archive?tz=` - past days list (practice mode)
- `GET  /api/day?date=&lang=` - one past day's cards (practice)
- `POST /api/reminder` `{anon_id, channel, address, lang}` - daily reminder opt-in

## Repo notes

- No build step: plain HTML/CSS/JS in `public/`, Pages Functions in `functions/`.
- `wrangler.toml` carries the D1 binding for local dev; production binding is
  set on the Pages project (step 4 above).

## Roadmap

- **v2: media cards** - image and video texts (screenshots of image posts,
  short clips) rendered in the same platform mockups. MVP is text-only.
- Platform mockups currently: LinkedIn comment, X post, WhatsApp message.
  Candidates next: Instagram comment, Telegram message, HN/Reddit comment.
