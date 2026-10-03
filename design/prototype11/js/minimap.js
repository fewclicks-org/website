// Minimap: the whole board in miniature, with the current view rectangle. Click or drag to move.

export function createMinimap(canvas, camera, { width, height }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth || 200, ch = canvas.clientHeight || 130;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  const k = Math.min(cw / width, ch / height);
  const ox = (cw - width * k) / 2, oy = (ch - height * k) / 2;

  function draw(items, sizes, darkness = 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = darkness > 0.5 ? '#1b1b1f' : '#fff';
    ctx.fillRect(ox, oy, width * k, height * k);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, width * k - 1, height * k - 1);
    for (const it of items) {
      const s = sizes.get(it.id);
      if (!s) continue;
      const w = Math.max(2, s.w * it.s * k), h = Math.max(2, s.h * it.s * k);
      const x = ox + it.x * k, y = oy + it.y * k;
      if (it.type === 'sun' || it.type === 'lamp' || it.type === 'torch') {
        ctx.fillStyle = '#ffc61a';
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(it.a);
      ctx.fillStyle = it.type === 'game' || it.type === 'photo' ? '#777' : it.type === 'sticker' || it.type === 'ball' || it.type === 'balloon' ? '#ff4d6d' : darkness > 0.5 ? '#ddd' : '#111';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    const v = camera.viewRect();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + v.x * k, oy + v.y * k, v.w * k, v.h * k);
  }

  const go = (e) => {
    const r = canvas.getBoundingClientRect();
    const wx = (e.clientX - r.left - ox) / k, wy = (e.clientY - r.top - oy) / k;
    camera.centerOn(Math.max(0, Math.min(width, wx)), Math.max(0, Math.min(height, wy)));
  };
  let down = false;
  canvas.addEventListener('pointerdown', (e) => { down = true; canvas.setPointerCapture(e.pointerId); go(e); e.stopPropagation(); });
  canvas.addEventListener('pointermove', (e) => { if (down) go(e); });
  canvas.addEventListener('pointerup', () => (down = false));
  canvas.addEventListener('keydown', (e) => {
    const s = 200 / camera.get().z;
    const m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    if (m) { e.preventDefault(); camera.panBy(-m[0] * camera.get().z, -m[1] * camera.get().z); }
  });
  return { draw };
}
