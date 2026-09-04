#!/usr/bin/env node
/**
 * Bot or Not - content pipeline (SKELETON).
 *
 * Weekly local job: source human texts -> generate AI twins -> QC gates ->
 * emit a SQL file of day-rows for D1. See README.md for the full checklist.
 *
 * Nothing below is wired to real sources or LLM APIs yet; every stage is a
 * documented stub so the shape is settled before content work starts.
 */

const CONFIG = {
  daysPerBatch: 14,
  cardsPerDay: 5,
  wordBand: [25, 55], // length parity gate
  aiBanList: ["—", "delve", "it's not just", "in today's fast-paced world", "game-changer"],
  llm: {
    generator: "gemini-2.5-flash-lite", // or gpt-4o-mini
    adversary: "gpt-4o-mini",           // second model, blind classifier
  },
};

// --- Stage 1: source human candidates -------------------------------------
async function sourceHumanTexts() {
  // TODO: pre-2023 Reddit/HN archive pull. Filter 20-80 words, no links,
  // no subreddit jargon. Return [{text, topic, source}].
  throw new Error("not implemented: human sourcing is a separate workstream");
}

// --- Stage 2: generate AI twins -------------------------------------------
async function generateAiTwin(humanText, contextLabel) {
  // TODO: call CONFIG.llm.generator with context label + topic + persona +
  // length band + ban list + 3 few-shot human anchors. 4 candidates, pick 1.
  throw new Error("not implemented");
}

// --- Stage 3: QC gates ------------------------------------------------------
function wordCount(s) {
  return s.trim().split(/\s+/).length;
}

function passesLengthParity(texts) {
  return texts.every((t) => {
    const n = wordCount(t);
    return n >= CONFIG.wordBand[0] && n <= CONFIG.wordBand[1];
  });
}

function passesBanList(aiText) {
  const lower = aiText.toLowerCase();
  return !CONFIG.aiBanList.some((b) => lower.includes(b.toLowerCase()));
}

function normalizeHuman(text) {
  // Light touch: capitalize first letter only. KEEP typos - over-cleaning
  // makes humans look like AI (spec section 2).
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function adversarialCheck(texts) {
  // TODO: blind-classify each text with CONFIG.llm.adversary. Kill AI texts
  // it catches with high confidence; kill human texts it flags as AI.
  throw new Error("not implemented");
}

// --- Stage 4: emit D1 SQL ---------------------------------------------------
function dayRow(date, dayNumber, cards) {
  // cards: [{id, context_label:{he,en}, text, is_ai, tell:{he,en}}]
  return { date, day_number: dayNumber, cards_json: JSON.stringify(cards) };
}

async function main() {
  console.log("Bot or Not content pipeline - SKELETON, nothing to run yet.");
  console.log("See content-pipeline/README.md for the stage checklist.");
  console.log("Gates implemented so far: length parity, ban list, human normalization.");
}

if (require.main === module) main();

module.exports = { passesLengthParity, passesBanList, normalizeHuman, wordCount, dayRow };
