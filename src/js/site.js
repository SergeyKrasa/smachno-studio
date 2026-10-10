/* Smachno Studio — поведение сайта. Без зависимостей.
   Всё содержимое видно и без скрипта; скрипт только добавляет удобства. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* приватный режим — просто не запоминаем */ } },
  };
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ── Меню на телефоне ── */
  const toggle = $(".menu-toggle");
  const nav = $("#site-nav");
  if (toggle && nav) {
    const setOpen = (open) => { toggle.setAttribute("aria-expanded", String(open)); nav.dataset.open = String(open); };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", (e) => { if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
  }

  /* ── Звёзды на эмали: крапинки тихо мерцают, как на логотипе ── */
  for (const canvas of $$("canvas.stars")) {
    if (reduceMotion) break;
    const ctx = canvas.getContext("2d");
    let stars = [], w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const seed = (n) => { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rnd = seed(7);
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: rnd() * w, y: rnd() * h, r: 0.5 + rnd() * rnd() * 2.1,
        gold: rnd() < 0.18, phase: rnd() * Math.PI * 2, speed: 0.35 + rnd() * 0.9, base: 0.15 + rnd() * 0.35,
      }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = (Math.sin(t / 1000 * s.speed + s.phase) + 1) / 2;
        const a = s.base + tw * tw * tw * 0.75;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.gold ? "#e7dca6" : "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1.7 && tw > 0.92) { // редкая «вспышка» — лучики, как у звезды на логотипе
          ctx.globalAlpha = (tw - 0.92) * 6;
          ctx.fillRect(s.x - s.r * 3.2, s.y - 0.4, s.r * 6.4, 0.8);
          ctx.fillRect(s.x - 0.4, s.y - s.r * 3.2, 0.8, s.r * 6.4);
        }
      }
      ctx.globalAlpha = 1;
      if (visible) raf = requestAnimationFrame(draw);
    };
    resize();
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw);
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw);
    });
  }

  /* ── Видео YouTube: сначала картинка, плеер — по нажатию ── */
  const playVideo = (holder, id, title, start = 0) => {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1${start ? `&start=${start}` : ""}`;
    iframe.title = title || "Видео Smachno Studio";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    holder.replaceChildren(iframe);
    holder.classList.add("is-playing");
  };
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button.yt");
    if (!btn) return;
    const holder = document.createElement("div");
    holder.className = btn.className;
    btn.replaceWith(holder);
    playVideo(holder, btn.dataset.id, btn.dataset.title);
  });

  /* «Смотреть этот шаг»: видео рецепта с нужной секунды */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-seek]");
    if (!b) return;
    const player = $("#player");
    const src = $(".yt", player);
    const id = src?.dataset.id || player.dataset.id;
    if (!id) return;
    player.dataset.id = id;
    const holder = document.createElement("div");
    holder.className = "yt";
    player.replaceChildren(holder);
    playVideo(holder, id, src?.dataset.title, Number(b.dataset.seek));
    player.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-print]")) print(); });

  /* Лента роликов на главной: выбранный ролик встаёт в большой экран */
  const reel = $(".reel");
  if (reel) {
    const screen = $("#screen");
    const nowTitle = $("#now-title");
    const nowLink = $("#now-link");
    reel.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      $$("button", reel).forEach((x) => x.setAttribute("aria-current", String(x === b)));
      const holder = document.createElement("div");
      holder.className = "yt";
      screen.replaceChildren(holder);
      playVideo(holder, b.dataset.id, b.dataset.title);
      nowTitle.textContent = b.dataset.title;
      if (b.dataset.recipe) { nowLink.href = b.dataset.recipe; nowLink.hidden = false; } else { nowLink.hidden = true; }
      if (innerWidth < 900) screen.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  /* ── Книга рецептов: ярлыки категорий и поиск ── */
  const book = $(".book[data-filterable]");
  if (book) {
    const dishes = $$(".dish", book);
    const chips = $$(".chip[data-filter]");
    const search = $("#recipe-search");
    const count = $(".finder-count");
    const empty = $(".book-empty", book);
    const phone = matchMedia("(max-width: 620px)");
    const lim = () => Number((phone.matches && book.dataset.limitPhone) || book.dataset.limit || 0);
    const more = $(".book-more");
    let cat = new URLSearchParams(location.search).get("cat") || "all";
    const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
    const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? "рецепт" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "рецепта" : "рецептов");
    const apply = (animate) => {
      const q = search ? norm(search.value.trim()) : "";
      let shown = 0;
      const update = () => {
        dishes.forEach((d) => {
          const match = (cat === "all" || d.dataset.cat === cat) && (!q || norm(d.dataset.search).includes(q));
          const limit = lim();
          const fits = match && (!limit || cat !== "all" || q || shown < limit);
          d.hidden = !fits;
          d.classList.toggle("feature", fits && shown === 0 && d.dataset.canFeature === "true" && !q);
          if (fits) shown++;
          if (fits && animate && !reduceMotion) { d.classList.remove("reveal"); void d.offsetWidth; d.classList.add("reveal"); d.style.animationDelay = `${Math.min(shown, 8) * 35}ms`; }
        });
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === cat)));
        if (empty) empty.hidden = shown > 0;
        if (count) count.textContent = q || cat !== "all" ? `Нашлось: ${shown} ${plural(shown)}` : `Всего ${shown} ${plural(shown)}`;
        if (more) more.hidden = cat !== "all" || !!q;
      };
      update();
    };
    chips.forEach((c) => c.addEventListener("click", () => {
      cat = c.dataset.filter;
      const url = new URL(location.href);
      cat === "all" ? url.searchParams.delete("cat") : url.searchParams.set("cat", cat);
      history.replaceState(null, "", url);
      apply(true);
    }));
    if (search) {
      search.addEventListener("input", () => apply(false));
      const q = new URLSearchParams(location.search).get("q");
      if (q) search.value = q;
    }
    phone.addEventListener?.("change", () => apply(false));
    apply(false);
  }

  /* ── Звон эмалированной миски: синтез без звуковых файлов ── */
  let audio;
  const chime = () => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const now = audio.currentTime;
      const master = audio.createGain(); master.gain.value = 0.32; master.connect(audio.destination);
      [[523.25, 1], [1318.5, .42], [2093, .22], [2793.8, .12]].forEach(([f, a], i) => {
        for (const strike of [0, 0.42]) {
          const o = audio.createOscillator(); const g = audio.createGain();
          o.type = "sine"; o.frequency.value = f * (1 + i * 0.0015);
          g.gain.setValueAtTime(0, now + strike);
          g.gain.linearRampToValueAtTime(a, now + strike + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, now + strike + 2.4 - i * 0.35);
          o.connect(g).connect(master); o.start(now + strike); o.stop(now + strike + 2.6);
        }
      });
    } catch { /* без звука — тоже можно */ }
  };

  /* ── Таймеры ── */
  const dock = document.createElement("div");
  dock.className = "timers"; dock.setAttribute("aria-live", "polite");
  document.body.append(dock);
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const baseTitle = document.title;
  let titleBlink = 0;
  const startTimer = (seconds, label) => {
    if (audio && audio.state === "suspended") audio.resume();
    audio = audio || (() => { try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return undefined; } })();
    const el = document.createElement("div");
    el.className = "timer"; el.setAttribute("role", "timer");
    const C = 2 * Math.PI * 16;
    el.innerHTML = `<div class="dial"><svg viewBox="0 0 38 38" aria-hidden="true"><circle class="track" cx="19" cy="19" r="16"/><circle class="fill" cx="19" cy="19" r="16" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg></div>
      <div><div class="time">${fmt(seconds)}</div><div class="label"></div></div>
      <button type="button" class="pause" aria-label="Пауза">${icon("pause")}</button>
      <button type="button" class="close" aria-label="Убрать таймер">${icon("close")}</button>`;
    $(".label", el).textContent = label;
    dock.append(el);
    let end = Date.now() + seconds * 1000, left = seconds, paused = false, done = false;
    const fill = $(".fill", el), time = $(".time", el), pauseBtn = $(".pause", el);
    const tick = () => {
      if (!paused && !done) {
        left = (end - Date.now()) / 1000;
        time.textContent = fmt(left);
        fill.style.strokeDashoffset = String(C * (1 - Math.max(0, left) / seconds));
        if (left <= 0) {
          done = true; el.classList.add("ringing"); time.textContent = "Готово";
          pauseBtn.hidden = true;
          chime(); navigator.vibrate?.([300, 120, 300, 120, 300]);
          const again = setInterval(() => (el.isConnected && el.classList.contains("ringing") ? chime() : clearInterval(again)), 6000);
          clearInterval(titleBlink);
          let on = false; titleBlink = setInterval(() => { document.title = (on = !on) ? `Готово: ${label}` : baseTitle; }, 900);
        }
      }
    };
    const iv = setInterval(tick, 250); tick();
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      if (paused) { pauseBtn.innerHTML = icon("play"); pauseBtn.setAttribute("aria-label", "Продолжить"); }
      else { end = Date.now() + left * 1000; pauseBtn.innerHTML = icon("pause"); pauseBtn.setAttribute("aria-label", "Пауза"); }
    });
    const remove = () => { clearInterval(iv); el.remove(); if (!$(".timer.ringing", dock)) { clearInterval(titleBlink); document.title = baseTitle; } };
    $(".close", el).addEventListener("click", remove);
    el.addEventListener("click", (e) => { if (done && !e.target.closest("button")) remove(); });
  };
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".timer-chip");
    if (chip) startTimer(Number(chip.dataset.seconds), chip.dataset.label);
  });

  /* ── Рецепт: ингредиенты, порции, режим готовки ── */
  const recipe = $("[data-recipe]");
  if (!recipe) return;
  const slug = recipe.dataset.recipe;

  // Отмеченные ингредиенты запоминаются в этом браузере
  const pantry = $(".pantry");
  const boxes = $$(".ingredients input", pantry || document);
  const note = $(".pantry-note");
  const saved = store.get(`smachno:${slug}:have`, []);
  boxes.forEach((b, i) => { b.checked = saved.includes(i); });
  const updateNote = () => {
    if (!note) return;
    const have = boxes.filter((b) => b.checked).length;
    const all = boxes.length;
    note.classList.toggle("done", have === all && all > 0);
    note.textContent = have === 0 ? "Отмечайте то, что уже на столе." : have === all ? "Всё на месте — можно начинать!" : `Собрано ${have} из ${all}`;
  };
  boxes.forEach((b) => b.addEventListener("change", () => {
    store.set(`smachno:${slug}:have`, boxes.map((x, i) => (x.checked ? i : -1)).filter((i) => i >= 0));
    updateNote();
    syncCookPantry();
  }));
  updateNote();

  // Пересчёт порций
  const servingsOut = $("#servings");
  if (servingsOut) {
    const base = Number(servingsOut.dataset.base);
    let n = store.get(`smachno:${slug}:servings`, base);
    const minus = $("#servings-minus"), plus = $("#servings-plus");
    const nice = (v) => {
      const r = Math.round(v * 4) / 4;
      const whole = Math.floor(r), frac = r - whole;
      const f = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[frac] || "";
      if (r >= 10) return String(Math.round(v));
      return (whole ? String(whole) : f ? "" : "0") + f;
    };
    const render = () => {
      servingsOut.value = n; servingsOut.textContent = n;
      minus.disabled = n <= 1; plus.disabled = n >= 24;
      $$(".qty[data-base]").forEach((q) => {
        const v = Number(q.dataset.base) * n / base;
        const num = Number.isInteger(v) && v < 1000 ? String(v) : v >= 50 ? String(Math.round(v / 5) * 5) : nice(v);
        q.textContent = num + (q.dataset.unit ? " " + q.dataset.unit : "");
      });
      store.set(`smachno:${slug}:servings`, n);
      syncCookPantry();
    };
    minus.addEventListener("click", () => { n = Math.max(1, n - 1); render(); });
    plus.addEventListener("click", () => { n = Math.min(24, n + 1); render(); });
    render();
  }

  // Режим готовки
  const cook = $("#cook");
  const opener = $$("[data-open-cook]");
  if (!cook || !opener.length) return;
  const steps = $$(".steps > li").map((li) => ({ body: $(".step-body", li).innerHTML, photo: $(".step-photo img", li) }));
  const stage = $(".cook-stage", cook);
  const progress = $(".cook-progress", cook);
  const prev = $("#cook-prev"), next = $("#cook-next");
  const cookPantry = $(".cook-pantry", cook);
  const pantryBtn = $("#cook-pantry-btn");
  const wakeNote = $(".wake-note", cook);
  let i = store.get(`smachno:${slug}:step`, 0);
  const count = $(".cook-count", cook);
  const fade = () => stage.classList.toggle("more", stage.scrollHeight - stage.scrollTop - stage.clientHeight > 8);
  stage.addEventListener("scroll", fade, { passive: true });
  let wake = null;
  progress.innerHTML = steps.map(() => "<i></i>").join("");
  const finalHTML = $("#cook-final-template").innerHTML;

  function syncCookPantry() {
    const target = $(".cook-pantry .ingredients");
    if (!target || !pantry) return;
    const list = $(".ingredients", pantry).cloneNode(true);
    $$("input", list).forEach((inp, k) => { inp.id = `cook-${inp.id}`; inp.closest("label").htmlFor = inp.id; inp.checked = boxes[k].checked;
      inp.addEventListener("change", () => { boxes[k].checked = inp.checked; boxes[k].dispatchEvent(new Event("change")); }); });
    target.replaceWith(list);
  }

  const show = (to, dir = 1) => {
    i = Math.max(0, Math.min(steps.length, to));
    store.set(`smachno:${slug}:step`, i >= steps.length ? 0 : i);
    const last = i >= steps.length;
    const step = document.createElement("div");
    const s = steps[i];
    step.className = `cook-step ${last ? "cook-final" : ""} ${!last && s.photo ? "with-photo" : ""} ${reduceMotion ? "" : dir > 0 ? "enter" : "enter-back"}`;
    if (last) step.innerHTML = finalHTML;
    else {
      step.innerHTML = `<div><div class="text">${s.body}</div></div>`;
      if (s.photo) {
        const fig = document.createElement("figure"); fig.className = "cook-photo";
        const img = new Image(); img.src = s.photo.currentSrc || s.photo.src; img.alt = s.photo.alt;
        fig.append(img); step.append(fig);
      }
    }
    stage.replaceChildren(step);
    $$("i", progress).forEach((bar, k) => { bar.className = k < i ? "done" : k === i ? "now" : ""; });
    count.textContent = last ? "Готово" : `Шаг ${i + 1} из ${steps.length}`;
    stage.scrollTop = 0;
    requestAnimationFrame(fade);
    prev.disabled = i === 0;
    next.innerHTML = last ? `Закрыть ${icon("close")}` : i === steps.length - 1 ? `Готово ${icon("check")}` : `Дальше ${icon("arrow")}`;
    next.focus({ preventScroll: true });
  };
  const keepAwake = async () => {
    try { wake = await navigator.wakeLock?.request("screen"); if (wake) $(".wake-text", wakeNote).textContent = "· Экран не погаснет, пока открыт режим готовки."; }
    catch { $(".wake-text", wakeNote).textContent = ""; }
  };
  // Таймеры не должны закрывать конец шага: оставляем под ними место
  new ResizeObserver(() => cook.style.setProperty("--dock", dock.offsetHeight ? `${dock.offsetHeight + 12}px` : "0px")).observe(dock);
  const open = () => {
    syncCookPantry();
    cook.showModal();
    cook.append(dock);
    document.documentElement.style.overflow = "hidden";
    show(i >= steps.length ? 0 : i, 1);
    keepAwake();
  };
  const close = () => { cook.close(); };
  cook.addEventListener("close", () => { document.body.append(dock); document.documentElement.style.overflow = ""; wake?.release?.(); wake = null; cookPantry.dataset.open = "false"; pantryBtn.setAttribute("aria-pressed", "false"); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cook.open) keepAwake(); });
  opener.forEach((b) => b.addEventListener("click", open));
  $("#cook-close").addEventListener("click", close);
  prev.addEventListener("click", () => show(i - 1, -1));
  next.addEventListener("click", () => (i >= steps.length ? close() : show(i + 1, 1)));
  pantryBtn.addEventListener("click", () => {
    const o = cookPantry.dataset.open !== "true";
    cookPantry.dataset.open = String(o); pantryBtn.setAttribute("aria-pressed", String(o));
  });
  cook.addEventListener("keydown", (e) => {
    if (e.target.closest("input")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next.click(); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); if (i > 0) show(i - 1, -1); }
  });
  let touchX = null, touchY = null;
  stage.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { dx < 0 ? (i < steps.length && show(i + 1, 1)) : (i > 0 && show(i - 1, -1)); }
    touchX = null;
  });
  stage.addEventListener("click", (e) => { if (e.target.closest("[data-cook-restart]")) show(0, -1); });
})();
