// Few Clicks Challenge: the website is a meta-game.
// Every click counts; unlocking all 5 rounds in 5 clicks = rank S. XP + achievements persist in localStorage.

import { loadAll, loadGames, loadStudio, param, html, raw, formatDate, starString, storeLabel, trailerHtml, STATUS, PLATFORMS } from '../../shared/js/data.js';
import { sfx, mountSoundToggle, onSoundChange } from '../../shared/js/sfx.js';
import { reducedMotion } from '../../shared/js/motion.js';
import { setGameSeo } from '../../shared/js/seo.js';
import { mountPrototypeBadge } from '../../shared/js/proto-badge.js';
import { bindFilters, bindLightbox, bindDialog, bindEmailCopy, gameFacts, relatedGames, loadFailed, reveal } from '../../shared/js/kit.js';

const $ = (s, r = document) => r.querySelector(s);
const page = document.body.dataset.page;
const main = $('#main');

// ---------------- meta-game state ----------------
const KEY = 'fewclicks:p4';
const ROUNDS = [
  { id: 'games', n: 1, label: 'Games', icon: '🎮' },
  { id: 'studio', n: 2, label: 'Studio', icon: '🏢' },
  { id: 'team', n: 3, label: 'Team', icon: '⭐' },
  { id: 'news', n: 4, label: 'News', icon: '📰' },
  { id: 'contact', n: 5, label: 'Contact', icon: '👋' },
];
const ACH = {
  'first-click': ['👆', 'First click', 'Click anything. Anything at all.', 25],
  explorer: ['🧭', 'Curious explorer', 'Unlock your first round.', 50],
  gamer: ['🎮', 'Player one', 'Unlock the Games round.', 50],
  team: ['⭐', 'Team player', 'Meet the team.', 50],
  news: ['📰', 'Newshound', 'Read a news story.', 50],
  hello: ['👋', 'Say hi', 'Grab our email address.', 75],
  complete: ['🏁', 'Completionist', 'Unlock all 5 rounds.', 150],
  speedrun: ['⚡', 'Speedrunner', 'Finish the challenge in 5 clicks or fewer.', 300],
  sound: ['🔊', 'Sound check', 'Turn the sound on.', 25],
  filter: ['🧪', 'Filter master', 'Filter the games list.', 50],
  collector: ['🗂️', 'Collector', 'Open 3 different game pages.', 100],
  mission: ['🎯', 'Mission complete', 'Finish a game page mission.', 100],
};
const fresh = () => ({ started: false, finished: false, clicks: 0, rounds: [], xp: 0, ach: [], seenGames: [], missions: {} });
let S = fresh();
try { S = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* ignore */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } };
const level = () => Math.floor(S.xp / 250) + 1;
const rank = (c) => (c <= 5 ? 'S' : c <= 8 ? 'A' : c <= 12 ? 'B' : 'C');

function award(id) {
  if (S.ach.includes(id) || !ACH[id]) return;
  S.ach.push(id);
  const [icon, name, , xp] = ACH[id];
  const before = level();
  S.xp += xp;
  save();
  toast(icon, `${name} · +${xp} XP`, 'Achievement unlocked');
  sfx.success();
  if (level() > before) setTimeout(() => toast('🆙', `You reached level ${level()}!`, 'Level up'), 900);
  renderHud();
}

// ---------------- chrome ----------------
function chrome() {
  document.body.insertAdjacentHTML('afterbegin', '<div class="burst" aria-hidden="true"></div>');
  main.insertAdjacentHTML('beforebegin', `<header class="hud"><div class="wrap">
    <a class="logo" href="index.html"><i aria-hidden="true">✦</i><span>FewClicks</span></a>
    <ul class="hud-links"><li><a href="index.html"${page === 'home' ? ' aria-current="page"' : ''}>Challenge</a></li><li><a href="games.html"${page !== 'home' ? ' aria-current="page"' : ''}>Games</a></li></ul>
    <div class="hud-stats" data-hud-ignore>
      <span class="meter clicks" data-clicks title="Clicks used this run">🖱 <b>0</b><span class="sr-only"> clicks</span></span>
      <span class="meter xp" title="Experience"><span data-lvl>LV 1</span><span class="xp-bar"><i data-xpbar></i></span></span>
      <button class="hud-btn" type="button" data-ach-open aria-haspopup="dialog">🏆 <span data-achn>0/0</span></button>
      <button class="hud-btn" type="button" data-sound-toggle><span data-sound-icon></span></button>
    </div>
  </div></header>`);
  main.insertAdjacentHTML('afterend', `<footer><div class="wrap"><span>© ${new Date().getFullYear()} FewClicks · The Few Clicks Challenge</span><a href="mailto:admin@fewclicks.org">admin@fewclicks.org</a></div></footer>
    <div class="scrim" data-scrim></div>
    <aside class="drawer" data-drawer aria-label="Achievements" aria-hidden="true"><header><h2>🏆 Achievements</h2><button class="hud-btn" type="button" data-ach-close aria-label="Close">✕</button></header><ul data-ach-list></ul></aside>
    <div class="toasts" role="status" aria-live="polite" data-toasts></div>`);
  mountSoundToggle($('[data-sound-toggle]'));
  onSoundChange((on) => { if (on) award('sound'); });
  const drawer = $('[data-drawer]'), scrim = $('[data-scrim]');
  const setDrawer = (open) => {
    drawer.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.style.visibility = open ? 'visible' : '';
    if (open) { renderAch(); $('[data-ach-close]').focus(); sfx.boing(); }
  };
  drawer.style.visibility = 'hidden';
  drawer.addEventListener('transitionend', () => { if (!drawer.classList.contains('open')) drawer.style.visibility = 'hidden'; });
  $('[data-ach-open]').addEventListener('click', () => setDrawer(true));
  $('[data-ach-close]').addEventListener('click', () => setDrawer(false));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
  mountPrototypeBadge(4, 'Few Clicks Challenge');
  document.addEventListener('pointerover', (e) => { const t = e.target.closest('a, button'); if (t && !t.contains(e.relatedTarget)) sfx.blip(); });

  // Count every click during a run (HUD + drawer don't count, that would be mean).
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-hud-ignore], [data-drawer], [data-intro], .fc-proto-badge')) return;
    award('first-click');
    if (!S.started || S.finished) return;
    S.clicks += 1;
    save();
    renderHud(true);
    if (!reducedMotion) {
      const p = document.createElement('span');
      p.className = 'click-pop';
      p.textContent = '+1 click';
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      document.body.appendChild(p);
      p.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: 'translate(-50%,-180%)', opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => p.remove();
    }
  }, true);
  renderHud();
}

function renderHud(bump = false) {
  const c = $('[data-clicks]');
  if (!c) return;
  c.querySelector('b').textContent = S.started ? S.clicks : '–';
  if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  $('[data-lvl]').textContent = `LV ${level()}`;
  $('[data-xpbar]').style.setProperty('--p', `${((S.xp % 250) / 250) * 100}%`);
  $('[data-achn]').textContent = `${S.ach.length}/${Object.keys(ACH).length}`;
}
function renderAch() {
  $('[data-ach-list]').innerHTML = Object.entries(ACH).map(([id, [icon, name, desc, xp]]) => {
    const got = S.ach.includes(id);
    return html`<li class="ach ${got ? '' : 'locked'}"><span class="i" aria-hidden="true">${got ? icon : '🔒'}</span><span><b>${name}</b><small>${desc}</small></span><span class="x">${xp} XP</span><span class="sr-only">${got ? 'unlocked' : 'locked'}</span></li>`;
  }).join('');
}
function toast(icon, text, label = '') {
  const host = $('[data-toasts]');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html`<span class="i" aria-hidden="true">${icon}</span><span>${label ? raw(html`<small>${label}</small>`) : ''}${text}</span>`;
  host.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2800);
}

chrome();
({ home, games: gamesPage, game: gamePage }[page])?.();

// ---------------- markup helpers ----------------
function card(g) {
  return html`<a class="card" href="${g.url}" data-game-card style="--c1:${g.theme.primary}">
    <span class="art"><img src="${g.media.cover}" alt="" loading="lazy" width="1200" height="675"><span class="stat">${STATUS[g.status].label}</span><span class="pts">+${S.seenGames.includes(g.id) ? 0 : 40} XP</span></span>
    <span class="body"><h3>${g.title}</h3><p>${g.tagline}</p>
      <span class="tags">${g.categoryList.map((c) => raw(html`<span class="tag" style="--cc:${c.color}">${c.icon} ${c.name}</span>`))}</span>
      <span class="meta"><span>${g.platformList.map((p) => p.label).join(' · ')}</span><span>${g.rating.count ? `★ ${g.rating.average.toFixed(1)}` : g.price}</span></span></span></a>`;
}
function lock(round) {
  return html`<div class="lock" role="button" tabindex="0" data-unlock="${round.id}" aria-label="Unlock round ${round.n}: ${round.label}"><div><span class="padlock" aria-hidden="true">🔒</span><b>Round ${round.n}: ${round.label}</b><span>Click to unlock · +100 XP</span></div></div>`;
}

// ---------------- home ----------------
async function home() {
  let data;
  try { data = await loadAll(); } catch (err) { loadFailed(err); return; }
  const { games, studio, team, news } = data;
  const featured = games.filter((g) => g.featured);

  main.innerHTML = html`
  <section class="board-wrap"><div class="wrap">
    <div class="hero-title"><h1>The <span>Few Clicks</span> Challenge</h1><p>${studio.tagline} Can you see our whole studio in 5 clicks?</p></div>
    <div class="board" data-board>${ROUNDS.map((r) => raw(html`<a class="tile" href="#${r.id}" data-round="${r.id}"><span class="xp-tag">+100 XP</span><span><span class="num">${r.n}</span><br><span style="font-size:42px" aria-hidden="true">${r.icon}</span><br><span class="lbl">${r.label}</span></span></a>`))}</div>
    <div class="board-foot"><button class="btn btn--sm" type="button" data-restart data-hud-ignore>↺ New run</button><a class="btn btn--sm btn--k" href="games.html">All games →</a></div>
  </div></section>

  <section class="section" id="games"><div class="wrap">
    <div class="sec-head"><div><span class="round">Round 1</span><h2>Our games</h2></div><a class="btn btn--sm" href="games.html">See all ${games.length}</a></div>
    <div class="lockable" data-lockable="games">${raw(lock(ROUNDS[0]))}<div class="content cards" data-featured>${(featured.length ? featured : games).map((g) => raw(card(g)))}</div></div>
  </div></section>

  <section class="section" id="studio"><div class="wrap">
    <div class="sec-head"><div><span class="round">Round 2</span><h2>The studio</h2></div></div>
    <div class="lockable" data-lockable="studio">${raw(lock(ROUNDS[1]))}<div class="content">
      <div class="about"><div class="panel"><h3>Who are we?</h3><p>${studio.description}</p></div>
        <div class="qa">${studio.values.map((v) => raw(html`<div><span class="ico" aria-hidden="true">${v.icon}</span><span><b>${v.title}</b>${v.text}</span></div>`))}</div></div>
      <div class="scores">${studio.stats.map((s) => raw(html`<div class="score"><b>${s.value}</b><span>${s.label}</span></div>`))}</div>
    </div></div>
  </div></section>

  <section class="section" id="team"><div class="wrap">
    <div class="sec-head"><div><span class="round">Round 3</span><h2>Meet the players</h2></div></div>
    <div class="lockable" data-lockable="team">${raw(lock(ROUNDS[2]))}<div class="content team">${team.map((m) => raw(html`<article class="player" data-team-member style="--mc:${m.color}">
      <div class="pod"><img src="${m.avatar}" alt="" width="120" height="120" loading="lazy"></div>
      <div class="who"><h3>${m.name}</h3><span class="role">${m.role}</span><p class="lines">${m.bio}</p>
      <p class="lines"><b>Top stat:</b> ${Object.entries(m.stats).sort((a, b) => b[1] - a[1])[0]?.join(' ') || ''}</p></div></article>`))}</div></div>
  </div></section>

  <section class="section" id="news"><div class="wrap">
    <div class="sec-head"><div><span class="round">Round 4</span><h2>News flash</h2></div></div>
    <div class="lockable" data-lockable="news">${raw(lock(ROUNDS[3]))}<div class="content news-list">${news.map((p, i) => raw(html`<button class="news-item" type="button" data-news-item data-id="${p.id}"><span class="q" aria-hidden="true">${i + 1}</span><span><small>${p.tag} · ${formatDate(p.date)}</small><h3>${p.title}</h3><small style="font-weight:500">${p.summary}</small></span><span class="go" aria-hidden="true">→</span></button>`))}</div></div>
  </div></section>

  <section class="section" id="contact"><div class="wrap">
    <div class="sec-head"><div><span class="round">Final round</span><h2>Phone a friend</h2></div></div>
    <div class="lockable" data-lockable="contact">${raw(lock(ROUNDS[4]))}<div class="content contact-box">
      <h2>Say hi!</h2><p style="font-size:19px">Press, partners and players welcome.</p>
      <a class="mail" data-email-link="text" href="mailto:admin@fewclicks.org">admin@fewclicks.org</a>
      <div class="row"><a class="btn" data-email-link data-hello href="mailto:admin@fewclicks.org">✉ Email us</a><button class="btn btn--pink" type="button" data-copy-email>📋 Copy</button></div>
      ${studio.address ? raw(html`<address>${studio.address}</address>`) : ''}
    </div></div>
  </div></section>
  <dialog class="modal" id="news-modal" aria-labelledby="nm-t"><button class="btn btn--sm modal-x" type="button" data-close aria-label="Close">✕</button><div class="modal-body" data-modal-body></div></dialog>
  <dialog class="modal" id="result" aria-labelledby="res-t" data-hud-ignore><div class="modal-body result" data-result></div></dialog>`;

  const apply = () => {
    ROUNDS.forEach((r) => {
      const open = S.rounds.includes(r.id);
      $(`[data-lockable="${r.id}"]`).classList.toggle('open', open);
      $(`[data-round="${r.id}"]`).classList.toggle('done', open);
      const l = $(`[data-lockable="${r.id}"] .lock`);
      if (open) l.setAttribute('tabindex', '-1');
    });
  };
  const unlock = (id) => {
    if (S.rounds.includes(id)) return;
    S.rounds.push(id);
    S.xp += 100;
    save();
    apply();
    sfx.coin();
    toast(ROUNDS.find((r) => r.id === id).icon, `Round unlocked · +100 XP`);
    award('explorer');
    if (id === 'games') award('gamer');
    if (id === 'team') award('team');
    renderHud();
    if (S.rounds.length === ROUNDS.length && !S.finished) setTimeout(finish, 700);
  };
  const finish = () => {
    S.finished = true;
    save();
    award('complete');
    if (S.clicks <= 5) award('speedrun');
    const r = rank(S.clicks);
    $('[data-result]').innerHTML = html`<p class="round" style="justify-self:center">Challenge complete!</p><div class="rank" aria-label="Rank ${r}">${r}</div>
      <h2 id="res-t">${{ S: 'Flawless!', A: 'Amazing!', B: 'Nice run!', C: 'You made it!' }[r]}</h2>
      <div class="result-stats"><span>🖱 ${S.clicks} clicks</span><span>⭐ ${S.xp} XP</span><span>🏆 ${S.ach.length} achievements</span></div>
      <p>${r === 'S' ? 'Five clicks. Every round. Legend.' : 'Pro tip: each board tile unlocks a whole round in one click.'}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn--k" type="button" data-share>📋 Share score</button><button class="btn" type="button" data-again>↺ Play again</button><a class="btn btn--pink" href="games.html">Play our games</a></div>`;
    const dlg = $('#result');
    dlg.showModal();
    sfx.success();
    $('[data-share]', dlg).addEventListener('click', async (e) => {
      const txt = `I explored FewClicks in ${S.clicks} clicks and got rank ${r}! 🖱️ https://fewclicks.org`;
      try { await navigator.clipboard.writeText(txt); e.target.textContent = '✅ Copied!'; } catch { e.target.textContent = txt; }
    });
    $('[data-again]', dlg).addEventListener('click', () => { dlg.close(); restart(); });
  };
  const restart = () => {
    Object.assign(S, { started: false, finished: false, clicks: 0, rounds: [] });
    save();
    apply();
    renderHud();
    scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    intro();
  };

  main.addEventListener('click', (e) => {
    const t = e.target.closest('[data-round]');
    if (t) { unlock(t.dataset.round); return; }
    const l = e.target.closest('[data-unlock]');
    if (l) unlock(l.dataset.unlock);
  });
  main.addEventListener('keydown', (e) => { const l = e.target.closest('[data-unlock]'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); l.click(); } });
  $('[data-restart]').addEventListener('click', restart);

  const nm = $('#news-modal');
  bindDialog(nm);
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-item]');
    if (!b) return;
    const p = news.find((x) => x.id === b.dataset.id);
    const g = games.find((x) => x.id === p.gameId);
    $('[data-modal-body]', nm).innerHTML = html`${p.image ? raw(html`<img src="${p.image}" alt="">`) : ''}<span class="round" style="justify-self:start">${p.tag} · ${formatDate(p.date)}</span><h2 id="nm-t" style="font-size:28px">${p.title}</h2>${p.body.map((t) => raw(html`<p>${t}</p>`))}${g ? raw(html`<p><a class="btn btn--sm btn--k" href="${g.url}">Open ${g.title} →</a></p>`) : ''}`;
    nm.showModal();
    award('news');
  });
  bindEmailCopy(studio.email || 'admin@fewclicks.org', (ok, btn) => { if (ok) { award('hello'); btn.textContent = '✅ Copied!'; setTimeout(() => (btn.textContent = '📋 Copy'), 1600); } });
  main.querySelectorAll('[data-hello]').forEach((a) => a.addEventListener('click', () => award('hello')));

  apply();
  renderHud();
  if (!S.started) intro();
}

function intro() {
  const el = document.createElement('div');
  el.className = 'intro';
  el.dataset.intro = '';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'intro-t');
  el.innerHTML = `<div><div class="lights" aria-hidden="true">${'<i></i>'.repeat(9)}</div><p class="eyebrow">FewClicks presents</p>
    <h1 id="intro-t">The Few Clicks Challenge</h1>
    <p>Our games are fun within a few clicks, and so is our website. Unlock all 5 rounds of the studio using as few clicks as possible.</p>
    <div class="rules"><span>🖱 Every click counts</span><span>⭐ Earn XP</span><span>🏆 12 achievements</span><span>🥇 Rank S = 5 clicks</span></div>
    <button class="btn btn--big" type="button" data-skip-intro>▶ Start the challenge</button></div>`;
  document.body.appendChild(el);
  const btn = $('[data-skip-intro]', el);
  btn.focus();
  btn.addEventListener('click', () => {
    S.started = true;
    S.clicks = 0;
    save();
    el.remove();
    renderHud();
    sfx.coin();
    if (reducedMotion) return;
    const cd = document.createElement('div');
    cd.className = 'countdown';
    cd.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cd);
    ['3', '2', '1', 'GO!'].forEach((n, i) => setTimeout(() => {
      cd.textContent = n;
      cd.animate([{ transform: 'scale(2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(.8)', opacity: 0 }], { duration: 600 });
      i < 3 ? sfx.tick() : sfx.success();
    }, i * 500));
    setTimeout(() => cd.remove(), 2200);
  });
}

// ---------------- games ----------------
async function gamesPage() {
  let games, categories;
  try { ({ games, categories } = await loadGames()); } catch (err) { loadFailed(err); return; }
  main.innerHTML = html`<section class="page-hero wrap"><span class="round">Bonus round</span><h1>Pick a game</h1><p>Every game you open is worth +40 XP.</p></section>
  <div class="wrap">
    <div class="controls" role="search">
      <div class="row"><label class="sr-only" for="q">Search</label><input id="q" type="search" placeholder="Search games…" data-q autocomplete="off">
        <label class="sr-only" for="sort">Sort</label><select id="sort" data-sort><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="az">A–Z</option></select></div>
      <div class="row" role="group" aria-label="Category">${[{ id: 'all', name: 'All', icon: '★' }, ...categories].map((c) => raw(html`<button class="pick" type="button" data-cat="${c.id}">${c.icon} ${c.name}</button>`))}</div>
      <div class="row" role="group" aria-label="Platform">${[['all', 'Any platform'], ['mobile', '📱 Mobile'], ['pc', '💻 PC'], ['console', '🎮 Console']].map(([k, l]) => raw(html`<button class="pick" type="button" data-platform="${k}">${l}</button>`))}</div>
    </div>
    <p class="sr-only" aria-live="polite" data-status></p>
    <div class="cards" data-grid></div>
    <div class="empty" data-empty hidden><div style="font-size:60px">🤷</div><h2>No winners here</h2><p style="margin-bottom:18px">Try another category.</p><button class="btn btn--k" type="button" data-reset>Reset</button></div>
  </div>`;
  const grid = $('[data-grid]');
  bindFilters({
    games, categories,
    render(list, state, src) {
      grid.innerHTML = list.map(card).join('');
      if (src && !reducedMotion) grid.querySelectorAll('.card').forEach((c, i) => c.animate([{ transform: 'rotateY(90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, delay: i * 60, fill: 'backwards', easing: 'ease-out' }));
    },
    onChange: (src) => { sfx.click(); if (src.matches('[data-cat]:not([data-cat="all"]), [data-platform]:not([data-platform="all"]), [data-q]')) award('filter'); },
  });
}

// ---------------- game ----------------
async function gamePage() {
  let games, studio;
  try { [{ games }, studio] = await Promise.all([loadGames(), loadStudio()]); } catch (err) { loadFailed(err); return; }
  const g = games.find((x) => x.id === param('id'));
  if (!g) {
    document.title = 'Game not found | FewClicks';
    main.innerHTML = html`<section class="not-found" data-not-found><div><div style="font-size:90px">❌</div><span class="round">Wrong answer!</span><h1>Game not found</h1><a class="btn btn--k" href="games.html">Back to the games</a></div></section>`;
    return;
  }
  setGameSeo(g, studio);
  if (!S.seenGames.includes(g.id)) {
    S.seenGames.push(g.id);
    S.xp += 40;
    save();
    setTimeout(() => toast('🎮', `Discovered ${g.title} · +40 XP`), 600);
    if (S.seenGames.length >= 3) award('collector');
    renderHud();
  }
  const mission = S.missions[g.id] || [];
  const tasks = [['read', 'Read about the game'], ['watch', 'Check out the trailer'], ['shots', 'Peek at a screenshot'], ['info', 'Find the release date']];
  const verb = g.status === 'released' ? 'Get it on' : 'Wishlist on';

  main.innerHTML = html`
  <section class="g-hero"><div class="wrap g-grid">
    <div>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Challenge</a> › <a href="games.html">Games</a> › ${g.title}</nav>
      <span class="round">${STATUS[g.status].label}</span>
      <h1 class="g-title" data-game-title>${g.title}</h1>
      <p class="g-tag">${g.tagline}</p>
      <div class="tags">${g.categoryList.map((c) => raw(html`<a class="tag" href="games.html?category=${c.id}" style="--cc:${c.color}">${c.icon} ${c.name}</a>`))}</div>
      <div class="facts">${g.rating.count ? raw(html`<span>★ ${g.rating.average.toFixed(1)} (${g.rating.count.toLocaleString()})</span>`) : ''}${g.price ? raw(html`<span>${g.price}</span>`) : ''}<span>${g.platformList.map((p) => p.label).join(' · ')}</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${g.stores.map((s, i) => raw(html`<a class="btn ${i ? '' : 'btn--k'}" href="${s.url || '#'}"${s.url && s.url !== '#' ? raw(' target="_blank" rel="noopener"') : ''}>${(PLATFORMS[s.platform] || {}).icon || '🎮'} ${s.label || `${verb} ${storeLabel(s)}`}</a>`))}${g.stores.length ? '' : raw('<span class="btn" aria-disabled="true">🔔 Coming soon</span>')}</div>
    </div>
    <div style="display:grid;gap:18px">
      <div class="g-art"><img src="${g.media.hero}" alt="${g.title} artwork" width="1200" height="675"></div>
      <div class="mission" aria-live="polite"><h3>🎯 Mission: get to know ${g.title}</h3><ul>${tasks.map(([k, l]) => raw(html`<li data-task="${k}" class="${mission.includes(k) ? 'done' : ''}">${l}<small>+25 XP</small></li>`))}</ul></div>
    </div>
  </div></section>

  <section class="section" data-watch="read"><div class="wrap cols">
    <div class="panel" data-reveal><h3 style="font-size:28px">About</h3><div class="prose">${(g.description.long.length ? g.description.long : [g.description.short]).map((p) => raw(html`<p>${p}</p>`))}</div></div>
    ${g.features.length ? raw(html`<div class="panel" data-reveal><h3 style="font-size:28px">Power-ups</h3><ul class="feats">${g.features.map((f) => raw(html`<li>${f}</li>`))}</ul></div>`) : ''}
  </div></section>

  <section class="section" data-watch="watch"><div class="wrap">
    <div class="sec-head"><div><span class="round">Watch</span><h2>Trailer</h2></div></div>
    <div class="trailer">${g.hasTrailer ? raw(trailerHtml(g)) : raw(html`<div class="trailer-empty"><img src="${g.media.cover}" alt=""><span>Trailer coming soon</span></div>`)}</div>
  </div></section>

  ${g.media.screenshots.length ? raw(html`<section class="section"><div class="wrap">
    <div class="sec-head"><div><span class="round">Look</span><h2>Screenshots</h2></div></div>
    <div class="shots">${g.media.screenshots.map((s, i) => raw(html`<button class="shot" type="button" data-shot="${i}" aria-label="Open screenshot ${i + 1}"><img src="${s}" alt="${g.title} screenshot ${i + 1}" loading="lazy"></button>`))}</div>
  </div></section>`) : ''}

  ${g.reviews.length ? raw(html`<section class="section"><div class="wrap">
    <div class="sec-head"><div><span class="round">The judges say</span><h2>Reviews</h2></div></div>
    <div class="reviews">${g.reviews.map((r) => raw(html`<figure class="review">${typeof r.score === 'number' ? raw(html`<div class="stars" aria-label="${r.score} out of ${r.max || 5}">${starString(r.score, r.max || 5)}</div>`) : ''}<blockquote>“${r.quote}”</blockquote><figcaption><cite>${r.author ? `${r.author} · ` : ''}${r.source}</cite></figcaption></figure>`))}</div>
  </div></section>`) : ''}

  <section class="section" data-watch="info"><div class="wrap cols">
    <div class="panel"><h3 style="font-size:28px">Game info</h3><table class="info"><tbody>${gameFacts(g).map(([k, v]) => raw(html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`))}</tbody></table></div>
    <div><h3 style="font-size:28px;margin-bottom:14px">Next contestant</h3><div class="cards">${relatedGames(g, games, 2).map((x) => raw(card(x).replace(' data-game-card', '')))}</div></div>
  </div></section>
  <dialog class="lightbox" id="lightbox" aria-label="Screenshot viewer"><img src="" alt="" data-lb-img><nav><button class="btn btn--sm" type="button" data-lb-prev>← Prev</button><button class="btn btn--sm btn--k" type="button" data-lb-close>Close</button><button class="btn btn--sm" type="button" data-lb-next>Next →</button></nav></dialog>`;

  const done = (k) => {
    if (mission.includes(k)) return;
    mission.push(k);
    S.missions[g.id] = mission;
    S.xp += 25;
    save();
    $(`[data-task="${k}"]`)?.classList.add('done');
    toast('✅', `${tasks.find((t) => t[0] === k)[1]} · +25 XP`);
    sfx.coin();
    renderHud();
    if (mission.length === tasks.length) award('mission');
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { done(e.target.dataset.watch); io.unobserve(e.target); } }), { threshold: 0.5 });
    main.querySelectorAll('[data-watch]').forEach((s) => io.observe(s));
  }
  bindLightbox($('#lightbox'), g, { root: main, onChange: () => done('shots') });
  if (!g.media.screenshots.length) done('shots');
  reveal(main, reducedMotion);
}
