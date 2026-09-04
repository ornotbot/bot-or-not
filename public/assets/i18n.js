// Bilingual UI from day one (spec: Hebrew-first launch, English toggle).
const I18N = {
  he: {
    landing_headline: "5 טקסטים ביום. חלקם אנושיים. חלקם AI. תצליחו להבדיל?",
    landing_sub: "בלי הרשמה. בלי אימייל. פשוט לשחק.",
    play_today: "לשחק את הסיבוב של היום",
    human: "אנושי",
    bot: "בוט",
    back: "חזרה",
    reveal_title: "התשובות",
    see_score: "לראות את התוצאה",
    share: "שיתוף",
    share_x: "שיתוף ב-X",
    share_linkedin: "שיתוף בלינקדאין",
    share_more: "עוד",
    share_copied: "התוצאה הועתקה - הדביקו אותה בפוסט",
    see_you_tomorrow: "נתראה מחר",
    archive_title: "ארכיון תרגול",
    archive_note: "ימים קודמים - לא נספרים לרצף או לאחוזון.",
    reminder_title: "תזכורת יומית",
    reminder_cta: "רשמו אותי",
    reminder_placeholder: "אימייל או מספר וואטסאפ",
    reminder_ok: "נרשמת! נדבר מחר.",
    reminder_err: "משהו לא הסתדר - בדקו את הכתובת.",
    streak: (n) => `רצף: ${n} ${n === 1 ? "יום" : "ימים"} 🔥`,
    score_of: (s) => `${s}/5`,
    better_than: (p) => `טוב מ-${p}% מהשחקנים היום`,
    percentile_pending: "האחוזון יתעדכן ככל שיותר אנשים ישחקו",
    fooled_stat: (pct, idx) => `אתמול ${pct}% מהשחקנים נפלו בטקסט מספר ${idx}`,
    correct_label: "צדקתם",
    wrong_label: "טעיתם",
    was_human: "אנושי",
    was_bot: "AI",
    pct_right: (p) => `${p}% מהשחקנים צדקו כאן`,
    practice_banner: "תרגול - לא נספר לרצף",
    next_in: (t) => `סיבוב חדש בעוד ${t}`,
    no_day: "הסיבוב של היום עוד לא עלה - נסו שוב מאוחר יותר.",
    share_text: (num, score, pct) =>
      `בוט או לא #${num} - ${score}/5` + (pct != null ? `, טוב מ-${pct}% מהשחקנים` : "") + "\n",
    card_of: (i) => `טקסט ${i} מתוך 5`,
    day_label: (n) => `יום #${n}`,
    played_today: "כבר שיחקתם היום - הנה התוצאה שלכם:",
  },
  en: {
    landing_headline: "5 texts a day. Some are human. Some are AI. Can you tell?",
    landing_sub: "No signup. No email. Just play.",
    play_today: "Play today's round",
    human: "HUMAN",
    bot: "BOT",
    back: "Back",
    reveal_title: "The reveal",
    see_score: "See my score",
    share: "Share",
    share_x: "Share on X",
    share_linkedin: "Share on LinkedIn",
    share_more: "More",
    share_copied: "Score copied - paste it into the post",
    see_you_tomorrow: "See you tomorrow",
    archive_title: "Practice archive",
    archive_note: "Past days - doesn't count for streak or percentile.",
    reminder_title: "Get a daily reminder",
    reminder_cta: "Remind me",
    reminder_placeholder: "Email or WhatsApp number",
    reminder_ok: "You're in! Talk tomorrow.",
    reminder_err: "That didn't work - check the address.",
    streak: (n) => `Streak: ${n} ${n === 1 ? "day" : "days"} 🔥`,
    score_of: (s) => `${s}/5`,
    better_than: (p) => `Better than ${p}% of players today`,
    percentile_pending: "Percentile updates as more people play",
    fooled_stat: (pct, idx) => `Yesterday ${pct}% of players got fooled by text #${idx}`,
    correct_label: "Correct",
    wrong_label: "Wrong",
    was_human: "Human",
    was_bot: "AI",
    pct_right: (p) => `${p}% of players called this one right`,
    practice_banner: "Practice - doesn't count for streak",
    next_in: (t) => `New round in ${t}`,
    no_day: "Today's round isn't up yet - check back later.",
    share_text: (num, score, pct) =>
      `Bot or Not #${num} - ${score}/5` + (pct != null ? `, better than ${pct}% of players` : "") + "\n",
    card_of: (i) => `Text ${i} of 5`,
    day_label: (n) => `Day #${n}`,
    played_today: "You already played today - here's your result:",
  },
};

function t(key, ...args) {
  const lang = window.BON_LANG || "en";
  const v = I18N[lang][key] ?? I18N.en[key];
  return typeof v === "function" ? v(...args) : v;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  const lang = window.BON_LANG || "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  const toggle = document.getElementById("lang-toggle"); // dormant: button removed for EN-only launch
  if (toggle) toggle.textContent = lang === "he" ? "EN" : "עב";
}
