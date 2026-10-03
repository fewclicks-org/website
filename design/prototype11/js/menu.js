// App context menu (replaces the browser's native right-click menu).
// entries: [{ label, icon, kbd, run, sub: [...], checked, disabled, danger } | '-' | { header }]
// Keyboard: ↑/↓ move, → opens a submenu, ← closes it, Enter/Space runs, Esc closes.

export function createMenu() {
  const stack = []; // open menu panels (root + submenus)
  let onCloseFn = null;
  let restoreFocus = null;

  function panel(entries, x, y, level) {
    const el = document.createElement('div');
    el.className = 'cmenu';
    el.setAttribute('role', 'menu');
    el.dataset.level = level;
    entries.forEach((e) => {
      if (e === '-') { const s = document.createElement('div'); s.className = 'cm-sep'; s.setAttribute('role', 'separator'); el.appendChild(s); return; }
      if (e.header) { const h = document.createElement('div'); h.className = 'cm-h'; h.textContent = e.header; el.appendChild(h); return; }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cm-i${e.danger ? ' danger' : ''}`;
      b.setAttribute('role', e.checked != null ? 'menuitemcheckbox' : 'menuitem');
      if (e.checked != null) b.setAttribute('aria-checked', String(!!e.checked));
      if (e.sub) b.setAttribute('aria-haspopup', 'menu');
      b.disabled = !!e.disabled;
      b.innerHTML = `<span class="cm-ic">${e.icon || (e.checked ? '✓' : '')}</span><span class="cm-l"></span>${e.kbd ? `<kbd>${e.kbd}</kbd>` : ''}${e.sub ? '<span class="cm-arr">›</span>' : ''}`;
      b.querySelector('.cm-l').textContent = e.label;
      b._entry = e;
      el.appendChild(b);
    });
    document.body.appendChild(el);
    // keep on screen
    const r = el.getBoundingClientRect();
    const px = Math.max(6, Math.min(innerWidth - r.width - 6, x));
    const py = Math.max(6, Math.min(innerHeight - r.height - 6, y));
    el.style.left = `${px}px`;
    el.style.top = `${py}px`;
    el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
    el.addEventListener('click', (ev) => { const b = ev.target.closest('.cm-i'); if (b) activate(b, level); });
    el.addEventListener('pointerover', (ev) => {
      const b = ev.target.closest('.cm-i');
      if (!b || b.disabled) return;
      b.focus({ preventScroll: true });
      clearTimeout(el._t);
      el._t = setTimeout(() => { if (b._entry.sub) openSub(b, level); else closeFrom(level + 1); }, 120);
    });
    el.addEventListener('keydown', (ev) => onKey(ev, el, level));
    return el;
  }

  function items(el) { return [...el.querySelectorAll('.cm-i:not(:disabled)')]; }

  function openSub(btn, level) {
    closeFrom(level + 1);
    const r = btn.getBoundingClientRect();
    const sub = panel(btn._entry.sub, r.right - 4, r.top - 6, level + 1);
    const sr = sub.getBoundingClientRect();
    if (r.right + sr.width > innerWidth - 6) sub.style.left = `${Math.max(6, r.left - sr.width + 4)}px`;
    stack.push(sub);
    btn.setAttribute('aria-expanded', 'true');
    return sub;
  }

  function activate(btn, level) {
    const e = btn._entry;
    if (!e || btn.disabled) return;
    if (e.sub) { const s = openSub(btn, level); items(s)[0]?.focus(); return; }
    close();
    e.run?.();
  }

  function onKey(ev, el, level) {
    const list = items(el);
    const i = list.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    else if (ev.key === 'Home') { ev.preventDefault(); list[0]?.focus(); }
    else if (ev.key === 'End') { ev.preventDefault(); list[list.length - 1]?.focus(); }
    else if (ev.key === 'ArrowRight' && document.activeElement?._entry?.sub) { ev.preventDefault(); const s = openSub(document.activeElement, level); items(s)[0]?.focus(); }
    else if (ev.key === 'ArrowLeft' && level > 0) { ev.preventDefault(); const parentBtn = stack[level - 1]?.querySelector('[aria-expanded="true"]'); closeFrom(level); parentBtn?.focus(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'Tab') { ev.preventDefault(); }
    ev.stopPropagation();
  }

  function closeFrom(level) {
    while (stack.length > level) {
      const p = stack.pop();
      p.remove();
    }
    stack[level - 1]?.querySelectorAll('[aria-expanded]').forEach((b) => b.removeAttribute('aria-expanded'));
  }

  function open(x, y, entries, { onClose, focus = false } = {}) {
    close();
    restoreFocus = document.activeElement;
    onCloseFn = onClose || null;
    stack.push(panel(entries, x, y, 0));
    if (focus) items(stack[0])[0]?.focus(); else stack[0].focus?.();
  }

  function close() {
    if (!stack.length) return;
    closeFrom(0);
    const fn = onCloseFn;
    onCloseFn = null;
    fn?.();
    if (restoreFocus?.isConnected && document.activeElement === document.body) restoreFocus.focus?.({ preventScroll: true });
  }

  document.addEventListener('pointerdown', () => close());
  addEventListener('blur', () => close());
  addEventListener('resize', () => close());
  addEventListener('wheel', () => close(), { passive: true });

  return { open, close, get isOpen() { return stack.length > 0; } };
}
