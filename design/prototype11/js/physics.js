// Matter.js physics for the whiteboard: an endless ground line, full gravity, toss, pins that swing,
// locks, links (string / tape), plus hooks the elements module uses for wind, water, heat and magnets.
// window.Matter comes from ../vendor/matter.min.js.

import { pinOffset } from './items.js';

const GRAVITY = { on: 1, low: 0.25, off: 0 };
const CIRCLES = new Set(['ball', 'coin', 'clock']);

export function createPhysics({ terrain, reduced = false }) {
  const groundY = terrain.groundY;
  const S = (x) => terrain.surfaceY(x);
  const M = window.Matter;
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping, Events } = M;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = GRAVITY.on;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  const world = engine.world;

  // the ground is the editable terrain (static segments per chunk, see world/terrain.js)

  const map = new Map(); // id -> { item, body, w, h, pinC, frozen, still }
  const links = new Map(); // id -> { link, cs: [constraints] }
  const hooks = [];
  let drag = null;
  let gravityMode = 'on';

  function bodyFor(item, w, h) {
    const sw = Math.max(8, w * item.s), sh = Math.max(8, h * item.s);
    const t = item.type;
    const opts = {
      angle: item.a || 0,
      restitution: t === 'ball' ? 0.86 : t === 'balloon' ? 0.5 : t === 'duck' || t === 'coin' ? 0.35 : 0.12,
      friction: t === 'ice' ? 0.02 : 0.6,
      frictionAir: t === 'balloon' ? 0.04 : 0.015,
      density: t === 'title' ? 0.004 : t === 'balloon' ? 0.0004 : t === 'coin' || t === 'magnet' || t === 'clip' ? 0.003 : 0.0012,
      sleepThreshold: 50,
      label: item.id,
    };
    if (t === 'water') {
      Object.assign(opts, { isSensor: !item.d?.frozen, friction: 0.01, frictionStatic: 0.02 });
      return Bodies.rectangle(item.x, item.y, sw, sh, opts);
    }
    if (CIRCLES.has(t)) return Bodies.circle(item.x, item.y, Math.min(sw, sh) / 2, opts);
    if (t === 'balloon') return Bodies.circle(item.x, item.y - sh * 0.12, sw / 2.1, opts);
    return Bodies.rectangle(item.x, item.y, sw, sh, { ...opts, chamfer: { radius: Math.min(10, sw / 6, sh / 6) } });
  }

  function applyPin(rec) {
    const { item, body } = rec;
    rec.frozen = false;
    rec.still = 0;
    if (rec.pinC) { Composite.remove(world, rec.pinC); rec.pinC = null; }
    Body.setStatic(body, item.pin === 'lock');
    if (item.pin === 'pin') {
      const off = pinOffset(item, rec.w, rec.h);
      const ox = off.x * item.s, oy = off.y * item.s;
      const c = Math.cos(body.angle), s = Math.sin(body.angle);
      const local = { x: ox * c - oy * s, y: ox * s + oy * c };
      const anchor = item.pa || { x: body.position.x + local.x, y: body.position.y + local.y };
      item.pa = { x: anchor.x, y: anchor.y };
      rec.pinC = Constraint.create({ pointA: { ...anchor }, bodyB: body, pointB: local, length: 0, stiffness: 0.95, damping: 0.02 });
      Composite.add(world, rec.pinC);
    } else {
      delete item.pa;
    }
    Sleeping.set(body, false);
  }

  function add(item, w, h) {
    // nothing may start below the ground line
    const hh = (h * item.s) / 2;
    const sy = S(item.x);
    if (item.y + hh > sy) item.y = sy - hh - (item.type === 'water' ? 0 : 1);
    const body = bodyFor(item, w, h);
    const rec = { item, body, w, h, pinC: null, still: 0, frozen: false };
    map.set(item.id, rec);
    Composite.add(world, body);
    applyPin(rec);
    // pins hold their tilt on load (friction of a real pushpin); a toss or bump sets them swinging
    if (item.pin === 'pin' && !item.v) freeze(rec);
    if (item.v) Body.setVelocity(body, item.v);
    links.forEach((L) => { if (L.link.a === item.id || L.link.b === item.id) attachLink(L); });
    return rec;
  }

  function remove(id) {
    const rec = map.get(id);
    if (!rec) return;
    links.forEach((L) => { if (L.link.a === id || L.link.b === id) detachLink(L); });
    if (rec.pinC) Composite.remove(world, rec.pinC);
    Composite.remove(world, rec.body);
    map.delete(id);
  }

  function clear() { [...map.keys()].forEach(remove); links.clear(); }

  /** Rebuild a body after its size/scale changed (keeps position, angle, pin). */
  function resize(id, w, h) {
    const rec = map.get(id);
    if (!rec) return;
    const { item } = rec;
    item.x = rec.body.position.x; item.y = rec.body.position.y; item.a = rec.body.angle;
    remove(id);
    add(item, w, h);
  }

  function setPin(id, mode) {
    const rec = map.get(id);
    if (!rec) return;
    rec.item.pin = mode;
    if (mode !== 'pin') delete rec.item.pa;
    applyPin(rec);
  }

  function nudge(id, vx, vy, spin = 0) {
    const rec = map.get(id);
    if (!rec || rec.item.pin === 'lock') return;
    thaw(rec);
    Sleeping.set(rec.body, false);
    Body.setVelocity(rec.body, { x: vx, y: vy });
    Body.setAngularVelocity(rec.body, spin);
  }

  function setAngle(id, a) {
    const rec = map.get(id);
    if (!rec) return;
    Body.setAngle(rec.body, a);
    rec.item.a = a;
    if (rec.item.pin === 'pin') { delete rec.item.pa; applyPin(rec); }
    Sleeping.set(rec.body, false);
  }

  /** Move an item (static or not) to a position, e.g. a drifting cloud. */
  function moveTo(id, x, y) {
    const rec = map.get(id);
    if (!rec) return;
    Body.setPosition(rec.body, { x, y });
    if (rec.pinC) { rec.pinC.pointA.x += x - rec.item.x; rec.pinC.pointA.y += y - rec.item.y; rec.item.pa = { ...rec.pinC.pointA }; }
    rec.item.x = x; rec.item.y = y;
  }

  // ---- links: string (springy), tape (welded), arrow (drawn only) ----
  function attachLink(L) {
    detachLink(L);
    const A = map.get(L.link.a), B = map.get(L.link.b);
    if (!A || !B || L.link.kind === 'arrow' || L.link.kind === 'pipe') return;
    if (L.link.kind === 'tape') {
      const dx = B.body.position.x - A.body.position.x, dy = B.body.position.y - A.body.position.y;
      const d = Math.hypot(dx, dy) || 1, px = (-dy / d) * 24, py = (dx / d) * 24;
      L.cs = [1, -1].map((k) => Constraint.create({ bodyA: A.body, bodyB: B.body, pointA: toLocal(A.body, k * px, k * py), pointB: toLocal(B.body, k * px, k * py), stiffness: 0.6, damping: 0.1 }));
    } else {
      L.cs = [Constraint.create({ bodyA: A.body, bodyB: B.body, length: L.link.len || 200, stiffness: 0.02, damping: 0.05 })];
    }
    L.cs.forEach((c) => Composite.add(world, c));
    thaw(A); thaw(B);
  }
  const toLocal = (body, x, y) => { const c = Math.cos(-body.angle), s = Math.sin(-body.angle); return { x: x * c - y * s, y: x * s + y * c }; };
  function detachLink(L) { (L.cs || []).forEach((c) => Composite.remove(world, c)); L.cs = []; }
  function addLink(link) {
    const L = { link, cs: [] };
    links.set(link.id, L);
    if (!link.len) { const A = map.get(link.a), B = map.get(link.b); if (A && B) link.len = Math.round(Math.hypot(A.body.position.x - B.body.position.x, A.body.position.y - B.body.position.y)); }
    attachLink(L);
  }
  function removeLink(id) { const L = links.get(id); if (L) { detachLink(L); links.delete(id); } }

  // ---- dragging & tossing ----
  function dragStart(id, pt) {
    const rec = map.get(id);
    if (!rec) return;
    const { body, item } = rec;
    thaw(rec);
    Sleeping.set(body, false);
    if (item.pin === 'lock') {
      drag = { rec, mode: 'lock', dx: body.position.x - pt.x, dy: body.position.y - pt.y };
    } else if (item.pin === 'pin') {
      drag = { rec, mode: 'pin', dx: rec.pinC.pointA.x - pt.x, dy: rec.pinC.pointA.y - pt.y };
    } else {
      const local = { x: pt.x - body.position.x, y: pt.y - body.position.y };
      const c = Constraint.create({ pointA: { ...pt }, bodyB: body, pointB: local, stiffness: 0.18, damping: 0.08, length: 0 });
      Composite.add(world, c);
      drag = { rec, mode: 'loose', c };
    }
  }
  function dragMove(pt) {
    if (!drag) return;
    const { rec } = drag;
    if (drag.mode === 'lock') {
      const prev = { ...rec.body.position };
      const h = (rec.h * rec.item.s) / 2;
      Body.setPosition(rec.body, { x: pt.x + drag.dx, y: Math.min(S(pt.x + drag.dx) - (rec.item.type === 'water' ? h : h * 0.5), pt.y + drag.dy) });
      Body.setVelocity(rec.body, { x: rec.body.position.x - prev.x, y: rec.body.position.y - prev.y });
    } else if (drag.mode === 'pin') {
      rec.pinC.pointA.x = pt.x + drag.dx;
      rec.pinC.pointA.y = Math.min(S(pt.x + drag.dx) - 10, pt.y + drag.dy);
      rec.item.pa = { x: rec.pinC.pointA.x, y: rec.pinC.pointA.y };
      Sleeping.set(rec.body, false);
    } else {
      drag.c.pointA.x = pt.x;
      drag.c.pointA.y = Math.min(S(pt.x), pt.y);
    }
  }
  function dragEnd() {
    if (!drag) return null;
    if (drag.mode === 'loose') Composite.remove(world, drag.c);
    if (drag.mode === 'lock') Body.setVelocity(drag.rec.body, { x: 0, y: 0 });
    const id = drag.rec.item.id;
    drag = null;
    return id;
  }

  function setGravity(mode) {
    const next = mode in GRAVITY ? mode : 'on';
    if (next === gravityMode && engine.gravity.y === GRAVITY[next]) return;
    gravityMode = next;
    engine.gravity.y = GRAVITY[gravityMode];
    map.forEach((r) => { thaw(r); Sleeping.set(r.body, false); });
  }

  // A pinned item that hangs still is frozen (made static) until something touches it.
  function freeze(rec) {
    rec.still = 0;
    rec.frozen = true;
    Body.setVelocity(rec.body, { x: 0, y: 0 });
    Body.setAngularVelocity(rec.body, 0);
    Body.setStatic(rec.body, true);
  }
  function thaw(rec) {
    if (!rec?.frozen) return;
    rec.frozen = false;
    rec.still = 0;
    if (rec.item.pin !== 'lock') Body.setStatic(rec.body, false);
  }
  const byBody = (b) => map.get(b.label);
  Events.on(engine, 'collisionStart', (ev) => {
    for (const { bodyA, bodyB } of ev.pairs) {
      if (bodyA.isSensor || bodyB.isSensor) continue;
      const a = byBody(bodyA), b = byBody(bodyB);
      if (a?.frozen && !bodyB.isStatic) thaw(a);
      if (b?.frozen && !bodyA.isStatic) thaw(b);
    }
  });

  Events.on(engine, 'beforeUpdate', () => {
    const g = engine.gravity.y * engine.gravity.scale;
    map.forEach((rec) => {
      const { item, body } = rec;
      if (item.pin === 'pin' && !rec.frozen && drag?.rec !== rec) {
        Body.setAngularVelocity(body, body.angularVelocity * 0.985);
        if (body.speed < 0.06 && Math.abs(body.angularVelocity) < 0.001) {
          if (++rec.still > 45) freeze(rec);
        } else rec.still = 0;
      }
      // balloons float: counter gravity with a little extra lift
      if (item.type === 'balloon' && !body.isStatic && !body.isSleeping) {
        Body.applyForce(body, body.position, { x: Math.sin(engine.timing.timestamp / 900 + body.id) * 0.00002 * body.mass, y: -g * 1.35 * body.mass });
      }
    });
    for (const fn of hooks) fn(g);
  });

  /** Apply a force (in units of gravity accelerations) to a body; wakes frozen items. */
  function push(rec, fx, fy) {
    if (!rec || rec.body.isStatic && !rec.frozen) return;
    if (rec.frozen) { if (Math.hypot(fx, fy) < 0.15) return; thaw(rec); }
    const k = engine.gravity.scale * rec.body.mass;
    Sleeping.set(rec.body, false);
    Body.applyForce(rec.body, rec.body.position, { x: fx * k, y: fy * k });
  }
  function setVelocity(rec, vx, vy) { if (!rec.body.isStatic) Body.setVelocity(rec.body, { x: vx, y: vy }); }
  function setSolid(id, solid, friction) {
    const rec = map.get(id);
    if (!rec) return;
    rec.body.isSensor = !solid;
    if (friction != null) rec.body.friction = friction;
    map.forEach((r) => Sleeping.set(r.body, false));
  }

  /** Advance the simulation; returns true if anything moved. */
  function step(dt) {
    // fixed 60 Hz substeps so slow frames don't slow down the world (max 3 per frame)
    const n = reduced ? 1 : Math.max(1, Math.min(3, Math.round(dt / 16.667)));
    for (let i = 0; i < n; i++) Engine.update(engine, 16.667);
    let moved = false;
    map.forEach(({ item, body }) => {
      if (!body.isSleeping || drag?.rec.body === body) {
        if (Math.abs(item.x - body.position.x) > 0.01 || Math.abs(item.y - body.position.y) > 0.01 || Math.abs(item.a - body.angle) > 0.0001) moved = true;
        item.x = body.position.x;
        item.y = body.position.y;
        item.a = body.angle;
      }
    });
    return moved;
  }

  /** Settle instantly (used for reduced motion / first paint). */
  function settle(steps = 240) { for (let i = 0; i < steps; i++) step(16.667); }

  return {
    M, engine, map, groundY, terrain, add, remove, clear, resize, setPin, nudge, setAngle, moveTo, dragStart, dragMove, dragEnd, setGravity, step, settle,
    addLink, removeLink, links, push, setVelocity, setSolid, thaw: (id) => thaw(map.get(id)), onBeforeUpdate: (fn) => hooks.push(fn),
    get gravity() { return gravityMode; },
    get dragging() { return !!drag; },
    get dragId() { return drag?.rec.item.id || null; },
    bodyOf: (id) => map.get(id)?.body,
    recOf: (id) => map.get(id),
    /** Bodies that block rain / lightning (solid, not sensors). */
    solids: () => [...map.values()].filter((r) => !r.body.isSensor).map((r) => r.body),
  };
}
