// Auto weather: a season-driven state machine (clear → cloudy → rain / storm / snow / fog / hail …),
// drifting world-space clouds that rain or snow on whatever is under them, storms with lightning,
// fog, rainbows after rain, frost and a small forecast. Clouds placed by hand still work as before.

export const STATES = {
  clear: { icon: '☀️', label: 'Clear', cover: 0.04, precip: 0 },
  fair: { icon: '🌤', label: 'Fair', cover: 0.25, precip: 0 },
  cloudy: { icon: '⛅', label: 'Cloudy', cover: 0.55, precip: 0 },
  overcast: { icon: '☁️', label: 'Overcast', cover: 0.85, precip: 0 },
  drizzle: { icon: '🌦', label: 'Drizzle', cover: 0.8, precip: 0.3 },
  rain: { icon: '🌧', label: 'Rain', cover: 0.9, precip: 0.75 },
  storm: { icon: '⛈', label: 'Thunderstorm', cover: 0.96, precip: 1, storm: 1 },
  hail: { icon: '🌨', label: 'Hail', cover: 0.92, precip: 0.7, hail: 1, storm: 0.5 },
  snow: { icon: '❄️', label: 'Snow', cover: 0.88, precip: 0.6, snowy: true },
  blizzard: { icon: '🌬', label: 'Blizzard', cover: 0.97, precip: 1, snowy: true, windy: 2.5 },
  fog: { icon: '🌫', label: 'Fog', cover: 0.45, precip: 0, fog: 0.75 },
  heat: { icon: '🥵', label: 'Heatwave', cover: 0, precip: 0, heat: 1 },
};
// transition weights by season: [spring, summer, autumn, winter]
const TABLE = {
  clear: [{ fair: 3, cloudy: 2, fog: 1 }, { fair: 3, clear: 2, heat: 1, cloudy: 1 }, { fair: 2, cloudy: 2, fog: 2 }, { fair: 2, cloudy: 2, fog: 1 }],
  fair: [{ clear: 2, cloudy: 3, drizzle: 1 }, { clear: 3, cloudy: 2, storm: 1 }, { cloudy: 3, clear: 1, fog: 1 }, { cloudy: 3, clear: 1 }],
  cloudy: [{ rain: 3, drizzle: 2, fair: 2 }, { storm: 2, fair: 3, rain: 1, hail: 0.4 }, { rain: 3, overcast: 2, fair: 1 }, { snow: 3, overcast: 2, fair: 1 }],
  overcast: [{ rain: 3, drizzle: 2, cloudy: 1 }, { rain: 2, cloudy: 2 }, { rain: 3, drizzle: 2, fog: 1 }, { snow: 3, blizzard: 1, cloudy: 1 }],
  drizzle: [{ cloudy: 2, rain: 1, fair: 2 }, { fair: 2, cloudy: 1 }, { overcast: 2, rain: 1, cloudy: 1 }, { cloudy: 2, snow: 1 }],
  rain: [{ fair: 2, cloudy: 2, storm: 0.5 }, { fair: 3, storm: 1 }, { overcast: 2, cloudy: 2, fog: 1 }, { cloudy: 2, snow: 1 }],
  storm: [{ rain: 2, cloudy: 2 }, { fair: 2, rain: 2 }, { rain: 2, cloudy: 1 }, { snow: 1, cloudy: 1 }],
  hail: [{ rain: 2, cloudy: 1 }, { rain: 1, fair: 2 }, { rain: 1 }, { snow: 1 }],
  snow: [{ cloudy: 2, rain: 1 }, { fair: 1 }, { cloudy: 2, rain: 1 }, { cloudy: 2, snow: 1, blizzard: 0.5, fair: 1 }],
  blizzard: [{ snow: 1 }, { cloudy: 1 }, { snow: 1 }, { snow: 2, cloudy: 1 }],
  fog: [{ fair: 2, cloudy: 1 }, { clear: 2, fair: 1 }, { cloudy: 2, fair: 1 }, { cloudy: 1, fair: 1 }],
  heat: [{ fair: 1 }, { clear: 2, storm: 1, fair: 1 }, { fair: 1 }, { fair: 1 }],
};
const pick = (w) => { const tot = Object.values(w).reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (const [k, v] of Object.entries(w)) { if ((r -= v) <= 0) return k; } return Object.keys(w)[0]; };
const hash = (i) => { const s = Math.sin(i * 77.7 + 3.3) * 43758.5453; return s - Math.floor(s); };

export function createWeather({ terrain, camera, spawn, strikeAt }) {
  const st = { mode: 'auto', state: 'fair', left: 240, queue: [], rainbow: 0, wasWet: false };
  let clouds = [];
  let seq = 1;
  let flashT = 0;
  const G = terrain.groundY;

  function fillQueue(season) {
    while (st.queue.length < 3) {
      const last = st.queue.length ? st.queue[st.queue.length - 1].state : st.state;
      const next = pick(TABLE[last]?.[season] || { fair: 1 });
      st.queue.push({ state: next, dur: 120 + Math.random() * 360 });
    }
  }
  function setState(s, dur = 240) { st.state = s; st.left = dur; }

  /** Returns the weather outputs used by the sky, lights, plants and fire. */
  function tick(dt, worldMin, c, out) {
    const season = c.seasonIdx;
    st.season = season;
    if (st.mode === 'auto') {
      fillQueue(season);
      st.left -= worldMin;
      if (st.left <= 0) { const n = st.queue.shift(); setState(n.state, n.dur); fillQueue(season); }
    }
    let s = STATES[st.state] || STATES.fair;
    // precipitation type follows the temperature
    let snowy = s.snowy || false;
    if (s.precip && c.temp < 1.2) snowy = true;
    if (s.snowy && c.temp > 3) snowy = false;
    const wet = s.precip > 0 && !snowy;
    if (st.wasWet && !wet && c.isDay && c.sunAltDeg > 3 && c.sunAltDeg < 45) st.rainbow = 1;
    st.wasWet = wet;
    st.rainbow = Math.max(0, st.rainbow - worldMin / 50);
    const k = Math.min(1, dt / 2000);
    const ease = (key, v) => { out[key] = (out[key] ?? 0) + (v - (out[key] ?? 0)) * k; };
    ease('cover', s.cover);
    ease('storm', s.storm || 0);
    ease('fog', (s.fog || 0) + (c.sunAltDeg > -2 && c.sunAltDeg < 6 && season === 2 ? 0.2 : 0));
    out.rain = wet ? s.precip : 0;
    out.snowing = snowy ? s.precip : 0;
    out.hail = s.hail || 0;
    out.heat = s.heat || 0;
    out.windy = s.windy || 0;
    out.rainbow = st.rainbow;
    out.state = st.state;
    out.frost = c.temp < 1 && c.sunAltDeg < 15 ? Math.min(1, (1 - c.temp) / 4) : 0;
    return out;
  }

  /** Per frame: move clouds, keep a cloud deck over the view, rain/snow from them, lightning. */
  function update(dt, wind, out, now) {
    const t60 = Math.min(3, dt / 16.667);
    const v = camera.viewRect();
    const cover = out.cover || 0;
    const want = Math.round(cover * Math.min(40, v.w / 520));
    const top = Math.min(G - 2600, v.y + 120), bottom = G - 1700;
    for (const cl of clouds) cl.x += (wind * 0.5 + 0.08) * t60;
    // drop clouds far away, add at the upwind edge (or anywhere at first)
    clouds = clouds.filter((cl) => cl.x > v.x - v.w * 1.2 && cl.x < v.x + v.w * 2.2);
    let guard = 0;
    while (clouds.length < want && guard++ < 50) {
      const fresh = clouds.length < want * 0.6 && Math.random() < 0.6;
      const x = fresh ? v.x + Math.random() * v.w : wind >= 0 ? v.x - 300 - Math.random() * 400 : v.x + v.w + 300 + Math.random() * 400;
      clouds.push({ id: seq++, x, y: top + Math.random() * Math.max(200, bottom - top), w: 320 + Math.random() * 520, seed: Math.random(), born: now });
    }
    if (clouds.length > want + 2) clouds.splice(0, 1);
    // precipitation from clouds over the view
    const rain = out.rain || 0, snow = out.snowing || 0, hail = out.hail || 0;
    if (rain || snow || hail) {
      for (const cl of clouds) {
        if (cl.x + cl.w / 2 < v.x - 200 || cl.x - cl.w / 2 > v.x + v.w + 200) continue;
        const n = (rain * 2.4 + snow * 1.4 + hail * 1) * (cl.w / 320) * t60;
        for (let i = 0; i < n || Math.random() < n - i; i++) {
          const x = cl.x + (Math.random() - 0.5) * cl.w * 0.8, y = cl.y + 30;
          if (snow) spawn({ k: 'snow', x, y, vx: wind * 0.5, vy: 1.4 + Math.random(), life: 1600, ph: Math.random() * 6 });
          else if (hail && Math.random() < 0.4) spawn({ k: 'hail', x, y, vx: wind * 2, vy: 14, life: 400 });
          else spawn({ k: 'rain', x, y, vx: wind * 3, vy: 10 + Math.random() * 3, life: 700 });
        }
      }
    }
    // lightning
    if ((out.storm || 0) > 0.5 && clouds.length && now > flashT) {
      flashT = now + 4000 + Math.random() * 9000;
      const vis = clouds.filter((cl) => cl.x > v.x && cl.x < v.x + v.w);
      const cl = vis[Math.floor(Math.random() * vis.length)];
      if (cl) strikeAt(cl.x + (Math.random() - 0.5) * cl.w * 0.4, cl.y + 40);
    }
  }

  /** Clouds in world space (behind items). light = 0..1 daylight, warm = sunset tint, storm = darkness. */
  function draw(ctx, view, c, out) {
    if (!clouds.length) return;
    const day = Math.max(0.15, Math.min(1, (c.sunAltDeg + 8) / 20));
    const storm = Math.max(out.storm || 0, (out.rain || 0) * 0.5, (out.snowing || 0) * 0.3);
    const warm = c.sunAltDeg > -4 && c.sunAltDeg < 10 ? 1 - Math.abs(c.sunAltDeg - 3) / 7 : 0;
    const base = [255 - storm * 140, 255 - storm * 135, 255 - storm * 120].map((v) => v * day);
    const tint = (k) => `rgb(${Math.round(base[0] * k + warm * 40)},${Math.round(base[1] * k + warm * 5)},${Math.round(base[2] * k - warm * 10)})`;
    for (const cl of clouds) {
      if (cl.x + cl.w < view.x || cl.x - cl.w > view.x + view.w) continue;
      const n = 6;
      // under-shadow
      ctx.fillStyle = tint(0.82);
      for (let i = 0; i < n; i++) { const fx = cl.x + (i / (n - 1) - 0.5) * cl.w * 0.8; ctx.beginPath(); ctx.ellipse(fx, cl.y + 18, cl.w * 0.16, cl.w * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = tint(1);
      for (let i = 0; i < n; i++) {
        const fx = cl.x + (i / (n - 1) - 0.5) * cl.w * 0.8, r = cl.w * (0.12 + hash(cl.seed * 100 + i) * 0.1);
        ctx.beginPath(); ctx.arc(fx, cl.y - Math.sin((i / (n - 1)) * Math.PI) * cl.w * 0.08, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  return {
    tick, update, draw,
    get state() { return st.state; },
    get mode() { return st.mode; },
    get clouds() { return clouds; },
    forecast: () => { if (st.mode === 'auto') fillQueue(st.season ?? 0); return [st.state, ...st.queue.map((q) => q.state)].slice(0, 3).concat([st.state, st.state]).slice(0, 3); },
    setMode(m, state) { st.mode = m; if (state) setState(state, 600); if (m === 'auto') st.queue = []; },
    force(state, dur = 240) { setState(state, dur); st.queue = []; },
    serialize: () => ({ mode: st.mode, state: st.state, left: Math.round(st.left) }),
    load(d) { if (!d) return; st.mode = d.mode || 'auto'; st.state = d.state || 'fair'; st.left = d.left || 240; st.queue = []; },
  };
}
