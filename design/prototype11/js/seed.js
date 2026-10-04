// The starting board, built from the shared JSON content. Everything begins pinned.

import { makeItem } from './items.js';
import { packStrokes, demoHi } from './pen.js';
import { createTerrain } from './world/terrain.js';
import { createWater } from './world/water.js';

/** The infinite canvas has one ground line; everything else is open space. */
export const GROUND_Y = 3500;
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
  add('cloud', 6450, 1500, { mode: 'rain', amount: 0.5 }, { s: 1.2 });
  add('plant', 6450, GROUND_Y - 60, { species: 'sunflower', growth: 0.45 });
  add('duck', 7300, GROUND_Y - 300, {});
  add('cloud', 7900, 1400, { mode: 'snow', amount: 0.4 }, { s: 1 });
  add('cloud', 8800, 1200, { mode: 'storm', amount: 0.7 }, { s: 1.2 });
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

  // water: a windmill bore pumps groundwater → tank → sprinkler over the garden
  const bore = add('bore', 5850, GROUND_Y - 94, { pump: 'wind', depth: 400 });
  const tank = add('tank', 6080, GROUND_Y - 90, { level: 0.4 });
  const spr = add('sprinkler', 6330, GROUND_Y - 58, { on: true });
  add('windsock', 4950, GROUND_Y - 92, {});
  const pole = add('flag', 2050, GROUND_Y - 92, {});
  const kite = add('kite', 2350, 2300, {}, { a: 0.2 });
  const links = [
    { id: 'lpipe1', a: bore.id, b: tank.id, kind: 'pipe' },
    { id: 'lpipe2', a: tank.id, b: spr.id, kind: 'pipe' },
    { id: 'lkite', a: pole.id, b: kite.id, kind: 'string', len: 900 },
  ];

  items.forEach((it, i) => (it.z = i));

  // rolling hills to the west, a sandy fire pit, a big hill far east with a rock outcrop, two ponds
  const t = createTerrain({ groundY: GROUND_Y });
  const w = createWater({ terrain: t });
  t.hill(-5200, -900, 820);
  t.hill(-3000, -1700, 360);
  t.hill(9100, 12600, 1100);
  t.hill(10300, 11200, 240);
  t.paint('sand', -760, 560);
  t.paint('rock', 10400, 11000);
  t.paint('dirt', 6200, 6700);
  w.pond(6850, 7800, 260, 0.85);
  w.pond(-2650, -2050, 120, 0.8);
  // plants (flowers + trees only): a forest on the western hills, palms by the fire pit, an orchard and a
  // flower garden by the sprinkler (some still sprouts: water them!), lotus in the pond, wild flowers
  const flora = [];
  let r = 1;
  const rnd = () => { const v = Math.sin(r++ * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const P = (sp, x, g = 1) => flora.push([sp, Math.round(x), g, +rnd().toFixed(4), 0]);
  for (let x = -5000; x < -1000; x += 190 + rnd() * 180) P(['pine', 'pine', 'oak', 'maple', 'sakura'][Math.floor(rnd() * 5)], x, +(0.7 + rnd() * 0.3).toFixed(2));
  P('palm', -820); P('palm', 680, 0.9);
  [['sakura', 900], ['appletree', 1180], ['oak', 5250, 0.8], ['maple', 4600, 0.9], ['appletree', 1550, 0.85]].forEach(([sp, x, g]) => P(sp, x, g ?? 1));
  [['sunflower', 6380], ['sunflower', 6450, 0.5], ['tulip', 6540], ['rose', 6600, 0.3], ['hibiscus', 6250], ['daisy', 6700, 0.1], ['hyacinth', 6200, 0.6], ['tulip', 6150, 0.12], ['blossom', 6760]].forEach(([sp, x, g]) => P(sp, x, g ?? 1));
  P('oak', 6720, 0.9); P('lotus', 7150); P('lotus', 7420, 0.6); P('lotus', 7600);
  for (let x = 9300; x < 12400; x += 420 + rnd() * 380) P(['palm', 'pine', 'sunflower', 'daisy'][Math.floor(rnd() * 4)], x);
  P('pine', 8200); P('pine', 8350, 0.8);
  for (let x = 1400; x < 9000; x += 260 + rnd() * 320) P(['tulip', 'daisy', 'rose', 'hibiscus', 'hyacinth', 'blossom', 'sunflower'][Math.floor(rnd() * 7)], x, +(0.5 + rnd() * 0.5).toFixed(2));
  // the old potted plants in the weather corner become planted in the ground
  for (let i = items.length - 1; i >= 0; i--) if (items[i].type === 'plant') { P('sunflower', items[i].x, 0.3); items.splice(i, 1); }

  return { version: 3, gravity: 'on', cam: null, world: { clock: { season: 1, speed: 1 } }, terrain: t.serialize(), water: w.serialize(), flora, links, items };
}
