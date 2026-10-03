// Camera: pan + zoom of the world layer over an endless canvas. screen = (world - cam) * zoom.
// The dot grid and the ground line are drawn in screen space so they never run out.

export const MIN_Z = 0.05;
export const MAX_Z = 4;

export function createCamera(viewport, layer, { groundY, dots, onChange }) {
  const cam = { x: 0, y: 0, z: 0.5 };
  const rect = () => viewport.getBoundingClientRect();
  const clampZ = (z) => Math.max(MIN_Z, Math.min(MAX_Z, z));

  // the canvas is infinite: only keep the numbers sane
  function clampPan() {
    cam.x = Math.max(-1e6, Math.min(1e6, cam.x));
    cam.y = Math.max(-1e6, Math.min(groundY + 1600, cam.y));
  }
  function apply() {
    layer.style.transform = `translate(${-cam.x * cam.z}px, ${-cam.y * cam.z}px) scale(${cam.z})`;
    // endless dot grid (coarser when zoomed far out) + the ground line
    const g = 40 * cam.z * (cam.z < 0.2 ? 5 : 1);
    if (dots) {
      dots.style.backgroundSize = `${g}px ${g}px`;
      dots.style.backgroundPosition = `${(-cam.x * cam.z) % g}px ${(-cam.y * cam.z) % g}px`;
    }
    viewport.style.setProperty('--z', cam.z);
    onChange?.(cam);
  }
  const api = {
    get: () => ({ ...cam }),
    set(c) { Object.assign(cam, c); cam.z = clampZ(cam.z); clampPan(); apply(); },
    toWorld(sx, sy) { const r = rect(); return { x: cam.x + (sx - r.left) / cam.z, y: cam.y + (sy - r.top) / cam.z }; },
    toScreen(wx, wy) { return { x: (wx - cam.x) * cam.z, y: (wy - cam.y) * cam.z }; },
    panBy(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampPan(); apply(); },
    zoomAt(factor, sx, sy) {
      const r = rect();
      const px = sx ?? r.left + r.width / 2, py = sy ?? r.top + r.height / 2;
      const before = api.toWorld(px, py);
      cam.z = clampZ(cam.z * factor);
      cam.x = before.x - (px - r.left) / cam.z;
      cam.y = before.y - (py - r.top) / cam.z;
      clampPan();
      apply();
    },
    centerOn(wx, wy, z = cam.z) {
      const r = rect();
      cam.z = clampZ(z);
      cam.x = wx - r.width / 2 / cam.z;
      cam.y = wy - r.height / 2 / cam.z;
      clampPan();
      apply();
    },
    fit(box, pad = 80) {
      const r = rect();
      const z = clampZ(Math.min((r.width - pad * 2) / box.w, (r.height - pad * 2) / box.h));
      api.centerOn(box.x + box.w / 2, box.y + box.h / 2, z);
    },
    viewRect() { const r = rect(); return { x: cam.x, y: cam.y, w: r.width / cam.z, h: r.height / cam.z }; },
  };
  addEventListener('resize', () => { clampPan(); apply(); });
  return api;
}

/**
 * Gestures on the viewport: wheel zoom / trackpad pan, pinch, and drag-to-pan.
 * shouldPan(e) decides whether a single-pointer drag pans (e.g. started on empty space).
 */
export function bindGestures(viewport, camera, { shouldPan, onPinchStart }) {
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const trackpadPan = !e.ctrlKey && (Math.abs(e.deltaX) > 0.5 || (e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && !Number.isInteger(e.deltaY / 100)));
    if (trackpadPan) camera.panBy(-e.deltaX, -e.deltaY);
    else {
      const k = e.ctrlKey ? Math.exp(-e.deltaY * 0.01) : Math.exp(-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0018);
      camera.zoomAt(k, e.clientX, e.clientY);
    }
  }, { passive: false });

  const pts = new Map();
  let pan = null, pinch = null;
  viewport.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      onPinchStart?.();
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      pan = null;
    } else if (pts.size === 1 && shouldPan(e)) {
      pan = { x: e.clientX, y: e.clientY, id: e.pointerId };
      viewport.classList.add('panning');
    }
  });
  addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      camera.panBy(cx - pinch.cx, cy - pinch.cy);
      camera.zoomAt(d / pinch.d, cx, cy);
      pinch = { d, cx, cy };
    } else if (pan && e.pointerId === pan.id) {
      camera.panBy(e.clientX - pan.x, e.clientY - pan.y);
      pan.x = e.clientX; pan.y = e.clientY;
    }
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pan && e.pointerId === pan.id) { pan = null; viewport.classList.remove('panning'); }
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  return { get pinching() { return !!pinch; }, get panning() { return !!pan; }, cancel() { pan = null; viewport.classList.remove('panning'); } };
}
