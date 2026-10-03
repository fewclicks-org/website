// Shared data layer for every FewClicks prototype.
// All content lives in /data/*.json. Edit those files, not this one.

// This file is /design/shared/js/data.js, so the site root is three folders up.
// Resolving from import.meta.url keeps paths working on fewclicks.org and on *.github.io/<repo>/.
export const ROOT = new URL('../../../', import.meta.url);

/** Resolve a path from the JSON (relative to the site root) to a full URL. Full URLs pass through. */
export function asset(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return new URL(path.replace(/^\//, ''), ROOT).href;
}

const cache = new Map();
async function getJSON(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(new URL(`data/${name}.json`, ROOT), { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`Could not load data/${name}.json (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(name);
}

export const PLATFORMS = {
  ios: { label: 'iOS', store: 'App Store', group: 'mobile', icon: '📱' },
  android: { label: 'Android', store: 'Google Play', group: 'mobile', icon: '📱' },
  steam: { label: 'PC (Steam)', store: 'Steam', group: 'pc', icon: '💻' },
  windows: { label: 'Windows', store: 'Windows', group: 'pc', icon: '💻' },
  mac: { label: 'Mac', store: 'Mac', group: 'pc', icon: '💻' },
  epic: { label: 'Epic Games', store: 'Epic Games Store', group: 'pc', icon: '💻' },
  itch: { label: 'itch.io', store: 'itch.io', group: 'pc', icon: '🕹️' },
  switch: { label: 'Nintendo Switch', store: 'Nintendo eShop', group: 'console', icon: '🎮' },
  playstation: { label: 'PlayStation', store: 'PlayStation Store', group: 'console', icon: '🎮' },
  xbox: { label: 'Xbox', store: 'Xbox Store', group: 'console', icon: '🎮' },
  web: { label: 'Web browser', store: 'Play in browser', group: 'web', icon: '🌐' },
};
export const STATUS = {
  released: { label: 'Out now', short: 'Out now' },
  'coming-soon': { label: 'Coming soon', short: 'Soon' },
  'in-development': { label: 'In development', short: 'In dev' },
};

const arr = (v) => (Array.isArray(v) ? v : []);

function normalizeGame(g, categoryMap) {
  const media = g.media || {};
  const trailer = media.trailer || {};
  const game = {
    ...g,
    tagline: g.tagline || '',
    status: STATUS[g.status] ? g.status : 'released',
    featured: !!g.featured,
    order: typeof g.order === 'number' ? g.order : 999,
    categories: arr(g.categories),
    platforms: arr(g.platforms),
    languages: arr(g.languages),
    features: arr(g.features),
    stores: arr(g.stores).filter((s) => s && s.platform),
    reviews: arr(g.reviews).filter((r) => r && r.quote),
    rating: { average: 0, count: 0, ...(g.rating || {}) },
    theme: { primary: '#7b5cff', secondary: '#ff5fa2', ...(g.theme || {}) },
    description: { short: '', long: [], ...(g.description || {}) },
    seo: { title: '', description: '', keywords: [], ogImage: '', ...(g.seo || {}) },
  };
  if (typeof game.description.long === 'string') game.description.long = [game.description.long];
  game.media = {
    icon: asset(media.icon),
    cover: asset(media.cover),
    hero: asset(media.hero || media.cover),
    screenshots: arr(media.screenshots).map(asset).filter(Boolean),
    trailer: {
      type: trailer.type === 'video' ? 'video' : 'youtube',
      id: trailer.id || '',
      src: asset(trailer.src),
      poster: asset(trailer.poster || media.cover),
    },
  };
  game.hasTrailer = game.media.trailer.type === 'video' ? !!game.media.trailer.src : !!game.media.trailer.id;
  game.categoryList = game.categories.map((id) => categoryMap.get(id) || { id, name: id, icon: '', color: '#999' });
  game.platformList = game.platforms.map((id) => ({ id, ...(PLATFORMS[id] || { label: id, store: id, group: 'other', icon: '🎮' }) }));
  game.platformGroups = [...new Set(game.platformList.map((p) => p.group))];
  game.url = gameUrl(game.id);
  return game;
}

/** Loads games + categories, normalized and sorted by `order`. */
export async function loadGames() {
  const data = await getJSON('games');
  const categories = arr(data.categories);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const games = arr(data.games)
    .filter((g) => g && g.id && g.title)
    .map((g) => normalizeGame(g, categoryMap))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  // Only show categories that at least one game uses.
  const used = new Set(games.flatMap((g) => g.categories));
  return { games, categories: categories.filter((c) => used.has(c.id)) };
}

export async function getGame(id) {
  const { games } = await loadGames();
  return games.find((g) => g.id === id) || null;
}

export async function loadStudio() {
  const s = await getJSON('studio');
  return {
    name: 'FewClicks', tagline: '', description: '', email: '', address: '',
    ...s,
    stats: arr(s.stats), values: arr(s.values),
    socials: arr(s.socials).filter((x) => x && x.url),
  };
}

export async function loadNews() {
  const n = await getJSON('news');
  return arr(n.posts)
    .filter((p) => p && p.title)
    .map((p) => ({ ...p, body: arr(p.body), image: asset(p.image) }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function loadTeam() {
  const t = await getJSON('team');
  return arr(t.members).map((m) => ({ ...m, avatar: asset(m.avatar), stats: m.stats || {}, links: arr(m.links) }));
}

/** Everything at once (handy for home pages). */
export async function loadAll() {
  const [g, studio, news, team] = await Promise.all([loadGames(), loadStudio(), loadNews(), loadTeam()]);
  return { ...g, studio, news, team };
}

/**
 * Filter + sort helper for games pages.
 * opts: { category: 'all'|id, platform: 'all'|'mobile'|'pc'|'console'|'web', query: string, sort: 'featured'|'newest'|'az'|'rating' }
 */
export function filterGames(games, opts = {}) {
  const { category = 'all', platform = 'all', query = '', sort = 'featured' } = opts;
  const q = query.trim().toLowerCase();
  let list = games.filter((g) =>
    (category === 'all' || g.categories.includes(category)) &&
    (platform === 'all' || g.platformGroups.includes(platform)) &&
    (!q || [g.title, g.tagline, g.description.short, ...g.categoryList.map((c) => c.name)].join(' ').toLowerCase().includes(q))
  );
  const by = {
    featured: (a, b) => (b.featured - a.featured) || a.order - b.order,
    newest: (a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')),
    az: (a, b) => a.title.localeCompare(b.title),
    rating: (a, b) => (b.rating.average || 0) - (a.rating.average || 0),
  };
  return list.sort(by[sort] || by.featured);
}

export const gameUrl = (id) => `game.html?id=${encodeURIComponent(id)}`;
export const param = (name) => new URLSearchParams(location.search).get(name);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatDate(iso, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!iso) return 'TBA';
  const parts = String(iso).split('-').map(Number);
  if (parts.length === 1) return String(parts[0]);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  if (parts.length === 2) return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  return d.toLocaleDateString(undefined, opts);
}

/** "★★★★½" style string for a score. */
export function starString(score, max = 5) {
  const s = Math.max(0, Math.min(5, (score / (max || 5)) * 5));
  const full = Math.floor(s);
  const half = s - full >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

export const compactNumber = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

/** Store button text, e.g. "App Store" or a custom label. */
export const storeLabel = (s) => s.label || (PLATFORMS[s.platform] ? PLATFORMS[s.platform].store : s.platform);

/** Returns embeddable trailer HTML, or '' when no trailer is set. */
export function trailerHtml(game, { autoplay = false } = {}) {
  const t = game.media.trailer;
  if (!game.hasTrailer) return '';
  if (t.type === 'video') {
    return `<video src="${escapeHtml(t.src)}" poster="${escapeHtml(t.poster)}" controls playsinline preload="metadata"${autoplay ? ' autoplay muted loop' : ''}></video>`;
  }
  return `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.id)}?rel=0${autoplay ? '&autoplay=1&mute=1' : ''}" title="${escapeHtml(game.title)} trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
}

/** Copy text to the clipboard; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

/** Tiny template helper: html`<b>${x}</b>` with auto-escaping of interpolations (use raw() to skip). */
export function raw(s) { return { __raw: String(s ?? '') }; }
export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => {
    if (i === 0) return s;
    const v = vals[i - 1];
    const str = Array.isArray(v) ? v.map((x) => (x && x.__raw !== undefined ? x.__raw : escapeHtml(x))).join('') : v && v.__raw !== undefined ? v.__raw : escapeHtml(v);
    return out + str + s;
  }, '');
}
