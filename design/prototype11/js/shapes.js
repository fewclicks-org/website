// Real outlines for physics: instead of the item's bounding box, bodies follow the visible picture.
// Each picture is rasterized once (96px), its alpha outline is traced and simplified, and cached per
// art key. Pen drawings become a chain of thin capsules along every stroke.
// Everything happens in the browser; outlines are cached in localStorage.

import { svgUrl } from './art.js';

const GRID = 96;
const CACHE_KEY = 'fewclicks:shapes:v1';
const SHAPED = new Set(['sticker', 'lamp', 'torch', 'balloon', 'camera', 'fire', 'magnet', 'kite', 'duck', 'clip', 'ice', 'extinguisher', 'bucket', 'flag', 'tap', 'tank', 'bore', 'sprinkler', 'can', 'fan', 'windsock', 'spinner', 'sun']);
let store = {};
try { store = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { store = {}; }
const pending = new Set();
const saveStore = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch { /* full or private */ } };

export function artKey(item) {
  const d = item.d || {};
  if (item.type === 'sticker') return d.src ? null : `sticker:${d.key}`;
  if (item.type === 'bore') return `bore:${d.pump || 'hand'}`;
  return SHAPED.has(item.type) ? item.type : null;
}

/** Local polygon (box-centred, unscaled px) or segments for an item, or null (use a box/circle). */
export function localShape(item, w, h) {
  if (item.type === 'doodle') return doodleSegs(item);
  const key = artKey(item);
  if (!key) return null;
  const s = store[key];
  if (!s || Math.abs(s.w - w) > 2 || Math.abs(s.h - h) > 2) return null;
  return { pts: s.pts.map(([u, v]) => ({ x: (u - 0.5) * w, y: (v - 0.5) * h })) };
}

/** Trace the outline for an item element (async). Calls done() when a new outline is ready. */
export function traceItem(item, el, done) {
  const key = artKey(item);
  if (!key || !el) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  if (store[key] && Math.abs(store[key].w - w) <= 2 && Math.abs(store[key].h - h) <= 2) return;
  if (pending.has(key)) return;
  pending.add(key);
  const k = GRID / Math.max(w, h);
  const cw = Math.max(4, Math.round(w * k)), ch = Math.max(4, Math.round(h * k));
  const c = document.createElement('canvas');
  c.width = cw + 2; c.height = ch + 2;
  const ctx = c.getContext('2d');
  const box = el.getBoundingClientRect();
  const sx = cw / box.width, sy = ch / box.height; // the element may be rotated: use unrotated layout instead
  const nodes = [...el.querySelectorAll('img.tw, .obj > svg, .stk > svg')].filter((n) => !n.closest('.pushpin'));
  if (!nodes.length) { pending.delete(key); return; }
  const off = (n) => { let x = 0, y = 0, m = n; while (m && m !== el) { x += m.offsetLeft || 0; y += m.offsetTop || 0; m = m.offsetParent; } return { x, y }; };
  const jobs = nodes.map((n) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ img, n });
    img.onerror = () => res(null);
    if (n.tagName === 'IMG') img.src = n.currentSrc || n.src;
    else { const sv = n.cloneNode(true); sv.setAttribute('width', n.clientWidth || n.getBoundingClientRect().width); sv.setAttribute('height', n.clientHeight || n.getBoundingClientRect().height); img.src = svgUrl(sv.outerHTML); }
  }));
  Promise.all(jobs).then((list) => {
    pending.delete(key);
    for (const r of list) {
      if (!r) continue;
      const o = off(r.n);
      const nw = r.n.offsetWidth || r.n.getBoundingClientRect().width, nh = r.n.offsetHeight || r.n.getBoundingClientRect().height;
      ctx.drawImage(r.img, 1 + o.x * k, 1 + o.y * k, nw * k, nh * k);
    }
    void sx; void sy;
    let data;
    try { data = ctx.getImageData(0, 0, c.width, c.height).data; } catch { return; }
    const pts = traceAlpha(data, c.width, c.height);
    if (!pts || pts.length < 3) return;
    store[key] = { w, h, pts: pts.map(([x, y]) => [+(((x - 1) / cw)).toFixed(4), +(((y - 1) / ch)).toFixed(4)]) };
    saveStore();
    done?.();
  });
}

// ---- outline tracing: Moore-neighbour boundary of the largest opaque blob, then RDP simplify ----
function traceAlpha(data, W, H) {
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3] > 60 ? 1 : 0);
  // close tiny gaps: dilate once
  const solid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y * W + x] = A(x, y) || A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1) ? 1 : 0;
  const S = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : solid[y * W + x]);
  // largest blob: flood fill labels
  const lab = new Int32Array(W * H);
  let best = 0, bestN = 0, id = 0;
  for (let i = 0; i < W * H; i++) {
    if (!solid[i] || lab[i]) continue;
    id++;
    let n = 0;
    const st = [i];
    lab[i] = id;
    while (st.length) { const j = st.pop(); n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (solid[k] && !lab[k]) { lab[k] = id; st.push(k); } } }
    if (n > bestN) { bestN = n; best = id; }
  }
  if (!best) return null;
  const In = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : lab[y * W + x] === best ? 1 : 0);
  // start: top-left pixel of the blob
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (In(x, y)) { sx = x; sy = y; break outer; }
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [[sx, sy]];
  let cx = sx, cy = sy, d = 6;
  for (let guard = 0; guard < W * H * 2; guard++) {
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (d + 6 + i) % 8; // start looking left of the last move
      const nx = cx + dirs[nd][0], ny = cy + dirs[nd][1];
      if (In(nx, ny)) { cx = nx; cy = ny; d = nd; found = true; break; }
    }
    if (!found) break;
    if (cx === sx && cy === sy) break;
    pts.push([cx + 0.5, cy + 0.5]);
  }
  void S;
  let simp = rdp(pts, 1.2);
  for (let eps = 1.6; simp.length > 26 && eps < 12; eps *= 1.4) simp = rdp(pts, eps);
  return simp;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / l; };
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if (d > max) { max = d; idx = i; } }
  if (max > eps) { const a = rdp(pts.slice(0, idx + 1), eps), b = rdp(pts.slice(idx), eps); return a.slice(0, -1).concat(b); }
  return [pts[0], pts[pts.length - 1]];
}

/** Pen strokes → line segments [x1,y1,x2,y2,width] relative to the doodle's box centre. */
function doodleSegs(item) {
  const d = item.d || {};
  if (!d.strokes) return null;
  const segs = [];
  for (const st of d.strokes) {
    const pts = st.pts;
    if (!pts?.length) continue;
    const wd = Math.max(6, (st.size || 6) * (st.tool === 'highlighter' ? 2.4 : 1) * 0.9);
    const step = Math.max(1, Math.round(pts.length / 40));
    let prev = pts[0];
    for (let i = step; i < pts.length + step; i += step) {
      const p = pts[Math.min(i, pts.length - 1)];
      if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 3 && i < pts.length - 1) continue;
      segs.push([prev[0] - d.w / 2, prev[1] - d.h / 2, p[0] - d.w / 2, p[1] - d.h / 2, wd]);
      prev = p;
      if (i >= pts.length - 1) break;
    }
    if (pts.length === 1 || segs.length === 0) segs.push([pts[0][0] - d.w / 2 - 2, pts[0][1] - d.h / 2, pts[0][0] - d.w / 2 + 2, pts[0][1] - d.h / 2, wd]);
  }
  return segs.length ? { segs: segs.slice(0, 120) } : null;
}
