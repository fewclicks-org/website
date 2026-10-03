// Shared single-page-portfolio machinery (prototypes 6–10): loader progress, image preloading,
// and an in-page game view routed by #game/<id> with SEO, focus and scroll locking.

import { setGameSeo, setMeta } from './seo.js';
import { reducedMotion } from './motion.js';

/**
 * Drives a loading screen. `render(shown 0..100)` paints it; call set(p) as real loading progresses.
 * The loader never finishes faster than minMs, so it doesn't flash. then(fn) runs once at 100%.
 */
export function createLoader({ render, minMs = 1600, onFinish } = {}) {
  let shown = 0, target = 0, done = false, cb = null, raf;
  const t0 = performance.now();
  const tick = () => {
    const minT = reducedMotion ? 1 : Math.min(1, (performance.now() - t0) / minMs);
    const goal = Math.min(target, minT * 100);
    shown += (goal - shown) * 0.12;
    if (goal - shown < 0.4) shown = goal;
    render(shown);
    if (shown < 100) raf = requestAnimationFrame(tick);
    else finish();
  };
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    onFinish?.();
    cb?.();
  };
  raf = requestAnimationFrame(tick);
  return {
    set: (p) => (target = Math.max(target, p)),
    then: (fn) => { if (done) fn(); else cb = fn; },
  };
}

export function preloadImages(urls, onProgress) {
  let n = 0;
  if (!urls.length) { onProgress?.(1); return Promise.resolve(); }
  return Promise.all(urls.map((u) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => { onProgress?.(++n / urls.length); res(); };
    i.src = u;
  })));
}

/** Wait for fonts + images, but never longer than `timeout` ms. */
export function preloadAll(urls, onProgress, timeout = 6000) {
  const fonts = document.fonts?.ready || Promise.resolve();
  return Promise.race([Promise.all([fonts, preloadImages(urls, onProgress)]), new Promise((r) => setTimeout(r, timeout))]);
}

/**
 * In-page game view. `panel` is the container element (gets class "open").
 * render(game, { index, prev, next, games }) returns HTML; notFound(id) returns HTML (must include [data-not-found]).
 * afterRender(panel, game) wires interactions. Closing restores the page title and focus.
 */
export function gameRouter({ panel, games, studio, render, notFound, afterRender, onOpen, onClose, homeTitle }) {
  let lastFocus = null;
  const open = (id) => {
    const index = games.findIndex((g) => g.id === id);
    const g = games[index];
    if (!panel.classList.contains('open')) lastFocus = document.activeElement;
    if (g) {
      const prev = games[(index - 1 + games.length) % games.length];
      const next = games[(index + 1) % games.length];
      panel.innerHTML = render(g, { index, prev, next, games });
      setGameSeo(g, studio);
    } else {
      panel.innerHTML = notFound(id);
      setMeta({ title: `Game not found | ${studio.name}` });
    }
    panel.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => (location.hash = `game/${b.dataset.go}`)));
    panel.querySelectorAll('[data-close-panel]').forEach((b) => b.addEventListener('click', () => close(true)));
    afterRender?.(panel, g);
    panel.scrollTop = 0;
    const wasOpen = panel.classList.contains('open');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    if (!wasOpen) onOpen?.(g);
    panel.querySelector('[data-close-panel]')?.focus({ preventScroll: true });
  };
  const close = (updateHash) => {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    setMeta({ title: homeTitle || document.title, description: studio.description });
    if (updateHash) history.pushState(null, '', `${location.pathname}${location.search}#games`);
    onClose?.();
    lastFocus?.focus?.({ preventScroll: true });
  };
  const route = () => {
    const m = location.hash.match(/^#game\/(.+)$/);
    if (m) open(decodeURIComponent(m[1]));
    else close(false);
  };
  addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) close(true); });
  return { route, open, close };
}

/** Light "toast" helper bound to an element. */
export function toaster(el, ms = 2200) {
  let t;
  return (text) => {
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(t);
    t = setTimeout(() => el.classList.remove('show'), ms);
  };
}
