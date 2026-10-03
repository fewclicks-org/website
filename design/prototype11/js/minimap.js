// Minimap: everything on the (infinite) canvas in miniature, plus the current view. Click or drag to move.

export function createMinimap(canvas, camera, { groundY }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let cw = 0, ch = 0;
  let T = { k: 1, ox: 0, oy: 0, x: 0, y: 0 };
  const fitCanvas = () => {
    cw = canvas.clientWidth || 200; ch = canvas.clientHeight || 120;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
  };
  fitCanvas();
  addEventListener('resize', fitCanvas);

  function draw(items, sizes, darkness = 0) {
    // extents = content + current view, padded
    const v = camera.viewRect();
    let x1 = v.x, y1 = v.y, x2 = v.x + v.w, y2 = v.y + v.h;
    for (const it of items) {
      const s = sizes.get(it.id);
      if (!s) continue;
      const r = (Math.max(s.w, s.h) * it.s) / 2;
      x1 = Math.min(x1, it.x - r); y1 = Math.min(y1, it.y - r); x2 = Math.max(x2, it.x + r); y2 = Math.max(y2, it.y + r);
    }
    y2 = Math.max(y2, groundY + 200);
    const pw = (x2 - x1) * 0.06, ph = (y2 - y1) * 0.06;
    x1 -= pw; x2 += pw; y1 -= ph; y2 += ph;
    const k = Math.min(cw / (x2 - x1), ch / (y2 - y1));
    T = { k, x: x1, y: y1, ox: (cw - (x2 - x1) * k) / 2, oy: (ch - (y2 - y1) * k) / 2 };
    const X = (wx) => T.ox + (wx - T.x) * k, Y = (wy) => T.oy + (wy - T.y) * k;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = darkness > 0.5 ? '#1b1b1f' : '#fff';
    ctx.fillRect(0, 0, cw, ch);
    // ground
    const gy = Y(groundY);
    ctx.fillStyle = darkness > 0.5 ? '#2a2a30' : '#ececee';
    ctx.fillRect(0, gy, cw, ch - gy);
    ctx.fillStyle = darkness > 0.5 ? '#888' : '#111';
    ctx.fillRect(0, gy, cw, 1);
    for (const it of items) {
      const s = sizes.get(it.id);
      if (!s) continue;
      const w = Math.max(2, s.w * it.s * k), h = Math.max(2, s.h * it.s * k);
      const x = X(it.x), y = Y(it.y);
      if (it.type === 'sun' || it.type === 'lamp' || it.type === 'torch' || (it.type === 'fire' && it.d?.lit !== false)) {
        ctx.fillStyle = it.type === 'fire' ? '#ff6a1a' : '#ffc61a';
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(it.a);
      ctx.fillStyle = it.type === 'water' ? (it.d?.frozen ? '#bfe6ff' : '#4cc9ff') : it.type === 'game' || it.type === 'photo' ? '#777'
        : ['sticker', 'ball', 'balloon', 'plant', 'duck', 'dice', 'coin', 'cloud', 'fan', 'magnet'].includes(it.type) ? '#ff4d6d' : darkness > 0.5 ? '#ddd' : '#111';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(X(v.x), Y(v.y), v.w * k, v.h * k);
  }

  const go = (e) => {
    const r = canvas.getBoundingClientRect();
    camera.centerOn(T.x + (e.clientX - r.left - T.ox) / T.k, T.y + (e.clientY - r.top - T.oy) / T.k);
  };
  let down = false;
  canvas.addEventListener('pointerdown', (e) => { down = true; canvas.setPointerCapture(e.pointerId); go(e); e.stopPropagation(); });
  canvas.addEventListener('pointermove', (e) => { if (down) go(e); });
  canvas.addEventListener('pointerup', () => (down = false));
  canvas.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: [200, 0], ArrowRight: [-200, 0], ArrowUp: [0, 200], ArrowDown: [0, -200] }[e.key];
    if (m) { e.preventDefault(); camera.panBy(m[0], m[1]); }
  });
  return { draw };
}
