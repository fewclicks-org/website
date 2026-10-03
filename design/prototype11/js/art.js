// Colorful sticker + object art (inline SVG, drawn in code) and monochrome UI icons.
// Stickers are the only color on the board besides photos.

const S = (body, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
const outline = 'stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const word = (t, c, fs) => S(`<rect x="6" y="26" width="88" height="48" rx="14" fill="${c}" ${outline} transform="rotate(-6 50 50)"/><text x="50" y="${50 + fs * 0.36}" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="${fs}" fill="${c === '#111' || c === '#7b5cff' ? '#fff' : '#111'}" transform="rotate(-6 50 50)">${t}</text>`);

export const STICKERS = {
  star: S(`<path d="M50 6 L62 37 L95 38 L69 58 L78 91 L50 72 L22 91 L31 58 L5 38 L38 37Z" fill="#ffd23f" ${outline}/><circle cx="40" cy="50" r="4" fill="#111"/><circle cx="60" cy="50" r="4" fill="#111"/><path d="M42 62 Q50 70 58 62" fill="none" ${outline}/>`),
  heart: S(`<path d="M50 88 C10 60 6 32 24 20 C38 11 48 20 50 28 C52 20 62 11 76 20 C94 32 90 60 50 88Z" fill="#ff4d6d" ${outline}/><ellipse cx="34" cy="32" rx="7" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 34 32)"/>`),
  rainbow: S(`<path d="M8 72 A42 42 0 0 1 92 72" fill="none" stroke="#ff4d4d" stroke-width="10"/><path d="M18 72 A32 32 0 0 1 82 72" fill="none" stroke="#ffb020" stroke-width="10"/><path d="M28 72 A22 22 0 0 1 72 72" fill="none" stroke="#2fd66b" stroke-width="10"/><path d="M38 72 A12 12 0 0 1 62 72" fill="none" stroke="#4c7dff" stroke-width="10"/><ellipse cx="14" cy="76" rx="14" ry="10" fill="#fff" ${outline}/><ellipse cx="86" cy="76" rx="14" ry="10" fill="#fff" ${outline}/>`),
  bolt: S(`<path d="M58 4 L18 56 H46 L36 96 L82 38 H54Z" fill="#ffe14d" ${outline}/>`),
  fire: S(`<path d="M50 94 C24 94 14 74 20 56 C26 40 40 34 38 10 C56 22 66 38 62 52 C68 48 70 40 70 34 C84 50 86 68 80 78 C74 90 64 94 50 94Z" fill="#ff7a1a" ${outline}/><path d="M50 90 C38 90 34 80 38 70 C42 62 48 60 48 50 C58 58 62 66 60 74 C64 72 66 68 66 66 C70 76 66 90 50 90Z" fill="#ffd23f"/>`),
  crown: S(`<path d="M12 74 L8 28 L32 48 L50 18 L68 48 L92 28 L88 74Z" fill="#ffc83d" ${outline}/><rect x="12" y="74" width="76" height="14" rx="4" fill="#ffb020" ${outline}/><circle cx="50" cy="56" r="7" fill="#ff4d6d" ${outline}/>`),
  pad: S(`<path d="M20 34 H80 C94 34 98 50 96 64 C94 80 82 86 72 76 L64 68 H36 L28 76 C18 86 6 80 4 64 C2 50 6 34 20 34Z" fill="#7b5cff" ${outline}/><path d="M24 46 V60 M17 53 H31" ${outline} fill="none" stroke="#fff"/><circle cx="72" cy="48" r="5" fill="#ffd23f"/><circle cx="82" cy="58" r="5" fill="#2fd6a6"/><circle cx="62" cy="58" r="5" fill="#ff4d6d"/>`),
  rocket: S(`<g transform="rotate(35 50 50)"><path d="M50 6 C66 20 68 50 62 72 H38 C32 50 34 20 50 6Z" fill="#f4f1ff" ${outline}/><path d="M38 60 L24 78 L38 74Z M62 60 L76 78 L62 74Z" fill="#ff4d6d" ${outline}/><circle cx="50" cy="38" r="8" fill="#4cc9ff" ${outline}/><path d="M42 74 Q50 98 58 74Z" fill="#ff8a3d"/></g>`),
  planet: S(`<circle cx="50" cy="50" r="28" fill="#ff8a3d" ${outline}/><ellipse cx="50" cy="52" rx="46" ry="12" fill="none" stroke="#ffd23f" stroke-width="7" transform="rotate(-18 50 52)"/><circle cx="42" cy="42" r="5" fill="#ffb27a"/>`),
  cloud: S(`<path d="M24 74 C8 74 6 54 20 50 C18 34 38 28 46 38 C52 22 78 24 78 44 C94 44 96 74 78 74Z" fill="#fff" ${outline}/><circle cx="42" cy="58" r="3.5" fill="#111"/><circle cx="62" cy="58" r="3.5" fill="#111"/><path d="M47 64 Q52 68 57 64" fill="none" ${outline}/><ellipse cx="36" cy="64" rx="5" ry="3" fill="#ff8fb1"/><ellipse cx="68" cy="64" rx="5" ry="3" fill="#ff8fb1"/>`),
  sparkle: S(`<path d="M50 4 Q56 44 96 50 Q56 56 50 96 Q44 56 4 50 Q44 44 50 4Z" fill="#4cc9ff" ${outline}/><path d="M80 10 Q82 20 92 22 Q82 24 80 34 Q78 24 68 22 Q78 20 80 10Z" fill="#ffd23f" ${outline}/>`),
  wow: S(`<path d="M50 4 L60 22 L80 12 L78 34 L98 40 L82 54 L94 72 L72 72 L70 94 L54 80 L38 96 L34 74 L12 78 L22 58 L4 46 L24 38 L18 16 L38 24Z" fill="#ff2d75" ${outline}/><text x="50" y="58" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="22" fill="#fff" stroke="#111" stroke-width="2" paint-order="stroke">WOW</text>`),
  smile: S(`<circle cx="50" cy="50" r="42" fill="#ffd23f" ${outline}/><circle cx="36" cy="42" r="5" fill="#111"/><circle cx="64" cy="42" r="5" fill="#111"/><path d="M30 58 Q50 80 70 58" fill="none" ${outline} stroke-width="4"/>`),
  mushroom: S(`<path d="M8 50 C8 18 92 18 92 50 C92 58 8 58 8 50Z" fill="#ff4d4d" ${outline}/><circle cx="30" cy="36" r="7" fill="#fff"/><circle cx="62" cy="30" r="8" fill="#fff"/><circle cx="78" cy="44" r="5" fill="#fff"/><path d="M32 56 H68 V82 C68 92 32 92 32 82Z" fill="#fff5e6" ${outline}/><circle cx="43" cy="70" r="3" fill="#111"/><circle cx="57" cy="70" r="3" fill="#111"/>`),
  cat: S(`<path d="M18 30 L24 8 L40 24 H60 L76 8 L82 30 C90 44 88 70 74 82 C62 92 38 92 26 82 C12 70 10 44 18 30Z" fill="#ff9e3d" ${outline}/><circle cx="38" cy="52" r="5" fill="#111"/><circle cx="62" cy="52" r="5" fill="#111"/><path d="M46 62 L54 62 L50 67Z" fill="#ff4d6d"/><path d="M50 67 Q44 74 40 70 M50 67 Q56 74 60 70" fill="none" ${outline} stroke-width="2.5"/>`),
  dice: S(`<rect x="12" y="12" width="76" height="76" rx="16" fill="#fff" ${outline}/><circle cx="32" cy="32" r="7" fill="#7b5cff"/><circle cx="68" cy="32" r="7" fill="#7b5cff"/><circle cx="50" cy="50" r="7" fill="#ff4d6d"/><circle cx="32" cy="68" r="7" fill="#7b5cff"/><circle cx="68" cy="68" r="7" fill="#7b5cff"/>`),
  coin: S(`<circle cx="50" cy="50" r="40" fill="#ffc83d" ${outline}/><circle cx="50" cy="50" r="28" fill="none" stroke="#e0a100" stroke-width="5"/><text x="50" y="62" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="34" fill="#b37400">F</text>`),
  ghost: S(`<path d="M18 92 V44 C18 18 82 18 82 44 V92 L71 82 L60 92 L50 82 L40 92 L29 82Z" fill="#f4f1ff" ${outline}/><circle cx="38" cy="46" r="6" fill="#111"/><circle cx="62" cy="46" r="6" fill="#111"/><ellipse cx="50" cy="62" rx="6" ry="8" fill="#111"/>`),
  alien: S(`<ellipse cx="50" cy="52" rx="34" ry="40" fill="#5be38a" ${outline}/><ellipse cx="36" cy="48" rx="10" ry="14" fill="#111" transform="rotate(-20 36 48)"/><ellipse cx="64" cy="48" rx="10" ry="14" fill="#111" transform="rotate(20 64 48)"/><path d="M42 74 Q50 79 58 74" fill="none" ${outline}/><path d="M38 14 L30 2 M62 14 L70 2" ${outline}/>`),
  gem: S(`<path d="M24 14 H76 L94 38 L50 92 L6 38Z" fill="#3fd0ff" ${outline}/><path d="M6 38 H94 M24 14 L36 38 L50 92 L64 38 L76 14 M36 38 L50 14 L64 38" fill="none" ${outline} stroke-width="2"/>`),
  trophy: S(`<path d="M26 10 H74 V38 C74 56 62 64 50 64 C38 64 26 56 26 38Z" fill="#ffc83d" ${outline}/><path d="M26 18 H10 C10 36 18 42 28 44 M74 18 H90 C90 36 82 42 72 44" fill="none" ${outline}/><rect x="42" y="64" width="16" height="14" fill="#ffb020" ${outline}/><rect x="28" y="78" width="44" height="14" rx="4" fill="#7b5cff" ${outline}/><path d="M50 22 L54 32 L64 32 L56 38 L59 48 L50 42 L41 48 L44 38 L36 32 L46 32Z" fill="#fff"/>`),
  music: S(`<path d="M36 76 V22 L84 12 V64" fill="none" ${outline} stroke-width="6"/><ellipse cx="26" cy="78" rx="14" ry="11" fill="#ff4d6d" ${outline}/><ellipse cx="74" cy="66" rx="14" ry="11" fill="#4c7dff" ${outline}/><path d="M36 34 L84 24" ${outline} stroke-width="6"/>`),
  ufo: S(`<ellipse cx="50" cy="40" rx="20" ry="18" fill="#bfefff" ${outline}/><ellipse cx="50" cy="56" rx="44" ry="14" fill="#9b8cff" ${outline}/><circle cx="26" cy="58" r="4" fill="#ffd23f"/><circle cx="50" cy="62" r="4" fill="#ffd23f"/><circle cx="74" cy="58" r="4" fill="#ffd23f"/><path d="M36 72 L26 94 H74 L64 72" fill="#fff6a8" opacity=".7"/>`),
  potion: S(`<path d="M40 8 H60 V30 C80 38 86 56 80 72 C74 90 26 90 20 72 C14 56 20 38 40 30Z" fill="#ff5fd2" ${outline}/><rect x="36" y="4" width="28" height="10" rx="3" fill="#c98a4b" ${outline}/><circle cx="40" cy="62" r="6" fill="#fff" opacity=".6"/><circle cx="58" cy="52" r="4" fill="#fff" opacity=".6"/>`),
  sword: S(`<g transform="rotate(45 50 50)"><path d="M44 4 H56 V66 H44Z" fill="#dfe6ee" ${outline}/><path d="M44 4 L50 -4 L56 4" fill="#dfe6ee" ${outline}/><rect x="30" y="66" width="40" height="8" rx="3" fill="#ffc83d" ${outline}/><rect x="45" y="74" width="10" height="18" fill="#7a4b2a" ${outline}/></g>`),
  shield: S(`<path d="M50 6 L88 18 V48 C88 72 70 88 50 96 C30 88 12 72 12 48 V18Z" fill="#4c7dff" ${outline}/><path d="M50 18 L76 26 V48 C76 64 64 76 50 82Z" fill="#ffd23f"/>`),
  key: S(`<circle cx="30" cy="50" r="20" fill="#ffc83d" ${outline}/><circle cx="30" cy="50" r="8" fill="#fff" ${outline}/><path d="M50 50 H94 V62 H84 V56 H74 V64 H64 V56 H50" fill="#ffc83d" ${outline}/>`),
  bomb: S(`<circle cx="46" cy="58" r="34" fill="#2b2b2b" ${outline}/><rect x="56" y="16" width="16" height="14" rx="3" fill="#777" ${outline} transform="rotate(30 64 23)"/><path d="M70 18 Q80 6 90 12" fill="none" ${outline}/><path d="M88 4 L92 12 L98 8" stroke="#ff8a1a" stroke-width="4" fill="none"/><circle cx="34" cy="46" r="7" fill="#fff" opacity=".35"/>`),
  donut: S(`<circle cx="50" cy="50" r="42" fill="#e3a35f" ${outline}/><path d="M12 46 C14 22 36 10 50 10 C70 10 88 24 88 46 C80 40 72 50 64 44 C56 38 48 50 40 44 C30 38 22 52 12 46Z" fill="#ff7ab8" ${outline}/><circle cx="50" cy="50" r="12" fill="#fff" ${outline}/><path d="M30 28 l4 4 M60 22 l-3 5 M72 36 l5 1 M40 22 l1 5" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  icecream: S(`<path d="M30 46 L50 96 L70 46Z" fill="#e8b46a" ${outline}/><circle cx="38" cy="38" r="16" fill="#ff9ec7" ${outline}/><circle cx="62" cy="38" r="16" fill="#7fe0c3" ${outline}/><circle cx="50" cy="22" r="16" fill="#fff3b0" ${outline}/><circle cx="50" cy="8" r="5" fill="#ff3b30" ${outline}/>`),
  cherry: S(`<path d="M34 64 Q44 30 70 10 M66 62 Q64 32 70 10" fill="none" stroke="#2f7a3a" stroke-width="4"/><path d="M70 10 C82 10 88 22 80 28 C72 20 66 18 70 10Z" fill="#5be38a" ${outline}/><circle cx="32" cy="72" r="18" fill="#ff3b4e" ${outline}/><circle cx="66" cy="72" r="18" fill="#ff3b4e" ${outline}/><circle cx="26" cy="66" r="4" fill="#fff" opacity=".7"/>`),
  flower: S(`${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="50" cy="26" rx="14" ry="22" fill="#ff8fb1" ${outline} transform="rotate(${r} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="14" fill="#ffd23f" ${outline}/>`),
  leaf: S(`<path d="M14 86 C10 40 40 10 90 10 C90 60 60 90 14 86Z" fill="#5be38a" ${outline}/><path d="M14 86 C40 60 60 40 78 22" fill="none" ${outline}/>`),
  moon: S(`<path d="M64 8 C36 12 18 36 22 62 C26 86 54 98 78 88 C52 84 38 62 42 40 C46 22 56 12 64 8Z" fill="#ffe680" ${outline}/><circle cx="40" cy="54" r="3.5" fill="#111"/><path d="M40 66 Q46 70 52 66" fill="none" ${outline} stroke-width="2.5"/>`),
  joystick: S(`<rect x="12" y="62" width="76" height="26" rx="8" fill="#2b2b2b" ${outline}/><path d="M46 62 V30 H54 V62" fill="#999" ${outline}/><circle cx="50" cy="24" r="14" fill="#ff3b30" ${outline}/><circle cx="74" cy="74" r="6" fill="#ffd23f"/><circle cx="26" cy="74" r="6" fill="#4cc9ff"/>`),
  gg: word('GG', '#2fd66b', 34),
  lol: word('LOL', '#ffd23f', 34),
  newtag: word('NEW!', '#ff3b30', 26),
  oneup: word('1UP', '#4cc9ff', 34),
  win: word('WIN', '#7b5cff', 34),
  omg: word('OMG', '#ff8a1a', 34),
  hi: word('HI!', '#ff7ab8', 34),
  play: word('PLAY', '#111', 26),
  pizza: S(`<path d="M50 94 L10 16 C34 4 66 4 90 16Z" fill="#ffc94d" ${outline}/><path d="M10 16 C34 4 66 4 90 16 L86 24 C64 14 36 14 14 24Z" fill="#d98b3a"/><circle cx="40" cy="36" r="7" fill="#e8413c"/><circle cx="60" cy="44" r="7" fill="#e8413c"/><circle cx="50" cy="66" r="6" fill="#e8413c"/>`),
};

// Light + toy objects (also colored, they are "physical stickers")
export const OBJECTS = {
  sun: S(`<g>${Array.from({ length: 12 }, (_, i) => `<path d="M50 50 L${50 + Math.cos((i / 12) * 6.283) * 48} ${50 + Math.sin((i / 12) * 6.283) * 48}" stroke="#ffb020" stroke-width="6" stroke-linecap="round"/>`).join('')}</g><circle cx="50" cy="50" r="28" fill="#ffd23f" ${outline}/><circle cx="41" cy="46" r="3.5" fill="#111"/><circle cx="59" cy="46" r="3.5" fill="#111"/><path d="M40 57 Q50 66 60 57" fill="none" ${outline}/>`),
  lamp: S(`<path d="M50 0 V26" stroke="#111" stroke-width="3"/><path d="M26 58 C26 38 74 38 74 58Z" fill="#2a2a2a" ${outline}/><rect x="44" y="26" width="12" height="14" fill="#2a2a2a" ${outline}/><circle cx="50" cy="66" r="10" fill="#fff6c2" ${outline}/>`, '0 0 100 80'),
  torch: S(`<rect x="6" y="38" width="56" height="24" rx="8" fill="#3a3a3a" ${outline}/><path d="M62 34 L88 22 V78 L62 66Z" fill="#c9c9c9" ${outline}/><rect x="20" y="44" width="10" height="12" rx="3" fill="#ff4d4d"/><path d="M88 30 V70" stroke="#fff6c2" stroke-width="6"/>`),
  ball: S(`<circle cx="50" cy="50" r="44" fill="#fff" ${outline}/><path d="M50 6 C30 30 30 70 50 94" fill="#ff4d4d" stroke="#111" stroke-width="3"/><path d="M50 6 C70 30 70 70 50 94" fill="#4c7dff" stroke="#111" stroke-width="3"/><path d="M8 40 C30 50 70 50 92 40" fill="none" stroke="#ffd23f" stroke-width="8"/><circle cx="50" cy="50" r="44" fill="none" ${outline}/>`),
  balloon: S(`<path d="M50 4 C76 4 88 26 84 48 C80 70 62 80 50 82 C38 80 20 70 16 48 C12 26 24 4 50 4Z" fill="#ff2d55" ${outline}/><path d="M44 82 L56 82 L50 90Z" fill="#ff2d55" ${outline}/><path d="M50 90 C40 100 60 110 48 124" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="36" cy="26" rx="7" ry="12" fill="#fff" opacity=".6" transform="rotate(25 36 26)"/>`, '0 0 100 126'),
  camera: S(`<rect x="6" y="22" width="88" height="62" rx="10" fill="#f4f1ea" ${outline}/><rect x="6" y="22" width="88" height="16" rx="8" fill="#ff5a5a" ${outline}/><circle cx="50" cy="56" r="20" fill="#222" ${outline}/><circle cx="50" cy="56" r="11" fill="#4c7dff"/><circle cx="45" cy="51" r="4" fill="#fff" opacity=".8"/><rect x="70" y="10" width="16" height="12" rx="3" fill="#333" ${outline}/><rect x="14" y="74" width="24" height="5" fill="#111"/>`),
  pin: S(`<circle cx="20" cy="16" r="12" fill="#ff3b30" stroke="#111" stroke-width="2.5"/><circle cx="16" cy="12" r="3.5" fill="#fff" opacity=".7"/><path d="M20 28 V40" stroke="#555" stroke-width="3" stroke-linecap="round"/>`, '0 0 40 40'),
};

// Monochrome UI icons (stroke = currentColor)
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;
export const ICONS = {
  hand: I('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5"/><path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3.5 13.8a1.6 1.6 0 0 1 2.6-1.8L8 14"/>'),
  text: I('<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>'),
  sticker: I('<path d="M15.5 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h7l8-8V6a3 3 0 0 0-3-3"/><path d="M13 21v-5a3 3 0 0 1 3-3h5"/>'),
  photo: I('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>'),
  note: I('<path d="M5 3h14v12l-6 6H5z"/><path d="M13 21v-6h6"/>'),
  pen: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  lamp: I('<path d="M12 2v5"/><path d="M6 14a6 6 0 0 1 12 0z"/><path d="M10 17a2 2 0 0 0 4 0"/>'),
  torch: I('<path d="M4 10h9v4H4z"/><path d="M13 9l6-4v14l-6-4"/><path d="M21 9v6"/>'),
  ball: I('<circle cx="12" cy="12" r="9"/><path d="M12 3c-3 4-3 14 0 18M3 12h18"/>'),
  balloon: I('<path d="M12 3c4 0 6 3 6 6.5S15 16 12 17c-3-1-6-4-6-7.5S8 3 12 3z"/><path d="M12 17v4c0 1-1 1.5-2 1"/>'),
  camera: I('<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>'),
  undo: I('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: I('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  minus: I('<path d="M5 12h14"/>'),
  fit: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  download: I('<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>'),
  upload: I('<path d="M12 20V9M7 14l5-5 5 5"/><path d="M5 4h14"/>'),
  reset: I('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  pin: I('<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/>'),
  lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
  rotL: I('<path d="M4 4v6h6"/><path d="M4.5 10A8 8 0 1 1 6 17"/>'),
  rotR: I('<path d="M20 4v6h-6"/><path d="M19.5 10A8 8 0 1 0 18 17"/>'),
  bigger: I('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  smaller: I('<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>'),
  front: I('<rect x="4" y="9" width="11" height="11" rx="2" opacity=".45"/><rect x="9" y="4" width="11" height="11" rx="2" fill="currentColor" fill-opacity=".25"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>'),
  trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  font: I('<path d="M4 20l6-16h1l6 16M7 14h7"/><path d="M18 20h3"/>'),
  invert: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>'),
  flash: I('<path d="M9 3h6l-1 6h4l-8 12 2-9H8z"/>'),
  gravity: I('<path d="M12 3v14M7 12l5 5 5-5"/><path d="M5 21h14"/>'),
  sound: I('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/>'),
  mute: I('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
};

export const FONTS = [
  { id: 'bubbles', name: 'Bubble', family: "'Rubik Bubbles', sans-serif" },
  { id: 'marker', name: 'Marker', family: "'Permanent Marker', cursive" },
  { id: 'bungee', name: 'Arcade', family: "'Bungee', sans-serif" },
  { id: 'neon', name: 'Neon', family: "'Monoton', cursive" },
  { id: 'script', name: 'Script', family: "'Pacifico', cursive" },
  { id: 'pixel', name: 'Pixel', family: "'Press Start 2P', monospace" },
  { id: 'poster', name: 'Poster', family: "'Bebas Neue', sans-serif" },
  { id: 'hand', name: 'Hand', family: "'Caveat', cursive" },
  { id: 'retro', name: 'Retro', family: "'Lobster', cursive" },
  { id: 'outline', name: 'Outline', family: "'Rampart One', sans-serif" },
  { id: 'round', name: 'Round', family: "'Righteous', sans-serif" },
  { id: 'clean', name: 'Clean', family: "'Inter', sans-serif" },
];
export const fontFamily = (id) => (FONTS.find((f) => f.id === id) || FONTS[FONTS.length - 1]).family;

/** data: URL for an SVG string (used by the snapshot rasterizer). */
export const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// ---------------- elements + toys (v2) ----------------
const CLOUD_FILL = { rain: '#d9dde3', snow: '#ffffff', storm: '#5d616b', none: '#ffffff' };
export function cloudSvg(mode = 'rain') {
  const f = CLOUD_FILL[mode] || '#fff';
  const eye = mode === 'storm' ? '#fff' : '#111';
  const mouth = mode === 'storm' ? 'M88 76 Q100 70 112 76' : 'M88 74 Q100 82 112 74';
  return S(`<path d="M40 96 C14 96 8 66 30 60 C26 34 58 24 72 40 C80 12 126 10 134 40 C150 26 180 38 174 62 C196 66 194 96 168 96Z" fill="${f}" ${outline}/>${mode === 'storm' ? '<path d="M96 96 L88 112 L100 110 L94 124" fill="none" stroke="#ffd23f" stroke-width="4" stroke-linejoin="round"/>' : ''}<circle cx="86" cy="64" r="4" fill="${eye}"/><circle cx="114" cy="64" r="4" fill="${eye}"/><path d="${mouth}" fill="none" stroke="${eye}" stroke-width="3" stroke-linecap="round"/>`, '0 0 200 128');
}
export const fireSvg = () => S(`<g class="flame"><path class="f1" d="M60 118 C30 118 22 92 30 72 C36 56 50 50 48 22 C66 36 78 54 74 70 C80 64 82 56 82 50 C98 66 98 90 90 102 C84 114 74 118 60 118Z" fill="#ff5a1f" ${outline}/><path class="f2" d="M60 114 C46 114 40 102 44 90 C48 80 54 76 54 64 C64 72 70 82 68 92 C72 90 74 86 74 82 C80 94 76 114 60 114Z" fill="#ffb21f"/><path class="f3" d="M60 112 C54 112 50 106 52 100 C54 94 58 92 58 86 C64 92 66 98 66 102 C66 108 64 112 60 112Z" fill="#fff3a0"/></g><rect x="14" y="116" width="92" height="14" rx="7" fill="#8a5a33" ${outline} transform="rotate(8 60 123)"/><rect x="14" y="116" width="92" height="14" rx="7" fill="#a86c3c" ${outline} transform="rotate(-8 60 123)"/><circle cx="22" cy="122" r="5" fill="#d9a46a" ${outline} stroke-width="2"/>`, '0 0 120 140');
export const fanSvg = () => S(`<rect x="14" y="128" width="64" height="12" rx="6" fill="#2b2b2b" ${outline}/><rect x="40" y="78" width="10" height="52" fill="#555" ${outline}/><rect x="10" y="42" width="54" height="40" rx="14" fill="#e9eef3" ${outline}/><circle cx="26" cy="62" r="5" fill="#2fd66b"/><g class="blades"><ellipse cx="94" cy="44" rx="8" ry="22" fill="#4cc9ff" ${outline}/><ellipse cx="94" cy="80" rx="8" ry="22" fill="#4cc9ff" ${outline}/></g><circle cx="94" cy="62" r="8" fill="#ff5a5a" ${outline}/><ellipse cx="96" cy="62" rx="20" ry="52" fill="none" stroke="#111" stroke-width="3"/><path d="M76 24 L116 24 M76 100 L116 100 M80 62 H112" stroke="#111" stroke-width="2" opacity=".35"/><rect x="62" y="56" width="16" height="12" fill="#999" ${outline}/>`, '0 0 120 144');
export const magnetSvg = () => S(`<g transform="rotate(180 50 50)"><path d="M14 4 H42 V58 C42 70 58 70 58 58 V4 H86 V60 C86 98 14 98 14 60Z" fill="#ff3b30" ${outline}/><rect x="14" y="4" width="28" height="18" fill="#dfe6ee" ${outline}/><rect x="58" y="4" width="28" height="18" fill="#dfe6ee" ${outline}/><path d="M24 34 V64" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/></g>`);
export const potSvg = () => S(`<path d="M14 18 H106 L94 96 H26Z" fill="#e0703a" ${outline}/><rect x="8" y="6" width="104" height="22" rx="6" fill="#f08a4b" ${outline}/><path d="M30 46 Q60 54 90 46" fill="none" stroke="#fff" stroke-width="3" opacity=".4"/>`, '0 0 120 100');
export function plantSvg(species = 'flower') {
  if (species === 'cactus') return S(`<path d="M50 160 V40 C50 22 74 22 74 40 V160" fill="#3fbf6a" ${outline}/><path d="M50 100 H34 C24 100 22 92 22 84 V62 C22 52 36 52 36 62 V86 H50" fill="#3fbf6a" ${outline}/><path d="M74 80 H88 C98 80 100 72 100 64 V50 C100 40 86 40 86 50 V66 H74" fill="#3fbf6a" ${outline}/><path d="M58 50 v8 M66 70 v8 M58 92 v8 M66 112 v8 M58 132 v8" stroke="#1f7a3f" stroke-width="3"/><circle cx="62" cy="30" r="8" fill="#ff7ab8" ${outline}/>`, '0 0 124 160');
  if (species === 'sunflower') return S(`<path d="M62 160 C60 120 66 80 62 46" fill="none" stroke="#2f9a4a" stroke-width="6"/><path d="M62 120 C40 112 30 96 34 88 C48 92 58 104 62 120Z M62 96 C84 88 94 74 90 66 C76 70 66 82 62 96Z" fill="#5be38a" ${outline}/>${Array.from({ length: 12 }, (_, i) => `<ellipse cx="62" cy="14" rx="7" ry="16" fill="#ffd23f" ${outline} stroke-width="2" transform="rotate(${i * 30} 62 36)"/>`).join('')}<circle cx="62" cy="36" r="15" fill="#7a4b2a" ${outline}/>`, '0 0 124 160');
  return S(`<path d="M62 160 C58 130 66 100 62 70" fill="none" stroke="#2f9a4a" stroke-width="6"/><path d="M62 132 C40 126 32 110 36 102 C50 106 60 118 62 132Z M62 110 C84 104 92 90 88 82 C74 86 64 98 62 110Z" fill="#5be38a" ${outline}/>${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="62" cy="34" rx="12" ry="18" fill="#ff8fb1" ${outline} transform="rotate(${r} 62 54)"/>`).join('')}<circle cx="62" cy="54" r="11" fill="#ffd23f" ${outline}/>`, '0 0 124 160');
}
const PIPS = { 1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]], 6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]] };
export const diceSvg = (n = 6) => S(`<rect x="8" y="8" width="84" height="84" rx="18" fill="#fff" ${outline}/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${n === 1 ? '#ff3b30' : '#111'}"/>`).join('')}`);
export const clockSvg = () => S(`<circle cx="50" cy="50" r="44" fill="#fff" ${outline} stroke-width="5"/>${Array.from({ length: 12 }, (_, i) => `<path d="M50 10 V${i % 3 ? 15 : 19}" stroke="#111" stroke-width="${i % 3 ? 2 : 4}" transform="rotate(${i * 30} 50 50)"/>`).join('')}<line class="hh" x1="50" y1="50" x2="50" y2="28" stroke="#111" stroke-width="6" stroke-linecap="round"/><line class="mm" x1="50" y1="50" x2="50" y2="18" stroke="#111" stroke-width="4" stroke-linecap="round"/><line class="ss" x1="50" y1="56" x2="50" y2="14" stroke="#ff3b30" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#ff3b30"/>`);
export const duckSvg = () => S(`<path d="M10 62 C10 50 22 46 34 50 C30 30 44 16 60 18 C78 20 84 38 78 50 C92 46 96 60 90 72 C84 88 62 92 44 90 C24 88 10 78 10 62Z" fill="#ffd23f" ${outline}/><path d="M78 32 L96 36 L80 42Z" fill="#ff8a1a" ${outline}/><circle cx="64" cy="32" r="4" fill="#111"/><path d="M36 64 C44 74 58 74 64 64" fill="none" ${outline}/>`);
export const clipSvg = () => S(`<path d="M30 80 V22 C30 8 54 8 54 22 V70 C54 80 40 80 40 70 V30" fill="none" stroke="#9aa3ad" stroke-width="6" stroke-linecap="round"/><path d="M30 80 V22 C30 8 54 8 54 22 V70 C54 80 40 80 40 70 V30" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`, '20 4 44 84');
export const iceSvg = () => S(`<rect x="10" y="10" width="80" height="80" rx="16" fill="#cfefff" fill-opacity=".85" ${outline}/><path d="M24 26 H52 M24 36 H36" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="68" cy="66" r="6" fill="#fff" opacity=".7"/>`);
export const coinSvg = () => STICKERS.coin;
export function spinnerSvg(labels = []) {
  const n = Math.max(2, labels.length), cols = ['#ff4d6d', '#ffd23f', '#4cc9ff', '#5be38a', '#9b8cff', '#ff8a1a', '#ff7ab8', '#2fd6a6'];
  const seg = (i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a) => `${(100 + Math.cos(a) * 90).toFixed(1)} ${(100 + Math.sin(a) * 90).toFixed(1)}`;
    const am = (a0 + a1) / 2;
    return `<path d="M100 100 L${p(a0)} A90 90 0 0 1 ${p(a1)}Z" fill="${cols[i % cols.length]}" stroke="#111" stroke-width="2.5"/><text x="${(100 + Math.cos(am) * 56).toFixed(1)}" y="${(100 + Math.sin(am) * 56).toFixed(1)}" font-family="Inter, sans-serif" font-weight="800" font-size="11" text-anchor="middle" dominant-baseline="middle" transform="rotate(${((am * 180) / Math.PI).toFixed(1)} ${(100 + Math.cos(am) * 56).toFixed(1)} ${(100 + Math.sin(am) * 56).toFixed(1)})" fill="#111">${String(labels[i] || i + 1).replace(/[<&>]/g, '').slice(0, 12)}</text>`;
  };
  return S(`<g class="wheel">${Array.from({ length: n }, (_, i) => seg(i)).join('')}<circle cx="100" cy="100" r="90" fill="none" ${outline} stroke-width="5"/></g><circle cx="100" cy="100" r="12" fill="#111"/><path d="M88 0 H112 L100 22Z" fill="#111"/><rect x="92" y="190" width="16" height="30" fill="#111"/><rect x="64" y="216" width="72" height="12" rx="6" fill="#111"/>`, '0 0 200 230');
}
export const extinguisherSvg = () => S(`<rect x="22" y="34" width="36" height="96" rx="16" fill="#ff3b30" ${outline}/><rect x="28" y="22" width="24" height="14" fill="#333" ${outline}/><path d="M52 26 H86 L98 20" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M40 22 L32 10 H56" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/><rect x="28" y="64" width="24" height="26" rx="4" fill="#fff" ${outline} stroke-width="2"/><path d="M34 74 H46 M34 80 H44" stroke="#111" stroke-width="2"/>`, '0 0 110 134');

/** Gallery groups for the sticker drawer. */
export const STICKER_GROUPS = {
  Games: ['pad', 'joystick', 'dice', 'coin', 'trophy', 'gem', 'key', 'sword', 'shield', 'potion', 'bomb', 'mushroom', 'rocket', 'ufo', 'alien', 'ghost'],
  Emoji: ['smile', 'star', 'heart', 'fire', 'bolt', 'sparkle', 'crown', 'music', 'cat', 'moon', 'cloud', 'rainbow', 'planet', 'flower', 'leaf', 'cherry', 'pizza', 'donut', 'icecream'],
  Words: ['wow', 'gg', 'lol', 'newtag', 'oneup', 'win', 'omg', 'hi', 'play'],
};

Object.assign(ICONS, {
  cloud: I('<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>'),
  fire: I('<path d="M12 21c-4 0-6-2.5-6-6 0-3 2-5 3-8 2 2 3 3.5 3 5 1-1 1.5-2 1.5-3.5C16 10 18 12.5 18 15c0 3.5-2 6-6 6z"/>'),
  water: I('<path d="M3 14c2 0 2 2 4.5 2S10 14 12 14s2 2 4.5 2 2.5-2 4.5-2"/><path d="M3 19c2 0 2 2 4.5 2S10 19 12 19s2 2 4.5 2 2.5-2 4.5-2"/><path d="M12 3s-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-4-7-4-7z"/>'),
  fan: I('<circle cx="12" cy="10" r="2"/><path d="M12 8c0-3 1-5 3-5s2 3-1 5M14 11c3 0 5 1 5 3s-3 2-5-1M10 11c-3 1-5 0-5-2s3-2 5 0"/><path d="M12 12v8M8 21h8"/>'),
  magnet: I('<path d="M5 3h4v8a3 3 0 0 0 6 0V3h4v8a7 7 0 0 1-14 0z"/><path d="M5 7h4M15 7h4"/>'),
  plant: I('<path d="M7 15h10l-1.5 6h-7z"/><path d="M12 15V9"/><path d="M12 11c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c0-3 2-5 5-5 0 3-2 5-5 5z"/>'),
  card: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/>'),
  bubble: I('<path d="M4 5h16v11H10l-4 4v-4H4z"/>'),
  gallery: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><circle cx="17.5" cy="17.5" r="3.5"/>'),
  more: I('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  style: I('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  eraser: I('<path d="M16 3l5 5-11 11H5l-2-2z"/><path d="M9 9l6 6M5 19h15"/>'),
  marker: I('<path d="M14 4l6 6-9 9H5v-6z"/><path d="M5 19l-2 2"/>'),
  highlighter: I('<path d="M15 3l6 6-8 8-6-6z"/><path d="M7 11l-4 8 4 2 3-5"/>'),
  back: I('<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h12V8" opacity=".5"/>'),
  link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  flip: I('<path d="M12 3v18"/><path d="M8 7l-5 5 5 5z"/><path d="M16 7l5 5-5 5z"/>'),
  world: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  paste: I('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2h6v2"/>'),
  shovel: I('<path d="M14 4l6 6"/><path d="M17 7l-7 7"/><path d="M10 14l-1.5-1.5-4 4a2.1 2.1 0 0 0 3 3l4-4z"/>'),
  palette: I('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/>'),
});
