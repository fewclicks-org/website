// The starting board, built from the shared JSON content. Everything begins pinned.

import { makeItem } from './items.js';
import { packStrokes, demoHi } from './pen.js';
import { createTerrain } from './world/terrain.js';

/** The infinite canvas has one ground line; everything else is open space. */
export const GROUND_Y = 3500;
export const CENTER = { x: 3200, y: 1450 };

export function seedBoard({ games, studio, team, news }) {
  const items = [];
  const add = (type, x, y, d, extra = {}) => { const it = makeItem(type, x, y, d, extra); items.push(it); return it; };

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
  studio.values.forEach((v, i) => add('note', 760, 700 + i * 560, { text: `${v.icon} ${v.title}:\n${v.text}`, paper: ['classic', 'black', 'grid'][i % 3] }, { a: (i - 1) * 0.04 }));

  // team polaroids on the right
  team.forEach((m, i) => add('photo', 5450 + (i % 2) * 330, 760 + Math.floor(i / 2) * 560, {
    src: m.avatar, caption: m.name, sub: m.role, wide: false,
  }, { a: (i % 2 ? 1 : -1) * 0.06 }));

  // news as notes along the bottom
  news.slice(0, 4).forEach((p, i) => add('note', 1500 + i * 640, 2780, { text: `${p.title}\n\n${p.summary}`, sign: `${p.tag} · ${p.date}`, paper: ['index', 'classic', 'torn', 'lined'][i % 4] }, { a: (i % 2 ? 1 : -1) * 0.03 }));

  // contact card under the title (an editable card)
  add('card', CENTER.x, 2250, { title: 'Say hello', email: studio.email || 'admin@fewclicks.org', style: 'black' });

  // how-to note near the start view
  add('note', 1900, 520, { text: 'How to play:\n✋ Drag anything & toss it\n📌 Tap a pin to drop it\n🖱 Right-click for more\n✏️ Double-click to edit\n☀️ Move the sun = time of day\n💾 Saved only in YOUR browser', paper: 'lined' }, { a: -0.035 });
  add('text', 4500, 520, { text: 'make it yours ↓', font: 'marker', size: 54 }, { a: 0.06 });

  // light + toys
  add('lamp', 4380, 420, {});
  add('torch', 820, 2500, {}, { a: -0.5 });
  add('camera', 4950, 2350, {});
  add('balloon', 4200, 1120, {}, { pin: 'pin' });
  add('ball', 2150, 3300, {});

  // a few loose stickers that fall to the tray, and some pinned decoration
  [['star', 2350, 1150], ['heart', 4050, 1700], ['sparkle', 2350, 1800], ['rainbow', 4000, 1120]].forEach(([key, x, y], i) => add('sticker', x, y, { key }, { pin: 'pin', a: (i - 1.5) * 0.15 }));
  [['pad', 2900, 3200], ['rocket', 3400, 3150], ['smile', 3800, 3250], ['gg', 4400, 3300]].forEach(([key, x, y]) => add('sticker', x, y, { key }));

  // weather corner: a rain cloud over a plant, next to a pond with a duck
  add('text', 6900, 1700, { text: 'weather corner ↓', font: 'marker', size: 54 }, { a: -0.04 });
  add('cloud', 6450, 2150, { mode: 'rain', amount: 0.5 }, { s: 1.6 });
  add('plant', 6450, GROUND_Y - 60, { species: 'sunflower', growth: 0.45 });
  add('water', 7300, GROUND_Y - 110, { w: 900, h: 220 });
  add('duck', 7250, GROUND_Y - 260, {});
  add('cloud', 7900, 2050, { mode: 'snow', amount: 0.4 }, { s: 1.3 });
  add('cloud', 8300, 1500, { mode: 'storm', amount: 0.7 }, { s: 1.5 });
  add('plant', 8500, GROUND_Y - 60, { species: 'cactus', growth: 0.6 });

  // a campfire (far from the paper), a fan, a magnet with paperclips, a spinner and a clock
  add('fire', -300, GROUND_Y - 80, { lit: true, size: 1 });
  add('ice', -420, GROUND_Y - 300, {});
  add('note', -300, 2500, { text: 'Careful:\nPaper burns! 🔥\nRain or the extinguisher puts fires out.', paper: 'index' }, { a: 0.03 });
  add('extinguisher', 150, GROUND_Y - 80, {});
  add('fan', 1300, GROUND_Y - 80, { on: false, power: 1, dir: 1 });
  add('magnet', 5360, 3060, { strength: 1.1 });
  [[5180, 0.3], [5300, -0.6], [5420, 1.1], [5550, 0.2]].forEach(([x, a]) => add('clip', x, GROUND_Y - 60, {}, { a }));
  add('coin', 5650, GROUND_Y - 60, {});
  add('spinner', 2400, 2350, { labels: games.map((g) => g.title.split(' ')[0]).slice(0, 6) }, { s: 1.1 });
  add('clock', 4100, 2350, {});
  add('dice', 4700, GROUND_Y - 80, { face: 5 });
  add('bubble', 3900, 330, { text: 'Hello! Make yourself at home.', tail: 'left' }, { a: 0.03 });
  const hi = packStrokes(demoHi().map((st) => ({ ...st, pts: st.pts.map(([x, y, p]) => [x + 4800, y + 560, p]) })));
  add('doodle', hi.x, hi.y, { strokes: hi.strokes, w: hi.w, h: hi.h });

  items.forEach((it, i) => (it.z = i));
  // rolling hills to the west, a sandy fire pit, a big hill far east with a rock outcrop
  const t = createTerrain({ groundY: GROUND_Y });
  t.hill(-5200, -900, 820);
  t.hill(-3000, -1700, 360);
  t.hill(9100, 12600, 1100);
  t.hill(10300, 11200, 240);
  t.paint('sand', -760, 560);
  t.paint('rock', 10400, 11000);
  t.paint('dirt', 6200, 6700);
  return { version: 3, gravity: 'on', cam: null, world: { wind: 0, clock: { mode: 'real' } }, terrain: t.serialize(), links: [], items };
}
