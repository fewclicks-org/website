// Bubble Pop Planet: home page.

import { mountChrome, mountBubbles, gameCard, burst, toast, revealOnScroll, hideLoader, showLoadError } from './ui.js';
import { PALETTE } from './bubbles.js';
import { loadAll, html, raw, formatDate, copyText } from '../../shared/js/data.js';
import { sfx } from '../../shared/js/sfx.js';
import { reducedMotion, introSeen, markIntroSeen, onVisible } from '../../shared/js/motion.js';

const LETTER_COLORS = ['#ff5fa2', '#ff8a3d', '#ffb020', '#2fd6a6', '#4cc9ff', '#7b5cff', '#c48bff', '#ff5fa2', '#2fd6a6'];
const $ = (s, r = document) => r.querySelector(s);

mountChrome({ active: '' });
const world = mountBubbles();
buildLogo();
start();

async function start() {
  let data;
  try {
    data = await loadAll();
  } catch (err) {
    document.body.classList.remove('is-intro');
    showLoadError(err);
    return;
  }
  renderGames(data);
  renderStudio(data);
  renderTeam(data.team);
  renderNews(data.news, data.games);
  renderContact(data.studio);
  revealOnScroll();
  hideLoader();
  runIntro();
}

// ---------- Logo letters ----------
function buildLogo() {
  const h1 = $('.logo-type');
  h1.innerHTML = [...'FewClicks'].map((ch, i) => `<span class="ch" aria-hidden="true" style="--c:${LETTER_COLORS[i]}">${ch}</span>`).join('');
  h1.addEventListener('click', (e) => {
    const ch = e.target.closest('.ch');
    if (!ch) return;
    ch.classList.remove('boing');
    void ch.offsetWidth;
    ch.classList.add('boing');
    sfx.boing();
    const r = ch.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { colors: [getComputedStyle(ch).getPropertyValue('--c').trim(), '#fff'], count: 8, spread: 70 });
  });
}

function revealHero(animated) {
  document.body.classList.remove('is-intro');
  const letters = document.querySelectorAll('.logo-type .ch');
  const rest = document.querySelectorAll('.hero .tagline, .hero .cta, .scroll-hint');
  if (!animated || !window.gsap) return;
  const { gsap } = window;
  gsap.fromTo(letters,
    { y: () => -120 - Math.random() * 120, scale: 0, rotation: () => (Math.random() - 0.5) * 60 },
    { y: 0, scale: 1, rotation: 0, duration: 1.3, ease: 'elastic.out(1, 0.45)', stagger: 0.055 });
  gsap.fromTo(rest, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(2)', stagger: 0.12, delay: 0.45 });
}

// ---------- Intro: pop the giant bubble ----------
function runIntro() {
  const skip = reducedMotion || !world || introSeen('p1') || location.hash;
  if (skip) {
    revealHero(!reducedMotion && !location.hash);
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    return;
  }
  const popped = world.startIntro();
  let done = false;
  const pop = () => {
    if (done) return;
    done = true;
    world.popIntro();
    cleanup();
  };
  const hit = $('.intro-hit');
  const skipBtn = $('[data-skip-intro]');
  const onScrollIntent = () => pop();
  hit.addEventListener('click', pop);
  skipBtn.addEventListener('click', pop);
  window.addEventListener('wheel', onScrollIntent, { passive: true, once: true });
  window.addEventListener('touchmove', onScrollIntent, { passive: true, once: true });
  const auto = setTimeout(pop, 9000);
  function cleanup() {
    clearTimeout(auto);
    window.removeEventListener('wheel', onScrollIntent);
    window.removeEventListener('touchmove', onScrollIntent);
  }
  popped.then(() => {
    sfx.bigPop();
    markIntroSeen('p1');
    burst(innerWidth / 2, innerHeight * 0.45, { count: 36, spread: Math.min(innerWidth, 700) * 0.5, size: [10, 30] });
    revealHero(true);
  });
}

// ---------- Games ----------
function renderGames({ games, categories }) {
  const featured = games.filter((g) => g.featured);
  const list = (featured.length ? featured : games).slice(0, 6);
  const grid = $('[data-featured]');
  grid.innerHTML = list.map(gameCard).join('');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center';
  grid.querySelectorAll('.game-card').forEach((c, i) => {
    c.style.flex = '0 1 calc((100% - 56px) / 3)';
    c.style.minWidth = 'min(100%, 290px)';
    c.classList.add('reveal');
    c.style.transitionDelay = `${(i % 3) * 0.08}s`;
  });
  $('[data-all-games]').textContent = `See all ${games.length} games →`;
  $('[data-flavours]').innerHTML = categories.map((c, i) => {
    const n = games.filter((g) => g.categories.includes(c.id)).length;
    return html`<a class="flavour" href="games.html?category=${c.id}" style="--cc:${c.color || PALETTE[i % PALETTE.length]};--d:${-i * 0.6}s"><div><span aria-hidden="true">${c.icon || '🎮'}</span>${c.name}<br><small>${n} game${n === 1 ? '' : 's'}</small></div></a>`;
  }).join('');
}

// ---------- Studio ----------
function renderStudio({ studio }) {
  $('[data-tagline]').textContent = studio.tagline || 'Games you can love in a few clicks.';
  $('[data-studio-desc]').textContent = studio.description;
  const colors = ['#ff5fa2', '#2fd6a6', '#7b5cff'];
  $('[data-values]').innerHTML = studio.values.map((v, i) => html`
    <article class="value-bubble reveal" style="--cc:${colors[i % colors.length]};--d:${-i * 1.3}s">
      <div class="icon" aria-hidden="true">${v.icon}</div>
      <h3>${v.title}</h3>
      <p>${v.text}</p>
    </article>`).join('');
  const stats = $('[data-stats]');
  stats.innerHTML = studio.stats.map((s) => html`<div class="stat"><b data-count="${s.value}">0</b><span>${s.label}</span></div>`).join('');
  onVisible(stats, () => {
    stats.querySelectorAll('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      if (reducedMotion || !window.gsap) { el.textContent = target.toLocaleString(); return; }
      const o = { v: 0 };
      window.gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString()) });
    });
  });
}

// ---------- Team ----------
function renderTeam(team) {
  const wrap = $('[data-team]');
  wrap.innerHTML = team.map((m, i) => html`
    <div class="member reveal" style="--mc:${m.color || PALETTE[i % PALETTE.length]};--d:${-i * 0.9}s">
      <button class="member-inner" type="button" aria-pressed="false" aria-label="${m.name}, ${m.role}. Flip card">
        <span class="member-face">
          <span class="member-avatar"><img src="${m.avatar}" alt="" loading="lazy" width="256" height="256"></span>
          <h3>${m.name}</h3>
          <span class="member-role">${m.role}</span>
          <span class="member-hint">tap to flip ↻</span>
        </span>
        <span class="member-face member-face--back">
          <h3>${m.name}</h3>
          <p>${m.bio}</p>
          ${m.funFact ? raw(html`<p><b>Fun fact:</b> ${m.funFact}</p>`) : ''}
          <span class="bars">${Object.entries(m.stats).map(([k, v]) => raw(html`<span class="bar">${k}<i style="--v:${Math.max(0, Math.min(100, v))}%"></i></span>`))}</span>
        </span>
      </button>
    </div>`).join('');
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.member-inner');
    if (!btn) return;
    const card = btn.parentElement;
    const flipped = card.classList.toggle('flipped');
    btn.setAttribute('aria-pressed', String(flipped));
    sfx.boing();
  });
}

// ---------- News ----------
function renderNews(posts, games) {
  const wrap = $('[data-news]');
  if (!posts.length) { $('#news').hidden = true; return; }
  const [first, ...rest] = posts;
  const card = (p, big) => html`
    <button class="news-card ${big ? 'news-card--big' : ''} reveal" type="button" data-post="${p.id}">
      ${big ? raw(html`<span class="news-img">${p.image ? raw(html`<img src="${p.image}" alt="" loading="lazy">`) : '🫧'}</span>`) : ''}
      <span class="${big ? 'news-text' : ''}" style="display:grid;gap:10px">
        <span class="news-meta"><span class="chip" style="--cc:#7b5cff">${p.tag || 'News'}</span><time datetime="${p.date}">${formatDate(p.date)}</time></span>
        <h3>${p.title}</h3>
        <p>${p.summary}</p>
      </span>
    </button>`;
  wrap.innerHTML = card(first, true) + `<div class="news-list">${rest.slice(0, 3).map((p) => card(p, false)).join('')}</div>`;

  const modal = $('#news-modal');
  const body = $('[data-modal-body]', modal);
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-post]');
    if (!btn) return;
    const p = posts.find((x) => x.id === btn.dataset.post);
    const game = p.gameId ? games.find((g) => g.id === p.gameId) : null;
    body.innerHTML = html`
      ${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}
      <span class="news-meta"><span class="chip" style="--cc:#7b5cff">${p.tag || 'News'}</span><time datetime="${p.date}">${formatDate(p.date)}</time></span>
      <h2 id="news-modal-title">${p.title}</h2>
      ${p.body.map((para) => raw(html`<p>${para}</p>`))}
      <div class="contact-actions" style="justify-content:flex-start">
        ${game ? raw(html`<a class="btn btn--primary btn--sm" href="${game.url}">Check out ${game.title} →</a>`) : ''}
        ${p.url ? raw(html`<a class="btn btn--sm" href="${p.url}" target="_blank" rel="noopener">Read more ↗</a>`) : ''}
      </div>`;
    modal.showModal();
    sfx.boing();
  });
  modal.querySelector('[data-close]').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
}

// ---------- Contact ----------
function renderContact(studio) {
  const email = studio.email || 'admin@fewclicks.org';
  const link = $('[data-email]');
  link.textContent = email;
  link.href = `mailto:${email}`;
  $('[data-email-btn]').href = `mailto:${email}`;
  $('[data-copy]').addEventListener('click', async (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ok = await copyText(email);
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 160 });
    if (ok) { sfx.success(); toast(`${email} copied!`, { icon: '📋' }); } else { toast('Copy failed, please select the address manually', { icon: '😅' }); }
  });
  if (studio.address) {
    const a = $('[data-address]');
    a.textContent = studio.address;
    a.hidden = false;
  }
  $('[data-socials]').innerHTML = studio.socials.map((s) => html`<a class="btn btn--sm" href="${s.url}" target="_blank" rel="noopener">${s.label || s.platform}</a>`).join('');
}
