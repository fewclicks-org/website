// Item art in one clean flat style. Most items are Twemoji graphics (CC-BY 4.0, copied into art/tw so
// nothing is fetched from anywhere else). Water devices, fan, wind sock, clock, dice and spinner are
// drawn here in the same flat style: flat fills, no outlines, the Twemoji palette.
// Devices declare ANCHORS (spout, ports) in their own viewBox so water and pipes attach exactly.

const P = { red: '#DD2E44', dred: '#BE1931', yel: '#FFCC4D', org: '#F4900C', grn: '#77B255', dgrn: '#5C913B', ddgrn: '#3E721D', blu: '#55ACEE', dblu: '#3B88C3', ddblu: '#2A6797', gry: '#99AAB5', dgry: '#66757F', lgry: '#CCD6DD', xlgry: '#E1E8ED', ink: '#292F33', brn: '#C1694F', dbrn: '#662113', wht: '#FFFFFF' };
const S = (body, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

export const twUrl = (name) => `art/tw/${name}.svg`;
/** <img> for a Twemoji graphic. */
export const tw = (name, cls = '') => `<img class="tw ${cls}" src="${twUrl(name)}" alt="" draggable="false">`;

// ---------------- stickers ----------------
const pill = (t, bg, fg = '#fff') => S(`<rect x="1" y="9" width="34" height="18" rx="9" fill="${bg}"/><rect x="1" y="9" width="34" height="9" rx="9" fill="#fff" opacity=".18"/><text x="18" y="22.6" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="${t.length > 3 ? 8.6 : 11}" fill="${fg}">${t}</text>`, '0 0 36 36');
const TW_STICKERS = ['star', 'heart', 'rainbow', 'bolt', 'fire', 'crown', 'pad', 'joystick', 'rocket', 'planet', 'cloud', 'sparkle', 'smile', 'mushroom', 'cat', 'dice', 'coin', 'pizza', 'ghost', 'alien', 'gem', 'trophy', 'music', 'ufo', 'potion', 'sword', 'shield', 'key', 'bomb', 'donut', 'icecream', 'cherry', 'blossom', 'leaf', 'moon', 'party', 'target', 'puzzle', 'unicorn', 'frog', 'penguin', 'earth', 'gift', 'clover', 'butterfly', 'bee', 'dog', 'fox', 'owl', 'ladybug', 'snail', 'fish', 'bird', 'tulip', 'sunflower', 'rose', 'maple'];
export const STICKERS = Object.fromEntries(TW_STICKERS.map((k) => [k, tw(k === 'dice' ? 'dice' : k === 'flower' ? 'blossom' : k)]));
Object.assign(STICKERS, {
  flower: tw('blossom'),
  wow: pill('WOW', P.red), gg: pill('GG', P.grn), lol: pill('LOL', P.org), newtag: pill('NEW!', P.dred), oneup: pill('1UP', P.dblu), win: pill('WIN', '#9266CC'), omg: pill('OMG', P.org), hi: pill('HI!', '#F4ABBA', P.ink), play: pill('PLAY', P.ink),
});
export const STICKER_GROUPS = {
  Games: ['pad', 'joystick', 'dice', 'coin', 'trophy', 'gem', 'key', 'sword', 'shield', 'potion', 'bomb', 'target', 'puzzle', 'rocket', 'ufo', 'alien', 'ghost', 'mushroom', 'gift', 'party'],
  Fun: ['smile', 'star', 'heart', 'fire', 'bolt', 'sparkle', 'crown', 'music', 'rainbow', 'cloud', 'moon', 'planet', 'earth', 'unicorn', 'cat', 'dog', 'fox', 'owl', 'frog', 'penguin', 'bee', 'butterfly', 'ladybug', 'snail', 'fish', 'bird'],
  Food: ['pizza', 'donut', 'icecream', 'cherry'],
  Nature: ['blossom', 'tulip', 'sunflower', 'rose', 'clover', 'leaf', 'maple'],
  Words: ['wow', 'gg', 'lol', 'newtag', 'oneup', 'win', 'omg', 'hi', 'play'],
};

// ---------------- objects (Twemoji) ----------------
const PIN = S(`<circle cx="20" cy="15" r="11" fill="${P.red}"/><circle cx="16.5" cy="11.5" r="3.5" fill="#fff" opacity=".55"/><rect x="18.6" y="24" width="2.8" height="13" rx="1.4" fill="${P.dgry}"/>`, '0 0 40 40');
// Twemoji torch, flipped and turned 45deg so the beam points along +x (lens on the right, rays beyond it)
const TORCH = `<svg viewBox="0 0 45.5 17" aria-hidden="true"><g transform="translate(5 -9.5) rotate(45 18 18) translate(36 0) scale(-1 1)"><path fill="#66757F" d="m23 17 1-1s1-1 2 0l2 2s1 1 0 2l-1 1-4-4z"/><path fill="#8899A6" d="M34.879 27.879a3.01 3.01 0 0 1 0 4.242l-2.758 2.758a3.01 3.01 0 0 1-4.242 0L9.121 16.121a3.008 3.008 0 0 1 0-4.242l2.758-2.758a3.008 3.008 0 0 1 4.242 0l18.758 18.758z"/><path fill="#66757F" d="M20.879 10.879a3.01 3.01 0 0 1 0 4.242l-5.758 5.758a3.01 3.01 0 0 1-4.242 0L6 16s-1-1 0-2l8-8c1-1 2 0 2 0l4.879 4.879z"/><path fill="#8899A6" d="M7 17 17 7l2 2L9 19z"/><path fill="#FFCC4D" d="M11.001 6a1 1 0 0 1-.896-.553l-2-4a1.001 1.001 0 0 1 1.79-.895l2 4A1 1 0 0 1 11.001 6zm-6.002 6a.99.99 0 0 1-.446-.106l-4-2a1 1 0 1 1 .894-1.788l4 2A1 1 0 0 1 4.999 12zM8 9a.997.997 0 0 1-.707-.293l-4-4a.999.999 0 1 1 1.414-1.414l4 4A.999.999 0 0 1 8 9z"/></g></svg>`;
export const OBJECTS = {
  sun: tw('sun'), lamp: tw('lamp'), torch: TORCH, ball: tw('ball'), balloon: tw('balloon'), camera: tw('camera'),
  pin: PIN,
};
export const cloudSvg = (mode = 'rain') => tw({ rain: 'rain', snow: 'snowcloud', storm: 'storm', none: 'cloud' }[mode] || 'cloud');
/** The cloud as it floats in the world: a plain Twemoji cloud, tinted by weather (real rain falls from it). */
export const cloudWorldSvg = (mode = 'rain') => `<svg class="cl-${mode}" viewBox="0 1 36 31" aria-hidden="true"><path fill="#CCD6DD" d="M27 8a6.98 6.98 0 0 0-2.015.298c.005-.1.015-.197.015-.298a5.998 5.998 0 0 0-11.785-1.573A5.974 5.974 0 0 0 11 6a6 6 0 1 0 0 12 5.998 5.998 0 0 0 5.785-4.428A5.975 5.975 0 0 0 19 14c.375 0 .74-.039 1.096-.104-.058.36-.096.727-.096 1.104 0 3.865 3.135 7 7 7s7-3.135 7-7a7 7 0 0 0-7-7z"/><path fill="#E1E8ED" d="M31 22c-.467 0-.91.085-1.339.204.216-.526.339-1.1.339-1.704a4.5 4.5 0 0 0-4.5-4.5 4.459 4.459 0 0 0-2.701.921A6.497 6.497 0 0 0 16.5 12a6.497 6.497 0 0 0-6.131 4.357A8 8 0 1 0 8 32h23c2.762 0 5-2.238 5-5s-2.238-5-5-5z"/></svg>`;
export const fireSvg = () => `<div class="campfire">${tw('fire', 'flame')}${tw('wood', 'logs')}</div>`;
export const magnetSvg = () => tw('magnet');
export const duckSvg = () => tw('duck');
export const clipSvg = () => tw('clip');
export const iceSvg = () => tw('ice');
export const coinSvg = () => tw('coin');
export const extinguisherSvg = () => tw('extinguisher');
export const bucketSvg = () => tw('bucket');
export const flagSvg = () => tw('flag', 'cloth');
export const kiteSvg = () => tw('kite');
const FRUIT = { apple: 'apple', orange: 'orange', peach: 'peach', strawberry: 'strawberry', cherry: 'cherries' };
export const fruitSvg = (kind = 'apple') => tw(FRUIT[kind] || 'apple');
// legacy potted plants
export const potSvg = () => '';
export const plantSvg = (species = 'flower') => tw({ cactus: 'seedling', sunflower: 'sunflower', flower: 'tulip' }[species] || 'tulip');

// ---------------- custom flat art ----------------
const PIPS = { 1: [[18, 18]], 2: [[11, 11], [25, 25]], 3: [[10, 10], [18, 18], [26, 26]], 4: [[11, 11], [25, 11], [11, 25], [25, 25]], 5: [[10.5, 10.5], [25.5, 10.5], [18, 18], [10.5, 25.5], [25.5, 25.5]], 6: [[11, 9.5], [25, 9.5], [11, 18], [25, 18], [11, 26.5], [25, 26.5]] };
export const diceSvg = (n = 6) => S(`<rect x="2" y="3" width="32" height="32" rx="7" fill="${P.lgry}"/><rect x="2" y="1" width="32" height="32" rx="7" fill="#fff"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y - 1}" r="3" fill="${n === 1 ? P.red : P.ink}"/>`).join('')}`, '0 0 36 36');

export const clockSvg = () => S(`<circle cx="18" cy="18" r="17" fill="${P.dgry}"/><circle cx="18" cy="18" r="14.5" fill="#fff"/>${Array.from({ length: 12 }, (_, i) => `<rect x="17.4" y="4.6" width="1.2" height="${i % 3 ? 1.8 : 3}" rx=".6" fill="${P.gry}" transform="rotate(${i * 30} 18 18)"/>`).join('')}<rect class="hh" x="17" y="9.5" width="2" height="9.5" rx="1" fill="${P.ink}"/><rect class="mm" x="17.35" y="6" width="1.3" height="13" rx=".65" fill="${P.ink}"/><rect class="ss" x="17.7" y="5" width=".6" height="15" rx=".3" fill="${P.red}"/><circle cx="18" cy="18" r="1.6" fill="${P.red}"/>`, '0 0 36 36');

export function spinnerSvg(labels = []) {
  const n = Math.max(2, labels.length), cols = [P.red, P.yel, P.blu, P.grn, '#9266CC', P.org, '#F4ABBA', '#3FCBB5'];
  const seg = (i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, am = (a0 + a1) / 2;
    const p = (a) => `${(50 + Math.cos(a) * 44).toFixed(1)} ${(50 + Math.sin(a) * 44).toFixed(1)}`;
    const tx = (50 + Math.cos(am) * 28).toFixed(1), ty = (50 + Math.sin(am) * 28).toFixed(1);
    return `<path d="M50 50 L${p(a0)} A44 44 0 0 1 ${p(a1)}Z" fill="${cols[i % cols.length]}"/><text x="${tx}" y="${ty}" font-family="Inter, sans-serif" font-weight="800" font-size="6" text-anchor="middle" dominant-baseline="middle" fill="${P.ink}" transform="rotate(${((am * 180) / Math.PI).toFixed(1)} ${tx} ${ty})">${String(labels[i] || i + 1).replace(/[<&>]/g, '').slice(0, 12)}</text>`;
  };
  return S(`<rect x="46" y="92" width="8" height="14" fill="${P.dgry}"/><rect x="30" y="104" width="40" height="6" rx="3" fill="${P.ink}"/><circle cx="50" cy="50" r="48" fill="${P.ink}"/><g class="wheel">${Array.from({ length: n }, (_, i) => seg(i)).join('')}</g><circle cx="50" cy="50" r="6" fill="#fff"/><circle cx="50" cy="50" r="3" fill="${P.ink}"/><path d="M44 0 H56 L50 11Z" fill="${P.red}"/>`, '0 0 100 112');
}

// --- water devices (flat, with anchors) ---
export function tapSvg() {
  return S(`<rect x="0" y="9" width="5" height="16" rx="1.5" fill="${P.gry}"/><rect x="4" y="13.5" width="10" height="7" fill="${P.lgry}"/><rect x="4" y="18" width="10" height="2.5" fill="${P.gry}"/>
    <rect x="12" y="11" width="13" height="11" rx="3.5" fill="${P.lgry}"/><rect x="12" y="17.5" width="13" height="4.5" rx="2" fill="${P.gry}"/>
    <path d="M23 12.5h4.5a5 5 0 0 1 5 5V27h-5v-8.2a1.3 1.3 0 0 0-1.3-1.3H23z" fill="${P.lgry}"/><path d="M27.5 18.8V27h5v-3h-2.6v-4.6z" fill="${P.gry}"/>
    <rect x="27.3" y="26.4" width="5.4" height="2.2" rx=".8" fill="${P.dgry}"/>
    <rect x="16.8" y="6" width="3.4" height="6" fill="${P.gry}"/>
    <g class="valve"><rect x="10.5" y="3" width="16" height="4" rx="2" fill="${P.red}"/><circle cx="18.5" cy="5" r="2.6" fill="${P.dred}"/></g>`, '0 0 36 32');
}
export function tankSvg() {
  return S(`<rect x="7" y="36" width="3.4" height="8" fill="${P.dgry}"/><rect x="25.6" y="36" width="3.4" height="8" fill="${P.dgry}"/>
    <rect x="3" y="5" width="30" height="33" rx="5" fill="${P.dblu}"/><rect x="3" y="5" width="15" height="33" rx="5" fill="${P.blu}" opacity=".45"/>
    <rect x="3" y="15" width="30" height="1.6" fill="${P.ddblu}"/><rect x="3" y="27" width="30" height="1.6" fill="${P.ddblu}"/>
    <rect x="22.5" y="9" width="6" height="25" rx="3" fill="${P.xlgry}"/><rect class="lvl" x="23.4" y="9.9" width="4.2" height="23.2" rx="2.1" fill="${P.blu}"/>
    <ellipse cx="18" cy="5.5" rx="15" ry="3.2" fill="${P.ddblu}"/><rect x="15" y="1" width="6" height="4" rx="1" fill="${P.dgry}"/>
    <rect x="32" y="31" width="4" height="3.4" rx="1" fill="${P.dgry}"/><rect x="6.5" y="8" width="2.4" height="24" rx="1.2" fill="#fff" opacity=".3"/>`, '0 0 36 44');
}
export function boreSvg(pump = 'hand') {
  const base = `<rect x="3" y="38" width="30" height="6" rx="1.5" fill="${P.gry}"/><rect x="3" y="38" width="30" height="2" rx="1" fill="${P.lgry}"/>`;
  if (pump === 'wind') {
    return S(`<path d="M20 12 L8 56 M20 12 L32 56 M13.5 36 H26.5 M11 46 H29 M16 24 H24 M12 46 L26.5 36 M28 46 L13.5 36" stroke="${P.gry}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M22 12 L35 9 L35 15Z" fill="${P.red}"/>
      <g class="rotor">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, b = a + 0.32; return `<path d="M20 12 L${(20 + Math.cos(a) * 11).toFixed(2)} ${(12 + Math.sin(a) * 11).toFixed(2)} L${(20 + Math.cos(b) * 11).toFixed(2)} ${(12 + Math.sin(b) * 11).toFixed(2)}Z" fill="${i % 2 ? P.lgry : P.xlgry}"/>`; }).join('')}<circle cx="20" cy="12" r="2.4" fill="${P.red}"/></g>
      <rect x="16.5" y="47" width="7" height="11" rx="1.5" fill="${P.dgry}"/><path d="M23 49.5h7.5a2 2 0 0 1 2 2V56h-2.6v-3.5H23z" fill="${P.dgry}"/>
      <rect x="4" y="58" width="32" height="6" rx="1.5" fill="${P.gry}"/><rect x="4" y="58" width="32" height="2" rx="1" fill="${P.lgry}"/>`, '0 0 40 64');
  }
  if (pump === 'solar') {
    return S(`<rect x="17" y="12" width="2.4" height="20" fill="${P.dgry}"/>
      <g transform="rotate(-18 18 9)"><rect x="3" y="2" width="30" height="13" rx="1.5" fill="${P.ddblu}"/>${[0, 1, 2, 3].map((i) => `<rect x="${4.4 + i * 7.2}" y="3.4" width="6.4" height="4.6" fill="${P.dblu}"/><rect x="${4.4 + i * 7.2}" y="9" width="6.4" height="4.6" fill="${P.dblu}"/>`).join('')}<rect x="3" y="2" width="30" height="2" fill="#fff" opacity=".25"/></g>
      <rect x="9" y="29" width="16" height="10" rx="2.5" fill="${P.lgry}"/><circle class="led" cx="13" cy="34" r="1.5" fill="${P.grn}"/>
      <path d="M24 31h6.5a2 2 0 0 1 2 2v4h-2.6v-3.4H24z" fill="${P.gry}"/>${base}`, '0 0 36 44');
  }
  return S(`<g class="handle"><path d="M13 12 L2.5 6.2 L3.8 4 L14 9.6Z" fill="${P.ink}"/><circle cx="2.8" cy="5" r="2.4" fill="${P.red}"/></g>
    <rect x="11" y="8.5" width="12" height="4.5" rx="2" fill="${P.ddgrn}"/>
    <rect x="12.5" y="12" width="9" height="27" rx="2" fill="${P.dgrn}"/><rect x="14" y="13" width="2.4" height="25" rx="1.2" fill="${P.grn}"/>
    <path d="M21 16.5h6.5a3.5 3.5 0 0 1 3.5 3.5v3.2h-3.2v-2.4a1 1 0 0 0-1-1H21z" fill="${P.dgrn}"/><rect x="27.6" y="22.7" width="3.6" height="1.6" rx=".6" fill="${P.ddgrn}"/>
    ${base}`, '0 0 36 44');
}
export const sprinklerSvg = () => S(`<ellipse cx="18" cy="33.5" rx="9" ry="2.3" fill="${P.gry}"/><rect x="16.4" y="19" width="3.2" height="14" fill="${P.dgry}"/>
  <g class="head"><rect x="9" y="14" width="18" height="6" rx="3" fill="${P.grn}"/><rect x="9" y="17" width="18" height="3" rx="1.5" fill="${P.dgrn}"/><circle cx="18" cy="13.6" r="3.2" fill="${P.dgrn}"/><circle cx="10.6" cy="17" r="1.3" fill="${P.ddgrn}"/><circle cx="25.4" cy="17" r="1.3" fill="${P.ddgrn}"/></g>`, '0 0 36 36');
export const canSvg = () => S(`<path d="M10 9 C10 2 23 2 23 9" fill="none" stroke="${P.ddgrn}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M25 17 L36 6.5 L38 8.6 L27 21z" fill="${P.grn}"/>
  <rect x="8" y="8" width="18" height="19" rx="3" fill="${P.grn}"/><rect x="8" y="20" width="18" height="7" rx="3" fill="${P.dgrn}"/><rect x="10.5" y="10" width="2.6" height="12" rx="1.3" fill="#fff" opacity=".3"/>
  <circle cx="37.6" cy="6.6" r="2.8" fill="${P.lgry}"/><circle cx="38.4" cy="5.8" r="1.2" fill="${P.gry}"/>`, '0 0 41 30');
export const fanSvg = () => S(`<ellipse cx="18" cy="38" rx="10" ry="2.4" fill="${P.dgry}"/><rect x="16.6" y="27" width="2.8" height="11" fill="${P.gry}"/>
  <circle cx="18" cy="15" r="14" fill="${P.xlgry}"/><circle cx="18" cy="15" r="12" fill="#fff"/>
  <g class="blades">${[0, 120, 240].map((r) => `<ellipse cx="18" cy="8.6" rx="3.6" ry="6.4" fill="${P.blu}" transform="rotate(${r} 18 15)"/>`).join('')}</g>
  <circle cx="18" cy="15" r="2.6" fill="${P.dblu}"/><circle cx="18" cy="15" r="14" fill="none" stroke="${P.gry}" stroke-width="1.4"/>`, '0 0 36 41');
export const windsockSvg = () => S(`<rect x="3" y="2" width="2.2" height="42" rx="1.1" fill="${P.dgry}"/><circle cx="4.1" cy="2.4" r="1.8" fill="${P.yel}"/>
  <g class="sock">${[0, 1, 2, 3].map((i) => { const x0 = 5 + i * 8, x1 = x0 + 8, t0 = 2.2 - i * 0.5, t1 = 2.2 - (i + 1) * 0.5; return `<path d="M${x0} ${4 + (2.2 - t0)} L${x1} ${4 + (2.2 - t1)} L${x1} ${12 - (2.2 - t1)} L${x0} ${12 - (2.2 - t0)}Z" fill="${i % 2 ? '#fff' : P.org}"/>`; }).join('')}</g>`, '0 0 40 44');

/**
 * Anchor points (in viewBox units) + viewBox size for devices: spout = where water comes out,
 * inlet/outlet = pipe ports.
 */
export const ANCHORS = {
  torch: { vb: [45.5, 17], lens: [32, 8.5] },
  tap: { vb: [36, 32], spout: [30, 28.5], inlet: [0.5, 17] },
  tank: { vb: [36, 44], inlet: [18, 1], outlet: [36, 32.7], spout: [36, 32.7] },
  bore_hand: { vb: [36, 44], spout: [29.4, 24.2], outlet: [33, 41] },
  bore_wind: { vb: [40, 64], spout: [31.2, 56], outlet: [36, 61] },
  bore_solar: { vb: [36, 44], spout: [31.2, 37], outlet: [33, 41] },
  sprinkler: { vb: [36, 36], spout: [18, 12], inlet: [18, 35] },
  can: { vb: [41, 30], spout: [38.4, 6] },
  bucket: { vb: [36, 36], spout: [33, 9] },
};
export const anchorKey = (it) => (it.type === 'bore' ? `bore_${it.d?.pump || 'hand'}` : it.type);
