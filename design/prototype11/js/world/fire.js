// Fire: a cellular wildfire along the ground (grass) and through plants, plus particle flames.
// Every 32px ground cell has fuel from its grass (dry summer grass burns, wet or snowy grass doesn't).
// Burning cells heat their neighbours: more downwind and uphill. Rain, ponds, sprinklers, foam and
// snow put fires out. Burnt ground stays scorched for a few days and regrows; burnt trees regrow too.

import { SPECIES } from './species.js';

const CELL = 32;

export function createFire({ terrain, water, flora, spawn, sfx }) {
  const burning = new Map(); // cell -> { heat, fuel, t }
  const heat = new Map(); // cell -> accumulated heat (not yet burning)
  const scorch = new Map(); // cell -> 1..0 (fades as grass regrows)
  let acc = 0;
  const cellOf = (x) => Math.floor(x / CELL);
  const cx = (c) => c * CELL + CELL / 2;

  function fuelAt(c, clock, snow) {
    const x = cx(c);
    if (terrain.matAt(x) !== 'grass' && terrain.matAt(x) !== 'dirt') return plantFuel(x);
    if (water.depthAt(x) > 0.5 || (scorch.get(c) || 0) > 0.3) return plantFuel(x);
    const m = water.moistureAt(x);
    const season = [0.55, 1.15, 1.0, 0.3][clock.seasonIdx];
    const grass = terrain.matAt(x) === 'grass' ? Math.max(0, (1 - m * 1.9) * season - snow * 2) : 0;
    return Math.max(grass, plantFuel(x));
  }
  function plantFuel(x) {
    let f = 0;
    for (const p of flora.list) {
      if (Math.abs(p.x - x) > CELL) continue;
      const sp = SPECIES[p.sp];
      if (sp.aquatic || p.burnt > 0.8) continue;
      f = Math.max(f, 0.9 * flora.size(p) * (1 - water.moistureAt(x) * 0.6));
    }
    return f;
  }

  /** Light a fire at world x (matches, lightning, a burning item). Returns true if it caught. */
  function ignite(x, force = 1, clock = null, snow = 0) {
    const c = cellOf(x);
    if (burning.has(c)) return true;
    const f = clock ? fuelAt(c, clock, snow) : 0.6;
    if (f * force < 0.18) return false;
    burning.set(c, { heat: 1, fuel: Math.min(1.4, f * 1.2 + 0.2), t: 0 });
    return true;
  }
  function douse(x, r = CELL) {
    let n = 0;
    for (let c = cellOf(x - r); c <= cellOf(x + r); c++) if (burning.delete(c)) { n++; spawn({ k: 'smoke', x: cx(c), y: terrain.surfaceY(cx(c)) - 20, vx: 0, vy: -1, life: 80, r: 14 }); }
    return n;
  }

  function tick(dt, clock, wind, weather) {
    acc += dt;
    if (acc < 100) return;
    const step = Math.min(3, acc / 100);
    acc = 0;
    const rain = weather.rain || 0;
    const snow = weather.snow || 0;
    for (const [c, b] of [...burning]) {
      const x = cx(c);
      b.t += step;
      b.fuel -= 0.035 * step;
      // water and rain put it out
      if (water.depthAt(x) > 1 || water.moistureAt(x) > 0.85 || Math.random() < rain * 0.16 * step) { burning.delete(c); spawn({ k: 'smoke', x, y: terrain.surfaceY(x) - 20, vx: 0, vy: -1, life: 90, r: 16 }); sfx?.fizz(); continue; }
      if (b.fuel <= 0) { burning.delete(c); scorch.set(c, 1); continue; }
      // heat neighbours: downwind and uphill spread faster
      for (const d of [-2, -1, 1, 2]) {
        const n = c + d;
        if (burning.has(n)) continue;
        const down = Math.sign(d) === Math.sign(wind) ? 1 + Math.abs(wind) * 0.9 : 1 / (1 + Math.abs(wind) * 0.7);
        const up = terrain.surfaceY(cx(n)) < terrain.surfaceY(x) - 4 ? 1.4 : 1;
        const h = (heat.get(n) || 0) + 0.06 * (1 - Math.min(0.9, rain)) * step * down * up * (Math.abs(d) === 2 ? 0.35 : 1) * Math.min(1, b.fuel + 0.3);
        if (h >= 1) { heat.delete(n); ignite(cx(n), 1, clock, snow); } else heat.set(n, h);
      }
      // plants in the cell burn
      for (const p of flora.list) {
        if (Math.abs(p.x - x) > CELL) continue;
        p.burning = true;
        p.burnt = Math.min(1, p.burnt + 0.03 * step);
        p.hp = Math.max(0, p.hp - 0.01 * step);
      }
    }
    // heat fades where nothing burns
    for (const [c, h] of heat) { const nh = h - 0.01 * step; if (nh <= 0) heat.delete(c); else heat.set(c, nh); }
    for (const p of flora.list) if (p.burning && !burning.has(cellOf(p.x))) p.burning = false;
    // scorched ground regrows (faster when time runs fast)
    if (Math.random() < 0.05) for (const [c, s] of scorch) { const ns = s - 0.002; if (ns <= 0) scorch.delete(c); else scorch.set(c, ns); }
  }

  /** Flame particles for visible fires (called every frame). */
  function emit(view, t60) {
    for (const [c, b] of burning) {
      const x = cx(c);
      if (x < view.x - 100 || x > view.x + view.w + 100) continue;
      const y = terrain.surfaceY(x);
      const plant = flora.list.find((p) => Math.abs(p.x - x) < CELL && p.burning);
      const n = (1.5 + b.fuel * 2) * t60;
      for (let i = 0; i < n; i++) {
        let fx = x + (Math.random() - 0.5) * CELL, fy = y;
        if (plant && Math.random() < 0.6) { const bb = flora.bbox(plant); fx = bb.x0 + Math.random() * bb.w; fy = bb.y0 + Math.random() * bb.h * 0.8; }
        spawn({ k: 'flame', x: fx, y: fy, vx: (Math.random() - 0.5) * 0.6, vy: -1.2 - Math.random() * 1.6, life: 26 + Math.random() * 22, r: 8 + Math.random() * 10 * Math.min(1.4, b.fuel + 0.4) });
      }
      if (Math.random() < 0.25 * t60) spawn({ k: 'smoke', x: x + (Math.random() - 0.5) * 20, y: y - 50, vx: 0, vy: -1, life: 120, r: 12 });
      if (Math.random() < 0.2 * t60) spawn({ k: 'ember', x, y: y - 20, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3, life: 50, g: -0.02 });
    }
  }

  /** Scorched ground, drawn over the terrain. */
  function drawBack(ctx, view) {
    for (const [c, s] of scorch) {
      const x = c * CELL;
      if (x < view.x - CELL || x > view.x + view.w) continue;
      const y = terrain.surfaceY(x + CELL / 2);
      ctx.fillStyle = `rgba(28,22,18,${0.75 * s})`;
      ctx.fillRect(x, y - 6, CELL + 0.5, 14);
    }
  }
  /** Burning cells as light sources for the night. */
  function lights(view) {
    const out = [];
    for (const [c, b] of burning) { const x = cx(c); if (x > view.x - 300 && x < view.x + view.w + 300) out.push({ x, y: terrain.surfaceY(x) - 40, r: 260 + b.fuel * 120 }); }
    return out.slice(0, 40);
  }

  return {
    ignite, douse, tick, emit, drawBack, lights,
    get count() { return burning.size; },
    isBurning: (x) => burning.has(cellOf(x)),
    serialize: () => ({ s: [...scorch].map(([c, v]) => [c, +v.toFixed(2)]) }),
    load(d) { burning.clear(); heat.clear(); scorch.clear(); (d?.s || []).forEach(([c, v]) => scorch.set(c, v)); },
  };
}
