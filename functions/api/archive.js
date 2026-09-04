// GET /api/archive?tz=... - list of past playable days (practice mode).
import { json, localDate } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const tz = url.searchParams.get("tz") || "UTC";
  const today = localDate(tz);
  const { results } = await env.DB.prepare(
    "SELECT date, day_number FROM days WHERE date < ? ORDER BY date DESC LIMIT 60"
  ).bind(today).all();
  return json({ days: results });
}
