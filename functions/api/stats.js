// GET /api/stats?tz=... - yesterday's global summary for the landing screen
// ("Yesterday 63% of players got fooled by text #3").
import { json, localDate, shiftDate, getDayRow } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const tz = url.searchParams.get("tz") || "UTC";
  const today = localDate(tz);
  const yesterday = shiftDate(today, -1);

  // Unique players who completed today's game (plays PK = anon_id+date dedupes).
  const { results: tc } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM plays WHERE date = ?"
  ).bind(today).all();
  const playersToday = tc[0].n;

  const day = await getDayRow(env.DB, yesterday);
  if (!day) return json({ date: yesterday, available: false, players_today: playersToday });

  const { results: plays } = await env.DB.prepare(
    "SELECT answers_json FROM plays WHERE date = ?"
  ).bind(yesterday).all();

  if (!plays.length) return json({ date: yesterday, available: false, players_today: playersToday });

  // Fool rate per AI card = share of players who guessed "human".
  let best = null;
  day.cards.forEach((c, i) => {
    if (!c.is_ai) return;
    let fooled = 0;
    for (const p of plays) if (JSON.parse(p.answers_json)[i] === false) fooled++;
    const rate = Math.round((fooled / plays.length) * 100);
    if (!best || rate > best.fooled_pct) best = { card_index: i + 1, fooled_pct: rate };
  });

  return json({
    date: yesterday,
    available: true,
    players: plays.length,
    players_today: playersToday,
    most_fooled: best, // {card_index (1-based), fooled_pct}
  });
}
