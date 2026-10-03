// Item model + DOM rendering for every board object.
// item = { id, type, x, y, a (radians), s (scale), pin: 'pin'|'lock'|null, z, d: {...} }

import { STICKERS, OBJECTS, fontFamily } from './art.js';

let seq = 0;
export const uid = () => `i${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const LIGHT_TYPES = new Set(['sun', 'lamp', 'torch']);
export const TOY_TYPES = new Set(['ball', 'balloon']);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Default physics/pin mode for newly created items. */
export function defaultPin(type) {
  if (['sun', 'torch', 'camera', 'title', 'doodle'].includes(type)) return 'lock';
  if (['ball', 'balloon', 'sticker'].includes(type)) return null;
  return 'pin';
}

export function makeItem(type, x, y, d = {}, extra = {}) {
  return { id: uid(), type, x, y, a: 0, s: 1, pin: defaultPin(type), z: 0, d, ...extra };
}

/** Where on the item the pushpin goes (local coords, relative to center, unscaled). */
export function pinOffset(item, w, h) {
  if (item.type === 'lamp') return { x: 0, y: -h / 2 + 2 };
  return { x: 0, y: -h / 2 + 12 };
}

export function renderItem(item) {
  const el = document.createElement('div');
  el.className = `it it-${item.type}`;
  el.dataset.id = item.id;
  el.innerHTML = inner(item) + `<span class="pushpin" aria-hidden="true">${OBJECTS.pin}</span><span class="lockmark" aria-hidden="true"></span>`;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', label(item));
  el.tabIndex = 0;
  return el;
}

export function label(item) {
  const d = item.d || {};
  return ({
    title: d.text, text: `Text: ${d.text}`, note: `Note: ${d.text}`, photo: `Photo: ${d.caption || 'picture'}`, game: `Game: ${d.caption}`,
    sticker: 'Sticker', doodle: 'Doodle', sun: 'Sun (light source)', lamp: 'Hanging lamp', torch: 'Torch', ball: 'Bouncy ball', balloon: 'Balloon', camera: 'Instant camera', card: 'Contact card',
  })[item.type] || item.type;
}

function inner(item) {
  const d = item.d || {};
  switch (item.type) {
    case 'title':
      return `<div class="title-text" style="font-family:${fontFamily(d.font || 'bubbles')};font-size:${d.size || 150}px">${esc(d.text)}</div>${d.sub ? `<div class="title-sub">${esc(d.sub)}</div>` : ''}`;
    case 'text':
      return `<div class="txt ${d.invert ? 'inv' : ''}" style="font-family:${fontFamily(d.font)};font-size:${d.size || 48}px" data-edit>${esc(d.text)}</div>`;
    case 'note':
      return `<div class="note ${d.tone === 'black' ? 'black' : ''}"><span class="tape" aria-hidden="true"></span><div class="note-t" data-edit>${esc(d.text)}</div>${d.sign ? `<div class="note-sign">${esc(d.sign)}</div>` : ''}</div>`;
    case 'photo':
    case 'game':
      return `<figure class="polaroid ${d.wide === false ? 'square' : ''}"><img src="${esc(d.src)}" alt="" draggable="false" style="${d.ratio ? `aspect-ratio:${d.ratio}` : ''}"><figcaption>${esc(d.caption || '')}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</figcaption>${item.type === 'game' ? '<span class="open-hint">tap to open</span>' : ''}</figure>`;
    case 'sticker':
      return `<div class="stk">${d.src ? `<img src="${esc(d.src)}" alt="" draggable="false">` : STICKERS[d.key] || STICKERS.star}</div>`;
    case 'doodle':
      return `<svg class="doodle" width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}"><path d="${esc(d.path)}" fill="none" stroke="${d.color || '#111'}" stroke-width="${d.width || 5}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case 'card':
      return `<div class="card"><span class="card-k">Say hello</span><div class="card-mail">${esc(d.email)}</div><div class="card-row"><span class="card-btn" data-act="copy">Copy</span><a class="card-btn" href="mailto:${esc(d.email)}" data-act="mail">Email</a></div></div>`;
    case 'sun': case 'lamp': case 'torch': case 'ball': case 'balloon': case 'camera':
      return `<div class="obj">${OBJECTS[item.type]}</div>${item.type === 'camera' ? '<span class="open-hint">tap to snap</span>' : ''}`;
    default:
      return '';
  }
}

/** Apply transform + state classes. */
export function place(el, item, w, h) {
  el.style.transform = `translate(${item.x - w / 2}px, ${item.y - h / 2}px) rotate(${item.a}rad) scale(${item.s})`;
  el.style.zIndex = String(10 + (item.z || 0));
}

export function syncState(el, item) {
  el.classList.toggle('pinned', item.pin === 'pin');
  el.classList.toggle('locked', item.pin === 'lock');
  el.classList.toggle('loose', !item.pin);
}
