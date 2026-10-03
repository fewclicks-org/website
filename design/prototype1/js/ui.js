// Bubble Pop Planet: shared page chrome (header, footer, menu), effects, cards and the pop game.

import { createBubbleWorld, PALETTE } from './bubbles.js';
import { sfx, mountSoundToggle } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer, hasWebGL } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { html, raw, escapeHtml, starString, STATUS } from '../../shared/js/data.js';

export const LOGO_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="lg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9ccc"/><stop offset=".6" stop-color="#ff5fa2"/><stop offset="1" stop-color="#7b5cff"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="url(#lg)"/><ellipse cx="34" cy="30" rx="13" ry="9" fill="#fff" opacity=".55" transform="rotate(-30 34 30)"/><path d="M40 30 L40 72 L50.5 62 L58 78 L65 75 L57.5 59 L72 59Z" fill="#fff" stroke="#2a1b4a" stroke-width="3.5" stroke-linejoin="round"/></svg>`;

const NAV = [
  { href: 'games.html', label: 'Games', key: 'games' },
  { href: 'index.html#studio', label: 'Studio', key: 'studio' },
  { href: 'index.html#news', label: 'News', key: 'news' },
  { href: 'index.html#contact', label: 'Contact', key: 'contact' },
];

// ---------- Effects layer ----------
let fxLayer;
function layer() {
  if (!fxLayer) {
    fxLayer = document.createElement('div');
    fxLayer.className = 'fx-layer';
    fxLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fxLayer);
  }
  return fxLayer;
}

/** Burst of little DOM bubbles at a screen point. */
export function burst(x, y, { count = 14, colors = PALETTE, spread = 120, size = [8, 22] } = {}) {
  if (reducedMotion) return;
  const L = layer();
  for (let i = 0; i < count; i++) {
    const d = document.createElement('i');
    d.className = 'fx-dot';
    const s = size[0] + Math.random() * (size[1] - size[0]);
    d.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;--b:${colors[i % colors.length]}`;
    L.appendChild(d);
    const a = Math.random() * Math.PI * 2;
    const dist = spread * (0.4 + Math.random() * 0.8);
    d.animate(
      [
        { transform: 'translate(0,0) scale(0.2)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist - 30}px) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${Math.cos(a) * dist * 1.1}px, ${Math.sin(a) * dist + 40}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' }
    ).onfinish = () => d.remove();
  }
}

/** Floating "+1" style text. */
export function floatText(x, y, text, color = '#ff5fa2') {
  if (reducedMotion) return;
  const t = document.createElement('span');
  t.className = 'fx-text';
  t.textContent = text;
  t.style.cssText = `left:${x}px;top:${y}px;--b:${color}`;
  layer().appendChild(t);
  t.animate(
    [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-120%) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }],
    { duration: 1100, easing: 'ease-out' }
  ).onfinish = () => t.remove();
}

/** Toast message ("achievement unlocked", "copied!" …). */
let toastStack;
export function toast(text, { icon = '🫧', label = '' } = {}) {
  if (!toastStack) {
    toastStack = document.createElement('div');
    toastStack.className = 'toast-stack';
    toastStack.setAttribute('role', 'status');
    toastStack.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastStack);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html`<span class="t-icon">${icon}</span><span>${label ? raw(`<small>${escapeHtml(label)}</small>`) : ''}${text}</span>`;
  toastStack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 2800);
}

// ---------- Pop counter + achievements ----------
const POP_KEY = 'fewclicks:p1:pops';
const ACHIEVEMENTS = [
  [1, '🎉', 'First pop!'],
  [10, '🫧', 'Bubble Buster'],
  [25, '⭐', 'Pop Star'],
  [50, '🏆', 'Pop Legend'],
  [100, '🤯', 'Certified bubble-wrap addict'],
];
let pops = 0;
try { pops = parseInt(localStorage.getItem(POP_KEY) || '0', 10) || 0; } catch { /* ignore */ }

function addPop() {
  pops += 1;
  try { localStorage.setItem(POP_KEY, String(pops)); } catch { /* ignore */ }
  const el = document.querySelector('[data-pops]');
  if (el) {
    el.textContent = pops;
    const wrap = el.closest('.pop-counter');
    wrap.classList.remove('bump');
    void wrap.offsetWidth;
    wrap.classList.add('bump');
  }
  const a = ACHIEVEMENTS.find(([n]) => n === pops);
  if (a) { toast(a[2], { icon: a[1], label: 'Achievement unlocked' }); sfx.success(); }
}

// ---------- Chrome ----------
export function mountChrome({ active = '' } = {}) {
  const header = document.querySelector('[data-chrome="header"]');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <nav class="nav" aria-label="Main">
        <a class="brand" href="index.html" aria-label="FewClicks home">${LOGO_SVG}<span>FewClicks</span></a>
        <ul class="nav-links">
          ${NAV.map((n) => `<li><a href="${n.href}"${active === n.key ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('')}
        </ul>
        <div class="nav-tools">
          <span class="pop-counter" title="Bubbles you've popped. Click empty space to pop more!"><span aria-hidden="true">🫧</span><b data-pops>${pops}</b><span class="sr-only">bubbles popped</span></span>
          <button class="icon-btn" type="button" data-sound-toggle><span data-sound-icon></span></button>
          <button class="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded="false" data-menu-open>☰</button>
        </div>
      </nav>`;
  }
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobile-menu';
  menu.setAttribute('aria-hidden', 'true');
  const colors = ['#ff5fa2', '#7b5cff', '#2fd6a6', '#ffb020'];
  menu.innerHTML = `<button class="icon-btn close-menu" type="button" aria-label="Close menu" data-menu-close>✕</button>
    <ul>${NAV.map((n, i) => `<li><a href="${n.href}" style="--b:${colors[i]}" tabindex="-1">${n.label}</a></li>`).join('')}</ul>`;
  document.body.appendChild(menu);
  const openBtn = document.querySelector('[data-menu-open]');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    openBtn?.setAttribute('aria-expanded', String(open));
    menu.querySelectorAll('a').forEach((a) => (a.tabIndex = open ? 0 : -1));
    if (open) { sfx.boing(); menu.querySelector('a')?.focus(); }
  };
  openBtn?.addEventListener('click', () => setMenu(true));
  menu.querySelector('[data-menu-close]').addEventListener('click', () => { setMenu(false); openBtn?.focus(); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

  mountSoundToggle(document.querySelector('[data-sound-toggle]'));

  const footer = document.querySelector('[data-chrome="footer"]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="container"><div class="footer-inner">
      <a class="brand" href="index.html">${LOGO_SVG}<span>FewClicks</span></a>
      <ul class="footer-links">
        <li><a href="games.html">All games</a></li>
        <li><a href="index.html#studio">Studio</a></li>
        <li><a href="index.html#news">News</a></li>
        <li><a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></li>
      </ul>
      <p class="footer-copy">© ${new Date().getFullYear()} FewClicks · Made with 🫧 and way too much bubble tea</p>
    </div></div>`;
  }

  mountPrototypeBadge(1, 'Bubble Pop Planet');
  setupHoverSounds();
  setupCursor();
  setupPageWipe();
}

function setupHoverSounds() {
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, .game-card');
    if (t && !t.contains(e.relatedTarget)) sfx.blip();
  });
  document.addEventListener('click', (e) => { if (e.target.closest('a, button')) sfx.click(); });
}

function setupCursor() {
  if (coarsePointer || reducedMotion) return;
  const c = document.createElement('div');
  c.className = 'cursor-bubble';
  c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  let x = -100, y = -100, cx = -100, cy = -100;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    c.classList.add('on');
    c.classList.toggle('hover', !!e.target.closest('a, button, .game-card, input, select, .member-inner'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('on'));
  const loop = () => {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    c.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

/** Bubble "wipe" transition between pages. */
function setupPageWipe() {
  if (reducedMotion) return;
  const wipe = document.createElement('div');
  wipe.className = 'wipe';
  wipe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wipe);
  let incoming = false;
  try { incoming = sessionStorage.getItem('fewclicks:p1:wipe') === '1'; sessionStorage.removeItem('fewclicks:p1:wipe'); } catch { /* ignore */ }
  if (incoming) {
    wipe.classList.add('cover');
    requestAnimationFrame(() => requestAnimationFrame(() => { wipe.classList.remove('cover'); wipe.classList.add('out'); }));
    wipe.addEventListener('transitionend', () => wipe.classList.remove('out'), { once: true });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol.startsWith('mailto')) return;
    const norm = (p) => p.replace(/index\.html$/, '');
    if (norm(url.pathname) === norm(location.pathname) && url.hash) return; // same-page anchor
    if (!/\/design\/prototype1\//.test(url.pathname)) return;
    e.preventDefault();
    wipe.style.setProperty('--x', `${e.clientX}px`);
    wipe.style.setProperty('--y', `${e.clientY}px`);
    wipe.classList.add('in');
    sfx.whoosh();
    try { sessionStorage.setItem('fewclicks:p1:wipe', '1'); } catch { /* ignore */ }
    setTimeout(() => (location.href = url.href), 520);
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) wipe.classList.remove('in'); });
}

// ---------- Bubble world + pop game ----------
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, dialog, video, iframe, .game-card, .news-card, .member, .panel, .filters, .contact-bubble, .value-bubble, [data-no-pop]';

export function mountBubbles(opts = {}) {
  const canvas = document.getElementById('bubble-canvas');
  if (!canvas) return null;
  if (!hasWebGL()) {
    canvas.remove();
    cssFallbackBubbles();
    return null;
  }
  let world;
  try {
    world = createBubbleWorld(canvas, opts);
  } catch (err) {
    console.warn('WebGL bubbles unavailable, using CSS fallback', err);
    canvas.remove();
    cssFallbackBubbles();
    return null;
  }
  // Click empty space to pop bubbles.
  document.addEventListener('pointerdown', (e) => {
    if (world.introActive || e.button !== 0) return;
    if (e.target.closest(INTERACTIVE)) return;
    const hit = world.popAt(e.clientX, e.clientY);
    if (hit) {
      sfx.pop(0.7 + Math.random() * 0.6);
      burst(e.clientX, e.clientY, { colors: [hit.color, '#ffffff', hit.color], count: 10, spread: 90 });
      floatText(e.clientX, e.clientY - 10, '+1', hit.color);
      addPop();
    } else {
      burst(e.clientX, e.clientY, { count: 5, spread: 40, size: [5, 12] });
    }
  });
  return world;
}

function cssFallbackBubbles() {
  const wrap = document.createElement('div');
  wrap.className = 'css-bubbles';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    const size = 30 + Math.random() * 90;
    s.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;--b:${PALETTE[i % PALETTE.length]};animation-duration:${14 + Math.random() * 16}s;animation-delay:${-Math.random() * 20}s;--dx:${(Math.random() - 0.5) * 120}px`;
    wrap.appendChild(s);
  }
  document.body.prepend(wrap);
}

// ---------- Shared markup ----------
export function gameCard(g) {
  return html`<a class="game-card" href="${g.url}" style="--c1:${g.theme.primary};--c2:${g.theme.secondary}" data-id="${g.id}">
    <div class="game-card__media">
      <img src="${g.media.cover}" alt="${g.title} cover art" loading="lazy" width="1200" height="675">
      <span class="status status--${g.status}">${STATUS[g.status].label}</span>
    </div>
    <div class="game-card__body">
      <div class="game-card__top">
        ${g.media.icon ? raw(`<img class="game-card__icon" src="${escapeHtml(g.media.icon)}" alt="" loading="lazy" width="56" height="56">`) : ''}
        <div><h3>${g.title}</h3></div>
      </div>
      <p class="tagline">${g.tagline || g.description.short}</p>
      <div class="chips">${g.categoryList.map((c) => raw(html`<span class="chip" style="--cc:${c.color}">${c.icon} ${c.name}</span>`))}</div>
      <div class="game-card__meta">
        <span class="platforms" title="${g.platformList.map((p) => p.label).join(', ')}">${[...new Set(g.platformList.map((p) => p.icon))].join(' ')}<span class="sr-only">Platforms: ${g.platformList.map((p) => p.label).join(', ')}</span></span>
        ${g.rating.count > 0 ? raw(html`<span class="rating-pill"><span class="star" aria-hidden="true">★</span>${g.rating.average.toFixed(1)}<span class="sr-only"> out of 5 stars</span></span>`) : raw(html`<span class="rating-pill">${g.price || ''}</span>`)}
      </div>
    </div>
  </a>`;
}

export { starString };

/** Fade/scale sections in as they scroll into view. */
export function revealOnScroll(root = document) {
  const els = root.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

/** Hide the loading screen. */
export function hideLoader() {
  const l = document.querySelector('.loader');
  if (!l) return;
  l.classList.add('done');
  setTimeout(() => l.remove(), 500);
}

/** Show a friendly error if data fails to load. */
export function showLoadError(err) {
  console.error(err);
  hideLoader();
  const main = document.querySelector('main');
  if (main) main.insertAdjacentHTML('afterbegin', `<div class="not-found"><div><div class="sad">🫠</div><h1>Bubble trouble!</h1><p>We couldn't load the game data. Please refresh the page.</p></div></div>`);
}
