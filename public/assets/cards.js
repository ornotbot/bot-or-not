// Platform card renderers. Each returns a DOM node that looks like a cropped,
// anonymized screenshot from the source platform. Avatars are silhouettes,
// names are redacted bars - the text is the game, not the person.

const X_ICONS = {
  reply: '<svg viewBox="0 0 24 24"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/></svg>',
  repost: '<svg viewBox="0 0 24 24"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>',
  like: '<svg viewBox="0 0 24 24"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"/></svg>',
  views: '<svg viewBox="0 0 24 24"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>',
};

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstChild;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function pseudoStats(text) {
  // Deterministic fake engagement from text length - just chrome, not signal.
  const n = text.length;
  return { replies: (n % 7) + 1, reposts: (n % 5) + 1, likes: (n % 41) + 8, views: ((n * 37) % 900 + 100) + "" };
}

const PLATFORM_RENDERERS = {
  linkedin(card) {
    return el(`
      <div class="sm-card sm-linkedin">
        <div class="li-row">
          <div class="sm-avatar"></div>
          <div class="li-main">
            <div class="li-head"><span class="redact li-name"></span><span class="li-meta">· 2nd · 4h</span></div>
            <div class="redact li-headline"></div>
            <div class="li-text" dir="auto">${esc(card.text)}</div>
            <div class="li-actions"><span>Like</span><span>Reply</span></div>
          </div>
        </div>
      </div>`);
  },

  x(card) {
    const s = pseudoStats(card.text);
    return el(`
      <div class="sm-card sm-x">
        <div class="x-row">
          <div class="sm-avatar"></div>
          <div class="x-main">
            <div class="x-head"><span class="redact x-name"></span><span class="x-handle">@••••• · 3h</span></div>
            <div class="x-text" dir="auto">${esc(card.text)}</div>
            <div class="x-actions">
              <span class="xa">${X_ICONS.reply}${s.replies}</span>
              <span class="xa">${X_ICONS.repost}${s.reposts}</span>
              <span class="xa">${X_ICONS.like}${s.likes}</span>
              <span class="xa">${X_ICONS.views}${s.views}</span>
            </div>
          </div>
        </div>
      </div>`);
  },

  whatsapp(card) {
    return el(`
      <div class="sm-card sm-whatsapp">
        <div class="wa-bubble">
          <span class="wa-text" dir="auto">${esc(card.text)}</span>
          <span class="wa-time">09:41</span>
        </div>
      </div>`);
  },
};

function renderPlatformCard(card) {
  const r = PLATFORM_RENDERERS[card.platform] || PLATFORM_RENDERERS.x;
  return r(card);
}

const PLATFORM_NAMES = { linkedin: "LinkedIn", x: "X", whatsapp: "WhatsApp" };
