// Water on and in the ground, per 16px terrain column:
//  • surface water (a height field that flows downhill, fills dips into puddles and ponds)
//  • infiltration into the soil (sand drains fast, clay slowly, rock never) → soil moisture
//  • saturated soil recharges the groundwater table (per 1024px chunk); a high table makes springs
//  • evaporation (sun + heat), freezing into ice below 0°C (solid + slippery), melting above
// Everything is sparse, so an infinite world costs nothing where it is dry.

import { COL, BEDROCK } from './terrain.js';

const CAP = 70; // px of water one column of soil can hold before it is saturated
const INFIL = [0.03, 0.12, 0.006, 0, 0.04]; // by material: grass, sand, clay, rock, dirt (px per tick at dry soil)
const GW_DEFAULT = 620; // groundwater table: px below the base ground line
const CHUNK_COLS = 64;

export function createWater({ terrain }) {
  const Wd = new Map(); // col -> surface water depth (px)
  const ICE = new Map(); // col -> ice thickness (px), <= depth
  const MO = new Map(); // col -> soil moisture 0..1 (missing = baseline)
  const GW = new Map(); // chunk -> water table depth below base ground line (px)
  let baseline = 0.3;
  let acc = 0;
  let version = 0;
  const G = terrain.groundY;
  const th = (c) => terrain.heightAtCol(c);
  const matIdx = (c) => ({ grass: 0, sand: 1, clay: 2, rock: 3, dirt: 4 })[terrain.matAt(c * COL + 1)];
  const col = (x) => Math.floor(x / COL);

  // the terrain treats thick ice as solid ground (flush with the water surface)
  terrain.setTopHook?.((c) => ((ICE.get(c) || 0) > 5 ? Wd.get(c) || 0 : 0));

  function depth(c) { return Wd.get(c) || 0; }
  function setDepth(c, v) { if (v > 0.02) Wd.set(c, v); else { Wd.delete(c); ICE.delete(c); } }
  function moisture(c) { return MO.get(c) ?? baseline; }
  function gwDepth(k) { return GW.get(k) ?? GW_DEFAULT; }

  /** Add water (px of depth) at x spread over width. */
  function add(x, amount, width = COL) {
    const c0 = col(x - width / 2), c1 = col(x + width / 2);
    const per = amount / (c1 - c0 + 1);
    for (let c = c0; c <= c1; c++) setDepth(c, depth(c) + per);
    version++;
  }
  /** Water surface y at x (world), or null when there is (almost) no water. */
  function surfaceAt(x, min = 1) {
    const c = col(x);
    const d = depth(c);
    if (d < min) return null;
    return G - th(c) - d;
  }
  const iceAt = (x) => ICE.get(col(x)) || 0;
  const moistureAt = (x) => moisture(col(x));
  const tableY = (x) => G + gwDepth(Math.floor(col(x) / CHUNK_COLS));

  /** Take up to `amount` from the groundwater under x (bores). Returns what was delivered. */
  function pump(x, amount, boreDepth = BEDROCK - 40) {
    const k = Math.floor(col(x) / CHUNK_COLS);
    const d = gwDepth(k);
    if (d > boreDepth - 10) return 0; // the bore is dry: wait for rain to refill the groundwater
    GW.set(k, Math.min(BEDROCK - 20, d + amount * 0.02));
    return amount;
  }
  /** Drain surface water at x into a container (watering can, bucket). */
  function take(x, amount, width = 64) {
    let got = 0;
    for (let c = col(x - width / 2); c <= col(x + width / 2) && got < amount; c++) {
      const d = depth(c) - (ICE.get(c) || 0);
      if (d <= 0.5) continue;
      const t = Math.min(d - 0.5, amount - got);
      setDepth(c, depth(c) - t);
      got += t;
    }
    if (got) version++;
    return got;
  }

  /**
   * Advance the water simulation. dt = real ms, c = clock info (temp, sun, season), worldMin = world minutes passed.
   */
  function tick(dt, c, worldMin = 0) {
    baseline = [0.42, 0.26, 0.36, 0.4][c.seasonIdx] ?? 0.3;
    acc += dt;
    const steps = Math.min(4, Math.floor(acc / 33));
    if (!steps) return;
    acc -= steps * 33;
    // time-lapse: soak / evaporate faster when the clock runs fast
    const timeK = Math.min(40, 1 + worldMin / Math.max(0.0001, (steps * 33) / 1000) / 2);
    const sun = Math.max(0, Math.sin(c.sunAlt));
    const temp = c.temp;
    for (let s = 0; s < steps; s++) {
      flow();
      const freezeDirty = new Set();
      for (const [cc, d] of [...Wd]) {
        const m = matIdx(cc);
        let ice = ICE.get(cc) || 0;
        // freeze / melt
        if (temp < 0) ice = Math.min(d, ice + (-temp) * 0.004 * timeK);
        else if (ice > 0) ice = Math.max(0, ice - (temp * 0.004 + sun * 0.02) * timeK);
        if ((ice > 5) !== ((ICE.get(cc) || 0) > 5)) freezeDirty.add(cc);
        if (ice > 0) ICE.set(cc, ice); else ICE.delete(cc);
        const liquid = d - ice;
        if (liquid <= 0) continue;
        // infiltration (frozen ground doesn't drink)
        const mo = moisture(cc);
        let inf = temp < 0 ? 0 : INFIL[m] * (1 - mo * 0.85) * timeK;
        inf = Math.min(inf, liquid);
        let nd = d - inf;
        let nm = mo + inf / CAP;
        if (nm > 1) { recharge(cc, (nm - 1) * CAP); nm = 1; }
        // evaporation
        const evap = Math.min(nd - ice, 0.0012 * (0.3 + sun) * Math.max(0.2, 1 + temp / 25) * timeK);
        nd -= Math.max(0, evap);
        MO.set(cc, nm);
        setDepth(cc, nd);
      }
      freezeDirty.forEach((cc) => terrain.markDirty?.(cc));
      // soil dries toward the seasonal baseline; groundwater relaxes; springs
      if (Math.random() < 0.25) {
        for (const [cc, m] of MO) {
          if (depth(cc) > 0.1) continue;
          const nm = m + (baseline - m) * 0.004 * (0.4 + sun) * timeK;
          if (Math.abs(nm - baseline) < 0.01) MO.delete(cc); else MO.set(cc, nm);
        }
        for (const [k, d] of GW) {
          const nd = d + (GW_DEFAULT - d) * 0.0008 * timeK;
          if (Math.abs(nd - GW_DEFAULT) < 1) GW.delete(k); else GW.set(k, nd);
          // a table above the surface seeps out as a spring
          for (let cc = k * CHUNK_COLS; cc < (k + 1) * CHUNK_COLS; cc += 4) if (-nd > th(cc) - 6) setDepth(cc, depth(cc) + 0.05);
        }
      }
    }
    version++;
  }
  function recharge(cc, amount) {
    const k = Math.floor(cc / CHUNK_COLS);
    const surfaceDepth = -th(cc);
    GW.set(k, Math.max(surfaceDepth - 10, gwDepth(k) - amount * 0.06));
  }

  // shallow-water style flow between neighbouring columns
  function flow() {
    if (!Wd.size) return;
    const cols = [...Wd.keys()].sort((a, b) => a - b);
    for (let it = 0; it < 3; it++) {
      const delta = new Map();
      const seen = new Set();
      for (const cc of cols) {
        for (const nb of [cc - 1, cc]) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          const a = nb, b = nb + 1;
          const da = depth(a), db = depth(b);
          if (da < 0.02 && db < 0.02) continue;
          const ia = ICE.get(a) || 0, ib = ICE.get(b) || 0;
          const ha = th(a) + da, hb = th(b) + db;
          let q = (ha - hb) * 0.24;
          if (q > 0) q = Math.min(q, (da - ia) * 0.5); else q = Math.max(q, -(db - ib) * 0.5);
          if (Math.abs(q) < 0.001) continue;
          delta.set(a, (delta.get(a) || 0) - q);
          delta.set(b, (delta.get(b) || 0) + q);
        }
      }
      for (const [cc, d] of delta) setDepth(cc, depth(cc) + d);
    }
  }

  // ---------------- rendering ----------------
  /** Behind items: damp soil + the groundwater table in the soil cross-section. */
  function drawBack(ctx, view, cam) {
    const z = cam.z;
    let step = 1;
    while (step * COL * z < 3) step *= 2;
    const c0 = Math.floor(view.x / COL) - 1, c1 = Math.ceil((view.x + view.w) / COL) + 1;
    const bottom = view.y + view.h;
    // damp soil
    for (let c = Math.floor(c0 / step) * step; c <= c1; c += step) {
      const m = moisture(c);
      const sy = G - th(c);
      if (sy > bottom || m < 0.05) continue;
      ctx.fillStyle = `rgba(20,14,8,${Math.min(0.42, m * 0.42)})`;
      ctx.fillRect(c * COL, sy + 6, COL * step + 0.5, 150);
    }
    // groundwater table: saturated zone tinted blue + a wavy line
    const k0 = Math.floor(c0 / CHUNK_COLS) - 1, k1 = Math.floor(c1 / CHUNK_COLS) + 1;
    ctx.beginPath();
    const pts = [];
    for (let k = k0; k <= k1; k++) pts.push([k * CHUNK_COLS * COL + (CHUNK_COLS * COL) / 2, G + gwDepth(k)]);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (i === 0) ctx.moveTo(view.x - 50, y);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(view.x + view.w + 50, pts[pts.length - 1][1]);
    ctx.lineTo(view.x + view.w + 50, G + BEDROCK);
    ctx.lineTo(view.x - 50, G + BEDROCK);
    ctx.closePath();
    ctx.fillStyle = 'rgba(60,130,220,.22)';
    ctx.fill();
    if (z > 0.08) {
      ctx.strokeStyle = 'rgba(90,170,255,.85)'; ctx.lineWidth = 3 / Math.max(0.4, z); ctx.setLineDash([14 / z, 10 / z]);
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  /** In front of items: surface water (so things look submerged), ripples, ice. */
  function drawFront(ctx, view, cam, t) {
    const c0 = Math.floor(view.x / COL) - 1, c1 = Math.ceil((view.x + view.w) / COL) + 1;
    let run = null;
    const runs = [];
    for (let c = c0; c <= c1 + 1; c++) {
      const d = depth(c);
      if (d > 0.6 && c <= c1) { if (!run) runs.push((run = [])); run.push(c); } else run = null;
    }
    for (const r of runs) {
      const top = (c) => G - th(c) - depth(c);
      // water body
      ctx.beginPath();
      const first = r[0], last = r[r.length - 1];
      ctx.moveTo(first * COL, G - th(first));
      for (const c of r) ctx.lineTo(c * COL + COL / 2, top(c) + Math.sin(t * 2 + c * 0.7) * Math.min(2, depth(c) * 0.08));
      ctx.lineTo((last + 1) * COL, G - th(last + 1));
      for (let i = r.length - 1; i >= 0; i--) ctx.lineTo(r[i] * COL + COL / 2, G - th(r[i]));
      ctx.closePath();
      const maxD = Math.max(...r.map(depth));
      const ytop = Math.min(...r.map(top));
      const g = ctx.createLinearGradient(0, ytop, 0, ytop + Math.max(20, maxD));
      g.addColorStop(0, 'rgba(110,190,255,.55)'); g.addColorStop(1, 'rgba(30,90,180,.72)');
      ctx.fillStyle = g;
      ctx.fill();
      // surface highlight
      ctx.strokeStyle = 'rgba(220,245,255,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      r.forEach((c, i) => { const y = top(c) + Math.sin(t * 2 + c * 0.7) * Math.min(2, depth(c) * 0.08); i ? ctx.lineTo(c * COL + COL / 2, y) : ctx.moveTo(c * COL + COL / 2, y); });
      ctx.stroke();
      // sparkles in daylight
      for (const c of r) if ((c * 7 + Math.floor(t * 3)) % 23 === 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(c * COL, top(c) - 1, 6, 2); }
      // ice
      for (const c of r) {
        const ice = ICE.get(c) || 0;
        if (ice < 0.3) continue;
        const y = top(c);
        ctx.fillStyle = `rgba(232,246,255,${Math.min(0.95, 0.4 + ice / 8)})`;
        ctx.fillRect(c * COL, y - 1, COL + 0.5, Math.min(depth(c), ice) + 1);
        if ((c * 13) % 7 === 0) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c * COL, y + 2); ctx.lineTo(c * COL + 12, y + Math.min(ice, 8)); ctx.stroke(); }
      }
    }
  }

  // ---------------- persistence ----------------
  function serialize() {
    const enc = (m, k = 1) => [...m].filter(([, v]) => v > 0.05).map(([c, v]) => [c, Math.round(v * k)]);
    return { w: enc(Wd, 10), i: enc(ICE, 10), m: [...MO].map(([c, v]) => [c, Math.round(v * 100)]), g: [...GW].map(([k, v]) => [k, Math.round(v)]) };
  }
  function load(data) {
    Wd.clear(); ICE.clear(); MO.clear(); GW.clear();
    (data?.w || []).forEach(([c, v]) => Wd.set(c, v / 10));
    (data?.i || []).forEach(([c, v]) => ICE.set(c, v / 10));
    (data?.m || []).forEach(([c, v]) => MO.set(c, v / 100));
    (data?.g || []).forEach(([k, v]) => GW.set(k, v));
    version++;
  }
  /** Dig a pond: lower the terrain and fill it with water (used by the seed + the gallery). */
  function pond(x0, x1, deep = 220, fill = 0.9) {
    terrain.hill(x0, x1, -deep);
    for (let c = col(x0); c <= col(x1); c++) {
      const lip = Math.min(th(col(x0) - 1), th(col(x1) + 1));
      const d = (lip - th(c)) * fill;
      if (d > 0) setDepth(c, d);
      MO.set(c, 1);
    }
    version++;
  }

  return {
    add, take, pump, pond, tick, surfaceAt, iceAt, moistureAt, tableY, depthAt: (x) => depth(col(x)),
    drawBack, drawFront, serialize, load,
    get version() { return version; },
    get activeCount() { return Wd.size; },
  };
}
