// Client-side share card (spec section 3): square PNG on a canvas,
// no server image rendering. 1080x1080, emoji grid, score, streak,
// percentile, day number, game URL.
const GAME_URL = "https://bot-or-not.pages.dev"; // TODO: replace with final domain

function drawShareCard({ dayNumber, score, results, streak, percentile, lang }) {
  const canvas = document.getElementById("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = 1080, H = 1080;

  // Background
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.direction = "ltr"; // emoji grid and numbers stay LTR in both languages

  // Title
  ctx.fillStyle = "#f2f4f8";
  ctx.font = "800 72px -apple-system, 'Segoe UI', Heebo, Arial, sans-serif";
  const title = lang === "he" ? `בוט או לא #${dayNumber}` : `Bot or Not #${dayNumber}`;
  ctx.fillText(title, W / 2, 180);

  // 5 result squares, drawn (not emoji font) so the PNG renders identically everywhere
  const sq = 130, gap = 24;
  const totalW = results.length * sq + (results.length - 1) * gap;
  let x = (W - totalW) / 2;
  const y = 300;
  for (const ok of results) {
    ctx.fillStyle = ok ? "#2fbf71" : "#e5534b";
    ctx.beginPath();
    ctx.roundRect(x, y, sq, sq, 18);
    ctx.fill();
    x += sq + gap;
  }

  // Score
  ctx.fillStyle = "#f2f4f8";
  ctx.font = "800 130px -apple-system, 'Segoe UI', Heebo, Arial, sans-serif";
  ctx.fillText(`${score}/5`, W / 2, 580);

  // Streak
  ctx.font = "700 52px -apple-system, 'Segoe UI', Heebo, Arial, sans-serif";
  ctx.fillStyle = "#9aa3b2";
  const streakLine = lang === "he" ? `רצף: ${streak}` : `Streak: ${streak}`;
  ctx.fillText(streakLine, W / 2, 690);

  // Percentile - the viral payload
  if (percentile != null) {
    ctx.fillStyle = "#4f8cff";
    ctx.font = "800 58px -apple-system, 'Segoe UI', Heebo, Arial, sans-serif";
    const pctLine = lang === "he" ? `טוב מ-${percentile}% מהשחקנים היום` : `Better than ${percentile}% of players`;
    ctx.fillText(pctLine, W / 2, 800);
  }

  // URL
  ctx.fillStyle = "#9aa3b2";
  ctx.font = "600 44px -apple-system, 'Segoe UI', Heebo, Arial, sans-serif";
  ctx.fillText(GAME_URL.replace(/^https?:\/\//, ""), W / 2, 960);

  return canvas;
}

async function shareCard(payload) {
  const canvas = drawShareCard(payload);
  const text = t("share_text", payload.dayNumber, payload.score, payload.percentile) + GAME_URL;

  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  const file = blob ? new File([blob], `bot-or-not-${payload.dayNumber}.png`, { type: "image/png" }) : null;

  // Native share sheet with image where supported, text-only otherwise,
  // clipboard as last resort.
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "aborted";
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "aborted";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
