// Item model + DOM rendering for every board object.
// item = { id, type, x, y, a (radians), s (scale), pin: 'pin'|'lock'|null, z, d: {...} }

import {
  STICKERS, OBJECTS, fontFamily, cloudSvg, fireSvg, fanSvg, magnetSvg, potSvg, plantSvg, diceSvg, clockSvg,
  duckSvg, clipSvg, iceSvg, coinSvg, spinnerSvg, extinguisherSvg,
  boreSvg, fruitSvg, tankSvg, sprinklerSvg, tapSvg, canSvg, bucketSvg, windsockSvg, flagSvg, kiteSvg,
} from './art.js';
import { strokePath } from './pen.js';

let seq = 0;
export const uid = () => `i${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const LIGHT_TYPES = new Set(['sun', 'lamp', 'torch', 'fire']);
/** Things that burn when they touch a fire. */
export const PAPER_TYPES = new Set(['note', 'text', 'photo', 'card', 'doodle', 'bubble', 'game']);
/** Things a magnet pulls. */
export const METAL_TYPES = new Set(['coin', 'clip', 'camera', 'torch', 'fan', 'extinguisher', 'spinner']);
/** Things that float in water (others sink). */
export const FLOATERS = new Set(['fruit', 'note', 'text', 'photo', 'card', 'doodle', 'bubble', 'game', 'sticker', 'duck', 'ball', 'balloon', 'ice', 'plant', 'dice']);

/** Things that connect with pipes. */
export const PIPE_TYPES = new Set(['bore', 'tank', 'sprinkler', 'tap']);
/** Things that stand in the ground (snap to the terrain, don't fall over). */
export const ROOTED = new Set(['bore', 'windsock', 'flag', 'sprinkler']);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Default physics/pin mode for newly created items. */
export function defaultPin(type) {
  if (['sun', 'torch', 'camera', 'title', 'doodle', 'cloud', 'water', 'spinner', 'bore', 'windsock', 'flag', 'sprinkler', 'tank', 'tap'].includes(type)) return 'lock';
  if (['ball', 'balloon', 'sticker', 'fire', 'fan', 'dice', 'duck', 'coin', 'clip', 'ice', 'extinguisher', 'plant', 'can', 'bucket', 'kite', 'fruit'].includes(type)) return null;
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
  patch(el, item);
  return el;
}

export function label(item) {
  const d = item.d || {};
  return ({
    title: d.text, text: `Text: ${d.text}`, note: `Note: ${d.text}`, bubble: `Speech bubble: ${d.text}`, photo: `Photo: ${d.caption || 'picture'}`, game: `Game: ${d.caption}`,
    sticker: 'Sticker', doodle: 'Drawing', sun: 'Sun (light source)', lamp: 'Hanging lamp', torch: 'Torch', ball: 'Bouncy ball', balloon: 'Balloon', camera: 'Instant camera', card: `Card: ${d.title || 'Say hello'}`,
    cloud: `${d.mode || 'rain'} cloud`, fire: 'Campfire', water: d.frozen ? 'Ice' : 'Water pool', fan: 'Fan', magnet: 'Magnet', plant: `Plant (${d.species || 'flower'})`,
    fruit: 'Fruit', bore: `Water bore (${d.pump || 'hand'} pump)`, tank: 'Water tank', sprinkler: 'Sprinkler', tap: 'Tap', can: 'Watering can', bucket: 'Bucket', windsock: 'Wind sock', flag: 'Flag', kite: 'Kite',
    dice: 'Dice', clock: 'Clock', duck: 'Rubber duck', coin: 'Coin', clip: 'Paperclip', ice: 'Ice cube', spinner: 'Spinner wheel', extinguisher: 'Fire extinguisher',
  })[item.type] || item.type;
}

const fontCss = (id, fallback) => fontFamily(id || fallback);

function inner(item) {
  const d = item.d || {};
  switch (item.type) {
    case 'title':
      return `<div class="title-text" style="font-family:${fontCss(d.font, 'bubbles')};font-size:${d.size || 150}px">${esc(d.text)}</div>${d.sub ? `<div class="title-sub">${esc(d.sub)}</div>` : ''}`;
    case 'text':
      return `<div class="txt ${d.invert ? 'inv' : ''} ${d.outline ? 'outl' : ''} al-${d.align || 'left'}" style="font-family:${fontCss(d.font, 'marker')};font-size:${d.size || 48}px" data-edit>${esc(d.text)}</div>`;
    case 'note': {
      const paper = d.paper || (d.tone === 'black' ? 'black' : 'classic');
      return `<div class="note p-${paper}"><span class="glue" aria-hidden="true"></span><div class="note-t" data-edit style="font-family:${fontCss(d.font, 'hand')}">${esc(d.text)}</div>${d.sign ? `<div class="note-sign">${esc(d.sign)}</div>` : ''}<span class="curl" aria-hidden="true"></span></div>`;
    }
    case 'bubble':
      return `<div class="bubble t-${d.tail || 'left'} ${d.style === 'black' ? 'black' : ''}"><div class="bubble-t" data-edit style="font-family:${fontCss(d.font, 'hand')}">${esc(d.text)}</div></div>`;
    case 'photo':
    case 'game': {
      const frame = d.frame || 'polaroid';
      return `<figure class="polaroid f-${frame} ${d.wide === false ? 'square' : ''} ${d.bw ? 'bw' : ''}"><img src="${esc(d.src)}" alt="" draggable="false" style="${d.ratio && d.wide !== false ? `aspect-ratio:${esc(d.ratio)};` : ''}object-fit:${d.fit === 'contain' ? 'contain' : 'cover'}"><figcaption>${esc(d.caption || '')}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</figcaption>${item.type === 'game' ? '<span class="open-hint">tap to open</span>' : ''}</figure>`;
    }
    case 'sticker':
      return `<div class="stk ${d.flip ? 'flip' : ''}">${d.src ? `<img src="${esc(d.src)}" alt="" draggable="false">` : STICKERS[d.key] || STICKERS.star}</div>`;
    case 'doodle':
      return doodleSvg(d);
    case 'card': {
      const style = d.style || 'black';
      const title = d.title ?? 'Say hello';
      return `<div class="card c-${style}"><span class="card-k">${esc(title)}</span>${d.body ? `<p class="card-b">${esc(d.body)}</p>` : ''}${d.email ? `<div class="card-mail">${esc(d.email)}</div>` : ''}<div class="card-row">${d.email ? `<span class="card-btn" data-act="copy">Copy</span><a class="card-btn" href="mailto:${esc(d.email)}" data-act="mail">Email</a>` : ''}${d.link ? `<a class="card-btn" href="${esc(safeUrl(d.link))}" data-act="link" rel="noopener noreferrer" target="_blank">${esc(d.linkLabel || 'Open')}</a>` : ''}</div></div>`;
    }
    case 'sun': case 'lamp': case 'torch': case 'ball': case 'balloon': case 'camera':
      return `<div class="obj">${OBJECTS[item.type]}</div>${item.type === 'camera' ? '<span class="open-hint">tap to snap</span>' : ''}`;
    case 'cloud':
      return `<div class="obj">${cloudSvg(d.mode || 'rain')}</div>`;
    case 'fire':
      return `<div class="obj fire">${fireSvg()}</div>`;
    case 'water':
      return `<div class="pool" style="width:${d.w || 900}px;height:${d.h || 200}px"><span class="wave" aria-hidden="true"></span><span class="frost" aria-hidden="true"></span></div>`;
    case 'fan':
      return `<div class="obj fan">${fanSvg()}</div>`;
    case 'magnet':
      return `<div class="obj">${magnetSvg()}</div>`;
    case 'plant':
      return `<div class="pot"><div class="plant">${plantSvg(d.species)}</div>${potSvg()}</div>`;
    case 'dice':
      return `<div class="obj">${diceSvg(d.face || 6)}</div>`;
    case 'clock':
      return `<div class="obj">${clockSvg()}</div>`;
    case 'duck':
      return `<div class="obj">${duckSvg()}</div>`;
    case 'coin':
      return `<div class="obj">${coinSvg()}</div>`;
    case 'clip':
      return `<div class="obj">${clipSvg()}</div>`;
    case 'ice':
      return `<div class="obj">${iceSvg()}</div>`;
    case 'spinner':
      return `<div class="obj">${spinnerSvg(d.labels || ['Play', 'Again', 'Win', 'GG', 'Wow', 'Yay'])}</div><span class="open-hint">tap to spin</span>`;
    case 'fruit':
      return `<div class="obj" style="width:${d.big ? 110 : 56}px">${fruitSvg(d.color, d.big)}</div>`;
    case 'bore':
      return `<div class="obj">${boreSvg(d.pump || 'hand')}</div><span class="open-hint">${d.pump === 'hand' || !d.pump ? 'tap to pump' : 'right-click: pipe'}</span>`;
    case 'tank':
      return `<div class="obj">${tankSvg()}</div><span class="gauge" aria-hidden="true"></span>`;
    case 'sprinkler':
      return `<div class="obj">${sprinklerSvg()}</div>`;
    case 'tap':
      return `<div class="obj">${tapSvg()}</div><span class="open-hint">tap to open</span>`;
    case 'can':
      return `<div class="obj">${canSvg()}</div><span class="open-hint">tilt to pour</span>`;
    case 'bucket':
      return `<div class="obj">${bucketSvg()}</div>`;
    case 'windsock':
      return `<div class="obj">${windsockSvg()}</div>`;
    case 'flag':
      return `<div class="obj">${flagSvg()}</div>`;
    case 'kite':
      return `<div class="obj">${kiteSvg()}</div>`;
    case 'extinguisher':
      return `<div class="obj">${extinguisherSvg()}</div><span class="open-hint">tap to spray</span>`;
    default:
      return '';
  }
}

function safeUrl(u) {
  const s = String(u || '').trim();
  if (/^(https?:|mailto:)/i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`;
  return '#';
}

function doodleSvg(d) {
  const w = d.w || 40, h = d.h || 40;
  if (d.strokes) {
    const paths = d.strokes.map((st) => {
      const hl = st.tool === 'highlighter';
      return `<path d="${strokePath(st.pts, st.size || 6, st.tool)}" fill="${esc(st.color || '#111')}"${hl ? ' fill-opacity=".38" class="hl"' : ''}/>`;
    }).join('');
    return `<svg class="doodle" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${paths}</svg>`;
  }
  return `<svg class="doodle" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${esc(d.path)}" fill="none" stroke="${esc(d.color || '#111')}" stroke-width="${d.width || 5}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Cheap visual state updates that do not change the item's size (no physics rebuild). */
export function patch(el, item) {
  const d = item.d || {};
  switch (item.type) {
    case 'fire': el.classList.toggle('out', d.lit === false); el.style.setProperty('--fs', d.size || 1); break;
    case 'fan': el.classList.toggle('on', !!d.on); el.classList.toggle('flip', d.dir < 0); el.style.setProperty('--fp', d.power || 1); break;
    case 'plant': el.style.setProperty('--g', Math.max(0.15, d.growth ?? 0.5).toFixed(3)); el.classList.toggle('wilt', (d.dry || 0) > 0.5); break;
    case 'water': el.classList.toggle('frozen', !!d.frozen); el.style.setProperty('--ice', Math.min(1, d.ice || 0).toFixed(2)); break;
    case 'dice': { const o = el.querySelector('.obj'); if (o && o.dataset.face !== String(d.face || 6)) { o.innerHTML = diceSvg(d.face || 6); o.dataset.face = String(d.face || 6); } break; }
    case 'ice': el.style.setProperty('--melt', (d.melt || 0).toFixed(2)); break;
    case 'tank': case 'can': case 'bucket': {
      el.style.setProperty('--lvl', Math.max(0, Math.min(1, d.level || 0)).toFixed(3));
      const g = el.querySelector('.gauge');
      if (g) g.textContent = `${Math.round((d.level || 0) * 100)}%`;
      break;
    }
    case 'sprinkler': case 'tap': el.classList.toggle('on', !!d.on); el.classList.toggle('flowing', !!d._flow); break;
    case 'bore': el.classList.toggle('dry', !!d._dry); el.classList.toggle('pumping', !!d._flow); break;
    default: break;
  }
  el.classList.toggle('wet', (d.wet || 0) > 0.15);
  if (d.wet > 0.15) el.style.setProperty('--wet', Math.min(1, d.wet).toFixed(2));
  if (d.burn) { el.classList.add('burning'); el.style.setProperty('--burn', Math.min(1, d.burn).toFixed(3)); }
  else if (el.classList.contains('burning')) { el.classList.remove('burning'); el.style.removeProperty('--burn'); }
}

/** Apply transform + state classes. */
export function place(el, item, w, h) {
  el.style.transform = `translate(${item.x - w / 2}px, ${item.y - h / 2}px) rotate(${item.a}rad) scale(${item.s})`;
  // water sits in front so things look submerged; clouds float above everything else
  el.style.zIndex = String((item.type === 'water' ? 900000 : item.type === 'cloud' ? 800000 : 10) + (item.z || 0));
}

export function syncState(el, item) {
  el.classList.toggle('pinned', item.pin === 'pin');
  el.classList.toggle('locked', item.pin === 'lock');
  el.classList.toggle('loose', !item.pin);
}
