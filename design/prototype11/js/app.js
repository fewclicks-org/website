// FewClicks Whiteboard: a black & white physics board with colored photos and stickers,
// lights & shadows, pan/zoom + minimap. Everything is stored in this browser only (localStorage).

import { loadAll, starString, storeLabel, STATUS, PLATFORMS, escapeHtml as esc } from '../../shared/js/data.js';
import { sfx, soundOn, toggleSound, onSoundChange } from '../../shared/js/sfx.js';
import { reducedMotion, coarsePointer } from '../../shared/js/motion.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { gameFacts } from '../../shared/js/kit.js';
import { STICKERS, ICONS, FONTS } from './art.js';
import { makeItem, renderItem, place, syncState } from './items.js';
import { createPhysics } from './physics.js';
import { createCamera, bindGestures } from './board.js';
import { createLights } from './lights.js';
import { createMinimap } from './minimap.js';
import { snapshot, download } from './snapshot.js';
import { loadBoard, saveBoard, clearBoard, createHistory, exportFile, importFile, compressImage } from './store.js';
import { seedBoard, BOARD_W, BOARD_H, CENTER } from './seed.js';

const $ = (s, r = document) => r.querySelector(s);
const viewport = $('[data-viewport]');
const layer = $('[data-layer]');
const lightCanvas = $('[data-lights]');
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
const history = createHistory(60);

const physics = createPhysics({ width: BOARD_W, height: BOARD_H, reduced: reducedMotion });
const camera = createCamera(viewport, layer, { width: BOARD_W, height: BOARD_H, onChange: () => { camDirty = true; } });
const lights = createLights(lightCanvas, { height: BOARD_H });
const minimap = createMinimap($('[data-minimap]'), camera, { width: BOARD_W, height: BOARD_H });
let camDirty = true;

layer.style.width = `${BOARD_W}px`;
layer.style.height = `${BOARD_H}px`;

// ---------------- boot ----------------
init();
async function init() {
  buildUI();
  try { DATA = await loadAll(); } catch (e) { toast('Could not load studio content'); console.error(e); }
  const saved = loadBoard();
  board = saved || (DATA ? seedBoard(DATA) : { version: 1, gravity: 'on', items: [] });
  await document.fonts?.ready;
  mountAll();
  physics.setGravity(board.gravity || 'on');
  syncGravityUI();
  if (board.cam) camera.set(board.cam);
  else if (innerWidth < 760) camera.fit({ x: CENTER.x - 900, y: CENTER.y - 1000, w: 1800, h: 2000 }, 10);
  else camera.fit({ x: 1300, y: 250, w: 3800, h: 2500 }, coarsePointer ? 10 : 40);
  if (!saved) {
    physics.settle(reducedMotion ? 400 : 30);
    toast('Welcome! Everything you do here stays in your browser.', 4200);
  } else if (reducedMotion) physics.settle(200);
  history.push(serialize());
  requestAnimationFrame(loop);
  document.body.classList.add('ready');
}

function serialize() {
  return {
    version: 1,
    gravity: physics.gravity,
    cam: camera.get(),
    items: board.items.map(({ v, ...it }) => ({ ...it, x: +it.x.toFixed(1), y: +it.y.toFixed(1), a: +it.a.toFixed(4) })),
  };
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
  [...board.items].sort((a, b) => a.z - b.z).forEach(mountItem);
  select(null);
}
function addItem(item, { edit = false, quiet = false } = {}) {
  item.z = Math.max(0, ...board.items.map((i) => i.z)) + 1;
  board.items.push(item);
  mountItem(item);
  select(item.id);
  if (!quiet) sfx.pop(1.1);
  commit();
  if (edit) startEdit(item);
  return item;
}
function removeItem(id) {
  board.items = board.items.filter((i) => i.id !== id);
  physics.remove(id);
  els.get(id)?.remove();
  els.delete(id);
  sizes.delete(id);
  if (selected === id) select(null);
}
const byId = (id) => board.items.find((i) => i.id === id);
function viewCenter(dy = 0) { const v = camera.viewRect(); return { x: v.x + v.w / 2, y: v.y + v.h / 2 + dy * v.h }; }

// ---------------- render loop ----------------
let last = performance.now(), frame = 0, dirtySince = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(now - last, 50);
  last = now;
  frame++;
  const moved = document.hidden ? false : physics.step(dt);
  if (moved || camDirty) {
    for (const it of board.items) {
      const el = els.get(it.id), s = sizes.get(it.id);
      if (el && s) place(el, it, s.w, s.h);
    }
  }
  if (moved && !dirtySince) dirtySince = now;
  if (dirtySince && now - dirtySince > 1200 && !physics.dragging) { dirtySince = 0; save(); }
  lights.draw(board.items, camera.get(), flashlight ? cursor : null);
  if (frame % 2 === 0) lights.shadows(board.items, els);
  if (frame % 5 === 0 || camDirty) minimap.draw(board.items, sizes, lights.darkness);
  if (selected) positionCtxBar();
  viewport.classList.toggle('night', lights.darkness > 0.5);
  if (camDirty) { $('[data-zoom]').textContent = `${Math.round(camera.get().z * 100)}%`; camDirty = false; if (!physics.dragging) save(); }
}

// ---------------- pointer: select, drag, toss, draw ----------------
let downInfo = null;
let stroke = null;
const gestures = bindGestures(viewport, camera, {
  shouldPan: (e) => !editing && (tool === 'hand' || e.button === 1 || spaceDown || (!e.target.closest('.it') && tool === 'select')),
  onPinchStart: () => { physics.dragEnd(); downInfo = null; stroke = null; },
});
let spaceDown = false;

viewport.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || editing && e.target.closest('[contenteditable]')) return;
  if (editing) stopEdit();
  const pt = camera.toWorld(e.clientX, e.clientY);
  if (tool === 'pen') {
    viewport.setPointerCapture(e.pointerId);
    stroke = { pts: [pt], el: null };
    return;
  }
  if (tool === 'hand' || spaceDown) return;
  const el = e.target.closest('.it');
  if (!el) { select(null); return; }
  const item = byId(el.dataset.id);
  if (!item) return;
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
  viewport.setPointerCapture(e.pointerId);
  el.classList.add('grabbed');
  sfx.tick();
});
viewport.addEventListener('pointermove', (e) => {
  cursor = { x: e.clientX - viewport.getBoundingClientRect().left, y: e.clientY - viewport.getBoundingClientRect().top };
  if (gestures.pinching) return;
  const pt = camera.toWorld(e.clientX, e.clientY);
  if (stroke) { stroke.pts.push(pt); drawInk(); return; }
  if (downInfo) physics.dragMove(pt);
});
viewport.addEventListener('pointerleave', () => { if (!downInfo) cursor = null; });
const endPointer = (e) => {
  if (stroke) { finishStroke(); return; }
  if (!downInfo) return;
  const id = physics.dragEnd();
  els.get(downInfo.id)?.classList.remove('grabbed');
  const click = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) < 6 && performance.now() - downInfo.t < 450;
  const info = downInfo;
  downInfo = null;
  if (click) onItemClick(byId(info.id), info.act, e);
  else if (id) commit();
};
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);
viewport.addEventListener('dblclick', (e) => {
  const el = e.target.closest('.it');
  if (el) { const it = byId(el.dataset.id); if (it && (it.type === 'text' || it.type === 'note' || it.type === 'title')) startEdit(it); return; }
  if (tool === 'select') { const p = camera.toWorld(e.clientX, e.clientY); addItem(makeItem('text', p.x, p.y, { text: 'Your text', font: 'marker', size: 56 }), { edit: true }); }
});

function onItemClick(item, act, e) {
  if (!item) return;
  if (act === 'copy') { navigator.clipboard?.writeText(item.d.email).then(() => toast('Email copied!'), () => toast(item.d.email)); sfx.success(); return; }
  if (act === 'mail') { location.href = `mailto:${item.d.email}`; return; }
  if (item.type === 'game') openGame(item.d.gameId);
  else if (item.type === 'camera') takeSnapshot();
  else if (item.type === 'ball') { physics.nudge(item.id, (Math.random() - 0.5) * 30, -26, 0.3); sfx.boing(); }
  else if (item.type === 'sun') toast('Drag the sun up for noon, down for sunset. Delete it for night.');
}

// ---------------- pen ----------------
function drawInk() {
  const c = ink, ctx = c.getContext('2d');
  const r = viewport.getBoundingClientRect();
  if (c.width !== r.width) { c.width = r.width; c.height = r.height; }
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.lineWidth = 5 * camera.get().z;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = lights.darkness > 0.5 ? '#fff' : '#111';
  ctx.beginPath();
  stroke.pts.forEach((p, i) => { const s = camera.toScreen(p.x, p.y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
  ctx.stroke();
}
function finishStroke() {
  const pts = stroke.pts;
  stroke = null;
  ink.getContext('2d').clearRect(0, 0, ink.width, ink.height);
  if (pts.length < 2) return;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 8;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(20, Math.max(...xs) + pad - minX), h = Math.max(20, Math.max(...ys) + pad - minY);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x - minX).toFixed(1)} ${(p.y - minY).toFixed(1)}`).join('');
  addItem(makeItem('doodle', minX + w / 2, minY + h / 2, { path, w: Math.round(w), h: Math.round(h), width: 5, color: '#111' }), { quiet: true });
}

// ---------------- selection + context bar ----------------
const ctxBar = document.createElement('div');
ctxBar.className = 'ctxbar';
ctxBar.setAttribute('role', 'toolbar');
ctxBar.setAttribute('aria-label', 'Item actions');
document.body.appendChild(ctxBar);
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
  const b = (act, icon, title, pressed) => `<button type="button" data-cx="${act}" title="${title}" aria-label="${title}"${pressed != null ? ` aria-pressed="${pressed}"` : ''}>${ICONS[icon]}</button>`;
  let h = b('pin', 'pin', item.pin === 'pin' ? 'Unpin (drop it)' : 'Pin (hangs & swings)', item.pin === 'pin') + b('lock', item.pin === 'lock' ? 'lock' : 'unlock', item.pin === 'lock' ? 'Unlock' : 'Lock in place', item.pin === 'lock');
  h += '<i class="sep"></i>' + b('rotL', 'rotL', 'Rotate left') + b('rotR', 'rotR', 'Rotate right') + b('smaller', 'smaller', 'Smaller') + b('bigger', 'bigger', 'Bigger');
  if (item.type === 'text' || item.type === 'title') h += '<i class="sep"></i>' + b('font', 'font', 'Change font') + b('edit', 'edit', 'Edit text') + (item.type === 'text' ? b('invert', 'invert', 'Invert colors') : '');
  if (item.type === 'note') h += '<i class="sep"></i>' + b('edit', 'edit', 'Edit note') + b('invert', 'invert', 'Black / white note');
  if (item.type === 'game') h += '<i class="sep"></i><button type="button" data-cx="open" class="txtbtn">Open game</button>';
  if (item.type === 'camera') h += '<i class="sep"></i><button type="button" data-cx="snap" class="txtbtn">Snap</button>';
  h += '<i class="sep"></i>' + b('front', 'front', 'Bring to front') + b('dup', 'copy', 'Duplicate') + b('del', 'trash', 'Delete');
  ctxBar.innerHTML = h;
}
function positionCtxBar() {
  const it = byId(selected), s = sizes.get(selected);
  if (!it || !s) return;
  const top = camera.toScreen(it.x, it.y - (s.h * it.s) / 2);
  const r = viewport.getBoundingClientRect();
  const bw = ctxBar.offsetWidth;
  const x = Math.max(8, Math.min(innerWidth - bw - 8, r.left + top.x - bw / 2));
  const y = Math.max(70, r.top + top.y - ctxBar.offsetHeight - 24);
  ctxBar.style.transform = `translate(${x}px, ${y}px)`;
}
ctxBar.addEventListener('pointerdown', (e) => e.stopPropagation());
ctxBar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cx]');
  const item = byId(selected);
  if (!btn || !item) return;
  const act = btn.dataset.cx;
  const el = els.get(item.id);
  sfx.click();
  if (act === 'pin') { physics.setPin(item.id, item.pin === 'pin' ? null : 'pin'); if (!item.pin) physics.nudge(item.id, 0, -3, 0.05); }
  if (act === 'lock') physics.setPin(item.id, item.pin === 'lock' ? null : 'lock');
  if (act === 'rotL' || act === 'rotR') physics.setAngle(item.id, item.a + (act === 'rotL' ? -0.26 : 0.26));
  if (act === 'smaller' || act === 'bigger') { item.s = Math.max(0.3, Math.min(4, item.s * (act === 'bigger' ? 1.2 : 1 / 1.2))); delete item.pa; const s = sizes.get(item.id); physics.resize(item.id, s.w, s.h); }
  if (act === 'front') { item.z = Math.max(...board.items.map((i) => i.z)) + 1; place(el, item, sizes.get(item.id).w, sizes.get(item.id).h); }
  if (act === 'dup') { const c = JSON.parse(JSON.stringify(item)); c.id = makeItem('x', 0, 0).id; c.x += 60; c.y += 60; delete c.pa; addItem(c); return; }
  if (act === 'del') { removeItem(item.id); sfx.whoosh(); commit(); return; }
  if (act === 'edit') { startEdit(item); return; }
  if (act === 'invert') { if (item.type === 'note') item.d.tone = item.d.tone === 'black' ? 'white' : 'black'; else item.d.invert = !item.d.invert; rerender(item); }
  if (act === 'font') { openFontMenu(item, btn); return; }
  if (act === 'open') { openGame(item.d.gameId); return; }
  if (act === 'snap') { takeSnapshot(); return; }
  syncState(el, item);
  renderCtxBar(item);
  commit();
});
function rerender(item) {
  const old = els.get(item.id);
  const el = renderItem(item);
  old.replaceWith(el);
  els.set(item.id, el);
  const w = el.offsetWidth, h = el.offsetHeight;
  sizes.set(item.id, { w, h });
  delete item.pa;
  physics.resize(item.id, w, h);
  place(el, item, w, h);
  syncState(el, item);
  if (selected === item.id) { el.classList.add('sel'); renderCtxBar(item); }
}

function openFontMenu(item, anchor) {
  const m = $('[data-fontmenu]');
  m.innerHTML = FONTS.map((f) => `<button type="button" data-font="${f.id}" style="font-family:${f.family}" aria-pressed="${item.d.font === f.id}">${f.name}</button>`).join('');
  const r = anchor.getBoundingClientRect();
  m.style.left = `${Math.min(innerWidth - 300, Math.max(8, r.left - 120))}px`;
  m.style.top = `${r.bottom + 8}px`;
  m.hidden = false;
  m.onclick = (e) => {
    const b = e.target.closest('[data-font]');
    if (!b) return;
    item.d.font = b.dataset.font;
    rerender(item);
    m.hidden = true;
    commit();
  };
}

// ---------------- text editing ----------------
function startEdit(item) {
  const el = els.get(item.id);
  const t = el?.querySelector('[data-edit], .title-text');
  if (!t) return;
  editing = { item, t };
  physics.setPin(item.id, item.pin || 'pin');
  t.contentEditable = 'true';
  t.spellcheck = false;
  t.focus();
  const sel = getSelection();
  sel.selectAllChildren(t);
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
function closePanel() { const p = $('[data-panel]'); p.classList.remove('open'); setTimeout(() => (p.hidden = true), 300); }
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
    const shot = await snapshot({ items, els, sizes, cam, view: { w: r.width, h: r.height }, lightCanvas, background: '#ffffff' });
    download(shot.png, `fewclicks-board-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`);
    const c = viewCenter(-0.3);
    addItem(makeItem('photo', c.x, c.y, { src: shot.jpeg, caption: 'snapshot ✶', wide: true }, { pin: null, a: (Math.random() - 0.5) * 0.3, s: 0.8 }));
    toast('Snap! Saved a PNG and printed a polaroid.');
  } catch (err) {
    console.error(err);
    toast('Snapshot is not supported in this browser.');
  }
}

// ---------------- UI ----------------
function buildUI() {
  const tools = [
    ['select', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 8-6 2-3 6z"/></svg>', 'Select & toss (V)'],
    ['hand', ICONS.hand, 'Pan (H or hold Space)'],
    ['pen', ICONS.pen, 'Draw (D)'],
    '|',
    ['text', ICONS.text, 'Add text (T)'],
    ['note', ICONS.note, 'Add note (N)'],
    ['sticker', ICONS.sticker, 'Stickers (S)'],
    ['photo', ICONS.photo, 'Add your photo'],
    '|',
    ['sun', ICONS.sun, 'Sun'],
    ['lamp', ICONS.lamp, 'Hanging lamp'],
    ['torch', ICONS.torch, 'Torch'],
    ['ball', ICONS.ball, 'Bouncy ball'],
    ['balloon', ICONS.balloon, 'Balloon'],
    ['camera', ICONS.camera, 'Camera snapshot (C)'],
  ];
  $('[data-tools]').innerHTML = tools.map((t) => (t === '|' ? '<i class="sep"></i>' : `<button type="button" data-tool="${t[0]}" title="${t[2]}" aria-label="${t[2]}">${t[1]}</button>`)).join('');
  $('[data-stickers]').innerHTML = Object.entries(STICKERS).map(([k, svg]) => `<button type="button" data-stk="${k}" aria-label="${k} sticker">${svg}</button>`).join('');
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
  setTool('select');
  mountPrototypeBadge(11, 'Whiteboard');

  $('[data-tools]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    sfx.click();
    const t = b.dataset.tool;
    if (['select', 'hand', 'pen'].includes(t)) { setTool(t); return; }
    const c = viewCenter();
    if (t === 'text') addItem(makeItem('text', c.x, c.y, { text: 'Your text', font: 'marker', size: 56 }), { edit: true });
    if (t === 'note') addItem(makeItem('note', c.x, c.y, { text: 'Write something…', tone: 'white' }, { a: (Math.random() - 0.5) * 0.08 }), { edit: true });
    if (t === 'sticker') toggleDrawer();
    if (t === 'photo') $('[data-file]').click();
    if (t === 'camera') takeSnapshot();
    if (['lamp', 'torch', 'ball', 'balloon'].includes(t)) addItem(makeItem(t, c.x, viewCenter(-0.35).y, {}, t === 'torch' ? { a: 0.3 } : {}));
    if (t === 'sun') {
      const sun = board.items.find((i) => i.type === 'sun');
      if (sun) { select(sun.id); camera.centerOn(sun.x, sun.y); toast('There is only one sun. Drag it to change the time of day.'); }
      else { addItem(makeItem('sun', c.x, Math.max(200, viewCenter(-0.35).y), {}, { s: 1.4 })); toast('Good morning! ☀️'); }
    }
  });
  $('[data-stickers]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stk]');
    if (!b) return;
    const c = viewCenter(-0.38);
    addItem(makeItem('sticker', c.x + (Math.random() - 0.5) * 300, c.y, { key: b.dataset.stk }, { a: (Math.random() - 0.5) * 0.6 }));
  });
  $('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const img = await compressImage(f);
      const c = viewCenter(-0.1);
      addItem(makeItem('photo', c.x, c.y, { src: img.src, caption: f.name.replace(/\.[^.]+$/, '').slice(0, 28), ratio: `${img.w} / ${img.h}` }, { a: (Math.random() - 0.5) * 0.1 }));
      toast('Photo added. It stays in this browser only.');
    } catch { toast('Could not read that image.'); }
  });
  $('[data-undo]').addEventListener('click', undo);
  $('[data-redo]').addEventListener('click', redo);
  $('[data-zin]').addEventListener('click', () => camera.zoomAt(1.25));
  $('[data-zout]').addEventListener('click', () => camera.zoomAt(0.8));
  $('[data-fit]').addEventListener('click', fitAll);
  $('[data-flash]').addEventListener('click', () => setFlash(!flashlight));
  $('[data-gravity]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    physics.setGravity(b.dataset.g);
    syncGravityUI();
    commit();
    sfx.whoosh();
  });
  $('[data-export]').addEventListener('click', () => { exportFile(serialize()); toast('Board exported as a JSON file.'); });
  $('[data-import]').addEventListener('click', () => $('[data-importfile]').click());
  $('[data-importfile]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { board = await importFile(f); mountAll(); physics.setGravity(board.gravity || 'on'); syncGravityUI(); if (board.cam) camera.set(board.cam); commit(); toast('Board imported.'); } catch { toast('That file is not a FewClicks board.'); }
  });
  $('[data-reset]').addEventListener('click', () => {
    if (!confirm('Reset the board? Everything you added will be removed from this browser.')) return;
    clearBoard();
    board = seedBoard(DATA);
    mountAll();
    physics.setGravity('on');
    syncGravityUI();
    camera.fit({ x: 1300, y: 250, w: 3800, h: 2500 }, 40);
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
    if (!e.target.closest('[data-stickers], [data-tool="sticker"]')) $('[data-stickers]').hidden = true;
    if (!e.target.closest('[data-fontmenu], [data-cx="font"]')) $('[data-fontmenu]').hidden = true;
  });
}
function toggleDrawer() { const d = $('[data-stickers]'); d.hidden = !d.hidden; }
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  viewport.dataset.tool = t;
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
  board = s;
  mountAll();
  physics.setGravity(s.gravity || 'on');
  syncGravityUI();
  save();
  syncHistoryUI();
}
function undo() { applySnapshot(history.undo(serialize())); sfx.tick(); }
function redo() { applySnapshot(history.redo()); sfx.tick(); }
function fitAll() {
  if (!board.items.length) { camera.centerOn(CENTER.x, CENTER.y, 0.5); return; }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const it of board.items) { const s = sizes.get(it.id) || { w: 100, h: 100 }; x1 = Math.min(x1, it.x - s.w / 2); y1 = Math.min(y1, it.y - s.h / 2); x2 = Math.max(x2, it.x + s.w / 2); y2 = Math.max(y2, it.y + s.h / 2); }
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

// ---------------- keyboard ----------------
addEventListener('keydown', (e) => {
  if (editing) { if (e.key === 'Escape') editing.t.blur(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') { spaceDown = true; viewport.classList.add('space'); e.preventDefault(); return; }
  if ((k === 'delete' || k === 'backspace') && selected) { removeItem(selected); commit(); return; }
  if (k === 'escape') { select(null); closePanel(); return; }
  const item = selected && byId(selected);
  if (k === 'p' && item) { ctxBar.querySelector('[data-cx="pin"]')?.click(); return; }
  if (k === 'l' && item) { ctxBar.querySelector('[data-cx="lock"]')?.click(); return; }
  if (item && /^arrow/.test(k)) {
    e.preventDefault();
    const d = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
    physics.nudge(item.id, d[0] * 12, d[1] * 12);
    return;
  }
  const map = { v: 'select', h: 'hand', d: 'pen' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 't') $('[data-tool="text"]').click();
  if (k === 'n') $('[data-tool="note"]').click();
  if (k === 's') toggleDrawer();
  if (k === 'c') takeSnapshot();
  if (k === 'f') setFlash(!flashlight);
  if (k === '+' || k === '=') camera.zoomAt(1.25);
  if (k === '-') camera.zoomAt(0.8);
  if (k === '0') fitAll();
});
addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; viewport.classList.remove('space'); } });
addEventListener('beforeunload', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
