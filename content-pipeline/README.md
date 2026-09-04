# Content pipeline (skeleton)

Status: SKELETON ONLY. Content sourcing is a separate workstream - this
directory holds the shape of the job plus TODOs. The game currently runs on
3 hardcoded placeholder days (`../data/seed-days.json` -> `../seed.sql`).

What this job must do (spec section 2), per weekly batch:

1. Source human texts
   - [ ] TODO: pull candidates from pre-2023 public archives (Reddit/HN dumps).
         Filter: 20-80 words, no links, no heavy subreddit jargon.
   - [ ] TODO: manual collection from Ziv's LinkedIn audience, with one-line
         consent DM, displayed anonymously. NEVER scrape LinkedIn's API.
   - [ ] TODO: fallback - commissioned human writers ($20/session).

2. Generate matched AI twins
   - [ ] TODO: for each human text, prompt a cheap model (Gemini 2.5 Flash-Lite
         or GPT-4o-mini) with the same context label + topic + persona +
         length band. 4 candidates per slot.
   - [ ] TODO: few-shot anchor on 3 real human examples so the AI mimics the
         distribution, not generic AI style.

3. QC gates (automated, in this script)
   - [ ] length parity: all 10 texts of a day within a 25-55 word band
   - [ ] ban-list on AI texts: em dash, "delve", "it's not just X", hashtags,
         emoji (unless the day's human texts have emoji)
   - [ ] light normalization of human texts (capitalize first letter only,
         KEEP typos)
   - [ ] adversarial self-test: second LLM call classifies each text blind;
         kill AI texts it catches, kill human texts it flags

4. Human review (weekly, ~1 hour): eyeball everything, write the one-line
   "tell" per card (both languages), target fool-rate 40-60% per AI card.

5. Load: write 14 day-rows into D1
   (`wrangler d1 execute bot-or-not --file=...`), pre-keyed by date so
   publishing is automatic.

Run (once implemented):
    node content-pipeline/pipeline.js --weeks 2 --out out/batch.sql
