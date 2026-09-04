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
        // Already played today: jump straight to their score card.
        state.result = { ...data.played, day_number: data.day_number, date: data.date, is_daily: true };
        renderScore();
        show("screen-score");
        return;
      }
    } catch (e) {
      if (e.data && e.data.error === "no_day") {
        $("landing-error").textContent = t("no_day");
        $("landing-error").classList.remove("hidden");
      }
    }
    // Social proof from yesterday (independent of today's round being up).
    try {
      const stats = await api(`/api/stats?tz=${encodeURIComponent(state.tz)}`);
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
  }

  function answer(guessedBot) {
    state.answers[state.idx] = guessedBot;
    if (state.idx < 4) {
      state.idx++;
      renderCard();
    } else {
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
      alert(t("reminder_err"));
    }
  }

  // ---------- reveal ----------
  function renderReveal() {
    const list = $("reveal-list");
    list.innerHTML = "";
    state.result.cards.forEach((c, i) => {
      const div = document.createElement("div");
      div.className = "reveal-card";
      const verdict = c.correct
        ? `<span class="verdict-correct">✅ ${t("correct_label")}</span>`
        : `<span class="verdict-wrong">❌ ${t("wrong_label")}</span>`;
      const actual = c.is_ai ? t("was_bot") : t("was_human");
      const plat = state.day.cards[i].platform ? PLATFORM_NAMES[state.day.cards[i].platform] + " · " : "";
      const stat = c.pct_correct != null ? `<div class="stat">${t("pct_right", c.pct_correct)}</div>` : "";
      div.innerHTML =
        `<div class="head">${verdict}<span>${plat}${t("card_of", i + 1)} - ${actual}</span></div>` +
        `<div class="tell" dir="auto">${escapeHtml(c.tell)}</div>${stat}`;
      list.appendChild(div);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ---------- score ----------
  function renderScore() {
    const r = state.result;
    $("score-line").textContent = t("score_of", r.score);
    const results = r.cards.map((c) => c.correct);
    $("score-grid").textContent = results.map((ok) => (ok ? "🟩" : "🟥")).join("");
    $("score-streak").textContent = t("streak", r.streak || 0);
    if (r.percentile != null) {
      $("score-percentile").textContent = t("better_than", r.percentile);
    } else {
      $("score-percentile").textContent = t("percentile_pending");
    }
    loadArchive();
  }

  function startCountdown() {
    $("countdown").classList.remove("hidden");
    function tick() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight - now;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      $("countdown").textContent = t("next_in", `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
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
      data.days.forEach((d) => {
        const btn = document.createElement("button");
        btn.className = "archive-item";
        btn.type = "button";
        btn.innerHTML = `<span>${t("day_label", d.day_number)}</span><span class="muted">${d.date}</span>`;
        btn.addEventListener("click", async () => {
          const day = await api(`/api/day?date=${d.date}&lang=${state.lang}`);
          startRound(day, "practice");
        });
        list.appendChild(btn);
      });
    } catch { /* archive is below the fold; fail quiet */ }
  }

  // ---------- reminder opt-in ----------
  let reminderChannel = "email";
  document.querySelectorAll(".reminder-channels .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".reminder-channels .chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      reminderChannel = chip.dataset.channel;
    });
  });
  $("btn-reminder").addEventListener("click", async () => {
    const address = $("reminder-address").value.trim();
    const msg = $("reminder-msg");
    try {
      await api("/api/reminder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anon_id: state.anonId, channel: reminderChannel, address, lang: state.lang }),
      });
      msg.textContent = t("reminder_ok");
    } catch {
      msg.textContent = t("reminder_err");
    }
    msg.classList.remove("hidden");
  });

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
  $("btn-tomorrow").addEventListener("click", () => {
    show("screen-landing");
    startCountdownOnLanding();
  });
  function startCountdownOnLanding() {
    initLanding();
  }
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
    if (flying) return;
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

  initLanding();
})();
