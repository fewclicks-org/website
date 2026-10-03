// Sticker Scrapbook: a hand-made notebook. Stickers can be peeled and dragged (positions are remembered).

import { loadAll, loadGames, loadStudio, param, html, raw, formatDate, starString, storeLabel, trailerHtml, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, introSeen, markIntroSeen } from '../../shared/js/motion.js';
import { setGameSeo } from '../../shared/js/seo.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindFilters, bindLightbox, bindDialog, bindEmailCopy, gameFacts, relatedGames, loadFailed, reveal } from '../../shared/js/kit.js';

const $ = (s, r = document) => r.querySelector(s);
const page = document.body.dataset.page;
const main = $('#main');
const TAPES = ['', 'p', 'b', 'g'];
const NOTE_COLORS = ['#ffe066', '#ffb3cf', '#9fd3ff', '#b7f0a8'];
const rot = (i, amp = 3) => `${(((i * 37) % 7) - 3) * (amp / 3)}deg`;

// ---------------- chrome ----------------
const book = document.createElement('div');
book.className = 'book';
main.replaceWith(book);
book.innerHTML = `<header class="top">
    <a class="brand" href="index.html">Few<span>Clicks</span> ✎</a>
    <nav aria-label="Main">
      <a href="games.html"${page !== 'home' ? ' aria-current="page"' : ''}>games</a>
      <a href="index.html#studio">studio</a><a href="index.html#news">news</a><a href="index.html#contact">say hi</a>
    </nav>
    <button class="snd" type="button" data-sound-toggle><span data-sound-icon></span></button>
  </header>`;
book.appendChild(main);
book.insertAdjacentHTML('beforeend', `<footer class="foot"><span>© ${new Date().getFullYear()} FewClicks · glued together with love</span><a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></footer>`);
mountSoundToggle($('[data-sound-toggle]'), { on: '🔊', off: '🔇' });
mountPrototypeBadge(5, 'Sticker Scrapbook');
document.addEventListener('pointerover', (e) => { const t = e.target.closest('a, button'); if (t && !t.contains(e.relatedTarget)) sfx.blip(); });

({ home, games: gamesPage, game: gamePage }[page])?.();

// ---------------- doodles ----------------
const DOODLES = {
  underline: '<svg class="doodle draw" viewBox="0 0 420 30" aria-hidden="true" style="--len:520"><path d="M6 18 C 80 6, 160 26, 240 14 S 380 8, 414 16" stroke="#ef5b5b" stroke-width="5"/></svg>',
  arrow: '<svg class="doodle draw" viewBox="0 0 90 60" width="70" aria-hidden="true" style="--len:220"><path d="M6 50 C 26 10, 56 6, 82 20"/><path d="M70 10 L84 20 L70 30"/></svg>',
  star: '<svg class="doodle draw" viewBox="0 0 60 60" width="44" aria-hidden="true" style="--len:260"><path d="M30 4 L37 23 L57 24 L41 36 L47 56 L30 44 L13 56 L19 36 L3 24 L23 23 Z"/></svg>',
  circle: '<svg class="doodle draw" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true" style="--len:600"><path d="M100 8 C 30 6, 4 40, 14 66 C 30 98, 170 98, 190 60 C 200 30, 160 6, 92 12" stroke="#ef5b5b"/></svg>',
  swirl: '<svg class="doodle draw" viewBox="0 0 80 80" width="60" aria-hidden="true" style="--len:400"><path d="M40 40 m0 -4 a4 4 0 1 1 -4 4 a10 10 0 1 1 10 10 a18 18 0 1 1 -18 -18 a26 26 0 1 1 26 26"/></svg>',
};

// ---------------- draggable stickers ----------------
function stickers(layer, list, key) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(`fewclicks:p5:${key}`) || '{}'); } catch { /* ignore */ }
  layer.innerHTML = list.map((s, i) => {
    const p = saved[i] || s.pos;
    return `<button class="sticker" type="button" data-i="${i}" style="left:${p[0]}%;top:${p[1]}%;--r:${s.r || 0}deg" aria-label="Sticker: ${s.label}. Drag to move, or use arrow keys">${s.img ? `<img src="${s.img}" alt="" width="64" height="64">` : s.emoji}</button>`;
  }).join('');
  const store = () => {
    const out = {};
    layer.querySelectorAll('.sticker').forEach((el) => (out[el.dataset.i] = [parseFloat(el.style.left), parseFloat(el.style.top)]));
    try { localStorage.setItem(`fewclicks:p5:${key}`, JSON.stringify(out)); } catch { /* ignore */ }
  };
  layer.querySelectorAll('.sticker').forEach((el) => {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = layer.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, l: parseFloat(el.style.left) / 100 * r.width, t: parseFloat(el.style.top) / 100 * r.height, w: r.width, h: r.height };
      el.classList.add('lifted');
      sfx.pop(1.3);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const l = Math.max(0, Math.min(start.w - el.offsetWidth, start.l + e.clientX - start.x));
      const t = Math.max(0, Math.min(start.h - el.offsetHeight, start.t + e.clientY - start.y));
      el.style.left = `${(l / start.w) * 100}%`;
      el.style.top = `${(t / start.h) * 100}%`;
    });
    const drop = () => { if (!start) return; start = null; el.classList.remove('lifted'); sfx.tick(); store(); };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
    el.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
      if (!d) return;
      e.preventDefault();
      el.style.left = `${Math.max(0, Math.min(92, parseFloat(el.style.left) + d[0]))}%`;
      el.style.top = `${Math.max(0, Math.min(92, parseFloat(el.style.top) + d[1]))}%`;
      store();
    });
  });
}

function polaroid(g, i) {
  const stamp = g.status === 'released' ? '' : `<span class="stamp">${STATUS[g.status].short}!</span>`;
  return html`<a class="polaroid" href="${g.url}" data-game-card style="--c1:${g.theme.primary};--r:${rot(i)}">
    <span class="tape ${TAPES[i % 4]}" aria-hidden="true"></span>
    <span class="ph"><img src="${g.media.cover}" alt="" loading="lazy" width="1200" height="675"></span>${raw(stamp)}
    <span class="cap">${g.title}</span>
  </a>`;
}

function drawIn(root = document) {
  const els = root.querySelectorAll('.draw');
  if (reducedMotion || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.4 });
  els.forEach((e) => io.observe(e));
}

// ---------------- home ----------------
async function home() {
  coverIntro();
  let data;
  try { data = await loadAll(); } catch (err) { loadFailed(err); return; }
  const { games, studio, team, news } = data;
  const featured = games.filter((g) => g.featured);
  const hero = featured[0] || games[0];

  main.innerHTML = html`
  <section class="hero">
    <div class="sticker-layer" data-stickers></div>
    <div>
      <p class="hand" style="font-size:26px;color:var(--pencil)">Dear diary, today we made…</p>
      <h1>Few<span class="r">Clicks</span></h1>
      ${raw(DOODLES.underline.replace('class="doodle draw"', 'class="doodle draw under"'))}
      <p class="tag">${studio.tagline} ${raw(DOODLES.star)}</p>
      <div class="cta"><a class="btn btn--y" href="games.html">✎ Flip to our games</a><a class="btn" href="#studio">Meet the gang</a></div>
    </div>
    <a class="polaroid" href="${hero.url}" style="--r:3deg;--c1:${hero.theme.primary}"><span class="tape p" aria-hidden="true"></span><span class="ph"><img src="${hero.media.cover}" alt="${hero.title}" width="1200" height="675"></span><span class="cap">our newest baby: ${hero.title} ♥</span></a>
    <p class="note">${raw(DOODLES.arrow)} psst… drag the stickers around!</p>
  </section>

  <section class="section" id="games">
    <h2 class="sec-title">Our games</h2>
    <p class="sec-note">(the ones we're proudest of ${raw(DOODLES.swirl)})</p>
    <div class="photos" data-featured>${(featured.length ? featured : games).map((g, i) => raw(polaroid(g, i)))}</div>
    <p style="margin-top:40px;text-align:center"><a class="btn btn--b" href="games.html">See all ${games.length} games →</a></p>
  </section>

  <section class="section" id="studio">
    <h2 class="sec-title">About us</h2>
    <p class="sec-note">${studio.description}</p>
    <div class="notes">${studio.values.map((v, i) => raw(html`<article class="sticky" data-reveal style="--c:${NOTE_COLORS[i % 4]};--r:${rot(i + 1, 4)}"><span class="tape ${TAPES[(i + 2) % 4]}" aria-hidden="true"></span><span class="ico" aria-hidden="true">${v.icon}</span><h3>${v.title}</h3><p>${v.text}</p></article>`))}</div>
    <div class="tallies">${studio.stats.map((s) => raw(html`<div class="tally">${raw(DOODLES.circle)}<b>${s.value}</b>${s.label}</div>`))}</div>
  </section>

  <section class="section" id="team">
    <h2 class="sec-title">The gang</h2>
    <p class="sec-note">a tiny team with very big snack budgets</p>
    <div class="team">${team.map((m, i) => raw(html`<article class="idcard" data-team-member style="--r:${rot(i + 3)};--mc:${m.color}"><span class="clip" aria-hidden="true"></span>
      <div class="frame"><img src="${m.avatar}" alt="" width="130" height="130" loading="lazy"></div>
      <h3>${m.name}</h3><div class="role">${m.role}</div><p>${m.bio}</p>${m.funFact ? raw(html`<p class="fact">★ ${m.funFact}</p>`) : ''}</article>`))}</div>
  </section>

  <section class="section" id="news">
    <h2 class="sec-title">Clippings</h2>
    <p class="sec-note">news from the studio (cut out &amp; kept forever)</p>
    <div class="clips">${news.map((p, i) => raw(html`<button class="clipping" type="button" data-news-item data-id="${p.id}" style="--r:${rot(i + 2, 2)}">
      <span class="paper">The FewClicks Times · ${formatDate(p.date)}</span>${p.image ? raw(html`<img src="${p.image}" alt="" loading="lazy">`) : ''}<h3>${p.title}</h3><p>${p.summary}</p></button>`))}</div>
  </section>

  <section class="section" id="contact">
    <h2 class="sec-title">Write to us!</h2>
    <p class="sec-note">click the envelope ✉</p>
    <div class="envelope-wrap">
      <button class="envelope" type="button" data-envelope aria-expanded="false" aria-label="Open the envelope">
        <span class="env-back"></span>
        <span class="letter"><span class="hi">Hi FewClicks!</span><span class="mail" data-email-link="text">admin@fewclicks.org</span><span class="hand" style="font-size:22px;color:var(--pencil)">we answer every letter ♥</span></span>
        <span class="env-front"></span><span class="env-flap"></span><span class="env-seal" aria-hidden="true">FC</span>
      </button>
    </div>
    <div class="contact-actions"><a class="btn btn--p" data-email-link href="mailto:admin@fewclicks.org">✉ Send an email</a><button class="btn" type="button" data-copy-email>📋 Copy address</button>${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}</div>
  </section>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="btn btn--sm btn--y modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>`;

  stickers($('[data-stickers]'), [
    { emoji: '⭐', label: 'star', pos: [44, 4], r: -10 },
    { emoji: '🎮', label: 'controller', pos: [88, 70], r: 8 },
    { emoji: '🍬', label: 'candy', pos: [2, 76], r: -6 },
    ...games.slice(0, 4).map((g, i) => ({ img: g.media.icon, label: g.title, pos: [[52, 82], [92, 6], [36, 62], [70, 88]][i], r: [6, -8, 4, -4][i] })),
    { emoji: '💖', label: 'heart', pos: [60, 2], r: 12 },
  ], 'home');

  const env = $('[data-envelope]');
  env.addEventListener('click', () => {
    const open = env.classList.toggle('open');
    env.setAttribute('aria-expanded', String(open));
    env.setAttribute('aria-label', open ? 'Close the envelope' : 'Open the envelope');
    open ? sfx.whoosh() : sfx.tick();
  });
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok, btn) => {
    btn.textContent = ok ? '✔ copied!' : 'copy failed :(';
    if (ok) { sfx.success(); env.classList.add('open'); }
    setTimeout(() => (btn.textContent = '📋 Copy address'), 1800);
  });

  const nm = $('#news-modal');
  bindDialog(nm);
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = news.find((x) => x.id === b.dataset.id);
    const g = games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`<span class="hand" style="font-size:22px;color:var(--pencil)">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t">${p.title}</h2>${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--y btn--sm" href="${g.url}">Open ${g.title} →</a></p>`) : ''}`;
    nm.showModal();
    sfx.whoosh();
  });
  drawIn();
  reveal(document, reducedMotion);
}

function coverIntro() {
  if (reducedMotion || introSeen('p5')) return;
  const stage = document.createElement('div');
  stage.className = 'cover-stage';
  stage.innerHTML = `<div class="cover" role="dialog" aria-modal="true" aria-label="Notebook cover">
    <span class="st" style="left:8%;top:6%;transform:rotate(-12deg)" aria-hidden="true">⭐</span><span class="st" style="right:10%;top:12%;transform:rotate(10deg)" aria-hidden="true">🎮</span>
    <span class="st" style="left:12%;bottom:12%;transform:rotate(8deg)" aria-hidden="true">🍬</span><span class="st" style="right:8%;bottom:8%" aria-hidden="true">💖</span>
    <div class="label"><h1>FewClicks</h1><p>our big book of games</p><span class="owner">property of: the studio</span><br>
      <button class="btn btn--y open-btn" type="button" data-skip-intro>📖 Open the notebook</button></div></div>`;
  document.body.appendChild(stage);
  const btn = $('[data-skip-intro]', stage);
  btn.focus();
  btn.addEventListener('click', () => {
    markIntroSeen('p5');
    sfx.whoosh();
    $('.cover', stage).classList.add('open');
    stage.classList.add('fade');
    setTimeout(() => stage.remove(), 1400);
  });
}

// ---------------- games ----------------
async function gamesPage() {
  let games, categories;
  try { ({ games, categories } = await loadGames()); } catch (err) { loadFailed(err); return; }
  main.innerHTML = html`<section class="section games-layout" style="padding-top:20px">
    <div class="sticker-layer" data-stickers></div>
    <h1 class="sec-title" style="font-size:clamp(46px,8vw,90px)">All our games</h1>
    <p class="sec-note">${games.length} games and counting ${raw(DOODLES.star)}</p>
    <div class="idx-tabs" role="group" aria-label="Category">${[{ id: 'all', name: 'Everything', icon: '📚' }, ...categories].map((c, i) => raw(html`<button class="idx-tab" type="button" data-cat="${c.id}" style="--cc:${c.id === 'all' ? '#fff' : NOTE_COLORS[i % 4]}">${c.icon} ${c.name}</button>`))}</div>
    <div class="search-row" role="search">
      <label class="sr-only" for="q">Search</label><input id="q" type="search" placeholder="search for a game…" data-q autocomplete="off">
      <div class="plat" role="group" aria-label="Platform">${[['all', 'any'], ['mobile', '📱 phone'], ['pc', '💻 pc'], ['console', '🎮 console']].map(([k, l]) => raw(html`<button type="button" data-platform="${k}">${l}</button>`))}</div>
      <label class="sr-only" for="sort">Sort</label><select id="sort" data-sort><option value="featured">favourites first</option><option value="newest">newest</option><option value="rating">best rated</option><option value="az">a → z</option></select>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="photos" data-grid></div>
    <div class="empty" data-empty hidden>nothing on this page… ${raw(DOODLES.swirl)}<br><button class="btn btn--y" type="button" data-reset>start over</button></div>
  </section>`;
  stickers($('[data-stickers]'), [{ emoji: '📌', label: 'pin', pos: [86, 0], r: 10 }, { emoji: '🌈', label: 'rainbow', pos: [70, 4], r: -8 }], 'games');
  const grid = $('[data-grid]');
  bindFilters({
    games, categories,
    render(list, state, src) {
      grid.innerHTML = list.map((g, i) => polaroid(g, i)).join('');
      if (src && !reducedMotion) grid.querySelectorAll('.polaroid').forEach((p, i) => p.animate([{ transform: 'translateY(-40px) rotate(-12deg)', opacity: 0 }, { transform: `rotate(${rot(i)})`, opacity: 1 }], { duration: 450, delay: i * 50, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'backwards' }));
    },
    onChange: () => sfx.whoosh(),
  });
  drawIn();
}

// ---------------- game ----------------
async function gamePage() {
  let games, studio;
  try { [{ games }, studio] = await Promise.all([loadGames(), loadStudio()]); } catch (err) { loadFailed(err); return; }
  const g = games.find((x) => x.id === param('id'));
  if (!g) {
    document.title = 'Game not found | FewClicks';
    main.innerHTML = html`<section class="not-found" data-not-found><div style="font-size:80px">🗒️❓</div><h1>This page was torn out!</h1><p class="hand" style="font-size:28px;margin-bottom:20px">we couldn't find that game in our notebook.</p><a class="btn btn--y" href="games.html">back to all games</a></section>`;
    return;
  }
  setGameSeo(g, studio);
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  main.innerHTML = html`
  <section class="g-spread">
    <div>
      <p class="crumbs"><a href="index.html">home</a> › <a href="games.html">games</a> › ${g.title}</p>
      <h1 class="g-title" data-game-title>${g.title}</h1>
      ${raw(DOODLES.underline.replace('class="doodle draw"', 'class="doodle draw" style="width:min(360px,80%);height:24px;--len:520"'))}
      <p class="g-tag">${g.tagline}</p>
      <div class="chips">${g.categoryList.map((c, i) => raw(html`<a class="chip" href="games.html?category=${c.id}" style="--cc:${NOTE_COLORS[i % 4]}">${c.icon} ${c.name}</a>`))}<span class="chip" style="--cc:#fff">${STATUS[g.status].label}</span></div>
      <div class="g-facts">${g.rating.count ? raw(html`<span style="--r:-2deg">★ ${g.rating.average.toFixed(1)} (${g.rating.count.toLocaleString()} ratings)</span>`) : ''}${g.price ? raw(html`<span style="--r:1.5deg">${g.price}</span>`) : ''}<span style="--r:-1deg">${g.platformList.map((p) => p.label).join(', ')}</span></div>
      <div class="stores">${g.stores.map((s, i) => raw(html`<a class="btn ${['btn--y', 'btn--p', 'btn--b'][i % 3]}" href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || '🎮'} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="btn">🔔 coming soon</span>')}</div>
    </div>
    <div style="position:relative">
      ${g.media.icon ? raw(html`<span class="sticker g-icon-st" style="position:absolute;--r:8deg" aria-hidden="true"><img src="${g.media.icon}" alt="" width="64" height="64"></span>`) : ''}
      <div class="polaroid" style="--r:2deg;--c1:${g.theme.primary}"><span class="tape b" aria-hidden="true"></span><span class="ph"><img src="${g.media.hero}" alt="${g.title} artwork" width="1200" height="675"></span><span class="cap">${g.title} ♥</span></div>
    </div>
  </section>

  <section class="section two">
    <div class="lined" data-reveal><span class="tape" aria-hidden="true"></span><h2>What's it about?</h2><div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div></div>
    ${g.features.length ? raw(html`<div class="lined" data-reveal style="--r:1deg"><span class="tape g" aria-hidden="true"></span><h2>Why it's great</h2><ul class="checklist">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
  </section>

  <section class="section" style="padding-top:0">
    <h2 class="sec-title">Watch!</h2>
    <div class="tv"><div class="scr">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="none"><img src="${g.media.cover}" alt=""><span>trailer coming soon ✎</span></div>`)}</div></div>
  </section>

  ${g.media.screenshots.length ? raw(html`<section class="section" style="padding-top:0"><h2 class="sec-title">Snapshots</h2>
    <div class="shots">${g.media.screenshots.map((s, i) => raw(html`<button class="shot" type="button" data-shot="${i}" style="--r:${rot(i, 4)}" aria-label="Open screenshot ${i + 1}"><span class="tape ${TAPES[i % 4]}" aria-hidden="true"></span><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div></section>`) : ''}

  ${g.reviews.length ? raw(html`<section class="section" style="padding-top:0"><h2 class="sec-title">What people say</h2>
    <div class="quotes">${g.reviews.map((r, i) => raw(html`<figure class="quote" style="--c:${NOTE_COLORS[i % 4]};--r:${rot(i + 1, 3)}">${typeof r.score === 'number' ? raw(html`<div class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</div>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author}, ` : ''}${r.source}</cite></figcaption></figure>`))}</div></section>`) : ''}

  <section class="section two" style="padding-top:0">
    <div class="lined"><span class="tape p" aria-hidden="true"></span><h2>The details</h2><table class="facts"><tbody>${gameFacts(g).map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}</tbody></table></div>
    <div><h2 class="sec-title" style="font-size:40px">Also in the book</h2><div style="display:grid;gap:34px;margin-top:16px">${relatedGames(g, games, 2).map((x, i) => raw(polaroid(x, i + 1).replace(' data-game-card', '')))}</div></div>
  </section>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn btn--sm" type="button" data-lb-prev>← prev</button><button class="btn btn--sm btn--y" type="button" data-lb-close>close</button><button class="btn btn--sm" type="button" data-lb-next>next →</button></nav></dialog>`;
  bindLightbox($('#lightbox'), g, { root: main });
  drawIn(main);
  reveal(main, reducedMotion);
}
