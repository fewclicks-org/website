// Lighting: a screen-space darkness layer with holes cut by light sources, plus per-item directional shadows.
// Darkness + light colour come from the world clock (sun altitude, moon). Lamps, torches, fires and the
// cursor flashlight cut light into the night. Shadows follow the sun's angle: long at dawn/dusk, short at noon.

export function createLights(canvas) {
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
  let flashes = []; // local lightning flashes {x, y, r, v} in world space, decaying every frame
  let anchorOf = null; // (item, name) → world point of an art anchor (torch lens)
  const LAMP = { warm: '255,200,120', cool: '170,210,255', white: '255,255,240' };

  /**
   * Draw the light overlay. cam = {x,y,z}; flashlight = {x,y} screen point or null.
   */
  function draw(items, cam, flashlight, env = { dark: 0, warm: 0 }) {
    const amb = { dark: env.dark, warm: env.warm };
    darkness = amb.dark;
    flashes.forEach((f) => { f.v *= 0.86; });
    flashes = flashes.filter((f) => f.v > 0.02);
    const t = performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // sunset tint
    if (env.fog > 0.02) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(226,230,236,${Math.min(0.55, env.fog * 0.5)})`; ctx.fillRect(0, 0, W, H); }
    if (env.heat > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,190,90,${env.heat * 0.08})`; ctx.fillRect(0, 0, W, H); }
    if (amb.warm > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,120,40,${amb.warm * 0.16})`;
      ctx.fillRect(0, 0, W, H);
    }
    const S = (x, y) => ({ x: (x - cam.x) * cam.z, y: (y - cam.y) * cam.z });
    if (darkness < 0.06) { darkness = 0; drawFlash(S, cam); return darkness; }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(6,6,10,${darkness})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    // lightning lights up only the area around the bolt
    for (const f of flashes) {
      const p = S(f.x, f.y), r = f.r * cam.z;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(0,0,0,${Math.min(1, f.v)})`); g.addColorStop(0.5, `rgba(0,0,0,${f.v * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (const it of items) {
      if (it.type === 'lamp') {
        const p = S(it.x, it.y + 30 * it.s);
        const r = 560 * it.s * cam.z;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      } else if (it.type === 'torch') {
        const ang = it.a; // the torch art points along its +x axis; the beam starts at the lens
        const lens = anchorOf?.(it, 'lens') || { x: it.x + Math.cos(ang) * 12 * it.s, y: it.y + Math.sin(ang) * 12 * it.s };
        const tip = S(lens.x, lens.y);
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
      }
    }
    for (const l of env.extra || []) {
      const p = S(l.x, l.y);
      const r = l.r * cam.z * (1 + Math.sin(t / 80 + l.x) * 0.05);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
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
    drawFlash(S, cam);
    return darkness;
  }
  /** A cool white glow around each lightning strike (local, never the whole screen). */
  function drawFlash(S, cam) {
    if (!flashes.length) return;
    ctx.globalCompositeOperation = 'source-over';
    for (const f of flashes) {
      const p = S(f.x, f.y), r = f.r * 0.8 * cam.z;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(235,240,255,${f.v * 0.5})`); g.addColorStop(1, 'rgba(235,240,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /**
   * Directional shadows: every item casts a drop-shadow away from the dominant light.
   * els: Map(id -> element)
   */
  function shadows(items, els, sunInfo = null) {
    const sun = sunInfo && sunInfo.alt > 0.02 ? sunInfo : null;
    const lamps = items.filter((i) => i.type === 'lamp' || i.type === 'torch' || (i.type === 'fire' && i.d?.lit !== false));
    for (const it of items) {
      const el = els.get(it.id);
      if (!el) continue;
      if (it.type === 'water' || it.type === 'cloud') { setShadow(el, it.type === 'cloud' ? 'drop-shadow(0 30px 24px rgba(0,0,0,.12))' : 'none'); continue; }
      if (it.type === 'sun') { setShadow(el, 'drop-shadow(0 0 40px rgba(255,200,40,.9))'); continue; }
      if (it.type === 'lamp') { setShadow(el, darkness > 0.3 ? 'drop-shadow(0 0 24px rgba(255,220,150,.9))' : 'drop-shadow(0 6px 6px rgba(0,0,0,.2))'); continue; }
      let lx, ly, strength;
      if (sun) {
        // shadows point away from the sun item; a low sun casts longer shadows
        lx = sun.x; ly = sun.y; strength = Math.min(1.8, 0.7 + Math.min(4, 1 / Math.tan(Math.max(0.08, sun.alt))) * 0.25);
      } else {
        let best = null, bd = Infinity;
        for (const l of lamps) { const d = Math.hypot(l.x - it.x, l.y - it.y); if (d < bd) { bd = d; best = l; } }
        if (!best || bd > 1800) { setShadow(el, 'none'); continue; }
        lx = best.x; ly = best.y; strength = Math.max(0.25, 1 - bd / 1800);
      }
      const dx = it.x - lx, dy = it.y - ly;
      const d = Math.hypot(dx, dy) || 1;
      const lift = it.pin === 'pin' ? 22 : it.pin === 'lock' ? 12 : 7;
      const len = lift * strength * (sun ? 1.1 : 1.4) * Math.min(1.6, 0.6 + d / 1200);
      // shadow offset must be expressed in the item's rotated space
      const ox = (dx / d) * len, oy = (dy / d) * len;
      const c = Math.cos(-it.a), s = Math.sin(-it.a);
      const rx = (ox * c - oy * s) / it.s, ry = (ox * s + oy * c) / it.s;
      const blur = (6 + len * 0.7) / it.s;
      const alpha = sun ? 0.3 * (1 - (sunInfo.cover || 0) * 0.8) : 0.55 * strength * Math.min(1, darkness * 1.5);
      setShadow(el, `drop-shadow(${rx.toFixed(1)}px ${ry.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,${alpha.toFixed(2)}))`);
    }
  }
  function setShadow(el, v) {
    if (el._sh === v) return;
    el._sh = v;
    el.style.filter = v;
  }

  return {
    draw, shadows, resize,
    /** Local lightning flash at world (x, y). */
    strike(x, y, v = 1, r = 900) { flashes.push({ x, y, v, r }); if (flashes.length > 12) flashes.shift(); },
    setAnchor(fn) { anchorOf = fn; },
    get flashing() { return flashes.length > 0; },
    get darkness() { return darkness; },
  };
}
