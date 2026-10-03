// UI icons, fonts, and (re-exported) item art. Item art lives in flatart.js.

export * from './flatart.js';

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
  seed: I('<path d="M6 9h12l-1 11H7z"/><path d="M8 9c0-3 2-5 4-5s4 2 4 5"/><path d="M12 13v4M10 15h4"/>'),
  shovel: I('<path d="M14 4l6 6"/><path d="M17 7l-7 7"/><path d="M10 14l-1.5-1.5-4 4a2.1 2.1 0 0 0 3 3l4-4z"/>'),
  palette: I('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/>'),
});
