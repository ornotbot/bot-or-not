// Provider-agnostic LLM call. Set exactly one of:
//   ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
// The adversarial classifier uses ADVERSARY_PROVIDER to force a different
// provider than the generator when both keys exist (blind second opinion).
const https = require("https");

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: "POST",
        headers: { "content-type": "application/json", ...headers } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) return reject(new Error(`LLM ${res.statusCode}: ${data.slice(0, 300)}`));
          resolve(JSON.parse(data));
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function provider(prefer) {
  const have = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };
  if (prefer && have[prefer]) return prefer;
  return Object.keys(have).find((k) => have[k]) || null;
}

async function complete(prompt, { prefer, model, maxTokens = 600 } = {}) {
  const p = provider(prefer);
  if (!p) throw new Error("no LLM API key set (ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)");
  if (p === "anthropic") {
    const r = await post("https://api.anthropic.com/v1/messages",
      { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      { model: model || "claude-haiku-4-5", max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }] });
    return r.content.map((b) => b.text || "").join("");
  }
  if (p === "openai") {
    const r = await post("https://api.openai.com/v1/chat/completions",
      { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      { model: model || "gpt-4o-mini", max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }] });
    return r.choices[0].message.content;
  }
  // gemini
  const key = process.env.GEMINI_API_KEY;
  const m = model || "gemini-2.5-flash-lite";
  const r = await post(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
    {}, { contents: [{ parts: [{ text: prompt }] }] });
  return r.candidates[0].content.parts.map((x) => x.text).join("");
}

module.exports = { complete, provider };
