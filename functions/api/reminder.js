// POST /api/reminder { anon_id, channel: 'email'|'whatsapp', address, lang }
// Daily-reminder opt-in from the score screen.
import { json } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { anon_id: anonId, channel, address, lang } = body || {};
  if (!["email", "whatsapp"].includes(channel)) return json({ error: "bad_channel" }, 400);
  if (!address || typeof address !== "string" || address.length > 200) {
    return json({ error: "bad_address" }, 400);
  }
  const clean = address.trim();
  if (channel === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return json({ error: "bad_email" }, 400);
  }
  if (channel === "whatsapp" && !/^\+?[0-9]{7,15}$/.test(clean.replace(/[\s-]/g, ""))) {
    return json({ error: "bad_phone" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO reminders (anon_id, channel, address, lang, ts) VALUES (?, ?, ?, ?, ?)"
  ).bind(anonId || null, channel, clean, lang === "en" ? "en" : "he", Math.floor(Date.now() / 1000)).run();
  return json({ ok: true });
}
