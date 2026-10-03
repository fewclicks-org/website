// Studio Portfolio: a modern single-page site. Cinematic loader → hero slideshow → editorial game list.
// Game details open in a full-screen panel on the same page (deep link: #game/<id>).

import { loadAll, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS, filterGames } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';
import { setGameSeo, setMeta } from '../../shared/js/seo.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindLightbox, bindDialog, bindEmailCopy, gameFacts, loadFailed, reveal } from '../../shared/js/kit.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12.5 9 L12.5 23 L16 19.6 L18.6 25 L20.8 24 L18.2 18.7 L23 18.7Z" fill="currentColor"/></svg>';
const year = (d) => (d ? String(d).slice(0, 4) : 'TBA');

let DATA;
const loader = mountLoader();
start();

// ---------------- loader ----------------
function mountLoader() {
  const el = document.createElement('div');
  el.className = 'loader';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading');
  el.innerHTML = `<div class="loader-inner">
    <svg class="loader-mark" viewBox="0 0 54 54" aria-hidden="true"><path d="M27 2 a25 25 0 1 1 -0.1 0 Z M21 15 L21 39 L27 33 L31.5 42 L35 40.5 L30.6 31.4 L39 31.4 Z"/></svg>
    <div class="loader-pct" data-pct>0</div>
    <div class="loader-bar"><i data-bar></i></div>
    <div class="loader-row"><span class="mono" data-msg>Initializing</span><span class="mono">FewClicks Studio</span></div></div>`;
  document.body.appendChild(el);
  document.body.classList.add('locked');
  const msgs = ['Initializing', 'Compiling shaders', 'Streaming worlds', 'Spawning players', 'Polishing pixels', 'Ready'];
  let shown = 0, target = 0, raf;
  const pct = $('[data-pct]', el), bar = $('[data-bar]', el), msg = $('[data-msg]', el);
  const t0 = performance.now();
  const tick = () => {
    const minT = reducedMotion ? 1 : Math.min(1, (performance.now() - t0) / 1600);
    const goal = Math.min(target, minT * 100);
    shown += (goal - shown) * 0.12;
    if (goal - shown < 0.4) shown = goal;
    pct.textContent = Math.round(shown);
    bar.style.setProperty('--p', shown / 100);
    msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor((shown / 100) * (msgs.length - 1)))];
    if (shown < 100) raf = requestAnimationFrame(tick);
    else finish();
  };
  let done = false, onDone = null;
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    setTimeout(() => {
      el.classList.add('done');
      document.body.classList.remove('locked');
      sfx.whoosh();
      onDone?.();
      setTimeout(() => el.remove(), 1200);
    }, reducedMotion ? 0 : 250);
  };
  raf = requestAnimationFrame(tick);
  return { set: (p) => (target = Math.max(target, p)), then: (fn) => { if (done) fn(); else onDone = fn; } };
}

function preload(urls, onProgress) {
  let n = 0;
  const step = () => onProgress(++n / urls.length);
  return Promise.all(urls.map((u) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => { step(); res(); };
    i.src = u;
  })));
}

async function start() {
  try { DATA = await loadAll(); } catch (err) { loader.set(100); loadFailed(err); return; }
  loader.set(20);
  const featured = DATA.games.filter((g) => g.featured);
  const heroGames = (featured.length ? featured : DATA.games).slice(0, 4);
  render(heroGames);
  loader.then(() => {
    $('.hero').classList.add('in');
    startSlides(heroGames);
    routeFromHash();
  });
  const fonts = document.fonts?.ready || Promise.resolve();
  await Promise.race([
    Promise.all([fonts, preload(heroGames.map((g) => g.media.hero), (p) => loader.set(20 + p * 79))]),
    new Promise((r) => setTimeout(r, 6000)),
  ]);
  loader.set(100);
}

// ---------------- page ----------------
function render(heroGames) {
  const { games, categories, studio, team, news } = DATA;
  const spot = heroGames[0];
  const words = (studio.description || '').split(/\s+/);

  main.insertAdjacentHTML('beforebegin', `<nav class="nav" aria-label="Main" data-nav>
    <a class="brand" href="#top">${LOGO}FewClicks</a>
    <ul><li><a href="#games">Games</a></li><li><a href="#studio">Studio</a></li><li><a href="#news">News</a></li><li><a href="#contact">Contact</a></li></ul>
    <div class="nav-right"><button class="icon-btn" type="button" data-sound-toggle><span data-sound-icon></span></button><a class="pill pill--solid" href="#contact">Get in touch <span class="arr">→</span></a>
    <button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false" data-menu>☰</button></div></nav>`);

  main.innerHTML = html`
  <section class="hero" id="top" aria-label="Introduction">
    <div class="slides" aria-hidden="true">${heroGames.map((g, i) => raw(html`<div class="slide ${i ? '' : 'on'}"><img src="${g.media.hero}" alt=""></div>`))}</div>
    <div class="hero-content">
      <p class="hero-kicker mono">Independent game studio · Est. ${studio.founded || '2026'}</p>
      <h1 aria-label="${studio.tagline}"><span class="line"><span>Games you</span></span><span class="line"><span>can <em>love</em> in</span></span><span class="line"><span>a few clicks.</span></span></h1>
      <div class="hero-row">
        <p class="hero-lead">We craft bright, tactile games for phones, PCs and consoles: instantly playable, endlessly replayable.</p>
        <div class="now" aria-live="polite">
          <div class="now-title"><span class="mono">Now showing</span><a class="pill" href="#game/${spot.id}" data-now>${spot.title} <span class="arr">→</span></a></div>
          <div class="dots" role="tablist" aria-label="Featured games">${heroGames.map((g, i) => raw(html`<button type="button" role="tab" aria-label="${g.title}" aria-selected="${i === 0}" data-dot="${i}"><i></i></button>`))}</div>
        </div>
      </div>
    </div>
    <span class="scroll-cue mono" aria-hidden="true">Scroll</span>
  </section>

  <section class="section container" aria-labelledby="about-t">
    <div class="sec-head"><span class="mono" id="about-t">(01) About</span>
      <p class="statement" data-statement>${words.map((w) => raw(html`<span class="w">${w}</span> `))}</p></div>
    <div class="stats">${studio.stats.map((s) => raw(html`<div class="stat" data-reveal><b data-count="${s.value}">${s.value}</b><span>${s.label}</span></div>`))}</div>
  </section>

  <section class="section container" id="games" aria-labelledby="games-t">
    <div class="sec-head"><span class="mono">(02) Portfolio</span><h2 id="games-t">Selected <span class="dim">games</span></h2></div>
    <div class="toolbar" role="search">
      <div class="filters" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="fbtn" type="button" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.name}<sup>${c.id === 'all' ? games.length : games.filter((g) => g.categories.includes(c.id)).length}</sup></button>`))}</div>
      <div class="tools-right">
        <div class="filters" role="group" aria-label="Platform">${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button class="fbtn" type="button" data-platform="${k}" aria-pressed="${k === 'all'}">${l}</button>`))}</div>
        <label class="sr-only" for="q">Search games</label><input class="search" id="q" type="search" placeholder="Search…" data-q autocomplete="off">
        <label class="sr-only" for="sort">Sort</label><select class="select" id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <ul class="games" data-grid></ul>
    <p class="empty" data-empty hidden>No games match those filters. <button class="pill" type="button" data-reset>Reset</button></p>
    ${spot ? raw(html`<article class="feature" data-reveal>
      <div class="feature-art"><img src="${spot.media.hero}" alt="${spot.title} artwork" loading="lazy"></div>
      <div class="feature-body"><span class="mono">Featured · ${STATUS[spot.status].label}</span><h3>${spot.title}</h3><p>${spot.description.short}</p>
        <div><a class="pill pill--solid" href="#game/${spot.id}">View project <span class="arr">→</span></a></div></div></article>`) : ''}
  </section>

  <section class="section container" id="studio" aria-labelledby="studio-t">
    <div class="sec-head"><span class="mono">(03) Studio</span><h2 id="studio-t">Small team. <span class="dim">Big worlds.</span></h2></div>
    <div class="studio-grid">
      <p class="statement" style="font-size:clamp(22px,2.4vw,34px);color:var(--muted)">${studio.description}</p>
      <ul class="values">${studio.values.map((v) => raw(html`<li data-reveal><div><h3>${v.title}</h3><p>${v.text}</p></div></li>`))}</ul>
    </div>
    <div class="team">${team.map((m) => raw(html`<article class="member" data-team-member data-reveal><div class="ph" style="background:${m.color}"><img src="${m.avatar}" alt="" loading="lazy" width="256" height="256"></div><div><h3>${m.name}</h3><span class="role">${m.role}</span></div><p>${m.bio}</p></article>`))}</div>
  </section>

  <section class="section container" id="news" aria-labelledby="news-t">
    <div class="sec-head"><span class="mono">(04) Journal</span><h2 id="news-t">News &amp; <span class="dim">devlog</span></h2></div>
    <div class="news">${news.map((p) => raw(html`<button class="news-item" type="button" data-news-item data-id="${p.id}"><span class="mono">${formatDate(p.date)}</span><span><h3>${p.title}</h3><p>${p.summary}</p></span><span class="mono tagm">${p.tag}</span><span class="arr" aria-hidden="true">↗</span></button>`))}</div>
  </section>

  <section class="section container contact" id="contact" aria-labelledby="contact-t">
    <div class="sec-head"><span class="mono">(05) Contact</span><h2 id="contact-t">Let's make <span class="dim">something fun.</span></h2></div>
    <a class="big-mail" data-email-link href="mailto:${studio.email || 'admin@fewclicks.org'}">${studio.email || 'admin@fewclicks.org'} <span class="ar" aria-hidden="true">↗</span></a>
    <div class="contact-row"><a class="pill pill--solid" data-email-link href="mailto:admin@fewclicks.org">Write to us <span class="arr">→</span></a><button class="pill" type="button" data-copy-email>Copy address</button>
      ${studio.socials.map((s) => raw(html`<a class="pill" href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`))}
      ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}</div>
  </section>
  <footer class="footer"><span>© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}. All rights reserved.</span><span><a href="#games">Games</a> · <a href="#studio">Studio</a> · <a href="#news">News</a> · <a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></span></footer>
  <div class="preview" aria-hidden="true" data-preview></div>
  <div class="panel" role="dialog" aria-modal="true" aria-label="Game details" data-panel></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="icon-btn modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="pill" type="button" data-lb-prev>← Prev</button><button class="pill pill--solid" type="button" data-lb-close>Close</button><button class="pill" type="button" data-lb-next>Next →</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  // nav
  const nav = $('[data-nav]');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? '✕' : '☰'; });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = '☰'; }));
  const secs = ['games', 'studio', 'news', 'contact'].map((id) => document.getElementById(id));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) nav.querySelectorAll('ul a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`)); }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => io.observe(s));
  }
  mountSoundToggle($('[data-sound-toggle]'), { on: '♪', off: '♪̸' });
  mountPrototypeBadge(6, 'Studio Portfolio');

  // statement highlights word by word as you scroll
  const ws = [...main.querySelectorAll('[data-statement] .w')];
  const lit = () => {
    const st = $('[data-statement]').getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - st.top) / (st.height + innerHeight * 0.35)));
    const n = reducedMotion ? ws.length : Math.round(p * ws.length);
    ws.forEach((w, i) => w.classList.toggle('lit', i < n));
  };
  addEventListener('scroll', lit, { passive: true });
  lit();

  renderList();
  bindNews();
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => toast(ok ? 'Email address copied' : 'Copy failed'));
  reveal(main, reducedMotion);
  addEventListener('hashchange', routeFromHash);
}

// ---------------- hero slideshow ----------------
function startSlides(games) {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('[data-dot]')];
  const now = $('[data-now]');
  let i = 0, timer;
  const DUR = 6000;
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.forEach((d, k) => {
      d.classList.toggle('on', k === i);
      d.classList.toggle('past', k < i);
      d.setAttribute('aria-selected', String(k === i));
      d.style.setProperty('--dur', `${DUR}ms`);
      const bar = d.querySelector('i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
    now.firstChild.textContent = `${games[i].title} `;
    now.href = `#game/${games[i].id}`;
    clearTimeout(timer);
    if (!reducedMotion) timer = setTimeout(() => go(i + 1), DUR);
  };
  dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.dot)); sfx.tick(); }));
  go(0);
}

// ---------------- games list ----------------
function renderList() {
  const { games } = DATA;
  const state = { category: 'all', platform: 'all', query: '', sort: 'featured' };
  const grid = $('[data-grid]');
  const draw = (animate) => {
    const list = filterGames(games, state);
    grid.innerHTML = list.map((g, i) => html`<li><button class="game-row" type="button" data-game-card data-open="${g.id}" style="--c1:${g.theme.primary}">
      <span class="thumb"><img src="${g.media.cover}" alt="" loading="lazy"></span>
      <span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <h3>${g.title}${g.status !== 'released' ? raw(html`<span class="badge">${STATUS[g.status].short}</span>`) : ''}</h3>
      <span class="cats">${g.categoryList.map((c) => c.name).join(' / ')}</span>
      <span class="plat">${[...new Set(g.platformList.map((p) => p.group))].join(' · ')}</span>
      <span class="yr">${year(g.releaseDate)}</span>
      <span class="arr" aria-hidden="true">→</span></button></li>`).join('');
    $('[data-empty]').hidden = list.length > 0;
    $('[data-status]').textContent = `${list.length} games shown`;
    if (animate && !reducedMotion) grid.querySelectorAll('li').forEach((li, k) => li.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: k * 50, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  };
  const sync = () => {
    document.querySelectorAll('#games [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
    document.querySelectorAll('#games [data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
  };
  const sec = $('#games');
  sec.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-platform]'), r = e.target.closest('[data-reset]');
    if (c) state.category = c.dataset.cat;
    else if (p) state.platform = p.dataset.platform;
    else if (r) { Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' }); $('[data-q]').value = ''; $('[data-sort]').value = 'featured'; }
    else return;
    sync(); draw(true); sfx.tick();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value; draw(true); }, 150); });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; draw(true); });
  grid.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) location.hash = `game/${b.dataset.open}`; });
  draw(false);

  // floating cover preview that follows the cursor
  if (!coarsePointer && !reducedMotion) {
    const pv = $('[data-preview]');
    let x = 0, y = 0, cx = 0, cy = 0, cur = '';
    grid.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      const row = e.target.closest('[data-open]');
      if (!row) { pv.classList.remove('on'); cur = ''; return; }
      if (row.dataset.open !== cur) {
        cur = row.dataset.open;
        const g = games.find((v) => v.id === cur);
        pv.insertAdjacentHTML('beforeend', `<img src="${g.media.cover}" alt="">`);
        const imgs = pv.querySelectorAll('img');
        imgs[imgs.length - 1].animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
        if (imgs.length > 3) imgs[0].remove();
        sfx.blip();
      }
      pv.classList.add('on');
    });
    grid.addEventListener('pointerleave', () => { pv.classList.remove('on'); cur = ''; });
    const loop = () => { cx += (x - cx) * 0.14; cy += (y - cy) * 0.14; pv.style.left = `${cx + 200}px`; pv.style.top = `${cy}px`; requestAnimationFrame(loop); };
    loop();
  }
}

// ---------------- game panel ----------------
let lastFocus = null;
function routeFromHash() {
  const m = location.hash.match(/^#game\/(.+)$/);
  if (m) openGame(decodeURIComponent(m[1]));
  else closePanel(false);
}

function openGame(id) {
  const panel = $('[data-panel]');
  const { games, studio } = DATA;
  const idx = games.findIndex((g) => g.id === id);
  const g = games[idx];
  if (!panel.classList.contains('open')) lastFocus = document.activeElement;
  if (!g) {
    panel.innerHTML = html`<div class="panel-bar"><a class="brand" href="#games">${raw(LOGO)}FewClicks</a><button class="pill" type="button" data-close-panel>Close ✕</button></div>
      <div class="not-found" data-not-found><div><span class="mono">Error 404</span><h2>That project doesn't exist.</h2><a class="pill pill--solid" href="#games">Browse all games →</a></div></div>`;
    setMeta({ title: 'Game not found | FewClicks' });
  } else {
    setGameSeo(g, studio);
    const prev = games[(idx - 1 + games.length) % games.length], next = games[(idx + 1) % games.length];
    const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
    const meta = [['Platforms', g.platformList.map((p) => p.label).join(', ')], ['Release', g.status === 'released' ? formatDate(g.releaseDate) : `${formatDate(g.releaseDate)} · planned`], ['Genre', g.categoryList.map((c) => c.name).join(', ')], ['Price', g.price || '—']];
    panel.innerHTML = html`
    <div class="panel-bar"><a class="brand" href="#games">${raw(LOGO)}FewClicks</a><span class="mono">${String(idx + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}</span><div class="navs"><button class="icon-btn" type="button" data-go="${prev.id}" aria-label="Previous game: ${prev.title}">←</button><button class="icon-btn" type="button" data-go="${next.id}" aria-label="Next game: ${next.title}">→</button><button class="pill" type="button" data-close-panel>Close ✕</button></div></div>
    <header class="p-hero"><img src="${g.media.hero}" alt="${g.title} artwork">
      <div class="p-hero-c"><div><span class="mono">${STATUS[g.status].label} · ${g.categoryList.map((c) => c.name).join(' / ')}</span><h2 data-game-title>${g.title}</h2><p class="tagl">${g.tagline}</p></div>
      ${g.media.icon ? raw(html`<img class="p-icon" src="${g.media.icon}" alt="" width="92" height="92" style="position:static">`) : ''}</div></header>
    <div class="container">
      <div class="meta-grid">${meta.map(([k, v]) => raw(html`<div><span class="mono">${k}</span><b>${v}</b></div>`))}</div>
      <div class="p-body">
        <div><p class="lead">${g.description.short}</p><div class="prose">${g.description.long.map((p) => raw(html`<p>${p}</p>`))}</div>
          <div class="stores">${g.stores.map((s, i) => raw(html`<a class="pill ${i ? '' : 'pill--solid'}" href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''} data-store>${(PLATFORMS[s.platform] || {}).icon || ''} ${s.label || `${verb} ${storeLabel(s)}`} <span class="arr">→</span></a>`))}${g.stores.length ? '' : raw('<span class="pill">Coming soon</span>')}</div></div>
        <div>${g.features.length ? raw(html`<h3 class="mono" style="margin-bottom:16px;font-weight:400">Highlights</h3><ul class="feat-list">${g.features.map((f, i) => raw(html`<li><span>0${i + 1}</span>${f}</li>`))}</ul>`) : ''}
          ${g.rating.count ? raw(html`<p style="margin-top:30px"><span class="mono">Player rating</span><br><span style="font-family:var(--display);font-size:56px;font-weight:300;letter-spacing:-.05em">${g.rating.average.toFixed(1)}</span> <span style="color:var(--accent)">${starString(g.rating.average)}</span> <span class="mono">${compactNumber(g.rating.count)} ratings</span></p>`) : ''}</div>
      </div>
      <section class="p-sec"><h3>Trailer</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span class="mono" style="color:var(--fg)">Trailer coming soon</span></div>`)}</div></section>
      ${g.media.screenshots.length ? raw(html`<section class="p-sec"><h3>Gallery</h3><div class="gallery">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div></section>`) : ''}
      ${g.reviews.length ? raw(html`<section class="p-sec"><h3>Press &amp; players</h3><div class="quotes">${g.reviews.map((r) => raw(html`<figure class="quote">${typeof r.score === 'number' ? raw(html`<span class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</span>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author} — ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}
      <section class="p-sec"><h3>Details</h3><div class="meta-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${gameFacts(g).map(([k, v]) => raw(html`<div><span class="mono">${k}</span><b>${v}</b></div>`))}</div></section>
      <div class="p-next"><button type="button" data-go="${prev.id}"><span class="mono">← Previous</span><b>${prev.title}</b></button><button type="button" data-go="${next.id}"><span class="mono">Next →</span><b>${next.title}</b></button></div>
      <p style="padding:40px 0 90px"><a class="pill" href="#games">← All games</a></p>
    </div>`;
    bindLightbox($('#lightbox'), g, { root: panel });
  }
  panel.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { location.hash = `game/${b.dataset.go}`; sfx.whoosh(); }));
  panel.querySelectorAll('[data-close-panel]').forEach((b) => b.addEventListener('click', () => closePanel(true)));
  panel.querySelectorAll('[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); }));
  panel.scrollTop = 0;
  if (!panel.classList.contains('open')) { panel.classList.add('open'); sfx.whoosh(); }
  document.body.classList.add('locked');
  panel.querySelector('[data-close-panel]')?.focus({ preventScroll: true });
}

function closePanel(updateHash) {
  const panel = $('[data-panel]');
  if (!panel || !panel.classList.contains('open')) return;
  panel.classList.remove('open');
  document.body.classList.remove('locked');
  setMeta({ title: 'FewClicks: games you can love in a few clicks', description: DATA.studio.description });
  if (updateHash) history.pushState(null, '', `${location.pathname}${location.search}#games`);
  lastFocus?.focus?.({ preventScroll: true });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('dialog[open]')) closePanel(true); });

// ---------------- news ----------------
function bindNews() {
  const nm = $('#news-modal');
  bindDialog(nm);
  $('#news').addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = DATA.news.find((x) => x.id === b.dataset.id);
    const g = DATA.games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`<span class="mono">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="" style="border-radius:4px">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="pill pill--solid" href="#game/${g.id}" data-close>View ${g.title} →</a></p>`) : ''}`;
    nm.showModal();
  });
}

let tt;
function toast(t) {
  const el = $('[data-toast]');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 2200);
}
