// Tiny synthesized sound effects (no audio files). Sound is OFF by default;
// the visitor turns it on with a toggle and the choice is remembered.

const KEY = 'fewclicks:sound';
let ctx = null;
let master = null;
let on = false;
try { on = localStorage.getItem(KEY) === 'on'; } catch { /* storage blocked */ }

const listeners = new Set();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, type = 'sine', dur = 0.15, vol = 0.5, delay = 0, attack = 0.005 }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.3, filter = 1200, delay = 0 }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

let lastHover = 0;
const play = (fn) => (...args) => { if (on) fn(...args); };

export const sfx = {
  pop: play((pitch = 1) => { tone({ freq: 900 * pitch, to: 180 * pitch, type: 'sine', dur: 0.12, vol: 0.6 }); noise({ dur: 0.05, vol: 0.15, filter: 3000 }); }),
  bigPop: play(() => { tone({ freq: 500, to: 60, type: 'sine', dur: 0.35, vol: 0.8 }); noise({ dur: 0.25, vol: 0.4, filter: 1500 }); tone({ freq: 1200, to: 2400, type: 'triangle', dur: 0.2, vol: 0.2, delay: 0.05 }); }),
  blip: play(() => { const now = performance.now(); if (now - lastHover < 60) return; lastHover = now; tone({ freq: 660, to: 880, type: 'triangle', dur: 0.06, vol: 0.18 }); }),
  click: play(() => tone({ freq: 520, to: 260, type: 'square', dur: 0.07, vol: 0.15 })),
  boing: play(() => tone({ freq: 150, to: 600, type: 'sine', dur: 0.25, vol: 0.5 })),
  whoosh: play(() => noise({ dur: 0.35, vol: 0.25, filter: 800 })),
  coin: play(() => { tone({ freq: 988, type: 'square', dur: 0.08, vol: 0.2 }); tone({ freq: 1319, type: 'square', dur: 0.3, vol: 0.2, delay: 0.08 }); }),
  success: play(() => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.3, delay: i * 0.08 }))),
  error: play(() => { tone({ freq: 300, to: 200, type: 'sawtooth', dur: 0.15, vol: 0.15 }); tone({ freq: 200, to: 120, type: 'sawtooth', dur: 0.2, vol: 0.15, delay: 0.15 }); }),
  tick: play(() => tone({ freq: 1800, type: 'square', dur: 0.02, vol: 0.08 })),
};

export const soundOn = () => on;

export function setSound(value) {
  on = !!value;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (on) { audio(); sfx.success(); }
  listeners.forEach((fn) => fn(on));
}

export const toggleSound = () => setSound(!on);
export const onSoundChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/**
 * Wire a button as the sound toggle. It gets aria-pressed and a data-sound="on|off" attribute for styling.
 * Optional labels: { on: '🔊', off: '🔇' } are written to an element with [data-sound-icon] inside the button.
 */
export function mountSoundToggle(button, labels = { on: '🔊', off: '🔇' }) {
  if (!button) return;
  const icon = button.querySelector('[data-sound-icon]') || button;
  const render = () => {
    button.setAttribute('aria-pressed', String(on));
    button.dataset.sound = on ? 'on' : 'off';
    button.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    button.title = on ? 'Sound on' : 'Sound off';
    icon.textContent = on ? labels.on : labels.off;
  };
  button.addEventListener('click', () => toggleSound());
  onSoundChange(render);
  render();
}
