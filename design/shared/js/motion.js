// Motion + device helpers shared by all prototypes.

const mq = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false, addEventListener() {} });

/** True when the visitor asked the OS for less motion. Intros are skipped and effects reduced. */
export const reducedMotion = mq('(prefers-reduced-motion: reduce)').matches;

/** Touch-first devices (phones/tablets). */
export const coarsePointer = mq('(pointer: coarse)').matches;

/** Rough "go easy on the GPU" signal: phones, few CPU cores or a small screen. */
export const lowPower = coarsePointer || (navigator.hardwareConcurrency || 8) <= 4 || Math.min(screen.width, screen.height) < 500;

/** Remember per-session that the intro was already shown, so it isn't replayed on every page. */
export function introSeen(key) {
  try { return sessionStorage.getItem(`fewclicks:intro:${key}`) === '1'; } catch { return false; }
}
export function markIntroSeen(key) {
  try { sessionStorage.setItem(`fewclicks:intro:${key}`, '1'); } catch { /* ignore */ }
}

/** Is WebGL available? */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/** Run a callback when an element scrolls into view (once by default). */
export function onVisible(el, fn, { once = true, threshold = 0.2, rootMargin = '0px' } = {}) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(el); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { fn(e.target); if (once) io.unobserve(e.target); }
    });
  }, { threshold, rootMargin });
  io.observe(el);
}
