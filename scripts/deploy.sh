#!/usr/bin/env bash
# Bot or Not - one-command go-live.
# Needs: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the env, or an
# interactive `npx wrangler login` session. Optional: LAUNCH_DATE=YYYY-MM-DD
# (default: today) - Day #1 of content lands on this date.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 1/4 D1 database =="
if grep -q 'TODO-paste-database_id' wrangler.toml; then
  OUT=$(npx wrangler d1 create bot-or-not 2>&1)
  echo "$OUT"
  DB_ID=$(echo "$OUT" | grep -oE 'database_id = "[0-9a-f-]+"' | grep -oE '[0-9a-f-]{36}')
  [ -n "$DB_ID" ] || { echo "could not parse database_id - paste it into wrangler.toml"; exit 1; }
  sed -i "s/TODO-paste-database_id/$DB_ID/" wrangler.toml
  echo "database_id $DB_ID written into wrangler.toml"
fi

echo "== 2/4 schema migrations =="
npx wrangler d1 migrations apply DB --remote

echo "== 3/4 seed content (LAUNCH_DATE=${LAUNCH_DATE:-today}) =="
node scripts/redate-seed.js ${LAUNCH_DATE:-}
npx wrangler d1 execute DB --remote --file seed.sql

echo "== 4/4 Pages deploy =="
npx wrangler pages project create bot-or-not --production-branch main 2>/dev/null || true
npx wrangler pages deploy
echo "Live at the bot-or-not pages.dev URL printed above"

