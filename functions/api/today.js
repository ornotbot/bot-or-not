// GET /api/today?tz=Asia/Jerusalem&anon_id=...
// Returns today's 5 cards (texts + context labels only) for the player's local date,
// plus their existing result if they already played.
import { json, localDate, getDayRow, publicCards, computeStreak, computePercentile } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const tz = url.searchParams.get("tz") || "UTC";
  const anonId = url.searchParams.get("anon_id") || "";
  const lang = url.searchParams.get("lang") === "en" ? "en" : "he";
  const date = localDate(tz);

  const day = await getDayRow(env.DB, date);
  if (!day) {
    return json({ error: "no_day", message: "No round published for today yet." }, 404);
  }

  let played = null;
  if (anonId) {
    const play = await env.DB.prepare(
      "SELECT score, answers_json FROM plays WHERE anon_id = ? AND date = ?"
    ).bind(anonId, date).first();
    if (play) {
      const answers = JSON.parse(play.answers_json);
      played = {
        score: play.score,
        answers,
        cards: day.cards.map((c, i) => ({
          id: c.id,
          is_ai: c.is_ai,
          tell: c.tell[lang] || c.tell.en,
          correct: answers[i] === c.is_ai,
        })),
        percentile: await computePercentile(env.DB, date, play.score),
        streak: await computeStreak(env.DB, anonId, tz),
      };
    }
  }

  return json({
    date: day.date,
    day_number: day.day_number,
    cards: publicCards(day.cards, lang),
    played,
    streak: await computeStreak(env.DB, anonId, tz),
  });
}
