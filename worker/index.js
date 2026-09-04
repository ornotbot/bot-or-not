// bot-or-not-reminders - cron worker that sends the daily "today's game is live" reminder.
//
// Runs hourly at :05 (wrangler.toml [triggers]). For each subscriber whose LOCAL time
// is in the 9:00-9:59 AM window and who has not been sent a reminder on their local
// date, sends via their channel. Email goes through Resend (https://resend.com,
// free tier: 100 emails/day). WhatsApp is a stub - see README.

const DEFAULT_TZ = "Asia/Jerusalem"; // game-local default when subscriber tz is unknown
const SEND_HOUR = 9;                 // local hour to send at

function localParts(tz, now) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hourCycle: "h23",
    });
    const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) };
  } catch {
    return null; // invalid tz stored - skip rather than crash the batch
  }
}

async function sendEmail(env, to, lang) {
  const gameUrl = env.GAME_URL || "https://bot-or-not.pages.dev";
  const he = lang === "he";
  const subject = he ? "בוט או לא של היום עלה" : "Today's Bot or Not is live";
  const text = he
    ? `5 טקסטים חדשים מחכים לך. ${gameUrl}`
    : `5 new texts are waiting. Can you tell human from AI today? ${gameUrl}`;
  if (!env.RESEND_API_KEY) {
    console.log(`[dry-run] RESEND_API_KEY not set - would email ${to}: ${subject} | ${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.REMINDER_FROM || "Bot or Not <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

async function sendWhatsApp(env, to, lang) {
  // TODO: WhatsApp reminders need the WhatsApp Business Platform (Cloud API) or a
  // provider like Twilio: an approved business number, a pre-approved message
  // template, and per-message pricing. Intentionally a no-op until that's set up.
  console.log(`[stub] whatsapp reminder not implemented - would message ${to}`);
}

export default {
  async scheduled(event, env, ctx) {
    const now = new Date(event.scheduledTime || Date.now());
    const { results } = await env.DB.prepare(
      "SELECT id, channel, address, lang, tz, last_sent FROM reminders"
    ).all();
    let sent = 0, skipped = 0, failed = 0;
    for (const sub of results || []) {
      const local = localParts(sub.tz || DEFAULT_TZ, now);
      if (!local || local.hour !== SEND_HOUR || sub.last_sent === local.date) {
        skipped++;
        continue;
      }
      try {
        if (sub.channel === "email") await sendEmail(env, sub.address, sub.lang);
        else await sendWhatsApp(env, sub.address, sub.lang);
        await env.DB.prepare("UPDATE reminders SET last_sent = ? WHERE id = ?")
          .bind(local.date, sub.id).run();
        sent++;
      } catch (e) {
        failed++;
        console.error(`reminder send failed for subscriber ${sub.id}:`, e.message || e);
      }
    }
    console.log(`reminders run: sent=${sent} skipped=${skipped} failed=${failed}`);
  },

  async fetch() {
    return new Response("bot-or-not-reminders: cron-only worker, see README");
  },
};
