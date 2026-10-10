// Сборка сайта Smachno Studio.
// Запуск: node build.mjs  →  готовый сайт появляется в папке docs/ (её и показывает GitHub Pages).
// Рецепты, статьи, видео и тексты лежат в папке content/ — правьте их там.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sprite, i } from "./src/icons.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "docs");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "content", f), "utf8"));

const site = readJSON("site.json");
const recipes = readJSON("recipes.json");
const articles = readJSON("articles.json");
const videos = readJSON("videos.json");
const CATS = site.categories; // [{ id, name, plural }]
const catName = (id) => CATS.find((c) => c.id === id)?.name ?? "";
const bySlug = Object.fromEntries(recipes.map((r) => [r.slug, r]));
const VERSION = Date.now().toString(36);

/* ───────── helpers ───────── */
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nbsp = (s = "") => esc(s).replace(/(^|\s)([а-яёА-ЯЁa-zA-Z]{1,2})\s/g, "$1$2\u00a0").replace(/\s—/g, "\u00a0—");
const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
const isoDuration = (min) => (min ? `PT${Math.floor(min / 60) ? Math.floor(min / 60) + "H" : ""}${min % 60 ? (min % 60) + "M" : ""}` : undefined);

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

// Картинка блюда: AVIF + JPEG, два размера. Файлы лежат в src/img/dishes/<имя>-800.jpg и т. д.
function pic(rel, name, alt, { sizes = "100vw", cls = "", eager = false, dir = "dishes" } = {}) {
  const base = `${rel}assets/img/${dir}/${name}`;
  const has = (w, ext) => fs.existsSync(path.join(ROOT, "src/img", dir, `${name}-${w}.${ext}`));
  const widths = [800, 1600].filter((w) => has(w, "jpg"));
  if (!widths.length) return `<div class="${cls} ph" role="img" aria-label="${esc(alt)}"></div>`;
  const set = (ext) => widths.filter((w) => has(w, ext)).map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
  const avif = set("avif");
  const load = eager ? `fetchpriority="high"` : `loading="lazy"`;
  return `<picture>${avif ? `<source type="image/avif" srcset="${avif}" sizes="${sizes}">` : ""}<img class="${cls}" src="${base}-${widths[0]}.jpg" srcset="${set("jpg")}" sizes="${sizes}" alt="${esc(alt)}" width="1600" height="1000" ${load} decoding="async"></picture>`;
}

// Самая большая версия картинки — для превью в соцсетях и разметки для поисковиков
const bigImg = (dir, name) => [1600, 800].map((w) => `${dir}/${name}-${w}.jpg`).find((f) => fs.existsSync(path.join(ROOT, "src/img", f)));

/* ───────── Таймеры и количества в тексте ───────── */
const UNIT = { час: 3600, часа: 3600, часов: 3600, "ч.": 3600, минут: 60, минуту: 60, минуты: 60, мин: 60, "мин.": 60, секунд: 1, секунды: 1, секунду: 1, сек: 1, "сек.": 1 };
function withTimers(text) {
  let out = nbsp(text);
  out = out.replace(/(\d+(?:[.,]\d+)?)(?:\s*[–—-]\s*(\d+(?:[.,]\d+)?))?(?:\s|\u00a0)+(часов|часа|час|ч\.|минуты|минуту|минут|мин\.?|секунды|секунду|секунд|сек\.?)(?![а-яё])/gi, (m, a, b, u) => {
    const k = UNIT[u.toLowerCase()];
    if (!k) return m;
    const sec = Math.round(parseFloat(a.replace(",", ".")) * k);
    if (!sec || sec > 6 * 3600) return m;
    const label = m.replace(/\u00a0/g, " ");
    return `<button type="button" class="timer-chip" data-seconds="${sec}" data-label="${esc(label)}" aria-label="Запустить таймер: ${esc(label)}">${i("timer")}${m}</button>`;
  });
  out = out.replace(/(^|[\s(])(полчаса|пол часа)(?![а-яё])/gi, (m, pre, w) => `${pre}<button type="button" class="timer-chip" data-seconds="1800" data-label="${w}" aria-label="Запустить таймер: ${w}">${i("timer")}${w}</button>`);
  return out;
}

// **жирный** и [ссылка](/recepty/...) в текстах; ссылки от корня сайта получают относительный путь
const inline = (s, rel = "") => nbsp(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    const ext = /^https?:/.test(href);
    return `<a href="${ext ? href : rel + href.replace(/^\//, "")}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
  });

// Количество ингредиента: 0.5 → ½, 1.5 → 1½
const amountText = (v) => {
  if (v == null) return "";
  const whole = Math.floor(v), frac = Math.round((v - whole) * 100) / 100;
  const f = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" }[frac];
  if (f) return (whole || "") + f;
  return String(+v.toFixed(2)).replace(".", ",");
};
const ingredientText = (it) => typeof it === "string" ? it : [amountText(it.amount), it.unit, it.name].filter(Boolean).join(" ") + (it.note ? `, ${it.note}` : "");
function ingredientRow(it, n, scalable) {
  if (typeof it === "string") return `<li><label><input type="checkbox" id="ing-${n}"><span>${withQty(it, scalable)}</span></label></li>`;
  const qty = it.amount != null
    ? `<span class="qty"${scalable ? ` data-base="${it.amount}" data-unit="${esc(it.unit)}"` : ""}>${amountText(it.amount)}${it.unit ? " " + esc(it.unit) : ""}</span>`
    : it.unit ? `<span class="qty soft">${esc(it.unit)}</span>` : "";
  return `<li><label><input type="checkbox" id="ing-${n}"><span class="ing"><span class="ing-name">${nbsp(it.name)}</span>${it.note ? `<small>${nbsp(it.note)}</small>` : ""}</span>${qty}</label></li>`;
}

// Количество для пересчёта порций: число после тире (или первое число), не проценты и не градусы
const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
function withQty(item, scalable) {
  const safe = esc(item);
  if (!scalable) return safe;
  const dash = safe.search(/\s[—–-]\s/);
  const from = dash >= 0 ? dash : 0;
  const head = safe.slice(0, from), tail = safe.slice(from);
  let done = false;
  const re = /(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])(?!\s*[%°])(?!\s*[–—-]\s*\d)(?!\d)/;
  const replaced = tail.replace(re, (m) => {
    if (done) return m;
    // диапазоны вида «2–3» не пересчитываем
    const v = m.includes("/") ? m.split("/").reduce((x, y) => Number(x) / Number(y)) : FRAC[m] ?? parseFloat(m.replace(",", "."));
    if (!isFinite(v) || v <= 0) return m;
    done = true;
    return `<span class="qty" data-base="${+v.toFixed(4)}">${m}</span>`;
  });
  return head + replaced;
}

/* ───────── Каркас страницы ───────── */
function layout({ depth = 0, title, description, path: pagePath = "", body, current = "", image, jsonld, bodyClass = "" }) {
  const rel = "../".repeat(depth);
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline}`;
  const url = site.url.replace(/\/$/, "") + "/" + pagePath;
  const ogImage = image ? site.url.replace(/\/$/, "") + "/assets/img/" + image : site.url.replace(/\/$/, "") + "/assets/img/og.jpg";
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#1d3b9e">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title || site.name)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${rel}assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="${rel}assets/img/apple-touch-icon.png">
<link rel="preload" href="${rel}assets/fonts/prata-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${rel}assets/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rel}assets/css/site.css?v=${VERSION}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
<script src="${rel}assets/js/site.js?v=${VERSION}" defer></script>
</head>
<body class="${bodyClass}">
${sprite}
<a class="skip" href="#main">Перейти к содержанию</a>
${body}
</body>
</html>`;
}

function header(rel, current) {
  const link = (href, label, key) => `<a href="${rel}${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="${rel}./" aria-label="${esc(site.name)} — на главную">
      <img src="${rel}assets/img/logo-160.jpg" alt="" width="52" height="52">
      <span class="brand-name">Smachno Studio<span>студия кулинарных шедевров</span></span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">${i("menu")}Меню</button>
    <nav class="nav" id="site-nav" aria-label="Основное меню">
      ${link("recepty/", "Рецепты", "recipes")}
      ${link("nauka-vkusa/", "Наука вкуса", "science")}
      ${link("o-studii/", "О студии", "about")}
      <a class="btn btn-tomato btn-small" href="${esc(site.youtube)}" target="_blank" rel="noopener">${i("youtube")}YouTube</a>
    </nav>
  </div>
</header>`;
}

function footer(rel) {
  return `<footer class="site-footer cobalt deep rimmed-top">
  <div class="wrap">
    <div class="footer-top">
      <div>
        <p class="footer-motto">Готовим просто,<br><em>едим с&nbsp;удовольствием!</em></p>
        <div class="actions">
          <a class="btn btn-tomato" href="${esc(site.youtube)}" target="_blank" rel="noopener"><span class="play-dot">${i("play")}</span>Смотреть канал</a>
          <a class="btn btn-ghost" href="mailto:${esc(site.email)}">${i("mail")}${esc(site.email)}</a>
        </div>
      </div>
      <div>
        <h2>Рецепты</h2>
        <ul>${CATS.filter((c) => recipes.some((r) => r.category === c.id)).map((c) => `<li><a href="${rel}recepty/?cat=${c.id}">${esc(c.plural || c.name)}</a></li>`).join("")}
          <li><a href="${rel}recepty/">Все рецепты</a></li></ul>
      </div>
      <div>
        <h2>Студия</h2>
        <ul><li><a href="${rel}o-studii/">О студии</a></li><li><a href="${rel}nauka-vkusa/">Наука вкуса</a></li>
          <li><a href="${esc(site.youtube)}" target="_blank" rel="noopener">YouTube-канал</a></li><li><a href="mailto:${esc(site.email)}">Написать нам</a></li></ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${esc(site.fullName)}</span>
      <span>Рецепты с фото и видео — для домашней кухни</span>
    </div>
  </div>
</footer>`;
}

/* ───────── Карточка блюда ───────── */
function dish(rel, r, { feature = false, eager = false } = {}) {
  const search = [r.title, catName(r.category), r.description, ...(r.ingredients || []).flatMap((g) => g.items.map((it) => (typeof it === "string" ? it : it.name)))].join(" ");
  return `<a class="dish${feature ? " feature" : ""}" href="${rel}recepty/${r.slug}/" data-cat="${r.category}" data-can-feature="${feature}" data-search="${esc(search)}">
    <div class="tray"><div class="frame">${pic(rel, r.image, r.imageAlt || r.title, { sizes: feature ? "(max-width: 1000px) 100vw, 800px" : "(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 400px", eager })}</div></div>
    <div>
      <div class="meta">${r.time ? `<span>${i("clock")}${esc(r.time)}</span>` : ""}<span>${i("tag")}${esc(catName(r.category))}</span>${r.video ? `<span>${i("youtube")}Есть видео</span>` : ""}</div>
      <h3 style="margin-top:.55rem">${nbsp(r.title)}</h3>
      ${r.description ? `<p style="margin-top:.45rem">${nbsp(r.description)}</p>` : ""}
    </div>
  </a>`;
}

function chips(list) {
  const counts = Object.fromEntries(CATS.map((c) => [c.id, list.filter((r) => r.category === c.id).length]));
  return `<div class="chips" role="group" aria-label="Категории рецептов">
    <button class="chip" type="button" data-filter="all" aria-pressed="true">Все <small>${list.length}</small></button>
    ${CATS.filter((c) => counts[c.id]).map((c) => `<button class="chip" type="button" data-filter="${c.id}" aria-pressed="false">${esc(c.plural || c.name)} <small>${counts[c.id]}</small></button>`).join("")}
  </div>`;
}

function ytButton(rel, v, { eager = false } = {}) {
  const thumb = fs.existsSync(path.join(ROOT, "src/img/video", `${v.id}.jpg`)) ? `${rel}assets/img/video/${v.id}.jpg` : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
  return `<button class="yt" type="button" data-id="${v.id}" data-title="${esc(v.title)}" aria-label="Смотреть видео: ${esc(v.title)}">
    <img src="${thumb}" alt="" ${eager ? "" : 'loading="lazy"'} width="1280" height="720">
    <span class="yt-play">${i("play")}</span>
  </button>`;
}

/* ───────── Главная ───────── */
// Части первого экрана для одного рецепта — нужны и для разметки, и для смены «рецепта дня» по датам
function heroParts(rel, day) {
  const lines = day.heroLines || [day.title];
  return {
    slug: day.slug,
    title: lines.map((l, k) => `<span class="line"><span>${k === lines.length - 1 && day.heroAccent ? esc(l).replace(esc(day.heroAccent), `<em>${esc(day.heroAccent)}</em>`) : esc(l)}</span></span>`).join(" "),
    lead: nbsp(day.description),
    meta: `${day.time ? `<span>${i("clock")}${esc(day.time)}</span>` : ""}<span>${i("tag")}${esc(catName(day.category))}</span>${day.servings ? `<span>${i("bowl")}${day.servings} ${plural(day.servings, "порция", "порции", "порций")}</span>` : ""}`,
    actions: `<a class="btn" href="${rel}recepty/${day.slug}/">${i("cook")}Открыть рецепт</a>${day.video ? `<a class="btn btn-tomato" href="${rel}recepty/${day.slug}/#video"><span class="play-dot">${i("play")}</span>Смотреть видео</a>` : ""}`,
    plate: pic(rel, day.image, day.imageAlt || day.title, { cls: "photo", eager: true, sizes: "(max-width: 900px) 100vw, 640px" }),
  };
}

/* ───────── Главная ───────── */
function home() {
  const rel = "";
  const day = bySlug[site.recipeOfDay] || recipes[0];
  const hp = heroParts(rel, day);
  const ordered = [day, ...recipes.filter((r) => r.slug !== day.slug)];
  const vids = videos.filter((v) => v.id);
  const first = vids[0];
  const voices = site.testimonials;
  const mmss = (t) => (t ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` : "");
  // Каждый день — следующий рецепт по кругу. Без JavaScript показывается recipeOfDay из site.json.
  const rotation = site.rotateRecipeOfDay ? `<script type="application/json" id="days">${JSON.stringify(recipes.map((r) => heroParts(rel, r))).replace(/</g, "\\u003c")}</script>
<script>(function(){try{var d=JSON.parse(document.getElementById("days").textContent),n=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)%d.length,x=d[n],h=document.querySelector(".hero");if(!x||x.slug===h.dataset.slug)return;h.dataset.slug=x.slug;["title","lead","meta","actions","plate"].forEach(function(k){h.querySelector("[data-part="+k+"]").innerHTML=x[k]})}catch(e){}})();</script>` : "";
  const body = `
<div class="cobalt hero" data-slug="${day.slug}">
  <canvas class="stars" aria-hidden="true"></canvas>
  ${header(rel, "home")}
  <main id="main">
  <section class="wrap hero-grid" aria-labelledby="day-title">
    <div class="hero-copy">
      <h1 id="day-title" data-part="title">${hp.title}</h1>
      <p class="lead" data-part="lead">${hp.lead}</p>
      <div class="meta" data-part="meta">${hp.meta}</div>
      <div class="actions" data-part="actions">${hp.actions}</div>
    </div>
    <div class="hero-plate">
      <div class="tray">
        <span class="tag">${i("star")}Рецепт дня</span>
        <div data-part="plate">${hp.plate}</div>
      </div>
    </div>
  </section>
</div>
${rotation}

<div class="on-white enamel-zone">
  <section class="wrap section after-hero" id="recipes" aria-labelledby="book-title">
    <div class="section-head">
      <h2 id="book-title">Книга рецептов</h2>
      <p>${nbsp(site.bookIntro)}</p>
    </div>
    ${chips(recipes)}
    <div class="book" data-filterable data-limit="9" data-limit-phone="4">
      ${ordered.map((r, k) => dish(rel, r, { feature: k === 0 })).join("")}
      <div class="book-empty" hidden><strong>Здесь пока пусто</strong>Скоро в этом разделе появятся новые рецепты.</div>
    </div>
    <div class="book-more"><a class="btn btn-cobalt" href="recepty/">Все рецепты${i("arrow")}</a></div>
  </section>

  <section class="wrap promise" aria-label="Как мы готовим">
    <p class="promise-text">Каждое блюдо&nbsp;— <mark>с&nbsp;фото, видео</mark> и&nbsp;пошаговой инструкцией. Ингредиенты&nbsp;— <mark>из&nbsp;обычного магазина</mark>. А&nbsp;результат&nbsp;— как в&nbsp;ресторане.</p>
    <div class="promise-foot"><span class="meta"><span>${i("calendar")}Новые рецепты выходят регулярно</span></span><a class="btn btn-small" href="o-studii/">О студии${i("arrow")}</a></div>
  </section>
</div>

<section class="cobalt rimmed-top section" id="video" aria-labelledby="video-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="video-title">Смотрите, как&nbsp;это готовится</h2>
      <p class="soft">${nbsp(site.videoIntro)}</p>
    </div>
    <div class="studio">
      <div>
        <div class="tray" id="screen">${ytButton(rel, first, { eager: false })}</div>
        <div class="now-playing">
          <h3 id="now-title">${esc(first.title)}</h3>
          <a class="btn btn-small" id="now-link" href="${first.recipe ? `recepty/${first.recipe}/` : "#"}"${first.recipe ? "" : " hidden"}>Рецепт текстом${i("arrow")}</a>
        </div>
      </div>
      <ul class="reel" aria-label="Другие видео">
        ${vids.map((v, k) => `<li><button type="button" data-id="${v.id}" data-title="${esc(v.title)}"${v.recipe ? ` data-recipe="recepty/${v.recipe}/"` : ""} aria-current="${k === 0}">
          <img src="${fs.existsSync(path.join(ROOT, "src/img/video", `${v.id}.jpg`)) ? `assets/img/video/${v.id}.jpg` : `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}" alt="" loading="lazy" width="320" height="180">
          <span>${esc(v.title)}${v.duration ? `<small>${mmss(v.duration)}${v.recipe ? " · рецепт на сайте" : ""}</small>` : ""}</span></button></li>`).join("")}
      </ul>
    </div>
    <div class="subscribe">
      <div><p>Подписывайтесь на&nbsp;наш канал!</p><span class="soft">${nbsp(site.youtubeText.replace(/^Подписывайтесь на наш канал Smachno Studio!\s*/, ""))}</span></div>
      <a class="btn btn-tomato" href="${esc(site.youtubeSubscribe || site.youtube)}" target="_blank" rel="noopener"><span class="play-dot">${i("play")}</span>Подписаться на YouTube</a>
    </div>
  </div>
</section>

<div class="on-white enamel-zone">
  <section class="wrap section" aria-labelledby="science-title">
    <div class="section-head">
      <h2 id="science-title">Наука вкуса и&nbsp;здоровья</h2>
      <p>${nbsp(site.scienceIntro)}</p>
    </div>
    <div class="science">
      ${articles.map((a) => essay(rel, a)).join("")}
    </div>
  </section>
</div>

${voices?.length ? `<section class="cobalt rimmed-top section" aria-labelledby="voices-title">
  <div class="wrap">
    <div class="section-head"><h2 id="voices-title">Готовят вместе с&nbsp;нами</h2><p class="soft">Что пишут зрители и&nbsp;читатели студии.</p></div>
    <div class="voices">
      ${voices.map((v) => `<figure class="voice">${i("quote", "quote-mark")}<blockquote>${nbsp(v.text)}</blockquote><figcaption><span class="initial" aria-hidden="true">${esc(v.name[0])}</span>${esc(v.name)}</figcaption></figure>`).join("")}
    </div>
    <p class="voices-cta soft">Готовили по&nbsp;нашим рецептам? <a href="${esc(site.youtube)}" target="_blank" rel="noopener">Расскажите в&nbsp;комментариях на&nbsp;YouTube</a>&nbsp;— мы читаем каждый.</p>
  </div>
</section>` : ""}
</main>
${footer(rel)}`;
  write("index.html", layout({ depth: 0, body, current: "home", path: "", image: bigImg("dishes", day.image),
    jsonld: { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, description: site.description } }));
}

function essay(rel, a) {
  return `<a class="essay" href="${rel}nauka-vkusa/${a.slug}/">
    ${pic(rel, a.image, "", { dir: "articles", sizes: "132px" }).replace('class=""', "")}
    <div><h3>${nbsp(a.title)}</h3><p>${nbsp(a.lead)}</p><span class="more">Читать${i("arrow")}</span></div>
  </a>`;
}

/* ───────── Все рецепты ───────── */
function recipesIndex() {
  const rel = "../";
  const body = `
<div class="cobalt">
  ${header(rel, "recipes")}
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="Вы здесь"><a href="${rel}./">Главная</a>${i("chevron")}<span>Рецепты</span></nav>
    <h1>Книга рецептов</h1>
    <p class="lead">${nbsp(site.bookIntro)}</p>
  </div>
</div>
<main id="main" class="on-white enamel-zone">
  <section class="wrap section" style="padding-top:clamp(2.5rem,5vw,4rem)" aria-label="Список рецептов">
    <div class="finder">
      <label class="search"><span class="visually-hidden">Поиск по рецептам</span>${i("search")}<input id="recipe-search" type="search" placeholder="Найти блюдо или ингредиент" autocomplete="off"></label>
      <span class="finder-count" aria-live="polite"></span>
    </div>
    ${chips(recipes)}
    <div class="book" data-filterable>
      ${recipes.map((r) => dish(rel, r)).join("")}
      <div class="book-empty" hidden><strong>Ничего не нашлось</strong>Попробуйте другое слово — например, «рыба» или «сыр».</div>
    </div>
  </section>
</main>
${footer(rel)}`;
  write("recepty/index.html", layout({ depth: 1, title: "Все рецепты", description: site.bookIntro, path: "recepty/", body, current: "recipes" }));
}

/* ───────── Страница рецепта ───────── */
function recipePage(r) {
  const rel = "../../";
  const v = r.video ? videos.find((x) => x.id === r.video) || { id: r.video, title: r.title } : null;
  const items = (r.ingredients || []).flatMap((g) => g.items);
  const withAmount = items.filter((x) => (typeof x === "string" ? /\d/.test(x) : x.amount != null)).length;
  const scalable = !!r.servings && withAmount >= Math.ceil(items.length / 2);
  let n = 0;
  const pantry = `<aside class="pantry" aria-labelledby="ing-title">
    <h2 id="ing-title">Ингредиенты</h2>
    ${scalable ? `<div class="servings"><span>Порций</span><span class="stepper">
      <button type="button" id="servings-minus" aria-label="Меньше порций">${i("minus")}</button>
      <output id="servings" data-base="${r.servings}" aria-live="polite">${r.servings}</output>
      <button type="button" id="servings-plus" aria-label="Больше порций">${i("plus")}</button></span></div>` : ""}
    ${(r.ingredients || []).map((g) => `${g.title ? `<h3>${esc(g.title)}</h3>` : ""}<ul class="ingredients">${g.items.map((it) => ingredientRow(it, ++n, scalable)).join("")}</ul>`).join("")}
    <p class="pantry-note" aria-live="polite"></p>
    ${r.equipment?.length ? `<details class="tools"><summary>${i("cook")}Понадобится <small>${r.equipment.length}</small></summary><ul>${r.equipment.map((e) => `<li><strong>${nbsp(e.name)}</strong>${e.note ? ` — ${nbsp(e.note)}` : ""}</li>`).join("")}</ul></details>` : ""}
  </aside>`;
  const related = recipes.filter((x) => x.slug !== r.slug).sort((a, b) => (b.category === r.category) - (a.category === r.category)).slice(0, 3);
  const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  const steps = r.steps.map((s) => {
    const st = typeof s === "string" ? { text: s } : s;
    const paras = (Array.isArray(st.text) ? st.text : [st.text]).map((p) => `<p>${withTimers(p)}</p>`).join("");
    const seek = v && st.t != null ? `<button type="button" class="seek" data-seek="${st.t}">${i("play")}Смотреть этот шаг <span>${mmss(st.t)}</span></button>` : "";
    const photo = st.image ? `<figure class="step-photo">${pic(rel, st.image, st.imageAlt || st.title || "", { dir: "steps", sizes: "(max-width: 700px) 100vw, 260px" })}</figure>` : "";
    return `<li${photo ? ' class="has-photo"' : ""}><div class="step-body">${st.title ? `<h3>${nbsp(st.title)}</h3>` : ""}${paras}${seek}</div>${photo}</li>`;
  }).join("");
  const kcal = r.calories ? `<span>${i("leaf")}${r.calories} ккал на порцию</span>` : "";
  const body = `
<div class="cobalt recipe-head">
  ${header(rel, "recipes")}
  <div class="wrap recipe-hero">
    <div class="copy">
      <nav class="crumbs" aria-label="Вы здесь"><a href="${rel}./">Главная</a>${i("chevron")}<a href="${rel}recepty/">Рецепты</a>${i("chevron")}<a href="${rel}recepty/?cat=${r.category}">${esc(catName(r.category))}</a></nav>
      <h1>${nbsp(r.title)}</h1>
      ${r.description ? `<p class="lead">${nbsp(r.description)}</p>` : ""}
      <div class="meta">${r.time ? `<span>${i("clock")}${esc(r.time)}</span>` : ""}${r.servings ? `<span>${i("bowl")}${r.servings} ${plural(r.servings, "порция", "порции", "порций")}</span>` : ""}<span>${i("list")}${r.steps.length} ${plural(r.steps.length, "шаг", "шага", "шагов")}</span>${kcal}</div>
      <div class="actions">
        <button class="btn" type="button" data-open-cook>${i("cook")}Режим готовки</button>
        ${v ? `<a class="btn btn-tomato" href="#video"><span class="play-dot">${i("play")}</span>Видео</a>` : ""}
        <button class="btn btn-ghost" type="button" data-print>${i("print")}Распечатать</button>
      </div>
    </div>
    <div class="plate"><div class="tray">${pic(rel, r.image, r.imageAlt || r.title, { cls: "photo", eager: true, sizes: "(max-width: 900px) 100vw, 640px" })}</div></div>
  </div>
</div>

<main id="main" class="on-white enamel-zone" data-recipe="${r.slug}">
  <div class="wrap recipe-body">
    ${r.intro?.length ? `<div class="recipe-intro">${r.intro.map((p) => `<p>${inline(p, rel)}</p>`).join("")}</div>` : ""}
    <div class="recipe-layout">
      ${pantry}
      <section class="method" aria-labelledby="method-title">
        <div class="method-head"><h2 id="method-title">Приготовление</h2><button class="btn btn-cobalt" type="button" data-open-cook>${i("cook")}Режим готовки</button></div>
        <ol class="steps">${steps}</ol>
        ${r.tips?.length ? `<div class="tip"><span class="badge">${i("spark")}</span><div><h3>Совет студии</h3>${r.tips.length === 1 ? `<p>${inline(r.tips[0], rel)}</p>` : `<ul>${r.tips.map((t) => `<li>${inline(t, rel)}</li>`).join("")}</ul>`}</div></div>` : ""}
      </section>
    </div>
  </div>
</main>

${v ? `<section class="cobalt rimmed-top recipe-video" id="video" aria-labelledby="video-title">
  <div class="wrap video-grid">
    <div>
      <h2 id="video-title">Смотрите, как&nbsp;мы&nbsp;это готовим</h2>
      <p>Включите видео и&nbsp;готовьте вместе с&nbsp;нами. Получилось смачно? Расскажите в&nbsp;комментариях на&nbsp;YouTube!</p>
      <a class="btn btn-tomato" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${i("youtube")}Открыть на YouTube</a>
    </div>
    <div class="tray" id="player">${ytButton(rel, v)}</div>
  </div>
</section>` : ""}

<section class="on-white enamel-zone section more-dishes" aria-labelledby="more-title">
  <div class="wrap">
    <div class="section-head"><h2 id="more-title">Что приготовить ещё</h2><a class="btn btn-small" href="${rel}recepty/">Все рецепты${i("arrow")}</a></div>
    <div class="book">${related.map((x) => dish(rel, x)).join("")}</div>
  </div>
</section>
${footer(rel)}

<dialog class="cook" id="cook" aria-label="Режим готовки: ${esc(r.title)}">
  <div class="cook-top">
    <span class="cook-title">${esc(r.title)}</span>
    <div class="cook-tools">
      <button class="icon-btn" type="button" id="cook-pantry-btn" aria-pressed="false" aria-label="Ингредиенты">${i("basket")}</button>
      <button class="icon-btn" type="button" id="cook-close" aria-label="Закрыть режим готовки">${i("close")}</button>
    </div>
  </div>
  <div><div class="cook-progress" aria-hidden="true"></div><p class="wake-note"><span class="cook-count" aria-live="polite"></span><span class="wake-text"></span></p></div>
  <div class="cook-stage" aria-live="polite"></div>
  <div class="cook-nav">
    <button class="btn btn-ghost" type="button" id="cook-prev">${i("back")}Назад</button>
    <button class="btn" type="button" id="cook-next">Дальше${i("arrow")}</button>
  </div>
  <aside class="cook-pantry" data-open="false" aria-label="Ингредиенты"><h2>Ингредиенты</h2><ul class="ingredients"></ul></aside>
  <template id="cook-final-template">
    <div class="text">Готово!<br>Приятного аппетита</div>
    <p>Получилось смачно? Поделитесь в&nbsp;комментариях под видео — нам очень важно знать.</p>
    <div class="actions">${v ? `<a class="btn btn-tomato" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${i("youtube")}Написать на YouTube</a>` : ""}<button class="btn btn-ghost" type="button" data-cook-restart>${i("back")}С первого шага</button></div>
  </template>
</dialog>`;
  const stepText = (s) => (typeof s === "string" ? s : [s.title, Array.isArray(s.text) ? s.text.join(" ") : s.text].filter(Boolean).join(". "));
  const jsonld = {
    "@context": "https://schema.org", "@type": "Recipe", name: r.title, description: r.description,
    image: [site.url.replace(/\/$/, "") + `/assets/img/${bigImg("dishes", r.image)}`],
    author: { "@type": "Organization", name: site.name, url: site.url },
    datePublished: r.published || undefined,
    recipeCategory: catName(r.category), recipeCuisine: "Домашняя кухня",
    prepTime: isoDuration(r.prepMinutes), cookTime: isoDuration(r.cookMinutes), totalTime: isoDuration(r.minutes),
    recipeYield: r.servings ? `${r.servings} ${plural(r.servings, "порция", "порции", "порций")}` : undefined,
    nutrition: r.calories ? { "@type": "NutritionInformation", calories: `${r.calories} ккал` } : undefined,
    recipeIngredient: items.map(ingredientText),
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: stepText(s) })),
    video: v ? { "@type": "VideoObject", name: v.title, description: r.description || v.title, thumbnailUrl: [`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`], embedUrl: `https://www.youtube.com/embed/${v.id}`, contentUrl: `https://www.youtube.com/watch?v=${v.id}`, uploadDate: v.uploadDate } : undefined,
  };
  write(`recepty/${r.slug}/index.html`, layout({ depth: 2, title: r.title, description: r.description, path: `recepty/${r.slug}/`, body, current: "recipes", image: bigImg("dishes", r.image), jsonld }));
}

/* ───────── Наука вкуса ───────── */
function scienceIndex() {
  const rel = "../";
  const body = `
<div class="cobalt">
  ${header(rel, "science")}
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="Вы здесь"><a href="${rel}./">Главная</a>${i("chevron")}<span>Наука вкуса</span></nav>
    <h1>Наука вкуса и&nbsp;здоровья</h1>
    <p class="lead">${nbsp(site.scienceIntro)}</p>
  </div>
</div>
<main id="main" class="on-white enamel-zone">
  <section class="wrap section" aria-label="Статьи"><div class="science">${articles.map((a) => essay(rel, a)).join("")}</div></section>
</main>
${footer(rel)}`;
  write("nauka-vkusa/index.html", layout({ depth: 1, title: "Наука вкуса и здоровья", description: site.scienceIntro, path: "nauka-vkusa/", body, current: "science" }));
}

function block(b, rel = "") {
  if (typeof b === "string") return `<p>${inline(b, rel)}</p>`;
  if (b.h2) return `<h2>${nbsp(b.h2)}</h2>`;
  if (b.h3) return `<h3>${nbsp(b.h3)}</h3>`;
  if (b.ul) return `<ul>${b.ul.map((x) => `<li>${inline(x, rel)}</li>`).join("")}</ul>`;
  if (b.ol) return `<ol>${b.ol.map((x) => `<li>${inline(x, rel)}</li>`).join("")}</ol>`;
  if (b.quote) return `<blockquote>${nbsp(b.quote)}</blockquote>`;
  if (b.p) return `<p>${inline(b.p, rel)}</p>`;
  return "";
}

function articlePage(a) {
  const rel = "../../";
  const others = articles.filter((x) => x.slug !== a.slug);
  const body = `
<div class="cobalt">
  ${header(rel, "science")}
  <div class="wrap-narrow page-head article-head" style="padding-bottom:clamp(4.5rem,9vw,7rem)">
    <nav class="crumbs" aria-label="Вы здесь"><a href="${rel}./">Главная</a>${i("chevron")}<a href="${rel}nauka-vkusa/">Наука вкуса</a></nav>
    <h1 style="max-width:22ch">${nbsp(a.title)}</h1>
  </div>
</div>
<main id="main" class="on-white enamel-zone">
  ${a.image ? `<div class="wrap-narrow article-cover"><div class="tray">${pic(rel, a.image, a.imageAlt || "", { dir: "articles", cls: "photo", eager: true, sizes: "(max-width: 800px) 100vw, 760px" })}</div></div>` : ""}
  <article class="wrap-narrow prose">
    <p class="lede">${inline(a.lead, rel)}</p>
    ${(a.body || []).map((b) => block(b, rel)).join("\n")}
  </article>
  ${others.length ? `<section class="wrap-narrow" style="padding-bottom:clamp(4rem,8vw,6rem)" aria-labelledby="more-a"><h2 id="more-a" style="font-size:1.8rem;margin-bottom:1.5rem">Читать ещё</h2><div class="science">${others.map((x) => essay(rel, x)).join("")}</div></section>` : ""}
</main>
${footer(rel)}`;
  const jsonld = { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.lead, author: { "@type": "Organization", name: site.name }, image: a.image ? [site.url.replace(/\/$/, "") + `/assets/img/${bigImg("articles", a.image)}`] : undefined };
  write(`nauka-vkusa/${a.slug}/index.html`, layout({ depth: 2, title: a.title, description: a.lead, path: `nauka-vkusa/${a.slug}/`, body, current: "science", image: a.image ? bigImg("articles", a.image) : undefined, jsonld }));
}

/* ───────── О студии ───────── */
function about() {
  const rel = "../";
  const ab = site.about;
  const body = `
<div class="cobalt">
  <canvas class="stars" aria-hidden="true"></canvas>
  ${header(rel, "about")}
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="Вы здесь"><a href="${rel}./">Главная</a>${i("chevron")}<span>О студии</span></nav>
    <h1>${nbsp(ab.title)}</h1>
    <p class="lead">${nbsp(ab.lead)}</p>
  </div>
</div>
<main id="main" class="on-white enamel-zone">
  <section class="wrap section about-grid">
    <div class="prose" style="padding:0">
      ${ab.body.map((b) => block(b, rel)).join("\n")}
      <div class="actions" style="margin-top:2rem">
        <a class="btn btn-tomato" href="${esc(site.youtube)}" target="_blank" rel="noopener"><span class="play-dot">${i("play")}</span>Наш YouTube</a>
        <a class="btn" href="mailto:${esc(site.email)}">${i("mail")}Написать нам</a>
      </div>
    </div>
    <div>
      <div class="tray about-photo">${pic(rel, ab.image, ab.imageAlt, { dir: "about", sizes: "(max-width: 900px) 100vw, 600px" })}</div>
      <ul class="principles">
        ${ab.principles.map((p) => `<li><span class="badge">${i(p.icon)}</span><div><h3>${nbsp(p.title)}</h3><p>${nbsp(p.text)}</p></div></li>`).join("")}
      </ul>
    </div>
  </section>
</main>
${footer(rel)}`;
  write("o-studii/index.html", layout({ depth: 1, title: "О студии", description: ab.lead, path: "o-studii/", body, current: "about" }));
}

/* ───────── 404 ───────── */
function notFound() {
  // GitHub Pages отдаёт 404.html с любого адреса, поэтому ссылки — от корня сайта
  const root = new URL(site.url).pathname.replace(/\/?$/, "/");
  const body = `
<div class="cobalt" style="min-height:100vh">
  <canvas class="stars" aria-hidden="true"></canvas>
  ${header(root, "")}
  <main id="main" class="wrap lost">
    <div>
      <h1>Такой страницы нет</h1>
      <p>Возможно, рецепт переехал. Загляните в книгу рецептов — там всё самое вкусное.</p>
      <div class="actions"><a class="btn" href="${root}recepty/">${i("bowl")}Книга рецептов</a><a class="btn btn-ghost" href="${root}">На главную</a></div>
    </div>
  </main>
</div>`;
  write("404.html", layout({ depth: 0, title: "Страница не найдена", path: "404.html", body }).replace(/href="assets\//g, `href="${root}assets/`).replace(/src="assets\//g, `src="${root}assets/`));
}

/* ───────── Крапинка эмали (SVG-плитка) ───────── */
function speckle() {
  let s = 20240611;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const W = 360, dots = [];
  for (let k = 0; k < 150; k++) {
    const x = rnd() * W, y = rnd() * W, big = rnd();
    const r = big > 0.97 ? 1.6 + rnd() * 0.8 : big > 0.85 ? 0.9 + rnd() * 0.6 : 0.35 + rnd() * 0.5;
    const gold = rnd() < 0.14;
    const o = (0.25 + rnd() * 0.6).toFixed(2);
    // повторяем у краёв, чтобы плитка была бесшовной
    for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) {
      const X = x + dx, Y = y + dy;
      if (X > -4 && X < W + 4 && Y > -4 && Y < W + 4) dots.push(`<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${r.toFixed(2)}" fill="${gold ? "#e2d69c" : "#fff"}" fill-opacity="${o}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${dots.join("")}</svg>`;
}

/* ───────── Сборка ───────── */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, "src/css"), path.join(OUT, "assets/css"));
copyDir(path.join(ROOT, "src/js"), path.join(OUT, "assets/js"));
copyDir(path.join(ROOT, "src/fonts"), path.join(OUT, "assets/fonts"));
copyDir(path.join(ROOT, "src/img"), path.join(OUT, "assets/img"));
fs.writeFileSync(path.join(OUT, "assets/img/speckle.svg"), speckle());
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
if (site.domain) fs.writeFileSync(path.join(OUT, "CNAME"), site.domain + "\n");

home();
recipesIndex();
recipes.forEach(recipePage);
scienceIndex();
articles.forEach(articlePage);
about();
notFound();

const urls = ["", "recepty/", ...recipes.map((r) => `recepty/${r.slug}/`), "nauka-vkusa/", ...articles.map((a) => `nauka-vkusa/${a.slug}/`), "o-studii/"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url.replace(/\/$/, "")}/${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url.replace(/\/$/, "")}/sitemap.xml\n`);

console.log(`Готово: ${recipes.length} ${plural(recipes.length, "рецепт", "рецепта", "рецептов")}, ${articles.length} ${plural(articles.length, "статья", "статьи", "статей")} → docs/`);
