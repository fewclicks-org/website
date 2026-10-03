// Pen + graphics tablet ink. Pressure (pen/stylus), coalesced + predicted pointer events,
// variable-width outlines (perfect-freehand style, written here: no dependency), eraser hit tests.

const PEN_TOOLS = { pen: { k: 1, min: 0.22 }, marker: { k: 1, min: 1 }, highlighter: { k: 2.4, min: 1 } };

/** Collects points for one stroke from pointer events (world coords). */
export function createStroke(e, toWorld, opts) {
  const pts = [];
  let last = null;
  const pressureOf = (ev, dt, dist) => {
    // a real pen/tablet reports pressure; mouse/touch fake it from speed (fast = thin)
    if (ev.pointerType === 'pen' && ev.pressure > 0) return ev.pressure;
    const v = dt > 0 ? dist / dt : 0;
    return Math.max(0.35, Math.min(1, 1.05 - v * 0.35));
  };
  function push(ev) {
    const p = toWorld(ev.clientX, ev.clientY);
    const t = ev.timeStamp || performance.now();
    if (last) {
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      if (dist < 0.8) return;
      const pr = pressureOf(ev, t - last.t, dist);
      // light smoothing of pressure + position (streamline)
      const sp = last.p * 0.6 + pr * 0.4;
      const sx = last.x + (p.x - last.x) * 0.75, sy = last.y + (p.y - last.y) * 0.75;
      last = { x: sx, y: sy, p: sp, t };
    } else {
      last = { x: p.x, y: p.y, p: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.6, t };
    }
    pts.push([last.x, last.y, last.p]);
  }
  push(e);
  return {
    opts,
    pointerType: e.pointerType,
    pts,
    /** Add a pointermove; uses coalesced events for full tablet resolution. */
    move(ev) {
      const list = ev.getCoalescedEvents?.() || [];
      if (list.length) list.forEach(push); else push(ev);
      // predicted points only for the live preview (not stored)
      const pred = (ev.getPredictedEvents?.() || []).slice(0, 2).map((pe) => { const q = toWorld(pe.clientX, pe.clientY); return [q.x, q.y, last?.p ?? 0.6]; });
      return pred;
    },
  };
}

/** SVG path data for a filled, variable-width stroke. pts = [[x,y,p], ...] */
export function strokePath(pts, size = 6, tool = 'pen') {
  const cfg = PEN_TOOLS[tool] || PEN_TOOLS.pen;
  const base = size * cfg.k;
  const rad = (p) => (base / 2) * (cfg.min + (1 - cfg.min) * Math.min(1, Math.max(0, p ?? 0.6)) * (cfg.min < 1 ? 1.15 : 1));
  const n = pts.length;
  if (!n) return '';
  const f = (v) => v.toFixed(1);
  if (n === 1 || (n === 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < 1)) {
    const [x, y, p] = pts[0];
    const r = Math.max(0.8, rad(p));
    return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`;
  }
  const left = [], right = [];
  const tan = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    tan.push([tx, ty]);
    const r = Math.max(0.6, rad(pts[i][2]));
    left.push([pts[i][0] - ty * r, pts[i][1] + tx * r]);
    right.push([pts[i][0] + ty * r, pts[i][1] - tx * r]);
  }
  const cap = (i, forward) => {
    const [x, y, p] = pts[i];
    const r = Math.max(0.6, rad(p));
    const [tx, ty] = tan[i];
    const nx = -ty, ny = tx;
    const out = [];
    for (let k = 1; k < 6; k++) {
      const th = (k / 6) * Math.PI;
      if (forward) out.push([x + (nx * Math.cos(th) + tx * Math.sin(th)) * r, y + (ny * Math.cos(th) + ty * Math.sin(th)) * r]);
      else out.push([x + (-nx * Math.cos(th) - tx * Math.sin(th)) * r, y + (-ny * Math.cos(th) - ty * Math.sin(th)) * r]);
    }
    return out;
  };
  const ring = [...left, ...cap(n - 1, true), ...right.reverse(), ...cap(0, false)];
  return `M${ring.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}

/** Normalize world-space strokes into a doodle item's local box. Returns { x, y, w, h, strokes }. */
export function packStrokes(strokes) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const st of strokes) {
    const pad = (st.size || 6) * (PEN_TOOLS[st.tool]?.k || 1) + 4;
    for (const [x, y] of st.pts) { x1 = Math.min(x1, x - pad); y1 = Math.min(y1, y - pad); x2 = Math.max(x2, x + pad); y2 = Math.max(y2, y + pad); }
  }
  const w = Math.max(16, Math.ceil(x2 - x1)), h = Math.max(16, Math.ceil(y2 - y1));
  return {
    x: x1 + w / 2, y: y1 + h / 2, w, h,
    strokes: strokes.map((st) => ({ ...st, pts: st.pts.map(([x, y, p]) => [+(x - x1).toFixed(1), +(y - y1).toFixed(1), +(p ?? 0.6).toFixed(2)]) })),
  };
}

/** Convert a doodle item's strokes back to world coordinates (honours position, rotation, scale). */
export function worldStrokes(item) {
  const d = item.d;
  const c = Math.cos(item.a), s = Math.sin(item.a);
  const tf = ([x, y, p]) => {
    const lx = (x - d.w / 2) * item.s, ly = (y - d.h / 2) * item.s;
    return [item.x + lx * c - ly * s, item.y + lx * s + ly * c, p];
  };
  return (d.strokes || []).map((st) => ({ ...st, size: (st.size || 6) * item.s, pts: st.pts.map(tf) }));
}

/** Is world point (x,y) within r of a stroke? */
export function hitStroke(st, x, y, r) {
  const rr = r + (st.size || 6);
  for (let i = 0; i < st.pts.length; i++) {
    const a = st.pts[i], b = st.pts[i + 1] || a;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
    if (Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t)) < rr) return true;
  }
  return false;
}

/** Live preview on the ink canvas (screen space). */
export function drawPreview(ctx, stroke, extra, toScreen, z) {
  const pts = [...stroke.pts, ...extra].map(([x, y, p]) => { const q = toScreen(x, y); return [q.x, q.y, p]; });
  const { size, tool, color } = stroke.opts;
  ctx.save();
  ctx.fillStyle = color;
  if (tool === 'highlighter') { ctx.globalAlpha = 0.38; ctx.globalCompositeOperation = 'multiply'; }
  ctx.fill(new Path2D(strokePath(pts, size * z, tool)));
  ctx.restore();
}

/** A tiny hand-made "hi!" for the starting board. */
export function demoHi() {
  const P = (arr, p = 0.7) => arr.map(([x, y], i) => [x, y, p + Math.sin(i / 3) * 0.2]);
  const line = (x1, y1, x2, y2, n = 10) => Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  const arc = (cx, cy, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const o = { size: 14, tool: 'pen', color: '#111' };
  return [
    { ...o, pts: P(line(0, 0, 4, 120, 14)) },
    { ...o, pts: P([...line(6, 120, 8, 76, 6), ...arc(30, 78, 22, Math.PI, Math.PI * 2, 10).slice(1), ...line(52, 80, 56, 122, 6).slice(1)]) },
    { ...o, pts: P(line(90, 62, 94, 122, 8)) },
    { ...o, pts: P([[92, 34], [93, 35]], 1) },
    { ...o, color: '#ff3b30', pts: P(line(136, 0, 130, 92, 12), 0.9) },
    { ...o, color: '#ff3b30', pts: P([[129, 118], [130, 119]], 1) },
  ];
}
