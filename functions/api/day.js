// GET /api/day?date=YYYY-MM-DD&lang=... - fetch a past day for practice mode.
// Texts only; labels/tells come back from /api/submit like the daily round.
import { json, getDayRow, publicCards } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const lang = url.searchParams.get("lang") === "en" ? "en" : "he";
  if (!date) return json({ error: "missing_date" }, 400);
  const day = await getDayRow(env.DB, date);
  if (!day) return json({ error: "no_day" }, 404);
  return json({ date: day.date, day_number: day.day_number, cards: publicCards(day.cards, lang) });
}
