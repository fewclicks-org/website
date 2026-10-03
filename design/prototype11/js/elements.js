// Elements & weather: clouds (rain / snow / storm), fire, water + ice, wind + fans, lightning, magnets,
// plants, extinguisher foam, spinner + clock toys and links (string / tape / arrow).
// Particles live in world space and are drawn on a screen-space canvas between the items and the lights.
// Rain and snow are blocked by items: every drop is tested against the real physics bodies.

import { PAPER_TYPES, METAL_TYPES, FLOATERS } from './items.js';

const MAX_PARTICLES = 1400;
const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

export function createElements({ physics, lights, camera, canvas, els, sizes, getItems, getLinks, api }) {
  const ctx = canvas.getContext('2d');
  const { Query } = physics.M;
  const G = physics.groundY;
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  addEventListener('resize', resize);
  resize();

  const world = { wind: 0 };
  const P = []; // particles
  const bolts = [];
  const state = new Map(); // per-item runtime state (not saved): next strike, spray timer, spin velocity
  const st = (id) => { let s = state.get(id); if (!s) state.set(id, (s = {})); return s; };
  let changed = false;
  let drewSomething = false;
  let lastClock = 0;
  let burnHinted = false;

  const of = (type) => getItems().filter((i) => i.type === type);
  const near = (it, rect, m = 600) => it.x > rect.x - m && it.x < rect.x + rect.w + m && it.y > rect.y - m && it.y < rect.y + rect.h + m;
  const dims = (it) => { const s = sizes.get(it.id) || { w: 100, h: 100 }; return { w: s.w * it.s, h: s.h * it.s }; };
  const add = (p) => { if (P.length < MAX_PARTICLES) P.push(p); };
  const mark = () => { changed = true; };

  // ---------------- per-substep forces (water, fans, heat, magnets, wind) ----------------
  physics.onBeforeUpdate(() => {
    const items = getItems();
    const g = physics.engine.gravity.y;
    const pools = items.filter((i) => i.type === 'water' && !i.d.frozen);
    const fans = items.filter((i) => i.type === 'fan' && i.d.on);
    const fires = items.filter((i) => i.type === 'fire' && i.d.lit !== false);
    const magnets = items.filter((i) => i.type === 'magnet');
    if (!pools.length && !fans.length && !fires.length && !magnets.length && !world.wind) return;
    physics.map.forEach((rec) => {
      const { item, body } = rec;
      if (item.type === 'water' || item.type === 'cloud' || (body.isStatic && !rec.frozen)) return;
      if (physics.dragId === item.id) return;
      // water: buoyancy + drag
      for (const w of pools) {
        const wb = physics.bodyOf(w.id)?.bounds;
        if (!wb || body.position.x < wb.min.x || body.position.x > wb.max.x || body.bounds.max.y < wb.min.y || body.bounds.min.y > wb.max.y) continue;
        const hgt = body.bounds.max.y - body.bounds.min.y || 1;
        const frac = Math.max(0, Math.min(1, (body.bounds.max.y - wb.min.y) / hgt));
        const k = FLOATERS.has(item.type) ? 1.9 : 0.55;
        if (g) physics.push(rec, 0, -k * frac * g);
        physics.setVelocity(rec, body.velocity.x * 0.97, body.velocity.y * 0.95);
        if (!rec.wet && body.velocity.y > 5) splash(body.position.x, wb.min.y, 10);
        rec.wet = true;
        if (item.type === 'fire' && item.d.lit !== false) extinguish(item);
      }
      // fans blow along their facing
      for (const f of fans) {
        if (f.id === item.id) continue;
        const dir = f.a + (f.d.dir < 0 ? Math.PI : 0);
        const dx = Math.cos(dir), dy = Math.sin(dir);
        const o = { x: f.x + dx * 60 * f.s, y: f.y - 10 * f.s };
        const vx = body.position.x - o.x, vy = body.position.y - o.y;
        const along = vx * dx + vy * dy;
        const L = 1000 * (f.d.power || 1) * f.s;
        if (along < 0 || along > L) continue;
        const perp = Math.abs(vx * dy - vy * dx);
        if (perp > along * 0.42 + 70 * f.s) continue;
        const fall = 1 - along / L;
        const pw = 1.1 * (f.d.power || 1) * fall * (FLOATERS.has(item.type) ? 1.3 : 0.7);
        physics.push(rec, dx * pw, dy * pw);
      }
      // heat rises above fires
      for (const f of fires) {
        const dx = body.position.x - f.x, dy = f.y - body.position.y;
        if (Math.abs(dx) > 140 * f.s || dy < 60 || dy > 900) continue;
        physics.push(rec, 0, -0.55 * (1 - dy / 900) * (item.type === 'balloon' ? 2 : FLOATERS.has(item.type) ? 0.9 : 0.2));
      }
      // magnets pull metal
      const metal = METAL_TYPES.has(item.type) || (item.type === 'sticker' && item.d.key === 'coin');
      if (metal) {
        for (const m of magnets) {
          if (m.id === item.id) continue;
          const dm = dims(m);
          const pole = rot(0, dm.h * 0.42, m.a);
          const px = m.x + pole.x - body.position.x, py = m.y + pole.y - body.position.y;
          const d = Math.max(40, Math.hypot(px, py));
          const str = m.d.strength || 1;
          if (d > 1000 * str) continue;
          const f = Math.min(4, (140000 * str) / (d * d));
          physics.push(rec, (px / d) * f, (py / d) * f);
          if (d < 70) physics.setVelocity(rec, body.velocity.x * 0.6, body.velocity.y * 0.6);
        }
      }
      // global wind nudges light things
      if (world.wind && (item.type === 'balloon' || FLOATERS.has(item.type) && !item.pin)) physics.push(rec, world.wind * 0.08, 0);
    });
  });

  // ---------------- particles ----------------
  function splash(x, y, n = 3, col = 'rgba(90,140,200,.8)') {
    for (let i = 0; i < n; i++) add({ k: 'splash', x, y: y - 2, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, life: 16 + Math.random() * 10, col });
  }
  function smoke(x, y, n = 10) {
    for (let i = 0; i < n; i++) add({ k: 'smoke', x: x + (Math.random() - 0.5) * 60, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 1.2, vy: -1 - Math.random() * 1.5, life: 60 + Math.random() * 40, r: 10 + Math.random() * 16 });
  }
  function ash(item) {
    const { w, h } = dims(item);
    for (let i = 0; i < 70; i++) add({ k: Math.random() < 0.3 ? 'ember' : 'ash', x: item.x + (Math.random() - 0.5) * w, y: item.y + (Math.random() - 0.5) * h, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, life: 50 + Math.random() * 60, g: 0.12 });
  }

  function extinguish(fire) {
    if (fire.d.lit === false) return;
    fire.d.lit = false;
    fire.d.wet = 0;
    api.patch(fire);
    smoke(fire.x, fire.y - 60 * fire.s, 18);
    api.sfx.fizz();
    mark();
  }
  function ignite(fire) {
    fire.d.lit = true;
    fire.d.wet = 0;
    api.patch(fire);
    api.sfx.whoosh();
    mark();
  }

  /** Raycast straight down from (x, y) to the first solid item (or the ground). */
  function castDown(x, y, skip = new Set()) {
    let best = { y: G, rec: null };
    physics.map.forEach((rec) => {
      if (skip.has(rec.item.id) || rec.body.isSensor || rec.item.type === 'cloud') return;
      const b = rec.body.bounds;
      if (x < b.min.x || x > b.max.x || b.max.y < y) return;
      // walk down the body's column to find its real top at x
      for (let yy = Math.max(y, b.min.y); yy <= b.max.y; yy += 6) {
        if (yy >= best.y) break;
        if (Query.point([rec.body], { x, y: yy }).length) { best = { y: yy, rec }; break; }
      }
    });
    return best;
  }

  function strike(cloud) {
    const { w, h } = dims(cloud);
    const x0 = cloud.x + (Math.random() - 0.5) * w * 0.4, y0 = cloud.y + h * 0.35;
    const hit = castDown(x0, y0, new Set([cloud.id]));
    const pts = [[x0, y0]];
    const steps = Math.max(4, Math.round((hit.y - y0) / 70));
    for (let i = 1; i < steps; i++) pts.push([x0 + (Math.random() - 0.5) * 70, y0 + ((hit.y - y0) * i) / steps]);
    pts.push([x0, hit.y]);
    bolts.push({ pts, life: 16 });
    lights.strike(1);
    api.sfx.thunder();
    for (let i = 0; i < 16; i++) add({ k: 'ember', x: x0, y: hit.y, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 8, life: 20 + Math.random() * 20, g: 0.4 });
    const rec = hit.rec;
    if (rec) {
      const it = rec.item;
      if (it.pin === 'pin') { physics.setPin(it.id, null); api.syncState(it); }
      physics.nudge(it.id, (Math.random() - 0.5) * 16, -14, (Math.random() - 0.5) * 0.3);
      if (PAPER_TYPES.has(it.type) && Math.random() < 0.7) { it.d.onfire = true; it.d.burn = Math.max(it.d.burn || 0, 0.05); api.patch(it); }
      if (it.type === 'fire' && it.d.lit === false) ignite(it);
      if (it.type === 'plant') { it.d.dry = 1; api.patch(it); }
    }
    mark();
  }

  function spray(ext) {
    st(ext.id).spray = 70;
    api.sfx.whoosh();
  }
  function spin(item) {
    const s = st(item.id);
    s.vel = 0.35 + Math.random() * 0.25;
    s.angle = item.d.wheel || 0;
    api.sfx.roll();
  }

  // ---------------- per frame ----------------
  function update(dt, now) {
    const t60 = Math.min(3, dt / 16.667);
    const items = getItems();
    const view = camera.viewRect();
    changed = false;

    // clouds: drift + precipitation + storms
    for (const c of of('cloud')) {
      const s = st(c.id);
      const mode = c.d.mode || 'rain';
      if (world.wind && physics.dragId !== c.id) physics.moveTo(c.id, c.x + world.wind * 0.6 * t60, c.y);
      if (!near(c, view, 900) || mode === 'none') continue;
      const { w, h } = dims(c);
      const amount = c.d.amount ?? 0.6;
      if (mode === 'snow') {
        if (Math.random() < amount * 1.6 * t60 * (w / 260)) add({ k: 'snow', x: c.x + (Math.random() - 0.5) * w * 0.8, y: c.y + h * 0.3, vx: 0, vy: 1.4 + Math.random(), life: 900, ph: Math.random() * 6, src: c.id });
      } else {
        const n = amount * (mode === 'storm' ? 5 : 3) * t60 * (w / 260);
        for (let i = 0; i < n || Math.random() < n - i; i++) add({ k: 'rain', x: c.x + (Math.random() - 0.5) * w * 0.76, y: c.y + h * 0.3, vx: world.wind * 3, vy: 9 + Math.random() * 3, life: 400, src: c.id });
        if (mode === 'storm') {
          if (!s.next) s.next = now + 4000 + Math.random() * 6000;
          if (now >= s.next) { s.next = now + 6000 + Math.random() * 9000; strike(c); }
        }
      }
    }

    // fans: visible wind streaks + they push clouds and drops
    const fans = items.filter((f) => f.type === 'fan' && f.d.on);
    for (const f of fans) {
      if (!near(f, view, 400)) continue;
      const dir = f.a + (f.d.dir < 0 ? Math.PI : 0);
      if (Math.random() < 0.5 * t60) add({ k: 'wind', x: f.x + Math.cos(dir) * 70 * f.s, y: f.y - 10 * f.s + (Math.random() - 0.5) * 90 * f.s, vx: Math.cos(dir) * 14 * (f.d.power || 1), vy: Math.sin(dir) * 14 * (f.d.power || 1), life: 40 + Math.random() * 20 });
    }
    const fanVec = (x, y) => {
      let fx = 0, fy = 0;
      for (const f of fans) {
        const dir = f.a + (f.d.dir < 0 ? Math.PI : 0), dx = Math.cos(dir), dy = Math.sin(dir);
        const vx = x - f.x, vy = y - f.y, along = vx * dx + vy * dy, L = 1000 * (f.d.power || 1) * f.s;
        if (along < 0 || along > L || Math.abs(vx * dy - vy * dx) > along * 0.42 + 70 * f.s) continue;
        const k = (1 - along / L) * (f.d.power || 1);
        fx += dx * k; fy += dy * k;
      }
      return { x: fx, y: fy };
    };
    for (const c of of('cloud')) {
      if (physics.dragId === c.id) continue;
      const v = fanVec(c.x, c.y);
      if (v.x || v.y) physics.moveTo(c.id, c.x + v.x * 2 * t60, c.y + v.y * 2 * t60);
    }

    // fires: burning, melting, wilting, embers, wetness
    const fires = items.filter((f) => f.type === 'fire' && f.d.lit !== false);
    for (const f of fires) {
      const size = (f.d.size || 1) * f.s;
      const zone = { x1: f.x - 55 * size, x2: f.x + 55 * size, y1: f.y - 150 * size, y2: f.y + 30 * size };
      if (near(f, view, 300) && Math.random() < 0.35 * t60) add({ k: 'ember', x: f.x + (Math.random() - 0.5) * 50 * size, y: f.y - 40 * size, vx: (Math.random() - 0.5) * 1.4, vy: -2 - Math.random() * 2.5, life: 30 + Math.random() * 40, g: -0.02 });
      f.d.wet = Math.max(0, (f.d.wet || 0) - 0.0015 * t60);
      for (const it of items) {
        if (it === f) continue;
        const b = physics.bodyOf(it.id)?.bounds;
        if (!b) continue;
        const touching = b.max.x > zone.x1 && b.min.x < zone.x2 && b.max.y > zone.y1 && b.min.y < zone.y2;
        if (touching && PAPER_TYPES.has(it.type)) { it.d.burn = (it.d.burn || 0) + dt / 2600; api.patch(it); mark(); }
        if (touching && it.type === 'ice') { it.d.melt = (it.d.melt || 0) + dt / 3500; api.patch(it); mark(); }
        if (it.type === 'fire' && it.d.lit === false && touching) ignite(it);
        if (it.type === 'water' && it.d.frozen && Math.hypot(it.x - f.x, it.y - f.y) < 700) { it.d.ice = (it.d.ice || 1) - 0.004 * t60; if (it.d.ice < 0.5) thawWater(it); api.patch(it); mark(); }
        if (it.type === 'plant' && Math.hypot(it.x - f.x, it.y - f.y) < 380) { it.d.dry = Math.min(1, (it.d.dry || 0) + 0.004 * t60); it.d.growth = Math.max(0.15, (it.d.growth ?? 0.5) - 0.0006 * t60); api.patch(it); mark(); }
        if (it.d?.snow && Math.hypot(it.x - f.x, it.y - f.y) < 600) { it.d.snow = Math.max(0, it.d.snow - 0.01 * t60); mark(); }
      }
    }

    // things that are on fire by themselves (struck by lightning) + burn-up
    for (const it of items) {
      if (it.d?.onfire) {
        it.d.burn = (it.d.burn || 0) + dt / 4200;
        api.patch(it);
        if (Math.random() < 0.5 * t60) { const b = physics.bodyOf(it.id)?.bounds; if (b) add({ k: 'ember', x: b.min.x + Math.random() * (b.max.x - b.min.x), y: b.min.y + Math.random() * 20, vx: (Math.random() - 0.5), vy: -2 - Math.random() * 2, life: 30 + Math.random() * 30, g: -0.02 }); }
        mark();
      }
      if (it.d?.burn >= 1) { ash(it); api.remove(it, 'burn'); if (!burnHinted) { burnHinted = true; api.toast('Burnt to ashes! Press Ctrl+Z (or Undo) to bring it back.'); } }
      if (it.type === 'ice' && it.d.melt >= 1) { splash(it.x, it.y, 14); api.remove(it, 'melt'); }
    }

    // snow melts slowly in daylight
    const sunUp = lights.darkness < 0.3 && items.some((i) => i.type === 'sun');
    if (sunUp && Math.random() < 0.2) for (const it of items) if (it.d?.snow) { it.d.snow = Math.max(0, it.d.snow - 0.002); }

    // water: plants drink from pools
    for (const p of of('plant')) {
      for (const w of of('water')) {
        if (w.d.frozen) continue;
        const wb = physics.bodyOf(w.id)?.bounds, pb = physics.bodyOf(p.id)?.bounds;
        if (wb && pb && pb.max.x > wb.min.x && pb.min.x < wb.max.x && pb.max.y > wb.min.y - 30 && pb.min.y < wb.max.y) { grow(p, 0.0008 * t60); }
      }
    }

    // extinguisher spray
    for (const e of of('extinguisher')) {
      const s = st(e.id);
      if (!s.spray) continue;
      s.spray -= t60;
      const n = rot(48 * e.s, -46 * e.s, e.a);
      for (let i = 0; i < 4; i++) {
        const a = e.a + (Math.random() - 0.5) * 0.35;
        add({ k: 'foam', x: e.x + n.x, y: e.y + n.y, vx: Math.cos(a) * (12 + Math.random() * 6), vy: Math.sin(a) * (12 + Math.random() * 6) - 1, life: 70, g: 0.25 });
      }
      if (s.spray <= 0) s.spray = 0;
    }

    // spinner wheels
    for (const sp of of('spinner')) {
      const s = state.get(sp.id);
      const wheel = els.get(sp.id)?.querySelector('.wheel');
      if (wheel && wheel.dataset.a !== String(sp.d.wheel || 0) && !s?.vel) { wheel.style.transform = `rotate(${sp.d.wheel || 0}rad)`; wheel.dataset.a = String(sp.d.wheel || 0); }
      if (!s?.vel) continue;
      s.angle += s.vel * t60;
      s.vel *= Math.pow(0.985, t60);
      if (wheel) wheel.style.transform = `rotate(${s.angle}rad)`;
      if (s.vel < 0.0025) {
        s.vel = 0;
        sp.d.wheel = s.angle % (Math.PI * 2);
        const labels = sp.d.labels || ['Play', 'Again', 'Win', 'GG', 'Wow', 'Yay'];
        // the pointer is at the top (-90°): which segment is under it?
        const a = ((-Math.PI / 2 - sp.d.wheel) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
        const idx = Math.floor(((a + Math.PI / 2) % (Math.PI * 2)) / ((Math.PI * 2) / labels.length));
        api.toast(`🎡 ${labels[idx % labels.length]}!`);
        api.sfx.success();
        api.commit();
      }
    }

    // clocks tick (real local time)
    if (now - lastClock > 1000) {
      lastClock = now;
      const d = new Date();
      for (const c of of('clock')) {
        const el = els.get(c.id);
        if (!el || !near(c, view, 200)) continue;
        const sec = d.getSeconds(), min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
        el.querySelector('.hh')?.style.setProperty('transform', `rotate(${hr * 30}deg)`);
        el.querySelector('.mm')?.style.setProperty('transform', `rotate(${min * 6}deg)`);
        el.querySelector('.ss')?.style.setProperty('transform', `rotate(${sec * 6}deg)`);
      }
    }

    // move particles + collisions (rain & snow are blocked by items)
    if (P.length) {
      const solids = [];
      const skipIds = new Set(of('cloud').map((c) => c.id));
      physics.map.forEach((rec) => { if (!rec.body.isSensor && !skipIds.has(rec.item.id)) solids.push(rec); });
      const solidBodies = solids.map((r) => r.body);
      const pools = of('water').filter((w) => !w.d.frozen).map((w) => ({ w, b: physics.bodyOf(w.id)?.bounds })).filter((p) => p.b);
      const recByBody = new Map(solids.map((r) => [r.body, r]));
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life -= t60;
        if (p.k === 'rain' || p.k === 'snow' || p.k === 'foam') {
          const fv = fanVec(p.x, p.y);
          p.vx += (fv.x * 0.6 + (p.k === 'rain' ? world.wind * 0.02 : 0)) * t60;
          p.vy += fv.y * 0.6 * t60;
          if (p.k === 'rain') p.vy = Math.min(22, p.vy + 0.5 * t60);
          if (p.k === 'snow') { p.ph += 0.05 * t60; p.vx = p.vx * 0.96 + (Math.sin(p.ph) * 0.6 + world.wind * 1.2) * 0.04; p.vy = Math.min(2.6, p.vy + 0.02 * t60); }
          if (p.k === 'foam') p.vy += p.g * t60;
          p.x += p.vx * t60; p.y += p.vy * t60;
          // pools first (sensor water)
          const pool = pools.find(({ b }) => p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y);
          if (pool) {
            if (p.k === 'snow') { pool.w.d.ice = Math.min(1.2, (pool.w.d.ice || 0) + 0.012); if (pool.w.d.ice >= 1 && !pool.w.d.frozen) freezeWater(pool.w); api.patch(pool.w); mark(); }
            else splash(p.x, pool.b.min.y, 1);
            P.splice(i, 1); continue;
          }
          const hit = Query.point(solidBodies, { x: p.x, y: p.y })[0];
          if (hit || p.y >= G) {
            const rec = hit && recByBody.get(hit);
            onHit(p, rec);
            if (p.k === 'rain') splash(p.x, Math.min(p.y, G), 2);
            if (p.k === 'snow' && !rec) { /* snow melts on the ground */ }
            P.splice(i, 1); continue;
          }
          if (p.life <= 0 || p.y > G + 10) { P.splice(i, 1); continue; }
        } else {
          p.vy += (p.g ?? 0.3) * t60;
          if (p.k === 'smoke') { p.vy = -1.2; p.r += 0.4 * t60; }
          if (p.k === 'wind') p.vy -= (p.g ?? 0.3) * t60;
          p.x += p.vx * t60; p.y += p.vy * t60;
          if (p.y > G && p.k !== 'smoke') { p.y = G; p.vy *= -0.2; p.vx *= 0.7; }
          if (p.life <= 0) P.splice(i, 1);
        }
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) if ((bolts[i].life -= t60) <= 0) bolts.splice(i, 1);
    return changed;
  }

  function onHit(p, rec) {
    if (!rec) return;
    const it = rec.item;
    if (p.k === 'rain') {
      if (it.type === 'fire' && it.d.lit !== false) { it.d.wet = (it.d.wet || 0) + 0.02; if (it.d.wet >= 1) extinguish(it); mark(); }
      if (it.d.onfire) { it.d.wet = (it.d.wet || 0) + 0.05; if (it.d.wet >= 1) { it.d.onfire = false; it.d.wet = 0; smoke(it.x, it.y, 8); api.sfx.fizz(); } mark(); }
      if (it.type === 'plant') grow(it, 0.0004);
    } else if (p.k === 'snow') {
      if (it.type === 'fire') { it.d.wet = (it.d.wet || 0) + 0.01; if (it.d.wet >= 1) extinguish(it); return; }
      it.d.snow = Math.min(1, (it.d.snow || 0) + 0.005);
      mark();
    } else if (p.k === 'foam') {
      if (it.type === 'fire') { it.d.wet = (it.d.wet || 0) + 0.12; if (it.d.wet >= 1) extinguish(it); }
      if (it.d.onfire) { it.d.onfire = false; smoke(it.x, it.y, 6); }
      mark();
    }
  }
  function grow(p, by) {
    const g0 = p.d.growth ?? 0.5;
    p.d.growth = Math.min(1, g0 + by);
    p.d.dry = Math.max(0, (p.d.dry || 0) - by * 4);
    if (Math.abs(p.d.growth - (p._pg || 0)) > 0.004 || p.d.dry < 0.5) { p._pg = p.d.growth; api.patch(p); }
    mark();
  }
  function freezeWater(w) {
    w.d.frozen = true;
    w.d.ice = 1;
    physics.setSolid(w.id, true, 0.01);
    api.patch(w);
    api.sfx.tick();
    api.toast('The water froze into ice. Slippery!');
    mark();
  }
  function thawWater(w) {
    w.d.frozen = false;
    w.d.ice = 0;
    physics.setSolid(w.id, false, 0.01);
    api.patch(w);
    splash(w.x, w.y, 20);
    mark();
  }

  // ---------------- drawing ----------------
  function draw(cam) {
    const items = getItems();
    const links = getLinks();
    const snowy = items.filter((i) => i.d?.snow > 0.02);
    if (!P.length && !bolts.length && !links.length && !snowy.length) {
      if (drewSomething) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); drewSomething = false; }
      return;
    }
    drewSomething = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const z = cam.z;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * z * dpr, -cam.y * z * dpr);
    const view = camera.viewRect();
    const inView = (x, y, m = 40) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;

    // links under particles
    for (const l of links) {
      const A = items.find((i) => i.id === l.a), B = items.find((i) => i.id === l.b);
      if (!A || !B) continue;
      ctx.save();
      if (l.kind === 'tape') {
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ang = Math.atan2(B.y - A.y, B.x - A.x), len = Math.hypot(B.x - A.x, B.y - A.y);
        ctx.translate(mx, my); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(200,200,205,.75)';
        ctx.fillRect(-len / 2 - 20, -18, len + 40, 36);
        ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1 / z;
        ctx.strokeRect(-len / 2 - 20, -18, len + 40, 36);
      } else if (l.kind === 'arrow') {
        const db = dims(B);
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        const len = Math.hypot(B.x - A.x, B.y - A.y) - Math.min(db.w, db.h) * 0.55;
        const ex = A.x + Math.cos(ang) * len, ey = A.y + Math.sin(ang) * len;
        const mx = (A.x + ex) / 2 - Math.sin(ang) * 40, my = (A.y + ey) / 2 + Math.cos(ang) * 40;
        ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        const ha = Math.atan2(ey - my, ex - mx);
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ha - 0.5) * 34, ey - Math.sin(ha - 0.5) * 34);
        ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ha + 0.5) * 34, ey - Math.sin(ha + 0.5) * 34); ctx.stroke();
      } else {
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const sag = Math.max(10, ((l.len || len) - len) * 0.5 + 20);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo((A.x + B.x) / 2, (A.y + B.y) / 2 + sag, B.x, B.y); ctx.stroke();
      }
      ctx.restore();
    }

    // snow caps on top edges of items
    for (const it of snowy) {
      const body = physics.bodyOf(it.id);
      if (!body || !inView(it.x, it.y, 400)) continue;
      const v = body.vertices;
      let best = null;
      for (let i = 0; i < v.length; i++) {
        const a = v[i], b = v[(i + 1) % v.length];
        const ex = b.x - a.x, ey = b.y - a.y, l = Math.hypot(ex, ey);
        if (l < 8) continue;
        const ny = -ex / l; // outward normal y for clockwise vertices
        if (!best || ny < best.ny) best = { a, b, ny, l };
      }
      if (!best || best.ny > -0.3) continue;
      const th = 4 + it.d.snow * 18;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#c9d6e4'; ctx.lineWidth = th + 4;
      ctx.beginPath(); ctx.moveTo(best.a.x, best.a.y - th / 2); ctx.lineTo(best.b.x, best.b.y - th / 2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = th;
      ctx.beginPath(); ctx.moveTo(best.a.x, best.a.y - th / 2 - 1); ctx.lineTo(best.b.x, best.b.y - th / 2 - 1); ctx.stroke();
    }

    // particles
    ctx.lineCap = 'round';
    for (const p of P) {
      if (!inView(p.x, p.y)) continue;
      switch (p.k) {
        case 'rain':
          ctx.strokeStyle = 'rgba(70,120,180,.55)'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4); ctx.stroke();
          break;
        case 'snow':
          ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(120,140,170,.7)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          break;
        case 'foam':
          ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 7 + (70 - p.life) * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          break;
        case 'splash':
          ctx.fillStyle = p.col || 'rgba(90,140,200,.8)';
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},40,${Math.min(1, p.life / 30)})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
          break;
        case 'ash':
          ctx.fillStyle = `rgba(40,40,40,${Math.min(0.8, p.life / 60)})`;
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
          break;
        case 'smoke':
          ctx.fillStyle = `rgba(120,120,125,${Math.min(0.35, p.life / 200)})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          break;
        case 'wind':
          ctx.strokeStyle = `rgba(17,17,17,${Math.min(0.25, p.life / 120)})`; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.stroke();
          break;
        default: break;
      }
    }
    // lightning
    for (const b of bolts) {
      for (const [w, col] of [[18, 'rgba(160,190,255,.35)'], [7, '#fff8c0'], [3, '#fff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round';
        ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
  }

  return {
    world, update, draw, strike, extinguish, ignite, spray, spin, resize,
    freezeWater, thawWater,
    get busy() { return P.length > 0 || bolts.length > 0; },
    particleCount: () => P.length,
    _parts: () => P,
  };
}
