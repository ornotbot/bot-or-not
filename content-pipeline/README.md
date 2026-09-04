# Content pipeline

Status: WORKING. Produces the 7 seeded days (2026-09-04 .. 2026-09-10).

Weekly flow (spec section 2):

```bash
node content-pipeline/pipeline.js source                          # pre-2023 HN comments -> data/human-pool.json
#   -> review the pool, mark "selected": true on the good ones, set platform per text
node content-pipeline/pipeline.js generate                        # LLM twins -> data/twins.json
#   (needs ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY;
#    or hand-author data/twins.json in the weekly review - same format)
node content-pipeline/pipeline.js qc                              # gates -> data/qc-report.json
#   (adversarial blind classifier runs when an LLM key is set; SKIP_ADVERSARY=1 to skip)
#   -> write context_label + tell (he/en) per card into data/labels.json
node content-pipeline/pipeline.js build --days 7 --start YYYY-MM-DD
#   -> data/seed-days.json + seed.sql
npx wrangler d1 execute bot-or-not --remote --file=seed.sql       # publish
```

Gates implemented (lib/qc.js): length parity (20-55 words/card), AI ban list
(em dash, "delve", "it's not just X", hashtags, emoji, exclamation marks,
motivational closers), human normalization (capitalize first letter only,
typos kept), adversarial blind classifier (kills caught AI texts and
human texts flagged as AI).

Sourcing (lib/source.js): HN Algolia API with a hard created_at < 2022-11-30
cutoff (pre-ChatGPT = guaranteed human), 20-80 words, no links, no code.
Reddit dumps and Ziv's audience (with consent DMs) are still TODO sources.

Generation (lib/generate.js): 4 candidates per slot, few-shot anchored on 3
real human texts, persona + length band + ban list in the prompt. Best clean
candidate is picked; the rest are recorded as killed_candidates.

First batch stats: 117 sourced, 21 selected, 72 AI candidates authored,
2 killed in adversarial review (structure tells), 35 cards shipped across
7 days (18 human / 17 AI, ratios alternate 3:2 and 2:3, platforms mixed).
