// Living plants rooted in the terrain: procedural trees, shrubs, flowers, crops, desert plants and more.
// They grow with soil moisture + warmth, follow the seasons (buds, blossom, green, autumn colours, leaf
// fall, bare winter branches with snow), sway with the wind, wilt in drought, drown when flooded,
// freeze below their cold limit, burn in fires and regrow, and spread seeds on the wind.
// Plants are drawn on the world canvas (not DOM), so a forest stays cheap.

import { SPECIES } from './species.js';

const MAX_PLANTS = 520;
const rngOf = (seed) => { let a = (seed * 4294967296) >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a, b, t) => { if (!a) return b; if (!b) return a; const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const shade = (c, k) => { if (!c) return c; const m = c.startsWith('rgb') ? c.match(/\d+/g).map(Number) : hex(c); return `rgb(${m.map((v) => clamp(Math.round(v * k), 0, 255)).join(',')})`; };
let nextId = 1;

export function createFlora({ terrain, water, spawn }) {
  let plants = [];
  let acc = 0;
  let accMin = 0;

  const S = (x) => terrain.surfaceY(x);
  function baseY(p) {
    const sp = SPECIES[p.sp];
    if (sp.aquatic) { const ws = water.surfaceAt(p.x, 4); return ws ?? S(p.x); }
    return S(p.x) + 4;
  }
  function size(p) { const sp = SPECIES[p.sp]; return clamp(Math.pow(Math.max(0, p.age) / sp.days, 0.75), 0.06, 1); }
  function bbox(p) {
    const sp = SPECIES[p.sp], s = size(p), h = sp.h * s, w = Math.max(30, h * (sp.form === 'tree' ? 0.9 : sp.form === 'vinecrop' ? 2.4 : sp.form === 'hedge' ? 2 : 0.6));
    const y = baseY(p);
    return { x0: p.x - w / 2, x1: p.x + w / 2, y0: y - h, y1: y + 6, h, w };
  }

  function add(sp, x, { age = null, seed = Math.random(), hp = 1 } = {}) {
    if (!SPECIES[sp] || plants.length >= MAX_PLANTS) return null;
    const p = { id: `f${nextId++}`, sp, x: Math.round(x), age: age ?? SPECIES[sp].days * 0.18, hp, seed, burnt: 0, dry: 0 };
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

  // ---------------- simulation ----------------
  function tick(dt, worldMin, c, weather) {
    acc += dt; accMin += worldMin;
    if (acc < 400) return;
    const days = accMin / 1440;
    acc = 0; accMin = 0;
    if (days <= 0) return;
    const season = c.seasonIdx;
    const dormant = season === 3;
    const born = [];
    for (const p of plants) {
      const sp = SPECIES[p.sp];
      if (sp.dead) continue;
      const m = water.moistureAt(p.x);
      const flood = !sp.aquatic && water.depthAt(p.x) > 30;
      const inWater = water.depthAt(p.x) > 8;
      let wF = sp.aquatic ? (inWater ? 1 : 0) : sp.drought ? 1 : clamp((m - sp.need * 0.4) / (sp.need * 0.5 + 0.01), 0, 1);
      const tF = c.temp < 4 ? 0.15 : c.temp > 35 ? 0.5 : 1;
      const grow = days / sp.days * wF * tF * (dormant && !sp.evergreen ? 0.1 : 1) * (p.burnt > 0.5 ? 1.6 : 1);
      p.age += grow * sp.days;
      // health
      let dhp = 0.25 * days;
      if (!sp.aquatic && !sp.drought && m < sp.need * 0.35) { dhp = -0.6 * days; p.dry = clamp(p.dry + days * 1.5, 0, 1); } else p.dry = clamp(p.dry - days * 2, 0, 1);
      if (flood) dhp = -0.5 * days;
      if (sp.aquatic && !inWater) dhp = -0.8 * days;
      if (c.temp < sp.cold) dhp = -1.5 * days;
      if (weather.hail > 0 && (sp.form === 'flower' || sp.form === 'vinecrop')) dhp -= weather.hail * days * 2;
      p.hp = clamp(p.hp + dhp, 0, 1);
      if (p.burnt > 0 && p.burnt < 1 && !p.burning) p.burnt = Math.max(0, p.burnt - days * 0.15);
      // drink
      if (!sp.aquatic) water.drink?.(p.x, days * 0.02 * size(p));
      // death
      if (p.hp <= 0) { if (sp.form === 'tree' || sp.form === 'conifer') { p.sp = 'deadtree'; p.hp = 1; } else p.gone = true; continue; }
      // seeding
      const mature = p.age >= sp.days;
      if (mature && (season === 0 || season === 1 || (season === 2 && sp.form === 'tree')) && Math.random() < days * 0.25 * (sp.spreads || 1) && plants.length + born.length < MAX_PLANTS) {
        const wind = weather.wind || 0;
        const dist = (60 + Math.random() * (sp.form === 'tree' ? 500 : 260)) * (Math.random() < 0.5 + clamp(wind * 0.15, -0.4, 0.4) ? 1 : -1);
        const nx = p.x + dist;
        const tooClose = plants.some((q) => Math.abs(q.x - nx) < Math.max(26, SPECIES[q.sp].h * 0.18));
        const mat = terrain.matAt(nx);
        if (!tooClose && mat !== 'rock' && (sp.aquatic ? water.depthAt(nx) > 10 : water.depthAt(nx) < 4)) born.push([p.sp, nx]);
      }
    }
    plants = plants.filter((p) => !p.gone);
    for (const [sp, x] of born) add(sp, x, { age: 0 });
  }

  /** Per-frame visuals: autumn leaves, spring petals, dandelion seeds on the wind. */
  function particles(view, c, wind, t60) {
    if (!spawn) return;
    for (const p of plants) {
      const sp = SPECIES[p.sp];
      if (p.x < view.x - 300 || p.x > view.x + view.w + 300) continue;
      const b = bbox(p);
      if (b.y1 < view.y || b.y0 > view.y + view.h) continue;
      const s = size(p);
      if (sp.form === 'tree' && !sp.evergreen && !sp.dead && c.seasonIdx === 2 && s > 0.3 && Math.random() < (0.015 + Math.abs(wind) * 0.02) * t60 * s) {
        spawn({ k: 'leaf', x: p.x + (Math.random() - 0.5) * b.w * 0.7, y: b.y0 + b.h * 0.3 * Math.random(), vx: wind * 0.8, vy: 0.4, life: 900, ph: Math.random() * 6, col: sp.leaves[2] });
      }
      if (sp.petals && c.seasonIdx === 0 && s > 0.4 && Math.random() < (0.02 + Math.abs(wind) * 0.03) * t60) {
        spawn({ k: 'leaf', x: p.x + (Math.random() - 0.5) * b.w * 0.7, y: b.y0 + b.h * 0.3 * Math.random(), vx: wind * 0.8, vy: 0.3, life: 700, ph: Math.random() * 6, col: sp.petals, petal: true });
      }
      if (sp.head === 'dandelion' && c.seasonIdx === 1 && Math.abs(wind) > 0.8 && Math.random() < 0.02 * t60) {
        spawn({ k: 'fluff', x: p.x, y: b.y0, vx: wind * 1.2, vy: -0.6, life: 600, ph: Math.random() * 6 });
      }
    }
  }

  // ---------------- rendering ----------------
  function leafState(sp, c) {
    const s = c.seasonIdx, k = c.seasonProgress;
    if (sp.evergreen) return { density: 1, color: sp.leaves[s] || sp.leaves[1] };
    if (s === 0) return { density: 0.3 + 0.7 * k, color: sp.blossom && k < 0.55 ? sp.blossom : mixHex(sp.leaves[0], sp.leaves[1], k), blossom: !!sp.blossom && k < 0.55 };
    if (s === 1) return { density: 1, color: sp.leaves[1] };
    if (s === 2) return { density: Math.max(0, 1 - k * 1.05), color: mixHex(sp.leaves[1], sp.leaves[2], Math.min(1, k * 1.8)) };
    return { density: 0, color: null };
  }

  function draw(ctx, view, cam, c, t, weather) {
    const wind = weather.wind || 0;
    const z = cam.z;
    for (const p of plants) {
      const sp = SPECIES[p.sp];
      if (p.x < view.x - sp.h || p.x > view.x + view.w + sp.h) continue;
      const by = baseY(p);
      const s = size(p);
      if (by - sp.h * s > view.y + view.h || by < view.y - 20) continue;
      ctx.save();
      ctx.translate(p.x, by);
      const sway = (k) => (wind * 0.03 + Math.sin(t * (1.3 + p.seed) + p.seed * 20) * 0.02 * (0.5 + Math.abs(wind) * 0.4)) * k;
      const ls = leafState(sp, c);
      const wilt = Math.max(p.dry, 1 - p.hp);
      const charred = p.burnt > 0.5 || sp.dead;
      try { drawForm(ctx, p, sp, s, ls, sway, c, t, z, wilt, charred, weather); } catch { /* never break the frame */ }
      if (p.burning) { ctx.fillStyle = 'rgba(255,120,30,.25)'; ctx.beginPath(); ctx.ellipse(0, -sp.h * s * 0.5, sp.h * s * 0.4, sp.h * s * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawForm(ctx, p, sp, s, ls, sway, c, t, z, wilt, charred, weather) {
    const H = sp.h * s;
    const rng = rngOf(p.seed);
    const tint = (col) => (charred ? '#2b2522' : wilt > 0.4 ? mixHex(col?.startsWith('#') ? col : '#4f9f35', '#a08a4a', wilt * 0.8) : col);
    const snow = (weather.snow || 0) > 0.15 && c.seasonIdx === 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (sp.form) {
      case 'tree': {
        const depth = Math.max(2, Math.min(sp.depth, Math.round(sp.depth * Math.min(1, (H * z) / 120) + 1)));
        const trunkLen = H * (sp.crown === 'flat' ? 0.5 : 0.34);
        const trunkW = Math.max(2, H * 0.05 * (sp.thick || 1));
        const leafR = H * (sp.crown === 'droop' ? 0.07 : 0.1) * (0.6 + ls.density * 0.4);
        const showLeaves = !charred && ls.density > 0.02 && ls.color;
        const fruitOn = sp.fruit && sp.fruitSeason?.includes(c.seasonIdx) && s > 0.75 && !charred;
        const bark = charred ? '#231d1a' : sp.trunk;
        const branch = (len, w, d) => {
          ctx.strokeStyle = bark; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke();
          if (sp.bark && w > 3 && d > depth - 2) { ctx.strokeStyle = sp.bark; ctx.lineWidth = Math.max(1, w * 0.18); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.3, -len * i / 4); ctx.lineTo(w * 0.2, -len * i / 4 - 2); ctx.stroke(); } }
          ctx.translate(0, -len);
          if (d === 0) {
            if (showLeaves) {
              const r = leafR * (0.8 + rng() * 0.5);
              if (sp.crown === 'droop') {
                // willow strands hang straight down whatever the branch angle
                const m = ctx.getTransform();
                ctx.rotate(-Math.atan2(m.b, m.a));
                ctx.strokeStyle = tint(ls.color); ctx.lineWidth = Math.max(1, r * 0.07);
                for (let i = 0; i < 7; i++) { const ox = (rng() - 0.5) * r; ctx.beginPath(); ctx.moveTo(ox, 0); ctx.quadraticCurveTo(ox + sway(30), r * 1.5, ox + sway(60), r * (2.6 + rng())); ctx.stroke(); }
              } else {
                ctx.fillStyle = shade(tint(ls.color), 0.82);
                ctx.beginPath(); ctx.arc(r * 0.25, r * 0.2, r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = tint(ls.color);
                ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.1, r * 0.92, 0, Math.PI * 2); ctx.fill();
                if (ls.blossom) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
                if (snow) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.ellipse(0, -r * 0.7, r * 0.8, r * 0.3, 0, Math.PI, 0); ctx.fill(); }
              }
              if (fruitOn && rng() < 0.6) { ctx.fillStyle = sp.fruit; ctx.beginPath(); ctx.arc((rng() - 0.5) * r, r * 0.4, Math.max(3, H * 0.022), 0, Math.PI * 2); ctx.fill(); }
            } else if (snow && !charred) { ctx.strokeStyle = '#fbfdff'; ctx.lineWidth = Math.max(1.5, w * 0.6); ctx.beginPath(); ctx.moveTo(-w, -1); ctx.lineTo(w, -1); ctx.stroke(); }
            return;
          }
          const kids = sp.crown === 'narrow' ? 2 : rng() < 0.4 ? 3 : 2;
          for (let i = 0; i < kids; i++) {
            ctx.save();
            const base = kids === 1 ? 0 : (i / (kids - 1) - 0.5) * 2 * sp.spread;
            const up = sp.crown === 'flat' && d === depth ? base * 1.4 : base;
            ctx.rotate(up + (rng() - 0.5) * 0.3 + sway((depth - d + 1) * 0.6));
            branch(len * (sp.crown === 'flat' ? 0.6 : 0.72) * (0.85 + rng() * 0.3), w * 0.66, d - 1);
            ctx.restore();
          }
        };
        ctx.save(); ctx.rotate(sway(0.3) - (wilt > 0.6 ? 0.05 : 0));
        branch(trunkLen, trunkW, depth);
        ctx.restore();
        break;
      }
      case 'conifer': {
        ctx.strokeStyle = charred ? '#231d1a' : sp.trunk; ctx.lineWidth = Math.max(2, H * 0.035);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sway(H * 0.1), -H); ctx.stroke();
        if (charred) break;
        const n = Math.max(3, Math.round(6 * Math.min(1, H * z / 100) + 1));
        for (let i = 0; i < n; i++) {
          const k = i / n, y = -H * (0.15 + k * 0.82), w = H * 0.32 * (1 - k * 0.8), hh = H * 0.22;
          const off = sway(H * 0.12 * (0.4 + k));
          ctx.fillStyle = shade(tint(ls.color), 0.85 + (i % 2) * 0.15);
          ctx.beginPath(); ctx.moveTo(off - w, y); ctx.lineTo(off * 1.2, y - hh); ctx.lineTo(off + w, y); ctx.closePath(); ctx.fill();
          if (snow) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.moveTo(off - w * 0.55, y - hh * 0.45); ctx.lineTo(off * 1.2, y - hh); ctx.lineTo(off + w * 0.55, y - hh * 0.45); ctx.closePath(); ctx.fill(); }
        }
        break;
      }
      case 'columnar': {
        ctx.fillStyle = charred ? '#231d1a' : shade(tint(ls.color), 0.9);
        ctx.beginPath(); ctx.ellipse(sway(H * 0.06), -H * 0.52, H * 0.11, H * 0.5, sway(0.4), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = charred ? '#231d1a' : tint(ls.color);
        ctx.beginPath(); ctx.ellipse(sway(H * 0.06) - H * 0.03, -H * 0.55, H * 0.07, H * 0.42, sway(0.4), 0, Math.PI * 2); ctx.fill();
        if (snow) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.ellipse(sway(H * 0.08), -H * 0.98, H * 0.05, H * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'palm': {
        const tx = sway(H * 0.15) + H * 0.08, ty = -H;
        ctx.strokeStyle = charred ? '#231d1a' : sp.trunk; ctx.lineWidth = Math.max(2, H * 0.05);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(H * 0.12, -H * 0.5, tx, ty); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = Math.max(1, H * 0.01);
        for (let i = 1; i < 10; i++) { const k = i / 10; const x = 2 * (1 - k) * k * H * 0.12 + k * k * tx, y = 2 * (1 - k) * k * (-H * 0.5) + k * k * ty; ctx.beginPath(); ctx.moveTo(x - H * 0.025, y); ctx.lineTo(x + H * 0.025, y - 2); ctx.stroke(); }
        if (charred) break;
        ctx.fillStyle = tint(ls.color);
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i / 7 - 0.5) * 3.2 + sway(1.2);
          const L = H * 0.42;
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.18, L, L * 0.3); ctx.quadraticCurveTo(L * 0.5, L * 0.05, 0, 0); ctx.fill();
          ctx.restore();
        }
        if (sp.fruitSeason?.includes(c.seasonIdx) && s > 0.8) { ctx.fillStyle = sp.fruit; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tx - 8 + i * 8, ty + 10, H * 0.022, 0, Math.PI * 2); ctx.fill(); } }
        break;
      }
      case 'bush': case 'hedge': {
        if (sp.form === 'hedge') {
          ctx.fillStyle = shade(tint(ls.color), 0.8); roundRect(ctx, -H * 0.95 + sway(4), -H, H * 1.9, H, H * 0.25); ctx.fill();
          ctx.fillStyle = tint(ls.color); roundRect(ctx, -H * 0.9 + sway(6), -H * 0.95, H * 1.8, H * 0.6, H * 0.22); ctx.fill();
          if (snow) { ctx.fillStyle = '#fbfdff'; roundRect(ctx, -H * 0.95, -H * 1.04, H * 1.9, H * 0.14, H * 0.07); ctx.fill(); }
          break;
        }
        if (ls.density < 0.05 || charred) {
          ctx.strokeStyle = charred ? '#231d1a' : '#6b5a44'; ctx.lineWidth = Math.max(1, H * 0.03);
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((rng() - 0.5) * H * 1.1 + sway(H * 0.2), -H * (0.5 + rng() * 0.5)); ctx.stroke(); }
          break;
        }
        for (let i = 0; i < 9; i++) {
          const x = (rng() - 0.5) * H * 1.1, y = -H * (0.3 + rng() * 0.5), r = H * (0.25 + rng() * 0.15) * (0.6 + ls.density * 0.4);
          ctx.fillStyle = shade(tint(ls.color), 0.8 + rng() * 0.3);
          ctx.beginPath(); ctx.arc(x + sway(H * 0.25 * -y / H), y, r, 0, Math.PI * 2); ctx.fill();
        }
        const fl = sp.flower && sp.flowerSeason?.includes(c.seasonIdx), fr = sp.fruit && sp.fruitSeason?.includes(c.seasonIdx) && s > 0.7;
        if ((fl || fr) && !charred) for (let i = 0; i < 9; i++) { ctx.fillStyle = fl ? sp.flower : sp.fruit; ctx.beginPath(); ctx.arc((rng() - 0.5) * H + sway(H * 0.2), -H * (0.3 + rng() * 0.6), Math.max(2.5, H * 0.06), 0, Math.PI * 2); ctx.fill(); }
        if (snow) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.ellipse(0, -H * 0.85, H * 0.5, H * 0.14, 0, Math.PI, 0); ctx.fill(); }
        break;
      }
      case 'fern': {
        ctx.strokeStyle = tint(ls.color || '#8a7a4a'); ctx.lineWidth = Math.max(1, H * 0.03);
        for (let i = 0; i < 7; i++) {
          const a = (i / 6 - 0.5) * 2.2 + sway(1);
          ctx.save(); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(H * 0.1, -H * 0.6, H * 0.35 * Math.sign(a || 1), -H * 0.85); ctx.stroke();
          for (let j = 1; j < 8; j++) { const k = j / 8; ctx.beginPath(); ctx.moveTo(H * 0.05 * k, -H * 0.8 * k); ctx.lineTo(H * 0.05 * k + H * 0.1 * (1 - k), -H * 0.8 * k - H * 0.06); ctx.moveTo(H * 0.05 * k, -H * 0.8 * k); ctx.lineTo(H * 0.05 * k - H * 0.1 * (1 - k), -H * 0.8 * k - H * 0.06); ctx.stroke(); }
          ctx.restore();
        }
        break;
      }
      case 'bamboo': {
        const n = 3 + Math.floor(rng() * 3);
        for (let i = 0; i < n; i++) {
          const x = (i - n / 2) * H * 0.05, h = H * (0.7 + rng() * 0.3), bend = sway(h * 0.15) * (1 + i * 0.1);
          ctx.strokeStyle = charred ? '#231d1a' : '#8bb85a'; ctx.lineWidth = Math.max(2, H * 0.025);
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x, -h * 0.5, x + bend, -h); ctx.stroke();
          ctx.strokeStyle = '#5f8a3a'; ctx.lineWidth = Math.max(1, H * 0.006);
          for (let j = 1; j < 8; j++) { const k = j / 8; const px = x + bend * k * k; ctx.beginPath(); ctx.moveTo(px - H * 0.014, -h * k); ctx.lineTo(px + H * 0.014, -h * k); ctx.stroke(); }
          if (!charred) { ctx.fillStyle = tint(ls.color); for (let j = 0; j < 4; j++) { ctx.save(); ctx.translate(x + bend * 0.9, -h * (0.7 + j * 0.08)); ctx.rotate((j % 2 ? 1 : -1) * 0.9 + sway(1)); ctx.beginPath(); ctx.ellipse(H * 0.05, 0, H * 0.06, H * 0.012, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
        }
        break;
      }
      case 'flower': case 'lavender': {
        const n = sp.form === 'lavender' ? 7 : 1;
        const bloom = sp.flowerSeason?.includes(c.seasonIdx) && s > 0.55 && !charred;
        for (let i = 0; i < n; i++) {
          const x = n > 1 ? (i - (n - 1) / 2) * H * 0.07 : 0;
          const h = H * (n > 1 ? 0.8 + rng() * 0.2 : 1) * (1 - wilt * 0.3);
          const tx = x + sway(h * 0.35) + (n > 1 ? x * 0.4 : 0), ty = -h;
          ctx.strokeStyle = charred ? '#231d1a' : tint('#4f9f35'); ctx.lineWidth = Math.max(1.2, H * 0.03);
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x, -h * 0.5, tx, ty + wilt * h * 0.3); ctx.stroke();
          if (n === 1 && !charred) { ctx.fillStyle = tint(ls.color || '#4f9f35'); for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * H * 0.08, -h * 0.3, H * 0.09, H * 0.03, sg * -0.6, 0, Math.PI * 2); ctx.fill(); } }
          if (!bloom) continue;
          drawHead(ctx, sp, tx, ty + wilt * h * 0.3, H, c, rng);
        }
        break;
      }
      case 'lily': {
        ctx.fillStyle = tint(ls.color || '#4fa83a');
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse((i - 1) * H * 1.3 + sway(4), 0, H * 0.9, H * 0.28, 0, 0.3, Math.PI * 2); ctx.fill(); }
        if (sp.flowerSeason.includes(c.seasonIdx) && s > 0.5) { ctx.fillStyle = sp.flower; for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(0, -H * 0.2); ctx.rotate((i / 6 - 0.5) * 2.4); ctx.beginPath(); ctx.ellipse(0, -H * 0.3, H * 0.12, H * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -H * 0.25, H * 0.1, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'stalks': {
        const n = 6;
        for (let i = 0; i < n; i++) {
          const x = (i - n / 2) * H * 0.09, h = H * (0.85 + rng() * 0.15), tx = x + sway(h * 0.55);
          const col = tint(ls.color || '#c8b050');
          ctx.strokeStyle = charred ? '#231d1a' : col; ctx.lineWidth = Math.max(1, H * (sp.head === 'corn' ? 0.04 : 0.018));
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x, -h * 0.5, tx, -h); ctx.stroke();
          if (charred || s < 0.5) continue;
          if (sp.head === 'wheat') {
            ctx.fillStyle = c.seasonIdx === 0 ? '#9ad06a' : '#e2bf55';
            for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.ellipse(tx + (j % 2 ? 2 : -2), -h - j * H * 0.035, H * 0.018, H * 0.03, (j % 2 ? 0.5 : -0.5), 0, Math.PI * 2); ctx.fill(); }
          } else {
            ctx.fillStyle = tint('#4f9f35');
            for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sg * H * 0.08 + sway(h * 0.2), -h * 0.55, H * 0.1, H * 0.018, sg * -0.5, 0, Math.PI * 2); ctx.fill(); }
            if (c.seasonIdx >= 1) { ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.ellipse(x + H * 0.04 + sway(h * 0.3), -h * 0.62, H * 0.025, H * 0.07, 0.3, 0, Math.PI * 2); ctx.fill(); }
          }
        }
        break;
      }
      case 'vinecrop': {
        ctx.fillStyle = tint(ls.color || '#a89040');
        for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc((rng() - 0.5) * H * 4 + sway(4), -H * (0.2 + rng() * 0.4), H * (0.22 + rng() * 0.12), 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = tint('#4f9f35'); ctx.lineWidth = Math.max(1, H * 0.04);
        ctx.beginPath(); ctx.moveTo(-H * 2, -4); ctx.bezierCurveTo(-H, -H * 0.3, H, H * 0.1, H * 2, -6); ctx.stroke();
        if (sp.fruitSeason?.includes(c.seasonIdx) && s > 0.6 && !charred) {
          for (let i = 0; i < (sp.fruitSize < 0.5 ? 6 : 2); i++) {
            const fx = (rng() - 0.5) * H * 3, fr = H * 0.45 * sp.fruitSize * (0.7 + s * 0.3);
            ctx.fillStyle = sp.fruit; ctx.beginPath(); ctx.ellipse(fx, -fr * 0.8, fr * 1.2, fr * 0.9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = sp.stripes ? '#1f6a2a' : 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, fr * 0.12);
            for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(fx + k * fr * 0.4, -fr * 0.8, fr * 0.25, fr * 0.85, 0, 0, Math.PI * 2); ctx.stroke(); }
            if (sp.fruitSize < 0.5) { ctx.fillStyle = '#fff3a0'; for (let k = 0; k < 3; k++) ctx.fillRect(fx - fr * 0.4 + k * fr * 0.35, -fr, 1.5, 1.5); }
          }
        }
        break;
      }
      case 'carrot': {
        ctx.strokeStyle = tint(ls.color || '#6a9a3a'); ctx.lineWidth = Math.max(1, H * 0.035);
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo((i - 2.5) * H * 0.1, -H * 0.5, (i - 2.5) * H * 0.18 + sway(H * 0.3), -H * (0.8 + rng() * 0.2)); ctx.stroke(); }
        ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.ellipse(0, 2, H * 0.12 * s, H * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'tomato': {
        ctx.strokeStyle = '#a07a50'; ctx.lineWidth = Math.max(1, H * 0.025);
        ctx.beginPath(); ctx.moveTo(H * 0.12, 0); ctx.lineTo(H * 0.12, -H * 1.05); ctx.stroke();
        ctx.strokeStyle = tint('#3f8f2c'); ctx.lineWidth = Math.max(1, H * 0.03);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(H * 0.2, -H * 0.3, -H * 0.15, -H * 0.6, sway(H * 0.15), -H); ctx.stroke();
        ctx.fillStyle = tint(ls.color || '#3f8f2c');
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse((rng() - 0.5) * H * 0.5 + sway(H * 0.1), -H * (0.2 + rng() * 0.7), H * 0.09, H * 0.05, rng() * 3, 0, Math.PI * 2); ctx.fill(); }
        if (sp.fruitSeason.includes(c.seasonIdx) && s > 0.7 && !charred) { ctx.fillStyle = sp.fruit; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((rng() - 0.5) * H * 0.45, -H * (0.25 + rng() * 0.55), H * 0.07, 0, Math.PI * 2); ctx.fill(); } }
        break;
      }
      case 'cactus': {
        const w = H * 0.16, col = charred ? '#231d1a' : tint(ls.color);
        ctx.fillStyle = col; roundRect(ctx, -w / 2 + sway(2), -H, w, H, w / 2); ctx.fill();
        if (s > 0.45) {
          for (const [sg, y0, hh] of [[-1, 0.45, 0.28], [1, 0.6, 0.22]]) { ctx.save(); ctx.translate(sg * w / 2, -H * y0); roundRect(ctx, sg > 0 ? 0 : -w * 0.9, -w * 0.35, w * 0.9, w * 0.7, w * 0.35); ctx.fill(); roundRect(ctx, sg > 0 ? w * 0.35 : -w * 0.9, -H * hh, w * 0.55, H * hh, w * 0.28); ctx.fill(); ctx.restore(); }
        }
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, w * 0.06);
        for (const k of [-0.2, 0.2]) { ctx.beginPath(); ctx.moveTo(w * k, -H * 0.95); ctx.lineTo(w * k, -4); ctx.stroke(); }
        if (sp.flowerSeason.includes(c.seasonIdx) && s > 0.6 && !charred) { ctx.fillStyle = sp.flower; ctx.beginPath(); ctx.arc(0, -H - w * 0.15, w * 0.3, 0, Math.PI * 2); ctx.fill(); }
        if (snow) { ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.ellipse(0, -H, w * 0.5, w * 0.2, 0, Math.PI, 0); ctx.fill(); }
        break;
      }
      case 'rosette': {
        ctx.fillStyle = charred ? '#231d1a' : tint(ls.color);
        for (let i = 0; i < 9; i++) { ctx.save(); ctx.rotate((i / 8 - 0.5) * 2.4 + sway(0.3)); ctx.beginPath(); ctx.moveTo(-H * 0.06, 0); ctx.quadraticCurveTo(0, -H * 0.6, 0, -H); ctx.quadraticCurveTo(0, -H * 0.6, H * 0.06, 0); ctx.fill(); ctx.restore(); }
        if (sp.flowerSeason.includes(c.seasonIdx) && s > 0.7) { ctx.strokeStyle = '#6a8a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -H * 0.5); ctx.lineTo(sway(10), -H * 1.7); ctx.stroke(); ctx.fillStyle = sp.flower; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(sway(10), -H * (1.3 + i * 0.07), 4, 7, 0, 0, Math.PI * 2); ctx.fill(); } }
        break;
      }
      case 'mushroom': {
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * H * 0.8, h = H * (0.6 + rng() * 0.5), r = H * (0.45 + rng() * 0.25);
          ctx.fillStyle = '#f4ead8'; roundRect(ctx, x - r * 0.25, -h, r * 0.5, h, r * 0.2); ctx.fill();
          ctx.fillStyle = sp.flower; ctx.beginPath(); ctx.ellipse(x, -h, r, r * 0.65, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + (k - 1) * r * 0.45, -h - r * 0.3 - (k % 2) * r * 0.12, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
          if (!c.isDay) { ctx.fillStyle = 'rgba(160,255,200,.25)'; ctx.beginPath(); ctx.arc(x, -h * 0.8, r * 1.4, 0, Math.PI * 2); ctx.fill(); }
        }
        break;
      }
      case 'reeds': {
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * H * 0.05, h = H * (0.7 + rng() * 0.3), tx = x + sway(h * 0.3);
          ctx.strokeStyle = tint(ls.color); ctx.lineWidth = Math.max(1, H * 0.012);
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x, -h * 0.6, tx, -h); ctx.stroke();
          if (i % 2) { ctx.fillStyle = '#6b4226'; roundRect(ctx, tx - H * 0.018, -h * 0.92, H * 0.036, H * 0.14, H * 0.018); ctx.fill(); }
        }
        break;
      }
      case 'tuft': {
        ctx.strokeStyle = tint(ls.color); ctx.lineWidth = Math.max(1, H * 0.035);
        for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.sin(a) * H * 0.3, -H * 0.6, Math.sin(a) * H * 0.6 + sway(H * 0.5), -H * (0.7 + rng() * 0.3)); ctx.stroke(); }
        break;
      }
      case 'clover': {
        ctx.fillStyle = tint(ls.color || '#6a9a3a');
        for (let i = 0; i < 5; i++) { const x = (rng() - 0.5) * H * 3, y = -H * (0.4 + rng() * 0.5); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 2.1) * H * 0.18, y + Math.sin(k * 2.1) * H * 0.18, H * 0.2, 0, Math.PI * 2); ctx.fill(); } }
        if (sp.flowerSeason.includes(c.seasonIdx)) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc((rng() - 0.5) * H * 2, -H * 1.1, H * 0.22, 0, Math.PI * 2); ctx.fill(); } }
        break;
      }
      default: break;
    }
  }

  function drawHead(ctx, sp, x, y, H, c, rng) {
    const col = sp.flower;
    switch (sp.head) {
      case 'tulip':
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - H * 0.13, y); ctx.quadraticCurveTo(x - H * 0.15, y - H * 0.3, x - H * 0.06, y - H * 0.25); ctx.lineTo(x, y - H * 0.32); ctx.lineTo(x + H * 0.06, y - H * 0.25); ctx.quadraticCurveTo(x + H * 0.15, y - H * 0.3, x + H * 0.13, y); ctx.closePath(); ctx.fill();
        break;
      case 'sunflower': {
        // the head turns to follow the sun
        const face = Math.max(-0.5, Math.min(0.5, c.sunX * 0.4)) * (c.isDay ? 1 : 0.2);
        ctx.save(); ctx.translate(x, y); ctx.rotate(face);
        ctx.fillStyle = col;
        for (let i = 0; i < 14; i++) { ctx.save(); ctx.rotate((i / 14) * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -H * 0.12, H * 0.035, H * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.arc(0, 0, H * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }
      case 'daisy': case 'poppy': {
        const petals = sp.head === 'daisy' ? 10 : 5, r = H * (sp.head === 'daisy' ? 0.14 : 0.2);
        ctx.fillStyle = col;
        for (let i = 0; i < petals; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate((i / petals) * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * (sp.head === 'daisy' ? 0.22 : 0.5), r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = sp.head === 'daisy' ? '#ffd23f' : '#1d1d1d'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'dandelion':
        if (c.seasonIdx === 1 && c.seasonProgress > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * H * 0.22, y + Math.sin(a) * H * 0.22); ctx.stroke(); } }
        else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, H * 0.14, 0, Math.PI * 2); ctx.fill(); }
        break;
      default:
        if (sp.form === 'lavender') { ctx.fillStyle = col; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x, y + i * H * 0.05, H * 0.03, H * 0.04, 0, 0, Math.PI * 2); ctx.fill(); } }
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)) : ctx.rect(x, y, w, h); }

  // ---------------- interactions + persistence ----------------
  function waterPlant(p) { water.add(p.x, 30, 120); p.dry = 0; }
  function harvest(p) {
    const sp = SPECIES[p.sp];
    if (!sp.fruit || !sp.fruitSeason?.includes(p._season ?? -1)) return 0;
    return 1;
  }
  function serialize() { return plants.map((p) => [p.sp, p.x, +p.age.toFixed(3), +p.hp.toFixed(2), +p.seed.toFixed(4), +p.burnt.toFixed(2)]); }
  function load(arr) { plants = []; (arr || []).forEach(([sp, x, age, hp, seed, burnt]) => { const p = add(sp, x, { age, hp, seed }); if (p) p.burnt = burnt || 0; }); }

  return {
    add, remove, byId, hit, bbox, size, tick, draw, particles, waterPlant, harvest, serialize, load,
    get list() { return plants; },
    get count() { return plants.length; },
  };
}
