// Plants in the ground: flowers and trees drawn with flat Twemoji sprites on the world canvas.
// Nothing grows on its own: a plant only grows when water reaches its roots (rain, drips, a sprinkler,
// the watering can, or a puddle around it). Seasons recolour deciduous trees (autumn tints, pale bare
// winter crowns with snow), blossom and apples appear on the crown, and everything sways in the wind.

import { SPECIES, SPECIES_MIGRATE } from './species.js';

const MAX_PLANTS = 400;
const SPRITE_PX = 192; // cached raster size per sprite + look
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STAGES = [0.2, 0.6, 1]; // sprout → young → grown → full bloom
let nextId = 1;

// ---- sprite cache (Twemoji SVG → canvas, once per look) ----
const imgs = new Map();
const looks = new Map();
function img(name) {
  let im = imgs.get(name);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = `art/tw/${name}.svg`; imgs.set(name, im); }
  return im;
}
// looks recolour pixels once into the cache: seasons only touch the green leaves (trunks stay brown)
const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
const hsl2rgb = (h, s, l) => { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
const leafy = (h, s) => h > 60 && h < 170 && s > 0.15;
const LOOKS = {
  n: null,
  autumn: (h, s, l) => (leafy(h, s) ? [22 + l * 40, Math.min(1, s * 1.2 + 0.2), l * 0.95 + 0.06] : null),
  red: (h, s, l) => (leafy(h, s) ? [356 + l * 14, Math.min(1, s * 1.2 + 0.25), l * 0.9 + 0.05] : null),
  winter: (h, s, l) => (leafy(h, s) ? [h, s * 0.12, l * 0.45 + 0.45] : null),
  dull: (h, s, l) => [h, s * 0.45, l],
  burnt: (h, s, l) => [h, 0, l * 0.3],
};
function look(name, key) {
  const k = `${name}|${key}`;
  let c = looks.get(k);
  if (c) return c;
  const im = img(name);
  if (!im.complete || !im.naturalWidth) return null;
  c = document.createElement('canvas');
  c.width = c.height = SPRITE_PX;
  const x = c.getContext('2d', { willReadFrequently: !!LOOKS[key] });
  x.drawImage(im, 0, 0, SPRITE_PX, SPRITE_PX);
  const fn = LOOKS[key];
  if (fn) {
    try {
      const d = x.getImageData(0, 0, SPRITE_PX, SPRITE_PX), px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        const r = fn(...rgb2hsl(px[i], px[i + 1], px[i + 2]));
        if (!r) continue;
        const [R, G, B] = hsl2rgb(((r[0] % 360) + 360) % 360, Math.max(0, Math.min(1, r[1])), Math.max(0, Math.min(1, r[2])));
        px[i] = R; px[i + 1] = G; px[i + 2] = B;
      }
      x.putImageData(d, 0, 0);
    } catch { /* keep the plain sprite */ }
  }
  looks.set(k, c);
  return c;
}
/** Preload every plant sprite (so the first frame already has art). */
export function preloadFlora() {
  ['seedling', 'sparkle'].forEach(img);
  Object.values(SPECIES).forEach((s) => { img(s.sprite); if (s.overlay) img(s.overlay.sprite); });
}

export function createFlora({ terrain, water, spawn }) {
  let plants = [];
  let acc = 0;
  preloadFlora();

  const S = (x) => terrain.surfaceY(x);
  const isTree = (sp) => sp.cat === 'Trees';
  function baseY(p) {
    const sp = SPECIES[p.sp];
    if (sp.aquatic) { const ws = water.surfaceAt(p.x, 4); return ws != null ? ws + 6 : S(p.x) + 3; }
    return S(p.x) + 3;
  }
  /** Drawn height (px) for the current (animated) growth. */
  function height(p) {
    const sp = SPECIES[p.sp], g = p.gv;
    if (g < STAGES[0]) return 26 + (g / STAGES[0]) * 20;
    return sp.h * ((isTree(sp) ? 0.14 : 0.42) + (isTree(sp) ? 0.86 : 0.58) * clamp((g - STAGES[0]) / (1 - STAGES[0]), 0, 1));
  }
  function size(p) { return clamp(p.g, 0.05, 1); }
  function bbox(p) {
    const h = height(p), w = h * (p.gv < STAGES[0] ? 0.9 : 0.86);
    const y = baseY(p);
    return { x0: p.x - w / 2, x1: p.x + w / 2, y0: y - h, y1: y + 6, h, w };
  }
  function rootR(p) { return Math.max(26, height(p) * (isTree(SPECIES[p.sp]) ? 0.32 : 0.45)); }
  function stage(p) { return p.g >= 1 ? (isTree(SPECIES[p.sp]) ? 'grown' : 'blooming') : p.g >= STAGES[1] ? 'growing' : p.g >= STAGES[0] ? 'young' : 'sprout'; }

  function add(sp, x, { g = 0, seed = Math.random(), burnt = 0 } = {}) {
    sp = SPECIES[sp] ? sp : SPECIES_MIGRATE[sp];
    if (!SPECIES[sp] || plants.length >= MAX_PLANTS) return null;
    const p = { id: `f${nextId++}`, sp, x: Math.round(x), g: clamp(g, 0, 1), gv: clamp(g, 0, 1), seed, burnt, hp: 1, pop: 0 };
    plants.push(p);
    return p;
  }
  function remove(id) { plants = plants.filter((p) => p.id !== id); }
  const byId = (id) => plants.find((p) => p.id === id);

  /** Plant hit test (smallest plant under the point wins). */
  function hit(x, y) {
    let best = null, area = Infinity;
    for (const p of plants) {
      const b = bbox(p);
      if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
      const a = b.w * b.h;
      if (a < area) { area = a; best = p; }
    }
    return best;
  }

  // ---------------- water makes plants grow ----------------
  function grow(p, amount) {
    const sp = SPECIES[p.sp];
    let a = amount / sp.thirst;
    if (p.burnt > 0) { const heal = Math.min(p.burnt, a * 3); p.burnt -= heal; a -= heal / 3; if (p.burnt < 0.02) p.burnt = 0; }
    if (a <= 0 || p.g >= 1) return;
    const before = p.g;
    p.g = Math.min(1, p.g + a);
    if (STAGES.some((s) => before < s && p.g >= s)) { p.pop = 1; sparkle(p, 8); }
  }
  /** Water (px of depth, as added to the ground) landed at x: plants with roots there drink it. */
  function waterAt(x, amount) {
    let drank = false;
    for (const p of plants) {
      const d = Math.abs(p.x - x);
      if (d > rootR(p)) continue;
      grow(p, amount);
      drank = true;
    }
    return drank;
  }
  function sparkle(p, n) {
    if (!spawn) return;
    const b = bbox(p);
    for (let i = 0; i < n; i++) spawn({ k: 'sparkle', x: p.x + (Math.random() - 0.5) * b.w * 0.8, y: b.y0 + Math.random() * b.h * 0.7, vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 0.6, g: -0.005, life: 50 + Math.random() * 30, r: 4 + Math.random() * 4 });
  }

  // ---------------- per-frame: growth tween + puddles ----------------
  function tick(dt) {
    for (const p of plants) {
      if (p.gv !== p.g) { const d = p.g - p.gv; p.gv = Math.abs(d) < 0.002 ? p.g : p.gv + d * Math.min(1, dt / 350); }
      if (p.pop > 0) p.pop = Math.max(0, p.pop - dt / 500);
    }
    acc += dt;
    if (acc < 300) return;
    acc = 0;
    // standing water around the roots is drunk slowly
    for (const p of plants) {
      if (p.g >= 1 && !p.burnt) continue;
      const sp = SPECIES[p.sp];
      if (sp.aquatic) continue;
      if (water.depthAt(p.x) < 1) continue;
      const got = water.take(p.x, 0.35, rootR(p));
      if (got > 0) grow(p, got);
    }
  }

  /** Per-frame visuals: autumn leaves and spring petals on the wind. */
  function particles(view, c, wind, t60) {
    if (!spawn) return;
    for (const p of plants) {
      const sp = SPECIES[p.sp];
      if (p.x < view.x - 300 || p.x > view.x + view.w + 300 || p.burnt > 0.5) continue;
      const b = bbox(p);
      if (b.y1 < view.y || b.y0 > view.y + view.h || p.gv < 0.5) continue;
      const crown = () => ({ x: p.x + (Math.random() - 0.5) * b.w * 0.7, y: b.y0 + b.h * 0.35 * Math.random() });
      if (sp.deciduous && c.seasonIdx === 2 && Math.random() < (0.01 + Math.abs(wind) * 0.02) * t60 * p.gv) {
        spawn({ k: 'leaf', ...crown(), vx: wind * 0.8, vy: 0.4, life: 900, ph: Math.random() * 6, col: sp.autumn === 'red' ? '#dd2e44' : ['#f4900c', '#ffcc4d', '#c1694f'][Math.floor(Math.random() * 3)] });
      }
      if (sp.overlay?.sprite === 'blossom' && c.seasonIdx === 0 && Math.random() < (0.015 + Math.abs(wind) * 0.03) * t60) {
        spawn({ k: 'leaf', ...crown(), vx: wind * 0.8, vy: 0.3, life: 700, ph: Math.random() * 6, col: '#f7b8c8', petal: true });
      }
    }
  }

  // ---------------- rendering ----------------
  function lookFor(sp, season, p) {
    if (p.burnt > 0.5) return 'burnt';
    if (!sp.deciduous) return season === 3 && !isTree(sp) ? 'dull' : 'n';
    if (season === 2) return sp.autumn === 'red' ? 'red' : 'autumn';
    if (season === 3) return 'winter';
    return 'n';
  }
  function draw(ctx, view, cam, c, t, weather) {
    const wind = weather?.wind || 0;
    const season = c.seasonIdx ?? 1;
    for (const p of plants) {
      const sp = SPECIES[p.sp];
      const H = height(p);
      if (p.x < view.x - H || p.x > view.x + view.w + H) continue;
      const by = baseY(p);
      if (by - H > view.y + view.h || by < view.y - 20) continue;
      const sprout = p.gv < STAGES[0];
      const pic = look(sprout ? 'seedling' : sp.sprite, sprout ? (p.burnt > 0.5 ? 'burnt' : 'n') : lookFor(sp, season, p));
      if (!pic) continue;
      const flex = isTree(sp) ? 0.6 : 1.6;
      let ang = (wind * 0.025 + Math.sin(t * (1.2 + p.seed) + p.seed * 20) * 0.018 * (0.6 + Math.abs(wind) * 0.5)) * flex;
      if (sp.followsSun && c.sunWX != null && !sprout) ang += clamp((c.sunWX - p.x) / 2000, -0.12, 0.12);
      const pop = 1 + Math.sin(p.pop * Math.PI) * 0.12;
      const w = H * pop, h = H * pop;
      ctx.save();
      ctx.translate(p.x, by);
      ctx.rotate(ang);
      // soft contact shadow
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      ctx.beginPath(); ctx.ellipse(0, -1, w * (isTree(sp) ? 0.22 : 0.18), Math.max(2, w * 0.03), 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(pic, -w / 2, -h, w, h);
      if (!sprout && p.burnt <= 0.5) drawExtras(ctx, p, sp, season, w, h);
      if (p.burning) { ctx.fillStyle = 'rgba(255,120,30,.22)'; ctx.beginPath(); ctx.ellipse(0, -h * 0.5, w * 0.4, h * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  // overlays (blossom, apples, maple leaves) and winter snow on the crown
  function drawExtras(ctx, p, sp, season, w, h) {
    const ov = sp.overlay;
    if (ov && p.gv >= 0.85 && ov.seasons.includes(season)) {
      const pic = look(ov.sprite, 'n');
      if (pic) {
        const s = w * 0.15;
        for (let i = 0; i < ov.n; i++) {
          const a = i * 2.39996 + p.seed * 9, r = Math.sqrt((i + 0.6) / ov.n);
          const ox = Math.cos(a) * r * w * 0.34, oy = -h * 0.6 + Math.sin(a) * r * h * 0.22;
          ctx.drawImage(pic, ox - s / 2, oy - s / 2, s, s);
        }
      }
    }
    if (season === 3) {
      // snow resting on the top of the crown / flower
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      const cap = { deciduous: [0.97, 0.26], evergreen: [0.97, 0.07], palm: [0.9, 0.16] }[sp.sprite] || [0.94, 0.14];
      const rx = w * cap[1], ry = Math.max(2, rx * 0.32);
      ctx.beginPath(); ctx.ellipse(0, -h * cap[0] + ry * 0.9, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------------- interactions + persistence ----------------
  function waterPlant(p) { water.add(p.x, 3, 40); }
  function canHarvest(p, season) { const ov = SPECIES[p.sp].overlay; return !!(ov?.fruit && ov.seasons.includes(season) && p.g >= 0.85 && p.burnt < 0.5); }
  function serialize() { return plants.map((p) => [p.sp, p.x, +p.g.toFixed(3), +p.seed.toFixed(4), +p.burnt.toFixed(2)]); }
  function load(arr) {
    plants = [];
    (arr || []).forEach((row) => {
      if (row.length >= 6) { const [sp, x, age, , seed, burnt] = row; add(sp, x, { g: clamp(age / 8, 0.1, 1), seed, burnt: burnt || 0 }); return; } // v3 format
      const [sp, x, g, seed, burnt] = row;
      add(sp, x, { g, seed, burnt: burnt || 0 });
    });
  }

  return {
    add, remove, byId, hit, bbox, size, height, stage, tick, draw, particles, waterAt, waterPlant, canHarvest, serialize, load,
    get list() { return plants; },
    get count() { return plants.length; },
  };
}
