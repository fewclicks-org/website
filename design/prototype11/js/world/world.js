// World orchestrator: ground rendering + the light environment, and the simulation clock that drives
// water, plants and fire. There is no day/night clock: light comes from the draggable sun item
// (higher = brighter, no sun = night) and the season is a simple setting.

import { createClock, darknessFrom, warmthFrom } from './clock.js';

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SEASON_TEMP = [13, 25, 12, -3];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createWorld({ skyCanvas, backCanvas, camera, terrain }) {
  const bctx = backCanvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = backCanvas.clientWidth; H = backCanvas.clientHeight; backCanvas.width = Math.round(W * dpr); backCanvas.height = Math.round(H * dpr); };
  addEventListener('resize', resize);
  resize();
  if (skyCanvas) skyCanvas.style.display = 'none'; // plain whiteboard background

  let sim = createClock({ mode: 'sim' }); // only measures simulated minutes (growth, soaking, drying)
  let speed = 1; // 0 = paused
  let season = 1;
  let sunOf = () => null; // provided by the app: the sun item (or null)
  const systems = [];
  const weather = { cover: 0, storm: 0, fog: 0, wind: 0, snow: 0 };
  let time = 0;

  /** "Clock info" derived from the sun item + the season setting (same shape the systems expect). */
  function info() {
    const sun = sunOf();
    const h = sun ? clamp(sun.y / terrain.groundY, 0, 1.05) : null;
    const altDeg = sun ? 72 * (1 - h) - 6 : -30;
    const v = camera.viewRect();
    const sunX = sun ? clamp((sun.x - (v.x + v.w / 2)) / (v.w / 2), -1.3, 1.3) : 0;
    const temp = SEASON_TEMP[season] + (sun ? (1 - h) * 4 - 1 : -5);
    return {
      mode: 'sun', minutes: 0, day: 0, yearFrac: 0,
      season: SEASONS[season], seasonIdx: season, seasonProgress: 0.5,
      sunAlt: (altDeg * Math.PI) / 180, sunAltDeg: altDeg, noonAlt: 1.2, sunX, sunWX: sun ? sun.x : null, H: 0, H0: 1,
      moonAlt: -1, moonX: 0, phase: 0, illum: 0,
      temp, isDay: altDeg > -0.8, label: '',
      sun,
    };
  }
  const clock = {
    get: info,
    get state() { return { ...sim.state, season, speed }; },
    setSeason(i) { season = ((i % 4) + 4) % 4; },
    get season() { return season; },
    setSpeed(v) { speed = v; },
    get speed() { return speed; },
  };

  function load(state) {
    sim = createClock({ mode: 'sim', t: state?.t, speed: 1 });
    season = Number.isInteger(state?.season) ? state.season : 1;
    speed = Number.isFinite(state?.speed) ? state.speed : 1;
  }

  /** Advance the simulation + systems. dt = real ms. */
  function tick(dt) {
    time += dt / 1000;
    const worldMin = speed ? sim.tick(dt * speed) : 0;
    const c = info();
    for (const s of systems) s.tick?.(dt, worldMin, c);
    return c;
  }

  function env() {
    const c = info();
    const dark = c.sun ? Math.min(0.78, darknessFrom(c)) : 0.76;
    const sun = c.sun;
    return {
      c,
      fog: weather.fog || 0,
      heat: weather.heat || 0,
      extra: weather.lights || [],
      dark,
      warm: c.sun ? warmthFrom(c) : 0,
      sun: sun ? { x: sun.x, y: sun.y, alt: c.sunAlt, cover: 0 } : null,
    };
  }

  function draw(cam) {
    const c = info();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, backCanvas.width, backCanvas.height);
    bctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * cam.z * dpr, -cam.y * cam.z * dpr);
    const view = camera.viewRect();
    for (const s of systems) s.drawBehind?.(bctx, view, cam, c, time);
    terrain.draw(bctx, view, { t: time, season: c.seasonIdx, wind: weather.wind, snow: weather.snow, frost: weather.frost, z: cam.z, trample: null });
    for (const s of systems) s.drawBack?.(bctx, view, cam, c, time);
  }

  return {
    systems, weather, load, tick, env, draw, resize, clock,
    setSun(fn) { sunOf = fn; },
    sky: { sun: null },
    get time() { return time; },
  };
}
