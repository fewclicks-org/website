// Console Home Screen: dashboard (home), Library (games) and Store page (game).

import { loadAll, loadGames, loadStudio, param, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, introSeen, markIntroSeen } from '../../shared/js/motion.js';
import { setGameSeo } from '../../shared/js/seo.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindFilters, bindLightbox, bindDialog, bindEmailCopy, gameFacts, relatedGames, loadFailed, stepCategory } from '../../shared/js/kit.js';
import { initNav } from './nav.js';

const $ = (s, r = document) => r.querySelector(s);
const page = document.body.dataset.page;
const app = $('#app');
let tabHandler = null;
let backHandler = () => { if (page !== 'home') history.length > 1 ? history.back() : (location.href = 'index.html'); };

chrome();
initNav({
  onMove: () => sfx.tick(),
  onTab: (d) => tabHandler?.(d),
  onBack: () => { const d = $('dialog[open]'); if (d) d.close(); else backHandler(); },
  onPad: (id) => { const el = $('[data-pad]'); if (el) el.textContent = id ? '🎮 Controller connected' : ''; if (id) toast('🎮', 'Controller connected. Use the D-pad and Ⓐ'); },
});
({ home, games: library, game: store }[page])?.();

// ---------------- chrome ----------------
function chrome() {
  app.insertAdjacentHTML('afterbegin', `<div class="ambient" aria-hidden="true"><img alt="" data-amb-img hidden><div class="grain"></div></div>
  <header class="topbar">
    <a class="user" href="index.html" data-nav aria-label="FewClicks home"><span class="av">F</span><span>FewClicks</span></a>
    <nav class="top-nav" aria-label="Main">
      <a href="index.html" data-nav ${page === 'home' ? 'aria-current="page"' : ''}>Home</a>
      <a href="games.html" data-nav ${page === 'games' ? 'aria-current="page"' : ''}>Library</a>
      <a href="index.html#news" data-nav>News</a>
      <a href="index.html#studio" data-nav>Studio</a>
    </nav>
    <div class="status">
      <span class="batt" aria-hidden="true"><i></i></span>
      <button class="sys-btn" type="button" data-nav data-sound-toggle><span data-sound-icon></span></button>
      <span class="clock" data-clock aria-label="Current time"></span>
    </div>
  </header>`);
  app.insertAdjacentHTML('beforeend', `<footer class="foot"><span>© ${new Date().getFullYear()} FewClicks · FewClicks OS v1.0</span><span><a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></span></footer>
  <div class="hintbar" aria-hidden="true"><span class="pad-status" data-pad></span><span><b class="kbd sq">←→</b> Move</span><span><b class="kbd">A</b> Select</span><span><b class="kbd">B</b> Back</span>${page === 'games' ? '<span><b class="kbd sq">Q</b><b class="kbd sq">E</b> Tabs</span>' : ''}</div>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`);
  mountSoundToggle($('[data-sound-toggle]'));
  const clock = $('[data-clock]');
  const tick = () => (clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  tick();
  setInterval(tick, 15000);
  mountPrototypeBadge(3, 'Console Home Screen');
}

let toastT;
function toast(icon, text) {
  const t = $('[data-toast]');
  t.innerHTML = html`<span style="font-size:22px">${icon}</span><span>${text}</span>`;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

function ambient(g) {
  document.documentElement.style.setProperty('--a1', g ? g.theme.primary : '#4cc9ff');
  document.documentElement.style.setProperty('--a2', g ? g.theme.secondary : '#7b5cff');
  document.documentElement.style.setProperty('--accent', g ? g.theme.primary : '#4cc9ff');
  const img = $('[data-amb-img]');
  if (g) { img.src = g.media.cover; img.hidden = false; } else img.hidden = true;
}

function boot(onDone) {
  if (reducedMotion || introSeen('p3')) { onDone(); return; }
  const el = document.createElement('div');
  el.className = 'boot';
  el.innerHTML = `<div><svg class="boot-logo" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring" cx="60" cy="60" r="54" fill="none" stroke="#fff" stroke-width="4"/><path class="cursor" d="M48 34 L48 86 L60 74 L69 92 L77 88 L68 71 L85 71Z" fill="#fff"/></svg>
    <div class="boot-name">FEW<b>CLICKS</b></div><div class="boot-press">Press any key</div></div>
    <button class="btn btn--sm boot-skip" type="button" data-skip-intro>Skip ⏭</button>`;
  document.body.appendChild(el);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    markIntroSeen('p3');
    sfx.success();
    el.classList.add('gone');
    setTimeout(() => el.remove(), 700);
    window.removeEventListener('keydown', finish);
    onDone();
  };
  setTimeout(() => sfx.whoosh(), 300);
  el.addEventListener('click', finish);
  setTimeout(() => window.addEventListener('keydown', finish), 300);
  window.addEventListener('gamepadconnected', finish, { once: true });
  setTimeout(finish, 6000);
}

const badge = (g) => (g.status === 'released' ? '' : `<span class="badge">${STATUS[g.status].short}</span>`);

// ---------------- home: dashboard ----------------
async function home() {
  const main = $('#main');
  let data;
  try { data = await loadAll(); } catch (err) { loadFailed(err); return; }
  const { games, studio, team, news } = data;
  const ordered = [...games].sort((a, b) => (b.featured - a.featured) || a.order - b.order);

  main.innerHTML = html`
  <section class="dash" aria-label="Game shelf">
    <div class="spotlight" data-spot aria-live="polite"></div>
    <div class="tiles" data-featured role="list">
      ${ordered.map((g, i) => raw(html`<a class="tile" role="listitem" href="${g.url}" data-nav data-game-card data-i="${i}" style="--c1:${g.theme.primary}" aria-label="${g.title}"><span class="label" aria-hidden="true">${g.title}</span><img src="${g.media.icon || g.media.cover}" alt="" width="190" height="190">${raw(badge(g))}</a>`))}
      <a class="tile sys" role="listitem" href="games.html" data-nav aria-label="Open library"><span aria-hidden="true">▦</span><span class="label">Library</span></a>
      <a class="tile sys" role="listitem" href="#news" data-nav aria-label="News"><span aria-hidden="true">📰</span><span class="label">News</span></a>
      <a class="tile sys" role="listitem" href="#studio" data-nav aria-label="Studio"><span aria-hidden="true">👥</span><span class="label">Friends</span></a>
      <a class="tile sys" role="listitem" href="#contact" data-nav aria-label="Messages"><span aria-hidden="true">✉️</span><span class="label">Messages</span></a>
    </div>
  </section>

  <section class="section" id="news" aria-labelledby="news-t">
    <h2 class="sec-title" id="news-t"><span class="ico" aria-hidden="true">📰</span>What's new</h2>
    <div class="news-row">${news.map((p) => raw(html`<button class="glass news-card" type="button" data-nav data-news-item data-id="${p.id}">
      <span class="thumb">${p.image ? raw(html`<img src="${p.image}" alt="" loading="lazy">`) : '✨'}</span>
      <span class="body"><span class="meta">${p.tag} · ${formatDate(p.date)}</span><h3>${p.title}</h3><p>${p.summary}</p></span></button>`))}</div>
  </section>

  <section class="section" id="studio" aria-labelledby="studio-t">
    <h2 class="sec-title" id="studio-t"><span class="ico" aria-hidden="true">🏆</span>Studio profile</h2>
    <div class="studio-grid">
      <div class="glass about"><h3 style="font-size:26px">${studio.name}</h3><p>${studio.description}</p>
        <div class="stat-row">${studio.stats.map((s) => raw(html`<div class="stat"><b>${s.value}</b><span>${s.label}</span></div>`))}</div></div>
      <div class="trophies">${studio.values.map((v) => raw(html`<div class="glass trophy"><span class="t-ico" aria-hidden="true">${v.icon}</span><div><small>🏆 Trophy unlocked</small><b>${v.title}</b><small>${v.text}</small></div></div>`))}</div>
    </div>
    <h2 class="sec-title" style="margin-top:48px"><span class="ico" aria-hidden="true">👥</span>Friends online <span style="color:var(--muted);font-weight:400;font-size:18px">${team.length}</span></h2>
    <div class="friends">${team.map((m) => raw(html`<article class="glass friend" data-team-member style="--mc:${m.color}">
      <span class="pic"><img src="${m.avatar}" alt="" width="96" height="96" loading="lazy"></span>
      <h3>${m.name}</h3><span class="role">${m.role}</span><span class="now">● Online · making games</span>
      <details data-nav><summary>View profile</summary><p>${m.bio}</p>${m.funFact ? raw(html`<p>💡 ${m.funFact}</p>`) : ''}
        ${Object.entries(m.stats).map(([k, v]) => raw(html`<span class="lvl">${k}<i style="--v:${v}%"></i><b>${v}</b></span>`))}</details>
    </article>`))}</div>
  </section>

  <section class="section" id="contact" aria-labelledby="contact-t">
    <h2 class="sec-title" id="contact-t"><span class="ico" aria-hidden="true">✉️</span>Messages</h2>
    <div class="glass message">
      <span class="env" aria-hidden="true">💌</span>
      <div style="display:grid;gap:10px">
        <h3>Send a message to FewClicks</h3>
        <a class="mail" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
        <div class="actions"><a class="btn btn--primary" data-nav data-email-link href="mailto:admin@fewclicks.org">✉️ Compose email</a><button class="btn" type="button" data-nav data-copy-email>📋 Copy address</button></div>
        ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}
      </div>
    </div>
  </section>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="sys-btn modal-x" type="button" data-close data-nav aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>`;

  const spot = $('[data-spot]');
  const show = (g) => {
    ambient(g);
    spot.innerHTML = html`<div><h1>${g.title}</h1><p class="tag">${g.tagline || g.description.short}</p>
      <div class="chips">${g.categoryList.map((c) => raw(html`<span class="chip">${c.icon} ${c.name}</span>`))}<span class="chip">${STATUS[g.status].label}</span>${g.rating.count ? raw(html`<span class="chip">★ ${g.rating.average.toFixed(1)}</span>`) : ''}</div></div>
      <div class="actions"><a class="btn btn--primary" href="${g.url}" data-nav>▶ Start</a><a class="btn" href="${g.url}#media" data-nav>Trailer</a></div>`;
  };
  const tiles = [...main.querySelectorAll('[data-game-card]')];
  tiles.forEach((t) => {
    const g = ordered[Number(t.dataset.i)];
    const act = () => { tiles.forEach((x) => x.classList.remove('is-focus')); t.classList.add('is-focus'); show(g); };
    t.addEventListener('focus', act);
    t.addEventListener('mouseenter', () => { act(); sfx.tick(); });
  });
  show(ordered[0]);
  tiles[0]?.classList.add('is-focus');

  const nm = $('#news-modal');
  bindDialog(nm);
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = news.find((x) => x.id === b.dataset.id);
    const g = games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}<span class="chip" style="justify-self:start">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--primary" data-nav href="${g.url}">Open ${g.title}</a></p>`) : ''}`;
    nm.showModal();
    sfx.boing();
  });
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok) => { toast(ok ? '📋' : '⚠️', ok ? 'Email address copied' : 'Copy failed'); if (ok) sfx.success(); });

  boot(() => { if (!location.hash) tiles[0]?.focus({ preventScroll: true }); });
}

// ---------------- games: library ----------------
async function library() {
  const main = $('#main');
  let games, categories;
  try { ({ games, categories } = await loadGames()); } catch (err) { loadFailed(err); return; }
  main.innerHTML = html`
  <section class="lib-head">
    <h1>Library <span style="color:var(--muted);font-weight:400">· ${games.length} games</span></h1>
    <div class="tabs" role="group" aria-label="Category">
      <span class="kbd sq" aria-hidden="true" title="Previous tab (Q / LB)">LB</span>
      ${[{ id: 'all', name: 'All', icon: '▦' }, ...categories].map((c) => raw(html`<button class="tab" type="button" data-nav data-cat="${c.id}">${c.icon} ${c.name}</button>`))}
      <span class="kbd sq" aria-hidden="true" title="Next tab (E / RB)">RB</span>
    </div>
    <div class="lib-tools">
      <label class="sr-only" for="q">Search</label><input id="q" type="search" placeholder="Search library…" data-q data-nav autocomplete="off">
      <div class="seg" role="group" aria-label="Platform">${[['all', 'All'], ['mobile', 'Mobile'], ['pc', 'PC'], ['console', 'Console']].map(([k, l]) => raw(html`<button type="button" data-nav data-platform="${k}">${l}</button>`))}</div>
      <label class="sr-only" for="sort">Sort</label><select id="sort" data-sort data-nav><option value="featured">Sort: Featured</option><option value="newest">Sort: Newest</option><option value="rating">Sort: Top rated</option><option value="az">Sort: A–Z</option></select>
    </div>
  </section>
  <p class="sr-only" aria-live="polite" data-status></p>
  <div class="lib-grid" data-grid></div>
  <div class="empty" data-empty hidden><div style="font-size:54px">🕹️</div><h2>Nothing in this shelf</h2><p>Try a different tab or search.</p><p style="margin-top:18px"><button class="btn" type="button" data-nav data-reset>Reset</button></p></div>`;
  ambient(null);
  const grid = $('[data-grid]');
  const f = bindFilters({
    games, categories,
    render(list, state, src) {
      grid.innerHTML = list.map((g) => html`<a class="lib-tile" href="${g.url}" data-nav data-game-card style="--c1:${g.theme.primary}">
        <span class="art"><img src="${g.media.cover}" alt="" loading="lazy" width="1200" height="675">${raw(badge(g))}</span>
        <span class="row">${g.media.icon ? raw(html`<img src="${g.media.icon}" alt="" width="40" height="40">`) : ''}<span><h3>${g.title}</h3><small>${g.categoryList.map((c) => c.name).join(' · ')} · ${g.platformList.map((p) => p.icon).filter((v, i, a) => a.indexOf(v) === i).join(' ')}</small></span></span></a>`).join('');
      grid.querySelectorAll('.lib-tile').forEach((t, i) => {
        const g = list[i];
        t.addEventListener('focus', () => ambient(g));
        t.addEventListener('mouseenter', () => ambient(g));
      });
      if (src && !reducedMotion) grid.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
      if (src) sfx.tick();
      const active = document.querySelector(`[data-cat="${state.category}"]`);
      active?.scrollIntoView({ inline: 'center', block: 'nearest' });
    },
  });
  tabHandler = (d) => { f.set({ category: stepCategory(f.state, categories, d) }); sfx.click(); document.querySelector(`[data-cat="${f.state.category}"]`)?.focus(); };
  backHandler = () => (location.href = 'index.html');
}

// ---------------- game: store page ----------------
async function store() {
  const main = $('#main');
  let games, studio;
  try { [{ games }, studio] = await Promise.all([loadGames(), loadStudio()]); } catch (err) { loadFailed(err); return; }
  const g = games.find((x) => x.id === param('id'));
  if (!g) {
    document.title = 'Game not found | FewClicks';
    ambient(null);
    main.innerHTML = html`<section class="not-found" data-not-found><div><p class="err">ERROR CODE FC-404</p><h1>This game couldn't be found.</h1><a class="btn btn--primary" href="games.html" data-nav>Go to Library</a></div></section>`;
    $('[data-nav]', main)?.focus();
    return;
  }
  setGameSeo(g, studio);
  ambient(g);
  const verb = g.status === 'released' ? 'Get on' : 'Wishlist on';
  main.innerHTML = html`
  <section class="store-hero"><div class="store-grid">
    <div class="store-art"><img src="${g.media.hero}" alt="${g.title} artwork" width="1200" height="675"></div>
    <div>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html" data-nav>Home</a> › <a href="games.html" data-nav>Library</a> › ${g.title}</nav>
      <h1 class="store-title" data-game-title>${g.title}</h1>
      <p class="pub">FewClicks · ${g.categoryList.map((c) => c.name).join(', ')} · ${formatDate(g.releaseDate)}</p>
      <div class="price-row">
        ${g.price ? raw(html`<span class="price">${g.price}</span>`) : ''}
        ${g.rating.count ? raw(html`<span class="rating" aria-label="${g.rating.average} out of 5">${starString(g.rating.average)} <span>${g.rating.average.toFixed(1)} · ${compactNumber(g.rating.count)}</span></span>`) : ''}
        <span class="chip">${STATUS[g.status].label}</span>
      </div>
      <p class="tag" style="color:var(--muted);font-size:19px;margin-bottom:20px">${g.tagline}</p>
      <div class="actions">
        ${g.stores.map((s, i) => raw(html`<a class="btn ${i ? '' : 'btn--primary'}" data-nav href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || '🎮'} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}
        ${g.stores.length ? '' : raw('<span class="btn" aria-disabled="true">🔔 Coming soon</span>')}
      </div>
      <div class="chips" style="margin-top:18px">${g.platformList.map((p) => raw(html`<span class="chip">${p.icon} ${p.label}</span>`))}</div>
    </div>
  </div></section>
  <nav class="store-tabs" aria-label="Sections"><a href="#overview" data-nav>Overview</a><a href="#media" data-nav>Media</a>${g.reviews.length ? raw('<a href="#reviews" data-nav>Reviews</a>') : ''}<a href="#details" data-nav>Details</a><a href="#more" data-nav>More like this</a></nav>

  <section class="section" id="overview"><div class="two">
    <div class="glass pad"><h2>Overview</h2><div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div></div>
    ${g.features.length ? raw(html`<div class="glass pad"><h2>Highlights</h2><ul class="feats">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
  </div></section>

  <section class="section" id="media" style="padding-top:0">
    <h2 class="sec-title"><span class="ico" aria-hidden="true">🎬</span>Media</h2>
    <div class="media-main">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="media-empty"><img src="${g.media.cover}" alt=""><p>▶ Trailer coming soon</p></div>`)}</div>
    ${g.media.screenshots.length ? raw(html`<div class="thumbs">${g.media.screenshots.map((s, i) => raw(html`<button class="thumb" type="button" data-nav data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div>`) : ''}
  </section>

  ${g.reviews.length ? raw(html`<section class="section" id="reviews" style="padding-top:0"><h2 class="sec-title"><span class="ico" aria-hidden="true">💬</span>Reviews</h2>
    <div class="reviews">${g.reviews.map((r) => raw(html`<figure class="glass review">${typeof r.score === 'number' ? raw(html`<div class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</div>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author} · ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}

  <section class="section" id="details" style="padding-top:0"><div class="two">
    <div class="glass pad"><h2>Details</h2><table class="details"><tbody>${gameFacts(g).map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}</tbody></table></div>
    <div class="glass pad" id="more"><h2>More like this</h2><div style="display:grid;gap:12px">${relatedGames(g, games, 3).map((x) => raw(html`<a class="lib-tile" href="${x.url}" data-nav style="grid-template-columns:120px 1fr;align-items:center"><span class="art"><img src="${x.media.cover}" alt="" loading="lazy"></span><span><h3>${x.title}</h3><small>${x.tagline}</small></span></a>`))}</div></div>
  </div></section>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn btn--sm" type="button" data-nav data-lb-prev>← Prev</button><button class="btn btn--sm btn--primary" type="button" data-nav data-lb-close>Close</button><button class="btn btn--sm" type="button" data-nav data-lb-next>Next →</button></nav></dialog>`;
  bindLightbox($('#lightbox'), g, { root: main });
  $('.actions [data-nav]', main)?.focus({ preventScroll: true });
  main.querySelectorAll('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast('🛒', 'Store page coming soon!'); sfx.coin(); }));
}
