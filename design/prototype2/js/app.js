// Physics Playground: all three pages (home / games / game) are driven from here.

import { loadAll, loadGames, loadStudio, param, html, raw, formatDate, starString, storeLabel, trailerHtml, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer, onVisible } from '../../shared/js/motion.js';
import { setGameSeo } from '../../shared/js/seo.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindFilters, bindLightbox, bindDialog, bindEmailCopy, gameFacts, relatedGames, loadFailed, reveal } from '../../shared/js/kit.js';
import { createPlayground } from './physics.js';

const $ = (s, r = document) => r.querySelector(s);
const COLORS = ['#ff4d3d', '#ffc93c', '#2f5bff', '#19c39c', '#ff7ac6', '#a98bff', '#ff4d3d', '#ffc93c', '#19c39c'];
const page = document.body.dataset.page;

chrome();
({ home, games: gamesPage, game: gamePage }[page])?.();

// ---------------- chrome ----------------
function chrome() {
  const links = [['games.html', 'Games', 'games'], ['index.html#studio', 'Studio'], ['index.html#news', 'News'], ['index.html#contact', 'Contact']];
  $('[data-chrome="header"]').outerHTML = `<header class="site-header"><div class="wrap">
    <nav class="nav" aria-label="Main">
      <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">F</span>FewClicks</a>
      <ul class="nav-links">${links.map(([h, l, k]) => `<li><a href="${h}"${k === page ? ' aria-current="page"' : ''}>${l}</a></li>`).join('')}</ul>
      <button class="icon-btn" type="button" data-sound-toggle><span data-sound-icon></span></button>
      <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu" data-menu>☰</button>
    </nav>
    <div class="mobile-nav" id="mnav">${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
  </div></header>`;
  $('[data-chrome="footer"]').outerHTML = `<footer><div class="wrap foot">
    <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">F</span>FewClicks</a>
    <ul><li><a href="games.html">Games</a></li><li><a href="index.html#studio">Studio</a></li><li><a href="index.html#news">News</a></li><li><a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></li></ul>
    <span>© ${new Date().getFullYear()} FewClicks. Handle with care.</span>
  </div></footer>`;
  mountSoundToggle($('[data-sound-toggle]'));
  const mb = $('[data-menu]');
  mb.addEventListener('click', () => {
    const open = $('#mnav').classList.toggle('open');
    mb.setAttribute('aria-expanded', String(open));
    mb.textContent = open ? '✕' : '☰';
  });
  $('#mnav').addEventListener('click', (e) => { if (e.target.closest('a')) { $('#mnav').classList.remove('open'); mb.textContent = '☰'; } });
  mountPrototypeBadge(2, 'Physics Playground');
  document.addEventListener('pointerover', (e) => { const t = e.target.closest('a, button'); if (t && !t.contains(e.relatedTarget)) sfx.blip(); });
}

// ---------------- shared markup ----------------
function card(g, i = 0) {
  const badge = { released: ['', 'Out now'], 'coming-soon': ['soon', 'Soon'], 'in-development': ['dev', 'In dev'] }[g.status];
  return html`<a class="card" href="${g.url}" data-body data-game-card style="--c1:${g.theme.primary};--c2:${g.theme.secondary};--tilt:${i % 2 ? '1.5deg' : '-1.5deg'}">
    <span class="card-media"><img src="${g.media.cover}" alt="" width="1200" height="675" loading="lazy"><span class="card-badge ${badge[0]}">${badge[1]}</span></span>
    <span class="card-body">
      <span class="card-title">${g.media.icon ? raw(html`<img src="${g.media.icon}" alt="" width="40" height="40">`) : ''}<h3>${g.title}</h3></span>
      <p>${g.tagline}</p>
      <span class="tags">${g.categoryList.map((c) => raw(html`<span class="tag" style="--cc:${c.color}">${c.name}</span>`))}</span>
      <span class="card-meta"><span aria-label="Platforms: ${g.platformList.map((p) => p.label).join(', ')}">${[...new Set(g.platformList.map((p) => p.icon))].join(' ')}</span><span>${g.rating.count ? `★ ${g.rating.average.toFixed(1)}` : g.price}</span></span>
    </span>
  </a>`;
}

function letters(word, cls = '') {
  return [...word].map((ch, i) => `<span class="letter ${['#2f5bff', '#ff4d3d'].includes(COLORS[i % COLORS.length]) ? 'light' : ''} ${cls}" data-body style="--c:${COLORS[i % COLORS.length]}" aria-hidden="true">${ch}</span>`).join('');
}

function confetti(host, n = 26) {
  if (reducedMotion) return;
  const r = host.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'confetti';
    d.style.cssText = `left:${Math.random() * r.width}px;top:-20px;background:${COLORS[i % COLORS.length]};border-radius:${i % 3 ? '3px' : '50%'}`;
    host.appendChild(d);
    d.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(${r.height + 40}px) rotate(${Math.random() * 720}deg)` }], { duration: 1200 + Math.random() * 900, easing: 'cubic-bezier(.4,.1,.6,1)' }).onfinish = () => d.remove();
  }
}

// ---------------- home ----------------
async function home() {
  // Hero playground: letters + toys
  const hero = $('[data-hero]');
  const toys = [
    '<span class="toy toy--ball" data-body="circle" style="--c:#2f5bff" aria-hidden="true"></span>',
    '<span class="toy toy--pill" data-body style="--c:#ff7ac6" aria-hidden="true"></span>',
    '<span class="toy toy--block" data-body style="--c:#19c39c" aria-hidden="true"></span>',
    '<span class="toy toy--face" data-body="circle" style="--c:#ffc93c" aria-hidden="true">😜</span>',
    '<span class="toy toy--ball" data-body="circle" style="--c:#ff4d3d" aria-hidden="true"></span>',
    '<span class="toy toy--pill" data-body style="--c:#a98bff" aria-hidden="true"></span>',
  ];
  $('[data-letters]', hero).outerHTML = letters('FEWCLICKS') + toys.join('');
  const pg = createPlayground(hero, {
    stagger: 90,
    startX: (i, W, w) => {
      const n = 9;
      if (i < n) { const slot = W / (n + 1); return Math.min(W - w / 2, Math.max(w / 2, slot * (i + 1))); }
      return w / 2 + Math.random() * (W - w);
    },
    onGrab: () => sfx.boing(),
    onTap: () => sfx.boing(),
    tapBounce: true,
  });
  let hits = 0;
  if (!pg.static) {
    // thud sounds on hard impacts
    window.Matter.Events.on(pg.engine, 'collisionStart', (e) => {
      const hard = e.pairs.some((p) => Math.abs(p.bodyA.velocity.y - p.bodyB.velocity.y) > 6);
      if (hard && ++hits % 2) sfx.tick();
    });
  }
  const zg = $('[data-zerog]');
  zg.addEventListener('click', () => {
    const on = zg.getAttribute('aria-pressed') !== 'true';
    zg.setAttribute('aria-pressed', String(on));
    zg.textContent = on ? '🌍 Gravity' : '🚀 Zero-G';
    pg.zeroG(on);
    sfx.whoosh();
  });
  $('[data-shake]').addEventListener('click', () => { pg.shake(); sfx.boing(); });
  $('[data-tidy]').addEventListener('click', () => { pg.reset(); zg.setAttribute('aria-pressed', 'false'); zg.textContent = '🚀 Zero-G'; pg.zeroG(false); sfx.whoosh(); });
  if (pg.static) $('.hero-tools').hidden = true;
  const tiltBtn = $('[data-tilt]');
  if (coarsePointer && 'DeviceOrientationEvent' in window && !pg.static) {
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res !== 'granted') return;
        }
        pg.enableTilt();
        tiltBtn.textContent = '📱 Tilt on!';
        tiltBtn.setAttribute('aria-pressed', 'true');
      } catch { /* not allowed */ }
    });
  }

  const words = ['PICK UP', 'PLAY', 'FEW CLICKS', 'BIG FUN', 'GRAB', 'THROW', 'REPEAT'];
  $('[data-marquee]').innerHTML = [...words, ...words].map((w, i) => `<span>${w} <span style="color:${COLORS[i % 5]}">✦</span></span>`).join('');

  let data;
  try { data = await loadAll(); } catch (err) { loadFailed(err); return; }
  const { games, studio, team, news } = data;
  $('[data-tagline]').textContent = studio.tagline;

  // Featured toy box: cards fall in when you scroll to it
  const box = $('[data-featured]');
  const featured = games.filter((g) => g.featured);
  box.insertAdjacentHTML('beforeend', (featured.length ? featured : games).map(card).join(''));
  $('[data-all]').textContent = `All ${games.length} games →`;
  if (coarsePointer || innerWidth < 760) {
    box.classList.add('is-static');
  } else {
    onVisible(box, () => { createPlayground(box, { stagger: 160, onGrab: () => sfx.boing() }); sfx.whoosh(); }, { threshold: 0.25 });
  }

  // Studio
  $('[data-desc]').textContent = studio.description;
  $('[data-values]').innerHTML = studio.values.map((v, i) => html`<article class="value" data-reveal style="--c:${['#ffc93c', '#19c39c', '#ff7ac6'][i % 3]};--r:${[-2, 1.5, -1][i % 3]}deg"><div class="ico" aria-hidden="true">${v.icon}</div><h3>${v.title}</h3><p>${v.text}</p></article>`).join('');
  $('[data-stats]').innerHTML = studio.stats.map((s) => html`<div class="stat" data-reveal><b>${s.value}</b><span>${s.label}</span></div>`).join('');
  $('[data-team]').innerHTML = team.map((m, i) => html`<article class="member" data-team-member data-reveal style="--c:${m.color};--r:${i % 2 ? 2 : -2}deg">
    <div class="member-top"><img src="${m.avatar}" alt="" width="120" height="120" loading="lazy"></div>
    <div class="member-body"><h3>${m.name}</h3><span class="role">${m.role}</span><p>${m.bio}</p>
      ${Object.entries(m.stats).map(([k, v]) => raw(html`<span class="meter">${k}<i style="--v:${v}%"></i></span>`))}
    </div></article>`).join('');

  // News
  const nm = $('#news-modal');
  bindDialog(nm);
  $('[data-news]').innerHTML = news.slice(0, 4).map((p) => html`<button class="news-item" type="button" data-news-item data-id="${p.id}" data-reveal>
    <span class="tag" style="--cc:#fff;justify-self:start">${p.tag}</span><span class="date">${formatDate(p.date)}</span><h3>${p.title}</h3><p>${p.summary}</p></button>`).join('');
  $('[data-news]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = news.find((x) => x.id === b.dataset.id);
    const g = games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}<span class="tag" style="--cc:var(--sun);justify-self:start">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-title">${p.title}</h2>${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--red btn--sm" href="${g.url}">Open ${g.title} →</a></p>`) : ''}`;
    nm.showModal();
    sfx.boing();
  });

  // Contact
  const cc = $('[data-contact]');
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok, btn) => {
    btn.textContent = ok ? '✅ Copied!' : '❌ Copy failed';
    setTimeout(() => (btn.textContent = '📋 Copy'), 1800);
    if (ok) { sfx.success(); confetti(cc); }
  });
  if (studio.address) { const a = $('[data-address]'); a.textContent = studio.address; a.hidden = false; }
  reveal(document, reducedMotion);
}

// ---------------- games ----------------
async function gamesPage() {
  const head = $('[data-pagehead]');
  head.insertAdjacentHTML('beforeend', letters('GAMES'));
  createPlayground(head, { stagger: 80, tapBounce: true, onTap: () => sfx.boing(), startX: (i, W, w) => Math.min(W - w / 2, (W / 6) * (i + 1)) });

  let games, categories;
  try { ({ games, categories } = await loadGames()); } catch (err) { loadFailed(err); return; }
  $('[data-cats]').innerHTML = [{ id: 'all', name: 'All', color: '#141414' }, ...categories]
    .map((c) => html`<button class="chip" type="button" data-cat="${c.id}" style="--cc:${c.color}">${c.icon || '🎲'} ${c.name}</button>`).join('');
  const grid = $('[data-grid]');
  bindFilters({
    games, categories,
    render(list, state, src) {
      grid.innerHTML = list.map(card).join('');
      if (src && !reducedMotion) {
        grid.querySelectorAll('.card').forEach((el, i) => el.animate(
          [{ transform: 'translateY(-120px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(10px) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
          { duration: 500, delay: i * 60, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'backwards' }));
      }
    },
    onChange: () => sfx.boing(),
  });
}

// ---------------- game ----------------
async function gamePage() {
  const main = $('[data-game]');
  let games, studio;
  try { [{ games }, studio] = await Promise.all([loadGames(), loadStudio()]); } catch (err) { loadFailed(err); return; }
  const g = games.find((x) => x.id === param('id'));
  if (!g) {
    document.title = 'Game not found | FewClicks';
    main.innerHTML = html`<section class="not-found" data-not-found><div><div style="font-size:90px">🧸💥</div><h1>Oops! Toy not found</h1><p>That game must have rolled under the sofa.</p><p style="margin-top:20px"><a class="btn btn--red" href="games.html">Back to the toy box</a></p></div></section>`;
    return;
  }
  setGameSeo(g, studio);
  document.documentElement.style.setProperty('--c1', g.theme.primary);
  document.documentElement.style.setProperty('--c2', g.theme.secondary);
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist';
  const featColors = ['#ffc93c', '#19c39c', '#ff7ac6', '#a98bff', '#ff4d3d', '#2f5bff'];

  main.innerHTML = html`
  <section class="g-hero"><div class="wrap g-hero-grid">
    <div>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> / <a href="games.html">Games</a> / ${g.title}</nav>
      ${g.media.icon ? raw(html`<img class="g-icon" src="${g.media.icon}" alt="" width="96" height="96">`) : ''}
      <h1 class="g-title" data-game-title>${g.title}</h1>
      <p class="g-tagline">${g.tagline}</p>
      <div class="tags">${g.categoryList.map((c) => raw(html`<a class="tag" href="games.html?category=${c.id}" style="--cc:${c.color}">${c.icon} ${c.name}</a>`))}<span class="tag" style="--cc:#fff">${STATUS[g.status].label}</span></div>
      <div class="facts-line">
        ${g.rating.count ? raw(html`<span>★ ${g.rating.average.toFixed(1)} · ${g.rating.count.toLocaleString()} ratings</span>`) : ''}
        ${g.price ? raw(html`<span>${g.price}</span>`) : ''}
        <span>${g.platformList.map((p) => p.label).join(' · ')}</span>
      </div>
      <div class="stores">
        ${g.stores.map((s) => raw(html`<a class="btn btn--sun" href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || '🎮'} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}
        ${g.stores.length ? '' : raw('<span class="btn" aria-disabled="true">🔔 Coming soon</span>')}
        <a class="btn" href="#trailer">▶ Trailer</a>
      </div>
    </div>
    <div class="g-art"><img src="${g.media.hero}" alt="${g.title} artwork" width="1200" height="675"></div>
  </div></section>

  <section class="section"><div class="wrap cols">
    <div class="panel" data-reveal><h2>About the game</h2><div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div></div>
    <div class="panel" data-reveal><h2>Feature pile</h2>
      <div class="playground pile" data-pile>${(g.features.length ? g.features : [g.description.short]).map((f, i) => raw(html`<span class="feat" data-body style="--c:${featColors[i % featColors.length]}">✔ ${f}</span>`))}</div>
    </div>
  </div></section>

  <section class="section" id="trailer" style="padding-top:0"><div class="wrap">
    <div class="head"><div><span class="kicker">Watch</span><h2 class="title">Trailer</h2></div></div>
    <div class="trailer" data-reveal>${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="trailer-empty"><img src="${g.media.cover}" alt=""><span>Trailer coming soon!</span></div>`)}</div>
  </div></section>

  ${g.media.screenshots.length ? raw(html`<section class="section" style="padding-top:0"><div class="wrap">
    <div class="head"><div><span class="kicker">Look</span><h2 class="title">Screenshots</h2></div></div>
    <div class="shots">${g.media.screenshots.map((s, i) => raw(html`<button class="shot" type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div>
  </div></section>`) : ''}

  ${g.reviews.length ? raw(html`<section class="section" style="padding-top:0"><div class="wrap">
    <div class="head"><div><span class="kicker">Players say</span><h2 class="title">Reviews</h2></div></div>
    <div class="reviews">${g.reviews.map((r, i) => raw(html`<figure class="review" data-reveal style="--c:${featColors[i % featColors.length]}">${typeof r.score === 'number' ? raw(html`<div class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</div>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author}, ` : ''}${r.source}</cite></figcaption></figure>`))}</div>
  </div></section>`) : ''}

  <section class="section" style="padding-top:0"><div class="wrap cols">
    <div class="panel" data-reveal><h2>Game info</h2><table class="facts"><tbody>${gameFacts(g).map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}</tbody></table></div>
    <div class="panel" data-reveal><h2>More toys</h2><div style="display:grid;gap:18px">${relatedGames(g, games, 2).map((x) => raw(card(x).replace(' data-body', '')))}</div></div>
  </div></section>`;

  const pile = $('[data-pile]');
  onVisible(pile, () => createPlayground(pile, { stagger: 120, tapBounce: true, onGrab: () => sfx.boing(), onTap: () => sfx.boing() }), { threshold: 0.3 });
  bindLightbox($('#lightbox'), g, { root: main });
  reveal(main, reducedMotion);
}
