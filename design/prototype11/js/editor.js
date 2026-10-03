// Inspector: a small black & white popover that edits any item (text, photo, card, elements, toys...).
// Field types: text, textarea, range, segment, toggle, select, stickers, colors, button.

import { FONTS, STICKERS, STICKER_GROUPS, ICONS } from './art.js';
import { label } from './items.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fontOpts = (ids) => FONTS.filter((f) => !ids || ids.includes(f.id)).map((f) => ({ v: f.id, l: f.name, style: `font-family:${f.family}` }));
const INKS = ['#111111', '#ffffff', '#ff3b30', '#ff8a1a', '#ffd23f', '#2fd66b', '#4c7dff', '#9b5cff'];

/** Which fields each item type exposes. Keys are item.d keys, except `$s` (item scale). */
export function fieldsFor(item) {
  const d = item.d || {};
  const size = { key: '$s', label: 'Size', type: 'range', min: 0.3, max: 4, step: 0.05 };
  switch (item.type) {
    case 'title': return [{ key: 'text', label: 'Title', type: 'text' }, { key: 'sub', label: 'Tagline', type: 'text' }, { key: 'font', label: 'Font', type: 'select', options: fontOpts() }, { key: 'size', label: 'Font size', type: 'range', min: 60, max: 260, step: 2 }];
    case 'text': return [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'font', label: 'Font', type: 'select', options: fontOpts() },
      { key: 'size', label: 'Font size', type: 'range', min: 16, max: 220, step: 2 },
      { key: 'align', label: 'Align', type: 'segment', options: [{ v: 'left', l: 'Left' }, { v: 'center', l: 'Center' }, { v: 'right', l: 'Right' }] },
      { key: 'invert', label: 'White on black', type: 'toggle' },
      { key: 'outline', label: 'Outline only', type: 'toggle' },
    ];
    case 'note': return [
      { key: 'text', label: 'Note', type: 'textarea' },
      { key: 'paper', label: 'Paper', type: 'segment', options: ['classic', 'lined', 'grid', 'torn', 'index', 'black'].map((v) => ({ v, l: v[0].toUpperCase() + v.slice(1) })) },
      { key: 'font', label: 'Handwriting', type: 'select', options: fontOpts(['hand', 'marker', 'script', 'clean', 'pixel', 'round', 'retro']) },
      { key: 'sign', label: 'Signed / footer', type: 'text', placeholder: 'e.g. Team · 2026' },
      size,
    ];
    case 'bubble': return [
      { key: 'text', label: 'Says', type: 'textarea' },
      { key: 'tail', label: 'Tail', type: 'segment', options: [{ v: 'left', l: '◤ Left' }, { v: 'right', l: 'Right ◥' }] },
      { key: 'style', label: 'Style', type: 'segment', options: [{ v: 'white', l: 'White' }, { v: 'black', l: 'Black' }] },
      { key: 'font', label: 'Font', type: 'select', options: fontOpts() },
      size,
    ];
    case 'photo': case 'game': return [
      { key: 'caption', label: 'Caption', type: 'text' },
      ...(item.type === 'photo' ? [{ key: 'sub', label: 'Small print', type: 'text' }] : []),
      { key: '$image', label: 'Replace image…', type: 'button' },
      { key: 'frame', label: 'Frame', type: 'segment', options: [{ v: 'polaroid', l: 'Polaroid' }, { v: 'plain', l: 'Plain' }, { v: 'round', l: 'Round' }, { v: 'film', l: 'Film' }] },
      { key: 'fit', label: 'Crop', type: 'segment', options: [{ v: 'cover', l: 'Fill' }, { v: 'contain', l: 'Fit' }] },
      { key: 'bw', label: 'Black & white', type: 'toggle' },
      size,
    ];
    case 'card': return [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Text', type: 'textarea' },
      { key: 'email', label: 'Email (adds Copy + Email)', type: 'text', placeholder: 'name@example.com' },
      { key: 'link', label: 'Link', type: 'text', placeholder: 'https://…' },
      { key: 'linkLabel', label: 'Link button', type: 'text', placeholder: 'Open' },
      { key: 'style', label: 'Style', type: 'segment', options: [{ v: 'black', l: 'Black' }, { v: 'white', l: 'White' }, { v: 'outline', l: 'Outline' }, { v: 'ticket', l: 'Ticket' }] },
      size,
    ];
    case 'sticker': return [{ key: 'key', label: 'Sticker', type: 'stickers' }, { key: 'flip', label: 'Mirror', type: 'toggle' }, size];
    case 'doodle': return d.strokes ? [{ key: '$ink', label: 'Ink', type: 'colors', options: INKS }, { key: '$width', label: 'Line weight', type: 'range', min: 0.4, max: 3, step: 0.1 }, size] : [size];
    case 'cloud': return [
      { key: 'mode', label: 'Weather', type: 'segment', options: [{ v: 'rain', l: '🌧 Rain' }, { v: 'snow', l: '❄ Snow' }, { v: 'storm', l: '⛈ Storm' }, { v: 'none', l: '☁ Calm' }] },
      { key: 'amount', label: 'Intensity', type: 'range', min: 0.1, max: 1.5, step: 0.05 },
      ...(d.mode === 'storm' ? [{ key: '$strike', label: '⚡ Strike now', type: 'button' }] : []),
      size,
    ];
    case 'fire': return [{ key: 'lit', label: 'Burning', type: 'toggle' }, { key: 'size', label: 'Flame size', type: 'range', min: 0.5, max: 2.2, step: 0.05 }, size];
    case 'water': return [{ key: 'w', label: 'Width', type: 'range', min: 300, max: 2400, step: 20 }, { key: 'h', label: 'Depth', type: 'range', min: 100, max: 600, step: 10 }, { key: 'frozen', label: 'Frozen (ice)', type: 'toggle' }];
    case 'fan': return [{ key: 'on', label: 'On', type: 'toggle' }, { key: 'power', label: 'Power', type: 'range', min: 0.3, max: 2, step: 0.05 }, { key: 'dir', label: 'Blows', type: 'segment', options: [{ v: 1, l: '→ Right' }, { v: -1, l: '← Left' }] }, size];
    case 'magnet': return [{ key: 'strength', label: 'Strength', type: 'range', min: 0.3, max: 2.5, step: 0.05 }, size];
    case 'plant': return [{ key: 'species', label: 'Plant', type: 'segment', options: [{ v: 'flower', l: 'Flower' }, { v: 'sunflower', l: 'Sunflower' }, { v: 'cactus', l: 'Cactus' }] }, { key: 'growth', label: 'Growth', type: 'range', min: 0.15, max: 1, step: 0.01 }, size];
    case 'lamp': return [{ key: 'temp', label: 'Light', type: 'segment', options: [{ v: 'warm', l: 'Warm' }, { v: 'white', l: 'White' }, { v: 'cool', l: 'Cool' }] }, size];
    case 'torch': return [{ key: 'beam', label: 'Beam width', type: 'range', min: 0.15, max: 0.9, step: 0.01 }, size];
    case 'dice': return [{ key: 'face', label: 'Face', type: 'segment', options: [1, 2, 3, 4, 5, 6].map((v) => ({ v, l: String(v) })) }, size];
    case 'spinner': return [{ key: '$labels', label: 'Slices (one per line)', type: 'textarea' }, size];
    default: return [size];
  }
}

/** Keys that only need a cheap visual patch (no re-render / physics rebuild). */
export const PATCH_KEYS = new Set(['lit', 'on', 'power', 'strength', 'growth', 'temp', 'beam', 'amount', 'dir']);

export function createInspector({ onChange, onAction, onClose }) {
  const el = document.createElement('div');
  el.className = 'inspector';
  el.setAttribute('role', 'dialog');
  el.hidden = true;
  document.body.appendChild(el);
  let item = null;

  const get = (key) => {
    if (key === '$s') return item.s;
    if (key === '$labels') return (item.d.labels || ['Play', 'Again', 'Win', 'GG', 'Wow', 'Yay']).join('\n');
    if (key === '$ink') return item.d.strokes?.[0]?.color;
    if (key === '$width') return item.d.strokesScale || 1;
    return item.d[key];
  };
  function render(fields) {
    const defaults = { size: item.type === 'title' ? 150 : 48, amount: 0.6, power: 1, strength: 1, growth: 0.5, beam: 0.42, w: 900, h: 200, lit: true, frozen: false };
    el.innerHTML = `<header><b>${esc(label(item)).slice(0, 40)}</b><button type="button" class="x" data-x aria-label="Close">${ICONS.close}</button></header>` + fields.map((f, i) => {
      const id = `ins-${i}`;
      const v = get(f.key) ?? defaults[f.key];
      switch (f.type) {
        case 'text': return `<label class="row" for="${id}"><span>${esc(f.label)}</span><input id="${id}" data-k="${f.key}" type="text" value="${esc(v ?? '')}" placeholder="${esc(f.placeholder || '')}" maxlength="300"></label>`;
        case 'textarea': return `<label class="row" for="${id}"><span>${esc(f.label)}</span><textarea id="${id}" data-k="${f.key}" rows="3" maxlength="1200">${esc(v ?? '')}</textarea></label>`;
        case 'range': return `<label class="row" for="${id}"><span>${esc(f.label)} <output>${Number(v ?? f.min).toFixed(f.step < 1 ? 2 : 0)}</output></span><input id="${id}" data-k="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${v ?? f.min}"></label>`;
        case 'toggle': return `<label class="row tog"><span>${esc(f.label)}</span><input data-k="${f.key}" type="checkbox" role="switch" ${v ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
        case 'select': return `<div class="row"><span>${esc(f.label)}</span><div class="fonts" role="radiogroup" aria-label="${esc(f.label)}">${f.options.map((o) => `<button type="button" role="radio" data-k="${f.key}" data-v="${esc(o.v)}" aria-checked="${String(v) === String(o.v)}" style="${o.style || ''}">${esc(o.l)}</button>`).join('')}</div></div>`;
        case 'segment': return `<div class="row"><span>${esc(f.label)}</span><div class="seg2" role="radiogroup" aria-label="${esc(f.label)}">${f.options.map((o) => `<button type="button" role="radio" data-k="${f.key}" data-v="${esc(o.v)}" aria-checked="${String(v ?? f.options[0].v) === String(o.v)}">${esc(o.l)}</button>`).join('')}</div></div>`;
        case 'colors': return `<div class="row"><span>${esc(f.label)}</span><div class="inks">${f.options.map((c) => `<button type="button" data-k="${f.key}" data-v="${c}" aria-label="ink ${c}" aria-checked="${v === c}" style="--c:${c}"></button>`).join('')}</div></div>`;
        case 'stickers': return `<div class="row"><span>${esc(f.label)}</span><div class="stks">${Object.values(STICKER_GROUPS).flat().map((k) => `<button type="button" data-k="key" data-v="${k}" aria-label="${k}" aria-checked="${v === k}">${STICKERS[k]}</button>`).join('')}</div></div>`;
        case 'button': return `<button type="button" class="pbtn wide" data-act="${f.key}">${esc(f.label)}</button>`;
        default: return '';
      }
    }).join('');
  }

  function set(key, raw, live) {
    let v = raw;
    if (['$s', 'size', 'amount', 'power', 'strength', 'growth', 'beam', 'w', 'h', '$width'].includes(key)) v = Number(raw);
    if (['face', 'dir'].includes(key)) v = Number(raw);
    onChange(item, key, v, live);
  }

  el.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.k) return;
    if (t.type === 'range') t.previousElementSibling.querySelector('output').textContent = Number(t.value).toFixed(Number(t.step) < 1 ? 2 : 0);
    if (t.type === 'checkbox') return;
    set(t.dataset.k, t.value, true);
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset.k) return;
    set(t.dataset.k, t.type === 'checkbox' ? t.checked : t.value, false);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-x]')) { close(); return; }
    const a = e.target.closest('[data-act]');
    if (a) { onAction(item, a.dataset.act); return; }
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    set(b.dataset.k, b.dataset.v, false);
  });
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } e.stopPropagation(); });
  el.addEventListener('contextmenu', (e) => e.stopPropagation());

  function open(it, anchor) {
    item = it;
    render(fieldsFor(it));
    el.hidden = false;
    position(anchor);
    el.querySelector('input, textarea, button:not(.x)')?.focus({ preventScroll: true });
  }
  function position(anchor) {
    const r = el.getBoundingClientRect();
    const mobile = innerWidth < 640;
    if (mobile) { el.style.left = '8px'; el.style.top = 'auto'; el.style.bottom = '8px'; el.style.width = 'calc(100vw - 16px)'; return; }
    el.style.bottom = 'auto'; el.style.width = '';
    let x = anchor.x + 24, y = anchor.y - r.height / 2;
    if (x + r.width > innerWidth - 10) x = anchor.x - r.width - 24;
    x = Math.max(10, Math.min(innerWidth - r.width - 10, x));
    y = Math.max(70, Math.min(innerHeight - r.height - 90, y));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  }
  /** Re-render after an external change (e.g. a new image) keeping it open. */
  function refresh() { if (item && !el.hidden) { const a = document.activeElement?.dataset?.k; render(fieldsFor(item)); if (a) el.querySelector(`[data-k="${a}"]`)?.focus(); } }
  function close() {
    if (el.hidden) return;
    el.hidden = true;
    const it = item;
    item = null;
    onClose?.(it);
  }
  return { open, close, refresh, get item() { return item; }, get isOpen() { return !el.hidden; }, el };
}
