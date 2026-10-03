// Bubble Pop Planet: game detail page (game.html?id=<game id>).

import { mountChrome, mountBubbles, gameCard, burst, hideLoader, showLoadError, revealOnScroll } from './ui.js';
import { loadGames, loadStudio, param, html, raw, formatDate, starString, storeLabel, trailerHtml, compactNumber, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { setGameSeo } from '../../shared/js/seo.js';
import { sfx } from '../../shared/js/sfx.js';
import { reducedMotion } from '../../shared/js/motion.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('[data-game]');

mountChrome({ active: 'games' });
const world = mountBubbles({ count: 12 });
init();

async function init() {
  let games, studio;
  try {
    [{ games }, studio] = await Promise.all([loadGames(), loadStudio()]);
  } catch (err) {
    showLoadError(err);
    return;
  }
  const id = param('id');
  const game = games.find((g) => g.id === id);
  hideLoader();
  if (!game) return renderNotFound(id);

  document.documentElement.style.setProperty('--c1', game.theme.primary);
  document.documentElement.style.setProperty('--c2', game.theme.secondary);
  world?.setPalette([game.theme.primary, game.theme.secondary, '#ffffff', game.theme.primary, '#ffd23f']);
  setGameSeo(game, studio);
  render(game, games);
  revealOnScroll(main);
  heroIn();
}

function renderNotFound(id) {
  document.title = 'Game not found | FewClicks';
  main.innerHTML = html`<section class="not-found"><div>
    <div class="sad" aria-hidden="true">🫧💥</div>
    <h1>This bubble already popped!</h1>
    <p>We couldn't find a game called “${id || 'nothing'}”. Maybe it floated away?</p>
    <a class="btn btn--primary" href="games.html">See all games</a>
  </div></section>`;
}

function render(g, games) {
  const related = games.filter((x) => x.id !== g.id && x.categories.some((c) => g.categories.includes(c)));
  const more = (related.length ? related : games.filter((x) => x.id !== g.id)).slice(0, 3);
  const facts = [
    ['Platforms', g.platformList.map((p) => `${p.icon} ${p.label}`).join(', ')],
    ['Release date', g.status === 'released' ? formatDate(g.releaseDate) : `${formatDate(g.releaseDate)} (planned)`],
    ['Price', g.price],
    ['Players', g.players],
    ['Session length', g.playTime],
    ['Age rating', g.ageRating],
    ['Genres', g.categoryList.map((c) => `${c.icon} ${c.name}`).join(', ')],
    ['Languages', g.languages.join(', ')],
    ['Status', STATUS[g.status].label],
  ].filter(([, v]) => v);

  main.innerHTML = html`
  <section class="game-hero">
    <div class="container game-hero-grid">
      <div class="game-info">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> › <a href="games.html">Games</a> › <span aria-current="page">${g.title}</span></nav>
        <span class="status status--${g.status}">${STATUS[g.status].label}</span>
        <div class="game-title-row">
          ${g.media.icon ? raw(html`<img class="game-icon" src="${g.media.icon}" alt="" width="92" height="92">`) : ''}
          <h1 class="game-title">${g.title}</h1>
        </div>
        <p class="game-tagline">${g.tagline}</p>
        <div class="chips">${g.categoryList.map((c) => raw(html`<a class="chip" href="games.html?category=${c.id}" style="--cc:${c.color}">${c.icon} ${c.name}</a>`))}</div>
        <div class="game-facts">
          ${g.rating.count > 0 ? raw(html`<span><span class="big-stars" aria-hidden="true">${starString(g.rating.average)}</span> ${g.rating.average.toFixed(1)} <span style="color:var(--ink-3)">(${compactNumber(g.rating.count)} ratings)</span><span class="sr-only"> out of 5</span></span>`) : ''}
          ${g.price ? raw(html`<span class="price-tag">${g.price}</span>`) : ''}
          <span>${g.platformList.map((p) => p.icon).filter((v, i, a) => a.indexOf(v) === i).join(' ')}</span>
        </div>
        <div class="store-buttons">
          ${g.stores.map((s) => raw(storeButton(s, g)))}
          ${!g.stores.length ? raw(html`<span class="btn" aria-disabled="true">🔔 ${g.status === 'released' ? 'Store links coming soon' : 'Coming soon'}</span>`) : ''}
          <a class="btn" href="#trailer">▶ ${g.hasTrailer ? 'Watch trailer' : 'Trailer'}</a>
        </div>
      </div>
      <div class="game-art">
        <div class="blob-frame"><img src="${g.media.hero}" alt="${g.title} artwork" width="1200" height="675"></div>
        <span class="orb" style="--b:${g.theme.primary};width:70px;height:70px;left:-20px;top:10%"></span>
        <span class="orb" style="--b:${g.theme.secondary};width:44px;height:44px;right:-10px;bottom:16%;animation-delay:-2s"></span>
        <span class="orb" style="--b:#ffd23f;width:28px;height:28px;right:18%;top:-14px;animation-delay:-1s"></span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:24px" aria-labelledby="about-title">
    <div class="container ${g.features.length ? 'two-col' : ''}">
      <div class="panel reveal">
        <h2 id="about-title">About the game</h2>
        <div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div>
      </div>
      ${g.features.length ? raw(html`<div class="panel reveal"><h2>Why you'll love it</h2><ul class="features">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
    </div>
  </section>

  <section class="section" id="trailer" style="padding-top:0" aria-labelledby="trailer-title">
    <div class="container">
      <div class="section-head reveal"><span class="eyebrow">🎬 Trailer</span><h2 class="section-title" id="trailer-title">See it <span class="wobble-word">wobble</span></h2></div>
      <div class="trailer reveal">
        ${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="trailer-empty"><img src="${g.media.cover}" alt=""><div><div class="play" aria-hidden="true">▶</div><p>Trailer coming soon!</p></div></div>`)}
      </div>
    </div>
  </section>

  ${g.media.screenshots.length ? raw(html`
  <section class="section" style="padding-top:0" aria-labelledby="shots-title">
    <div class="container">
      <div class="section-head reveal"><span class="eyebrow">📸 Screenshots</span><h2 class="section-title" id="shots-title">Sneak <span class="wobble-word">peeks</span></h2></div>
      <div class="shots reveal" data-shots>
        ${g.media.screenshots.map((src, i) => raw(html`<button class="shot" type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${src}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}
      </div>
    </div>
  </section>`) : ''}

  ${g.reviews.length ? raw(html`
  <section class="section" style="padding-top:0" aria-labelledby="reviews-title">
    <div class="container">
      <div class="section-head reveal"><span class="eyebrow">💬 Reviews</span><h2 class="section-title" id="reviews-title">Happy <span class="wobble-word">poppers</span></h2></div>
      <div class="reviews">
        ${g.reviews.map((r) => raw(html`<figure class="review reveal" style="margin:0 0 18px">
          ${typeof r.score === 'number' ? raw(html`<div class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</div>`) : ''}
          <blockquote>“${r.quote}”</blockquote>
          <figcaption><cite>${r.author ? `${r.author} · ` : ''}${r.url ? raw(html`<a href="${r.url}" target="_blank" rel="noopener">${r.source}</a>`) : r.source}</cite></figcaption>
        </figure>`))}
      </div>
    </div>
  </section>`) : ''}

  <section class="section" style="padding-top:0" aria-labelledby="info-title">
    <div class="container two-col">
      <div class="panel reveal">
        <h2 id="info-title">Game info</h2>
        <table class="info-table"><tbody>${facts.map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}</tbody></table>
      </div>
      <div class="panel reveal" style="text-align:center;display:grid;gap:16px;place-items:center">
        ${g.media.icon ? raw(html`<img src="${g.media.icon}" alt="" width="140" height="140" style="border-radius:36px;box-shadow:var(--shadow)">`) : ''}
        <h2 style="margin:0">Ready to play?</h2>
        <p style="color:var(--ink-2)">${g.description.short}</p>
        <div class="store-buttons" style="justify-content:center">${g.stores.length ? g.stores.map((s) => raw(storeButton(s, g))) : raw('<span class="btn" aria-disabled="true">🔔 Coming soon</span>')}</div>
      </div>
    </div>
  </section>

  ${more.length ? raw(html`
  <section class="section" style="padding-top:0" aria-labelledby="more-title">
    <div class="container">
      <div class="section-head reveal"><span class="eyebrow">🫧 More bubbles</span><h2 class="section-title" id="more-title">You might also <span class="wobble-word">like</span></h2></div>
      <div class="games-grid">${more.map((x) => raw(gameCard(x)))}</div>
    </div>
  </section>`) : ''}`;

  bindLightbox(g);
  main.querySelectorAll('.store-buttons a.btn--store').forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('href') === '#') {
      e.preventDefault();
      const r = a.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 16, spread: 120, colors: [g.theme.primary, g.theme.secondary, '#fff'] });
      sfx.coin();
    }
  }));
}

function storeButton(s, g) {
  const p = PLATFORMS[s.platform] || { store: s.platform, icon: '🎮' };
  const verb = s.label ? '' : g.status === 'released' ? (s.platform === 'web' ? 'Play' : 'Get it on') : 'Wishlist on';
  return html`<a class="btn btn--store" href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}><span aria-hidden="true">${p.icon}</span><span class="lbl">${verb ? raw(html`<small>${verb}</small>`) : ''}${s.label || storeLabel(s)}</span></a>`;
}

function heroIn() {
  if (reducedMotion || !window.gsap) return;
  const { gsap } = window;
  gsap.from('.game-info > *', { y: 30, opacity: 0, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.07 });
  gsap.from('.blob-frame', { scale: 0.4, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' });
  gsap.from('.game-art .orb', { scale: 0, duration: 0.9, ease: 'back.out(3)', stagger: 0.12, delay: 0.4 });
}

function bindLightbox(g) {
  const dlg = $('#lightbox');
  const img = $('[data-lb-img]');
  let i = 0;
  const show = (n) => {
    i = (n + g.media.screenshots.length) % g.media.screenshots.length;
    img.src = g.media.screenshots[i];
    img.alt = `${g.title} screenshot ${i + 1} of ${g.media.screenshots.length}`;
  };
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shot]');
    if (!b) return;
    show(Number(b.dataset.shot));
    dlg.showModal();
    sfx.boing();
  });
  $('[data-lb-prev]').addEventListener('click', () => { show(i - 1); sfx.blip(); });
  $('[data-lb-next]').addEventListener('click', () => { show(i + 1); sfx.blip(); });
  $('[data-lb-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  let sx = null;
  dlg.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    sx = null;
  });
}
