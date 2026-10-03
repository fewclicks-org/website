// Local-only persistence. The whole board lives in this browser's localStorage.
// Nothing is ever sent anywhere: no server, no analytics, no cookies.

const KEY = 'fewclicks:board:v2';
const OLD_KEYS = ['fewclicks:board:v1'];
const LIMIT = 4.5 * 1024 * 1024; // most browsers allow ~5 MB per origin

export function loadBoard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const b = JSON.parse(raw); return b && Array.isArray(b.items) ? migrate(b) : null; }
    for (const k of OLD_KEYS) {
      const old = localStorage.getItem(k);
      if (!old) continue;
      const b = JSON.parse(old);
      if (b && Array.isArray(b.items)) return migrate(b);
    }
    return null;
  } catch {
    return null;
  }
}

/** Bring older boards up to date (v1 had a fixed-size board; v2 is an infinite canvas). */
export function migrate(b) {
  if (b.version >= 2) return { links: [], world: { wind: 0 }, ...b };
  for (const it of b.items) {
    if (it.type === 'card' && it.d && it.d.title == null) it.d.title = 'Say hello';
    if (it.type === 'note' && it.d?.tone && !it.d.paper) it.d.paper = it.d.tone === 'black' ? 'black' : 'classic';
  }
  return { ...b, version: 2, links: [], world: { wind: 0 } };
}

/** Returns { ok, bytes, nearLimit }. */
export function saveBoard(board) {
  const raw = JSON.stringify(board);
  const bytes = raw.length * 2;
  try {
    localStorage.setItem(KEY, raw);
    return { ok: true, bytes, nearLimit: bytes > LIMIT * 0.85 };
  } catch {
    return { ok: false, bytes, nearLimit: true };
  }
}

export function clearBoard() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function storageInfo() {
  try {
    const raw = localStorage.getItem(KEY) || '';
    return { bytes: raw.length * 2, limit: LIMIT };
  } catch {
    return { bytes: 0, limit: LIMIT };
  }
}

/** Simple undo/redo of serialized board snapshots. */
export function createHistory(max = 50) {
  const past = [];
  const future = [];
  return {
    push(snapshot) {
      const s = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
      if (past[past.length - 1] === s) return;
      past.push(s);
      if (past.length > max) past.shift();
      future.length = 0;
    },
    undo(current) {
      if (past.length < 2) return null;
      future.push(past.pop());
      return JSON.parse(past[past.length - 1] || current);
    },
    redo() {
      if (!future.length) return null;
      const s = future.pop();
      past.push(s);
      return JSON.parse(s);
    },
    get canUndo() { return past.length > 1; },
    get canRedo() { return future.length > 0; },
  };
}

/** Download a JSON file locally (no network). */
export function exportFile(board, name = 'fewclicks-board.json') {
  const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Read a JSON file the user picked. */
export function importFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const b = JSON.parse(r.result);
        if (!b || !Array.isArray(b.items)) throw new Error('Not a FewClicks board file');
        resolve(migrate(b));
      } catch (e) { reject(e); }
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

/** Shrink a user photo to a small JPEG data URL so it fits in localStorage. */
export function compressImage(file, max = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ src: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}
