// Shared helpers for the Bot or Not API (Cloudflare Pages Functions + D1).

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export function onRequestOptions() {
  return json({}, 204);
}

// Player-local date (YYYY-MM-DD) from an IANA timezone name.
// Day boundaries are per-player (spec section 1): Israelis and Americans
// should not share a day boundary.
export function localDate(tz, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(at);
    const get = (t) => parts.find((p) => p.type === t).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDayRow(db, date) {
  const row = await db.prepare("SELECT date, day_number, cards_json FROM days WHERE date = ?")
    .bind(date).first();
  if (!row) return null;
  return { date: row.date, day_number: row.day_number, cards: JSON.parse(row.cards_json) };
}

// Strip answers/tells: the client only ever sees text + context before submitting
// (spec section 8.3 - labels and tells live server-side until submission).
export function publicCards(cards, lang) {
  return cards.map((c) => ({
    id: c.id,
    context_label: c.context_label[lang] || c.context_label.en,
    text: c.text,
  }));
}

// Streak = consecutive player-local days played, ending today or yesterday
// (playing counts, any score - spec section 3).
export async function computeStreak(db, anonId, tz) {
  const { results } = await db.prepare(
    "SELECT date FROM plays WHERE anon_id = ? ORDER BY date DESC"
  ).bind(anonId).all();
  if (!results.length) return 0;
  const dates = new Set(results.map((r) => r.date));
  const today = localDate(tz);
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  if (!dates.has(cursor)) return 0;
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

// Percentile: share of players with a lower score, plus half the ties
// (spec section 3). Returns an integer 0-100, or null with too little data.
export async function computePercentile(db, date, score) {
  const row = await db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN score < ? THEN 1 ELSE 0 END) AS below,
       SUM(CASE WHEN score = ? THEN 1 ELSE 0 END) AS ties
     FROM plays WHERE date = ?`
  ).bind(score, score, date).first();
  if (!row || !row.total) return null;
  return Math.round(((row.below + 0.5 * row.ties) / row.total) * 100);
}
