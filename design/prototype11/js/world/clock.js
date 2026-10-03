// World clock: real time (visitor's own clock + date) or a fast "Simulate" mode.
// Gives the time of day, day count, season, sun + moon positions (real astronomy, simplified),
// moon phase and air temperature. Pure math, no DOM.

const DEG = Math.PI / 180;
export const SIM_YEAR_DAYS = 28; // a simulated year: 4 seasons x 7 days
export const SPEEDS = [1, 10, 60, 600]; // world minutes per real second = 2 * speed
const SPRING_EQUINOX = 79 / 365; // ~20 March as a fraction of the year
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function createClock(state = {}) {
  const s = {
    mode: state.mode === 'sim' ? 'sim' : 'real',
    t: Number.isFinite(state.t) ? state.t : 8 * 60, // simulated world minutes since day 0 (spring)
    speed: SPEEDS.includes(state.speed) ? state.speed : 1,
    paused: !!state.paused,
    lat: Number.isFinite(state.lat) ? state.lat : 45,
  };
  let info = null;

  function realParts() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const doy = (d - start) / 86400000; // fractional day of year
    return { minutes: d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60, yearFrac: (doy / 365) % 1, day: Math.floor(doy), date: d };
  }
  function simParts() {
    const day = Math.floor(s.t / 1440);
    const minutes = s.t - day * 1440;
    const yearFrac = (SPRING_EQUINOX + ((day % SIM_YEAR_DAYS) + minutes / 1440) / SIM_YEAR_DAYS) % 1;
    return { minutes, yearFrac, day, date: null };
  }

  /** Advance the simulated clock by dt real ms. Returns world minutes advanced. */
  function tick(dtMs) {
    if (s.mode !== 'sim' || s.paused) { info = null; return 0; }
    const adv = (dtMs / 1000) * 2 * s.speed;
    s.t += adv;
    info = null;
    return adv;
  }

  function compute() {
    const p = s.mode === 'sim' ? simParts() : realParts();
    const { minutes, yearFrac } = p;
    // season: spring starts at the equinox
    const sf = ((yearFrac - SPRING_EQUINOX + 1) % 1) * 4;
    const seasonIdx = Math.floor(sf) % 4;
    const seasonProgress = sf - Math.floor(sf);
    // sun: declination + hour angle -> altitude
    const decl = 23.44 * DEG * Math.sin(2 * Math.PI * (yearFrac - SPRING_EQUINOX));
    const lat = s.lat * DEG;
    const H = (minutes / 1440 - 0.5) * 2 * Math.PI; // 0 at solar noon
    const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
    const sunAlt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    // half day length (hour angle at sunrise)
    const cosH0 = -Math.tan(lat) * Math.tan(decl);
    const H0 = Math.acos(Math.max(-1, Math.min(1, cosH0)));
    const noonAlt = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl));
    // sky position: -1 (east, sunrise) .. +1 (west, sunset); extends past ±1 at night
    const sunX = H / H0;
    // moon: phase (0 new .. 0.5 full .. 1)
    const cycle = s.mode === 'sim' ? 8 : 29.530588;
    const daysSince = s.mode === 'sim' ? s.t / 1440 : (p.date - new Date(Date.UTC(2000, 0, 6, 18, 14))) / 86400000;
    const phase = (((daysSince / cycle) % 1) + 1) % 1;
    // the moon trails the sun by phase * 24h
    const Hm = H - phase * 2 * Math.PI;
    const Hmn = Math.atan2(Math.sin(Hm), Math.cos(Hm));
    const moonAlt = Math.asin(Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(-decl * 0.5) + Math.cos(lat) * Math.cos(decl) * Math.cos(Hmn))));
    const moonX = Hmn / (Math.PI / 2);
    const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
    // temperature: seasonal base + daily swing (warmest ~15:00)
    const seasonalBase = 11 - 13 * Math.cos(2 * Math.PI * (yearFrac - 0.05)) * (s.lat / 45);
    const daily = 5.5 * Math.cos(((minutes - 15 * 60) / 1440) * 2 * Math.PI);
    const temp = seasonalBase + daily;
    return {
      mode: s.mode, minutes, day: p.day, yearFrac,
      season: SEASONS[seasonIdx], seasonIdx, seasonProgress,
      sunAlt, sunAltDeg: sunAlt / DEG, noonAlt, sunX, H, H0,
      moonAlt, moonX, phase, illum,
      temp,
      isDay: sunAlt > -0.8 * DEG,
      label: fmt(minutes),
    };
  }

  function get() { return info || (info = compute()); }

  return {
    get,
    tick,
    get state() { return { ...s }; },
    setMode(m) { if (m === 'sim' && s.mode !== 'sim') { const r = realParts(); const dayInYear = Math.floor((((r.yearFrac - SPRING_EQUINOX + 1) % 1) * SIM_YEAR_DAYS)); s.t = dayInYear * 1440 + r.minutes; } s.mode = m; info = null; },
    setSpeed(v) { s.speed = v; info = null; },
    setPaused(v) { s.paused = v; info = null; },
    /** Set the time of day (minutes 0..1440) in sim mode, keeping the day. */
    setTimeOfDay(min) { if (s.mode !== 'sim') this.setMode('sim'); const day = Math.floor(s.t / 1440); s.t = day * 1440 + ((min % 1440) + 1440) % 1440; info = null; },
    /** Jump to a season (0 spring .. 3 winter), keeping the time of day. */
    setSeason(idx) { if (s.mode !== 'sim') this.setMode('sim'); const mins = s.t % 1440; const year = Math.floor(s.t / 1440 / SIM_YEAR_DAYS); s.t = (year * SIM_YEAR_DAYS + idx * 7 + 2) * 1440 + mins; info = null; },
    addMinutes(m) { if (s.mode !== 'sim') this.setMode('sim'); s.t += m; info = null; },
  };
}

export function fmt(minutes) {
  const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Ambient darkness 0..0.9 from sun altitude (+ moonlight). */
export function darknessFrom(c) {
  const a = c.sunAltDeg;
  let d;
  const MAX = 0.76; // night, but the board stays readable
  if (a >= 8) d = 0;
  else if (a <= -12) d = MAX;
  else d = MAX * (1 - (a + 12) / 20) ** 1.3;
  if (a < -4 && c.moonAlt > 0) d -= 0.14 * c.illum * Math.min(1, c.moonAlt / 0.3);
  return Math.max(0, d);
}

/** Warmth of the light (0 = white noon, 1 = deep sunset orange). */
export function warmthFrom(c) {
  const a = c.sunAltDeg;
  if (a > 20 || a < -8) return 0;
  return a > 6 ? (20 - a) / 14 * 0.5 : Math.max(0, 1 - Math.abs(a - 1) / 9);
}
