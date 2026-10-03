// Studio Portfolio "Lens": scramble loader → grayscale art wall with a color-revealing cursor lens →
// games on an infinite draggable canvas → sticky manifesto. Game details open in a circle-wipe panel (#game/<id>).

import { loadAll, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS, filterGames } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindLightbox, bindDialog, bindEmailCopy, gameFacts, loadFailed, reveal } from '../../shared/js/kit.js';
import { createLoader, preloadAll, gameRouter, toaster } from '../../shared/js/spa.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const HOME_TITLE = 'FewClicks: games you can love in a few clicks';
const year = (d) => (d ? String(d).slice(0, 4) : 'TBA');
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';

// ---------------- loader ----------------
const L = document.createElement('div');
L.className = 'loader';
L.setAttribute('role', 'status');
L.setAttribute('aria-label', 'Loading');
L.innerHTML = '<div class="half top"></div><div class="half bot"></div><div class="ui"><div class="line"><i data-line></i></div><div class="word" data-word aria-hidden="true">FEWCLICKS</div><span class="mono lbl" data-lbl>Loading worlds</span><span class="pct" data-pct>00</span></div>';
document.body.appendChild(L);
document.body.classList.add('locked');
let titles = ['FEWCLICKS'];
let wordI = 0, lastSwap = 0;
const loader = createLoader({
  minMs: 2000,
  render: (p) => {
    $('[data-pct]', L).textContent = String(Math.round(p)).padStart(2, '0');
    $('[data-line]', L).style.setProperty('--p', p / 100);
    const now = performance.now();
    if (now - lastSwap > 380 && p < 96) { lastSwap = now; scramble($('[data-word]', L), titles[wordI++ % titles.length].toUpperCase(), 320); }
    if (p >= 96) $('[data-word]', L).textContent = 'FEWCLICKS';
  },
  onFinish: () => {
    L.classList.add('done');
    document.body.classList.remove('locked');
    sfx.whoosh();
    setTimeout(() => L.remove(), 1300);
  },
});

function scramble(el, target, ms = 500) {
  if (reducedMotion) { el.textContent = target; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const n = Math.floor(k * target.length);
    el.textContent = target.slice(0, n) + [...target.slice(n)].map((c) => (c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

start();

let toast = () => {};
async function start() {
  let data;
  try { data = await loadAll(); } catch (err) { loader.set(100); loadFailed(err); return; }
  titles = ['FEWCLICKS', ...data.games.map((g) => g.title)];
  loader.set(20);
  render(data);
  const panel = $('[data-panel]');
  const router = gameRouter({
    panel, games: data.games, studio: data.studio, homeTitle: HOME_TITLE,
    render: panelHtml,
    notFound: (id) => html`<div class="panel-bar"><a class="brand" href="#games"><b></b>FewClicks</a><button class="round" type="button" data-close-panel aria-label="Close">✕</button></div><div class="not-found" data-not-found><div><span class="mono">Error 404</span><h2>Out of focus.</h2><p class="mono" style="margin-bottom:24px">No game called “${id}”.</p><button class="cta" type="button" data-close-panel><span class="dot"></span>Back to games</button></div></div>`,
    afterRender: (p, g) => {
      if (g) bindLightbox($('#lightbox'), g, { root: p });
      p.querySelectorAll('a[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); }));
    },
    onOpen: () => sfx.whoosh(),
  });
  loader.then(() => router.route());
  await preloadAll(data.games.map((g) => g.media.cover), (p) => loader.set(20 + p * 79));
  loader.set(100);
}

// remember where the user clicked so the panel wipes open from there
addEventListener('pointerdown', (e) => {
  const p = $('[data-panel]');
  if (p && !p.classList.contains('open')) { p.style.setProperty('--ox', `${e.clientX}px`); p.style.setProperty('--oy', `${e.clientY}px`); }
}, true);

// ---------------- page ----------------
function render(data) {
  const { games, categories, studio, team, news } = data;
  const cols = innerWidth < 720 ? 3 : 6;
  const pool = [...games, ...games, ...games];
  const wall = Array.from({ length: cols }, (_, c) => {
    const imgs = Array.from({ length: 5 }, (_, k) => pool[(c * 2 + k) % pool.length].media.cover);
    const all = [...imgs, ...imgs];
    return `<div class="col" style="--dur:${38 + (c % 3) * 9}s">${all.map((s) => `<img src="${s}" alt="" loading="eager">`).join('')}</div>`;
  }).join('');

  main.insertAdjacentHTML('beforebegin', `<nav class="nav" aria-label="Main" data-nav>
    <a class="brand" href="#top"><b aria-hidden="true"></b>FewClicks</a>
    <ul><li><a href="#games">Games</a></li><li><a href="#studio">Studio</a></li><li><a href="#news">Journal</a></li><li><a href="#contact">Contact</a></li></ul>
    <div class="right"><button class="txt-btn" type="button" data-sound-toggle><span data-sound-icon></span></button><button class="txt-btn menu-btn" type="button" aria-expanded="false" data-menu>Menu</button></div></nav>`);

  main.innerHTML = html`
  <section class="hero" id="top" aria-label="FewClicks" data-hero>
    <div class="layer gray" aria-hidden="true"><div class="wall" style="--cols:${cols}">${raw(wall)}</div><div class="bigword">FewClicks</div></div>
    <div class="layer color" aria-hidden="true" data-lens><div class="wall" style="--cols:${cols}">${raw(wall)}</div><div class="bigword">FewClicks</div></div>
    <span class="lens-ring" aria-hidden="true" data-ring></span>
    <div class="hero-top"><span class="mono">Independent game studio</span><span class="mono">Est. ${studio.founded || '2026'} · Mobile · PC · Console</span></div>
    <h1 class="sr-only">FewClicks. ${studio.tagline}</h1>
    <div class="hero-foot">
      <p class="tag">${studio.tagline}</p>
      <span class="mono mid">${coarsePointer ? 'Touch to focus' : 'Move to focus the lens'}</span>
      <div class="right"><a class="cta" href="#games" data-magnet><span class="dot"></span>Explore the games</a></div>
    </div>
  </section>

  <section class="section" id="games" aria-labelledby="games-t">
    <div class="s-label"><span class="mono">(01) Portfolio</span><span class="mono">${games.length} projects</span></div>
    <h2 class="s-title" id="games-t">Our <span class="o">games</span></h2>
    <div class="g-bar" role="search">
      <div class="chips" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.name}</button>`))}</div>
      <div class="g-tools">
        <div class="chips" role="group" aria-label="Platform">${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button class="chip" type="button" data-platform="${k}" aria-pressed="${k === 'all'}">${l}</button>`))}</div>
        <label class="sr-only" for="q">Search</label><input class="field" id="q" type="search" placeholder="Search…" data-q autocomplete="off">
        <label class="sr-only" for="sort">Sort</label><select class="field" id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select>
        <div class="chips" role="group" aria-label="View"><button class="chip" type="button" data-view="canvas" aria-pressed="true">Canvas</button><button class="chip" type="button" data-view="list" aria-pressed="false">Index</button></div>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div data-grid></div>
    <p class="empty" data-empty hidden>Nothing in focus. <button class="chip" type="button" data-reset>Reset filters</button></p>
  </section>

  <section class="section" id="studio" aria-labelledby="studio-t">
    <div class="s-label"><span class="mono">(02) Studio</span><span class="mono">Manifesto</span></div>
    <p class="intro-text" data-reveal id="studio-t">${studio.description}</p>
    <div class="manifesto">
      <div class="sticky-num" aria-hidden="true"><span data-mnum>01</span><small>/ ${String(studio.values.length).padStart(2, '0')} principles</small></div>
      <div>${studio.values.map((v, i) => raw(html`<article class="m-item" data-m="${i + 1}"><span class="mono">Principle ${String(i + 1).padStart(2, '0')}</span><h3>${v.title}</h3><p>${v.text}</p></article>`))}</div>
    </div>
    <div class="stats">${studio.stats.map((s) => raw(html`<div class="stat" data-reveal><b>${s.value}</b><span class="mono">${s.label}</span></div>`))}</div>
    <div class="team">${team.map((m) => raw(html`<article class="member" data-team-member><div class="ph" style="background:${m.color}"><img src="${m.avatar}" alt="" loading="lazy" width="256" height="256"></div><span class="mono">${m.role}</span><h3>${m.name}</h3><p>${m.bio}</p></article>`))}</div>
  </section>

  <section class="section" id="news" aria-labelledby="news-t">
    <div class="s-label"><span class="mono">(03) Journal</span><span class="mono">Devlog &amp; news</span></div>
    <h2 class="s-title" id="news-t" style="margin-bottom:50px">Jour<span class="o">nal</span></h2>
    <div>${news.map((p) => raw(html`<button class="news-item" type="button" data-news-item data-id="${p.id}"><span class="mono">${formatDate(p.date)}</span><span><h3>${p.title}</h3><p>${p.summary}</p></span><span class="mono">${p.tag} ↗</span></button>`))}</div>
  </section>

  <section class="section contact" id="contact" aria-labelledby="contact-t">
    <div class="s-label"><span class="mono">(04) Contact</span><span class="mono">Say hello</span></div>
    <h2 class="sr-only" id="contact-t">Contact</h2>
    <a class="mail-big" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
    <div class="c-row"><a class="cta" data-email-link data-magnet href="mailto:admin@fewclicks.org"><span class="dot"></span>Write to us</a><button class="cta cta--ghost" type="button" data-copy-email><span class="dot"></span>Copy address</button>${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}</div>
  </section>
  <footer class="footer"><span class="mono">© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}</span><span class="mono">Designed to be played in a few clicks</span></footer>
  <div class="panel" role="dialog" aria-modal="true" aria-label="Game details" aria-hidden="true" data-panel></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="round modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="cta cta--ghost" type="button" data-lb-prev>← Prev</button><button class="cta" type="button" data-lb-close>Close</button><button class="cta cta--ghost" type="button" data-lb-next>Next →</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  toast = toaster($('[data-toast]'));
  mountSoundToggle($('[data-sound-toggle]'), { on: 'Sound on', off: 'Sound off' });
  mountPrototypeBadge(6, 'Studio Portfolio · Lens');
  const nav = $('[data-nav]'), mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? 'Close' : 'Menu'; });
  nav.querySelectorAll('ul a').forEach((a) => {
    a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = 'Menu'; });
    a.addEventListener('mouseenter', () => scramble(a, a.textContent, 300));
  });

  setupLens();
  setupGames(games, categories);
  setupManifesto();
  setupMagnets();
  bindNews(data);
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? 'Email copied' : 'Copy failed'); if (ok) sfx.success(); });
  reveal(main, reducedMotion);
}

// ---------------- lens ----------------
function setupLens() {
  const hero = $('[data-hero]'), lens = $('[data-lens]'), ring = $('[data-ring]');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, r = 0, tr = coarsePointer ? 120 : 0, inside = false;
  const R = () => Math.min(220, Math.max(120, innerWidth * 0.14));
  hero.addEventListener('pointermove', (e) => { const b = hero.getBoundingClientRect(); x = e.clientX - b.left; y = e.clientY - b.top; inside = true; tr = R(); });
  hero.addEventListener('pointerleave', () => { inside = false; tr = 0; });
  hero.addEventListener('pointerdown', () => { tr = R() * 1.5; sfx.pop(0.6); });
  hero.addEventListener('pointerup', () => { tr = inside ? R() : 0; });
  let t = 0;
  const loop = () => {
    t += 0.008;
    if (!inside) {
      // idle: the lens wanders on its own (and always on touch screens)
      const b = hero.getBoundingClientRect();
      x = b.width * (0.5 + 0.32 * Math.sin(t * 1.3));
      y = b.height * (0.45 + 0.18 * Math.sin(t * 2.1));
      tr = reducedMotion ? 0 : R() * 0.8;
    }
    cx += (x - cx) * 0.14; cy += (y - cy) * 0.14; r += (tr - r) * 0.1;
    for (const el of [lens, ring]) { el.style.setProperty('--lx', `${cx}px`); el.style.setProperty('--ly', `${cy}px`); el.style.setProperty('--r', `${r}px`); }
    requestAnimationFrame(loop);
  };
  if (!reducedMotion) loop();
}

// ---------------- games: infinite canvas + index ----------------
function setupGames(games, categories) {
  const host = $('[data-grid]');
  const state = { category: 'all', platform: 'all', query: '', sort: 'featured' };
  let view = 'canvas', board = null;

  const draw = (animate) => {
    const list = filterGames(games, state);
    $('[data-empty]').hidden = list.length > 0;
    $('[data-status]').textContent = `${list.length} games shown`;
    board?.destroy();
    board = null;
    if (!list.length) { host.innerHTML = ''; return; }
    if (view === 'list') {
      host.innerHTML = `<div class="list">${list.map((g, i) => html`<button class="row" type="button" data-game-card data-open="${g.id}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><h3>${g.title}</h3><span class="mono cats">${g.categoryList.map((c) => c.name).join(' / ')}</span><span class="mono plat">${[...new Set(g.platformList.map((p) => p.group))].join(' · ')}</span><span class="mono yr">${year(g.releaseDate)}</span></button>`).join('')}</div>`;
      if (animate && !reducedMotion) host.querySelectorAll('.row').forEach((r, i) => r.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 50, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    } else {
      board = infiniteBoard(host, list);
    }
  };
  const sync = () => {
    document.querySelectorAll('#games [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
    document.querySelectorAll('#games [data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
    document.querySelectorAll('#games [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  };
  $('#games').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-platform]'), v = e.target.closest('[data-view]'), r = e.target.closest('[data-reset]');
    if (c) state.category = c.dataset.cat;
    else if (p) state.platform = p.dataset.platform;
    else if (v) view = v.dataset.view;
    else if (r) { Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' }); $('[data-q]').value = ''; $('[data-sort]').value = 'featured'; }
    else return;
    sync(); draw(true); sfx.tick();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value; draw(true); }, 160); });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; draw(true); });
  host.addEventListener('click', (e) => {
    if (board?.dragged()) return;
    const b = e.target.closest('[data-open]');
    if (b) location.hash = `game/${b.dataset.open}`;
  });
  draw(false);
}

function infiniteBoard(host, list) {
  host.innerHTML = `<div class="board" data-board><span class="hint mono">${coarsePointer ? 'Swipe sideways to explore' : 'Drag to explore · click to open'}</span></div>`;
  const el = $('[data-board]', host);
  const tw = innerWidth < 720 ? 210 : 300, th = tw * 0.625 + 44, gap = innerWidth < 720 ? 20 : 34;
  el.style.setProperty('--tw', `${tw}px`);
  const cw = tw + gap, ch = th + gap;
  const need = Math.ceil((el.clientWidth + cw * 2) / cw);
  const C = Math.max(1, Math.ceil(need / list.length)) * list.length;
  const R = Math.max(2, Math.ceil((el.clientHeight + ch * 2) / ch));
  const PW = C * cw, PH = R * ch;
  const tiles = [];
  const seen = new Set();
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const g = list[(c + r * Math.max(1, Math.floor(list.length / 2))) % list.length];
    const first = !seen.has(g.id);
    seen.add(g.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.open = g.id;
    if (first) b.setAttribute('data-game-card', ''); else { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
    b.setAttribute('aria-label', `Open ${g.title}`);
    b.innerHTML = html`<span class="im"><img src="${g.media.cover}" alt="" draggable="false"></span>${g.status !== 'released' ? raw(html`<span class="st mono">${STATUS[g.status].short}</span>`) : ''}<span class="cap"><b>${g.title}</b><span class="mono">${year(g.releaseDate)}</span></span>`;
    el.appendChild(b);
    tiles.push({ b, bx: c * cw + (r % 2 ? cw / 2 : 0), by: r * ch });
  }
  let ox = -cw * 0.4, oy = -ch * 0.3, vx = reducedMotion ? 0 : -0.35, vy = 0, drag = null, moved = 0, raf, alive = true;
  const mod = (a, n) => ((a % n) + n) % n;
  const place = () => {
    for (const t of tiles) {
      const x = mod(t.bx + ox, PW) - cw;
      const y = mod(t.by + oy, PH) - ch;
      t.b.style.transform = `translate(${x}px, ${y}px)`;
    }
  };
  el.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
    moved = 0;
    el.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = drag.touch ? 0 : e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    ox += dx; oy += dy; vx = dx; vy = dy;
  });
  const up = () => { if (!drag) return; drag = null; el.classList.remove('dragging'); };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); ox -= e.deltaX; vx = -e.deltaX * 0.2; } }, { passive: false });
  el.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [cw, 0], ArrowRight: [-cw, 0], ArrowUp: [0, ch], ArrowDown: [0, -ch] }[e.key];
    if (k && e.target === el) { e.preventDefault(); ox += k[0]; oy += k[1]; }
  });
  const loop = () => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (!drag) {
      ox += vx; oy += vy;
      vx *= 0.94; vy *= 0.94;
      if (!reducedMotion && Math.abs(vx) < 0.35 && Math.abs(vy) < 0.1) vx = -0.35; // gentle idle drift
    }
    place();
  };
  place();
  loop();
  return {
    dragged: () => moved > 6,
    destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); },
  };
}

// ---------------- manifesto + magnets ----------------
function setupManifesto() {
  const num = $('[data-mnum]');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { const v = String(e.target.dataset.m).padStart(2, '0'); if (num.textContent !== v) { scramble(num, v, 300); sfx.tick(); } }
  }), { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-m]').forEach((m) => io.observe(m));
}

function setupMagnets() {
  if (coarsePointer || reducedMotion) return;
  document.querySelectorAll('[data-magnet]').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
}

// ---------------- game panel ----------------
function panelHtml(g, { index, prev, next, games }) {
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  const meta = [['Platforms', g.platformList.map((p) => p.label).join(', ')], ['Release', g.status === 'released' ? formatDate(g.releaseDate) : `${formatDate(g.releaseDate)} · planned`], ['Genre', g.categoryList.map((c) => c.name).join(', ')], ['Price', g.price || '—']];
  return html`
  <div class="panel-bar"><a class="brand" href="#games"><b></b>FewClicks</a><span class="mono">${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}</span>
    <div class="navs"><button class="round" type="button" data-go="${prev.id}" aria-label="Previous game">←</button><button class="round" type="button" data-go="${next.id}" aria-label="Next game">→</button><button class="round" type="button" data-close-panel aria-label="Close">✕</button></div></div>
  <header class="p-hero"><img src="${g.media.hero}" alt="${g.title} artwork">
    <div class="p-hero-c"><span class="mono lime">${STATUS[g.status].label} · ${g.categoryList.map((c) => c.name).join(' / ')}</span><h2 data-game-title>${g.title}</h2><p class="tagl">${g.tagline}</p></div></header>
  <div class="p-wrap">
    <div class="meta-grid">${meta.map(([k, v]) => raw(html`<div><span class="mono">${k}</span><b>${v}</b></div>`))}</div>
    <div class="p-body">
      <div><p class="lead">${g.description.short}</p><div class="prose">${g.description.long.map((p) => raw(html`<p>${p}</p>`))}</div>
        <div class="stores">${g.stores.map((s, i) => raw(html`<a class="cta ${i ? 'cta--ghost' : ''}" data-store href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}><span class="dot"></span>${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="cta cta--ghost"><span class="dot"></span>Coming soon</span>')}</div></div>
      <div>${g.features.length ? raw(html`<h3 class="mono" style="font-weight:400;margin-bottom:14px">Highlights</h3><ul class="feat-list">${g.features.map((f, i) => raw(html`<li><span>0${i + 1}</span>${f}</li>`))}</ul>`) : ''}
        ${g.rating.count ? raw(html`<p style="margin-top:30px"><span class="mono">Player rating</span><br><span style="font-family:var(--display);font-size:72px;font-weight:300;letter-spacing:-.06em">${g.rating.average.toFixed(1)}</span> <span class="lime">${starString(g.rating.average)}</span> <span class="mono">${compactNumber(g.rating.count)} ratings</span></p>`) : ''}</div>
    </div>
    <section class="p-sec"><h3>Trailer</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span class="mono" style="color:var(--bone)">Trailer coming soon</span></div>`)}</div></section>
    ${g.media.screenshots.length ? raw(html`<section class="p-sec"><h3>Gallery</h3><div class="gallery">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div></section>`) : ''}
    ${g.reviews.length ? raw(html`<section class="p-sec"><h3>Press &amp; players</h3><div class="quotes">${g.reviews.map((r) => raw(html`<figure class="quote">${typeof r.score === 'number' ? raw(html`<span class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</span>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite class="mono">${r.author ? `${r.author} — ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}
    <section class="p-sec"><h3>Details</h3><div class="meta-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${gameFacts(g).map(([k, v]) => raw(html`<div><span class="mono">${k}</span><b>${v}</b></div>`))}</div></section>
    <div class="p-next"><button type="button" data-go="${prev.id}"><span class="mono">← Previous</span><b>${prev.title}</b></button><button type="button" data-go="${next.id}"><span class="mono">Next →</span><b>${next.title}</b></button></div>
    <p style="padding:30px 0 90px"><a class="cta cta--ghost" href="#games"><span class="dot"></span>All games</a></p>
  </div>`;
}

function bindNews({ news, games }) {
  const nm = $('#news-modal');
  bindDialog(nm);
  $('#news').addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = news.find((x) => x.id === b.dataset.id);
    const g = games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`<span class="mono">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="cta" href="#game/${g.id}" data-close><span class="dot"></span>Open ${g.title}</a></p>`) : ''}`;
    nm.showModal();
  });
}
