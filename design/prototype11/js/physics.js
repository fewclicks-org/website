// Matter.js physics for the whiteboard: full gravity, toss, pins that swing, locks, buoyant balloons.
// window.Matter comes from ../vendor/matter.min.js.

import { pinOffset } from './items.js';

const GRAVITY = { on: 1, low: 0.25, off: 0 };

export function createPhysics({ width, height, reduced = false }) {
  const M = window.Matter;
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping, Events } = M;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = GRAVITY.on;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  const world = engine.world;

  const T = 400;
  Composite.add(world, [
    Bodies.rectangle(width / 2, height + T / 2, width + T * 2, T, { isStatic: true, label: 'floor', friction: 0.8 }),
    Bodies.rectangle(width / 2, -T / 2, width + T * 2, T, { isStatic: true, label: 'ceiling' }),
    Bodies.rectangle(-T / 2, height / 2, T, height + T * 2, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(width + T / 2, height / 2, T, height + T * 2, { isStatic: true, label: 'wall' }),
  ]);

  const map = new Map(); // id -> { item, body, w, h, pinC }
  let drag = null;
  let gravityMode = 'on';

  function bodyFor(item, w, h) {
    const sw = Math.max(8, w * item.s), sh = Math.max(8, h * item.s);
    const opts = {
      angle: item.a || 0,
      restitution: item.type === 'ball' ? 0.86 : item.type === 'balloon' ? 0.5 : 0.12,
      friction: 0.6,
      frictionAir: item.type === 'balloon' ? 0.04 : 0.015,
      density: item.type === 'title' ? 0.004 : item.type === 'balloon' ? 0.0004 : 0.0012,
      sleepThreshold: 50,
      label: item.id,
    };
    if (item.type === 'ball' || item.type === 'sun') return Bodies.circle(item.x, item.y, Math.min(sw, sh) / 2, opts);
    if (item.type === 'balloon') return Bodies.circle(item.x, item.y - sh * 0.12, sw / 2.1, opts);
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
    const body = bodyFor(item, w, h);
    const rec = { item, body, w, h, pinC: null, still: 0 };
    map.set(item.id, rec);
    Composite.add(world, body);
    applyPin(rec);
    // pins hold their tilt on load (friction of a real pushpin); a toss or bump sets them swinging
    if (item.pin === 'pin' && !item.v) freeze(rec);
    if (item.v) Body.setVelocity(body, item.v);
    return rec;
  }

  function remove(id) {
    const rec = map.get(id);
    if (!rec) return;
    if (rec.pinC) Composite.remove(world, rec.pinC);
    Composite.remove(world, rec.body);
    map.delete(id);
  }

  function clear() { [...map.keys()].forEach(remove); }

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
      Body.setPosition(rec.body, { x: pt.x + drag.dx, y: pt.y + drag.dy });
      Body.setVelocity(rec.body, { x: rec.body.position.x - prev.x, y: rec.body.position.y - prev.y });
    } else if (drag.mode === 'pin') {
      rec.pinC.pointA.x = pt.x + drag.dx;
      rec.pinC.pointA.y = pt.y + drag.dy;
      rec.item.pa = { x: rec.pinC.pointA.x, y: rec.pinC.pointA.y };
      Sleeping.set(rec.body, false);
    } else {
      drag.c.pointA.x = pt.x;
      drag.c.pointA.y = pt.y;
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
      const a = byBody(bodyA), b = byBody(bodyB);
      if (a?.frozen && !bodyB.isStatic) thaw(a);
      if (b?.frozen && !bodyA.isStatic) thaw(b);
    }
  });

  // balloons float: counter gravity with a little extra lift.
  // Pinned items get extra damping and are put to sleep once they hang still: Matter never sleeps
  // constrained bodies on its own, so without this they would tremble forever (and burn CPU).
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
      if (item.type === 'balloon' && !body.isStatic && !body.isSleeping) {
        Body.applyForce(body, body.position, { x: Math.sin(engine.timing.timestamp / 900 + body.id) * 0.00002 * body.mass, y: -g * 1.35 * body.mass });
      }
    });
  });

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
    engine, map, add, remove, clear, resize, setPin, nudge, setAngle, dragStart, dragMove, dragEnd, setGravity, step, settle,
    get gravity() { return gravityMode; },
    get dragging() { return !!drag; },
    bodyOf: (id) => map.get(id)?.body,
  };
}
