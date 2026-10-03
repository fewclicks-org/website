// Console-style spatial navigation: arrow keys / WASD / gamepad move focus between [data-nav] elements.
// Gamepad: D-pad or left stick = move, A = select, B = back, LB/RB = previous/next tab.

const dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function visible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden], dialog:not([open])');
}

export function move(dir) {
  const all = [...document.querySelectorAll('[data-nav]')].filter(visible);
  const scope = document.querySelector('dialog[open]');
  const pool = scope ? all.filter((e) => scope.contains(e)) : all;
  const cur = document.activeElement && pool.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { pool[0]?.focus(); return pool[0]; }
  const a = cur.getBoundingClientRect();
  const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  let best = null, bestScore = Infinity;
  for (const el of pool) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    const ok = { left: dx < -4, right: dx > 4, up: dy < -4, down: dy > 4 }[dir];
    if (!ok) continue;
    const primary = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy);
    const cross = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = primary + cross * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return best;
}

/**
 * @param {{onMove?: Function, onBack?: Function, onTab?: (dir:number)=>void, onPad?: (name:string|null)=>void}} hooks
 */
export function initNav(hooks = {}) {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const typing = isTyping(document.activeElement);
    const key = { a: 'ArrowLeft', d: 'ArrowRight', w: 'ArrowUp', s: 'ArrowDown' }[e.key.toLowerCase()];
    const dir = dirs[e.key] || (!typing && key ? dirs[key] : null);
    if (dir && !(typing && (dir === 'left' || dir === 'right'))) {
      e.preventDefault();
      if (move(dir)) hooks.onMove?.(document.activeElement);
    } else if (!typing && (e.key === 'q' || e.key === 'Q' || e.key === '[')) hooks.onTab?.(-1);
    else if (!typing && (e.key === 'e' || e.key === 'E' || e.key === ']')) hooks.onTab?.(1);
    else if (e.key === 'Backspace' && !typing) hooks.onBack?.();
  });

  // Gamepad polling
  let prev = {};
  let repeatAt = 0;
  let connected = null;
  window.addEventListener('gamepadconnected', (e) => { connected = e.gamepad.id; hooks.onPad?.(e.gamepad.id); });
  window.addEventListener('gamepaddisconnected', () => { connected = null; hooks.onPad?.(null); });
  function poll(t) {
    requestAnimationFrame(poll);
    if (!connected || !navigator.getGamepads) return;
    const gp = [...navigator.getGamepads()].find(Boolean);
    if (!gp) return;
    const b = (i) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const state = {
      left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5,
      a: b(0), b: b(1), lb: b(4), rb: b(5),
    };
    for (const d of ['left', 'right', 'up', 'down']) {
      if (state[d] && (!prev[d] || t > repeatAt)) {
        if (move(d)) hooks.onMove?.(document.activeElement);
        repeatAt = t + (prev[d] ? 120 : 380);
      }
    }
    if (state.a && !prev.a) document.activeElement?.click();
    if (state.b && !prev.b) hooks.onBack?.();
    if (state.lb && !prev.lb) hooks.onTab?.(-1);
    if (state.rb && !prev.rb) hooks.onTab?.(1);
    prev = state;
  }
  requestAnimationFrame(poll);
}
