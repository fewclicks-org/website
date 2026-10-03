// Colorful sticker + object art (inline SVG, drawn in code) and monochrome UI icons.
// Stickers are the only color on the board besides photos.

const S = (body, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
const outline = 'stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

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
  front: I('<rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".15"/><path d="M4 16V4h12"/>'),
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
