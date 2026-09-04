// Adds per-card author fields (HN usernames for existing days) and appends the
// two celebrity demo days (#8, #9). Regenerates seed.sql.
// Celeb posts verified via Twitter's syndication API (text, date, avatar) -
// source URLs stored per card.
const fs = require("fs");
const path = require("path");
const DATA = path.join(__dirname, "..", "data");

const days = JSON.parse(fs.readFileSync(path.join(DATA, "seed-days.json")));
const pool = JSON.parse(fs.readFileSync(path.join(DATA, "human-pool.json")));
const hnAuthors = JSON.parse(fs.readFileSync(path.join(DATA, "hn-authors.json")));
const byText = Object.fromEntries(pool.map((p) => [p.text, p]));

// 1. Author fields for existing HN-sourced human cards.
for (const day of days) {
  for (const c of day.cards) {
    if (c.is_ai || c.author) continue;
    const p = byText[c.text];
    if (!p) throw new Error("no pool match for: " + c.text.slice(0, 50));
    const a = hnAuthors[p.key];
    c.author = {
      name: a.username,
      handle: "Hacker News",
      avatar: null,
      source_url: a.url,
      date: a.created_at.slice(0, 10),
      public_figure: false,
    };
  }
}

const L = (he, en) => ({ he, en });
const celeb = (name, handle, avatar, id, date) => ({
  name, handle, avatar: `/assets/authors/${avatar}.jpg`,
  source_url: `https://twitter.com/${handle.slice(1)}/status/${id}`,
  date, public_figure: true,
});
const hn = (key) => ({
  name: hnAuthors[key].username, handle: "Hacker News", avatar: null,
  source_url: hnAuthors[key].url, date: hnAuthors[key].created_at.slice(0, 10),
  public_figure: false,
});
const txt = (key) => pool.find((p) => p.key === key).text;

// 2. Celebrity day #8 (2026-09-11): Musk + regulars, 3H/2AI.
const day8 = {
  date: "2026-09-11", day_number: 8,
  cards: [
    { id: 1, platform: "x", is_ai: true,
      context_label: L("פוסט ב-X על רכישות", "Post on X about buying companies"),
      text: "Thinking about buying the alphabet. Too many letters are underperforming",
      tell: L("אבסורד הוא השפה של מאסק, אבל הציוץ האמיתי עוגן ברגע ספציפי (ימים אחרי עסקת טוויטר) עם קריצה היסטורית. החיקוי אקראי בלי עוגן - AI מחקה את הרנדומליות, לא את ההקשר.",
              "Absurdity is Musk's register, but the real one is anchored to a specific moment (days after agreeing to buy Twitter) with a historical wink. The twin is unanchored randomness - AI imitates the quirk, not the context.") },
    { id: 2, platform: "x", is_ai: false, author: hn("hn-9999872"),
      context_label: L("תגובה על סדרי עדיפויות בגיוס", "Comment about hiring priorities"),
      text: txt("hn-9999872"),
      tell: L("מתחיל ב-'Well..' מגניב, מסתיים ב-'conclave of developers' - נימה מתוסכלת אמיתית בלי מסקנה נקייה. AI לא כותב 'conclave'.",
              "Opens with a deflating 'Well..', lands on 'a huge conclave of developers' - real exasperation, no tidy takeaway. AI doesn't write 'conclave'.") },
    { id: 3, platform: "x", is_ai: false,
      author: celeb("Elon Musk", "@elonmusk", "elonmusk", "1519480761749016577", "2022-04-28"),
      context_label: L("פוסט ב-X על רכישות", "Post on X about buying companies"),
      text: "Next I\u2019m buying Coca-Cola to put the cocaine back in",
      tell: L("הטיימינג הוא הרמז: פורסם ימים אחרי שהסכים לקנות את טוויטר - הבדיחה עובדת רק כניצחון. AI מחקה את הפורמט, אין לו הקשר של 44 מיליארד דולר.",
              "The timing is the tell: posted days after agreeing to buy Twitter, the joke only works as a victory lap. AI can mimic the format; it doesn't have a $44B context to flex about.") },
    { id: 4, platform: "x", is_ai: true,
      context_label: L("תגובה על סדרי עדיפויות בגיוס", "Comment about hiring priorities"),
      text: "Hiring developers feels like progress because it's measurable, but a company that can't sell, support, or pay its bills is just an expensive codebase. The bottleneck is rarely engineering capacity - it's everything around it.",
      tell: L("מאוזן, חלק, ומסתיים באפוריזם מסודר ('the bottleneck is rarely X - it's Y'). הגרסה האנושית מקטרת בלי מסקנה נקייה.",
              "Balanced, smooth, and closes with a tidy aphorism ('the bottleneck is rarely X - it's Y'). The human version just vents, no clean takeaway.") },
    { id: 5, platform: "x", is_ai: false, author: hn("hn-9901852"),
      context_label: L("תגובה על ניתוח כישלונות של סטארטאפים", "Comment about startup postmortems"),
      text: txt("hn-9901852"),
      tell: L("מבולגן בכוונה: '(irony)' בסוגריים, הגדרה מחדש באמצע המחשבה, אין פאנץ'. AI מלטש ציניות; בן אדם פשוט חושב בקול.",
              "Messy on purpose: a parenthetical '(irony)', a redefinition mid-thought, no punchline. AI polishes cynicism; a human just thinks out loud.") },
  ],
};

// 3. Celebrity day #9 (2026-09-12): Trump + Altman + regulars, 2H/3AI.
const day9 = {
  date: "2026-09-12", day_number: 9,
  cards: [
    { id: 1, platform: "x", is_ai: true,
      context_label: L("פוסט ב-X על קבלת החלטות", "Post on X about decision-making"),
      text: "Compounding applies to reputation, knowledge, and trust. Most people only understand it for money.",
      tell: L("קצב של רשימה משולשת עם 'most people' מתנשא - מבנה מושלם, לא מתחייב על כלום. הציוץ האמיתי של אלטמן מתחייב על טענה קונטרה-אינטואיטיבית ספציפית.",
              "Triple-list cadence with a smug 'most people' kicker - structurally perfect, commits to nothing. The real Altman tweet stakes a specific counterintuitive claim (magnitude over frequency).") },
    { id: 2, platform: "x", is_ai: false,
      author: celeb("Donald J. Trump", "@realDonaldTrump", "realdonaldtrump", "332308211321425920", "2013-05-09"),
      context_label: L("פוסט ב-X על מבקרים", "Post on X about critics"),
      text: "Sorry losers and haters, but my I.Q. is one of the highest -and you all know it! Please don't feel so stupid or insecure,it's not your fault",
      tell: L("רווחים חסרים אחרי הפסיק ו-'-and', 'I.Q.' עם נקודות, עלבון ישיר - שום עורך או מודל לא היה משאיר את זה ככה. איד בלי עריכה.",
              "Missing spaces after the comma and '-and', the punctuated 'I.Q.', a direct insult - no editor or model would leave it like this. Unfiltered id, zero cleanup.") },
    { id: 3, platform: "x", is_ai: true,
      context_label: L("תגובה על ניתוח כישלונות של סטארטאפים", "Comment about startup postmortems"),
      text: "Founders love to turn a failed startup into a neat list of lessons, as if the next attempt is now de-risked. But most post-mortems are stories we tell to make randomness feel like progress.",
      tell: L("ציניות מלוטשת עם משפט נעילה quotable ('make randomness feel like progress'). הגרסה האנושית מסתבכת באמצע ולא נועלת.",
              "Polished cynicism with a quotable closer ('make randomness feel like progress'). The human version tangles itself mid-thought and never lands a punchline.") },
    { id: 4, platform: "x", is_ai: false,
      author: celeb("Sam Altman", "@sama", "sama", "975913922891988992", "2018-03-20"),
      context_label: L("פוסט ב-X על קבלת החלטות", "Post on X about decision-making"),
      text: "You can be wrong on a lot of decisions if you are really right on a few huge ones.  Optimize for the magnitude of your good decisions, not the percentage of the time you are right.",
      tell: L("מתחייב על טענה קונטרה-אינטואיטיבית ועוצר - בלי גידרוף, בלי דוגמאות, בלי שרשור. גרסאות AI של העצה הזו כמעט תמיד מוסיפות משפט מרכך או רשימה מסודרת.",
              "Commits to a counterintuitive claim and stops - no hedging, no examples, no thread. AI versions of this advice almost always add a softening clause or a tidy list.") },
    { id: 5, platform: "linkedin", is_ai: false, author: hn("hn-9948543"),
      context_label: L("תגובה בלינקדאין על מזל והתמדה", "LinkedIn comment about luck and persistence"),
      text: txt("hn-9948543"),
      tell: L("ההערה בסוגריים בסוף ('or she/he is an idiot') היא בדיוק הדבר ש-AI מעדן החוצה. אמיתי, לא מלוטש, קצת לא נעים.",
              "The closing parenthetical ('or she/he is an idiot') is exactly what AI smooths away. Real, unpolished, slightly rude.") },
  ],
};

days.push(day8, day9);
fs.writeFileSync(path.join(DATA, "seed-days.json"), JSON.stringify(days, null, 2));

const esc = (s) => s.replace(/'/g, "''");
let sql = "-- Generated by content-pipeline. Real pre-2023 human texts + matched AI twins + celebrity days.\n";
sql += "INSERT OR REPLACE INTO days (date, day_number, cards_json) VALUES\n";
sql += days.map((d) => `  ('${d.date}', ${d.day_number}, '${esc(JSON.stringify(d.cards))}')`).join(",\n") + ";\n";
sql += `DELETE FROM days WHERE date NOT IN (${days.map((d) => `'${d.date}'`).join(",")});\n`;
fs.writeFileSync(path.join(__dirname, "..", "seed.sql"), sql);
console.log(`built ${days.length} days; celeb days #8 (3H/2AI) and #9 (2H/3AI) appended`);
