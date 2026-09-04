// POST /api/submit
// Body: { anon_id, tz, lang, date, answers: [bool x5] }  (true = guessed "bot")
// Scores server-side, stores the play, returns reveal data (labels, tells,
// per-card global stats), percentile and streak.
import { json, localDate, getDayRow, computeStreak, computePercentile } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  const { anon_id: anonId, tz, date, answers } = body || {};
  const lang = body.lang === "en" ? "en" : "he";
  if (!anonId || typeof anonId !== "string" || anonId.length > 64) {
    return json({ error: "bad_anon_id" }, 400);
  }
  if (!Array.isArray(answers) || answers.length !== 5 || !answers.every((a) => typeof a === "boolean")) {
    return json({ error: "bad_answers" }, 400);
  }

  const playerToday = localDate(tz);
  // A player can submit for their own today, or any past day (practice mode).
  if (!date || date > playerToday) return json({ error: "bad_date" }, 400);

  const day = await getDayRow(env.DB, date);
  if (!day) return json({ error: "no_day" }, 404);

  const score = day.cards.reduce((acc, c, i) => acc + (answers[i] === c.is_ai ? 1 : 0), 0);
  const isDaily = date === playerToday;

  // Practice rounds are stored (for per-card stats) but flagged by date mismatch
  // only via the client; streaks only count the player's local-today play.
  await env.DB.prepare(
    `INSERT INTO plays (anon_id, date, score, answers_json, ts)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (anon_id, date) DO UPDATE SET
       score = excluded.score, answers_json = excluded.answers_json, ts = excluded.ts`
  ).bind(anonId, date, score, JSON.stringify(answers), Math.floor(Date.now() / 1000)).run();

  // Per-card global stats: share of players who called each card correctly.
  const { results: allPlays } = await env.DB.prepare(
    "SELECT answers_json FROM plays WHERE date = ?"
  ).bind(date).all();
  const perCard = day.cards.map((_, i) => {
    let correct = 0;
    for (const p of allPlays) {
      const a = JSON.parse(p.answers_json);
      if (a[i] === day.cards[i].is_ai) correct++;
    }
    return allPlays.length ? Math.round((correct / allPlays.length) * 100) : null;
  });

  return json({
    date: day.date,
    day_number: day.day_number,
    score,
    is_daily: isDaily,
    cards: day.cards.map((c, i) => ({
      id: c.id,
      is_ai: c.is_ai,
      tell: c.tell[lang] || c.tell.en,
      correct: answers[i] === c.is_ai,
      pct_correct: perCard[i],
      author: c.author || null,
    })),
    percentile: isDaily ? await computePercentile(env.DB, date, score) : null,
    streak: await computeStreak(env.DB, anonId, tz),
  });
}
