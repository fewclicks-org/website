// FewClicks Whiteboard v2: an infinite black & white canvas with colored photos and stickers,
// physics, lights & shadows, weather and elements, pen/tablet writing, an app context menu and an
// inspector that edits everything. Everything is stored in this browser only (localStorage).

import { loadAll, starString, storeLabel, STATUS, PLATFORMS, escapeHtml as esc } from '../../shared/js/data.js';
import { sfx, soundOn, toggleSound, onSoundChange } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { gameFacts } from '../../shared/js/kit.js';
import {
  STICKERS, STICKER_GROUPS, OBJECTS, ICONS, FONTS, cloudSvg, fireSvg, fanSvg, magnetSvg, plantSvg, diceSvg, clockSvg,
  duckSvg, clipSvg, iceSvg, coinSvg, spinnerSvg, extinguisherSvg,
} from './art.js';
import { makeItem, renderItem, place, syncState, patch, label } from './items.js';
import { createPhysics } from './physics.js';
import { createCamera, bindGestures } from './board.js';
import { createLights } from './lights.js';
import { createMinimap } from './minimap.js';
import { createElements } from './elements.js';
import { createMenu } from './menu.js';
import { createInspector, PATCH_KEYS } from './editor.js';
import { createStroke, drawPreview, packStrokes, worldStrokes, hitStroke } from './pen.js';
import { snapshot, download } from './snapshot.js';
import { loadBoard, saveBoard, clearBoard, createHistory, exportFile, importFile, compressImage } from './store.js';
import { seedBoard, GROUND_Y, CENTER } from './seed.js';
import { createTerrain } from './world/terrain.js';
import { createWorld } from './world/world.js';
import { SPEEDS } from './world/clock.js';

const $ = (s, r = document) => r.querySelector(s);
const viewport = $('[data-viewport]');
const layer = $('[data-layer]');
const lightCanvas = $('[data-lights]');
const fxCanvas = $('[data-fx]');
const ink = $('[data-ink]');

let DATA = null;
let board = null;
const els = new Map();
const sizes = new Map();
let selected = null;
let tool = 'select';
let flashlight = false;
let cursor = null;
let editing = null;
let linking = null; // { from, kind } while choosing the second item of a link
let clip = null; // internal clipboard (an item copy)
let menuPoint = null; // world point where the canvas menu was opened
let pendingImageFor = null;
const history = createHistory(60);
const TEXTY = new Set(['text', 'title', 'note', 'bubble']);

const terrain = createTerrain({ groundY: GROUND_Y });
const physics = createPhysics({ terrain, reduced: reducedMotion });
terrain.attach(physics);
const camera = createCamera(viewport, layer, { groundY: GROUND_Y, dots: $('[data-dots]'), onChange: () => { camDirty = true; } });
const lights = createLights(lightCanvas);
const minimap = createMinimap($('[data-minimap]'), camera, { terrain });
const world = createWorld({ skyCanvas: $('[data-sky]'), backCanvas: $('[data-wback]'), camera, terrain });
const groundAt = (x, up = 0) => terrain.surfaceY(x) - up;
const menu = createMenu();
let camDirty = true;
const byId = (id) => board?.items.find((i) => i.id === id);

const elements = createElements({
  physics, lights, camera, canvas: fxCanvas, els, sizes,
  getItems: () => board?.items || [],
  getLinks: () => board?.links || [],
  api: {
    patch: (it) => { const el = els.get(it.id); if (el) patch(el, it); },
    syncState: (it) => { const el = els.get(it.id); if (el) syncState(el, it); },
    remove: (it) => { removeItem(it.id); commit(); },
    commit: () => commit(),
    toast: (m) => toast(m, 3200),
    sfx,
  },
});

const inspector = createInspector({
  onChange: inspectorChange,
  onAction: inspectorAction,
  onClose: () => { if (inspectorDirty) { inspectorDirty = false; commit(); } },
});
let inspectorDirty = false;

// ---------------- boot (init() runs at the end of this module) ----------------
async function init() {
  buildUI();
  try { DATA = await loadAll(); } catch (e) { toast('Could not load studio content'); console.error(e); }
  const saved = loadBoard();
  board = normalize(saved || (DATA ? seedBoard(DATA) : { version: 3, gravity: 'on', items: [] }));
  world.load(board.world?.clock);
  await document.fonts?.ready;
  mountAll();
  physics.setGravity(board.gravity || 'on');
  syncGravityUI();
  if (board.cam) camera.set(board.cam);
  else startView();
  if (!saved) {
    physics.settle(reducedMotion ? 400 : 30);
    toast('Welcome! Right-click (or long-press) anything. Try ⏩ in the time bar to watch days and seasons pass.', 5200);
  } else if (reducedMotion) physics.settle(200);
  history.push(serialize());
  syncHistoryUI();
  paintTimebar(world.clock.get());
  requestAnimationFrame(loop);
  document.body.classList.add('ready');
}
function normalize(b) {
  b.links = b.links || [];
  b.world = b.world || { wind: 0 };
  b.items = b.items.filter((i) => i.type !== 'sun'); // the sun lives in the sky now
  return b;
}
function startView() {
  if (innerWidth < 760) camera.fit({ x: CENTER.x - 900, y: CENTER.y - 1000, w: 1800, h: 2000 }, 10);
  else camera.fit({ x: 1300, y: 250, w: 3800, h: 2500 }, coarsePointer ? 10 : 40);
}

function serialize() {
  return JSON.parse(JSON.stringify({
    version: 3,
    gravity: physics.gravity,
    cam: camera.get(),
    world: { wind: elements.world.wind, clock: world.clock.state },
    terrain: terrain.serialize(),
    links: board.links,
    items: board.items.map(({ v, ...it }) => ({ ...it, x: +it.x.toFixed(1), y: +it.y.toFixed(1), a: +it.a.toFixed(4) })),
  }, (k, v) => (k.startsWith('_') ? undefined : v)));
}
let saveT = 0, lastBytesWarn = 0;
function save(now = false) {
  clearTimeout(saveT);
  const run = () => {
    const r = saveBoard(serialize());
    if (!r.ok) toast('Storage is full: remove some photos or export your board.', 4000);
    else if (r.nearLimit && Date.now() - lastBytesWarn > 60000) { lastBytesWarn = Date.now(); toast('Your board is almost at the browser storage limit.', 3500); }
  };
  if (now) run(); else saveT = setTimeout(run, 500);
}
function commit() { history.push(serialize()); save(); syncHistoryUI(); }

// ---------------- items ----------------
function mountItem(item) {
  const el = renderItem(item);
  layer.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  sizes.set(item.id, { w, h });
  els.set(item.id, el);
  physics.add(item, w, h);
  place(el, item, w, h);
  syncState(el, item);
  el.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => remeasure(item), { once: true }));
  return el;
}
function remeasure(item) {
  const el = els.get(item.id);
  if (!el) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  const s = sizes.get(item.id);
  if (s && Math.abs(s.w - w) < 1 && Math.abs(s.h - h) < 1) return;
  sizes.set(item.id, { w, h });
  physics.resize(item.id, w, h);
}
function unmountAll() {
  physics.clear();
  els.forEach((el) => el.remove());
  els.clear();
  sizes.clear();
}
function mountAll() {
  unmountAll();
  terrain.load(board.terrain);
  syncGround(true);
  elements.world.wind = board.world?.wind || 0;
  [...board.items].sort((a, b) => a.z - b.z).forEach(mountItem);
  board.links = (board.links || []).filter((l) => byId(l.a) && byId(l.b));
  board.links.forEach((l) => physics.addLink(l));
  select(null);
}
function addItem(item, { edit = false, quiet = false, inspect = false } = {}) {
  item.z = Math.max(0, ...board.items.map((i) => i.z)) + 1;
  board.items.push(item);
  mountItem(item);
  select(item.id);
  if (!quiet) sfx.pop(1.1);
  commit();
  if (edit) startEdit(item);
  if (inspect) openInspector(item);
  return item;
}
function removeItem(id) {
  board.items = board.items.filter((i) => i.id !== id);
  board.links = board.links.filter((l) => { if (l.a === id || l.b === id) { physics.removeLink(l.id); return false; } return true; });
  physics.remove(id);
  els.get(id)?.remove();
  els.delete(id);
  sizes.delete(id);
  if (selected === id) select(null);
  if (inspector.item?.id === id) inspector.close();
}
function rerender(item) {
  const old = els.get(item.id);
  if (!old) return;
  const el = renderItem(item);
  old.replaceWith(el);
  els.set(item.id, el);
  const w = el.offsetWidth, h = el.offsetHeight;
  sizes.set(item.id, { w, h });
  delete item.pa;
  physics.resize(item.id, w, h);
  place(el, item, w, h);
  syncState(el, item);
  el.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => remeasure(item), { once: true }));
  if (selected === item.id) { el.classList.add('sel'); renderCtxBar(item); }
}
function viewCenter(dy = 0) { const v = camera.viewRect(); const x = v.x + v.w / 2; return { x, y: Math.min(groundAt(x, 120), v.y + v.h / 2 + dy * v.h) }; }

/** Physics for the terrain only exists near things that can move (and the view). */
let groundSyncFrame = 0;
function syncGround(force = false) {
  if (!force && terrain.dirtyCount === 0 && ++groundSyncFrame % 20) return;
  const need = new Set();
  const v = camera.viewRect();
  for (let k = terrain.chunkOf(v.x) - 1; k <= terrain.chunkOf(v.x + v.w) + 1; k++) need.add(k);
  physics.map.forEach((r) => { if (!r.body.isStatic || r.frozen) { const k = terrain.chunkOf(r.body.position.x); need.add(k - 1); need.add(k); need.add(k + 1); } });
  if (need.size > 400) return;
  terrain.syncBodies(need);
}

// ---------------- render loop ----------------
let last = performance.now(), frame = 0, dirtySince = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(now - last, 50);
  last = now;
  frame++;
  if (document.hidden) return;
  world.tick(dt);
  if (shovel.active) applyShovel(dt);
  syncGround();
  const moved = physics.step(dt);
  const elChanged = elements.update(dt, now);
  if (moved || camDirty) {
    for (const it of board.items) {
      const el = els.get(it.id), s = sizes.get(it.id);
      if (el && s) place(el, it, s.w, s.h);
    }
  }
  if ((moved || elChanged) && !dirtySince) dirtySince = now;
  if (dirtySince && now - dirtySince > 1500 && !physics.dragging) { dirtySince = 0; save(); }
  const cam = camera.get();
  const env = world.env();
  world.draw(cam);
  lights.draw(board.items, cam, flashlight ? cursor : null, env);
  elements.draw(cam);
  if (frame % 2 === 0) lights.shadows(board.items, els, env.sun);
  if (frame % 15 === 0) paintTimebar(env.c);
  if (tool === 'shovel') drawShovelRing();
  if (frame % 6 === 0 || camDirty) minimap.draw(board.items, sizes, lights.darkness);
  if (selected) positionCtxBar();
  viewport.classList.toggle('night', lights.darkness > 0.5);
  if (camDirty) { $('[data-zoom]').textContent = `${Math.round(cam.z * 100)}%`; camDirty = false; if (!physics.dragging) save(); }
}

// ---------------- pointer: select, drag, toss, draw, erase, link, long-press ----------------
let downInfo = null;
let stroke = null;
let erasing = false;
let lastTap = { id: null, t: 0 };
let clickT = 0;
let penSeen = false;
let lp = null; // long-press timer
let lastMenuAt = 0;
const gestures = bindGestures(viewport, camera, {
  shouldPan: (e) => !editing && (tool === 'hand' || e.button === 1 || spaceDown || palmTouch(e) || (!e.target.closest('.it') && tool === 'select' && !nearSun(e))),
  onPinchStart: () => { physics.dragEnd(); downInfo = null; stroke = null; erasing = false; clearInk(); cancelLongPress(); },
});
let spaceDown = false;
const palmTouch = (e) => e.pointerType === 'touch' && penSeen && tool === 'pen';

viewport.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'pen') penSeen = true;
  if (e.button === 2) return; // right button: the context menu handles it
  if (e.button > 0 || (editing && e.target.closest('[contenteditable]'))) return;
  if (editing) stopEdit();
  if (inspector.isOpen && !e.target.closest('.it')) inspector.close();
  const pt = camera.toWorld(e.clientX, e.clientY);
  const el = e.target.closest('.it');
  const item = el && byId(el.dataset.id);

  // long-press (touch) opens the context menu
  if (e.pointerType === 'touch') {
    cancelLongPress();
    lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { lp = null; physics.dragEnd(); if (downInfo) els.get(downInfo.id)?.classList.remove('grabbed'); downInfo = null; stroke = null; clearInk(); gestures.cancel(); openContextMenu(e.clientX, e.clientY, item); }, 550) };
  }

  if (linking) { finishLink(item); return; }

  // shovel: sculpt the terrain (pressure-sensitive with a pen)
  if (tool === 'shovel' && !palmTouch(e)) {
    capture(e);
    shovel.active = { x: pt.x, y: pt.y, p: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.7, target: GROUND_Y - terrain.surfaceY(pt.x) };
    return;
  }
  // drag the sun (or moon) across the sky to change the time of day
  if (!item && tool === 'select' && nearSun(e)) {
    capture(e);
    sunDrag = true;
    viewport.classList.add('scrubbing');
    scrubTo(e.clientX);
    return;
  }

  // pen tool: draw, or erase (eraser tool / the pen's eraser end / barrel button)
  if (tool === 'pen' && !palmTouch(e)) {
    capture(e);
    erasing = penOpts.tool === 'eraser' || (e.buttons & 32) === 32 || e.button === 5;
    if (erasing) { eraseAt(pt); return; }
    stroke = createStroke(e, camera.toWorld, { ...penOpts });
    return;
  }
  if (tool === 'hand' || spaceDown || palmTouch(e)) return;
  if (!item) { select(null); return; }
  // tap the pushpin to drop the item
  if (e.target.closest('.pushpin') && item.pin === 'pin') {
    physics.setPin(item.id, null);
    syncState(el, item);
    physics.nudge(item.id, (Math.random() - 0.5) * 6, -4, (Math.random() - 0.5) * 0.2);
    sfx.boing();
    select(item.id);
    commit();
    return;
  }
  select(item.id);
  downInfo = { id: item.id, x: e.clientX, y: e.clientY, t: performance.now(), act: e.target.closest('[data-act]')?.dataset.act };
  physics.dragStart(item.id, pt);
  capture(e);
  el.classList.add('grabbed');
  sfx.tick();
});
viewport.addEventListener('pointermove', (e) => {
  const r = viewport.getBoundingClientRect();
  cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) cancelLongPress();
  if (gestures.pinching) return;
  if (sunDrag) { scrubTo(e.clientX); return; }
  if (shovel.active) { const q = camera.toWorld(e.clientX, e.clientY); shovel.active.x = q.x; shovel.active.y = q.y; if (e.pointerType === 'pen' && e.pressure > 0) shovel.active.p = e.pressure; return; }
  if (erasing) { eraseAt(camera.toWorld(e.clientX, e.clientY)); return; }
  if (stroke) { const pred = stroke.move(e); drawInk(pred); return; }
  if (downInfo) physics.dragMove(camera.toWorld(e.clientX, e.clientY));
});
viewport.addEventListener('pointerleave', () => { if (!downInfo) cursor = null; });
const endPointer = (e) => {
  cancelLongPress();
  if (sunDrag) { sunDrag = false; viewport.classList.remove('scrubbing'); commit(); return; }
  if (shovel.active) { shovel.active = null; commit(); return; }
  if (erasing) { erasing = false; if (eraseDirty) { eraseDirty = false; commit(); } return; }
  if (stroke) { finishStroke(); return; }
  if (!downInfo) return;
  const id = physics.dragEnd();
  els.get(downInfo.id)?.classList.remove('grabbed');
  const click = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) < 6 && performance.now() - downInfo.t < 450;
  const info = downInfo;
  downInfo = null;
  if (click) onTap(byId(info.id), info.act);
  else if (id) commit();
};
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);
function capture(e) { try { viewport.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ } }
function cancelLongPress() { if (lp) { clearTimeout(lp.t); lp = null; } }

// right-click / long-press: the app's own context menu (never the browser's)
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[contenteditable="true"], input, textarea')) return;
  e.preventDefault();
});
viewport.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[contenteditable="true"]')) return;
  e.preventDefault();
  if (performance.now() - lastMenuAt < 600) return;
  const el = e.target.closest('.it');
  openContextMenu(e.clientX, e.clientY, el && byId(el.dataset.id));
});

// one tap = the item's action (delayed a moment), two taps = edit it. Empty space never creates anything.
function onTap(item, act) {
  if (!item) return;
  if (act) { cardAction(item, act); return; }
  const now = performance.now();
  if (lastTap.id === item.id && now - lastTap.t < 330) {
    clearTimeout(clickT);
    lastTap = { id: null, t: 0 };
    editItem(item);
    return;
  }
  lastTap = { id: item.id, t: now };
  clearTimeout(clickT);
  clickT = setTimeout(() => itemAction(item), hasTapAction(item) ? 240 : 0);
}
function hasTapAction(item) { return ['game', 'camera', 'ball', 'dice', 'spinner', 'extinguisher', 'cloud', 'fire', 'fan', 'duck', 'coin', 'sun', 'clock', 'plant'].includes(item.type); }
function itemAction(item) {
  if (!byId(item.id)) return;
  switch (item.type) {
    case 'game': openGame(item.d.gameId); break;
    case 'camera': takeSnapshot(); break;
    case 'ball': physics.nudge(item.id, (Math.random() - 0.5) * 30, -26, 0.3); sfx.boing(); break;
    case 'coin': physics.nudge(item.id, (Math.random() - 0.5) * 4, -22, 0.6); sfx.coin(); break;
    case 'duck': physics.nudge(item.id, (Math.random() - 0.5) * 8, -10, 0.2); sfx.boing(); toast('Quack!', 1200); break;
    case 'dice': rollDice(item); break;
    case 'spinner': elements.spin(item); break;
    case 'extinguisher': elements.spray(item); break;
    case 'cloud': if (item.d.mode === 'storm') elements.strike(item); else toast('Double-click the cloud to change the weather.'); break;
    case 'fire': if (item.d.lit === false) { elements.ignite(item); commit(); } else toast('Hot! Rain, water or the extinguisher put it out.'); break;
    case 'fan': item.d.on = !item.d.on; patch(els.get(item.id), item); sfx.click(); commit(); break;
    case 'plant': waterPlant(item); break;
    case 'clock': toast(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 1500); break;
    case 'sun': toast('Drag the sun up for noon, down for sunset. Delete it for night.'); break;
    default: break;
  }
}
function cardAction(item, act) {
  if (act === 'copy') { navigator.clipboard?.writeText(item.d.email).then(() => toast('Email copied!'), () => toast(item.d.email)); sfx.success(); }
  if (act === 'mail') location.href = `mailto:${item.d.email}`;
  if (act === 'link') { const a = els.get(item.id)?.querySelector('[data-act="link"]'); if (a && a.getAttribute('href') !== '#') open(a.href, '_blank', 'noopener,noreferrer'); }
}
layer.addEventListener('click', (e) => { if (e.target.closest('a[data-act]')) e.preventDefault(); });
function rollDice(item) {
  physics.nudge(item.id, (Math.random() - 0.5) * 14, -20, (Math.random() - 0.5) * 0.8);
  sfx.roll();
  setTimeout(() => { if (!byId(item.id)) return; item.d.face = 1 + Math.floor(Math.random() * 6); patch(els.get(item.id), item); toast(`🎲 ${item.d.face}`, 1200); commit(); }, 650);
}
function waterPlant(item) {
  item.d.growth = Math.min(1, (item.d.growth ?? 0.5) + 0.12);
  item.d.dry = 0;
  patch(els.get(item.id), item);
  sfx.splash();
  toast(item.d.growth >= 1 ? 'Fully grown! 🌻' : 'Watered. It grows in the rain too.', 1600);
  commit();
}
function editItem(item) {
  closePanel();
  if (TEXTY.has(item.type)) startEdit(item);
  else openInspector(item);
}

// ---------------- pen + eraser ----------------
const penOpts = (() => { try { return { tool: 'pen', color: '#111111', size: 6, group: true, ...JSON.parse(localStorage.getItem('fewclicks:pen') || '{}') }; } catch { return { tool: 'pen', color: '#111111', size: 6, group: true }; } })();
function savePenOpts() { try { localStorage.setItem('fewclicks:pen', JSON.stringify(penOpts)); } catch { /* private mode */ } }
function drawInk(pred = []) {
  const c = ink, ctx = c.getContext('2d');
  const r = viewport.getBoundingClientRect();
  if (c.width !== Math.round(r.width)) { c.width = r.width; c.height = r.height; }
  ctx.clearRect(0, 0, c.width, c.height);
  drawPreview(ctx, stroke, pred, camera.toScreen, camera.get().z);
}
function clearInk() { ink.getContext('2d').clearRect(0, 0, ink.width, ink.height); }
let lastDoodle = { id: null, t: 0 };
function finishStroke() {
  const s = stroke;
  stroke = null;
  clearInk();
  if (!s.pts.length) return;
  const newStroke = { pts: s.pts, color: s.opts.color, size: s.opts.size, tool: s.opts.tool === 'eraser' ? 'pen' : s.opts.tool };
  // writing: strokes made close together in time + space become one handwriting item
  const prev = penOpts.group && lastDoodle.id && performance.now() - lastDoodle.t < 1400 && byId(lastDoodle.id);
  if (prev && prev.d.strokes) {
    const ws = worldStrokes(prev);
    const b = bbox([...ws, newStroke]);
    const pb = bbox(ws);
    if (b.w < pb.w + 700 && b.h < pb.h + 400) {
      const pk = packStrokes([...ws, newStroke]);
      Object.assign(prev, { x: pk.x, y: pk.y, a: 0, s: 1 });
      prev.d = { ...prev.d, strokes: pk.strokes, w: pk.w, h: pk.h };
      rerender(prev);
      lastDoodle.t = performance.now();
      commit();
      return;
    }
  }
  const pk = packStrokes([newStroke]);
  const it = addItem(makeItem('doodle', pk.x, pk.y, { strokes: pk.strokes, w: pk.w, h: pk.h }), { quiet: true });
  select(null);
  lastDoodle = { id: it.id, t: performance.now() };
}
function bbox(strokes) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  strokes.forEach((s) => s.pts.forEach(([x, y]) => { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }));
  return { w: x2 - x1, h: y2 - y1 };
}
let eraseDirty = false;
function eraseAt(pt) {
  const r = 14 / camera.get().z;
  for (const it of [...board.items]) {
    if (it.type !== 'doodle') continue;
    const b = physics.bodyOf(it.id)?.bounds;
    if (!b || pt.x < b.min.x - r || pt.x > b.max.x + r || pt.y < b.min.y - r || pt.y > b.max.y + r) continue;
    if (!it.d.strokes) { removeItem(it.id); eraseDirty = true; sfx.tick(); continue; }
    const ws = worldStrokes(it);
    const keep = ws.filter((s) => !hitStroke(s, pt.x, pt.y, r));
    if (keep.length === ws.length) continue;
    eraseDirty = true;
    sfx.tick();
    if (!keep.length) { removeItem(it.id); continue; }
    const pk = packStrokes(keep);
    Object.assign(it, { x: pk.x, y: pk.y, a: 0, s: 1 });
    it.d = { ...it.d, strokes: pk.strokes, w: pk.w, h: pk.h };
    rerender(it);
  }
}

// ---------------- links (string / tape / arrow) ----------------
function startLink(item, kind) {
  linking = { from: item.id, kind };
  viewport.classList.add('linking');
  toast(`Now tap another item to ${kind === 'arrow' ? 'point the arrow at' : kind === 'tape' ? 'tape it to' : 'tie it to'}. (Esc to cancel)`, 3000);
}
function finishLink(item) {
  const l = linking;
  linking = null;
  viewport.classList.remove('linking');
  if (!item || item.id === l.from) { toast('Cancelled.', 1000); return; }
  const link = { id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, a: l.from, b: item.id, kind: l.kind };
  board.links.push(link);
  physics.addLink(link);
  sfx.pop();
  commit();
}
function removeLinksOf(id) {
  board.links = board.links.filter((l) => { if (l.a === id || l.b === id) { physics.removeLink(l.id); return false; } return true; });
}

// ---------------- actions: one registry for the selection bar + the context menu ----------------
function itemActions(item) {
  const A = [];
  const t = item.type;
  const el = () => els.get(item.id);
  const done = () => { const e = el(); if (e) { syncState(e, item); patch(e, item); } if (selected === item.id) renderCtxBar(item); commit(); };
  if (TEXTY.has(t)) {
    A.push({ id: 'edit', label: 'Edit text', icon: ICONS.edit, bar: true, kbd: 'Enter', run: () => startEdit(item) });
    A.push({ id: 'style', label: 'Style…', icon: ICONS.style, bar: true, run: () => openInspector(item) });
  } else {
    A.push({ id: 'style', label: 'Edit…', icon: ICONS.edit, bar: true, kbd: 'Enter', run: () => openInspector(item) });
  }
  const quick = {
    game: ['Open game', () => openGame(item.d.gameId)],
    camera: ['Snap', () => takeSnapshot()],
    dice: ['Roll', () => rollDice(item)],
    spinner: ['Spin', () => elements.spin(item)],
    extinguisher: ['Spray', () => elements.spray(item)],
    plant: ['Water it', () => waterPlant(item)],
    ball: ['Bounce', () => itemAction(item)],
    fan: [item.d.on ? 'Turn off' : 'Turn on', () => { item.d.on = !item.d.on; done(); }],
    fire: [item.d.lit === false ? 'Light' : 'Extinguish', () => { item.d.lit === false ? elements.ignite(item) : elements.extinguish(item); done(); }],
    water: [item.d.frozen ? 'Melt' : 'Freeze', () => { item.d.frozen ? elements.thawWater(item) : elements.freezeWater(item); done(); }],
    photo: ['Replace image…', () => { pendingImageFor = item; $('[data-file]').click(); }],
    card: item.d.email ? ['Copy email', () => cardAction(item, 'copy')] : null,
    cloud: item.d.mode === 'storm' ? ['⚡ Strike', () => elements.strike(item)] : null,
  }[t];
  if (quick) A.push({ id: 'quick', label: quick[0], text: true, bar: true, run: quick[1] });
  if (t === 'cloud') A.push({ id: 'weather', label: 'Weather', icon: ICONS.cloud, sub: ['rain', 'snow', 'storm', 'none'].map((m) => ({ label: { rain: '🌧 Rain', snow: '❄ Snow', storm: '⛈ Storm', none: '☁ Calm' }[m], checked: (item.d.mode || 'rain') === m, run: () => { item.d.mode = m; rerender(item); commit(); } })) });
  if (t === 'fan') A.push({ id: 'rev', label: 'Reverse direction', icon: ICONS.flip, run: () => { item.d.dir = (item.d.dir || 1) * -1; done(); } });
  if (t === 'sticker') A.push({ id: 'flip', label: 'Mirror', icon: ICONS.flip, run: () => { item.d.flip = !item.d.flip; rerender(item); commit(); } });
  A.push('-');
  A.push({ id: 'pin', label: item.pin === 'pin' ? 'Unpin (drop it)' : 'Pin (hangs & swings)', icon: ICONS.pin, bar: true, kbd: 'P', pressed: item.pin === 'pin', run: () => { physics.setPin(item.id, item.pin === 'pin' ? null : 'pin'); if (!item.pin) physics.nudge(item.id, 0, -3, 0.05); done(); } });
  A.push({ id: 'lock', label: item.pin === 'lock' ? 'Unlock' : 'Lock in place', icon: item.pin === 'lock' ? ICONS.lock : ICONS.unlock, bar: true, kbd: 'L', pressed: item.pin === 'lock', run: () => { physics.setPin(item.id, item.pin === 'lock' ? null : 'lock'); done(); } });
  A.push({ id: 'rotL', label: 'Rotate left', icon: ICONS.rotL, bar: true, kbd: '[', run: () => { physics.setAngle(item.id, item.a - 0.26); done(); } });
  A.push({ id: 'rotR', label: 'Rotate right', icon: ICONS.rotR, bar: true, kbd: ']', run: () => { physics.setAngle(item.id, item.a + 0.26); done(); } });
  A.push({ id: 'straight', label: 'Straighten', icon: ICONS.reset, run: () => { physics.setAngle(item.id, 0); done(); } });
  A.push({ id: 'smaller', label: 'Smaller', icon: ICONS.smaller, bar: true, kbd: '−', run: () => resizeItem(item, 1 / 1.2) });
  A.push({ id: 'bigger', label: 'Bigger', icon: ICONS.bigger, bar: true, kbd: '+', run: () => resizeItem(item, 1.2) });
  A.push('-');
  A.push({ id: 'front', label: 'Bring to front', icon: ICONS.front, bar: true, run: () => { item.z = Math.max(...board.items.map((i) => i.z)) + 1; done(); place(el(), item, sizes.get(item.id).w, sizes.get(item.id).h); } });
  A.push({ id: 'back', label: 'Send to back', icon: ICONS.back, run: () => { item.z = Math.min(...board.items.map((i) => i.z)) - 1; done(); place(el(), item, sizes.get(item.id).w, sizes.get(item.id).h); } });
  const hasLinks = board.links.some((l) => l.a === item.id || l.b === item.id);
  A.push({ id: 'tie', label: 'Connect', icon: ICONS.link, sub: [
    { label: 'Tie with string to…', run: () => startLink(item, 'string') },
    { label: 'Tape to…', run: () => startLink(item, 'tape') },
    { label: 'Draw an arrow to…', run: () => startLink(item, 'arrow') },
    ...(hasLinks ? ['-', { label: 'Remove connections', danger: true, run: () => { removeLinksOf(item.id); commit(); } }] : []),
  ] });
  A.push('-');
  A.push({ id: 'copy', label: 'Copy', icon: ICONS.copy, kbd: 'Ctrl+C', run: () => copyItem(item) });
  A.push({ id: 'dup', label: 'Duplicate', icon: ICONS.copy, bar: true, kbd: 'Ctrl+D', run: () => duplicate(item) });
  A.push({ id: 'del', label: 'Delete', icon: ICONS.trash, bar: true, kbd: 'Del', danger: true, run: () => { removeItem(item.id); sfx.whoosh(); commit(); } });
  return A;
}
function resizeItem(item, k) {
  item.s = Math.max(0.3, Math.min(4, item.s * k));
  delete item.pa;
  const s = sizes.get(item.id);
  physics.resize(item.id, s.w, s.h);
  const e = els.get(item.id);
  place(e, item, s.w, s.h);
  commit();
}
function cloneItem(item, dx = 60, dy = 60) {
  const c = JSON.parse(JSON.stringify(item, (k, v) => (k.startsWith('_') ? undefined : v)));
  c.id = makeItem('x', 0, 0).id;
  c.x += dx; c.y += dy;
  delete c.pa;
  return c;
}
function duplicate(item) { addItem(cloneItem(item)); }
function copyItem(item) { clip = cloneItem(item, 0, 0); toast('Copied. Right-click empty space → Paste.', 1600); }
function pasteAt(p) {
  if (!clip) return;
  const c = cloneItem(clip, 0, 0);
  c.x = p.x; c.y = p.y;
  addItem(c);
}

// selection bar
const ctxBar = document.createElement('div');
ctxBar.className = 'ctxbar';
ctxBar.setAttribute('role', 'toolbar');
ctxBar.setAttribute('aria-label', 'Item actions');
ctxBar.hidden = true;
document.body.appendChild(ctxBar);
let barActions = [];
function select(id) {
  if (selected && els.get(selected)) els.get(selected).classList.remove('sel');
  selected = id;
  const item = id && byId(id);
  if (!item) { ctxBar.hidden = true; return; }
  els.get(id)?.classList.add('sel');
  renderCtxBar(item);
  ctxBar.hidden = false;
}
function renderCtxBar(item) {
  barActions = itemActions(item).filter((a) => a !== '-' && a.bar);
  const groups = { edit: 0, style: 0, quick: 1, pin: 2, lock: 2, rotL: 3, rotR: 3, smaller: 3, bigger: 3, front: 4, dup: 4, del: 4 };
  let g = -1;
  ctxBar.innerHTML = barActions.map((a, i) => {
    const sep = groups[a.id] !== g && g !== -1 ? '<i class="sep"></i>' : '';
    g = groups[a.id];
    return `${sep}<button type="button" data-cx="${i}" class="${a.text ? 'txtbtn' : ''}" title="${esc(a.label)}" aria-label="${esc(a.label)}"${a.pressed != null ? ` aria-pressed="${a.pressed}"` : ''}>${a.text ? esc(a.label) : a.icon}</button>`;
  }).join('') + `<i class="sep"></i><button type="button" data-cx="more" title="More (right-click)" aria-label="More actions" aria-haspopup="menu">${ICONS.more}</button>`;
}
function positionCtxBar() {
  const it = byId(selected), s = sizes.get(selected);
  if (!it || !s) return;
  const top = camera.toScreen(it.x, it.y - (Math.max(s.w, s.h) * it.s) / 2);
  const r = viewport.getBoundingClientRect();
  const c = camera.toScreen(it.x, it.y);
  const off = c.x < -40 || c.y < -40 || c.x > r.width + 40 || c.y > r.height + 40;
  ctxBar.style.visibility = off ? 'hidden' : '';
  if (off) return;
  const bw = ctxBar.offsetWidth;
  const x = Math.max(8, Math.min(innerWidth - bw - 8, r.left + top.x - bw / 2));
  const y = Math.max(70, r.top + top.y - ctxBar.offsetHeight - 24);
  ctxBar.style.transform = `translate(${x}px, ${y}px)`;
}
ctxBar.addEventListener('pointerdown', (e) => e.stopPropagation());
ctxBar.addEventListener('contextmenu', (e) => e.preventDefault());
ctxBar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cx]');
  const item = byId(selected);
  if (!btn || !item) return;
  sfx.click();
  if (btn.dataset.cx === 'more') { const r = btn.getBoundingClientRect(); openContextMenu(r.left, r.bottom + 6, item, true); return; }
  barActions[+btn.dataset.cx]?.run();
});

// ---------------- context menu ----------------
function openContextMenu(x, y, item, focus = false) {
  lastMenuAt = performance.now();
  if (editing) stopEdit();
  inspector.close();
  if (item) {
    select(item.id);
    menu.open(x, y, [{ header: label(item).slice(0, 34) }, ...itemActions(item)], { focus });
  } else {
    select(null);
    menuPoint = camera.toWorld(x, y);
    menu.open(x, y, canvasEntries(), { focus });
  }
}
function canvasEntries() {
  const at = (type, d = {}, extra = {}, opts = {}) => () => {
    const p = menuPoint || viewCenter();
    addItem(makeItem(type, p.x, type === 'water' ? groundAt(p.x, (d.h || 200) / 2) : Math.min(groundAt(p.x, 80), p.y), d, extra), opts);
  };
  const g = physics.gravity;
  const w = elements.world.wind;
  const isDay = world.clock.get().isDay;
  return [
    { label: 'Add here', icon: ICONS.plus, sub: [
      { label: 'Text', icon: ICONS.text, run: at('text', { text: 'Your text', font: 'marker', size: 56 }, {}, { edit: true }) },
      { label: 'Sticky note', icon: ICONS.note, run: at('note', { text: 'Write something…', paper: 'classic' }, {}, { edit: true }) },
      { label: 'Card', icon: ICONS.card, run: at('card', { title: 'New card', body: 'Double-click to edit me.', style: 'white' }, {}, { inspect: true }) },
      { label: 'Speech bubble', icon: ICONS.bubble, run: at('bubble', { text: 'Hi!' }, {}, { edit: true }) },
      { label: 'Photo…', icon: ICONS.photo, run: () => { pendingImageFor = null; $('[data-file]').click(); } },
      { label: 'Gallery…', icon: ICONS.gallery, run: () => openGallery('Stickers', menuPoint) },
    ] },
    { label: 'Elements', icon: ICONS.cloud, sub: GALLERY.Elements.map((e) => ({ label: e.name, run: () => placeEntry(e, menuPoint) })) },
    { label: 'Toys', icon: ICONS.ball, sub: GALLERY.Toys.map((e) => ({ label: e.name, run: () => placeEntry(e, menuPoint) })) },
    { label: 'Paste', icon: ICONS.paste, kbd: 'Ctrl+V', disabled: !clip, run: () => pasteAt(menuPoint || viewCenter()) },
    '-',
    { label: 'World', icon: ICONS.world, sub: [
      { header: 'Gravity' },
      ...['on', 'low', 'off'].map((m) => ({ label: { on: 'Full gravity', low: 'Moon gravity', off: 'Zero gravity' }[m], checked: g === m, run: () => setGravity(m) })),
      '-', { header: 'Wind' },
      ...[[0, 'Calm'], [0.5, 'Breeze →'], [-0.5, 'Breeze ←'], [1.5, 'Gale →']].map(([v, l]) => ({ label: l, checked: w === v, run: () => { elements.world.wind = v; commit(); toast(v ? `Wind: ${l}` : 'The wind dropped.', 1400); } })),
      '-',
      { label: isDay ? 'Jump to night' : 'Jump to morning', run: () => toggleDay() },
      { label: world.clock.state.mode === 'sim' ? 'Back to real time' : 'Simulate time', run: () => { world.clock.setMode(world.clock.state.mode === 'sim' ? 'real' : 'sim'); paintTimebar(world.clock.get()); commit(); } },
    ] },
    { label: 'Fit everything', icon: ICONS.fit, kbd: '0', run: fitAll },
    { label: 'Take a snapshot', icon: ICONS.camera, kbd: 'C', run: takeSnapshot },
    { label: 'Export board…', icon: ICONS.download, run: () => $('[data-export]').click() },
  ];
}
function toggleDay() {
  const day = world.clock.get().isDay;
  world.clock.setTimeOfDay(day ? 23 * 60 : 12 * 60);
  toast(day ? 'Good night 🌙 Lamps, torches and fires still glow.' : 'Good morning! ☀️');
  paintTimebar(world.clock.get());
  commit();
}
function setGravity(m) { physics.setGravity(m); syncGravityUI(); commit(); sfx.whoosh(); }

// ---------------- inspector ----------------
function openInspector(item) {
  closePanel();
  select(item.id);
  const s = camera.toScreen(item.x, item.y);
  const r = viewport.getBoundingClientRect();
  const sz = sizes.get(item.id) || { w: 100 };
  inspector.open(item, { x: r.left + s.x + (sz.w * item.s * camera.get().z) / 2, y: r.top + s.y });
}
let insT = 0;
function inspectorChange(item, key, v, live) {
  if (!byId(item.id)) return;
  inspectorDirty = true;
  const el = els.get(item.id);
  if (key === '$s') { item.s = Math.max(0.3, Math.min(4, v)); delete item.pa; const s = sizes.get(item.id); physics.resize(item.id, s.w, s.h); place(el, item, s.w, s.h); return; }
  if (key === 'frozen') { v ? elements.freezeWater(item) : elements.thawWater(item); return; }
  if (key === 'lit') { v ? elements.ignite(item) : elements.extinguish(item); return; }
  if (key === '$labels') item.d.labels = String(v).split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);
  else if (key === '$ink') item.d.strokes.forEach((st) => { st.color = v; });
  else if (key === '$width') { item.d.strokesScale = v; item.d.strokes.forEach((st) => { st.base = st.base || st.size; st.size = st.base * v; }); }
  else item.d[key] = v;
  if (PATCH_KEYS.has(key)) { patch(el, item); if (key === 'dir') renderCtxBar(item); return; }
  clearTimeout(insT);
  const go = () => { rerender(item); if (key === 'mode') inspector.refresh(); };
  if (live) insT = setTimeout(go, 140); else go();
}
function inspectorAction(item, act) {
  if (act === '$image') { pendingImageFor = item; $('[data-file]').click(); }
  if (act === '$strike') elements.strike(item);
}

// ---------------- text editing (inline) ----------------
function startEdit(item) {
  const el = els.get(item.id);
  const t = el?.querySelector('[data-edit], .title-text');
  if (!t) return;
  inspector.close();
  editing = { item, t };
  if (item.pin !== 'lock') physics.setPin(item.id, item.pin || 'pin');
  t.contentEditable = 'true';
  t.spellcheck = false;
  t.focus();
  getSelection().selectAllChildren(t);
  el.classList.add('editing');
  t.addEventListener('blur', stopEdit, { once: true });
}
function stopEdit() {
  if (!editing) return;
  const { item, t } = editing;
  editing = null;
  t.contentEditable = 'false';
  els.get(item.id)?.classList.remove('editing');
  item.d.text = t.innerText.replace(/\n{3,}/g, '\n\n').trim() || '…';
  rerender(item);
  commit();
}

// ---------------- game panel ----------------
function openGame(id) {
  const g = DATA?.games.find((x) => x.id === id);
  const p = $('[data-panel]');
  if (!g) return;
  inspector.close();
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';
  p.innerHTML = `<button class="pbtn close" type="button" data-pclose aria-label="Close">${ICONS.close}</button>
    <figure class="p-cover"><img src="${esc(g.media.cover)}" alt="${esc(g.title)} cover"></figure>
    <div class="p-body">
      <span class="p-k">${esc(STATUS[g.status].label)} · ${esc(g.categoryList.map((c) => c.name).join(' / '))}</span>
      <h2 data-game-title>${esc(g.title)}</h2><p class="p-tag">${esc(g.tagline)}</p>
      ${g.rating.count ? `<p class="p-rate">${starString(g.rating.average)} ${g.rating.average.toFixed(1)}</p>` : ''}
      <div class="p-stores">${g.stores.map((s) => `<a class="pbtn wide" href="${esc(s.url || '#')}" ${s.url && s.url !== '#' ? 'target="_blank" rel="noopener"' : 'data-soon'}>${esc((PLATFORMS[s.platform] || {}).icon || '')} ${esc(s.label || `${verb} ${storeLabel(s)}`)}</a>`).join('') || '<span class="pbtn wide">Coming soon</span>'}</div>
      ${g.description.long.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${g.features.length ? `<ul class="p-feat">${g.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${g.hasTrailer && g.media.trailer.type === 'video' ? `<video src="${esc(g.media.trailer.src)}" poster="${esc(g.media.trailer.poster)}" controls playsinline preload="none"></video>` : g.hasTrailer ? `<a class="pbtn wide" href="https://www.youtube.com/watch?v=${encodeURIComponent(g.media.trailer.id)}" target="_blank" rel="noopener">Watch trailer on YouTube ↗</a>` : ''}
      ${g.media.screenshots.length ? `<div class="p-shots">${g.media.screenshots.map((s, i) => `<button type="button" class="p-shot" data-pin-shot="${esc(s)}" title="Pin this screenshot to the board"><img src="${esc(s)}" alt="${esc(g.title)} screenshot ${i + 1}" loading="lazy"><span>📌 pin</span></button>`).join('')}</div>` : ''}
      ${g.reviews.map((r) => `<blockquote class="p-quote">“${esc(r.quote)}”<cite>${esc(r.author ? `${r.author} · ` : '')}${esc(r.source)}</cite></blockquote>`).join('')}
      <table class="p-facts"><tbody>${gameFacts(g).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    </div>`;
  select(null);
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  p.querySelector('[data-pclose]').focus();
  sfx.whoosh();
}
function closePanel() { const p = $('[data-panel]'); if (p.hidden) return; p.classList.remove('open'); setTimeout(() => (p.hidden = true), 300); }
$('[data-panel]').addEventListener('click', (e) => {
  if (e.target.closest('[data-pclose]')) closePanel();
  const s = e.target.closest('[data-pin-shot]');
  if (s) {
    const c = viewCenter(-0.15);
    addItem(makeItem('photo', c.x + (Math.random() - 0.5) * 200, c.y, { src: s.dataset.pinShot, caption: '', wide: true }, { a: (Math.random() - 0.5) * 0.2 }));
    toast('Pinned to the board');
  }
  if (e.target.closest('[data-soon]')) { e.preventDefault(); toast('Store page coming soon'); }
});

// ---------------- snapshot ----------------
async function takeSnapshot() {
  const cam = camera.get();
  const r = viewport.getBoundingClientRect();
  document.body.classList.add('flash');
  sfx.click();
  setTimeout(() => document.body.classList.remove('flash'), 350);
  try {
    const items = [...board.items].sort((a, b) => a.z - b.z);
    const shot = await snapshot({ items, els, sizes, cam, view: { w: r.width, h: r.height }, lightCanvas, fxCanvas, skyCanvas: $('[data-sky]'), backCanvas: $('[data-wback]'), ink: document.body.classList.contains('ink') });
    download(shot.png, `fewclicks-board-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`);
    const c = viewCenter(-0.3);
    addItem(makeItem('photo', c.x, c.y, { src: shot.jpeg, caption: 'snapshot ✶', wide: true }, { pin: null, a: (Math.random() - 0.5) * 0.3, s: 0.8 }));
    toast('Snap! Saved a PNG and printed a polaroid.');
  } catch (err) {
    console.error(err);
    toast('Snapshot is not supported in this browser.');
  }
}

// ---------------- gallery (stickers, elements, toys, paper, your uploads) ----------------
const W = (svg) => svg;
const GALLERY = {
  Elements: [
    { name: '🌧 Rain cloud', svg: cloudSvg('rain'), type: 'cloud', d: { mode: 'rain', amount: 0.6 }, x: { s: 1.4 } },
    { name: '❄ Snow cloud', svg: cloudSvg('snow'), type: 'cloud', d: { mode: 'snow', amount: 0.5 }, x: { s: 1.4 } },
    { name: '⛈ Storm cloud', svg: cloudSvg('storm'), type: 'cloud', d: { mode: 'storm', amount: 0.7 }, x: { s: 1.5 } },
    { name: '🔥 Campfire', svg: fireSvg(), type: 'fire', d: { lit: true, size: 1 } },
    { name: '💧 Water pool', svg: W('<svg viewBox="0 0 100 60"><rect x="4" y="14" width="92" height="42" rx="6" fill="#bfe6ff" stroke="#111" stroke-width="3"/><path d="M4 22q11-8 23 0t23 0 23 0 23 0" fill="none" stroke="#4c9be8" stroke-width="4"/></svg>'), type: 'water', d: { w: 900, h: 200 } },
    { name: '🌀 Fan', svg: fanSvg(), type: 'fan', d: { on: true, power: 1, dir: 1 } },
    { name: '🧲 Magnet', svg: magnetSvg(), type: 'magnet', d: { strength: 1 } },
    { name: '🌸 Flower', svg: plantSvg('flower'), type: 'plant', d: { species: 'flower', growth: 0.4 } },
    { name: '🌻 Sunflower', svg: plantSvg('sunflower'), type: 'plant', d: { species: 'sunflower', growth: 0.4 } },
    { name: '🌵 Cactus', svg: plantSvg('cactus'), type: 'plant', d: { species: 'cactus', growth: 0.5 } },
    { name: '💡 Lamp', svg: OBJECTS.lamp, type: 'lamp', d: { temp: 'warm' } },
    { name: '🔦 Torch', svg: OBJECTS.torch, type: 'torch', d: { beam: 0.42 }, x: { a: 0.3 } },
  ],
  Toys: [
    { name: 'Bouncy ball', svg: OBJECTS.ball, type: 'ball' },
    { name: 'Balloon', svg: OBJECTS.balloon, type: 'balloon' },
    { name: 'Dice', svg: diceSvg(5), type: 'dice', d: { face: 5 } },
    { name: 'Rubber duck', svg: duckSvg(), type: 'duck' },
    { name: 'Spinner wheel', svg: spinnerSvg(['A', 'B', 'C', 'D', 'E', 'F']), type: 'spinner', d: {} },
    { name: 'Clock', svg: clockSvg(), type: 'clock' },
    { name: 'Coin', svg: coinSvg(), type: 'coin' },
    { name: 'Paperclip', svg: clipSvg(), type: 'clip' },
    { name: 'Ice cube', svg: iceSvg(), type: 'ice' },
    { name: 'Extinguisher', svg: extinguisherSvg(), type: 'extinguisher' },
    { name: 'Instant camera', svg: OBJECTS.camera, type: 'camera' },
  ],
  Paper: [
    ...['classic', 'lined', 'grid', 'torn', 'index', 'black'].map((p) => ({ name: `${p[0].toUpperCase()}${p.slice(1)} note`, html: `<span class="mini-note p-${p}"></span>`, type: 'note', d: { text: 'Write something…', paper: p }, edit: true })),
    { name: 'White card', html: '<span class="mini-card white">Card</span>', type: 'card', d: { title: 'New card', body: 'Double-click to edit me.', style: 'white' }, inspect: true },
    { name: 'Black card', html: '<span class="mini-card">Card</span>', type: 'card', d: { title: 'New card', body: 'Double-click to edit me.', style: 'black' }, inspect: true },
    { name: 'Ticket card', html: '<span class="mini-card ticket">Ticket</span>', type: 'card', d: { title: 'Admit one', body: 'FewClicks playtest night', style: 'ticket' }, inspect: true },
    { name: 'Speech bubble', html: '<span class="mini-bubble">Hi!</span>', type: 'bubble', d: { text: 'Hi!' }, edit: true },
    ...['bubbles', 'neon', 'pixel', 'script', 'bungee', 'outline'].map((f) => ({ name: `${FONTS.find((x) => x.id === f).name} text`, html: `<span class="mini-txt" style="font-family:${FONTS.find((x) => x.id === f).family}">Aa</span>`, type: 'text', d: { text: 'Your text', font: f, size: 64 }, edit: true })),
  ],
};
function placeEntry(e, at) {
  const p = at || viewCenter(e.type === 'cloud' ? -0.3 : -0.15);
  const d = JSON.parse(JSON.stringify(e.d || {}));
  if (e.type === 'spinner' && !d.labels && DATA) d.labels = DATA.games.map((g) => g.title.split(' ')[0]).slice(0, 6);
  const y = e.type === 'water' ? groundAt(p.x, (d.h || 200) / 2) : Math.min(groundAt(p.x, 120), p.y);
  addItem(makeItem(e.type, p.x + (at ? 0 : (Math.random() - 0.5) * 160), y, d, { ...(e.x || {}) }), { edit: !!e.edit, inspect: !!e.inspect });
  if (e.type === 'cloud' && d.mode === 'storm') toast('Storm clouds strike lightning every few seconds. Tap one to strike now.');
}
let galleryAt = null;
function openGallery(tab = 'Stickers', at = null) {
  galleryAt = at;
  const g = $('[data-gallery]');
  g.hidden = false;
  showTab(tab);
}
function showTab(tab) {
  const g = $('[data-gallery]');
  g.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const body = g.querySelector('.g-body');
  if (tab === 'Stickers') {
    body.innerHTML = Object.entries(STICKER_GROUPS).map(([name, keys]) => `<h4>${name}</h4><div class="g-grid">${keys.map((k) => `<button type="button" data-stk="${k}" aria-label="${k} sticker" title="${k}">${STICKERS[k]}</button>`).join('')}</div>`).join('');
  } else if (tab === 'Yours') {
    const srcs = [...new Set(board.items.filter((i) => (i.type === 'photo') && /^data:/.test(i.d.src || '')).map((i) => i.d.src))];
    body.innerHTML = `<p class="g-note">Photos you added live only in this browser.</p><div class="g-grid wide"><button type="button" class="g-up" data-upload>${ICONS.photo}<span>Add photo</span></button>${srcs.map((s, i) => `<button type="button" data-reuse="${i}" aria-label="Your photo ${i + 1}"><img src="${s}" alt=""></button>`).join('')}</div>`;
    body._srcs = srcs;
  } else {
    body.innerHTML = `<div class="g-grid labeled">${GALLERY[tab].map((e, i) => `<button type="button" data-entry="${tab}:${i}" title="${esc(e.name)}"><span class="g-art">${e.svg || e.html}</span><span class="g-l">${esc(e.name)}</span></button>`).join('')}</div>`;
  }
}

// ---------------- UI ----------------
function buildUI() {
  const tools = [
    ['select', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 8-6 2-3 6z"/></svg>', 'Select & toss (V)'],
    ['hand', ICONS.hand, 'Pan (H or hold Space)'],
    ['pen', ICONS.pen, 'Draw & write (D) · works with pen tablets'],
    '|',
    ['text', ICONS.text, 'Add text (T)'],
    ['note', ICONS.note, 'Add sticky note (N)'],
    ['card', ICONS.card, 'Add card (K)'],
    ['gallery', ICONS.sticker, 'Gallery: stickers, elements, toys (G)'],
    ['photo', ICONS.photo, 'Add your photo'],
    '|',
    ['cloud', ICONS.cloud, 'Rain cloud'],
    ['fire', ICONS.fire, 'Campfire'],
    ['water', ICONS.water, 'Water pool'],
    ['elements', ICONS.plant, 'More elements: snow, storm, fan, magnet, plants…'],
    ['shovel', ICONS.shovel, 'Shovel: sculpt hills, dig, paint sand / clay / rock (B)'],
    '|',
    ['camera', ICONS.camera, 'Camera snapshot (C)'],
  ];
  $('[data-tools]').innerHTML = tools.map((t) => (t === '|' ? '<i class="sep"></i>' : `<button type="button" data-tool="${t[0]}" title="${t[2]}" aria-label="${t[2]}">${t[1]}</button>`)).join('');
  const g = $('[data-gallery]');
  g.innerHTML = `<div class="g-tabs" role="tablist">${['Stickers', 'Elements', 'Toys', 'Paper', 'Yours'].map((t) => `<button type="button" role="tab" data-tab="${t}">${t}</button>`).join('')}<button type="button" class="g-x" data-gclose aria-label="Close gallery">${ICONS.close}</button></div><div class="g-body"></div>`;
  $('[data-undo]').innerHTML = ICONS.undo; $('[data-redo]').innerHTML = ICONS.redo;
  $('[data-export]').innerHTML = ICONS.download; $('[data-import]').innerHTML = ICONS.upload;
  $('[data-reset]').innerHTML = ICONS.reset; $('[data-info]').innerHTML = ICONS.info;
  $('[data-flash]').innerHTML = ICONS.flash;
  $('[data-zin]').innerHTML = ICONS.plus; $('[data-zout]').innerHTML = ICONS.minus; $('[data-fit]').innerHTML = ICONS.fit;
  const snd = $('[data-snd]');
  const paintSnd = () => { snd.innerHTML = soundOn() ? ICONS.sound : ICONS.mute; snd.setAttribute('aria-pressed', String(soundOn())); snd.title = soundOn() ? 'Sound on' : 'Sound off'; };
  paintSnd();
  onSoundChange(paintSnd);
  snd.addEventListener('click', toggleSound);
  buildPenBar();
  buildShovelBar();
  buildTimebar();
  $('[data-ink-toggle]').innerHTML = ICONS.palette;
  $('[data-ink-toggle]').addEventListener('click', () => { setInk(!document.body.classList.contains('ink')); sfx.click(); toast(document.body.classList.contains('ink') ? 'Ink world: all color removed.' : 'Color world.', 1400); });
  try { setInk(localStorage.getItem('fewclicks:ink') === '1'); } catch { /* ignore */ }
  setTool('select');
  mountPrototypeBadge(11, 'Whiteboard');

  $('[data-tools]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    sfx.click();
    const t = b.dataset.tool;
    if (['select', 'hand', 'pen', 'shovel'].includes(t)) { setTool(t); return; }
    const c = viewCenter();
    if (t === 'text') addItem(makeItem('text', c.x, c.y, { text: 'Your text', font: 'marker', size: 56 }), { edit: true });
    if (t === 'note') addItem(makeItem('note', c.x, c.y, { text: 'Write something…', paper: 'classic' }, { a: (Math.random() - 0.5) * 0.08 }), { edit: true });
    if (t === 'card') addItem(makeItem('card', c.x, c.y, { title: 'New card', body: 'Double-click to edit me.', style: 'white' }), { inspect: true });
    if (t === 'gallery') toggleGallery('Stickers');
    if (t === 'elements') toggleGallery('Elements');
    if (t === 'photo') { pendingImageFor = null; $('[data-file]').click(); }
    if (t === 'camera') takeSnapshot();
    if (t === 'cloud') placeEntry(GALLERY.Elements[0]);
    if (t === 'fire') placeEntry(GALLERY.Elements[3]);
    if (t === 'water') placeEntry(GALLERY.Elements[4]);
  });
  g.addEventListener('pointerdown', (e) => e.stopPropagation());
  g.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { showTab(tab.dataset.tab); return; }
    if (e.target.closest('[data-gclose]')) { g.hidden = true; return; }
    const stk = e.target.closest('[data-stk]');
    const at = galleryAt;
    if (stk) { const c = at || viewCenter(-0.38); addItem(makeItem('sticker', c.x + (at ? 0 : (Math.random() - 0.5) * 300), Math.min(groundAt(c.x, 100), c.y), { key: stk.dataset.stk }, { a: (Math.random() - 0.5) * 0.6 })); return; }
    const en = e.target.closest('[data-entry]');
    if (en) { const [tabName, i] = en.dataset.entry.split(':'); placeEntry(GALLERY[tabName][+i], at); if (GALLERY[tabName][+i].edit || GALLERY[tabName][+i].inspect) g.hidden = true; return; }
    if (e.target.closest('[data-upload]')) { pendingImageFor = null; $('[data-file]').click(); return; }
    const re = e.target.closest('[data-reuse]');
    if (re) { const src = g.querySelector('.g-body')._srcs[+re.dataset.reuse]; const c = at || viewCenter(-0.1); addItem(makeItem('photo', c.x, Math.min(groundAt(c.x, 150), c.y), { src, caption: '' }, { a: (Math.random() - 0.5) * 0.1 })); }
  });
  $('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    await addPhotoFile(f, pendingImageFor);
    pendingImageFor = null;
  });
  $('[data-undo]').addEventListener('click', undo);
  $('[data-redo]').addEventListener('click', redo);
  $('[data-zin]').addEventListener('click', () => camera.zoomAt(1.25));
  $('[data-zout]').addEventListener('click', () => camera.zoomAt(0.8));
  $('[data-fit]').addEventListener('click', fitAll);
  $('[data-flash]').addEventListener('click', () => setFlash(!flashlight));
  $('[data-gravity]').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) setGravity(b.dataset.g); });
  $('[data-export]').addEventListener('click', () => { exportFile(serialize()); toast('Board exported as a JSON file.'); });
  $('[data-import]').addEventListener('click', () => $('[data-importfile]').click());
  $('[data-importfile]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { board = normalize(await importFile(f)); world.load(board.world?.clock); mountAll(); physics.setGravity(board.gravity || 'on'); syncGravityUI(); if (board.cam) camera.set(board.cam); commit(); toast('Board imported.'); } catch { toast('That file is not a FewClicks board.'); }
  });
  $('[data-reset]').addEventListener('click', () => {
    if (!confirm('Reset the board? Everything you added will be removed from this browser.')) return;
    clearBoard();
    board = normalize(seedBoard(DATA));
    world.load(board.world?.clock);
    mountAll();
    physics.setGravity('on');
    syncGravityUI();
    startView();
    physics.settle(30);
    commit();
    toast('Fresh board!');
  });
  const info = $('[data-infodlg]');
  $('[data-info]').addEventListener('click', () => info.showModal());
  info.addEventListener('click', (e) => { if (e.target === info || e.target.closest('[data-close]')) info.close(); });
  $('[data-storage]').textContent = 'Everything is saved in this browser only.';
  info.addEventListener('toggle', () => { if (info.open) { const kb = Math.round(JSON.stringify(serialize()).length * 2 / 1024); $('[data-storage]').textContent = `This board uses about ${kb} KB of your browser's local storage.`; } });

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-gallery], [data-tool="gallery"], [data-tool="elements"]')) $('[data-gallery]').hidden = true;
  });
  // drop or paste images: they become photos (still local only)
  viewport.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) { e.preventDefault(); viewport.classList.add('dropping'); } });
  viewport.addEventListener('dragleave', () => viewport.classList.remove('dropping'));
  viewport.addEventListener('drop', async (e) => {
    e.preventDefault();
    viewport.classList.remove('dropping');
    const p = camera.toWorld(e.clientX, e.clientY);
    for (const f of [...(e.dataTransfer?.files || [])].filter((x) => x.type.startsWith('image/')).slice(0, 6)) await addPhotoFile(f, null, p);
  });
  document.addEventListener('paste', async (e) => {
    if (editing || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); await addPhotoFile(f); return; }
    if (clip) { e.preventDefault(); pasteAt(cursor ? camera.toWorld(cursor.x + viewport.getBoundingClientRect().left, cursor.y + viewport.getBoundingClientRect().top) : viewCenter()); }
  });
}
async function addPhotoFile(f, replaceFor = null, at = null) {
  try {
    const img = await compressImage(f);
    if (replaceFor && byId(replaceFor.id)) {
      replaceFor.d.src = img.src;
      replaceFor.d.ratio = `${img.w} / ${img.h}`;
      rerender(replaceFor);
      commit();
      inspector.refresh();
      toast('Image replaced. It stays in this browser only.');
      return;
    }
    const c = at || viewCenter(-0.1);
    addItem(makeItem('photo', c.x, Math.min(groundAt(c.x, 150), c.y), { src: img.src, caption: f.name.replace(/\.[^.]+$/, '').slice(0, 28), ratio: `${img.w} / ${img.h}` }, { a: (Math.random() - 0.5) * 0.1 }));
    toast('Photo added. It stays in this browser only.');
  } catch { toast('Could not read that image.'); }
}
function toggleGallery(tab) {
  const g = $('[data-gallery]');
  const cur = g.querySelector('[aria-selected="true"]')?.dataset.tab;
  if (!g.hidden && cur === tab) { g.hidden = true; return; }
  openGallery(tab);
}
function buildPenBar() {
  const bar = $('[data-penbar]');
  const tools = [['pen', ICONS.pen, 'Pen (pressure-sensitive)'], ['marker', ICONS.marker, 'Marker'], ['highlighter', ICONS.highlighter, 'Highlighter'], ['eraser', ICONS.eraser, 'Eraser (E) · also the pen’s eraser end']];
  const inks = ['#111111', '#ffffff', '#ff3b30', '#ff8a1a', '#ffd23f', '#2fd66b', '#4c7dff', '#9b5cff'];
  bar.innerHTML = `<div class="pb-g">${tools.map(([t, ic, l]) => `<button type="button" data-pt="${t}" title="${l}" aria-label="${l}">${ic}</button>`).join('')}</div><i class="sep"></i><div class="pb-g">${inks.map((c) => `<button type="button" class="ink-dot" data-pc="${c}" style="--c:${c}" aria-label="Ink ${c}"></button>`).join('')}</div><i class="sep"></i><div class="pb-g">${[[3, 'S'], [6, 'M'], [12, 'L']].map(([s, l]) => `<button type="button" data-ps="${s}" aria-label="Size ${l}" class="sz"><i style="--s:${s * 1.4}px"></i></button>`).join('')}</div><i class="sep"></i><label class="pb-group" title="Strokes written close together become one movable word"><input type="checkbox" data-pg> Group writing</label>`;
  const paint = () => {
    bar.querySelectorAll('[data-pt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pt === penOpts.tool)));
    bar.querySelectorAll('[data-pc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pc === penOpts.color)));
    bar.querySelectorAll('[data-ps]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.ps === penOpts.size)));
    bar.querySelector('[data-pg]').checked = !!penOpts.group;
    viewport.dataset.pen = penOpts.tool;
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pt) penOpts.tool = b.dataset.pt;
    if (b.dataset.pc) { penOpts.color = b.dataset.pc; if (penOpts.tool === 'eraser') penOpts.tool = 'pen'; }
    if (b.dataset.ps) penOpts.size = +b.dataset.ps;
    sfx.tick();
    savePenOpts();
    paint();
  });
  bar.addEventListener('change', (e) => { if (e.target.matches('[data-pg]')) { penOpts.group = e.target.checked; savePenOpts(); } });
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  paint();
}
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  viewport.dataset.tool = t;
  $('[data-penbar]').hidden = t !== 'pen';
  $('[data-shovelbar]').hidden = t !== 'shovel';
  if (t !== 'shovel') { const c = ink.getContext('2d'); c.clearRect(0, 0, ink.width, ink.height); }
  if (t === 'pen' || t === 'shovel') select(null);
}
function setFlash(on) {
  flashlight = on;
  $('[data-flash]').setAttribute('aria-pressed', String(on));
  viewport.classList.toggle('flashlight', on);
  if (on && lights.darkness < 0.3) toast('Flashlight works best at night. Remove the sun!');
}
function syncGravityUI() { document.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === physics.gravity))); }
function syncHistoryUI() { $('[data-undo]').disabled = !history.canUndo; $('[data-redo]').disabled = !history.canRedo; }
function applySnapshot(s) {
  if (!s) return;
  board = normalize(s);
  mountAll();
  physics.setGravity(s.gravity || 'on');
  syncGravityUI();
  save();
  syncHistoryUI();
}
function undo() { inspector.close(); applySnapshot(history.undo(serialize())); sfx.tick(); }
function redo() { inspector.close(); applySnapshot(history.redo()); sfx.tick(); }
function fitAll() {
  if (!board.items.length) { camera.centerOn(CENTER.x, CENTER.y, 0.5); return; }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const it of board.items) { const s = sizes.get(it.id) || { w: 100, h: 100 }; const r = (Math.max(s.w, s.h) * it.s) / 2; x1 = Math.min(x1, it.x - r); y1 = Math.min(y1, it.y - r); x2 = Math.max(x2, it.x + r); y2 = Math.max(y2, it.y + r); }
  camera.fit({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, 40);
}

let toastT;
function toast(text, ms = 2600) {
  const t = $('[data-toast]');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------------- world: time bar, sun scrubbing, shovel, ink mode ----------------
let sunDrag = false;
const shovel = { mode: 'raise', size: 180, active: null };
function nearSun(e) {
  const s = world.sky.sun;
  if (!s) return false;
  const r = viewport.getBoundingClientRect();
  return Math.hypot(e.clientX - r.left - s.x, e.clientY - r.top - s.y) < Math.max(34, s.r * 1.8);
}
function scrubTo(clientX) {
  const r = viewport.getBoundingClientRect();
  const c = world.clock.get();
  const sx = Math.max(-1.3, Math.min(1.3, ((clientX - r.left) / r.width - 0.5) / 0.44));
  const H = sx * c.H0;
  world.clock.setTimeOfDay(((H / (2 * Math.PI)) + 0.5) * 1440);
  paintTimebar(world.clock.get());
}
function applyShovel(dt) {
  const a = shovel.active;
  const k = Math.min(3, dt / 16.667) * (a.p ?? 0.7) * (shovel.mode === 'raise' || shovel.mode === 'lower' ? 0.55 : 1);
  terrain.brush(shovel.mode, a.x, shovel.size, k, a.target);
  physics.map.forEach((r) => { if (Math.abs(r.body.position.x - a.x) < shovel.size + 200) physics.thaw(r.item.id); });
  if (frame % 6 === 0) sfx.tick();
}
function drawShovelRing() {
  const c = ink.getContext('2d');
  const r = viewport.getBoundingClientRect();
  if (c.canvas.width !== Math.round(r.width)) { c.canvas.width = r.width; c.canvas.height = r.height; }
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  if (!cursor) return;
  const z = camera.get().z;
  const w = camera.toWorld(cursor.x + r.left, cursor.y + r.top);
  const sy = camera.toScreen(w.x, terrain.surfaceY(w.x)).y;
  c.strokeStyle = 'rgba(17,17,17,.7)'; c.setLineDash([6, 6]); c.lineWidth = 2;
  c.beginPath(); c.ellipse(cursor.x, sy, shovel.size * z, Math.max(10, shovel.size * z * 0.35), 0, 0, Math.PI * 2); c.stroke();
  c.setLineDash([]);
  c.beginPath(); c.moveTo(cursor.x, cursor.y); c.lineTo(cursor.x, sy); c.stroke();
}
function buildShovelBar() {
  const bar = $('[data-shovelbar]');
  const modes = [['raise', '⬆', 'Raise ground'], ['lower', '⬇', 'Dig / lower'], ['smooth', '≈', 'Smooth'], ['flatten', '▬', 'Flatten to start height'], ['|'], ['grass', '🌱', 'Grass'], ['dirt', '🟫', 'Bare dirt'], ['sand', '🏖', 'Sand (drains fast)'], ['clay', '🧱', 'Clay (holds water)'], ['rock', '🪨', 'Rock (can’t dig)']];
  bar.innerHTML = `<div class="pb-g">${modes.map(([m, ic, l]) => (m === '|' ? '<i class="sep"></i>' : `<button type="button" data-sm="${m}" title="${l}" aria-label="${l}" class="emo">${ic}</button>`)).join('')}</div><i class="sep"></i><div class="pb-g">${[[90, 'S'], [180, 'M'], [360, 'L']].map(([s, l]) => `<button type="button" data-ss="${s}" aria-label="Brush ${l}" class="sz"><i style="--s:${s / 18}px"></i></button>`).join('')}</div>`;
  const paint = () => {
    bar.querySelectorAll('[data-sm]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sm === shovel.mode)));
    bar.querySelectorAll('[data-ss]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.ss === shovel.size)));
  };
  bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.sm) shovel.mode = b.dataset.sm; if (b.dataset.ss) shovel.size = +b.dataset.ss; sfx.tick(); paint(); });
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  paint();
}
function buildTimebar() {
  const tb = $('[data-timebar]');
  tb.innerHTML = `<button type="button" class="tb-main" data-tb-open aria-expanded="false" title="World time"><span class="tb-ic" data-tb-ic aria-hidden="true"></span><b data-tb-time>--:--</b><span class="tb-meta" data-tb-meta></span></button>
    <div class="tb-ctl"><button type="button" data-tb-mode title="Real time / Simulate"></button><button type="button" data-tb-play aria-label="Pause / play"></button><button type="button" data-tb-speed title="Speed"></button></div>
    <div class="tb-panel" data-tb-panel hidden>
      <label class="row"><span>Time of day</span><input type="range" min="0" max="1439" step="1" data-tb-scrub aria-label="Time of day"></label>
      <div class="row"><span>Season</span><div class="seg2" data-tb-seasons>${['Spring', 'Summer', 'Autumn', 'Winter'].map((n, i) => `<button type="button" data-season="${i}" role="radio">${['🌸', '☀️', '🍂', '❄️'][i]} ${n}</button>`).join('')}</div></div>
      <p class="tb-hint">Tip: drag the sun or moon across the sky. Real time follows your clock and today’s date.</p>
    </div>`;
  tb.addEventListener('pointerdown', (e) => e.stopPropagation());
  tb.addEventListener('click', (e) => {
    const c = world.clock;
    if (e.target.closest('[data-tb-open]')) { const p = tb.querySelector('[data-tb-panel]'); p.hidden = !p.hidden; e.target.closest('[data-tb-open]').setAttribute('aria-expanded', String(!p.hidden)); }
    if (e.target.closest('[data-tb-mode]')) { c.setMode(c.state.mode === 'sim' ? 'real' : 'sim'); toast(c.state.mode === 'sim' ? 'Simulating time. Use the speed button to fast-forward.' : 'Back to real time: your clock and today’s season.', 2600); }
    if (e.target.closest('[data-tb-play]')) { if (c.state.mode !== 'sim') c.setMode('sim'); c.setPaused(!c.state.paused); }
    if (e.target.closest('[data-tb-speed]')) { if (c.state.mode !== 'sim') c.setMode('sim'); const i = SPEEDS.indexOf(c.state.speed); c.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]); c.setPaused(false); }
    const se = e.target.closest('[data-season]');
    if (se) { c.setSeason(+se.dataset.season); }
    sfx.click();
    paintTimebar(c.get());
    commit();
  });
  tb.addEventListener('input', (e) => { if (e.target.matches('[data-tb-scrub]')) { world.clock.setTimeOfDay(+e.target.value); paintTimebar(world.clock.get()); } });
  tb.addEventListener('change', (e) => { if (e.target.matches('[data-tb-scrub]')) commit(); });
}
function paintTimebar(c) {
  const tb = $('[data-timebar]');
  if (!tb.firstChild) return;
  const st = world.clock.state;
  const moonIc = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][Math.round(c.phase * 8) % 8];
  tb.querySelector('[data-tb-ic]').textContent = c.isDay ? (c.sunAltDeg < 8 ? '🌅' : '☀️') : moonIc;
  tb.querySelector('[data-tb-time]').textContent = c.label;
  const when = st.mode === 'sim' ? `Day ${c.day + 1}` : new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
  tb.querySelector('[data-tb-meta]').textContent = `${when} · ${c.season} · ${Math.round(c.temp)}°C`;
  tb.querySelector('[data-tb-mode]').textContent = st.mode === 'sim' ? 'SIM' : 'REAL';
  tb.querySelector('[data-tb-mode]').setAttribute('aria-pressed', String(st.mode === 'sim'));
  tb.querySelector('[data-tb-play]').innerHTML = st.mode === 'sim' && !st.paused ? '⏸' : '▶';
  tb.querySelector('[data-tb-speed]').textContent = `${st.speed}×`;
  tb.classList.toggle('real', st.mode !== 'sim');
  const scrub = tb.querySelector('[data-tb-scrub]');
  if (document.activeElement !== scrub) scrub.value = String(Math.round(c.minutes));
  tb.querySelectorAll('[data-season]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.season === c.seasonIdx)));
}
function setInk(on) {
  document.body.classList.toggle('ink', on);
  $('[data-ink-toggle]').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('fewclicks:ink', on ? '1' : '0'); } catch { /* private mode */ }
}

// ---------------- keyboard ----------------
addEventListener('keydown', (e) => {
  if (editing) { if (e.key === 'Escape') editing.t.blur(); return; }
  if (menu.isOpen || inspector.isOpen && inspector.el.contains(document.activeElement)) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  const item = selected && byId(selected);
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'c' && item) { e.preventDefault(); copyItem(item); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd' && item) { e.preventDefault(); duplicate(item); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'v') return; // handled by the paste event
  if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
    e.preventDefault();
    if (item) { const s = camera.toScreen(item.x, item.y); const r = viewport.getBoundingClientRect(); openContextMenu(r.left + s.x, r.top + s.y, item, true); }
    else openContextMenu(innerWidth / 2, innerHeight / 2, null, true);
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') { spaceDown = true; viewport.classList.add('space'); e.preventDefault(); return; }
  if ((k === 'delete' || k === 'backspace') && item) { removeItem(item.id); commit(); return; }
  if (k === 'escape') { if (linking) { linking = null; viewport.classList.remove('linking'); toast('Cancelled.', 900); } select(null); closePanel(); inspector.close(); $('[data-gallery]').hidden = true; return; }
  if (k === 'enter' && item) { e.preventDefault(); editItem(item); return; }
  if (item) {
    const a = itemActions(item).find((x) => x !== '-' && x.kbd && x.kbd.toLowerCase() === k);
    if (a && ['p', 'l', '[', ']'].includes(k)) { a.run(); return; }
  }
  if (item && /^arrow/.test(k)) {
    e.preventDefault();
    const d = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
    physics.nudge(item.id, d[0] * 12, d[1] * 12);
    return;
  }
  const map = { v: 'select', h: 'hand', d: 'pen' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'e') { setTool('pen'); penOpts.tool = 'eraser'; $('[data-penbar] [data-pt="eraser"]')?.click(); return; }
  if (k === 'b') { setTool('shovel'); return; }
  if (k === 'i') { $('[data-ink-toggle]').click(); return; }
  if (k === 't') $('[data-tool="text"]').click();
  if (k === 'n') $('[data-tool="note"]').click();
  if (k === 'k') $('[data-tool="card"]').click();
  if (k === 's' || k === 'g') toggleGallery('Stickers');
  if (k === 'c') takeSnapshot();
  if (k === 'f') setFlash(!flashlight);
  if (k === '+' || k === '=') camera.zoomAt(1.25);
  if (k === '-') camera.zoomAt(0.8);
  if (k === '0') fitAll();
});
addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; viewport.classList.remove('space'); } });
addEventListener('beforeunload', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

// test hook for local automated checks (only with ?debug in the URL; nothing leaves the browser)
if (new URLSearchParams(location.search).has('debug')) window.__wb = { physics, elements, lights, camera, world, terrain, get board() { return board; }, byId, select, commit };

init();
