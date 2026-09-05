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
no streak/percentile).

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

## Deploy (Cloudflare) - GO-LIVE

One command once Cloudflare access exists:

    CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... ./scripts/deploy.sh
    # or: npx wrangler login  (browser OAuth), then ./scripts/deploy.sh
    # optional: LAUNCH_DATE=2026-09-05 ./scripts/deploy.sh  (Day #1 lands on this date; default today)

The script: creates the D1 database (and writes its database_id into wrangler.toml), applies migrations/0001_init.sql, retimes + loads the 9
seed days, deploys Pages (live at https://bot-or-not-810.pages.dev - no custom
domain needed).

API token permissions needed (Cloudflare dashboard -> My Profile -> API Tokens):
Account: Workers Pages: Edit, D1: Edit, Workers Scripts: Edit.

Not launch-blocking:
- AI API key: only for automating future content generation; 9 days are seeded.

## Sharing

- "Share on X" opens twitter.com/intent/tweet with the score text prefilled (emoji grid, score, streak, percentile) plus the game URL.
- "Share on LinkedIn": LinkedIn's share-offsite endpoint accepts a URL only - no prefilled text - so the button first copies the score text to the clipboard, shows a "Score copied - paste it into the post" toast, then opens linkedin.com/sharing/share-offsite/?url=<game URL>.
- "More" opens the native share sheet with the canvas share-card image where supported.

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

## Card author fields + celebrity rounds

Each card in days.cards_json may carry an author object, sent to the client ONLY
after submit (publicCards in functions/api/_lib.js strips it, like is_ai/tell):
  author: { name, handle, avatar, source_url, date, public_figure }
- HN-sourced cards: real username + comment date + link; avatar null (initial shown).
- Celebrity cards (days #8-9): real public X posts by public figures (Musk, Trump,
  Altman), verified via Twitter's syndication API - text, date, and avatar all come
  from the API response for the stored status ID. Profile photos are cached locally
  in public/assets/authors/. Rules: genuinely public posts only, attribution shown
  (name/handle/date/link), a "no endorsement implied" note on every public-figure
  reveal, no private people. AI twins mimic the person's style but are original text.
- Reveal: human cards auto-flip (staggered, tap to flip back) to uncover the author.

## API

- `GET  /api/today?tz=&lang=&anon_id=` - today's 5 cards (texts + context only), plus prior result if played
- `POST /api/submit` `{anon_id, tz, lang, date, answers[5]}` - score, reveal (labels, tells, per-card stats), percentile, streak
- `GET  /api/stats?tz=` - yesterday's summary (most-fooling card) for landing social proof
- `GET  /api/archive?tz=` - past days list (practice mode)
- `GET  /api/day?date=&lang=` - one past day's cards (practice)

## Repo notes

- No build step: plain HTML/CSS/JS in `public/`, Pages Functions in `functions/`.
- `wrangler.toml` carries the D1 binding for local dev; production binding is
  set on the Pages project (step 4 above).

## Roadmap

- **v2: media cards** - image and video texts (screenshots of image posts,
  short clips) rendered in the same platform mockups. MVP is text-only.
- Platform mockups currently: LinkedIn comment, X post, WhatsApp message.
  Candidates next: Instagram comment, Telegram message, HN/Reddit comment.
