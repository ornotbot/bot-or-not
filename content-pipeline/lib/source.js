// Source human texts from the HN Algolia API with a hard pre-ChatGPT cutoff
// (2022-11-30). Guaranteed human by construction (spec section 2, source 1).
const https = require("https");
const { stripHtml, isUsableHuman, wordCount } = require("./qc");

const PRE_CHATGPT_TS = 1669791600; // 2022-11-30T09:00:00Z

const TOPICS = [
  "remote work", "hiring", "startup failed", "layoffs", "meetings",
  "salary", "side project", "burnout", "coffee", "productivity",
  "manager", "open source", "interview", "coworking", "freelance",
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

async function sourceHN({ perTopic = 40 } = {}) {
  const seen = new Set();
  const pool = [];
  for (const topic of TOPICS) {
    const url = `https://hn.algolia.com/api/v1/search?tags=comment&query=${encodeURIComponent(topic)}` +
      `&numericFilters=created_at_i<${PRE_CHATGPT_TS}&hitsPerPage=${perTopic}`;
    const r = await get(url);
    for (const h of r.hits || []) {
      if (!h.comment_text || seen.has(h.objectID)) continue;
      seen.add(h.objectID);
      const text = stripHtml(h.comment_text);
      // take the first paragraph only when the comment is multi-paragraph
      const first = text.split(/  +/)[0].trim();
      for (const cand of [first, text]) {
        if (isUsableHuman(cand)) {
          pool.push({
            key: "hn-" + h.objectID,
            source: "hn",
            topic,
            text: cand,
            words: wordCount(cand),
            url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          });
          break;
        }
      }
    }
  }
  return pool;
}

module.exports = { sourceHN, PRE_CHATGPT_TS, TOPICS };
