// QC gates (spec section 2). Pure functions + the adversarial gate.

const CONFIG = {
  wordBand: [20, 55],          // length parity: every card in a day inside this band
  sourceBand: [20, 80],        // sourcing filter for human candidates
  aiBanList: ["—", "–", "delve", "it's not just", "in today's fast-paced world",
              "game-changer", "game changer", "navigate the", "landscape",
              "ever-evolving", "fast-paced", "!", "#"],
};

function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

// Sourcing filter: 20-80 words, no links, no code, no quotes of parent comments.
function isUsableHuman(text) {
  const n = wordCount(text);
  if (n < CONFIG.sourceBand[0] || n > CONFIG.sourceBand[1]) return false;
  if (/https?:|www\.|\[link\]/i.test(text)) return false;
  if (/[{}\[\]<>]/.test(text)) return false;
  if (/\b(function|const|var|npm|sudo|http)\b/.test(text)) return false;
  if (/\[deleted\]|\[removed\]/i.test(text)) return false;
  return true;
}

function passesLengthParity(texts) {
  return texts.every((t) => {
    const n = wordCount(t);
    return n >= CONFIG.wordBand[0] && n <= CONFIG.wordBand[1];
  });
}

function banListHits(aiText) {
  const lower = aiText.toLowerCase();
  return CONFIG.aiBanList.filter((b) => lower.includes(b.toLowerCase()));
}

function normalizeHuman(text) {
  // Light touch: capitalize first letter only. KEEP typos - over-cleaning
  // makes humans look like AI (spec section 2).
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Adversarial gate: blind-classify each text. Kill AI texts the classifier
// catches with high confidence; kill human texts it flags as AI.
async function adversarialCheck(items, complete) {
  // items: [{key, text, is_ai}]. One batched blind call, shuffled.
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const list = shuffled.map((it, i) => `[${i + 1}] ${it.text}`).join("\n\n");
  const prompt =
    `Below are short social-media texts. Some were written by real people, some by an AI imitating them.\n` +
    `For EACH text, answer with its number, your verdict (HUMAN or AI), and confidence (low/high), ` +
    `one per line like: 3 AI high\n\n${list}`;
  const out = await complete(prompt, { prefer: process.env.ADVERSARY_PROVIDER, maxTokens: 1200 });
  const verdicts = {};
  for (const line of out.split("\n")) {
    const m = line.match(/(\d+)\s+(HUMAN|AI)\s+(low|high)/i);
    if (m) verdicts[parseInt(m[1])] = { verdict: m[2].toUpperCase(), confidence: m[3].toLowerCase() };
  }
  return shuffled.map((it, i) => {
    const v = verdicts[i + 1] || { verdict: null, confidence: null };
    let kill = false, reason = null;
    if (it.is_ai && v.verdict === "AI" && v.confidence === "high") { kill = true; reason = "adversary caught AI text"; }
    if (!it.is_ai && v.verdict === "AI") { kill = true; reason = "adversary flags human text as AI"; }
    return { ...it, adversary: v, kill, reason };
  });
}

module.exports = { CONFIG, wordCount, stripHtml, isUsableHuman, passesLengthParity, banListHits, normalizeHuman, adversarialCheck };
