// Physics Playground: turns DOM elements inside a container into Matter.js bodies you can grab and throw.
// Matter is loaded as a classic script (window.Matter) from ../vendor/matter.min.js.

import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';

/**
 * @param {HTMLElement} container  position:relative box; children with [data-body] become physics bodies
 * @param {object} opts
 *   shape: el => 'rect'|'circle' (default from data-body attribute)
 *   drop:  'top' (fall in from above) | 'scatter'
 *   grab:  allow mouse dragging (desktop)
 *   onClickBody(el): called for a click without drag (otherwise links are followed normally)
 */
export function createPlayground(container, opts = {}) {
  const M = window.Matter;
  const els = [...container.querySelectorAll('[data-body]')];
  if (!M || reducedMotion) {
    container.classList.add('is-static');
    return { static: true, zeroG() {}, shake() {}, reset() {}, setGravity() {}, add() {}, destroy() {} };
  }
  container.classList.add('is-physics');
  const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = M;
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.y = opts.gravity ?? 1;
  const world = engine.world;
  let W = container.clientWidth, H = container.clientHeight;

  const T = 200;
  const walls = {
    floor: Bodies.rectangle(W / 2, H + T / 2, W * 4, T, { isStatic: true }),
    ceil: Bodies.rectangle(W / 2, -T / 2, W * 4, T, { isStatic: true }),
    left: Bodies.rectangle(-T / 2, H / 2, T, H * 4, { isStatic: true }),
    right: Bodies.rectangle(W + T / 2, H / 2, T, H * 4, { isStatic: true }),
  };
  Composite.add(world, Object.values(walls));

  const items = [];
  function makeBody(el, i) {
    const w = el.offsetWidth, h = el.offsetHeight;
    const shape = el.dataset.body || 'rect';
    const x = opts.startX ? opts.startX(i, W, w) : w / 2 + Math.random() * Math.max(1, W - w);
    const y = opts.drop === 'scatter' ? h / 2 + Math.random() * Math.max(1, H - h) : -h - i * (opts.stagger ?? 70);
    const common = { restitution: Number(el.dataset.bounce || 0.35), friction: 0.3, frictionAir: 0.012, density: 0.002, chamfer: shape === 'rect' ? { radius: Math.min(w, h) * 0.12 } : undefined };
    const body = shape === 'circle' ? Bodies.circle(x, y, w / 2, common) : Bodies.rectangle(x, y, w, h, common);
    Body.setAngle(body, (Math.random() - 0.5) * 0.6);
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.draggable = false;
    el.querySelectorAll('img, a').forEach((n) => (n.draggable = false));
    return { el, body, w, h };
  }

  // The ceiling only exists after things have dropped in from above.
  Composite.remove(world, walls.ceil);
  let ceilingOn = false;
  els.forEach((el, i) => { const it = makeBody(el, i); items.push(it); Composite.add(world, it.body); });
  setTimeout(() => { Composite.add(world, walls.ceil); ceilingOn = true; }, 600 + els.length * (opts.stagger ?? 70) * 4);

  // Desktop: grab and throw. Touch: tap gives a bounce (so the page can still scroll).
  let mc = null;
  if (opts.grab !== false && !coarsePointer) {
    const mouse = Mouse.create(container);
    mouse.element.removeEventListener('wheel', mouse.mousewheel);
    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
    mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, damping: 0.1, render: { visible: false } } });
    Composite.add(world, mc);
    Events.on(mc, 'startdrag', (e) => { container.classList.add('dragging'); opts.onGrab?.(e.body); });
    Events.on(mc, 'enddrag', () => container.classList.remove('dragging'));
  }

  // Distinguish click from drag so links still work.
  let down = null;
  container.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  container.addEventListener('click', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest('[data-body]');
    if (!el) return;
    if (coarsePointer || opts.tapBounce) {
      const it = items.find((x) => x.el === el);
      if (it && !el.matches('a') && !e.target.closest('a')) {
        Body.setVelocity(it.body, { x: (Math.random() - 0.5) * 12, y: -14 - Math.random() * 6 });
        Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.4);
        opts.onTap?.(el);
      }
    }
  }, true);

  function resize() {
    W = container.clientWidth; H = container.clientHeight;
    Body.setPosition(walls.floor, { x: W / 2, y: H + T / 2 });
    Body.setPosition(walls.ceil, { x: W / 2, y: -T / 2 });
    Body.setPosition(walls.left, { x: -T / 2, y: H / 2 });
    Body.setPosition(walls.right, { x: W + T / 2, y: H / 2 });
    items.forEach(({ body, w }) => {
      if (body.position.x > W - w / 2) Body.setPosition(body, { x: W - w / 2, y: body.position.y });
    });
  }
  window.addEventListener('resize', resize);

  // Render: copy body transforms onto the DOM elements.
  let raf = 0, visible = true, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(now - last, 16.667);
    last = now;
    Engine.update(engine, dt || 16);
    for (const { el, body, w, h } of items) {
      // rescue anything that escaped
      if (body.position.y > H + 400 || body.position.x < -400 || body.position.x > W + 400 || (ceilingOn && body.position.y < -400)) {
        Body.setPosition(body, { x: W / 2, y: h });
        Body.setVelocity(body, { x: 0, y: 0 });
      }
      el.style.transform = `translate(${body.position.x - w / 2}px, ${body.position.y - h / 2}px) rotate(${body.angle}rad)`;
    }
  }
  raf = requestAnimationFrame(frame);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(container);
  }

  let tilt = null;
  return {
    engine,
    items,
    zeroG(on) {
      engine.gravity.y = on ? 0 : opts.gravity ?? 1;
      engine.gravity.x = 0;
      if (on) items.forEach(({ body }) => Body.setVelocity(body, { x: (Math.random() - 0.5) * 6, y: -2 - Math.random() * 4 }));
    },
    shake() {
      items.forEach(({ body }) => {
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 30, y: -10 - Math.random() * 18 });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.5);
      });
    },
    reset() {
      items.forEach(({ body, w, h }, i) => {
        Body.setPosition(body, { x: w / 2 + Math.random() * Math.max(1, W - w), y: h / 2 + 10 + (i % 3) * 20 });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      });
    },
    setGravity(x, y) { engine.gravity.x = x; engine.gravity.y = y; },
    enableTilt() {
      if (tilt) return;
      tilt = (e) => {
        const gx = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
        const gy = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
        engine.gravity.x = gx;
        engine.gravity.y = gy;
      };
      window.addEventListener('deviceorientation', tilt);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (tilt) window.removeEventListener('deviceorientation', tilt);
      if (mc) Composite.remove(world, mc);
      Engine.clear(engine);
    },
  };
}
