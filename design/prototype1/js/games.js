// Bubble Pop Planet: games list page with filters.

import { mountChrome, mountBubbles, gameCard, showLoadError, burst } from './ui.js';
import { loadGames, filterGames, html } from '../../shared/js/data.js';
import { sfx } from '../../shared/js/sfx.js';
import { reducedMotion } from '../../shared/js/motion.js';

const $ = (s, r = document) => r.querySelector(s);

mountChrome({ active: 'games' });
mountBubbles({ count: 12 });

const params = new URLSearchParams(location.search);
const state = {
  category: params.get('category') || 'all',
  platform: params.get('platform') || 'all',
  query: params.get('q') || '',
  sort: params.get('sort') || 'featured',
};

let games = [];
let categories = [];

init();

async function init() {
  try {
    ({ games, categories } = await loadGames());
  } catch (err) {
    showLoadError(err);
    return;
  }
  if (state.category !== 'all' && !categories.some((c) => c.id === state.category)) state.category = 'all';
  $('[data-count]').textContent = games.length;
  renderChips();
  $('[data-q]').value = state.query;
  $('[data-sort]').value = state.sort;
  syncPlatform();
  render(false);
  bind();
}

function renderChips() {
  const count = (id) => games.filter((g) => id === 'all' || g.categories.includes(id)).length;
  $('[data-cats]').innerHTML = [{ id: 'all', name: 'All', icon: '🌈', color: '#2a1b4a' }, ...categories]
    .map((c) => html`<button type="button" class="cat-chip" style="--cc:${c.color || '#7b5cff'}" data-cat="${c.id}" aria-pressed="${state.category === c.id}"><span aria-hidden="true">${c.icon}</span>${c.name}<span class="n">${count(c.id)}</span></button>`)
    .join('');
}

function syncPlatform() {
  document.querySelectorAll('[data-platform]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform)));
  document.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
}

function updateUrl() {
  const p = new URLSearchParams();
  if (state.category !== 'all') p.set('category', state.category);
  if (state.platform !== 'all') p.set('platform', state.platform);
  if (state.query) p.set('q', state.query);
  if (state.sort !== 'featured') p.set('sort', state.sort);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function render(animate = true) {
  const grid = $('[data-grid]');
  const list = filterGames(games, state);
  const Flip = window.Flip;
  const canFlip = animate && !reducedMotion && Flip && window.gsap;
  let flipState;
  if (canFlip) {
    window.gsap.registerPlugin(Flip);
    flipState = Flip.getState(grid.querySelectorAll('.game-card'));
  }
  // Reuse existing card nodes so Flip can animate them.
  const existing = new Map([...grid.querySelectorAll('.game-card')].map((el) => [el.dataset.id, el]));
  const frag = document.createDocumentFragment();
  list.forEach((g) => {
    let el = existing.get(g.id);
    if (!el) {
      const t = document.createElement('template');
      t.innerHTML = gameCard(g).trim();
      el = t.content.firstElementChild;
    }
    frag.appendChild(el);
  });
  grid.replaceChildren(frag);
  if (canFlip) {
    Flip.from(flipState, {
      duration: 0.6,
      ease: 'back.out(1.6)',
      scale: true,
      absolute: true,
      onEnter: (els) => window.gsap.fromTo(els, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' }),
    });
  }
  $('[data-empty]').classList.toggle('show', list.length === 0);
  $('[data-status]').textContent = `${list.length} game${list.length === 1 ? '' : 's'} shown`;
  updateUrl();
}

function bind() {
  $('[data-cats]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.category = b.dataset.cat;
    syncPlatform();
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 8, spread: 60, colors: [getComputedStyle(b).getPropertyValue('--cc').trim(), '#fff'] });
    sfx.pop(1.2);
    render();
  });
  $('[data-platforms]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-platform]');
    if (!b) return;
    state.platform = b.dataset.platform;
    syncPlatform();
    sfx.pop(0.9);
    render();
  });
  let t;
  $('[data-q]').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.query = e.target.value; render(); }, 160);
  });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('[data-reset]').addEventListener('click', () => {
    Object.assign(state, { category: 'all', platform: 'all', query: '', sort: 'featured' });
    $('[data-q]').value = '';
    $('[data-sort]').value = 'featured';
    syncPlatform();
    sfx.boing();
    render();
  });
}
