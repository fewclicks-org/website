// Spec: Swiss blueprint single page. Grid-draw loader → variable-weight wordmark that reacts to the cursor →
// sortable spec-sheet of games with a sticky viewer / catalog view → changelog → Form 01 contact. Data sheet at #game/<id>.

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
const code = (i) => `FC-${String(i + 1).padStart(3, '0')}`;

// ---------------- loader ----------------
document.body.insertAdjacentHTML('afterbegin', `<div class="cols" aria-hidden="true">${'<i></i>'.repeat(12)}</div>`);
const L = document.createElement('div');
L.className = 'loader';
L.setAttribute('role', 'status');
L.setAttribute('aria-label', 'Loading');
L.innerHTML = `<div class="lcols" aria-hidden="true">${'<i></i>'.repeat(12)}</div><div class="info mono"><span>FewClicks Studio</span><span>Spec sheet rev. ${new Date().getFullYear()}</span><span data-step>Drawing grid</span></div><div class="count" data-count>000</div>`;
document.body.appendChild(L);
document.body.classList.add('locked');
const steps = ['Drawing grid', 'Setting type', 'Measuring games', 'Printing sheet'];
const loader = createLoader({
  minMs: 1700,
  render: (p) => {
    $('[data-count]', L).textContent = String(Math.round(p)).padStart(3, '0');
    L.querySelectorAll('.lcols i').forEach((c, i) => c.style.setProperty('--p', Math.min(1, Math.max(0, p / 100 * 1.6 - i * 0.05))));
    $('[data-step]', L).textContent = steps[Math.min(steps.length - 1, Math.floor(p / 26))];
  },
  onFinish: () => { L.classList.add('done'); document.body.classList.remove('locked'); sfx.whoosh(); setTimeout(() => L.remove(), 1000); },
});

start();
let toast = () => {};

async function start() {
  let data;
  try { data = await loadAll(); } catch (err) { loader.set(100); loadFailed(err); return; }
  loader.set(20);
  render(data);
  const router = gameRouter({
    panel: $('[data-panel]'), games: data.games, studio: data.studio, homeTitle: HOME_TITLE,
    render: sheetHtml,
    notFound: (id) => html`<div class="sh-bar"><span class="mono">Data sheet</span><button class="sq" type="button" data-close-panel>Close ✕</button></div><div class="not-found" data-not-found><span class="mono red">Error 404 · record missing</span><h2>No record.</h2><p class="mono" style="margin-bottom:20px">ID “${id}” does not exist in the catalogue.</p><button class="btn" type="button" data-close-panel>Back to index →</button></div>`,
    afterRender: (p, g) => {
      if (g) bindLightbox($('#lightbox'), g, { root: p });
      p.querySelectorAll('a[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); }));
    },
    onOpen: () => sfx.whoosh(),
  });
  $('[data-scrim]').addEventListener('click', () => router.close(true));
  loader.then(() => router.route());
  await preloadAll(data.games.map((g) => g.media.cover), (p) => loader.set(20 + p * 79));
  loader.set(100);
}

function render(data) {
  const { games, categories, studio, team, news } = data;
  const word = 'FewClicks';

  main.insertAdjacentHTML('beforebegin', `<nav class="nav" aria-label="Main" data-nav>
    <a class="brand" href="#top"><i aria-hidden="true"></i>FewClicks</a>
    <ul><li><a href="#games"><sup>01</sup>Index</a></li><li><a href="#studio"><sup>02</sup>Studio</a></li><li><a href="#news"><sup>03</sup>Changelog</a></li><li><a href="#contact"><sup>04</sup>Contact</a></li></ul>
    <div class="tools"><button class="sq" type="button" data-grid-toggle aria-pressed="false" title="Show grid (G)">Grid</button><button class="sq" type="button" data-sound-toggle><span data-sound-icon></span></button><button class="sq menu-btn" type="button" aria-expanded="false" data-menu>Menu</button></div></nav>`);

  main.innerHTML = html`
  <section class="hero grid12" id="top" aria-label="FewClicks">
    <div class="top mono"><span>Independent game studio</span><span>Mobile / PC / Console</span><span class="coords" data-coords>X 0000 · Y 0000</span><span style="text-align:right">Est. ${studio.founded || '2026'}</span></div>
    <h1 class="word" data-word aria-label="FewClicks">${raw([...word].map((c, i) => `<span${i >= 3 ? ' class="r"' : ''} aria-hidden="true">${c}</span>`).join(''))}</h1>
    <div class="bottom">
      <p class="lead">${studio.tagline} ${studio.description.split('. ')[0]}.</p>
      <div class="mosaic">${games.slice(0, 3).map((g, i) => raw(html`<div><img src="${g.media.icon || g.media.cover}" alt="" loading="eager"><span class="mono">${code(i)}</span></div>`))}</div>
      <a class="btn cta" href="#games">Index <span>↓</span></a>
    </div>
  </section>

  <section class="sec grid12" id="games" aria-labelledby="games-t">
    <div class="sec-h"><span class="mono idx">01 / Index</span><h2 id="games-t">Games</h2><p>A complete technical index of every FewClicks title. Sort by any column. Hover a row to inspect it.</p></div>
    <div class="ctrl" role="search">
      <div class="toggles" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="tg" type="button" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.name}</button>`))}</div>
      <div class="toggles" role="group" aria-label="Platform">${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button class="tg" type="button" data-platform="${k}" aria-pressed="${k === 'all'}">${l}</button>`))}</div>
      <label class="sr-only" for="q">Search</label><input class="field" id="q" type="search" placeholder="Search index…" data-q autocomplete="off">
      <div class="toggles" role="group" aria-label="View"><button class="tg" type="button" data-view="table" aria-pressed="true">Table</button><button class="tg" type="button" data-view="catalog" aria-pressed="false">Catalog</button></div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="spec-wrap" data-wrap>
      <div class="spec"><div class="thead mono" role="row"><span>ID</span><button type="button" data-sortby="az">Title</button><span>Genre</span><span>Platform</span><button type="button" data-sortby="newest">Year</button><button type="button" data-sortby="rating">Rating</button></div><div data-grid></div></div>
      <aside class="viewer" aria-hidden="true"><div class="frame"><img alt="" data-v-img></div><div class="dim mono"><span>1200 × 675</span><span data-v-code></span></div><div class="vt" data-v-title></div><p data-v-desc></p></div>
    </div>
    <p class="empty mono" data-empty hidden>0 records match. <button class="tg" type="button" data-reset>Reset</button></p>
  </section>

  <section class="sec grid12" id="studio" aria-labelledby="studio-t">
    <div class="sec-h"><span class="mono idx">02 / Studio</span><h2 id="studio-t">Studio</h2><p>Specification of a tiny game company.</p></div>
    <div class="specs"><p class="manifest" data-reveal>${studio.description}</p>
      <div class="rules">${studio.values.map((v, i) => raw(html`<div class="rule"><span class="mono red">R.${String(i + 1).padStart(2, '0')}</span><div><h3>${v.title}</h3><p>${v.text}</p></div></div>`))}</div></div>
    <div class="nums">${studio.stats.map((s) => raw(html`<div class="num" data-reveal><b>${s.value}</b><span class="mono">${s.label}</span></div>`))}</div>
    <div class="cards">${team.map((m, i) => raw(html`<article class="idc" data-team-member><div class="ph" style="background:${m.color}"><img src="${m.avatar}" alt="" loading="lazy" width="256" height="256"></div><span class="mono red">ID-${String(i + 1).padStart(2, '0')}</span><h3>${m.name}</h3><dl class="mono"><dt>Role</dt><dd>${m.role}</dd>${Object.entries(m.stats).map(([k, v]) => raw(html`<dt>${k}</dt><dd>${v}%</dd>`))}</dl><p>${m.bio}</p></article>`))}</div>
  </section>

  <section class="sec grid12" id="news" aria-labelledby="news-t">
    <div class="sec-h"><span class="mono idx">03 / Changelog</span><h2 id="news-t">Changelog</h2><p>Studio updates, releases and devlogs, newest first.</p></div>
    <div class="log">${news.map((p, i) => raw(html`<button class="log-item" type="button" data-news-item data-id="${p.id}"><span class="mono v">v1.${news.length - i}</span><span class="mono d">${formatDate(p.date)}</span><h3>${p.title}</h3><span class="mono t">${p.tag} ↗</span><p>${p.summary}</p></button>`))}</div>
  </section>

  <section class="sec grid12" id="contact" aria-labelledby="contact-t">
    <div class="sec-h"><span class="mono idx">04 / Contact</span><h2 id="contact-t">Form 01</h2><p>One field. No forms to fill. Just write to us.</p></div>
    <div class="form01">
      <div class="f1"><span class="mono">01 · Channel</span><p style="margin-top:12px;font-size:20px;font-weight:600">Email</p></div>
      <div class="f2"><span class="mono">02 · Address</span><a class="mail" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></div>
      <div class="f3"><div class="row"><a class="btn" data-email-link href="mailto:admin@fewclicks.org">Send email <span>→</span></a><button class="btn btn--line" type="button" data-copy-email>Copy <span>⧉</span></button>${studio.address ? raw(html`<address class="mono">${studio.address}</address>`) : ''}</div></div>
    </div>
  </section>
  <footer class="footer mono"><span>© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}</span><span>Set in Roboto Flex &amp; IBM Plex Mono</span><span>Press G to toggle grid</span></footer>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Game data sheet" aria-hidden="true" data-panel></div><div class="sheet-scrim" data-scrim></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="sq modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="sq" type="button" data-lb-prev>← Prev</button><button class="sq" type="button" data-lb-close>Close</button><button class="sq" type="button" data-lb-next>Next →</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  toast = toaster($('[data-toast]'));
  mountSoundToggle($('[data-sound-toggle]'), { on: 'Snd on', off: 'Snd off' });
  mountPrototypeBadge(9, 'Spec · Swiss blueprint');
  const nav = $('[data-nav]'), mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? 'Close' : 'Menu'; });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = 'Menu'; }));
  const gt = $('[data-grid-toggle]');
  const toggleGrid = () => { const on = document.body.classList.toggle('show-grid'); gt.setAttribute('aria-pressed', String(on)); sfx.tick(); };
  gt.addEventListener('click', toggleGrid);
  addEventListener('keydown', (e) => { if ((e.key === 'g' || e.key === 'G') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) toggleGrid(); });

  setupWord();
  setupIndex(games, categories);
  bindNews(data);
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? 'Address copied' : 'Copy failed'); if (ok) sfx.success(); });
  reveal(main, reducedMotion);
}

// variable-weight wordmark: letters near the cursor get heavier
function setupWord() {
  const spans = [...document.querySelectorAll('[data-word] span')];
  const coords = $('[data-coords]');
  let mx = -9999, my = -9999, t = 0;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    coords.textContent = `X ${String(Math.round(e.clientX)).padStart(4, '0')} · Y ${String(Math.round(e.clientY + scrollY)).padStart(4, '0')}`;
  }, { passive: true });
  const loop = () => {
    t += 0.02;
    spans.forEach((s, i) => {
      let w;
      if (coarsePointer || mx < -999) w = 450 + 450 * Math.sin(t + i * 0.6); // breathing wave on touch / idle
      else {
        const r = s.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
        w = 1000 - Math.min(1, d / 520) * 900;
      }
      s.style.setProperty('--w', Math.round(w));
      s.style.setProperty('--wd', Math.round(25 + (w / 1000) * 100));
    });
    requestAnimationFrame(loop);
  };
  if (!reducedMotion) loop(); else spans.forEach((s) => s.style.setProperty('--w', 800));
}

function setupIndex(games, categories) {
  const host = $('[data-grid]');
  const wrap = $('[data-wrap]');
  const state = { category: 'all', platform: 'all', query: '', sort: 'featured' };
  let view = 'table';
  const show = (g) => {
    if (!g) return;
    $('[data-v-img]').src = g.media.cover;
    $('[data-v-code]').textContent = code(games.indexOf(g));
    $('[data-v-title]').textContent = g.title;
    $('[data-v-desc]').textContent = g.description.short;
  };
  const draw = (anim) => {
    const list = filterGames(games, state);
    $('[data-empty]').hidden = list.length > 0;
    $('[data-status]').textContent = `${list.length} records`;
    wrap.querySelector('.thead').hidden = view !== 'table';
    wrap.querySelector('.viewer').hidden = view !== 'table';
    host.className = view === 'table' ? '' : 'catalog';
    wrap.querySelector('.spec').style.gridColumn = view === 'table' ? '' : '1 / -1';
    host.innerHTML = view === 'table'
      ? list.map((g) => html`<button class="trow" type="button" data-game-card data-open="${g.id}"><span class="mono">${code(games.indexOf(g))}</span><h3>${g.title}</h3><span class="mono">${g.categoryList.map((c) => c.name).join(' / ')}</span><span class="mono">${[...new Set(g.platformList.map((p) => p.group))].join(' · ')}</span><span class="mono">${year(g.releaseDate)}</span><span class="mono st ${g.status === 'released' ? '' : 'soon'}">${g.rating.count ? g.rating.average.toFixed(1) : STATUS[g.status].short}</span></button>`).join('')
      : list.map((g) => html`<button class="cat-card" type="button" data-game-card data-open="${g.id}"><span class="mono red">${code(games.indexOf(g))}</span><span class="im"><img src="${g.media.cover}" alt="" loading="lazy"></span><span class="dimx mono"><span>W 16 : H 10</span></span><h3>${g.title}</h3><span class="meta mono"><span>${g.categoryList.map((c) => c.name).join(' / ')}</span><span>${year(g.releaseDate)}</span></span></button>`).join('');
    show(list[0]);
    host.querySelectorAll('[data-open]').forEach((r) => {
      const g = games.find((x) => x.id === r.dataset.open);
      r.addEventListener('mouseenter', () => { show(g); sfx.tick(); });
      r.addEventListener('focus', () => show(g));
    });
    if (anim && !reducedMotion) host.querySelectorAll('[data-open]').forEach((r, i) => r.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 500, delay: i * 40, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'backwards' }));
    document.querySelectorAll('[data-sortby]').forEach((b) => b.setAttribute('aria-sort', b.dataset.sortby === state.sort ? (state.sort === 'az' ? 'ascending' : 'descending') : 'none'));
  };
  const sync = () => {
    document.querySelectorAll('#games [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
    document.querySelectorAll('#games [data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
    document.querySelectorAll('#games [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  };
  $('#games').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { location.hash = `game/${o.dataset.open}`; return; }
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-platform]'), v = e.target.closest('[data-view]'), s = e.target.closest('[data-sortby]'), r = e.target.closest('[data-reset]');
    if (c) state.category = c.dataset.cat;
    else if (p) state.platform = p.dataset.platform;
    else if (v) view = v.dataset.view;
    else if (s) state.sort = state.sort === s.dataset.sortby ? 'featured' : s.dataset.sortby;
    else if (r) { Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' }); $('[data-q]').value = ''; }
    else return;
    sync(); draw(true); sfx.tick();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value; draw(true); }, 160); });
  draw(false);
}

function sheetHtml(g, { index, prev, next, games }) {
  const verb = g.status === 'released' ? 'Get on' : 'Wishlist on';
  return html`
  <div class="sh-bar"><span class="mono">Data sheet · ${code(index)}</span><div class="nv"><button class="sq" type="button" data-go="${prev.id}" aria-label="Previous game">←</button><button class="sq" type="button" data-go="${next.id}" aria-label="Next game">→</button><button class="sq" type="button" data-close-panel>Close ✕</button></div></div>
  <div class="sh-body">
    <div class="sh-title"><h2 data-game-title>${g.title}</h2><div class="code mono"><span class="red">${STATUS[g.status].label}</span><br>${code(index)} · Rev. ${year(g.releaseDate)}</div></div>
    <figure class="fig" style="margin:0"><img src="${g.media.hero}" alt="${g.title} artwork"><span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span><figcaption class="cap mono"><span>Fig. 1 — Key art</span><span>${g.tagline}</span></figcaption></figure>
    <div class="sh-cols">
      <div><p class="lead">${g.description.short}</p><div class="prose">${g.description.long.map((p) => raw(html`<p>${p}</p>`))}</div>
        <div class="stores">${g.stores.map((s) => raw(html`<a class="btn" data-store href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${s.label || `${verb} ${storeLabel(s)}`} <span>→</span></a>`))}${g.stores.length ? '' : raw('<span class="btn btn--line">Coming soon</span>')}</div></div>
      <div class="sh-sec"><h3>Specification</h3><table class="data"><tbody>${gameFacts(g).map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}${g.rating.count ? raw(html`<tr><th scope="row">Rating</th><td>${g.rating.average.toFixed(1)} / 5 · ${compactNumber(g.rating.count)}</td></tr>`) : ''}</tbody></table></div>
    </div>
    ${g.features.length ? raw(html`<div class="sh-sec"><h3>Features</h3><ul class="flist">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
    <div class="sh-sec"><h3>Fig. 2 — Trailer</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span class="mono">Trailer · pending</span></div>`)}</div></div>
    ${g.media.screenshots.length ? raw(html`<div class="sh-sec"><h3>Fig. 3 — Screens</h3><div class="strip">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"><span class="mono">3.${i + 1}</span></button>`))}</div></div>`) : ''}
    ${g.reviews.length ? raw(html`<div class="sh-sec"><h3>Reception</h3><div class="rvw">${g.reviews.map((r) => raw(html`<figure><span class="sc">${typeof r.score === 'number' ? `${r.score}/${r.max || 5}` : '—'}</span><div><blockquote>“${r.quote}”</blockquote><figcaption class="mono" style="margin-top:6px">${r.author ? `${r.author} · ` : ''}${r.source}</figcaption></div></figure>`))}</div></div>`) : ''}
    <div class="pn"><button type="button" data-go="${prev.id}"><span class="mono">← ${code(games.indexOf(prev))}</span><b>${prev.title}</b></button><button type="button" data-go="${next.id}"><span class="mono">${code(games.indexOf(next))} →</span><b>${next.title}</b></button></div>
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
    $('[data-modal-body]', nm).innerHTML = html`<span class="mono red">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn" href="#game/${g.id}" data-close>Open ${g.title} <span>→</span></a></p>`) : ''}`;
    nm.showModal();
  });
}
