// Lighting: a screen-space darkness layer with holes cut by light sources, plus per-item directional shadows.
// No sun on the board = night. Lamps (point lights), torches (cone spotlights) and a cursor flashlight light it up.

export function createLights(canvas, { groundY }) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  addEventListener('resize', resize);
  resize();

  let darkness = 0;
  let flash = 0; // lightning flash 0..1, decays every frame
  const LAMP = { warm: '255,200,120', cool: '170,210,255', white: '255,255,240' };

  /** Compute ambient darkness from the sun (higher sun = brighter day). */
  function ambient(items) {
    const sun = items.find((i) => i.type === 'sun');
    if (!sun) return { dark: 0.9, sun: null };
    const h = Math.min(1, Math.max(0, sun.y / groundY)); // 0 high in the sky .. 1 on the ground
    const day = 1 - Math.pow(h, 1.6);
    return { dark: Math.max(0, Math.min(0.78, 0.78 * (1 - day))), sun, warm: Math.max(0, h - 0.45) };
  }

  /**
   * Draw the light overlay. cam = {x,y,z}; flashlight = {x,y} screen point or null.
   */
  function draw(items, cam, flashlight) {
    const amb = ambient(items);
    darkness = amb.dark;
    flash *= 0.86;
    if (flash < 0.02) flash = 0;
    const t = performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // sunset tint
    if (amb.sun && amb.warm > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,120,40,${amb.warm * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (darkness < 0.06) { darkness = 0; drawFlash(); return darkness; }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(6,6,10,${darkness * (1 - flash)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const S = (x, y) => ({ x: (x - cam.x) * cam.z, y: (y - cam.y) * cam.z });
    for (const it of items) {
      if (it.type === 'lamp') {
        const p = S(it.x, it.y + 30 * it.s);
        const r = 560 * it.s * cam.z;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      } else if (it.type === 'torch') {
        const ang = it.a; // torch points along its +x axis
        const tip = S(it.x + Math.cos(ang) * 48 * it.s, it.y + Math.sin(ang) * 48 * it.s);
        const len = 1300 * it.s * cam.z, spread = it.d?.beam || 0.42;
        const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, len);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.arc(tip.x, tip.y, len, ang - spread, ang + spread); ctx.closePath(); ctx.fill();
      } else if (it.type === 'fire' && it.d?.lit !== false) {
        const p = S(it.x, it.y - 20 * it.s);
        const r = (520 + Math.sin(t / 90 + it.x) * 26 + Math.sin(t / 37) * 14) * (it.d?.size || 1) * it.s * cam.z;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      } else if (it.type === 'sun' && amb.sun) {
        const p = S(it.x, it.y);
        const r = 420 * cam.z;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (flashlight) {
      const r = 240;
      const g = ctx.createRadialGradient(flashlight.x, flashlight.y, 0, flashlight.x, flashlight.y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(flashlight.x, flashlight.y, r, 0, Math.PI * 2); ctx.fill();
    }
    // warm glow for lamps and fires
    ctx.globalCompositeOperation = 'lighter';
    for (const it of items) {
      const fire = it.type === 'fire' && it.d?.lit !== false;
      if (it.type !== 'lamp' && !fire) continue;
      const p = S(it.x, it.y + (fire ? -20 : 30) * it.s);
      const r = (fire ? 360 * (it.d?.size || 1) * (1 + Math.sin(t / 70 + it.x) * 0.05) : 300) * it.s * cam.z;
      const col = fire ? '255,140,40' : LAMP[it.d?.temp] || LAMP.warm;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(${col},${(fire ? 0.3 : 0.22) * darkness})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    drawFlash();
    return darkness;
  }
  function drawFlash() {
    if (!flash) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(235,240,255,${flash * 0.55})`;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Directional shadows: every item casts a drop-shadow away from the dominant light.
   * els: Map(id -> element)
   */
  function shadows(items, els) {
    const sun = items.find((i) => i.type === 'sun');
    const lamps = items.filter((i) => i.type === 'lamp' || i.type === 'torch' || (i.type === 'fire' && i.d?.lit !== false));
    for (const it of items) {
      const el = els.get(it.id);
      if (!el) continue;
      if (it.type === 'water' || it.type === 'cloud') { setShadow(el, it.type === 'cloud' ? 'drop-shadow(0 30px 24px rgba(0,0,0,.12))' : 'none'); continue; }
      if (it.type === 'sun' || it.type === 'lamp') { setShadow(el, it.type === 'sun' ? 'drop-shadow(0 0 40px rgba(255,200,40,.9))' : 'drop-shadow(0 0 24px rgba(255,220,150,.9))'); continue; }
      let lx, ly, strength;
      if (sun) { lx = sun.x; ly = sun.y; strength = 1; }
      else {
        let best = null, bd = Infinity;
        for (const l of lamps) { const d = Math.hypot(l.x - it.x, l.y - it.y); if (d < bd) { bd = d; best = l; } }
        if (!best || bd > 1800) { setShadow(el, 'none'); continue; }
        lx = best.x; ly = best.y; strength = Math.max(0.25, 1 - bd / 1800);
      }
      const dx = it.x - lx, dy = it.y - ly;
      const d = Math.hypot(dx, dy) || 1;
      const lift = it.pin === 'pin' ? 22 : it.pin === 'lock' ? 12 : 7;
      const len = lift * strength * (sun ? 1 : 1.4) * Math.min(1.6, 0.6 + d / 1200);
      // shadow offset must be expressed in the item's rotated space
      const ox = (dx / d) * len, oy = (dy / d) * len;
      const c = Math.cos(-it.a), s = Math.sin(-it.a);
      const rx = (ox * c - oy * s) / it.s, ry = (ox * s + oy * c) / it.s;
      const blur = (6 + len * 0.7) / it.s;
      const alpha = sun ? 0.26 : 0.55 * strength;
      setShadow(el, `drop-shadow(${rx.toFixed(1)}px ${ry.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,${alpha.toFixed(2)}))`);
    }
  }
  function setShadow(el, v) {
    if (el._sh === v) return;
    el._sh = v;
    el.style.filter = v;
  }

  return { draw, shadows, resize, strike: (v = 1) => { flash = Math.max(flash, v); }, get flashing() { return flash > 0; }, get darkness() { return darkness; } };
}
