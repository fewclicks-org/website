// Air: a wind field with a base wind (set by the visitor or "Auto" by season + weather) plus gusts
// from smooth noise, and local wind from fans. Wind bends rain, drifts snow and clouds, sways grass
// and trees, flutters light paper, flies kites and turns windmills.

const noise1 = (x) => {
  // smooth 1D value noise in -1..1
  const i = Math.floor(x), f = x - i;
  const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
};

const SEASON_WIND = [1.2, 0.6, 1.9, 1.5]; // spring, summer, autumn, winter (typical strength)

export function createAtmos() {
  const st = { mode: 'auto', manual: 0, wind: 0, gust: 0, worldT: 0, storm: 0 };
  let t = 0;

  /** dt = real ms, c = clock info, worldMin = world minutes advanced, weather = { storm } */
  function tick(dt, c, worldMin = 0, weather = {}) {
    t += dt / 1000;
    st.worldT += worldMin;
    let base;
    if (st.mode === 'auto') {
      const k = SEASON_WIND[c.seasonIdx] ?? 1;
      // slow changes over world hours + direction flips over days
      base = k * (noise1(st.worldT / 180 + 3.1) * 1.4 + noise1(st.worldT / 2000) * 0.8) + (weather.storm || 0) * 2.6 * Math.sign(noise1(st.worldT / 600) || 1);
      // calmer nights
      if (!c.isDay) base *= 0.6;
    } else base = st.manual;
    st.gust = noise1(t * 0.35) * 0.55 + noise1(t * 1.3 + 7) * 0.25;
    st.wind = base + st.gust * Math.max(0.25, Math.abs(base) * 0.6);
  }
  /** Wind at a point (global only; fans are applied by the elements). */
  const at = () => st.wind;

  function label() {
    const kmh = Math.round(Math.abs(st.wind) * 12);
    const b = kmh < 2 ? 'Calm' : kmh < 12 ? 'Light breeze' : kmh < 20 ? 'Gentle breeze' : kmh < 29 ? 'Moderate breeze' : kmh < 39 ? 'Fresh breeze' : kmh < 50 ? 'Strong wind' : kmh < 62 ? 'Near gale' : 'Gale';
    return { kmh, name: b, arrow: kmh < 2 ? '·' : st.wind > 0 ? '→' : '←' };
  }

  return {
    tick, at, label,
    get wind() { return st.wind; },
    get mode() { return st.mode; },
    setMode(m, v = 0) { st.mode = m; st.manual = v; },
    get manual() { return st.manual; },
    serialize: () => ({ mode: st.mode, manual: st.manual, t: Math.round(st.worldT) }),
    load(d) { if (!d) return; st.mode = d.mode || 'auto'; st.manual = d.manual || 0; st.worldT = d.t || 0; },
  };
}
