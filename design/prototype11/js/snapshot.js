// Instant camera: paints the current view (items + lighting) onto a canvas, entirely in the browser.
// Returns a PNG blob for download and a small JPEG data URL to print as a polaroid on the board.

import { svgUrl } from './art.js';

const loadImg = (src) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});

function offsetIn(node, root) {
  let x = 0, y = 0, n = node;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/**
 * @param items sorted by z; els Map(id->el); sizes Map(id->{w,h}); cam {x,y,z}; view {w,h}; lightCanvas
 */
export async function snapshot({ items, els, sizes, cam, view, lightCanvas, fxCanvas, groundY, background = '#ffffff' }) {
  const dpr = 1.5;
  const c = document.createElement('canvas');
  c.width = Math.round(view.w * dpr);
  c.height = Math.round(view.h * dpr);
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);

  // dot grid like the board
  ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * cam.z * dpr, -cam.y * cam.z * dpr);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  const g = 40, x0 = Math.floor(cam.x / g) * g, y0 = Math.floor(cam.y / g) * g;
  for (let x = x0; x < cam.x + view.w / cam.z; x += g) for (let y = y0; y < cam.y + view.h / cam.z; y += g) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  if (groundY != null && groundY < cam.y + view.h / cam.z) {
    ctx.fillStyle = '#f1f1f2';
    ctx.fillRect(cam.x, groundY, view.w / cam.z, cam.y + view.h / cam.z - groundY);
    ctx.fillStyle = '#111';
    ctx.fillRect(cam.x, groundY - 2, view.w / cam.z, 4);
  }

  // preload every image/svg used by visible items
  const jobs = [];
  for (const it of items) {
    const el = els.get(it.id);
    if (!el) continue;
    el.querySelectorAll('img').forEach((img) => jobs.push(loadImg(img.currentSrc || img.src).then((im) => (img._snap = im))));
    el.querySelectorAll('svg').forEach((svg) => {
      const s = svg.cloneNode(true);
      s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      s.setAttribute('width', svg.clientWidth || svg.getBoundingClientRect().width || 100);
      s.setAttribute('height', svg.clientHeight || svg.getBoundingClientRect().height || 100);
      jobs.push(loadImg(svgUrl(s.outerHTML)).then((im) => (svg._snap = im)));
    });
  }
  await Promise.all(jobs);

  for (const it of items) {
    const el = els.get(it.id);
    const sz = sizes.get(it.id);
    if (!el || !sz) continue;
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, -cam.x * cam.z * dpr, -cam.y * cam.z * dpr);
    ctx.translate(it.x, it.y);
    ctx.rotate(it.a);
    ctx.scale(it.s, it.s);
    ctx.translate(-sz.w / 2, -sz.h / 2);
    // soft shadow
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    // box backgrounds (polaroid frames, notes, cards)
    el.querySelectorAll('.polaroid, .note, .card, .bubble, .pool').forEach((box) => {
      const o = offsetIn(box, el);
      ctx.fillStyle = getComputedStyle(box).backgroundColor;
      ctx.fillRect(o.x, o.y, box.offsetWidth, box.offsetHeight);
    });
    ctx.shadowColor = 'transparent';
    el.querySelectorAll('img').forEach((img) => {
      if (!img._snap) return;
      const o = offsetIn(img, el);
      const w = img.offsetWidth, h = img.offsetHeight;
      const r = Math.max(w / img._snap.width, h / img._snap.height);
      const sw = w / r, sh = h / r;
      ctx.drawImage(img._snap, (img._snap.width - sw) / 2, (img._snap.height - sh) / 2, sw, sh, o.x, o.y, w, h);
    });
    el.querySelectorAll('svg').forEach((svg) => {
      if (!svg._snap || svg.closest('.pushpin') && it.pin !== 'pin') return;
      const o = offsetIn(svg.closest('.pushpin') || svg.parentElement, el);
      const b = svg.getBoundingClientRect();
      const w = svg.clientWidth || b.width / cam.z / it.s, h = svg.clientHeight || b.height / cam.z / it.s;
      ctx.drawImage(svg._snap, o.x + (svg.offsetLeft || 0), o.y + (svg.offsetTop || 0), w, h);
    });
    el.querySelectorAll('.title-text, .title-sub, .txt, .note-t, .note-sign, .bubble-t, figcaption, .card-k, .card-b, .card-mail').forEach((t) => {
      const cs = getComputedStyle(t);
      const o = offsetIn(t, el);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.fillStyle = cs.color;
      ctx.textBaseline = 'top';
      ctx.textAlign = cs.textAlign === 'center' ? 'center' : 'left';
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const x = ctx.textAlign === 'center' ? o.x + t.offsetWidth / 2 : o.x + parseFloat(cs.paddingLeft || 0);
      const lines = wrap(ctx, t.childNodes[0]?.nodeType === 3 ? t.childNodes[0].textContent : t.textContent, t.offsetWidth - 4);
      lines.forEach((ln, i) => ctx.fillText(ln, x, o.y + parseFloat(cs.paddingTop || 0) + i * lh));
    });
  }

  // weather + lighting on top (already in screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (fxCanvas) ctx.drawImage(fxCanvas, 0, 0, c.width, c.height);
  if (lightCanvas) ctx.drawImage(lightCanvas, 0, 0, c.width, c.height);

  // tiny watermark
  ctx.font = `600 ${14 * dpr}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.textAlign = 'right';
  ctx.fillText('fewclicks.org', c.width - 14 * dpr, c.height - 14 * dpr);

  const png = await new Promise((r) => c.toBlob(r, 'image/png'));
  const k = Math.min(1, 900 / Math.max(c.width, c.height));
  const t = document.createElement('canvas');
  t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  return { png, jpeg: t.toDataURL('image/jpeg', 0.78), w: t.width, h: t.height };
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
