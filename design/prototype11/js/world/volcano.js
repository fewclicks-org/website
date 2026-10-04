// Volcanoes: drag one onto the ground and it builds a cone of rock with a crater, fed by a magma chamber
// deep in the soil cross-section. Tap the crater to erupt: it rumbles, then throws glowing lava bombs and
// an ash column, and lava pours over the rim and runs downhill. Lava sets grass and plants on fire, boils
// water into steam, and cools into new rock, so the cone grows with every eruption.

import { BEDROCK } from './terrain.js';

const R = 900; // cone radius (px, 1 m = 100 px)
const H = 550; // cone height
const CRATER = 0.13; // crater radius as a share of the cone
const RUMBLE = 2600, ERUPT = 11000; // ms
const MAX_LAVA = 500;
let nextId = 1;

export function createVolcano({ terrain, water, fire, flora, spawn, sfx, clockGet, api = {}, reduced = false }) {
  let vents = [];
  const lava = []; // bombs (flying) + flows (running on the ground)
  const G = terrain.groundY;

  // cone profile (concave slopes) with a crater dip at the top
  const cone = (k) => (d) => {
    const a = Math.abs(d);
    const body = H * Math.pow(1 - a, 1.35);
    const dip = a < CRATER ? 70 * Math.cos((a / CRATER) * Math.PI / 2) ** 2 : 0;
    return k * (body - dip);
  };
  function build(x) {
    terrain.shape(x, R, cone(1));
    terrain.paint('rock', x - R * 0.62, x + R * 0.62);
    const v = { id: `v${nextId++}`, x: Math.round(x), phase: 'calm', t: 0, glow: 0.4 };
    vents.push(v);
    return v;
  }
  function remove(id) {
    const v = vents.find((q) => q.id === id);
    if (!v) return;
    terrain.shape(v.x, R, cone(-1));
    terrain.paint('grass', v.x - R * 0.62, v.x + R * 0.62);
    vents = vents.filter((q) => q !== v);
  }
  const crater = (v) => ({ x: v.x, y: terrain.surfaceY(v.x) });
  /** The volcano whose crater / upper cone is at world (x, y), or null. */
  function hit(x, y) {
    for (const v of vents) {
      if (Math.abs(x - v.x) > R * 0.35) continue;
      const s = terrain.surfaceY(x);
      if (y > s - 260 && y < s + 60) return v;
    }
    return null;
  }
  function erupt(v) {
    if (v.phase !== 'calm') return;
    v.phase = 'rumble'; v.t = 0;
    api.quake?.(RUMBLE + 1500);
    sfx?.thunder?.();
  }
  function calm(v) { v.phase = 'calm'; v.t = 0; }

  // ---------------- simulation ----------------
  let acc = 0;
  function tick(dt, wind = 0) {
    const k = Math.min(3, dt / 16.667);
    for (const v of vents) {
      v.t += dt;
      const c = crater(v);
      if (v.phase === 'rumble') {
        v.glow = Math.min(1, v.glow + dt / RUMBLE);
        if (Math.random() < 0.3 * k) spawn({ k: 'smoke', x: c.x + (Math.random() - 0.5) * 80, y: c.y - 10, vx: wind * 0.4, vy: -1, life: 90, r: 14 });
        if (Math.random() < 0.08 * k) api.nudgeNear?.(v.x, R * 1.2, 2.5);
        if (v.t > RUMBLE) { v.phase = 'erupt'; v.t = 0; sfx?.thunder?.(); }
      } else if (v.phase === 'erupt') {
        const f = reduced ? 0.35 : 1;
        // ash column, drifting with the wind
        for (let i = 0; i < 2 * k * f; i++) spawn({ k: 'smoke', x: c.x + (Math.random() - 0.5) * 60, y: c.y - 30 - Math.random() * 60, vx: wind * 0.8 + (Math.random() - 0.5) * 0.6, vy: -2 - Math.random() * 2, life: 160 + Math.random() * 80, r: 18 + Math.random() * 16 });
        // lava bombs
        if (lava.length < MAX_LAVA && Math.random() < 0.55 * k * f) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1, sp = 9 + Math.random() * 11;
          lava.push({ fly: true, x: c.x + (Math.random() - 0.5) * 40, y: c.y - 10, vx: Math.cos(a) * sp + wind * 0.3, vy: Math.sin(a) * sp, r: 4 + Math.random() * 6, heat: 1 });
        }
        // lava pours over both rims
        if (lava.length < MAX_LAVA && Math.random() < 0.9 * k * f) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          lava.push({ fly: false, x: c.x + dir * R * CRATER * 0.9, y: 0, dir, v: 0.6, r: 7 + Math.random() * 5, heat: 1 });
        }
        if (Math.random() < 0.12 * k) api.nudgeNear?.(v.x, R * 1.2, 1.5);
        if (v.t > ERUPT) { v.phase = 'calm'; v.t = 0; }
      } else v.glow = Math.max(0.35, v.glow - dt / 6000);
      if (v.phase === 'calm' && Math.random() < 0.02 * k) spawn({ k: 'smoke', x: c.x + (Math.random() - 0.5) * 50, y: c.y - 10, vx: wind * 0.4, vy: -0.8, life: 110, r: 10 });
    }
    // lava particles
    for (let i = lava.length - 1; i >= 0; i--) {
      const p = lava[i];
      if (p.fly) {
        p.vy += 0.32 * k; p.x += p.vx * k; p.y += p.vy * k;
        const s = terrain.surfaceY(p.x), ws = water.surfaceAt(p.x, 2);
        if (ws != null && p.y >= ws) { steam(p.x, ws); lava.splice(i, 1); continue; }
        if (api.burnAt?.(p.x, p.y)) { lava.splice(i, 1); continue; }
        if (p.y >= s) {
          fire.ignite(p.x, 1.5, clockGet?.(), 0);
          // a bomb that lands keeps flowing as a small blob of lava
          Object.assign(p, { fly: false, y: s, dir: Math.sign(terrain.slopeAt(p.x)) || (Math.random() < 0.5 ? -1 : 1), v: 0.4, heat: 0.7 });
        }
        continue;
      }
      // flowing lava: runs downhill along the surface, slows as it cools
      const slope = terrain.slopeAt(p.x);
      const down = Math.sign(slope) || p.dir;
      p.dir = down;
      p.v = Math.min(3.2, p.v * 0.985 + Math.abs(slope) * 0.35 * k);
      p.x += p.dir * p.v * k;
      p.y = terrain.surfaceY(p.x) - p.r * 0.5;
      p.heat -= (0.0016 + (p.v < 0.3 ? 0.006 : 0)) * k;
      const ws = water.surfaceAt(p.x, 2);
      if (ws != null) { steam(p.x, ws); water.take(p.x, 2, 32); deposit(p.x, 3); lava.splice(i, 1); continue; }
      if (Math.random() < 0.02 * k) { fire.ignite(p.x, 1.2, clockGet?.(), 0); burnPlants(p.x); }
      if (p.heat <= 0) { deposit(p.x, p.r * 0.5); lava.splice(i, 1); }
    }
  }
  function steam(x, y) {
    for (let j = 0; j < 4; j++) spawn({ k: 'smoke', x: x + (Math.random() - 0.5) * 30, y: y - 6, vx: (Math.random() - 0.5) * 1.4, vy: -1.6, life: 70, r: 10 });
    sfx?.fizz?.();
  }
  function deposit(x, amt) { terrain.shape(x, 40, (d) => amt * (1 - d * d)); if (Math.random() < 0.3) terrain.paint('rock', x - 12, x + 12); }
  function burnPlants(x) { for (const p of flora.list) if (Math.abs(p.x - x) < 40) { p.burning = true; p.burnt = Math.min(1, (p.burnt || 0) + 0.2); } }

  // ---------------- drawing (world back canvas) ----------------
  function drawBack(ctx, view, cam, t) {
    const z = cam.z;
    for (const v of vents) {
      if (v.x + R < view.x || v.x - R > view.x + view.w) continue;
      const c = crater(v);
      const hot = v.phase === 'calm' ? v.glow : 1;
      // magma chamber in the bedrock + the conduit up to the crater
      const cy = G + BEDROCK - 250, rx = R * 0.42, ry = 170;
      if (cy - ry < view.y + view.h) {
        const pulse = 0.85 + Math.sin(t * 2 + v.x) * 0.15;
        ctx.save();
        ctx.fillStyle = '#7a1d0c';
        ctx.beginPath(); ctx.moveTo(c.x - 26, c.y + 20); ctx.bezierCurveTo(c.x - 40, (c.y + cy) / 2, c.x + 10, (c.y + cy) / 2, c.x - 34, cy - ry + 20); ctx.lineTo(c.x + 34, cy - ry + 20); ctx.bezierCurveTo(c.x + 60, (c.y + cy) / 2, c.x + 20, (c.y + cy) / 2, c.x + 26, c.y + 20); ctx.closePath(); ctx.fill();
        const g = ctx.createRadialGradient(c.x, cy, 10, c.x, cy, rx);
        g.addColorStop(0, `rgba(255,214,90,${pulse})`); g.addColorStop(0.45, '#f4900c'); g.addColorStop(1, '#a3240c');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(c.x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        // magma rising in the conduit while it erupts
        ctx.strokeStyle = `rgba(255,${120 + hot * 80},40,${0.4 + hot * 0.6})`; ctx.lineWidth = 14 + hot * 10;
        ctx.beginPath(); ctx.moveTo(c.x, cy - ry + 10); ctx.bezierCurveTo(c.x - 8, (c.y + cy) / 2, c.x + 8, (c.y + cy) / 2, c.x, c.y + 10); ctx.stroke();
        ctx.restore();
      }
      // lava lake in the crater
      const lw = R * CRATER * 0.9;
      const lg = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, lw);
      lg.addColorStop(0, `rgba(255,230,120,${0.7 + hot * 0.3})`); lg.addColorStop(0.6, `rgba(244,144,12,${0.6 + hot * 0.4})`); lg.addColorStop(1, 'rgba(190,40,10,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, lw, 18 + hot * 10, 0, 0, Math.PI * 2); ctx.fill();
      // glow over the crater
      if (hot > 0.3) {
        const gg = ctx.createRadialGradient(c.x, c.y - 30, 0, c.x, c.y - 30, 260);
        gg.addColorStop(0, `rgba(255,140,40,${0.22 * hot})`); gg.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(c.x, c.y - 30, 260, 0, Math.PI * 2); ctx.fill();
      }
    }
    // lava: glowing blobs (bombs trail sparks, flows crust over as they cool)
    for (const p of lava) {
      if (p.x < view.x - 40 || p.x > view.x + view.w + 40) continue;
      const h = Math.max(0, p.heat);
      const col = h > 0.6 ? '#ffcc4d' : h > 0.3 ? '#f4900c' : '#c1440e';
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (p.fly ? 1 : 1.6), p.r * (p.fly ? 1 : 0.8), 0, 0, Math.PI * 2); ctx.fill();
      if (h < 0.5) { ctx.fillStyle = `rgba(60,40,36,${(0.5 - h) * 1.6})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.5, p.r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
      if (p.fly && Math.random() < 0.3) spawn({ k: 'ember', x: p.x, y: p.y, vx: 0, vy: 0, life: 14, g: 0.1 });
      void z;
    }
  }
  /** Extra light sources for the night (crater + hot lava). */
  function lights(view) {
    const out = [];
    for (const v of vents) {
      if (v.x + R < view.x || v.x - R > view.x + view.w) continue;
      const c = crater(v);
      out.push({ x: c.x, y: c.y - 40, r: 260 + (v.phase === 'calm' ? v.glow * 120 : 520) });
    }
    let n = 0;
    for (const p of lava) { if (n > 24) break; if (p.heat > 0.4 && (n++ % 3 === 0)) out.push({ x: p.x, y: p.y, r: 120 }); }
    return out;
  }

  function serialize() { return vents.map((v) => [v.x]); }
  function load(arr) { vents = []; lava.length = 0; (arr || []).forEach(([x]) => vents.push({ id: `v${nextId++}`, x, phase: 'calm', t: 0, glow: 0.4 })); }

  return {
    build, remove, hit, erupt, calm, tick, drawBack, lights, serialize, load,
    get list() { return vents; },
    get lavaCount() { return lava.length; },
  };
}
