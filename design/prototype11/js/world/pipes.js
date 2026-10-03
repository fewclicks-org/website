// Water devices + pipe network, and wind toys.
//  bore (hand / windmill / solar pump) → pipes → tank / sprinkler / tap; watering can + bucket pour when
//  tilted and refill from ponds; wind sock, flag and kite react to the wind.
// Pipes are board links of kind 'pipe'. Each connected group is solved every tick: pumps supply,
// open taps + sprinklers demand, tanks buffer the difference.

import { PIPE_TYPES } from '../items.js';
import { ANCHORS, anchorKey } from '../art.js';

const TANK_CAP = 900; // water units a tank holds
const CAN_CAP = 120;
const BUCKET_CAP = 260;

export function createDevices({ physics, water, atmos, els, getItems, getLinks, spawn, clockGet, sfx }) {
  const flowing = new Set(); // link ids with water in them
  let acc = 0;
  const byId = (id) => getItems().find((i) => i.type && i.id === id);

  /**
   * World position of an anchor ('spout', 'inlet', 'outlet') declared in the device art (viewBox units):
   * art viewBox → rendered .obj box inside the item → item box (centred) → scale + rotation → world.
   */
  function anchorWorld(it, name) {
    const el = els.get(it.id);
    const A = ANCHORS[anchorKey(it)];
    const obj = el?.querySelector('.obj');
    if (!el || !A || !A[name] || !obj) return { x: it.x, y: it.y };
    const [vw, vh] = A.vb;
    const [ax, ay] = A[name];
    const ow = obj.offsetWidth, oh = obj.offsetHeight || (ow * vh) / vw;
    const lx = obj.offsetLeft + (ax / vw) * ow - el.offsetWidth / 2;
    const ly = obj.offsetTop + (ay / vh) * oh - el.offsetHeight / 2;
    const x = lx * it.s, y = ly * it.s, c = Math.cos(it.a), sn = Math.sin(it.a);
    return { x: it.x + x * c - y * sn, y: it.y + x * sn + y * c };
  }
  const outlet = (it) => anchorWorld(it, 'spout');
  /** Pipe port for a link end: water flows from bores/tanks (outlet) into tanks/taps/sprinklers (inlet). */
  function portOf(it, other) {
    if (it.type === 'bore') return { p: anchorWorld(it, 'outlet'), dir: [1, 0] };
    if (it.type === 'tank') {
      const feeds = other && (other.type === 'tap' || other.type === 'sprinkler');
      return feeds ? { p: anchorWorld(it, 'outlet'), dir: [1, 0] } : { p: anchorWorld(it, 'inlet'), dir: [0, -1] };
    }
    if (it.type === 'tap') return { p: anchorWorld(it, 'inlet'), dir: [-1, 0] };
    if (it.type === 'sprinkler') return { p: anchorWorld(it, 'inlet'), dir: [0, 1] };
    return { p: { x: it.x, y: it.y }, dir: [0, 1] };
  }

  /** Spray / pour `n` water particles from a point. */
  function pour(p, n, vx, vy, spread = 0.6) {
    for (let i = 0; i < n; i++) spawn({ k: 'drip', x: p.x + (Math.random() - 0.5) * 6, y: p.y, vx: vx + (Math.random() - 0.5) * spread * 4, vy: vy + (Math.random() - 0.5) * spread * 2, life: 300 });
  }

  function groups() {
    const items = getItems();
    const nodes = items.filter((i) => PIPE_TYPES.has(i.type));
    const adj = new Map(nodes.map((n) => [n.id, []]));
    for (const l of getLinks()) if (l.kind === 'pipe' && adj.has(l.a) && adj.has(l.b)) { adj.get(l.a).push([l.b, l.id]); adj.get(l.b).push([l.a, l.id]); }
    const seen = new Set();
    const out = [];
    for (const n of nodes) {
      if (seen.has(n.id)) continue;
      const g = { items: [], links: new Set() };
      const stack = [n.id];
      seen.add(n.id);
      while (stack.length) {
        const id = stack.pop();
        g.items.push(items.find((i) => i.id === id));
        for (const [nb, lid] of adj.get(id)) { g.links.add(lid); if (!seen.has(nb)) { seen.add(nb); stack.push(nb); } }
      }
      out.push(g);
    }
    return out;
  }

  /** Called every frame. */
  function update(dt) {
    const c = clockGet();
    const items = getItems();
    const wind = atmos.wind;
    const t60 = Math.min(3, dt / 16.667);
    // wind toys
    for (const it of items) {
      const el = els.get(it.id);
      if (!el) continue;
      if (it.type === 'windsock') el.style.setProperty('--sock', `${Math.max(-80, Math.min(80, (1 - Math.min(1, Math.abs(wind) / 3)) * 80)) * (wind >= 0 ? 1 : -1)}deg`), el.classList.toggle('left', wind < 0);
      if (it.type === 'flag') { el.style.setProperty('--fspd', `${Math.max(0.25, 1.4 - Math.abs(wind) * 0.3)}s`); el.classList.toggle('left', wind < 0); el.classList.toggle('limp', Math.abs(wind) < 0.25); }
      if (it.type === 'bore' && it.d.pump === 'wind') { it._rot = ((it._rot || 0) + wind * 0.08 * t60) % (Math.PI * 2); el.style.setProperty('--rot', `${it._rot}rad`); }
      if (it.type === 'bore' && (it.d.pump === 'hand' || !it.d.pump) && it.d._burst > 0) el.style.setProperty('--pump', `${Math.sin(performance.now() / 90) * 18}deg`);
      if (it.type === 'sprinkler' && it.d._flow) { it._sw = ((it._sw || 0) + 0.04 * t60); el.style.setProperty('--sw', `${Math.sin(it._sw) * 35}deg`); }
      if (it.type === 'kite') kite(it, wind);
    }
    // pouring containers (can, bucket) + refilling in water
    for (const it of items) {
      if (it.type !== 'can' && it.type !== 'bucket') continue;
      const cap = it.type === 'can' ? CAN_CAP : BUCKET_CAP;
      const lvl = it.d.level ?? 0.6;
      const tilt = it.type === 'can' ? it.a : Math.abs(it.a);
      const surf = water.surfaceAt(it.x, 4);
      if (surf != null && it.y > surf - 10 && lvl < 1) { const got = water.take(it.x, 6 * t60); it.d.level = Math.min(1, lvl + got / cap); markPatch(it); }
      if (tilt > (it.type === 'can' ? 0.45 : 1.1) && lvl > 0) {
        const p = outlet(it);
        const n = Math.max(1, Math.round((it.type === 'can' ? 1.5 : 4) * t60));
        if (it.type === 'can') pour(p, n, Math.cos(it.a - 0.6) * 3 + wind * 0.5, 1, 0.3); else pour(p, n, Math.cos(it.a) * 2 + wind * 0.5, 2, 1);
        it.d.level = Math.max(0, lvl - (n * 0.12) / cap * 1.4);
        markPatch(it);
      }
    }
    acc += dt;
    if (acc < 100) return;
    const step = acc / 1000; // seconds
    acc = 0;
    flowing.clear();
    const sun = Math.max(0, Math.sin(c.sunAlt));
    for (const g of groups()) {
      let supply = 0;
      const bores = g.items.filter((i) => i.type === 'bore');
      for (const b of bores) {
        const pump = b.d.pump || 'hand';
        let rate = pump === 'wind' ? Math.min(6, Math.abs(wind) * 2.2) : pump === 'solar' ? sun * 4 : (b.d._burst || 0) * 7;
        if (pump === 'hand' && b.d._burst) b.d._burst = Math.max(0, b.d._burst - step * 0.6);
        const got = rate > 0 ? water.pump(b.x, rate * step, b.d.depth || 900) : 0;
        b.d._dry = rate > 0 && got === 0;
        supply += got / step;
        b.d._flow = got > 0;
        markPatch(b);
      }
      const sinks = g.items.filter((i) => (i.type === 'sprinkler' || i.type === 'tap') && i.d.on);
      const demand = sinks.reduce((a, s) => a + (s.type === 'sprinkler' ? 2.4 : 3), 0);
      const tanks = g.items.filter((i) => i.type === 'tank');
      const stored = tanks.reduce((a, t) => a + (t.d.level || 0) * TANK_CAP, 0);
      let delivered = Math.min(demand * step, supply * step + stored);
      // tanks take the surplus or give the shortfall
      let net = supply * step - delivered;
      for (const t of tanks) {
        const share = net / tanks.length;
        t.d.level = Math.max(0, Math.min(1, (t.d.level || 0) + share / TANK_CAP));
        markPatch(t);
      }
      const f = demand > 0 ? delivered / (demand * step) : 0;
      for (const s of sinks) {
        s.d._flow = f > 0.05;
        markPatch(s);
        if (!s.d._flow) continue;
        const p = outlet(s);
        if (s.type === 'sprinkler') {
          const ang = -Math.PI / 2 + Math.sin(s._sw || 0) * 0.9;
          for (let i = 0; i < Math.round(10 * f); i++) { const a = ang + (Math.random() - 0.5) * 0.5; const v = 9 + Math.random() * 4; spawn({ k: 'drip', x: p.x, y: p.y, vx: Math.cos(a) * v + wind * 0.4, vy: Math.sin(a) * v, life: 300 }); }
        } else pour(p, Math.round(6 * f), wind * 0.6, 2, 0.15);
      }
      // a bore with nothing connected pours from its own spout
      if (g.items.length === 1 && bores.length === 1 && supply > 0) { const b = bores[0]; const p = outlet(b); pour(p, Math.round(supply * 1.2), 0.3 + wind * 0.5, 1.5, 0.25); }
      if (!sinks.length && !tanks.length && bores.length === 1 && g.items.length > 1 && supply > 0) { /* pipe to nowhere */ }
      const any = supply > 0 || delivered > 0;
      if (any) g.links.forEach((l) => flowing.add(l));
      // hand pump with only a tank: tank fills; tank with open tap drains (handled above)
    }
  }
  const dirtyPatch = new Set();
  function markPatch(it) { dirtyPatch.add(it); }
  function flushPatches(patchFn) { dirtyPatch.forEach((it) => patchFn(it)); dirtyPatch.clear(); }

  function kite(it, wind) {
    const rec = physics.recOf(it.id);
    if (!rec || rec.body.isStatic) return;
    const tied = getLinks().some((l) => l.kind === 'string' && (l.a === it.id || l.b === it.id));
    const w = Math.abs(wind);
    if (tied) physics.push(rec, wind * 0.25, -(0.6 + w * w * 0.32));
    else physics.setVelocity(rec, rec.body.velocity.x * 0.98 + wind * 0.04, Math.min(rec.body.velocity.y, 3));
  }

  /** Bore casings in the soil cross-section (behind items). */
  function drawBack(ctx, view) {
    for (const it of getItems()) {
      if (it.type !== 'bore') continue;
      if (it.x < view.x - 200 || it.x > view.x + view.w + 200) continue;
      const base = anchorWorld(it, 'outlet');
      const top = base.y, bottom = physics.groundY + (it.d.depth || 900);
      const tbl = water.tableY(it.x);
      ctx.fillStyle = '#5d646c';
      ctx.fillRect(it.x - 12, top, 24, bottom - top);
      ctx.fillStyle = '#1d2228';
      ctx.fillRect(it.x - 7, top, 14, bottom - top);
      if (tbl < bottom) { ctx.fillStyle = 'rgba(80,160,255,.9)'; ctx.fillRect(it.x - 7, tbl, 14, bottom - tbl); }
      ctx.fillStyle = '#8a929b';
      for (let y = top; y < bottom; y += 120) ctx.fillRect(it.x - 15, y, 30, 8);
    }
  }
  /** Pipes are drawn with the other links; this tells if a pipe has water in it. */
  const isFlowing = (lid) => flowing.has(lid);

  /** Tap actions. */
  function tap(it) {
    if (it.type === 'bore' && (it.d.pump === 'hand' || !it.d.pump)) { it.d._burst = Math.min(1.5, (it.d._burst || 0) + 0.6); sfx.tick(); return true; }
    if (it.type === 'tap' || it.type === 'sprinkler') { it.d.on = !it.d.on; markPatch(it); sfx.click(); return true; }
    return false;
  }

  return { update, drawBack, isFlowing, tap, outlet, portOf, anchorWorld, flushPatches, TANK_CAP };
}
