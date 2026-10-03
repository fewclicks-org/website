// Launch: bold AAA-launch single page. Progress-ring loader → liquid WebGL key-art hero that dissolves between
// featured games → ticker → bento games grid → character-select team → news → "Join the journey". Game view at #game/<id>.

import { loadAll, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS, filterGames } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer, hasWebGL } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindLightbox, bindDialog, bindEmailCopy, gameFacts, loadFailed, reveal } from '../../shared/js/kit.js';
import { createLoader, preloadAll, gameRouter, toaster } from '../../shared/js/spa.js';
import { createLiquid } from './liquid.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const HOME_TITLE = 'FewClicks: games you can love in a few clicks';
const TIPS = ['Tip: every FewClicks game is playable within three taps.', 'Tip: click the hero to make the key art ripple.', 'Tip: hover a team member to see their stats.', 'Tip: press Esc to close a game page.'];

// ---------------- loader ----------------
const L = document.createElement('div');
L.className = 'loader';
L.setAttribute('role', 'status');
L.setAttribute('aria-label', 'Loading');
L.innerHTML = `<div><div class="pring"><svg viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="lg10"><stop offset="0" stop-color="#ff2d75"/><stop offset="1" stop-color="#ff8a00"/></linearGradient></defs><circle class="bg" cx="75" cy="75" r="70"/><circle class="fg" cx="75" cy="75" r="70"/></svg><b data-p>0</b></div><div class="press">Press start</div><p class="tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</p></div>`;
document.body.appendChild(L);
document.body.classList.add('locked');
const loader = createLoader({
  minMs: 1800,
  render: (p) => { $('[data-p]', L).textContent = Math.round(p); $('.fg', L).style.strokeDashoffset = 440 - 440 * (p / 100); },
  onFinish: () => { L.classList.add('done'); document.body.classList.remove('locked'); sfx.coin(); setTimeout(() => L.remove(), 800); },
});

start();
let toast = () => {};

async function start() {
  let data;
  try { data = await loadAll(); } catch (err) { loader.set(100); loadFailed(err); return; }
  loader.set(20);
  const featured = data.games.filter((g) => g.featured);
  const heroGames = (featured.length ? featured : data.games).slice(0, 5);
  render(data, heroGames);
  const router = gameRouter({
    panel: $('[data-panel]'), games: data.games, studio: data.studio, homeTitle: HOME_TITLE,
    render: viewHtml,
    notFound: (id) => html`<div class="gv-top"><span class="brand"><i>F</i>FewClicks</span><button class="btn btn--sm btn--ghost" type="button" data-close-panel>Close ✕</button></div><div class="not-found" data-not-found><div><span class="lbl">Error 404</span><h2>Game over</h2><p style="color:var(--muted);margin-bottom:26px">No game called “${id}”. Continue?</p><button class="btn" type="button" data-close-panel>Continue ▶</button></div></div>`,
    afterRender: (p, g) => {
      if (g) bindLightbox($('#lightbox'), g, { root: p });
      p.querySelectorAll('a[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); sfx.coin(); }));
      p.querySelectorAll('.tabs a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); p.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); }));
    },
    onOpen: () => sfx.whoosh(),
  });
  loader.then(() => { router.route(); startHero(heroGames); });
  await preloadAll(heroGames.map((g) => g.media.hero), (p) => loader.set(20 + p * 79));
  loader.set(100);
}

function render(data, heroGames) {
  const { games, categories, studio, team, news } = data;
  const first = heroGames[0];
  main.insertAdjacentHTML('beforebegin', `<nav class="nav" aria-label="Main" data-nav>
    <a class="brand" href="#top"><i aria-hidden="true">F</i>FewClicks</a>
    <ul><li><a href="#games">Games</a></li><li><a href="#studio">Studio</a></li><li><a href="#news">News</a></li><li><a href="#contact">Contact</a></li></ul>
    <button class="ico" type="button" data-sound-toggle><span data-sound-icon></span></button>
    <a class="btn btn--sm" href="#games">Play now</a>
    <button class="ico menu-btn" type="button" aria-label="Menu" aria-expanded="false" data-menu>☰</button></nav>`);

  const tick = [...games.map((g) => g.title), 'Mobile', 'PC', 'Console', 'Few clicks', 'Big fun'];
  main.innerHTML = html`
  <section class="hero" id="top" aria-label="Featured game" data-hero>
    <canvas data-liquid aria-hidden="true"></canvas>
    <div class="sweep" aria-hidden="true"></div>
    <div class="hero-c" data-hc></div>
    <div class="slides" role="tablist" aria-label="Featured games">${heroGames.map((g, i) => raw(html`<button type="button" role="tab" data-slide="${i}" aria-current="${i === 0}"><b>0${i + 1}</b><span>${g.title}</span><i></i></button>`))}</div>
  </section>
  <div class="ticker" aria-hidden="true"><div>${[...tick, ...tick].map((t, i) => raw(html`<span>${t}</span><span class="gt">✦</span>`))}</div></div>

  <section class="section" id="games" aria-labelledby="games-t">
    <div class="head"><div><span class="lbl">The lineup</span><h2 id="games-t" style="margin-top:10px">Our <span class="gt">games</span></h2></div><p>${studio.tagline} Pick a world and drop in.</p></div>
    <div class="fbar" role="search">
      <div class="chips" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.name}</button>`))}</div>
      <div class="chips">
        ${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button class="chip" type="button" data-platform="${k}" aria-pressed="${k === 'all'}">${l}</button>`))}
        <label class="sr-only" for="q">Search</label><input class="field" id="q" type="search" placeholder="Search…" data-q autocomplete="off">
        <label class="sr-only" for="sort">Sort</label><select class="field" id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="bento" data-grid></div>
    <p class="empty" data-empty hidden>No games found. <button class="chip" type="button" data-reset>Reset</button></p>
  </section>

  <section class="section" id="studio" aria-labelledby="studio-t" style="background:var(--bg-2)">
    <div class="head"><div><span class="lbl">Behind the games</span><h2 id="studio-t" style="margin-top:10px">The <span class="gt">studio</span></h2></div><p>${studio.description}</p></div>
    <div class="big-stats">${studio.stats.map((s) => raw(html`<div class="bs" data-reveal><b class="gt">${s.value}</b><span class="lbl">${s.label}</span></div>`))}</div>
    <div class="pillars">${studio.values.map((v) => raw(html`<div class="pillar" data-reveal><span class="e" aria-hidden="true">${v.icon}</span><h3>${v.title}</h3><p>${v.text}</p></div>`))}</div>
    <div class="head" style="margin:90px 0 0"><div><span class="lbl">Character select</span><h2 style="margin-top:10px;font-size:clamp(48px,6vw,96px)">Choose your <span class="gt">dev</span></h2></div></div>
    <div class="select">${team.map((m, i) => raw(html`<button class="char ${i === 0 ? 'on' : ''}" type="button" data-team-member style="--mc:${m.color}" aria-label="${m.name}, ${m.role}"><img src="${m.avatar}" alt="" loading="lazy"><span class="in"><span class="lbl">${m.role}</span><h3>${m.name}</h3><p>${m.bio}</p><span class="bars">${Object.entries(m.stats).map(([k, v]) => raw(html`<span class="bar">${k}<i style="--v:${v}%"></i></span>`))}</span></span></button>`))}</div>
  </section>

  <section class="section" id="news" aria-labelledby="news-t">
    <div class="head"><div><span class="lbl">Patch notes &amp; news</span><h2 id="news-t" style="margin-top:10px">Latest <span class="gt">drops</span></h2></div></div>
    <div class="newsrow">${news.map((p) => raw(html`<button class="ncard" type="button" data-news-item data-id="${p.id}" data-reveal><span class="im">${p.image ? raw(html`<img src="${p.image}" alt="" loading="lazy">`) : 'FC'}</span><span class="tx"><span class="lbl">${p.tag} · ${formatDate(p.date)}</span><h3>${p.title}</h3><p>${p.summary}</p></span></button>`))}</div>
  </section>

  <section class="join" id="contact" aria-labelledby="contact-t">
    <span class="lbl" style="color:#fff;position:relative">Press · Partners · Players</span>
    <h2 id="contact-t" style="margin-top:12px">Join the journey</h2>
    <a class="mail" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
    <div class="row"><a class="btn" data-email-link href="mailto:admin@fewclicks.org">Email us ▶</a><button class="btn btn--ghost" type="button" data-copy-email>Copy address</button></div>
    ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}
  </section>
  <footer class="footer"><span>© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}. All rights reserved.</span><span>All trademarks are property of their respective owners.</span></footer>
  <div class="gv" role="dialog" aria-modal="true" aria-label="Game details" aria-hidden="true" data-panel></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="ico modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn btn--sm btn--ghost" type="button" data-lb-prev>◀ Prev</button><button class="btn btn--sm" type="button" data-lb-close>Close</button><button class="btn btn--sm btn--ghost" type="button" data-lb-next>Next ▶</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  heroCopy(first, false);
  toast = toaster($('[data-toast]'));
  mountSoundToggle($('[data-sound-toggle]'), { on: '🔊', off: '🔇' });
  mountPrototypeBadge(10, 'Launch · AAA');
  const nav = $('[data-nav]'), mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? '✕' : '☰'; });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = '☰'; }));
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
  document.querySelectorAll('.char').forEach((c) => c.addEventListener('mouseenter', () => { document.querySelectorAll('.char').forEach((x) => x.classList.toggle('on', x === c)); sfx.blip(); }));
  $('.select').addEventListener('click', (e) => { const c = e.target.closest('.char'); if (c) { document.querySelectorAll('.char').forEach((x) => x.classList.toggle('on', x === c)); sfx.coin(); } });

  setupGames(games, categories);
  bindNews(data);
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? 'Email copied!' : 'Copy failed'); if (ok) sfx.success(); });
  reveal(main, reducedMotion);
}

function heroCopy(g, animate = true) {
  const hc = $('[data-hc]');
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  hc.innerHTML = html`<span class="badge ${g.status === 'released' ? '' : 'soon'}">${g.status === 'released' ? 'Out now' : STATUS[g.status].label}</span>
    <h1><span class="glitch ${animate ? 'go' : ''}" data-text="${g.title}">${g.title}</span></h1>
    <p class="tl">${g.tagline}</p>
    <div class="plats">${g.platformList.map((p) => raw(html`<span>${p.label}</span>`))}</div>
    <div class="acts">${g.stores[0] ? raw(html`<a class="btn" href="${g.stores[0].url || '#'}" data-hero-store>${g.stores[0].label || `${verb} ${storeLabel(g.stores[0])}`}</a>`) : ''}<a class="btn btn--ghost" href="#game/${g.id}">Explore ${g.title} ▶</a></div>`;
  hc.querySelector('[data-hero-store][href="#"]')?.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); sfx.coin(); });
  if (animate && !reducedMotion) hc.animate([{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
}

function startHero(heroGames) {
  const canvas = $('[data-liquid]');
  let liquid = null;
  if (hasWebGL()) { try { liquid = createLiquid(canvas, heroGames.map((g) => g.media.hero)); } catch (err) { console.warn(err); } }
  const hero = $('[data-hero]');
  const fb = document.createElement('div');
  fb.className = 'fallback';
  if (!liquid) { canvas.replaceWith(fb); fb.style.backgroundImage = `url("${heroGames[0].media.hero}")`; }
  let i = 0, timer;
  const DUR = 7000;
  const go = (n) => {
    n = (n + heroGames.length) % heroGames.length;
    if (n === i && timer) { schedule(); return; }
    if (liquid) { if (!liquid.go(n)) return; } else fb.style.backgroundImage = `url("${heroGames[n].media.hero}")`;
    i = n;
    heroCopy(heroGames[i]);
    document.querySelectorAll('[data-slide]').forEach((b, k) => { b.setAttribute('aria-current', String(k === i)); const bar = b.querySelector('i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; });
    sfx.whoosh();
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!reducedMotion) timer = setTimeout(() => go(i + 1), DUR); };
  document.querySelectorAll('[data-slide]').forEach((b) => { b.style.setProperty('--dur', `${DUR}ms`); b.addEventListener('click', () => go(Number(b.dataset.slide))); });
  hero.addEventListener('click', (e) => { if (!e.target.closest('a, button')) { liquid?.pulse(); sfx.pop(0.5); } });
  schedule();
}

function setupGames(games, categories) {
  const grid = $('[data-grid]');
  const state = { category: 'all', platform: 'all', query: '', sort: 'featured' };
  const draw = (anim) => {
    const list = filterGames(games, state);
    grid.innerHTML = list.map((g) => html`<button class="tile" type="button" data-game-card data-open="${g.id}" aria-label="Open ${g.title}"><img src="${g.media.cover}" alt="" loading="lazy"><span class="badge ${g.status === 'released' ? '' : 'soon'}">${STATUS[g.status].label}</span><span class="in"><span class="lbl">${g.categoryList.map((c) => c.name).join(' · ')} · ${[...new Set(g.platformList.map((p) => p.group))].join(' / ')}</span><h3>${g.title}</h3></span></button>`).join('');
    $('[data-empty]').hidden = list.length > 0;
    $('[data-status]').textContent = `${list.length} games shown`;
    if (anim && !reducedMotion) grid.querySelectorAll('.tile').forEach((t, k) => t.animate([{ opacity: 0, transform: 'scale(.9)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 600, delay: k * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  };
  const sync = () => {
    document.querySelectorAll('#games [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
    document.querySelectorAll('#games [data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
  };
  $('#games').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { location.hash = `game/${o.dataset.open}`; return; }
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-platform]'), r = e.target.closest('[data-reset]');
    if (c) state.category = c.dataset.cat;
    else if (p) state.platform = p.dataset.platform;
    else if (r) { Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' }); $('[data-q]').value = ''; $('[data-sort]').value = 'featured'; }
    else return;
    sync(); draw(true); sfx.click();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value; draw(true); }, 160); });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; draw(true); });
  grid.addEventListener('pointerover', (e) => { const tl = e.target.closest('.tile'); if (tl && !tl.contains(e.relatedTarget)) sfx.blip(); });
  draw(false);
}

function viewHtml(g, { prev, next }) {
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  return html`
  <div class="gv-top"><span class="brand"><i aria-hidden="true">F</i>FewClicks</span><div class="nv"><button class="ico" type="button" data-go="${prev.id}" aria-label="Previous game">◀</button><button class="ico" type="button" data-go="${next.id}" aria-label="Next game">▶</button><button class="btn btn--sm btn--ghost" type="button" data-close-panel>Close ✕</button></div></div>
  <header class="gv-hero"><img src="${g.media.hero}" alt="${g.title} key art"><div class="c"><span class="badge ${g.status === 'released' ? '' : 'soon'}">${STATUS[g.status].label}</span><h2 data-game-title>${g.title}</h2><p class="tl">${g.tagline}</p>
    <div class="stores">${g.stores.map((s, i) => raw(html`<a class="btn ${i ? 'btn--ghost' : ''}" data-store href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || ''} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="btn btn--ghost">Coming soon</span>')}</div></div></header>
  <nav class="tabs" aria-label="Sections"><a href="#gv-ov">Overview</a><a href="#gv-media">Media</a>${g.reviews.length ? raw('<a href="#gv-rev">Reviews</a>') : ''}<a href="#gv-specs">Specs</a></nav>
  <div class="gv-wrap">
    <section class="gv-sec" id="gv-ov"><h3>Overview</h3><div class="ov"><div><p class="lead">${g.description.short}</p><div class="prose">${g.description.long.map((p) => raw(html`<p>${p}</p>`))}</div>
      ${g.rating.count ? raw(html`<div class="score"><b class="gt">${g.rating.average.toFixed(1)}</b><span><span style="color:var(--sun)">${starString(g.rating.average)}</span><br><span class="lbl">${compactNumber(g.rating.count)} ratings</span></span></div>`) : ''}</div>
      ${g.features.length ? raw(html`<ul class="feats">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul>`) : ''}</div></section>
    <section class="gv-sec" id="gv-media"><h3>Media</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span>Trailer soon</span></div>`)}</div>
      ${g.media.screenshots.length ? raw(html`<div class="shots">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div>`) : ''}</section>
    ${g.reviews.length ? raw(html`<section class="gv-sec" id="gv-rev"><h3>Reviews</h3><div class="revs">${g.reviews.map((r) => raw(html`<figure class="rev">${typeof r.score === 'number' ? raw(html`<span class="sc gt">${r.score}<small style="font-size:.4em">/${r.max || 5}</small></span>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author} — ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}
    <section class="gv-sec" id="gv-specs"><h3>Specs</h3><div class="specs">${gameFacts(g).map(([k, v]) => raw(html`<div><span class="lbl">${k}</span><b>${v}</b></div>`))}</div></section>
    <div class="pn"><button type="button" data-go="${prev.id}"><img src="${prev.media.cover}" alt=""><span><span class="lbl">◀ Previous</span><b>${prev.title}</b></span></button><button type="button" data-go="${next.id}"><img src="${next.media.cover}" alt=""><span><span class="lbl">Next ▶</span><b>${next.title}</b></span></button></div>
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
    $('[data-modal-body]', nm).innerHTML = html`<span class="lbl">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn" href="#game/${g.id}" data-close>Play ${g.title} ▶</a></p>`) : ''}`;
    nm.showModal();
  });
}
