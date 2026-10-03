// Chapter: a cinematic, single-page scroll story. Film-leader loader → letterbox opens → featured games
// play as pinned "chapters" → credits index of all games → cast → press → "Fin." Game views open at #game/<id>.

import { loadAll, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS, filterGames } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindLightbox, bindDialog, bindEmailCopy, gameFacts, loadFailed, reveal } from '../../shared/js/kit.js';
import { createLoader, preloadAll, gameRouter, toaster } from '../../shared/js/spa.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const HOME_TITLE = 'FewClicks: games you can love in a few clicks';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const year = (d) => (d ? String(d).slice(0, 4) : 'TBA');

// ---------------- film leader loader ----------------
const L = document.createElement('div');
L.className = 'loader';
L.setAttribute('role', 'status');
L.setAttribute('aria-label', 'Loading');
L.innerHTML = `<div class="leader"><span class="rings"></span><span class="cross"></span><span class="n" data-n>5</span></div>
  <div class="meta"><span class="type">FewClicks Pictures presents</span><span class="type" data-tc>00:00:00</span></div>`;
document.body.appendChild(L);
document.body.classList.add('locked');
document.body.insertAdjacentHTML('afterbegin', '<div class="bar top" aria-hidden="true"></div><div class="bar bot" aria-hidden="true"></div>');
let lastN = 5;
const loader = createLoader({
  minMs: 2600,
  render: (p) => {
    const n = Math.max(1, 5 - Math.floor(p / 20));
    const frac = (p % 20) / 20;
    $('.leader', L).style.setProperty('--sweep', `${frac * 360}deg`);
    if (n !== lastN) { lastN = n; $('[data-n]', L).textContent = n; sfx.tick(); }
    const f = Math.round(p * 0.24);
    $('[data-tc]', L).textContent = `00:00:${String(Math.floor(p / 4)).padStart(2, '0')}:${String(f % 24).padStart(2, '0')}`;
  },
  onFinish: () => {
    L.classList.add('done');
    document.body.classList.remove('locked');
    setTimeout(() => document.body.classList.add('opened'), 300);
    sfx.whoosh();
    setTimeout(() => L.remove(), 900);
  },
});

start();
let toast = () => {};

async function start() {
  let data;
  try { data = await loadAll(); } catch (err) { loader.set(100); document.body.classList.add('opened'); loadFailed(err); return; }
  loader.set(20);
  render(data);
  const router = gameRouter({
    panel: $('[data-panel]'), games: data.games, studio: data.studio, homeTitle: HOME_TITLE,
    render: screenHtml,
    notFound: (id) => html`<div class="sc-bar"><span class="brand">FewClicks</span><button class="tbtn" type="button" data-close-panel>Close ✕</button></div><div class="not-found" data-not-found><div><span class="type">Reel missing</span><h2>Scene not found.</h2><p class="type" style="margin-bottom:26px">There is no game called “${id}”.</p><button class="btn btn--amber" type="button" data-close-panel>Back to the credits</button></div></div>`,
    afterRender: (p, g) => {
      if (g) bindLightbox($('#lightbox'), g, { root: p });
      p.querySelectorAll('a[data-store][href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('Store page coming soon'); }));
    },
    onOpen: () => sfx.whoosh(),
  });
  loader.then(() => router.route());
  await preloadAll(data.games.map((g) => g.media.hero), (p) => loader.set(20 + p * 79));
  loader.set(100);
}

// ---------------- page ----------------
function render(data) {
  const { games, categories, studio, team, news } = data;
  const featured = games.filter((g) => g.featured).slice(0, 4);
  const chapters = featured.length ? featured : games.slice(0, 3);

  main.insertAdjacentHTML('beforebegin', `<nav class="nav" aria-label="Main" data-nav>
    <a class="brand" href="#top">FewClicks</a>
    <ul><li><a href="#chapters">Chapters</a></li><li><a href="#games">Credits</a></li><li><a href="#studio">Cast</a></li><li><a href="#news">Press</a></li><li><a href="#contact">Contact</a></li></ul>
    <button class="tbtn" type="button" data-sound-toggle><span data-sound-icon></span></button>
    <button class="tbtn menu-btn" type="button" aria-expanded="false" data-menu>Menu</button></nav>`);

  main.innerHTML = html`
  <section class="hero" id="top" aria-label="Opening scene">
    ${chapters.map((g, i) => raw(html`<div class="shot ${i ? '' : 'on'}" aria-hidden="true"><img src="${g.media.hero}" alt=""></div>`))}
    <span class="tc" aria-hidden="true" data-rec>REC 00:00:00</span>
    <div class="hero-c">
      <div>
        <span class="type">A FewClicks production · Est. ${studio.founded || '2026'}</span>
        <h1 style="margin-top:18px">Games you can <em>love</em><br>in a few clicks.</h1>
        <p class="sub">${studio.description}</p>
        <div class="acts"><a class="btn btn--amber" href="#chapters">▶ Begin the story</a><a class="btn" href="#games">All games</a></div>
      </div>
      <div class="credit"><span class="type">Now showing</span><b data-now>${chapters[0].title}</b></div>
    </div>
  </section>

  <section class="knock" aria-label="Play" style="--kimg:url('${chapters[0].media.screenshots[0] || chapters[0].media.cover}')" data-knock>
    <h2 aria-hidden="true">Play.</h2>
    <p data-reveal>Every FewClicks game is a short film you can hold in your hands: it starts in a few clicks and stays with you for a while.</p>
  </section>

  <div id="chapters">${chapters.map((g, i) => raw(html`
    <section class="chapter" data-chapter aria-labelledby="ch-${g.id}">
      <div class="ch-stage">
        <div class="ch-frame"><img src="${g.media.hero}" alt="${g.title} artwork" loading="lazy"></div>
        <span class="ch-num">Chapter ${ROMAN[i]}</span>
        <span class="ch-title-small" aria-hidden="true">${g.title}</span>
        <div class="ch-copy">
          <div><span class="type amber">${g.categoryList.map((c) => c.name).join(' · ')} · ${year(g.releaseDate)}</span><h2 id="ch-${g.id}" style="margin-top:12px">${g.title}</h2></div>
          <div class="syn"><p>${g.description.short}</p><div class="row"><a class="btn btn--amber" href="#game/${g.id}">Watch the scene →</a><span class="type">${STATUS[g.status].label}</span></div></div>
        </div>
      </div>
    </section>`))}</div>

  <section class="section" id="games" aria-labelledby="games-t">
    <div class="s-head"><span class="type">Full credits</span><h2 id="games-t">Every <em>game</em></h2></div>
    <div class="filters" role="group" aria-label="Category">${[{ id: 'all', name: 'All' }, ...categories].map((c) => raw(html`<button class="f" type="button" data-cat="${c.id}" aria-pressed="${c.id === 'all'}">${c.name}</button>`))}</div>
    <div class="tools">
      <div class="filters" role="group" aria-label="Platform" style="margin:0">${[['all', 'Any'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button class="f" type="button" data-platform="${k}" aria-pressed="${k === 'all'}">${l}</button>`))}</div>
      <label class="sr-only" for="q">Search</label><input class="field" id="q" type="search" placeholder="Search the credits…" data-q autocomplete="off">
      <label class="sr-only" for="sort">Sort</label><select class="field" id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="credits" data-grid></div>
    <p class="empty" data-empty hidden>No titles in this reel. <button class="f" type="button" data-reset>Reset</button></p>
  </section>

  <section class="section" id="studio" aria-labelledby="studio-t">
    <div class="s-head"><span class="type">Prologue</span><h2 id="studio-t">The <em>studio</em></h2></div>
    <p class="prologue" data-reveal>${studio.description}</p>
    <div class="acts">${studio.values.map((v, i) => raw(html`<div class="act" data-reveal><span class="type">Act ${ROMAN[i]}</span><h3>${v.title}</h3><p>${v.text}</p></div>`))}</div>
    <div class="stats">${studio.stats.map((s) => raw(html`<div data-reveal><b>${s.value}</b><span class="type">${s.label}</span></div>`))}</div>
    <div class="cast"><div class="s-head" style="margin-bottom:30px"><span class="type">Starring</span><h2 style="font-size:clamp(40px,5vw,72px)">The <em>cast</em></h2></div>
      ${team.map((m) => raw(html`<div class="cast-row" data-team-member tabindex="0"><h3>${m.name}</h3><span class="dots" aria-hidden="true"></span><span class="role">${m.role}</span><span class="portrait" aria-hidden="true"><img src="${m.avatar}" alt="" loading="lazy"></span><p class="bio">${m.bio}</p></div>`))}
    </div>
  </section>

  <section class="section" id="news" aria-labelledby="news-t">
    <div class="s-head"><span class="type">Reviews &amp; reports</span><h2 id="news-t">In the <em>press</em></h2></div>
    <div class="press">${news.map((p) => raw(html`<button class="clip" type="button" data-news-item data-id="${p.id}" data-reveal><span class="type">${p.tag} · ${formatDate(p.date)}</span><h3>${p.title}</h3><p>${p.summary}</p></button>`))}</div>
  </section>

  <section class="fin" id="contact" aria-labelledby="contact-t">
    <div><span class="type">The end… or the beginning?</span><h2 id="contact-t" style="margin-top:20px">Fin.</h2>
      <a class="mail" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
      <div class="row"><a class="btn btn--amber" data-email-link href="mailto:admin@fewclicks.org">Write to us</a><button class="btn" type="button" data-copy-email>Copy address</button></div>
      ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}</div>
  </section>
  <footer class="footer"><span class="type">© ${new Date().getFullYear()} ${studio.legalName || 'FewClicks'}</span><span class="type">No pixels were harmed in the making of these games</span></footer>
  <div class="peek" aria-hidden="true" data-peek><img alt=""></div>
  <div class="screen" role="dialog" aria-modal="true" aria-label="Game details" aria-hidden="true" data-panel></div>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="tbtn modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn" type="button" data-lb-prev>← Prev</button><button class="btn btn--amber" type="button" data-lb-close>Close</button><button class="btn" type="button" data-lb-next>Next →</button></nav></dialog>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;

  toast = toaster($('[data-toast]'));
  mountSoundToggle($('[data-sound-toggle]'), { on: 'Sound on', off: 'Sound off' });
  mountPrototypeBadge(8, 'Chapter · Cinematic');
  const nav = $('[data-nav]'), mb = $('[data-menu]');
  mb.addEventListener('click', () => { const o = nav.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? 'Close' : 'Menu'; });
  nav.querySelectorAll('ul a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); mb.textContent = 'Menu'; }));

  heroReel(chapters);
  scrollScenes(chapters);
  creditsList(games, categories);
  bindNews(data);
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? 'Email copied' : 'Copy failed'); if (ok) sfx.success(); });
  reveal(main, reducedMotion);
}

function heroReel(chapters) {
  const shots = [...document.querySelectorAll('.hero .shot')];
  let i = 0;
  const t0 = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('[data-rec]').textContent = `REC 00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
  if (reducedMotion || shots.length < 2) return;
  setInterval(() => {
    shots[i].classList.remove('on');
    i = (i + 1) % shots.length;
    shots[i].classList.add('on');
    $('[data-now]').textContent = chapters[i].title;
  }, 6500);
}

// knockout parallax + chapter frames that grow from a small frame to full bleed
function scrollScenes(chapters) {
  const knock = $('[data-knock]');
  const chs = [...document.querySelectorAll('[data-chapter]')];
  const nav = $('[data-nav]');
  let kIdx = 0;
  const onScroll = () => {
    nav.classList.toggle('solid', scrollY > 40);
    const kr = knock.getBoundingClientRect();
    const kp = Math.min(1, Math.max(0, 1 - (kr.top + kr.height) / (innerHeight + kr.height)));
    knock.style.setProperty('--kp', `${kp * 100}%`);
    const want = Math.min(chapters.length - 1, Math.floor(kp * chapters.length));
    if (want !== kIdx) { kIdx = want; knock.style.setProperty('--kimg', `url('${chapters[kIdx].media.screenshots[0] || chapters[kIdx].media.cover}')`); }
    for (const ch of chs) {
      const r = ch.getBoundingClientRect();
      const total = ch.offsetHeight - innerHeight;
      const p = reducedMotion ? 1 : Math.min(1, Math.max(0, -r.top / total));
      const grow = Math.min(1, p / 0.55);
      const e = 1 - Math.pow(1 - grow, 3);
      const narrow = innerWidth < 700;
      ch.style.setProperty('--ci', `${(narrow ? 28 : 24) * (1 - e)}%`);
      ch.style.setProperty('--cx', `${(narrow ? 12 : 30) * (1 - e)}%`);
      ch.style.setProperty('--cr', `${18 * (1 - e)}px`);
      ch.style.setProperty('--cs', String(1.25 - 0.25 * e));
      ch.style.setProperty('--cb', String(0.9 - 0.35 * e));
      ch.style.setProperty('--co', String(1 - Math.min(1, grow * 1.6)));
      ch.style.setProperty('--to', String(Math.min(1, Math.max(0, (p - 0.5) / 0.25))));
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
}

function creditsList(games, categories) {
  const host = $('[data-grid]');
  const peek = $('[data-peek]');
  const state = { category: 'all', platform: 'all', query: '', sort: 'featured' };
  const draw = (anim) => {
    const list = filterGames(games, state);
    host.innerHTML = list.map((g) => html`<button class="credit-row" type="button" data-game-card data-open="${g.id}"><h3>${g.title}<span class="y">(${year(g.releaseDate)})</span></h3><span class="dots" aria-hidden="true"></span><span class="r">${g.categoryList.map((c) => c.name).join(' / ')}</span></button>`).join('');
    $('[data-empty]').hidden = list.length > 0;
    $('[data-status]').textContent = `${list.length} games shown`;
    if (anim && !reducedMotion) host.querySelectorAll('.credit-row').forEach((r, i) => r.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: i * 70, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
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
    sync(); draw(true); sfx.tick();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value; draw(true); }, 160); });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; draw(true); });
  draw(false);
  if (!coarsePointer && !reducedMotion) {
    let cur = '';
    host.addEventListener('pointermove', (e) => {
      const row = e.target.closest('[data-open]');
      if (!row) { peek.classList.remove('on'); cur = ''; return; }
      if (row.dataset.open !== cur) { cur = row.dataset.open; peek.querySelector('img').src = games.find((g) => g.id === cur).media.cover; sfx.blip(); }
      peek.style.left = `${e.clientX + 220}px`;
      peek.style.top = `${e.clientY}px`;
      peek.classList.add('on');
    });
    host.addEventListener('pointerleave', () => { peek.classList.remove('on'); cur = ''; });
  }
}

function screenHtml(g, { index, prev, next, games }) {
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  const billing = [['Genre', g.categoryList.map((c) => c.name).join(', ')], ['Release', formatDate(g.releaseDate)], ['Platforms', g.platformList.map((p) => p.label).join(', ')], ['Price', g.price || '—']];
  return html`
  <div class="sc-bar"><span class="brand">FewClicks</span><span class="type">Reel ${ROMAN[index] || index + 1} of ${ROMAN[games.length - 1] || games.length}</span><div style="display:flex;gap:8px"><button class="tbtn" type="button" data-go="${prev.id}" aria-label="Previous game">←</button><button class="tbtn" type="button" data-go="${next.id}" aria-label="Next game">→</button><button class="tbtn" type="button" data-close-panel>Close ✕</button></div></div>
  <header class="sc-hero"><img src="${g.media.hero}" alt="${g.title} artwork"><div class="c"><span class="type">${STATUS[g.status].label} · A FewClicks game</span><h2 data-game-title style="margin-top:14px">${g.title}</h2><p class="tag">${g.tagline}</p></div></header>
  <div class="sc-wrap">
    <div class="billing">${billing.map(([k, v]) => raw(html`<div><span class="type">${k}</span><b>${v}</b></div>`))}</div>
    <div class="sc-body">
      <div><p class="lead">${g.description.short}</p><div class="prose">${g.description.long.map((p) => raw(html`<p>${p}</p>`))}</div>
        <div class="stores">${g.stores.map((s, i) => raw(html`<a class="btn ${i ? '' : 'btn--amber'}" data-store href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || ''} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="btn">Coming soon</span>')}</div></div>
      <div>${g.features.length ? raw(html`<h3 class="type" style="font-family:var(--type);font-weight:400;margin-bottom:12px">Scenes to remember</h3><ul class="feat">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul>`) : ''}
        ${g.rating.count ? raw(html`<p style="margin-top:30px;text-align:center"><span style="font-family:var(--serif);font-style:italic;font-size:80px;color:var(--amber);line-height:1">${g.rating.average.toFixed(1)}</span><br><span class="amber">${starString(g.rating.average)}</span><br><span class="type">${compactNumber(g.rating.count)} player ratings</span></p>`) : ''}</div>
    </div>
    <section class="sc-sec"><h3>The trailer</h3><div class="media">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span>Trailer coming soon</span></div>`)}</div></section>
    ${g.media.screenshots.length ? raw(html`<section class="sc-sec"><h3>Stills</h3><div class="reel">${g.media.screenshots.map((s, i) => raw(html`<button type="button" data-shot="${i}" aria-label="Open still ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div></section>`) : ''}
    ${g.reviews.length ? raw(html`<section class="sc-sec"><h3>Critics &amp; players</h3><div class="quotes">${g.reviews.map((r) => raw(html`<figure class="quote">${typeof r.score === 'number' ? raw(html`<span class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</span>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite class="type">${r.author ? `${r.author} — ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}
    <section class="sc-sec"><h3>Technical details</h3><div class="dl">${gameFacts(g).map(([k, v]) => raw(html`<div><span class="type">${k}</span><b>${v}</b></div>`))}</div></section>
    <div class="pn"><button type="button" data-go="${prev.id}"><span class="type">← Previous reel</span><b>${prev.title}</b></button><button type="button" data-go="${next.id}"><span class="type">Next reel →</span><b>${next.title}</b></button></div>
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
    $('[data-modal-body]', nm).innerHTML = html`<span class="type">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--amber" href="#game/${g.id}" data-close>See ${g.title}</a></p>`) : ''}`;
    nm.showModal();
  });
}
