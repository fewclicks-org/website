// The sky, drawn in screen space behind everything: a gradient that follows the sun's altitude,
// the sun on its real arc (east → west), the moon with phases, twinkling stars + Milky Way,
// soft distant clouds and two layers of far hills with parallax.

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

// [altitude deg, top colour, horizon colour]
const STOPS = [
  [-18, [6, 9, 24], [14, 20, 44]],
  [-10, [12, 20, 52], [44, 44, 92]],
  [-4, [32, 44, 98], [214, 112, 92]],
  [1, [64, 92, 160], [255, 150, 84]],
  [6, [92, 146, 214], [255, 196, 140]],
  [16, [86, 160, 232], [190, 226, 255]],
  [40, [70, 150, 236], [176, 220, 255]],
];
function skyColors(alt) {
  if (alt <= STOPS[0][0]) return [STOPS[0][1], STOPS[0][2]];
  for (let i = 1; i < STOPS.length; i++) {
    if (alt <= STOPS[i][0]) {
      const [a0, t0, h0] = STOPS[i - 1], [a1, t1, h1] = STOPS[i];
      const t = (alt - a0) / (a1 - a0);
      return [mix(t0, t1, t), mix(h0, h1, t)];
    }
  }
  return [STOPS[STOPS.length - 1][1], STOPS[STOPS.length - 1][2]];
}

export function createSky(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); };
  addEventListener('resize', resize);
  resize();
  const stars = Array.from({ length: 260 }, (_, i) => ({ x: hash(i), y: hash(i + 500) ** 1.4, r: 0.5 + hash(i + 900) * 1.4, tw: hash(i + 1300) * 6 }));
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: hash(i + 40), y: 0.06 + hash(i + 70) * 0.22, s: 0.35 + hash(i + 90) * 0.45, v: 0.004 + hash(i + 33) * 0.006 }));
  let sunPos = null;

  /**
   * c = clock info, cam = {x,y,z}, horizon = screen y of the base ground line,
   * weather = { cover 0..1, storm 0..1, fog 0..1 }, t = seconds
   */
  function draw(c, cam, horizon, weather = {}, t = 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const alt = c.sunAltDeg;
    const cover = weather.cover || 0;
    let [top, hor] = skyColors(alt);
    // overcast / storm desaturate and darken
    const grey = mix(top, [120, 128, 140], 0.7);
    top = mix(top, grey, cover * 0.8); hor = mix(hor, mix(hor, [150, 156, 166], 0.75), cover * 0.8);
    if (weather.storm) { top = mix(top, [40, 44, 56], weather.storm * 0.7); hor = mix(hor, [80, 84, 96], weather.storm * 0.6); }
    const hy = clamp(horizon, H * 0.2, H * 1.8);
    const g = ctx.createLinearGradient(0, Math.min(0, hy - H * 1.2), 0, hy);
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(hor));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // stars + milky way
    const night = clamp((-alt - 4) / 10, 0, 1) * (1 - cover);
    if (night > 0) {
      const ox = (cam.x * cam.z * 0.02) % W;
      ctx.save();
      ctx.globalAlpha = night * 0.28;
      const mw = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, H);
      mw.addColorStop(0, 'rgba(255,255,255,0)'); mw.addColorStop(0.5, 'rgba(200,210,255,.6)'); mw.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = mw;
      ctx.translate(W / 2, H * 0.3); ctx.rotate(-0.5); ctx.fillRect(-W, -40, W * 2, 80);
      ctx.restore();
      for (const s of stars) {
        const y = s.y * hy * 0.95;
        const tw = 0.6 + 0.4 * Math.sin(t * 2 + s.tw);
        ctx.fillStyle = `rgba(255,255,240,${night * tw})`;
        ctx.beginPath(); ctx.arc(((s.x * W - ox) % W + W) % W, y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // far hills (parallax) behind everything else
    const dayLight = clamp((alt + 8) / 20, 0.12, 1);
    for (const [k, base, amp, col] of [[0.06, 0.16, 70, [140, 170, 190]], [0.14, 0.08, 50, [110, 150, 120]]]) {
      if (hy > H + 200) break;
      const c2 = mix([20, 24, 40], col, dayLight);
      ctx.fillStyle = rgb(mix(c2, hor, 0.35 * (1 - k * 3)));
      ctx.beginPath();
      ctx.moveTo(0, H + 10);
      for (let x = 0; x <= W + 20; x += 20) {
        const wx = x + cam.x * cam.z * k;
        const y = hy - base * Math.min(H, 900) * 0.5 - amp * (Math.sin(wx * 0.004) * 0.6 + Math.sin(wx * 0.011 + 2) * 0.3 + Math.sin(wx * 0.023) * 0.1) - amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H + 10);
      ctx.closePath(); ctx.fill();
    }

    // sun on its arc
    const R = Math.min(W, H);
    const maxA = Math.max(c.noonAlt, 0.4);
    const sx = W * (0.5 + 0.44 * clamp(c.sunX, -1.3, 1.3));
    const sy = hy - (Math.sin(c.sunAlt) / Math.sin(maxA)) * (hy - H * 0.14);
    sunPos = { x: sx, y: sy, r: R * 0.05 };
    if (sy < hy + R * 0.1) {
      const warm = clamp(1 - alt / 14, 0, 1);
      const core = mix([255, 252, 230], [255, 150, 60], warm);
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * (0.35 + warm * 0.25));
      glow.addColorStop(0, rgb(core, 0.55 * (1 - cover * 0.7))); glow.addColorStop(1, rgb(core, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgb(core, 1 - cover * 0.75);
      ctx.beginPath(); ctx.arc(sx, sy, sunPos.r * (1 + warm * 0.25), 0, Math.PI * 2); ctx.fill();
    }

    // moon with phase
    if (c.moonAlt > -0.05) {
      const mx = W * (0.5 + 0.44 * clamp(c.moonX, -1.3, 1.3));
      const my = hy - (Math.sin(c.moonAlt) / Math.sin(maxA)) * (hy - H * 0.14);
      const r = R * 0.032;
      const vis = clamp((-alt + 6) / 12, 0.25, 1) * (1 - cover * 0.8);
      ctx.save();
      ctx.globalAlpha = vis;
      const mg = ctx.createRadialGradient(mx, my, r, mx, my, r * 5);
      mg.addColorStop(0, `rgba(220,230,255,${0.25 * c.illum})`); mg.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - r * 5, my - r * 5, r * 10, r * 10);
      ctx.fillStyle = 'rgba(40,46,70,.5)';
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
      // lit part: a terminator ellipse
      const ph = c.phase, k = Math.cos(ph * 2 * Math.PI);
      ctx.fillStyle = '#f4f1e2';
      ctx.beginPath();
      const right = ph < 0.5;
      ctx.arc(mx, my, r, -Math.PI / 2, Math.PI / 2, !right);
      ctx.ellipse(mx, my, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === right);
      ctx.fill();
      ctx.fillStyle = 'rgba(160,160,150,.35)';
      [[-0.3, -0.2, 0.18], [0.25, 0.3, 0.12], [0.1, -0.4, 0.1]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(mx + dx * r, my + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    // distant clouds (decoration; the weather system adds real clouds on top)
    const cloudCol = mix(mix([255, 255, 255], [255, 170, 140], clamp(1 - Math.abs(alt - 2) / 10, 0, 1) * 0.8), [60, 66, 90], clamp(-alt / 12, 0, 1));
    const n = Math.round(2 + cover * 5);
    for (let i = 0; i < Math.min(n, clouds.length); i++) {
      const cl = clouds[i];
      const x = (((cl.x + t * cl.v * 0.02 + (weather.wind || 0) * t * 0.0004) * (W + 600) - cam.x * cam.z * 0.03) % (W + 600) + W + 600) % (W + 600) - 300;
      const y = cl.y * hy;
      ctx.fillStyle = rgb(cloudCol, 0.42 + cover * 0.4);
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(x + (j - 2) * 46 * cl.s, y - Math.sin(j / 4 * Math.PI) * 24 * cl.s, 60 * cl.s, 34 * cl.s, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // rainbow opposite the sun after rain
    if (weather.rainbow > 0.02 && c.isDay) {
      const cx = W * (0.5 - 0.44 * clamp(c.sunX, -1, 1)), r = Math.min(W, H) * 0.55;
      const cols = ['255,60,60', '255,150,40', '255,230,60', '80,200,90', '70,140,255', '120,80,220'];
      ctx.save(); ctx.globalAlpha = Math.min(0.55, weather.rainbow * 0.6); ctx.lineWidth = r * 0.03;
      cols.forEach((col, i) => { ctx.strokeStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(cx, hy + r * 0.15, r - i * r * 0.03, Math.PI, 0); ctx.stroke(); });
      ctx.restore();
    }
    if (weather.fog) { ctx.fillStyle = `rgba(220,224,230,${weather.fog * 0.6})`; ctx.fillRect(0, 0, W, H); }
  }

  return { draw, resize, get sun() { return sunPos; } };
}
