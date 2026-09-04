// Generate matched AI twins (spec section 2): same context label + topic +
// persona + length band as the human text, few-shot anchored on real human
// examples so the AI mimics the distribution, not generic AI style.
const { CONFIG, banListHits, wordCount } = require("./qc");

const PERSONAS = ["startup founder", "HR manager", "skeptical engineer", "junior dev", "product manager", "freelancer"];

function buildPrompt(human, anchors, platform) {
  const band = `${Math.max(CONFIG.wordBand[0], human.words - 8)}-${Math.min(CONFIG.wordBand[1], human.words + 8)}`;
  const persona = PERSONAS[human.text.length % PERSONAS.length];
  const anchorText = anchors.map((a, i) => `Example ${i + 1}: "${a.text}"`).join("\n");
  return `You are generating training data for a game where players guess whether short social-media texts are human or AI written. Your job: write an AI text that is INDISTINGUISHABLE from the human examples.

Platform: ${platform}
Context: ${human.context_label_en || "a " + platform + " text about " + human.topic}
Persona: ${persona}
Length: ${band} words (the matching human text has ${human.words} words).

Real human examples in this distribution (match their register, messiness and specificity):
${anchorText}

Rules:
- Do NOT use: em dash, the word "delve", "game-changer", "it's not just X", "in today's fast-paced world", hashtags, emoji, exclamation marks, bullet points.
- No motivational closer. No balanced "on one hand / on the other hand". Have one clear point.
- Sound like a specific person with a specific take, not like advice.

Write 4 candidate texts. Output ONLY the 4 texts, separated by a line containing just "---".`;
}

async function generateTwins(humans, complete, { candidatesPerSlot = 4 } = {}) {
  const out = [];
  for (const h of humans) {
    // few-shot anchors: 3 other human texts, not this one
    const anchors = humans.filter((x) => x.key !== h.key).slice(0, 3);
    const raw = await complete(buildPrompt(h, anchors, h.platform), { maxTokens: 900 });
    const candidates = raw.split(/\n---\n/).map((s) => s.trim()).filter((s) => wordCount(s) >= 10);
    const scored = candidates.map((text) => ({ text, banHits: banListHits(text), words: wordCount(text) }));
    const clean = scored.filter((c) => c.banHits.length === 0);
    out.push({
      for: h.key,
      platform: h.platform,
      topic: h.topic,
      candidates: scored,
      picked: (clean[0] || scored[0] || {}).text || null,
      killed_candidates: scored.length - clean.length,
    });
  }
  return out;
}

module.exports = { generateTwins, buildPrompt };
