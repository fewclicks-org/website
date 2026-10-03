// World orchestrator: owns the clock, sky and ground rendering, and exposes the light environment
// (darkness, warmth, sun direction) for the lights + shadows. Later systems (water, wind, weather,
// plants, animals, events) plug in through `systems`.

import { createClock, darknessFrom, warmthFrom } from './clock.js';
import { createSky } from './sky.js';

export function createWorld({ skyCanvas, backCanvas, camera, terrain }) {
  const sky = createSky(skyCanvas);
  const bctx = backCanvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = backCanvas.clientWidth; H = backCanvas.clientHeight; backCanvas.width = Math.round(W * dpr); backCanvas.height = Math.round(H * dpr); };
  addEventListener('resize', resize);
  resize();

  let clock = createClock();
  const systems = [];
  const weather = { cover: 0, storm: 0, fog: 0, wind: 0, snow: 0 };
  let time = 0; // seconds of animation time

  function load(state) { clock = createClock(state || {}); }

  /** Advance world time + systems. dt = real ms. */
  function tick(dt) {
    time += dt / 1000;
    const worldMin = clock.tick(dt);
    const c = clock.get();
    for (const s of systems) s.tick?.(dt, worldMin, c);
    return c;
  }

  function env() {
    const c = clock.get();
    const dark = Math.min(0.92, darknessFrom(c) + weather.cover * 0.12 * (c.isDay ? 1 : 0.3) + weather.storm * 0.25);
    return {
      c,
      dark,
      warm: warmthFrom(c) * (1 - weather.cover * 0.7),
      sun: { alt: c.sunAlt, dirX: -Math.max(-1, Math.min(1, c.sunX)), cover: weather.cover },
    };
  }

  function draw(cam) {
    const c = clock.get();
    const horizon = (terrain.groundY - cam.y) * cam.z;
    sky.draw(c, cam, horizon, weather, time);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, backCanvas.width, backCanvas.height);
    bctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * cam.z * dpr, -cam.y * cam.z * dpr);
    const view = camera.viewRect();
    for (const s of systems) s.drawBehind?.(bctx, view, cam, c, time);
    terrain.draw(bctx, view, { t: time, season: c.seasonIdx, wind: weather.wind, snow: weather.snow, z: cam.z, trample: null });
    for (const s of systems) s.drawBack?.(bctx, view, cam, c, time);
  }

  return {
    sky, systems, weather, load, tick, env, draw, resize,
    get clock() { return clock; },
    get time() { return time; },
  };
}
