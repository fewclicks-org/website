// Editable terrain over an infinite x range: a sparse heightmap in 16px columns, surface materials,
// physics (Matter.js static segments per 1024px chunk, rebuilt when edited) and rendering of the
// ground: a soil cross-section, roots, pebbles, a bedrock line and grass blades that sway in the wind.

export const COL = 16;
const CHUNK = 64; // columns per physics chunk (1024px)
const MIN_H = -880; // deepest dig (bedrock below)
const MAX_H = 2400; // highest hill
export const BEDROCK = 1000; // bedrock depth below the base ground line
export const MATS = { grass: 0, sand: 1, clay: 2, rock: 3, dirt: 4 };
const MAT_NAMES = Object.keys(MATS);
const MAT_FRICTION = [0.85, 0.95, 0.8, 0.6, 0.85, 0, 0, 0, 0, 0.01]; // 9 = ice

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function createTerrain({ groundY }) {
  const H = new Map(); // col -> height above the base ground line (px, + = up)
  const MAT = new Map(); // col -> material code (default grass)
  const dirty = new Set(); // chunk indexes whose physics must be rebuilt
  const bodies = new Map(); // chunk -> [bodies]
  let physics = null;
  let topHook = () => 0; // extra solid height on top of a column (thick ice)
  let bedrock = null;
  let version = 0;

  const h = (c) => H.get(c) || 0;
  const colOf = (x) => Math.floor(x / COL);
  /** World y of the surface at x (interpolated). */
  function surfaceY(x) {
    const f = x / COL, c = Math.floor(f), t = f - c;
    return groundY - (h(c) * (1 - t) + h(c + 1) * t);
  }
  function slopeAt(x) { return (surfaceY(x + COL) - surfaceY(x - COL)) / (2 * COL); }
  function matAt(x) { return MAT_NAMES[MAT.get(colOf(x)) ?? 0]; }
  function setH(c, v) {
    v = Math.max(MIN_H, Math.min(MAX_H, v));
    if (Math.abs(v) < 0.5) H.delete(c); else H.set(c, v);
    dirty.add(Math.floor(c / CHUNK));
    if (c % CHUNK === 0) dirty.add(Math.floor(c / CHUNK) - 1);
    version++;
  }

  /**
   * Brush edit. mode: raise | lower | smooth | flatten | <material name>
   * x: world x; r: radius px; k: strength (0..1 per call); target: flatten height
   */
  function brush(mode, x, r, k = 1, target = 0) {
    const c0 = colOf(x - r), c1 = colOf(x + r);
    const before = [];
    for (let c = c0; c <= c1; c++) before.push(h(c));
    for (let c = c0; c <= c1; c++) {
      const d = (c * COL + COL / 2 - x) / r;
      if (Math.abs(d) > 1) continue;
      const w = Math.cos((d * Math.PI) / 2) ** 2; // smooth falloff
      const cur = h(c);
      if (MATS[mode] != null) { if (w > 0.25) { if (mode === 'grass') MAT.delete(c); else MAT.set(c, MATS[mode]); dirty.add(Math.floor(c / CHUNK)); version++; } continue; }
      if (MAT.get(c) === MATS.rock && mode === 'lower') continue;
      if (mode === 'raise') setH(c, cur + 26 * k * w);
      else if (mode === 'lower') setH(c, cur - 26 * k * w);
      else if (mode === 'flatten') setH(c, cur + (target - cur) * Math.min(1, 0.25 * k * w));
      else if (mode === 'smooth') {
        const i = c - c0;
        const avg = ((before[i - 2] ?? cur) + (before[i - 1] ?? cur) + cur + (before[i + 1] ?? cur) + (before[i + 2] ?? cur)) / 5;
        setH(c, cur + (avg - cur) * Math.min(1, 0.6 * k * w));
      }
    }
  }
  /** A smooth hill (or valley if height < 0) between x0 and x1, used by the seed. */
  function hill(x0, x1, height) {
    for (let c = colOf(x0); c <= colOf(x1); c++) {
      const t = (c * COL - x0) / (x1 - x0);
      if (t < 0 || t > 1) continue;
      setH(c, h(c) + height * Math.sin(t * Math.PI) ** 2);
    }
  }
  function paint(mat, x0, x1) { for (let c = colOf(x0); c <= colOf(x1); c++) { if (mat === 'grass') MAT.delete(c); else MAT.set(c, MATS[mat]); } version++; }
  function heightAtCol(c) { return h(c); }

  // ---------------- physics ----------------
  function attach(p) {
    physics = p;
    const { Bodies, Composite } = p.M;
    bedrock = Bodies.rectangle(0, groundY + BEDROCK + 1000, 8e6, 2000, { isStatic: true, label: 'ground', friction: 0.8 });
    Composite.add(p.engine.world, bedrock);
  }
  function buildChunk(k) {
    const { Bodies, Composite } = physics.M;
    (bodies.get(k) || []).forEach((b) => Composite.remove(physics.engine.world, b));
    const list = [];
    const c0 = k * CHUNK, c1 = c0 + CHUNK;
    const hs = (c) => h(c) + topHook(c);
    // merge runs of equal slope into single segments
    let sx = c0 * COL, sy = groundY - hs(c0);
    let slope = null;
    const T = 260;
    const emit = (x1, y1, x2, y2, mat) => {
      const L = Math.hypot(x2 - x1, y2 - y1), th = Math.atan2(y2 - y1, x2 - x1);
      const nx = -Math.sin(th), ny = Math.cos(th);
      const b = Bodies.rectangle((x1 + x2) / 2 + (nx * T) / 2, (y1 + y2) / 2 + (ny * T) / 2, L + 6, T, { isStatic: true, angle: th, label: 'ground', friction: MAT_FRICTION[mat] ?? 0.8 });
      b.groundChunk = k;
      b.friction = MAT_FRICTION[mat] ?? 0.8; // static bodies default to friction 1
      b.frictionStatic = mat === 9 ? 0.02 : 0.5;
      list.push(b);
    };
    for (let c = c0 + 1; c <= c1; c++) {
      const x = c * COL, y = groundY - hs(c);
      const px = (c - 1) * COL, py = groundY - hs(c - 1);
      const s = (y - py) / COL;
      const iceEdge = (topHook(c - 1) > 0) !== (topHook(c - 2) > 0);
      if (slope !== null && (Math.abs(s - slope) > 0.002 || iceEdge || (MAT.get(c - 1) ?? 0) !== (MAT.get(c - 2) ?? 0))) { emit(sx, sy, px, py, topHook(c - 2) > 0 ? 9 : MAT.get(c - 2) ?? 0); sx = px; sy = py; }
      slope = s;
      if (c === c1) emit(sx, sy, x, y, topHook(c - 1) > 0 ? 9 : MAT.get(c - 1) ?? 0);
    }
    list.forEach((b) => Composite.add(physics.engine.world, b));
    bodies.set(k, list);
  }
  /** Make sure physics exists for every chunk in `need` (Set of chunk idx); drop the rest. */
  function syncBodies(need) {
    if (!physics) return;
    const { Composite } = physics.M;
    for (const [k, list] of bodies) if (!need.has(k)) { list.forEach((b) => Composite.remove(physics.engine.world, b)); bodies.delete(k); }
    for (const k of need) if (!bodies.has(k) || dirty.has(k)) buildChunk(k);
    dirty.clear();
  }
  const chunkOf = (x) => Math.floor(x / (COL * CHUNK));

  // ---------------- persistence ----------------
  function serialize() {
    const runs = (map, round) => {
      const keys = [...map.keys()].sort((a, b) => a - b);
      const out = [];
      let cur = null;
      for (const k of keys) {
        if (cur && k === cur[0] + cur[1].length) cur[1].push(round(map.get(k)));
        else { cur = [k, [round(map.get(k))]]; out.push(cur); }
      }
      return out;
    };
    return { h: runs(H, (v) => Math.round(v)), m: runs(MAT, (v) => v) };
  }
  function load(data) {
    H.clear(); MAT.clear();
    for (const [k, vals] of data?.h || []) vals.forEach((v, i) => { if (v) H.set(k + i, v); });
    for (const [k, vals] of data?.m || []) vals.forEach((v, i) => MAT.set(k + i, v));
    for (const k of bodies.keys()) dirty.add(k);
    version++;
  }

  // ---------------- rendering ----------------
  const SEASON_GRASS = [['#6cc24a', '#57ad3a', '#86d65f'], ['#4f9f35', '#3f8a2c', '#68b847'], ['#a7a43f', '#8f8a33', '#c2b552'], ['#7f9a6e', '#6c8760', '#93ab84']];
  /**
   * Draw ground into ctx (already transformed to world coords). view = {x,y,w,h} world rect.
   * env = { t (seconds), season (0..3), wind (-3..3), snow (0..1), dark (0..1), ink, z }
   */
  function draw(ctx, view, env) {
    const z = env.z;
    const bottom = view.y + view.h + 40;
    let step = 1;
    while (step * COL * z < 3) step *= 2;
    const c0 = Math.floor(view.x / COL / step) * step - step, c1 = Math.ceil((view.x + view.w) / COL / step) * step + step;
    let minS = Infinity;
    const pts = [];
    for (let c = c0; c <= c1; c += step) { const y = groundY - h(c); pts.push([c * COL, y]); minS = Math.min(minS, y); }
    if (minS > bottom) return;
    const band = (depth, fill) => {
      ctx.beginPath();
      let any = false;
      pts.forEach(([x, y], i) => { const yy = Math.min(y + depth, Math.max(groundY + BEDROCK, y + 2)); if (yy < bottom) any = true; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
      if (!any) return;
      ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.lineTo(pts[0][0], bottom); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    };
    // soil bands
    band(0, '#6e4b2e');
    band(150, '#80593a');
    band(420, '#93684a');
    band(760, '#7b746c');
    // bedrock (absolute)
    if (groundY + BEDROCK < bottom) {
      const gy = groundY + BEDROCK;
      ctx.fillStyle = '#4a4542';
      ctx.fillRect(view.x - 10, gy, view.w + 20, bottom - gy);
      if (z > 0.08) {
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3 / z;
        ctx.beginPath();
        for (let x = Math.floor(view.x / 140) * 140; x < view.x + view.w; x += 140) { const j = hash(x) * 40; ctx.moveTo(x, gy + 20 + j); ctx.lineTo(x + 60, gy + 60 + j); ctx.lineTo(x + 40, gy + 120 + j); }
        ctx.stroke();
      }
    }
    // texture: pebbles, roots, worms, fossils
    if (z > 0.1) {
      for (let c = c0; c <= c1; c += step) {
        const r = hash(c), sy = groundY - h(c), x = c * COL;
        if (sy > bottom) continue;
        if (r < 0.22) { const dy = 40 + hash(c + 9) * 640, rad = 5 + hash(c + 3) * 12; if (sy + dy < Math.min(bottom, groundY + BEDROCK)) { ctx.fillStyle = dy > 420 ? '#9a928a' : '#5a3d24'; ctx.beginPath(); ctx.ellipse(x, sy + dy, rad * 1.4, rad, hash(c + 1) * 3, 0, Math.PI * 2); ctx.fill(); } }
        if (r > 0.86 && (MAT.get(c) ?? 0) === 0) { ctx.strokeStyle = 'rgba(60,35,18,.65)'; ctx.lineWidth = 2.5 / Math.max(z, 0.5); ctx.beginPath(); ctx.moveTo(x, sy + 10); ctx.quadraticCurveTo(x + 14 - hash(c + 4) * 28, sy + 40, x + 8 - hash(c + 7) * 16, sy + 70 + hash(c + 2) * 40); ctx.stroke(); }
        if (r > 0.995) { ctx.strokeStyle = '#e8d9c0'; ctx.lineWidth = 3; const fx = x, fy = sy + 500 + hash(c + 5) * 200; ctx.beginPath(); ctx.arc(fx, fy, 20, 0, Math.PI * 1.6); ctx.arc(fx, fy, 11, Math.PI * 1.6, 0, true); ctx.stroke(); }
      }
    }
    // surface strip per material
    ctx.lineJoin = 'round';
    const surfaceStroke = (mat, color, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath();
      let open = false;
      for (let i = 0; i < pts.length; i++) {
        const c = c0 + i * step;
        const m = MAT.get(c) ?? 0;
        if (m === mat) { open ? ctx.lineTo(pts[i][0], pts[i][1] + width / 2 - 2) : ctx.moveTo(pts[i][0], pts[i][1] + width / 2 - 2); open = true; } else open = false;
      }
      ctx.stroke();
    };
    const sIdx = env.season ?? 0;
    const gcol = SEASON_GRASS[sIdx];
    surfaceStroke(MATS.dirt, '#5a3a22', 12);
    surfaceStroke(MATS.sand, '#e6cf8f', 30);
    surfaceStroke(MATS.clay, '#b35f3b', 18);
    surfaceStroke(MATS.rock, '#8e8a86', 26);
    surfaceStroke(MATS.grass, gcol[1], 14);
    // grass blades (swaying)
    if (z > 0.14) {
      const t = env.t, wind = env.wind || 0;
      const shades = [new Path2D(), new Path2D(), new Path2D()];
      const bladeStep = Math.max(1, Math.round(6 / (z * 4)));
      for (let c = c0; c <= c1; c++) {
        if ((MAT.get(c) ?? 0) !== MATS.grass) continue;
        const sy = groundY - h(c);
        if (sy > bottom || sy < view.y - 60) continue;
        for (let b = 0; b < 4; b += bladeStep) {
          const r = hash(c * 4 + b);
          const x = c * COL + r * COL;
          const y = surfaceY(x) + 2;
          const len = (16 + r * 22) * (sIdx === 3 ? 0.6 : sIdx === 1 ? 1.2 : 1) * (1 - (env.trample?.(x) || 0) * 0.7);
          const sway = Math.sin(t * (1.6 + r) + x * 0.012) * (0.15 + Math.abs(wind) * 0.12) + wind * 0.22;
          const tipX = x + Math.sin(sway) * len, tipY = y - Math.cos(sway) * len;
          const p = shades[b % 3];
          p.moveTo(x - 2.4, y);
          p.quadraticCurveTo(x + Math.sin(sway) * len * 0.4, y - len * 0.55, tipX, tipY);
          p.quadraticCurveTo(x + Math.sin(sway) * len * 0.4 + 1, y - len * 0.5, x + 2.4, y);
        }
      }
      shades.forEach((p, i) => { ctx.fillStyle = gcol[i]; ctx.fill(p); });
    }
    // snow cover on the surface
    if (env.snow > 0.02) {
      ctx.strokeStyle = '#f7fbff'; ctx.lineWidth = 6 + env.snow * 26;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 2) : ctx.moveTo(x, y - 2)));
      ctx.stroke();
    }
  }

  /** Surface polyline for the minimap: [[x, y], ...] between x0 and x1 with n samples. */
  function profile(x0, x1, n = 80) { return Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n; return [x, surfaceY(x)]; }); }

  return {
    setTopHook: (fn) => { topHook = fn; },
    markDirty: (c) => { dirty.add(Math.floor(c / CHUNK)); },
    groundY, surfaceY, slopeAt, matAt, brush, hill, paint, heightAtCol, colOf,
    attach, syncBodies, chunkOf, serialize, load, draw, profile,
    get version() { return version; },
    get dirtyCount() { return dirty.size; },
  };
}
