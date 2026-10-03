// The starting board, built from the shared JSON content. Everything begins pinned.

import { makeItem } from './items.js';

export const BOARD_W = 6400;
export const BOARD_H = 3600;
export const CENTER = { x: 3200, y: 1450 };

export function seedBoard({ games, studio, team, news }) {
  const items = [];
  const add = (type, x, y, d, extra = {}) => { const it = makeItem(type, x, y, d, extra); items.push(it); return it; };

  add('sun', 3200, 330, {}, { s: 1.4 });
  add('title', CENTER.x, CENTER.y, { text: 'FewClicks Studios', font: 'bubbles', size: 150, sub: studio.tagline || 'Games you can love in a few clicks.' }, { pin: 'lock' });

  // games on an ellipse around the title
  const n = games.length;
  games.forEach((g, i) => {
    const t = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2;
    add('game', CENTER.x + Math.cos(t) * 1500, CENTER.y + Math.sin(t) * 760, {
      gameId: g.id, src: g.media.cover, caption: g.title, sub: g.categoryList.map((c) => c.name).join(' · '),
    }, { a: (i % 2 ? 1 : -1) * 0.05 });
  });

  // studio values as notes on the left
  studio.values.forEach((v, i) => add('note', 760, 700 + i * 560, { text: `${v.icon} ${v.title}\n${v.text}`, tone: i === 1 ? 'black' : 'white' }, { a: (i - 1) * 0.04 }));

  // team polaroids on the right
  team.forEach((m, i) => add('photo', 5450 + (i % 2) * 330, 760 + Math.floor(i / 2) * 560, {
    src: m.avatar, caption: m.name, sub: m.role, wide: false,
  }, { a: (i % 2 ? 1 : -1) * 0.06 }));

  // news as notes along the bottom
  news.slice(0, 4).forEach((p, i) => add('note', 1500 + i * 640, 2780, { text: `${p.title}\n\n${p.summary}`, sign: `${p.tag} · ${p.date}` }, { a: (i % 2 ? 1 : -1) * 0.03 }));

  // contact card under the title
  add('card', CENTER.x, 2250, { email: studio.email || 'admin@fewclicks.org' });

  // how-to note near the start view
  add('note', 1900, 520, { text: '✋ Drag anything & toss it\n📌 Tap a pin to drop it\n🔒 Lock / pin from the toolbar\n🔍 Scroll or pinch to zoom\n☀️ Move the sun = time of day\n💾 Saved only in YOUR browser', tone: 'white' }, { a: -0.035 });
  add('text', 4500, 520, { text: 'make it yours ↓', font: 'marker', size: 54 }, { a: 0.06 });

  // light + toys
  add('lamp', 4380, 420, {});
  add('torch', 820, 2500, {}, { a: -0.5 });
  add('camera', 4950, 2350, {});
  add('balloon', 4200, 1120, {}, { pin: 'pin' });
  add('ball', 2150, 3300, {});

  // a few loose stickers that fall to the tray, and some pinned decoration
  [['star', 2350, 1150], ['heart', 4050, 1700], ['sparkle', 2350, 1800], ['rainbow', 4000, 1120]].forEach(([key, x, y], i) => add('sticker', x, y, { key }, { pin: 'pin', a: (i - 1.5) * 0.15 }));
  [['pad', 2900, 3200], ['rocket', 3400, 3150], ['smile', 3800, 3250], ['dice', 4400, 3300]].forEach(([key, x, y]) => add('sticker', x, y, { key }));

  items.forEach((it, i) => (it.z = i));
  return { version: 1, gravity: 'on', cam: null, items };
}
