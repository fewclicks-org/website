// Shared page logic used by prototypes 2–10. Each prototype supplies its own markup and style;
// this module handles the boring-but-important bits consistently.

import { filterGames, formatDate, STATUS, copyText } from './data.js';

const $ = (s, r = document) => r.querySelector(s);

/** Key facts for a game's info table. Empty values are dropped. */
export function gameFacts(g) {
  return [
    ['Platforms', g.platformList.map((p) => p.label).join(', ')],
    ['Release', g.status === 'released' ? formatDate(g.releaseDate) : `${formatDate(g.releaseDate)} (planned)`],
    ['Price', g.price],
    ['Players', g.players],
    ['Session', g.playTime],
    ['Age rating', g.ageRating],
    ['Genres', g.categoryList.map((c) => c.name).join(', ')],
    ['Languages', g.languages.join(', ')],
    ['Status', STATUS[g.status].label],
  ].filter(([, v]) => v);
}

/** Up to n games sharing a category with g (falls back to any other games). */
export function relatedGames(g, games, n = 3) {
  const rel = games.filter((x) => x.id !== g.id && x.categories.some((c) => g.categories.includes(c)));
  return (rel.length ? rel : games.filter((x) => x.id !== g.id)).slice(0, n);
}

/**
 * Wire up a games-list filter UI. Expected (optional) elements inside root:
 *  [data-cat="id"] buttons, [data-platform="all|mobile|pc|console"] buttons, input[data-q], select[data-sort], [data-reset]
 * render(list, state) is called on every change. State is mirrored in the URL (?category=&platform=&q=&sort=).
 */
export function bindFilters({ root = document, games, categories, render, onChange }) {
  const params = new URLSearchParams(location.search);
  const state = {
    category: params.get('category') || 'all',
    platform: params.get('platform') || 'all',
    query: params.get('q') || '',
    sort: params.get('sort') || 'featured',
  };
  if (state.category !== 'all' && !categories.some((c) => c.id === state.category)) state.category = 'all';

  const sync = () => {
    root.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
    root.querySelectorAll('[data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
    const q = $('[data-q]', root);
    if (q && q.value !== state.query) q.value = state.query;
    const s = $('[data-sort]', root);
    if (s) s.value = state.sort;
  };
  const url = () => {
    const p = new URLSearchParams();
    if (state.category !== 'all') p.set('category', state.category);
    if (state.platform !== 'all') p.set('platform', state.platform);
    if (state.query) p.set('q', state.query);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', `${qs ? `?${qs}` : location.pathname}${location.hash}`);
  };
  const update = (src) => {
    sync();
    url();
    const list = filterGames(games, state);
    render(list, state, src);
    const st = $('[data-status]', root);
    if (st) st.textContent = `${list.length} game${list.length === 1 ? '' : 's'} shown`;
    const empty = $('[data-empty]', root);
    if (empty) empty.hidden = list.length > 0;
    if (onChange && src) onChange(src, state);
  };

  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) { state.category = c.dataset.cat; update(c); return; }
    const p = e.target.closest('[data-platform]');
    if (p) { state.platform = p.dataset.platform; update(p); return; }
    const r = e.target.closest('[data-reset]');
    if (r) { Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' }); update(r); }
  });
  let t;
  $('[data-q]', root)?.addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.query = e.target.value; update(e.target); }, 150);
  });
  $('[data-sort]', root)?.addEventListener('change', (e) => { state.sort = e.target.value; update(e.target); });

  update(null);
  return {
    state,
    set(patch) { Object.assign(state, patch); update(null); },
  };
}

/** Category step helper (for prev/next category UIs like console shoulder buttons). */
export function stepCategory(state, categories, dir) {
  const ids = ['all', ...categories.map((c) => c.id)];
  const i = ids.indexOf(state.category);
  return ids[(i + dir + ids.length) % ids.length];
}

/**
 * Screenshot lightbox on a <dialog> containing img[data-lb-img], [data-lb-prev], [data-lb-next], [data-lb-close].
 * Triggers are elements with data-shot="index" anywhere in `root`.
 */
export function bindLightbox(dialog, game, { root = document, onChange } = {}) {
  if (!dialog) return;
  const img = $('[data-lb-img]', dialog);
  const shots = game.media.screenshots;
  let i = 0;
  const show = (n) => {
    i = (n + shots.length) % shots.length;
    img.src = shots[i];
    img.alt = `${game.title} screenshot ${i + 1} of ${shots.length}`;
    onChange?.(i);
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shot]');
    if (!b || !shots.length) return;
    show(Number(b.dataset.shot));
    dialog.showModal();
  });
  $('[data-lb-prev]', dialog)?.addEventListener('click', () => show(i - 1));
  $('[data-lb-next]', dialog)?.addEventListener('click', () => show(i + 1));
  $('[data-lb-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  let sx = null;
  dialog.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    sx = null;
  });
}

/** Simple <dialog> helpers: close button [data-close] and click-outside. */
export function bindDialog(dialog) {
  if (!dialog) return;
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

/** Wire [data-copy-email] buttons. cb(ok, button) runs after copying. */
export function bindEmailCopy(email, cb) {
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(email);
      cb?.(ok, btn);
    });
  });
  document.querySelectorAll('[data-email-link]').forEach((a) => {
    a.href = `mailto:${email}`;
    if (a.dataset.emailLink === 'text') a.textContent = email;
  });
}

/** Default "data failed to load" handler. */
export function loadFailed(err, html = '<p>Could not load the game data. Please refresh.</p>') {
  console.error(err);
  const main = document.querySelector('main') || document.body;
  main.insertAdjacentHTML('afterbegin', `<div role="alert" style="padding:120px 16px;text-align:center">${html}</div>`);
}

/** Add .in to [data-reveal] elements as they enter the viewport. */
export function reveal(root = document, reduced = false) {
  const els = root.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}
