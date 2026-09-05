// Bot or Not - app state machine.
// Screens: landing -> card x5 -> reveal -> score. Practice mode reuses the
// same flow for past days without touching streak/percentile.

(function () {
  // ---------- identity ----------
  // Anon ID in localStorage + cookie (spec section 4). No signup to play.
  function getAnonId() {
    let id = localStorage.getItem("bon_anon_id");
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
      localStorage.setItem("bon_anon_id", id);
    }
    document.cookie = `bon_anon_id=${id}; max-age=31536000; path=/; samesite=lax`;
    return id;
  }

  const state = {
    lang: "en", // English-only UI for launch; i18n dicts + toggle kept dormant
    anonId: getAnonId(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    mode: "daily", // 'daily' | 'practice'
    day: null,     // {date, day_number, cards:[{id, context_label, text}]}
    answers: [null, null, null, null, null],
    idx: 0,
    result: null,  // submit response
  };
  window.BON_LANG = state.lang;

  const $ = (id) => document.getElementById(id);
  const screens = ["screen-landing", "screen-card", "screen-reveal", "screen-score"];
  function show(id) {
    screens.forEach((s) => $(s).classList.toggle("active", s === id));
    window.scrollTo(0, 0);
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), { data });
    return data;
  }

  // ---------- landing ----------
  async function initLanding() {
    applyI18n();
    show("screen-landing");
    try {
      const data = await api(`/api/today?tz=${encodeURIComponent(state.tz)}&lang=${state.lang}&anon_id=${state.anonId}`);
      state.day = data;
      if (data.streak > 0) {
        $("landing-streak").textContent = t("streak", data.streak);
        $("landing-streak").classList.remove("hidden");
      }
      if (data.played) {
        // Already played today: landing shows a done-for-today state (no redirect).
        state.result = { ...data.played, day_number: data.day_number, date: data.date, is_daily: true };
        $("btn-play").classList.add("hidden");
        $("landing-played").classList.remove("hidden");
        $("landing-countdown").classList.remove("hidden");
        startCountdownInto("landing-countdown");
        return;
      }
      $("btn-play").classList.remove("hidden");
      $("landing-played").classList.add("hidden");
    } catch (e) {
      if (e.data && e.data.error === "no_day") {
        $("landing-error").textContent = t("no_day");
        $("landing-error").classList.remove("hidden");
      }
    }
    // Social proof from yesterday (independent of today's round being up).
    try {
      const stats = await api(`/api/stats?tz=${encodeURIComponent(state.tz)}`);
      renderPlayerCount($("landing-players"), stats.players_today);
      if (stats.available && stats.most_fooled) {
        $("landing-stats").textContent = t("fooled_stat", stats.most_fooled.fooled_pct, stats.most_fooled.card_index);
        $("landing-stats").classList.remove("hidden");
      }
    } catch { /* social proof is optional */ }
  }

  // ---------- round ----------
  function startRound(day, mode) {
    state.day = day;
    state.mode = mode;
    state.answers = [null, null, null, null, null];
    state.idx = 0;
    state.result = null;
    state.submitting = false;
    $("btn-human").disabled = false;
    $("btn-bot").disabled = false;
    $("scoring").classList.add("hidden");
    $("practice-banner").classList.toggle("hidden", mode === "daily");
    renderCard();
    show("screen-card");
  }

  function renderCard() {
    const i = state.idx;
    const card = state.day.cards[i];
    $("card-context").textContent = card.context_label;
    const frame = $("card-text");
    frame.innerHTML = "";
    frame.appendChild(renderPlatformCard(card));
    document.querySelectorAll("#progress-dots .dot").forEach((d, j) => {
      d.classList.toggle("current", j === i);
      d.classList.toggle("answered", state.answers[j] !== null);
    });
    $("btn-human").classList.toggle("picked", state.answers[i] === false);
    $("btn-bot").classList.toggle("picked", state.answers[i] === true);
    $("btn-back").classList.toggle("hidden", i === 0);

    // Swipe tutorial: once ever, on the first card of a daily round.
    const wrap = $("swipe-wrap");
    if (i === 0 && state.mode === "daily" && !localStorage.getItem("bon_seen_swipe")) {
      wrap.classList.add("tutorial");
      $("swipe-hint").classList.remove("hidden");
      const frame = $("card-text");
      frame.addEventListener("animationend", () => {
        wrap.classList.remove("tutorial");
        $("swipe-hint").classList.add("hidden");
        localStorage.setItem("bon_seen_swipe", "1");
      }, { once: true });
    }
  }

  function answer(guessedBot) {
    if (state.submitting) return;
    state.answers[state.idx] = guessedBot;
    if (state.idx < 4) {
      state.idx++;
      renderCard();
    } else {
      // 5th answer: lock the controls and show feedback immediately so a
      // slow network can't invite a second tap.
      state.submitting = true;
      $("btn-human").disabled = true;
      $("btn-bot").disabled = true;
      $("scoring").classList.remove("hidden");
      submitRound();
    }
  }

  async function submitRound() {
    try {
      const result = await api("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anon_id: state.anonId,
          tz: state.tz,
          lang: state.lang,
          date: state.day.date,
          answers: state.answers,
        }),
      });
      state.result = result;
      renderReveal();
      show("screen-reveal");
    } catch (e) {
      state.submitting = false;
      $("btn-human").disabled = false;
      $("btn-bot").disabled = false;
      $("scoring").classList.add("hidden");
      alert(t("submit_err"));
    }
  }

  // ---------- reveal ----------
  function renderReveal() {
    const list = $("reveal-list");
    list.innerHTML = "";
    state.result.cards.forEach((c, i) => {
      const verdict = c.correct
        ? `<span class="verdict-correct">\u2705 ${t("correct_label")}</span>`
        : `<span class="verdict-wrong">\u274C ${t("wrong_label")}</span>`;
      const actual = c.is_ai ? t("was_bot") : t("was_human");
      const plat = state.day.cards[i].platform ? PLATFORM_NAMES[state.day.cards[i].platform] + " \u00B7 " : "";
      const stat = c.pct_correct != null ? `<div class="stat">${t("pct_right", c.pct_correct)}</div>` : "";
      const head = `<div class="head">${verdict}<span>${plat}${t("card_of", i + 1)} - ${actual}</span></div>`;
      const tell = `<div class="tell" dir="auto">${escapeHtml(c.tell)}</div>`;

      if (!c.is_ai && c.author) {
        // Human card: flip to uncover the real author (the payoff).
        const a = c.author;
        const div = document.createElement("div");
        div.className = "reveal-card flip";
        const avatar = a.avatar
          ? `<img class="author-avatar" src="${escapeHtml(a.avatar)}" alt="">`
          : `<span class="author-avatar author-initial">${escapeHtml((a.name || "?").slice(0, 1).toUpperCase())}</span>`;
        const note = a.public_figure ? `<div class="endorse-note">${t("no_endorsement")}</div>` : "";
        div.innerHTML =
          `<div class="flip-inner">` +
            `<div class="flip-face flip-front">${head}${tell}${stat}` +
              `<div class="who-hint">${t("reveal_who")}</div></div>` +
            `<div class="flip-face flip-back">` +
              `<div class="author-row">${avatar}<div class="author-meta">` +
                `<div class="author-name">${escapeHtml(a.name)}</div>` +
                `<div class="author-handle">${escapeHtml(a.handle)} \u00B7 ${escapeHtml(a.date)}</div>` +
              `</div></div>` +
              `<a class="author-link" href="${escapeHtml(a.source_url)}" target="_blank" rel="noopener">${t("view_original")}</a>` +
              note +
            `</div>` +
          `</div>`;
        div.addEventListener("click", (e) => {
          if (e.target.closest("a")) return;
          div.classList.toggle("flipped");
        });
        list.appendChild(div);
        // Staggered auto-flip: the reveal is the payoff, not a stat line.
        setTimeout(() => {
          const inner = div.querySelector(".flip-inner");
          const front = div.querySelector(".flip-front");
          const back = div.querySelector(".flip-back");
          inner.style.height = Math.max(front.scrollHeight, back.scrollHeight) + "px";
          div.classList.add("flipped");
        }, 350 + i * 350);
      } else {
        const div = document.createElement("div");
        div.className = "reveal-card";
        const badge = c.is_ai ? `<span class="ai-badge">${t("written_by_ai")}</span>` : "";
        div.innerHTML = head + badge + tell + stat;
        list.appendChild(div);
      }
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // Real server-side player count, display-gated: below 100 the count stays
  // hidden behind "Be one of the first today." - no fake numbers anywhere.
  function renderPlayerCount(el, n) {
    if (n == null) return;
    el.textContent = n >= 100 ? t("players_count", n) : t("players_early");
    el.classList.remove("hidden");
  }

  // ---------- score ----------
  function renderScore() {
    const r = state.result;
    $("score-line").textContent = t("score_of", r.score);
    const results = r.cards.map((c) => c.correct);
    $("score-grid").textContent = results.map((ok) => (ok ? "🟩" : "🟥")).join("");
    $("score-streak").textContent = t("streak", r.streak || 0);
    renderPlayerCount($("score-players"), r.players_today);
    $("replay-note").classList.toggle("hidden", !r.replay);
    if (r.percentile != null) {
      $("score-percentile").textContent = t("better_than", r.percentile);
    } else {
      $("score-percentile").textContent = t("percentile_pending");
    }
    loadArchive();
  }

  function startCountdown() {
    $("countdown").classList.remove("hidden");
    startCountdownInto("countdown");
  }

  function startCountdownInto(elId) {
    function tick() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight - now;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      $(elId).textContent = t("next_in", `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------- archive ----------
  async function loadArchive() {
    try {
      const data = await api(`/api/archive?tz=${encodeURIComponent(state.tz)}`);
      const list = $("archive-list");
      list.innerHTML = "";
      if (!data.days.length) {
        list.innerHTML = `<p class="muted">${t("archive_empty")}</p>`;
      }
      data.days.forEach((d) => {
        const btn = document.createElement("button");
        btn.className = "archive-item";
        btn.type = "button";
        btn.innerHTML = `<span>${t("day_label", d.day_number)}</span><span class="muted">${d.date}</span>`;
        btn.addEventListener("click", async () => {
          const day = await api(`/api/day?date=${d.date}&lang=${state.lang}&tz=${encodeURIComponent(state.tz)}`);
          startRound(day, "practice");
        });
        list.appendChild(btn);
      });
    } catch { /* archive is below the fold; fail quiet */ }
  }

  // ---------- events ----------
  $("btn-play").addEventListener("click", () => {
    if (state.day) startRound(state.day, "daily");
  });
  $("btn-human").addEventListener("click", () => flyOff(1, 0));
  $("btn-bot").addEventListener("click", () => flyOff(-1, 0));
  $("btn-back").addEventListener("click", () => {
    if (state.idx > 0) { state.idx--; renderCard(); }
  });
  $("btn-to-score").addEventListener("click", () => {
    renderScore();
    show("screen-score");
    if (state.result && state.result.is_daily) startCountdown();
  });
  $("landing-played").addEventListener("click", () => {
    if (!state.result) return;
    renderScore();
    show("screen-score");
    if (state.result.is_daily) startCountdown();
  });
  $("btn-tomorrow").addEventListener("click", () => {
    show("screen-landing");
    startCountdownOnLanding();
  });
  function startCountdownOnLanding() {
    initLanding();
  }
  function buildScoreText() {
    const r = state.result;
    const grid = r.cards.map((c) => (c.correct ? "\u{1F7E9}" : "\u2B1B")).join("");
    const lines = [
      `Bot or Not #${r.day_number}`,
      `${grid} ${r.score}/5`,
      t("streak", r.streak || 0),
    ];
    if (r.percentile != null) lines.push(t("better_than", r.percentile));
    return lines.join("\n");
  }

  function showToast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2500);
  }

  $("btn-share-x").addEventListener("click", () => {
    if (!state.result) return;
    const url = window.location.origin;
    const intent = "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(buildScoreText()) + "&url=" + encodeURIComponent(url);
    window.open(intent, "_blank", "noopener");
  });

  $("btn-share-linkedin").addEventListener("click", async () => {
    if (!state.result) return;
    // LinkedIn share-offsite accepts a URL only - copy the score text first.
    try {
      await navigator.clipboard.writeText(buildScoreText() + "\n" + window.location.origin);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = buildScoreText() + "\n" + window.location.origin;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(t("share_copied"));
    window.open("https://www.linkedin.com/sharing/share-offsite/?url=" +
      encodeURIComponent(window.location.origin), "_blank", "noopener");
  });

  $("btn-share").addEventListener("click", async () => {
    if (!state.result) return;
    await shareCard({
      dayNumber: state.result.day_number,
      score: state.result.score,
      results: state.result.cards.map((c) => c.correct),
      streak: state.result.streak || 0,
      percentile: state.result.percentile,
      lang: state.lang,
    });
  });

  // Tinder-style swipe: RIGHT = HUMAN, left = BOT, down = back to previous card.
  // Buttons below are the fallback; they trigger the same fly-off animation.
  const swipeWrap = $("swipe-wrap");
  const cardFrame = $("card-text");
  const stampHuman = $("stamp-human");
  const stampBot = $("stamp-bot");
  const SWIPE_THRESHOLD = 90;   // px of horizontal drag to commit an answer
  const BACK_THRESHOLD = 110;   // px of vertical drag to go back
  let drag = null;
  let flying = false;

  function resetCardMotion() {
    cardFrame.style.transition = "none";
    cardFrame.style.transform = "";
    cardFrame.classList.remove("dragging");
    stampHuman.style.transition = "none";
    stampBot.style.transition = "none";
    stampHuman.style.opacity = "0";
    stampBot.style.opacity = "0";
  }

  function flyOff(dir, dy) {
    // dir: 1 = right (HUMAN), -1 = left (BOT)
    if (flying || state.submitting) return;
    flying = true;
    const stamp = dir === 1 ? stampHuman : stampBot;
    stamp.style.opacity = "1";
    cardFrame.style.transition = "transform 0.35s ease-in";
    cardFrame.style.transform =
      `translate(${dir * window.innerWidth * 1.2}px, ${(dy || 0) + 40}px) rotate(${dir * 28}deg)`;
    setTimeout(() => {
      flying = false;
      answer(dir === -1);
      resetCardMotion();
    }, 340);
  }

  function snapBack() {
    cardFrame.style.transition = "transform 0.25s ease-out";
    cardFrame.style.transform = "";
    stampHuman.style.transition = "opacity 0.2s";
    stampBot.style.transition = "opacity 0.2s";
    stampHuman.style.opacity = "0";
    stampBot.style.opacity = "0";
  }

  swipeWrap.addEventListener("pointerdown", (e) => {
    if (!state.day || flying) return;
    drag = { x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    swipeWrap.setPointerCapture(e.pointerId);
    cardFrame.style.transition = "none";
    cardFrame.classList.add("dragging");
  });
  swipeWrap.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x0;
    drag.dy = e.clientY - drag.y0;
    cardFrame.style.transform =
      `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 16}deg)`;
    stampHuman.style.opacity = String(Math.max(0, Math.min(drag.dx / SWIPE_THRESHOLD, 1)));
    stampBot.style.opacity = String(Math.max(0, Math.min(-drag.dx / SWIPE_THRESHOLD, 1)));
  });
  function endDrag(commit) {
    if (!drag) return;
    const { dx, dy } = drag;
    drag = null;
    cardFrame.classList.remove("dragging");
    if (commit && dx > SWIPE_THRESHOLD) flyOff(1, dy);
    else if (commit && dx < -SWIPE_THRESHOLD) flyOff(-1, dy);
    else if (commit && dy > BACK_THRESHOLD && Math.abs(dx) < 60 && state.idx > 0) {
      state.idx--;
      renderCard();
      resetCardMotion();
    } else snapBack();
  }
  swipeWrap.addEventListener("pointerup", () => endDrag(true));
  swipeWrap.addEventListener("pointercancel", () => endDrag(false));

  $("archive-toggle").addEventListener("click", () => {
    const btn = $("archive-toggle");
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    $("archive-body").classList.toggle("collapsed", open);
  });

  initLanding();
})();
