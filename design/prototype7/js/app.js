// Nova: single-page 3D showcase. Loader assembles the crystal → scroll flies you through a corridor of games.

import { loadAll, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer, hasWebGL } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindFilters, bindLightbox, bindDialog, bindEmailCopy, gameFacts, loadFailed, reveal } from '../../shared/js/kit.js';
import { createLoader, preloadAll, gameRouter, toaster } from '../../shared/js/spa.js';
import { createCorridor } from './corridor.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const HOME_TITLE = 'FewClicks: games you can love in a few clicks';

// ---------------- loader ----------------
const loaderEl = document.createElement('div');
loaderEl.className = 'loader';
loaderEl.setAttribute('role', 'status');
loaderEl.setAttribute('aria-label', 'Loading');
loaderEl.innerHTML = `<div><div class="ring"><svg viewBox="0 0 180 180" aria-hidden="true"><defs><linearGradient id="lg"><stop offset="0" stop-color="#49e3ff"/><stop offset="1" stop-color="#ff6bd5"/></linearGradient></defs><circle class="track" cx="90" cy="90" r="85"/><circle class="bar" cx="90" cy="90" r="85"/></svg><span class="num" data-num>0</span></div><span class="mono" data-msg>Assembling the crystal</span></div>`;
document.body.appendChild(loaderEl);
document.body.classList.add('locked');
let corridor = null;
const msgs = ['Assembling the crystal', 'Lighting the corridor', 'Hanging the posters', 'Warping in'];
const loader = createLoader({
  minMs: 1800,
  render: (p) => {
    $('[data-num]', loaderEl).textContent = Math.round(p);
    loaderEl.style.setProperty('--p', p / 100);
    $('.bar', loaderEl).style.strokeDashoffset = 534 - 534 * (p / 100);
    $('[data-msg]', loaderEl).textContent = msgs[Math.min(msgs.length - 1, Math.floor((p / 100) * msgs.length))];
    corridor?.setAssemble(p / 100);
  },
  onFinish: () => {
    loaderEl.classList.add('done');
    document.body.classList.remove('locked');
    document.body.classList.add('ready');
    sfx.whoosh();
    setTimeout(() => loaderEl.remove(), 1100);
  },
});

start();

async function start() {
  let data;
  try { data = await loadAll(); } catch (err) { loader.set(100); loadFailed(err); return; }
  loader.set(25);
  render(data);
  const router = gameRouter({
    panel: $('[data-panel]'), games: data.games, studio: data.studio, homeTitle: HOME_TITLE,
    render: viewHtml, notFound: (id) => html`<div class="not-found" data-not-found><div><span class="mono">Signal lost · 404</span><h2>No game called “${id}”.</h2><button class="btn btn--glow" type="button" data-close-panel>Back to the galaxy</button></div></div>`,
    afterRender: (panel, g) => {
      if (g) bindLightbox($('#lightbox'), g, { root: panel });
      panel.querySelectorAll('a[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); }));
    },
    onOpen: () => sfx.whoosh(),
  });
  loader.then(() => router.route());
  await preloadAll(data.games.map((g) => g.media.cover), (p) => loader.set(25 + p * 74));
  loader.set(100);
}

let toast = () => {};

function render(data) {
  const { games, categories, studio, team, news } = data;
  main.insertAdjacentHTML('beforebegin', `<nav class="nav glass" aria-label="Main" data-nav>
    <a class="brand" href="#top"><i aria-hidden="true"></i>FewClicks</a>
    <ul><li><a href="#games">Games</a></li><li><a href="#studio">Studio</a></li><li><a href="#news">News</a></li><li><a href="#contact">Contact</a></li></ul>
    <button class="btn icon" type="button" data-sound-toggle><span data-sound-icon></span></button>
    <a class="btn btn--glow" href="#contact">Contact</a>
    <button class="btn icon menu-btn" type="button" aria-label="Menu" aria-expanded="false" data-menu>☰</button></nav>`);

  const flightVh = reducedMotion ? 100 : games.length * 70 + 140;
  main.innerHTML = html`
  <section class="flight" id="top" style="height:${flightVh}vh" aria-label="Fly through our games">
    <div class="stage">
      <canvas data-canvas aria-hidden="true"></canvas>
      <div class="hero-c" data-hero>
        <span class="mono reveal-up">FewClicks · Independent game studio</span>
        <h1 class="reveal-up d1" style="margin-top:18px">Games you can <span class="grad">love</span> in a few clicks.</h1>
        <p class="lead reveal-up d2">${studio.description}</p>
        <div class="ctas reveal-up d3"><a class="btn btn--glow" href="#games">Explore games →</a><button class="btn" type="button" data-fly>✦ Fly through</button></div>
        <span class="scroll-hint mono reveal-up d3"><span aria-hidden="true"></span>Scroll to fly</span>
      </div>
      <div class="hud" data-hud style="opacity:0">
        <div class="now"><span class="mono" data-hud-idx>01 / ${String(games.length).padStart(2, '0')}</span><b data-hud-title></b></div>
        <button class="btn" type="button" data-hud-open>Open game →</button>
        <div class="prog mono">Flight<i data-prog></i></div>
      </div>
      <span class="label3d" data-label aria-hidden="true"></span>
    </div>
  </section>

  <section class="section" id="games" aria-labelledby="games-t"><div class="container">
    <div class="head"><div><span class="mono">01 — Portfolio</span><h2 id="games-t" style="margin-top:12px">All <span class="grad">games</span></h2></div><p>Every world we've built so far. Tilt a card, open it, dive in.</p></div>
    <div class="toolbar" role="search">
      <div class="chips" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="chip" type="button" data-cat="${c.id}">${c.name}</button>`))}</div>
      <div class="tools">
        <div class="seg" role="group" aria-label="Platform">${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button type="button" data-platform="${k}">${l}</button>`))}</div>
        <label class="sr-only" for="q">Search</label><input class="field" id="q" type="search" placeholder="Search…" data-q autocomplete="off">
        <label class="sr-only" for="sort">Sort</label><select class="field" id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select>
        <div class="seg" role="group" aria-label="View"><button type="button" data-view="rail" aria-pressed="true">Carousel</button><button type="button" data-view="grid" aria-pressed="false">Grid</button></div>
        <div class="rail-nav"><button class="btn icon" type="button" data-rail="-1" aria-label="Scroll left">←</button><button class="btn icon" type="button" data-rail="1" aria-label="Scroll right">→</button></div>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="rail-wrap"><div class="rail" data-grid></div></div>
    <p class="empty" data-empty hidden>No games match. <button class="btn" type="button" data-reset>Reset</button></p>
  </div></section>

  <section class="section" id="studio" aria-labelledby="studio-t"><div class="container">
    <div class="head"><div><span class="mono">02 — Studio</span><h2 id="studio-t" style="margin-top:12px">Tiny team, <span class="grad">big light.</span></h2></div></div>
    <div class="split">
      <p class="big-quote" data-reveal>${studio.description}</p>
      <div class="values">${studio.values.map((v) => raw(html`<div class="glass value" data-reveal><span class="ic" aria-hidden="true">${v.icon}</span><div><h3>${v.title}</h3><p>${v.text}</p></div></div>`))}</div>
    </div>
    <div class="stats">${studio.stats.map((s) => raw(html`<div class="glass stat" data-reveal><b class="grad">${s.value}</b><span>${s.label}</span></div>`))}</div>
    <div class="team">${team.map((m) => raw(html`<article class="glass member" data-team-member data-reveal><span class="av"><img src="${m.avatar}" alt="" width="108" height="108" loading="lazy"></span><h3>${m.name}</h3><span class="role">${m.role}</span><p>${m.bio}</p></article>`))}</div>
  </div></section>

  <section class="section" id="news" aria-labelledby="news-t"><div class="container">
    <div class="head"><div><span class="mono">03 — Transmissions</span><h2 id="news-t" style="margin-top:12px">News &amp; devlog</h2></div></div>
    <div class="news">${news.map((p) => raw(html`<button class="glass post" type="button" data-news-item data-id="${p.id}" data-reveal><span class="im">${p.image ? raw(html`<img src="${p.image}" alt="" loading="lazy">`) : '✦'}</span><span class="tx"><span class="mono">${p.tag} · ${formatDate(p.date)}</span><h3>${p.title}</h3><p>${p.summary}</p></span></button>`))}</div>
  </div></section>

  <section class="section" id="contact" aria-labelledby="contact-t"><div class="container">
    <div class="glass contact" data-reveal><span class="mono">04 — Contact</span><h2 id="contact-t" style="margin-top:14px">Send us a signal.</h2>
      <a class="mail grad" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
      <div class="row"><a class="btn btn--glow" data-email-link href="mailto:admin@fewclicks.org">Write an email →</a><button class="btn" type="button" data-copy-email>Copy address</button></div>
      ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}</div>
  </div></section>
  <footer class="footer"><span>© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}</span><span>Made with light, math &amp; a few clicks.</span></footer>
  <div class="view" role="dialog" aria-modal="true" aria-label="Game details" aria-hidden="true" data-panel></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="btn icon modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn" type="button" data-lb-prev>← Prev</button><button class="btn btn--glow" type="button" data-lb-close>Close</button><button class="btn" type="button" data-lb-next>Next →</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  toast = toaster($('[data-toast]'));
  mountSoundToggle($('[data-sound-toggle]'), { on: '♪', off: '♪̸' });
  mountPrototypeBadge(7, 'Nova · 3D Flythrough');
  const nav = $('[data-nav]'), mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? '✕' : '☰'; });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = '☰'; }));

  setupFlight(games);
  setupGames(games, categories);
  bindNews(data);
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? 'Email address copied' : 'Copy failed'); if (ok) sfx.success(); });
  reveal(main, reducedMotion);
}

// ---------------- 3D flight ----------------
function setupFlight(games) {
  const section = $('.flight');
  const hero = $('[data-hero]'), hud = $('[data-hud]'), label = $('[data-label]');
  let current = games[0];
  const canvas = $('[data-canvas]');
  if (hasWebGL()) {
    try {
      corridor = createCorridor(canvas, games, {
        onPick: (g) => { location.hash = `game/${g.id}`; },
        onHover: (g) => { if (g) sfx.blip(); },
        onProgressLabel: (g, p) => {
          if (!g) { label.classList.remove('on'); return; }
          if (g !== current) {
            current = g;
            $('[data-hud-title]').textContent = g.title;
            $('[data-hud-idx]').textContent = `${String(games.indexOf(g) + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`;
            sfx.tick();
          }
          label.textContent = `${g.title} · click to open`;
          label.style.left = `${p.x}px`;
          label.style.top = `${p.y}px`;
          label.classList.toggle('on', p.inView && !coarsePointer);
        },
      });
    } catch (err) { console.warn(err); }
  }
  if (!corridor) {
    canvas.style.background = `center / cover url("${games[0].media.hero}")`;
    canvas.style.filter = 'brightness(.4)';
  }
  $('[data-hud-title]').textContent = current.title;
  $('[data-hud-open]').addEventListener('click', () => (location.hash = `game/${current.id}`));
  $('[data-fly]').addEventListener('click', () => scrollTo({ top: section.offsetTop + innerHeight * 0.9, behavior: reducedMotion ? 'auto' : 'smooth' }));
  const onScroll = () => {
    const total = section.offsetHeight - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, (scrollY - section.offsetTop) / total)) : 0;
    corridor?.setProgress(p);
    hero.style.opacity = String(Math.max(0, 1 - p * 12));
    hero.style.pointerEvents = p > 0.05 ? 'none' : '';
    hud.style.opacity = String(Math.min(1, Math.max(0, (p - 0.04) * 10)));
    hud.style.pointerEvents = p > 0.06 ? '' : 'none';
    $('[data-prog]').parentElement.style.setProperty('--p', p);
    $('[data-prog]').style.setProperty('--p', p);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------------- games ----------------
function setupGames(games, categories) {
  const grid = $('[data-grid]');
  bindFilters({
    root: $('#games'), games, categories,
    render(list, state, src) {
      grid.innerHTML = list.map((g) => html`<button class="card" type="button" data-game-card data-open="${g.id}" style="--c1:${g.theme.primary}" aria-label="Open ${g.title}">
        <img src="${g.media.cover}" alt="" loading="lazy">
        <span class="tag"><span class="pill ${g.status === 'released' ? '' : 'soon'}"><i></i>${STATUS[g.status].label}</span></span>
        <span class="in"><span class="mono">${g.categoryList.map((c) => c.name).join(' · ')}</span><h3>${g.title}</h3><span class="sub">${g.tagline}</span></span></button>`).join('');
      if (src && !reducedMotion) grid.querySelectorAll('.card').forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(30px) rotateY(-20deg)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      if (src) sfx.tick();
    },
  });
  grid.addEventListener('click', (e) => { const c = e.target.closest('[data-open]'); if (c) location.hash = `game/${c.dataset.open}`; });
  if (!coarsePointer && !reducedMotion) {
    grid.addEventListener('pointermove', (e) => {
      const c = e.target.closest('.card');
      if (!c) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
      c.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
      c.style.setProperty('--mx', `${x * 100}%`);
      c.style.setProperty('--my', `${y * 100}%`);
    });
    grid.addEventListener('pointerout', (e) => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
  }
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    grid.classList.toggle('grid', b.dataset.view === 'grid');
    document.querySelector('.rail-nav').hidden = b.dataset.view === 'grid';
  }));
  document.querySelectorAll('[data-rail]').forEach((b) => b.addEventListener('click', () => grid.scrollBy({ left: Number(b.dataset.rail) * grid.clientWidth * 0.7, behavior: 'smooth' })));
}

// ---------------- game view ----------------
function viewHtml(g, { index, prev, next, games }) {
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  return html`
  <div class="view-top"><button class="btn icon" type="button" data-go="${prev.id}" aria-label="Previous game">←</button><button class="btn icon" type="button" data-go="${next.id}" aria-label="Next game">→</button><button class="btn" type="button" data-close-panel>Close ✕</button></div>
  <div class="view-art"><img src="${g.media.hero}" alt="${g.title} artwork">
    ${g.media.screenshots.length ? raw(html`<div class="thumbs">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="" loading="lazy"></button>`))}</div>`) : ''}</div>
  <div class="view-body">
    <span class="mono">${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')} · ${STATUS[g.status].label}</span>
    <h2 data-game-title>${g.title}</h2><p class="tl">${g.tagline}</p>
    <div class="facts">${g.rating.count ? raw(html`<span>★ ${g.rating.average.toFixed(1)} · ${compactNumber(g.rating.count)}</span>`) : ''}${g.price ? raw(html`<span>${g.price}</span>`) : ''}${g.categoryList.map((c) => raw(html`<span>${c.name}</span>`))}${g.platformList.map((p) => raw(html`<span>${p.label}</span>`))}</div>
    <div class="stores">${g.stores.map((s, i) => raw(html`<a class="btn ${i ? '' : 'btn--glow'}" data-store href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || ''} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="btn">Coming soon</span>')}</div>
    <div class="block"><h3>Overview</h3><div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div></div>
    ${g.features.length ? raw(html`<div class="block"><h3>Highlights</h3><ul class="feats">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
    <div class="block"><h3>Trailer</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span class="mono" style="color:var(--fg)">Trailer coming soon</span></div>`)}</div></div>
    ${g.reviews.length ? raw(html`<div class="block"><h3>Reviews</h3><div class="quotes">${g.reviews.map((r) => raw(html`<figure class="quote">${typeof r.score === 'number' ? raw(html`<span class="st" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</span>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author} · ` : ''}${r.source}</cite></figcaption></figure>`))}</div></div>`) : ''}
    <div class="block"><h3>Details</h3><div class="dl">${gameFacts(g).map(([k, v]) => raw(html`<div><span class="mono">${k}</span><b>${v}</b></div>`))}</div></div>
    <div class="pn"><button type="button" data-go="${prev.id}"><span class="mono">← Previous</span><b>${prev.title}</b></button><button type="button" data-go="${next.id}"><span class="mono">Next →</span><b>${next.title}</b></button></div>
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
    $('[data-modal-body]', nm).innerHTML = html`<span class="mono">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--glow" href="#game/${g.id}" data-close>Open ${g.title} →</a></p>`) : ''}`;
    nm.showModal();
  });
}
