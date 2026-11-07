// Startseite (Hub) von Spieleabend: Profil, Navigation per URL-Hash, Seiten, Hosten. Läuft nach /core.js.
// Seiten: #start · #spiele · #spiele/karten|wuerfel|brett|party · #favoriten · #tische · #bestenliste · #roadmap
// Name und Avatar werden einmal festgelegt (localStorage, gleiche Schlüssel wie früher) und überall verwendet.
'use strict';
// Einmalige Bereinigung der früheren Einstellung; die Roadmap ersetzt sie vollständig.
try { localStorage.removeItem('poker:showplanned'); } catch { /* Speicher kann gesperrt sein. */ }

// ---------- Profil ----------
const profile = {
  get name() { return String(store.get('poker:name', '') || '').trim().slice(0, 16); },
  get avatar() { const a = store.get('poker:avatar', null); return AVATARS.includes(a) ? a : AVATARS[0]; },
  save(name, avatarChoice) { store.set('poker:name', name); store.set('poker:avatar', avatarChoice); },
};

function renderProfileChip() {
  const chip = $('#profile-chip');
  if (chip) {
    chip.innerHTML = I18n.html`<span class="chip-av" aria-hidden="true">${esc(profile.avatar)}</span><span class="chip-txt"><b>${esc(profile.name || I18n.t('Profil anlegen'))}</b><small>Profil ändern</small></span>`;
    chip.setAttribute('aria-label', profile.name ? I18n.html`Profil ändern, du bist ${profile.name}` : I18n.t('Profil anlegen'));
  }
  const av = $('#profile-avatar');
  if (av) { av.innerHTML = `<span class="profile-avatar-image">${esc(profile.avatar)}</span><span class="profile-avatar-name">${esc(profile.name || I18n.t('Profil'))}</span><span class="profile-chevron" aria-hidden="true">⌄</span>`; av.setAttribute('aria-label', profile.name ? I18n.html`Profil ändern, du bist ${profile.name}` : I18n.t('Profil anlegen')); }
}

// first = allererster Besuch: der Dialog lässt sich nicht wegklicken, bis ein Name da ist
let profileChoice = null;
function openProfile(first = false) {
  const d = $('#profile-dlg');
  if (d.open) return;
  profileChoice = profile.name ? profile.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)];
  $('#profile-title').textContent = first ? I18n.t('Wie heißt du?') : I18n.t('Ich');
  $('#p-name').value = profile.name;
  $('#p-error').textContent = '';
  window.Identity?.open();
  $('#p-cancel').hidden = first;
  $('#p-achievements').hidden = first;
  $('#p-presence-hidden').checked = !!store.get('poker:presenceHidden', false);
  $('#p-preferences').innerHTML = UITheme.preferences();
  d.dataset.first = first ? '1' : '';
  $('#p-avatars').innerHTML = AVATARS.map((a) => I18n.html`<button type="button" class="avatar-opt" data-a="${a}" aria-pressed="${a === profileChoice}" aria-label="Avatar ${a}">${a}</button>`).join('');
  d.showModal();
  $('#p-name').focus();
}
$('#p-avatars').addEventListener('click', (e) => {
  const b = e.target.closest('.avatar-opt'); if (!b) return;
  profileChoice = b.dataset.a;
  $$('#p-avatars .avatar-opt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});
$('#profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#p-name').value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 16);
  if (!name) { $('#p-error').textContent = I18n.t('Bitte gib einen Namen ein.'); $('#p-name').focus(); return; }
  profile.save(name, profileChoice);
  store.set('poker:presenceHidden', $('#p-presence-hidden').checked);
  reportPresence(true);
  $('#profile-dlg').close();
  renderProfileChip();
  if (pendingJoin) { const code = pendingJoin; pendingJoin = ''; joinFromLink(code); return; }
  if (hubVisible()) renderHub();
});
$('#p-cancel').addEventListener('click', () => $('#profile-dlg').close());
$('#profile-dlg').addEventListener('cancel', (e) => { if ($('#profile-dlg').dataset.first) e.preventDefault(); }); // Esc
$('#profile-chip').addEventListener('click', () => openProfile(false));
$('#profile-avatar').addEventListener('click', () => openProfile(false));

// ---------- Beitreten ----------
// Ist der Name am Tisch schon vergeben, schlägt der Server einen freien vor („Tobi 2“) – wir nehmen ihn und sagen es.
function joinTable(code) {
  const c = String(code || '').trim().toUpperCase();
  const token = store.get('poker:session:' + c, null);
  return new Promise((resolve) => {
    socket.emit('join', { code: c, name: profile.name, avatar: profile.avatar, token }, (r) => {
      if (r && r.ok === false && r.suggestion) {
        toast(I18n.html`„${profile.name}“ ist an diesem Tisch schon vergeben – du spielst hier als „${r.suggestion}“`);
        socket.emit('join', { code: c, name: r.suggestion, avatar: profile.avatar, token: null }, resolve);
      } else resolve(r);
    });
  });
}
// Beitritt per Klick oder Code: bei Erfolg an den Tisch, sonst eine Meldung
async function joinAndEnter(code, mode = '') {
  if (!profile.name) { openProfile(true); return false; }
  const r = await joinTable(code);
  if (!r?.ok) { toast(r?.error || I18n.t('Verbindung fehlgeschlagen'), true); return false; }
  if (mode === 'sit') {
    // Poker braucht einen bestimmten Platz – den sucht man am Tisch aus
    if (r.game === 'poker' || r.game === 'omaha') toast(I18n.t('Such dir am Tisch einen freien Platz aus'));
    else socket.emit('sit', {}, (s) => { if (!s?.ok) toast(s?.error || I18n.t('Der Platz ist leider schon weg – du schaust zu'), true); });
  }
  enterGame(r);
  return true;
}

// ---------- Seiten und Navigation ----------
const GAME_CATEGORIES = [['karten', 'Kartenspiele'], ['wuerfel', 'Würfelspiele'], ['brett', 'Brettspiele'], ['party', 'Party'], ['einzelspieler', 'Einzelspieler']]; // wie games/index.js
const libraryGames = () => [...(account.games || []), ...(account.singleplayerGames || [])];
const hubVisible = () => !$('#hub').hidden;
const ico = (d) => `<svg class="hub-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  einzelspieler: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  start: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
  tische: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c3 0 4.5 2 4.5 5"/>',
  favoriten: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  bestenliste: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4"/><path d="M16 6h4v1a4 4 0 0 1-4 4"/><path d="M12 13v4M8 20h8"/>',
  erfolge: '<circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 6-3 6 3-2-7m-6-6 2-2 2 2-2 2z"/>',
  spiele: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  karten: '<rect x="4" y="6" width="11" height="14" rx="2"/><path d="M9 3.5h8a2 2 0 0 1 2 2V16"/>',
  wuerfel: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>',
  brett: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>',
  party: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  roadmap: '<path d="M6 4v16M6 5h12l-3 4 3 4H6"/><circle cx="6" cy="20" r="1"/>',
  rueckblick: '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16M8 14h3M8 17h7"/>',
  planung: '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16m-9 4h6m-3-3v6"/>',
  tickets: '<path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z"/><path d="M12 7v2m0 3v2m0 3v1"/>',
};
const PAGES = ['start', 'spiele', 'favoriten', 'tische', 'bestenliste', 'roadmap', 'tickets', 'rueckblick', 'planung', 'erfolge', 'solo'];
let route = { page: 'start', sub: '' };
function parseRoute() {
  const [p = 'start', s = ''] = location.hash.replace(/^#/, '').split('/');
  const page = PAGES.includes(p) ? p : 'start';
  return { page, sub: page === 'spiele' && GAME_CATEGORIES.some(([id]) => id === s) || page === 'solo' && Singleplayer.ids.includes(s) || page === 'tickets' && /^[1-9]\d{0,8}$/.test(s) || page === 'rueckblick' && EveningReviews.validId(s) || page === 'planung' && EveningPlans.validId(s) ? s : '' };
}
const hashOf = (page, sub = '') => `#${page}${sub ? '/' + sub : ''}`;
let hubTables = [];                      // offene Tische (vom Server, siehe Teil H3)
const openTableCount = () => hubTables.length;

function navHTML() {
  const cur = hashOf(route.page, route.sub);
  const item = (href, key, label, extra = '') => `<a class="nav-item" href="${href}" aria-label="${I18n.t(label)}" title="${I18n.t(label)}" ${cur === href || ['tickets', 'rueckblick', 'planung'].includes(key) && route.page === key ? 'aria-current="page"' : ''}>${ico(ICONS[key])}<span class="side-label">${I18n.t(label)}</span>${extra}</a>`;
  const n = openTableCount();
  const badge = n ? I18n.html`<span class="badge" aria-label="${n} offene${n === 1 ? 'r' : ''} Tisch${n === 1 ? '' : 'e'}">${n}</span>` : '';
  const games = libraryGames();
  return I18n.html`${item('#start', 'start', I18n.t('Start'))}${item('#spiele', 'spiele', I18n.t('Spielebibliothek'))}${item('#tische', 'tische', I18n.t('Offene Tische'), badge)}${item('#favoriten', 'favoriten', I18n.t('Favoriten'))}${item('#planung', 'planung', I18n.t('Abend planen'))}${item('#bestenliste', 'bestenliste', I18n.t('Bestenliste'))}${item('#erfolge', 'erfolge', I18n.t('Erfolge & Abzeichen'))}${item('#rueckblick', 'rueckblick', I18n.t('Rückblick'))}${item('#roadmap', 'roadmap', 'Roadmap')}${item('#tickets', 'tickets', 'Tickets')}
    <details class="side-categories" ${route.sub && route.page === 'spiele' ? 'open' : ''}><summary class="nav-item">${ico(ICONS.karten)}<span class="side-label">Spielarten</span></summary>
    ${GAME_CATEGORIES.map(([id, title]) => item(I18n.html`#spiele/${id}`, id, title, I18n.html`<span class="count side-label" aria-label="${games.filter((g) => (g.category || 'karten') === id).length} Spiele">${games.filter((g) => (g.category || 'karten') === id).length}</span>`)).join('')}</details>`;
}
function tabbarHTML() {
  const cur = route.page;
  const tab = (href, key, label, on, extra = '') => `<a class="tab-item" href="${href}" ${on ? 'aria-current="page"' : ''}>${ico(ICONS[key])}<span>${I18n.t(label)}</span>${extra}</a>`;
  const n = openTableCount();
  return tab('#start', 'start', I18n.t('Start'), cur === 'start' || cur === 'planung') + tab('#spiele', 'spiele', I18n.t('Spiele'), cur === 'spiele' || cur === 'favoriten')
    + tab('#tische', 'tische', I18n.t('Tische'), cur === 'tische', n ? I18n.html`<span class="badge" aria-label="${n} offen">${n}</span>` : '') + tab('#bestenliste', 'bestenliste', I18n.t('Bestenliste'), ['bestenliste', 'rueckblick', 'erfolge'].includes(cur)) + tab('#roadmap', 'roadmap', 'Roadmap', cur === 'roadmap') + tab('#tickets', 'tickets', 'Tickets', cur === 'tickets');
}

const TITLES = { start: 'Start', spiele: 'Spiele', favoriten: 'Favoriten', tische: 'Offene Tische', bestenliste: 'Bestenliste', roadmap: 'Roadmap', tickets: 'Tickets', rueckblick: 'Abend-Rückblick', planung: 'Abend planen', erfolge: 'Erfolge & Abzeichen' };
let renderedPage = null;
function renderHub(focus = false) {
  route = parseRoute();
  if (route.page === 'spiele' && route.sub === 'einzelspieler' && RANGES[gamesFilter]) gamesFilter = 'all';
  Singleplayer.leave(route.page === 'solo' ? route.sub : '');
  $('#hub-language').innerHTML = I18n.selector();
  $('#side-nav').innerHTML = navHTML();
  $('#hub-tabbar').innerHTML = tabbarHTML();
  $('#hub-menu-nav').innerHTML = navHTML();
  const page = { start: pageStart, spiele: pageGames, favoriten: pageGames, tische: pageTables, bestenliste: pageBoard, roadmap: pageRoadmap, tickets: pageTickets, rueckblick: EveningReviews.page, planung: EveningPlans.page, erfolge: Achievements.page, solo: pageSolo }[route.page];
  const main = $('#hub-main');
  $('#hub').dataset.page = route.page;
  const catalog = ['spiele', 'favoriten'].includes(route.page);
  $('#hub-search-slot').innerHTML = I18n.html`<form id="hub-search-form" role="search"><label class="search"><span class="sr-only">${catalog ? I18n.t('Spiel suchen') : I18n.t('Spiele suchen')}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="${catalog ? 'games-search' : 'hub-search'}" type="search" placeholder="Spiele suchen …" value="${catalog ? esc(gamesQuery) : ''}" autocomplete="off"></label></form>`;
  const scroll = main.scrollTop;
  main.innerHTML = page();
  document.title = I18n.html`${route.page === 'solo' ? (libraryGames().find((g) => g.id === route.sub)?.name || I18n.t('Einzelspieler')) : I18n.t(TITLES[route.page])} – Spieleabend`;
  if (focus || renderedPage !== route.page + route.sub) { main.focus({ preventScroll: true }); scrollTo(0, 0); } else main.scrollTop = scroll;
  renderedPage = route.page + route.sub;
  afterPage?.();
  if (route.page === 'solo' && route.sub) Singleplayer.mount($('#singleplayer-root'), route.sub);
}
function pageSolo() { return route.sub ? '<div id="singleplayer-root" aria-live="off"></div>' : `<p><a href="#spiele/einzelspieler">${I18n.t('Einzelspieler')}</a></p>`; }
let afterPage = null;
$('#hub-more').addEventListener('click', () => $('#hub-menu').showModal());
$('#hub-menu-nav').addEventListener('click', (e) => { if (e.target.closest('a')) $('#hub-menu').close(); });
window.addEventListener('hashchange', () => { if (hubVisible() && !roomCodeFromUrl()) renderHub(true); }); // in einem Raum (?t=) rührt die Startseite die Adresse nie an

// Startseite zeigen. keepUrl: die Adresse stimmt schon („Zurück“ aus dem Raum); sonst wird ein übrig gebliebenes ?t=CODE entfernt.
function showHub(error = '', { keepUrl = false } = {}) {
  $('#game-root').hidden = true;
  $('#hub').hidden = false;
  if (error) toast(error, true);
  if (!keepUrl && roomCodeFromUrl()) history.replaceState(null, '', '/' + (location.hash || '#start')); // ?t=CODE gehört zum Tisch, nicht zur Startseite
  resumeAt = 0; // „Weiterspielen“ neu laden: der gerade verlassene Tisch soll dort stehen
  renderProfileChip();
  if (!profile.name && parseRoute().page !== 'solo' && !(parseRoute().page === 'spiele' && parseRoute().sub === 'einzelspieler')) openProfile(true); // lokale Spiele brauchen kein Profil
  renderHub();
}
const showLobby = (error = '') => showHub(error);

// Link /?t=CODE ohne Token: mit dem Profil direkt beitreten. Ohne Profil erst der Profil-Dialog, danach geht es weiter.
let pendingJoin = '';
async function joinFromLink(code) {
  if (!profile.name) { pendingJoin = code; showHub('', { keepUrl: true }); return; }
  if (!(await joinAndEnter(code))) showHub(); // Tisch gibt es nicht (mehr): Meldung, Startseite, Adresse bereinigen
}

// ---------- Hosten (Seitenpanel bzw. Leiste von unten) ----------
function openHost(id) {
  const g = (account.games || []).find((x) => x.id === id);
  if (!g) return;
  if (!profile.name) { openProfile(true); return; }
  const d = $('#host-dlg');
  d.innerHTML = I18n.html`<form id="host-form" autocomplete="off">
      <button type="button" class="host-close" data-host-close aria-label="Schließen">✕</button>
      <div class="host-art cat-${esc(g.category)}">${g.art}</div>
      <div><h2 id="host-title">${uiText(g.name)} hosten</h2>
      <p class="host-meta">${uiText(catTitle(g.category))} · ${esc(playersText(g))} · ca. ${g.duration} Min.</p></div>
      <p>${uiText(g.description)}</p>
      ${(g.variants || []).length > 1 ? I18n.html`<label class="field"><span>Spielvariante</span><select class="input" id="host-variant">${g.variants.map((v) => I18n.html`<option value="${v.id}">${esc(v.name)} · ${v.minPlayers}–${v.maxPlayers} Spieler</option>`).join('')}</select></label>` : ''}
      ${unoVariantPreviewsHTML(g.id, g.variants || [])}
      ${(g.createFields || []).length ? `<div class="host-fields">${g.createFields.map((f) => `<label class="field"><span>${uiText(f.label)}</span>
        <input data-cf="${esc(f.key)}" type="${f.type === 'number' ? 'number' : 'text'}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''} value="${esc(f.value)}"></label>`).join('')}</div>` : ''}
      <p class="hint">Alles Weitere stellst du am Tisch unter „Host“ ein.</p>
      <p id="host-error" class="error" role="alert"></p>
      <button class="btn btn-brass btn-big" type="submit">Tisch erstellen</button>
    </form>`;
  d.dataset.game = id;
  d.querySelector('#host-variant')?.addEventListener('change', (e) => {
    const v = g.variants.find((v) => v.id === e.target.value);
    d.querySelector('.host-meta').textContent = I18n.html`${catTitle(g.category)} · ${v.minPlayers === v.maxPlayers ? v.minPlayers : `${v.minPlayers}–${v.maxPlayers}`} Spieler · ca. ${v.duration || g.duration} Min.`;
    d.querySelectorAll('[data-cf]').forEach((input) => {
      const option = v.options?.find((o) => o.key === input.dataset.cf);
      if (v.defaults?.[input.dataset.cf] !== undefined) input.value = v.defaults[input.dataset.cf];
      if (option?.min !== undefined) input.min = option.min;
      if (option?.max !== undefined) input.max = option.max;
    });
  });
  if (!d.open) d.showModal();
  d.querySelector('input, button.btn-brass')?.focus();
}
$('#host-dlg').addEventListener('click', (e) => { if (e.target === $('#host-dlg') || e.target.closest('[data-host-close]')) $('#host-dlg').close(); });
$('#host-dlg').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = $('#host-dlg');
  const settings = Object.fromEntries($$('[data-cf]', d).map((el) => [el.dataset.cf, el.value]));
  socket.emit('create', { game: d.dataset.game, name: profile.name, avatar: profile.avatar, settings, variant: $('#host-variant')?.value }, (r) => {
    if (!r?.ok) { $('#host-error').textContent = r?.error || I18n.t('Verbindung fehlgeschlagen'); return; }
    d.close();
    enterGame(r);
  });
});

// ---------- Spielauswahl und Seiten ----------
// Die Auswahl verwendet ausschließlich den registrierten Katalog und öffnet den normalen Host-Dialog.
function openGamePicker() {
  if (!profile.name) { openProfile(true); return; }
  const d = $('#host-dlg');
  d.dataset.game = '';
  d.innerHTML = I18n.html`<div class="game-picker"><button type="button" class="host-close" data-host-close aria-label="Schließen">✕</button><span class="eyebrow">Ein neuer Abend beginnt</span><h2 id="host-title">Was möchtet ihr spielen?</h2><p>Wähle ein Spiel. Danach legst du euren Tisch an und teilst den Code.</p><label class="field"><span>Spiel auswählen</span><input type="search" id="picker-search" placeholder="Name oder Beschreibung" autocomplete="off"></label><ul id="picker-games" class="compact-games"></ul></div>`;
  const render = (query = '') => {
    const q = query.trim().toLocaleLowerCase(I18n.locale);
    const games = sortGames(account.games || []).filter((g) => `${g.name} ${g.description} ${I18n.t(g.name)} ${I18n.t(g.description)}`.toLocaleLowerCase(I18n.locale).includes(q));
    $('#picker-games').innerHTML = games.map((g) => I18n.html`<li><button type="button" data-host="${esc(g.id)}"><span class="mini-art" aria-hidden="true">${g.art}</span><span><b>${uiText(g.name)}</b><small>${esc(playersText(g))} · ${g.duration} Min.</small></span><span aria-hidden="true">→</span></button></li>`).join('') || I18n.html('<li class="hint" role="status">Kein Spiel gefunden. Versuche einen anderen Namen.</li>');
  };
  render();
  $('#picker-search').addEventListener('input', (e) => render(e.target.value));
  if (!d.open) d.showModal();
  $('#picker-search').focus();
}
function pageStart() {
  loadResume();
  return I18n.html`<section class="hub-head welcome"><div><h1>Spielebibliothek</h1><p>Willkommen, ${esc(profile.name)}. Entdecke euer nächstes Spiel.<br>Gemeinsam mehr Spieleabende erleben.</p></div><button type="button" class="btn btn-brass" data-create-table><span aria-hidden="true">⊕</span> Tisch erstellen</button></section>
    ${categoryTabsHTML(false)}
    <div class="home-layout"><div class="home-primary">
      ${gamesPreviewHTML()}
      ${localGamesHTML('recent')}
      <section class="hub-block home-panel live-tables"><div class="hub-block-head"><h2>Am Tisch zusammenkommen</h2><a href="#tische">Alle Tische →</a></div><div data-tables="2">${tablesBlockHTML(2)}</div></section>
      <section class="hub-block home-panel evening-links"><div><span class="eyebrow">Eure Spieleabende</span><h2>Vorfreude & Erinnerungen</h2><p>Plant euren nächsten Abend oder schaut auf die letzten Runden zurück.</p></div><div class="plan-actions"><a class="btn" href="#planung">Nächsten Abend planen</a><a class="btn btn-ghost" href="#rueckblick">Abend-Rückblicke öffnen</a></div></section>
    </div><aside class="home-secondary" aria-label="Deine Runde">
      ${localGamesHTML('favorites')}
      <section class="hub-block home-panel" id="presence-slot">${presenceHTML()}</section>
      ${codeBoxHTML()}
    </aside></div>
    <p class="hub-foot">Ohne Benutzerkonto. Nur Spielgeld, kein Echtgeld.</p>`;
}
// ---------- Spieleliste ----------
// Favoriten, „zuletzt gespielt“ und die Ansicht liegen nur in diesem Browser.
const favs = () => new Set(store.get('poker:favs', []));
const recent = () => store.get('poker:recent', {}) || {};
function markPlayed(id) { const r = recent(); r[id] = Date.now(); store.set('poker:recent', r); }
function toggleFav(id) { const f = favs(); f.has(id) ? f.delete(id) : f.add(id); store.set('poker:favs', [...f]); }
let gamesFilter = 'all';   // all | fav | p2 | p34 | p56 | p7 | short
let gamesQuery = '';
let gamesView = store.get('poker:view', 'tiles') === 'list' ? 'list' : 'tiles';
const CHIPS = [['all', 'Alle'], ['fav', '★ Favoriten'], ['p2', '2 Spieler'], ['p34', '3–4 Spieler'], ['p56', '5–6 Spieler'], ['p7', '7+ Spieler'], ['short', 'Kurz (< 15 Min.)']];
const RANGES = { p2: [2, 2], p34: [3, 4], p56: [5, 6], p7: [7, 99] };
const catTitle = (id) => I18n.t((GAME_CATEGORIES.find(([c]) => c === id) || [, ''])[1]);
const plannedAll = () => account.planned || [];
// 'next' bleibt mit „Bald“ in der Spieleliste. Der übrige Backlog gehört zur Roadmap.
const allGames = () => [...libraryGames(), ...plannedAll().filter((p) => p.status === 'next').map((p) => ({ ...p, planned: true }))];
const playersText = (g) => (g.minPlayers === g.maxPlayers ? I18n.html`${g.maxPlayers} Spieler` : I18n.html`${g.minPlayers}–${g.maxPlayers} Spieler`);

// Sortierung: Favoriten zuerst, dann zuletzt gespielt, dann alphabetisch; Geplantes ans Ende
function sortGames(list) {
  const f = favs(), r = recent();
  return [...list].sort((a, b) => (a.planned ? 1 : 0) - (b.planned ? 1 : 0) || f.has(b.id) - f.has(a.id) || (r[b.id] || 0) - (r[a.id] || 0) || I18n.t(a.name).localeCompare(I18n.t(b.name), I18n.locale));
}
const visibleGames = () => filterGames(allGames());
function filterGames(list) {
  const f = favs();
  const filter = route.page === 'favoriten' ? 'fav' : gamesFilter;
  const q = gamesQuery.trim().toLowerCase();
  return sortGames(list.filter((g) => {
    if (route.sub && (g.category || 'karten') !== route.sub) return false;
    if (filter === 'fav') return !g.planned && f.has(g.id);
    if (RANGES[filter]) return g.minPlayers <= RANGES[filter][1] && g.maxPlayers >= RANGES[filter][0];
    if (filter === 'short') return g.duration < 15;
    return true;
  }).filter((g) => !q || [g.name, g.description || '', I18n.t(g.name), I18n.t(g.description || '')].some((text) => text.toLocaleLowerCase(I18n.locale).includes(q))));
}
function gameHTML(g, tiles) {
  const fav = favs().has(g.id);
  const count = g.minPlayers === g.maxPlayers ? g.minPlayers : `${g.minPlayers}–${g.maxPlayers}`;
  const meta = I18n.html`<span class="gr-meta"><span aria-label="${esc(playersText(g))}">${ico(ICONS.tische)}${esc(count)}</span><span>${ico('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>')}ca. ${g.duration} Min.</span></span>`;
  const star = g.planned ? '' : `<button type="button" class="star" data-fav="${esc(g.id)}" aria-pressed="${fav}" aria-label="${uiText(g.name)} ${fav ? I18n.t('aus den Favoriten nehmen') : I18n.t('zu den Favoriten')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg></button>`;
  const detail = g.planned ? I18n.html`<button type="button" class="btn btn-ghost" data-plan="${esc(g.id)}" aria-label="${uiText(g.name)}: Beschreibung und Regeln">Regeln</button>` : '';
  const action = g.planned ? `<span class="soon">${g.status === 'next' ? I18n.t('Bald') : I18n.t('Geplant')}</span>` : g.local ? `<button type="button" class="btn btn-brass" data-solo-start="${esc(g.id)}">${Singleplayer.hasSave(g.id) ? I18n.t('Fortsetzen') : I18n.t('Spielen')}</button>` : I18n.html`<button type="button" class="btn btn-brass" data-host="${esc(g.id)}" aria-label="${uiText(g.name)} hosten">Hosten</button>`;
  return `<li class="game-${tiles ? 'tile' : 'row'} cat-${esc(g.category)}${g.planned ? ' planned' : ''}" data-id="${esc(g.id)}" ${g.planned ? 'aria-disabled="true"' : ''}>
      <div class="ga">${g.art}</div>
      <div class="gr-main">${g.planned ? `<b>${uiText(g.name)}</b>` : I18n.html`<button type="button" class="game-title" data-game-open="${esc(g.id)}" aria-label="${uiText(g.name)} auswählen"><b>${uiText(g.name)}</b></button>`}<small>${uiText(catTitle(g.category))}</small>${meta}<span>${variantBadgesHTML(g)}</span><span class="gr-desc">${uiText(g.description)}</span></div>
      <div class="gr-actions">${g.planned ? detail : star}${action}</div></li>`;
}
function gamesToolbarHTML() {
  const filter = route.page === 'favoriten' ? 'fav' : gamesFilter;
  const chips = CHIPS.filter(([id]) => (route.page !== 'favoriten' || id !== 'fav') && (route.sub !== 'einzelspieler' || !RANGES[id])).map(([id, label]) => `<button type="button" class="chip" data-chip="${id}" aria-pressed="${filter === id}">${I18n.t(label)}</button>`).join('');
  return I18n.html`<div class="chips" role="group" aria-label="Filter">${chips}</div>
    <div class="view-toggle" role="group" aria-label="Ansicht"><button type="button" data-view="list" aria-pressed="${gamesView === 'list'}">Liste</button><button type="button" data-view="tiles" aria-pressed="${gamesView === 'tiles'}">Kacheln</button></div>`;
}
function gamesBodyHTML() {
  const list = visibleGames();
  if (!list.length) return `<p class="hint">${route.page === 'favoriten' ? I18n.t('Noch keine Favoriten – tipp bei einem Spiel auf den Stern.') : I18n.t('Dazu gibt es kein Spiel. Probier einen anderen Filter.')}</p>`;
  return `<ul class="games ${gamesView === 'tiles' ? 'tiles' : 'rows'}">${list.map((g) => gameHTML(g, gamesView === 'tiles')).join('')}</ul>`;
}
function pageGames() {
  const solo = route.page === 'spiele' && route.sub === 'einzelspieler';
  const title = route.page === 'favoriten' ? I18n.t('Deine Favoriten') : route.sub ? catTitle(route.sub) : I18n.t('Spielebibliothek');
  return I18n.html`<section class="hub-head library-head"><div><h1>${esc(title)}</h1><p>${solo ? I18n.content('Für dich allein. Starte eine Runde oder setze deinen Spielstand fort.','Just for you. Start a round or continue your saved game.') : route.page === 'favoriten' ? I18n.t('Deine Auswahl, nur in diesem Browser gespeichert.') : I18n.t('Entdecke neue Spiele. Finde eure nächste Runde. Gemeinsam mehr Spieleabende erleben.')}</p></div>${solo ? '' : '<button type="button" class="btn btn-brass" data-create-table>⊕ ' + I18n.t('Tisch erstellen') + '</button>'}</section>
    ${categoryTabsHTML(true)}<div class="home-layout library-layout"><div class="home-primary"><section class="home-panel library-panel"><div class="hub-block-head"><h2>${solo ? I18n.content('Deine Solo-Spiele','Your solo games') : route.page === 'favoriten' ? I18n.t('Deine Auswahl') : I18n.t('Alle Spiele')}</h2><span class="library-count">${solo ? (account.singleplayerGames || []).length : libraryGames().length} spielbar</span></div><div class="games-tools"><div id="games-toolbar" class="toolbar">${gamesToolbarHTML()}</div></div><div id="games-body">${gamesBodyHTML()}</div></section></div><aside class="home-secondary" aria-label="${solo ? I18n.t('Einzelspieler') : I18n.t('Deine Runde')}">${localGamesHTML('favorites')}${solo ? '<section class="hub-block home-panel"><h2>' + I18n.content('Dein Spielstand wartet','Your saved game is waiting') + '</h2><p>' + I18n.content('Dein Fortschritt bleibt in diesem Browser. Beim Verlassen pausieren wir für dich.','Your progress stays in this browser. We pause for you when you leave.') + '</p><p>' + I18n.content('Regeln und Einstellungen findest du direkt im Spiel.','Rules and settings are available inside each game.') + '</p></section>' : '<section class="hub-block home-panel" id="presence-slot">' + presenceHTML() + '</section>' + codeBoxHTML()}</aside></div>`;
}
function categoryTabsHTML(all) {
  return I18n.html`<nav class="category-tabs ${all ? '' : 'home-categories'}" aria-label="Spielkategorien">${all ? I18n.html`<a class="category-all" href="#spiele" ${!route.sub && route.page === 'spiele' ? 'aria-current="page"' : ''}>${ico(ICONS.spiele)}Alle Spiele<span>${libraryGames().length}</span></a>` : ''}${GAME_CATEGORIES.map(([id, label]) => `<a href="#spiele/${id}" ${route.sub === id ? 'aria-current="page"' : ''}>${ico(ICONS[id])}${I18n.t(label)}</a>`).join('')}</nav>`;
}
function refreshGames() {
  $('#games-toolbar').innerHTML = gamesToolbarHTML(); $('#games-body').innerHTML = gamesBodyHTML();
  $$('[data-local-games="favorites"]').forEach((panel) => { panel.outerHTML = localGamesHTML('favorites'); });
}
// Beschreibung und Regeln eines noch nicht spielbaren Spiels (im gleichen Panel wie „Hosten“)
function openPlan(id) {
  const g = plannedAll().find((x) => x.id === id) || roadmapData?.flatMap((e) => e.punkte).find((p) => p.id === id)?.spiel;
  if (!g) return;
  if (g.local) { location.hash = '#solo/' + g.id; return; }
  const list = (items) => `<ul class="plan-rules">${items.map((r) => `<li>${esc(I18n.t(r))}</li>`).join('')}</ul>`;
  const d = $('#host-dlg');
  d.innerHTML = I18n.html`<div class="plan-detail">
      <button type="button" class="host-close" data-host-close aria-label="Schließen">✕</button>
      <div class="host-art cat-${esc(g.category)}">${g.art}</div>
      <div><h2 id="host-title">${uiText(g.name)}</h2><p class="host-meta">${uiText(catTitle(g.category))} · ${esc(playersText(g))} · ca. ${g.duration} Min.</p></div>
      <p><span class="soon">${g.status === 'available' ? I18n.t('Erledigt') : g.status === 'next' ? I18n.t('Bald') : I18n.t('Geplant')}</span> ${g.status === 'available' ? I18n.t('Bereits spielbar.') : I18n.t('Noch nicht spielbar.')}</p>
      <p>${uiText(g.description)}</p>
      ${g.vorbild ? I18n.html`<p class="hint">Vorbild (nur die Mechanik): ${esc(g.vorbild)}</p>` : ''}
      <h3>Regeln</h3>${g.rules?.length ? list(g.workPackage ? g.rules.map((t) => I18n.t(t)) : g.rules) : I18n.html('<p>Die vollständigen Spielregeln findest du am Tisch unter „Regeln“.</p>')}
      ${g.houseRules?.length ? I18n.html`<h3>Mögliche Hausregeln</h3>${list(g.houseRules)}` : ''}
      ${g.workPackage ? `<h3>${I18n.content('Arbeitspaket','Work package')} ${esc(g.workPackage)}</h3><p>${uiText(g.design)}</p><p>${I18n.content('Aufwand','Effort')}: ${esc(g.effort)} · ${I18n.content('Abhängigkeiten','Dependencies')}: ${g.dependencies.map(uiText).join(', ')}</p><h3>${I18n.content('Abnahmekriterien','Acceptance criteria')}</h3>${list(g.acceptance.map((t) => I18n.t(t)))}<p><a href="${esc(g.issue)}" target="_blank" rel="noopener noreferrer">GitHub · ${esc(g.workPackage)} ↗</a></p>` : ''}
      <button type="button" class="btn btn-ghost" data-host-close>Schließen</button></div>`;
  d.dataset.game = '';
  d.showModal();
}
// Start: die ersten Spiele (Favoriten, zuletzt gespielt) als Kacheln
function gamesPreviewHTML() {
  const ranked = sortGames(libraryGames());
  const list = favs().size || Object.keys(recent()).length ? ranked.slice(0, 4) : ['poker', 'kniffel', 'reversi', 'werwolf'].map((id) => ranked.find((g) => g.id === id)).filter(Boolean);
  return I18n.html`<section class="hub-block home-panel featured-games"><div class="hub-block-head"><h2>Spiele entdecken</h2><a href="#spiele">Alle ansehen →</a></div><ul class="games tiles home-games">${list.map((g) => gameHTML(g, true)).join('')}</ul></section>`;
}
function localGamesHTML(kind) {
  const favorite = kind === 'favorites', f = favs(), r = recent();
  const list = sortGames(libraryGames()).filter((g) => favorite ? f.has(g.id) : r[g.id]).slice(0, 3);
  if (!favorite && !list.length) return '';
  return `<section class="hub-block home-panel" data-local-games="${kind}"><div class="hub-block-head"><h2>${favorite ? I18n.t('Deine Favoriten') : I18n.t('Zuletzt ausgewählt')}</h2>${favorite ? I18n.html('<a href="#favoriten">Alle →</a>') : ''}</div><p class="local-note">${favorite ? I18n.t('Mit einem Stern für später merken.') : I18n.t('In diesem Browser · keine laufenden Tische')}</p>${list.length ? `<ul class="compact-games">${list.map((g) => I18n.html`<li><button type="button" data-game-open="${esc(g.id)}"><span class="mini-art" aria-hidden="true">${g.art}</span><span><b>${uiText(g.name)}</b><small>${esc(playersText(g))} · ${g.duration} Min.</small></span><span aria-hidden="true">→</span></button></li>`).join('')}</ul>` : `<p class="hint">${favorite ? I18n.t('Noch kein Lieblingsspiel? Vergib in der Bibliothek einen Stern.') : I18n.t('Hier erscheinen Spiele, die du an einem Tisch geöffnet hast.')}</p>`}</section>`;
}
function pageTables() {
  loadResume();
  return I18n.html`<section class="hub-head"><h1>Offene Tische</h1><p>Alle Tische, an die du dich setzen oder bei denen du zuschauen kannst – live aktuell.</p></section>
    <section class="hub-block"><div data-tables="0">${tablesBlockHTML(0)}</div></section>${codeBoxHTML()}`;
}
// ---------- Bestenliste (Seite) ----------
// Filter nach Spiel und Monat; Daten wie im Dialog am Tisch (/api/leaderboard). Das Spiel wird gemerkt.
let boardGame = store.get('poker:boardgame', 'poker');
let boardPeriod = 'all', boardView = 'ranked';
let boardToken = 0;
function pageBoard() {
  loadBoard();
  return I18n.html`<section class="hub-head"><h1>Bestenliste</h1><p>Gewertet zählen nur Partien zwischen registrierten Menschen; die unbestätigte Statistik aller Partien steht in der anderen Ansicht.</p><div class="plan-actions"><a class="btn" href="#rueckblick">Abend-Rückblicke öffnen</a><a class="btn btn-brass" href="#erfolge">Erfolge & Abzeichen ansehen</a></div></section><div id="board-body" class="board" aria-live="polite"><p class="hint">Lade …</p></div>`;
}
async function loadBoard() {
  const token = ++boardToken;
  const r = await fetchLeaderboard(boardGame, boardPeriod, boardView);
  if (!r || token !== boardToken || route.page !== 'bestenliste' || !$('#board-body')) return;
  boardGame = r.game === 'all' ? boardGame : r.game; boardPeriod = r.period;
  store.set('poker:boardgame', boardGame);
  $('#board-body').innerHTML = leaderboardInner(r, 'lbp');
}
document.addEventListener('change', (e) => {
  if (!e.target.matches('[data-lbp]')) return;
  const next = $('#lbp-view').value;
  boardGame = $('#lbp-game').value; boardPeriod = next === boardView ? $('#lbp-period').value : 'all'; boardView = next;
  loadBoard();
});

// Code von außen eintippen
function codeBoxHTML() {
  return I18n.html`<section class="hub-block home-panel code-box"><h2>Ein Platz ist für dich frei?</h2><p class="local-note">Mit eurem Tisch-Code direkt zur Runde.</p>
    <form id="code-form" class="code-form" autocomplete="off"><label class="sr-only" for="code-in">Tisch-Code</label>
      <input id="code-in" class="code-input" maxlength="5" placeholder="ABCDE" autocapitalize="characters" spellcheck="false">
      <button class="btn btn-brass" type="submit">Beitreten</button></form></section>`;
}

// ---------- Klicks ----------
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'code-form') return;
  e.preventDefault();
  const code = $('#code-in').value.trim().toUpperCase();
  if (!code) { toast(I18n.t('Gib erst einen Code ein'), true); return; }
  joinAndEnter(code);
});
document.addEventListener('click', (e) => {
  if (!hubVisible()) return;
  if (e.target.closest('[data-create-table]')) { openGamePicker(); return; }
  const selected = e.target.closest('[data-game-open]');
  if (selected) { if (Singleplayer.ids.includes(selected.dataset.gameOpen)) location.hash = '#solo/' + selected.dataset.gameOpen; else openHost(selected.dataset.gameOpen); return; }
  const solo = e.target.closest('[data-solo-start]');
  if (solo) { location.hash = '#solo/' + solo.dataset.soloStart; return; }
  const host = e.target.closest('[data-host]');
  if (host) { openHost(host.dataset.host); return; }
  const plan = e.target.closest('[data-plan]');
  if (plan) { openPlan(plan.dataset.plan); return; }
  const row = e.target.closest('li.planned');
  if (row && !e.target.closest('button, a')) { openPlan(row.dataset.id); return; }
  const fav = e.target.closest('[data-fav]');
  if (fav) { toggleFav(fav.dataset.fav); route.page === 'start' ? renderHub() : refreshGames(); $$('[data-fav]').find((x) => x.dataset.fav === fav.dataset.fav)?.focus({ preventScroll: true }); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) { gamesFilter = chip.dataset.chip; refreshGames(); $$('[data-chip]').find((x) => x.dataset.chip === gamesFilter)?.focus({ preventScroll: true }); return; }
  const view = e.target.closest('[data-view]');
  if (view) { gamesView = view.dataset.view; store.set('poker:view', gamesView); refreshGames(); $$('[data-view]').find((x) => x.dataset.view === gamesView)?.focus({ preventScroll: true }); return; }
  const join = e.target.closest('[data-join]');
  if (join) { joinAndEnter(join.dataset.join, join.dataset.mode || ''); return; }
});

// ---------- Offene Tische ----------
// Der Server schickt die Liste (ohne Geheimes) und meldet Änderungen höchstens einmal pro Sekunde.
const CAT_NAME = { karten: 'Kartenspiel', wuerfel: 'Würfelspiel', brett: 'Brettspiel', party: 'Partyspiel' };
let hubResume = [];     // meine eigenen Tische (Token im Browser) – stehen ganz vorne
let resumeAt = 0;
function subscribeLobby() { reportPresence(true); socket.emit('lobby', {}, (r) => { if (r?.ok) { hubTables = r.tables; hubPresence = r.presence || { online: [], recent: [] }; refreshTables(); refreshPresence(); } }); }
socket.on('connect', subscribeLobby);
socket.on('lobby', (list) => { hubTables = list; refreshTables(); });

function tableCardHTML(t, mine = false) {
  const free = t.max - t.seats.length;
  const seats = t.seats.map((s) => `<li class="tc-seat"><span class="tc-av" aria-hidden="true">${esc(s.avatar || '🙂')}</span>${s.gameId ? profileLink(s.gameId, s.name) : esc(s.name)}${s.bot ? I18n.html(' <small>(Computer)</small>') : ''}</li>`).join('');
  const actions = mine ? I18n.html`<button type="button" class="btn btn-brass" data-join="${esc(t.code)}">Zurück an den Tisch</button>`
    : free > 0 ? I18n.html`<button type="button" class="btn btn-brass" data-join="${esc(t.code)}" data-mode="sit">Dazusetzen</button><button type="button" class="btn btn-ghost" data-join="${esc(t.code)}" data-mode="watch">Zuschauen</button>`
      : I18n.html`<button type="button" class="btn btn-brass" data-join="${esc(t.code)}" data-mode="watch">Zuschauen</button>`;
  return I18n.html`<article class="table-card cat-${esc(t.category)}${mine ? ' mine' : ''}" aria-label="${esc(t.gameName)}, Tisch ${esc(t.code)}">
      <header><span class="tc-cat">${mine ? I18n.t('Dein Tisch') : esc(CAT_NAME[t.category] || '')}</span><span class="tc-code">${esc(t.code)}</span></header>
      <h3>${esc(t.gameName)}</h3>
      <p class="tc-host">Host: ${esc(t.host?.avatar || '')} ${esc(t.host?.name || '?')}</p>
      <ul class="tc-seats" aria-label="Am Tisch">${seats || I18n.html('<li class="tc-empty">Noch niemand sitzt</li>')}</ul>
      <p class="tc-meta"><b>${t.seats.length} von ${t.max}</b> Plätzen belegt · ${esc(t.status)}${t.watchers ? I18n.html` · ${t.watchers} schau${t.watchers === 1 ? 't' : 'en'} zu` : ''}</p>
      <div class="tc-actions">${actions}</div></article>`;
}
// limit 0 = alle
function tablesBlockHTML(limit) {
  const mine = new Set(hubResume.map((t) => t.code));
  const list = hubTables.filter((t) => !mine.has(t.code));
  const tables = [...hubResume.map((t) => [t, true]), ...list.map((t) => [t, false])];
  const cards = (limit ? tables.slice(0, limit) : tables).map(([t, mine]) => tableCardHTML(t, mine));
  if (!cards.length) return I18n.html`<div class="empty-tables"><p><b>Gerade spielt niemand.</b> Mach doch einen Tisch auf!</p><button type="button" class="btn btn-brass" data-create-table>Tisch aufmachen</button></div>`;
  const more = limit && tables.length > limit ? I18n.html`<p class="more"><a href="#tische">Alle ${tables.length} Tische ansehen</a></p>` : '';
  return I18n.html`<div class="table-grid">${cards.join('')}<a class="table-card table-new" href="#spiele"><span class="plus" aria-hidden="true">+</span><b>Neuen Tisch aufmachen</b></a></div>${more}`;
}
// Nur die Tisch-Bereiche und Zähler neu zeichnen, damit Eingaben (Code) und Fokus erhalten bleiben
let shownCount = -1;
function refreshTables() {
  if (!hubVisible()) return;
  const slots = $$('[data-tables]');
  const focused = document.activeElement?.closest?.('[data-tables]') ? document.activeElement.dataset.join + '|' + (document.activeElement.dataset.mode || '') : '';
  slots.forEach((el) => { el.innerHTML = tablesBlockHTML(Number(el.dataset.tables)); });
  if (focused) $$('[data-join]').find((b) => b.dataset.join + '|' + (b.dataset.mode || '') === focused)?.focus({ preventScroll: true });
  if (hubTables.length !== shownCount) { shownCount = hubTables.length; $('#side-nav').innerHTML = navHTML(); $('#hub-tabbar').innerHTML = tabbarHTML(); $('#hub-menu-nav').innerHTML = navHTML(); }
}
// „Weiterspielen“: Tische, für die dieser Browser ein Token hat und die es noch gibt (private eingeschlossen)
async function loadResume() {
  if (Date.now() - resumeAt < 5000) return;
  resumeAt = Date.now();
  const codes = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('poker:session:')) codes.push(k.slice('poker:session:'.length)); } } catch { /* privater Modus */ }
  const last = store.get('poker:last', null);
  codes.sort((a, b) => (b === last) - (a === last));
  const found = [];
  for (const code of codes.slice(0, 5)) {
    const token = store.get('poker:session:' + code, null);
    if (!token) continue;
    const r = await new Promise((res) => socket.emit('peek', { code, token }, res));
    if (r?.ok && r.found) found.push(r);
    else if (r?.ok) store.set('poker:session:' + code, null); // den Tisch gibt es nicht mehr
  }
  hubResume = found;
  refreshTables();
}

// Suche in der Spieleliste (ab 20 Spielen sichtbar)
document.addEventListener('input', (e) => {
  if (e.target.id !== 'games-search') return;
  gamesQuery = e.target.value;
  $('#games-body').innerHTML = gamesBodyHTML();
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'hub-search-form') return;
  e.preventDefault();
  if (!$('#hub-search')) return;
  gamesQuery = $('#hub-search').value; gamesFilter = 'all';
  location.hash = '#spiele';
});

// Tablet: Seitenleiste ein-/ausklappen (nur Symbole ↔ mit Text), Wahl wird gemerkt
function syncSideToggle() {
  const open = $('#hub').classList.contains('side-open');
  $('#side-toggle').setAttribute('aria-expanded', String(open));
  $('#side-toggle').setAttribute('aria-label', open ? I18n.t('Seitenleiste einklappen') : I18n.t('Seitenleiste ausklappen'));
}
$('#hub').classList.toggle('side-open', store.get('poker:sidebar', 'closed') === 'open');
syncSideToggle();
$('#side-toggle').addEventListener('click', () => {
  const open = $('#hub').classList.toggle('side-open');
  store.set('poker:sidebar', open ? 'open' : 'closed');
  syncSideToggle();
});

// ---------- Roadmap ----------
let roadmapData = null, roadmapRequest = null, roadmapError = '', roadmapFilter = 'alle';
const ROADMAP_FILTERS = [['alle', 'Alle'], ['spiel', 'Spiele'], ['funktion', 'Funktionen'], ['design', 'Design'], ['fehler', 'Fehler']];
const ROADMAP_STAGES = [['jetzt', 'Gerade in Arbeit'], ['naechstes', 'Als Nächstes'], ['danach', 'Danach'], ['spaeter', 'Später'], ['gross', 'Große Projekte'], ['erledigt', 'Schon erledigt']];
const ART_LABEL = { spiel: 'Spiel', funktion: 'Funktion', design: 'Design', discord: 'Discord', betrieb: 'Betrieb', fehler: 'Fehler' };
const ART_ICON = {
  spiel: ICONS.spiele, funktion: '<path d="M12 3v18M3 12h18"/>', design: '<path d="m5 16 11-11 3 3L8 19H5zM14 7l3 3"/>',
  discord: '<path d="M4 5h16v11H9l-5 4zM8 10h1M15 10h1"/>', betrieb: '<path d="m5 4 5 5-2 3 10 8 3-3L11 8l1-3-5-2z"/>',
  fehler: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
};
async function loadRoadmap() {
  if (roadmapRequest) return;
  roadmapError = '';
  roadmapRequest = (async () => {
    try {
      const response = await fetch('/roadmap');
      if (!response.ok) throw new Error(I18n.t('Roadmap konnte nicht geladen werden.'));
      roadmapData = await response.json();
    } catch { roadmapError = I18n.t('Roadmap konnte nicht geladen werden. Bitte versuche es erneut.'); }
    finally { roadmapRequest = null; if (hubVisible() && route.page === 'roadmap') renderHub(); }
  })();
}
function pageRoadmap() {
  if (!roadmapData && !roadmapRequest && !roadmapError) loadRoadmap();
  return I18n.html`<section class="hub-head"><h1>Roadmap</h1><p>Was wir gerade bauen, was als Nächstes kommt und was schon fertig ist.</p></section>
    <div class="chips roadmap-filters" role="group" aria-label="Roadmap filtern">${ROADMAP_FILTERS.map(([id, title]) => `<button type="button" class="chip" data-roadmap-filter="${id}" aria-pressed="${roadmapFilter === id}">${I18n.t(title)}</button>`).join('')}</div>
    <div id="roadmap-body">${roadmapBodyHTML()}</div>`;
}
function roadmapBodyHTML() {
  if (!roadmapData) return roadmapError ? I18n.html`<p role="alert">${esc(roadmapError)}</p><button type="button" class="btn" data-roadmap-retry>Erneut versuchen</button>` : I18n.html('<p role="status">Roadmap wird geladen …</p>');
  const matches = (p) => roadmapFilter === 'alle' || p.art === roadmapFilter || roadmapFilter === 'funktion' && ['discord', 'betrieb'].includes(p.art);
  const open = store.get('poker:roadmapOpen', {});
  const card = (e, points) => {
    const done = e.punkte.filter((p) => p.erledigt).length, total = e.punkte.length;
    return `<article class="roadmap-card ${e.stufe === 'jetzt' ? 'current' : ''}" aria-labelledby="roadmap-${esc(e.id)}">
      <h3 id="roadmap-${esc(e.id)}">${uiText(e.titel)}</h3>${e.datum ? `<time datetime="${e.datum}">${new Date(e.datum + 'T12:00:00').toLocaleDateString(I18n.locale)}</time>` : ''}<p>${uiText(e.satz)}</p>
      ${total > 1 ? I18n.html`<div class="roadmap-progress"><span>${done} von ${total} erledigt</span><progress max="${total}" value="${done}" aria-label="Fortschritt: ${esc(e.titel)}"></progress></div>` : ''}
      <ul class="roadmap-points">${points.map((p) => `<li>${p.art === 'spiel' && p.spiel ? I18n.html`<button type="button" class="roadmap-point" data-plan="${esc(p.id)}" aria-label="${esc(p.titel)}: Beschreibung und Regeln">` : '<div class="roadmap-point">'}
        <span class="roadmap-art" aria-hidden="true">${p.spiel?.art || ico(ART_ICON[p.art])}</span><span><b>${uiText(p.titel)}</b><small>${I18n.t(ART_LABEL[p.art])}${p.erledigt ? I18n.t(' · Erledigt ✓') : ''}</small><span>${uiText(p.text)}</span></span>
        ${p.art === 'spiel' && p.spiel ? '</button>' : '</div>'}</li>`).join('')}</ul></article>`;
  };
  const html = ROADMAP_STAGES.map(([stage, title]) => {
    const list = roadmapData.filter((e) => e.stufe === stage).map((e) => [e, e.punkte.filter(matches)]).filter(([, points]) => points.length);
    if (stage === 'erledigt') list.sort(([a], [b]) => b.datum.localeCompare(a.datum));
    if (!list.length) return '';
    const content = `<div class="roadmap-cards">${list.map(([e, points]) => card(e, points)).join('')}</div>`;
    return ['spaeter', 'gross', 'erledigt'].includes(stage)
      ? `<details class="roadmap-stage" data-roadmap-stage="${stage}" ${open?.[stage] === true ? 'open' : ''}><summary>${I18n.t(title)}<span>${list.length} ${list.length === 1 ? 'Etappe' : 'Etappen'}</span></summary>${content}</details>`
      : `<section class="roadmap-stage"><h2>${I18n.t(title)}</h2>${content}</section>`;
  }).join('');
  return html || I18n.html('<p class="hint">Zu diesem Filter gibt es noch keine Einträge.</p>');
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-roadmap-filter]');
  if (b) {
    roadmapFilter = b.dataset.roadmapFilter;
    $$('.roadmap-filters button').forEach((chip) => chip.setAttribute('aria-pressed', String(chip === b)));
    $('#roadmap-body').innerHTML = roadmapBodyHTML();
  }
  if (e.target.closest('[data-roadmap-retry]')) loadRoadmap();
});
document.addEventListener('toggle', (e) => {
  if (!e.target.matches('[data-roadmap-stage]')) return;
  const saved = store.get('poker:roadmapOpen', {});
  store.set('poker:roadmapOpen', { ...(saved && typeof saved === 'object' ? saved : {}), [e.target.dataset.roadmapStage]: e.target.open });
}, true);

// ---------- Gerade online ----------
let hubPresence = { online: [], recent: [] }, lastInput = Date.now(), presenceSent = '';
function reportPresence(force = false) {
  if (!socket.connected || !profile.name) return;
  const value = { name: profile.name, avatar: profile.avatar, visible: !store.get('poker:presenceHidden', false), active: !document.hidden && Date.now() - lastInput < 300000 };
  const signature = JSON.stringify(value);
  if (!force && signature === presenceSent) return;
  presenceSent = signature;
  socket.emit('presence', value);
}
function relativeSeen(at) {
  const mins = Math.floor(Math.max(0, Date.now() - at) / 60000);
  return mins < 1 ? I18n.t('gerade eben') : mins < 60 ? I18n.html`vor ${mins} Min.` : I18n.html`vor ${Math.floor(mins / 60)} Std.`;
}
// V2-04: Personen mit Game-ID als Schaltfläche zum Profil; ohne Konto (Name als Schlüssel) bleibt es Text
const profileLink = (key, name) => (typeof key === 'string' && key.startsWith('#') ? `<button type="button" data-profile="${esc(key)}">${esc(name)}</button>` : esc(name));
function presenceHTML() {
  const me = (typeof Identity !== 'undefined' && Identity.gameId) || profile.name.trim().toLowerCase(); // Personen laufen über die Game-ID, Clients ohne Konto über den Namen
  const recentlySeen = hubPresence.recent.filter((p) => Date.now() - p.at < 86400000);
  const people = [...hubPresence.online].sort((a, b) => (b.key === me) - (a.key === me) || a.name.localeCompare(b.name, 'de'));
  const list = `<ul class="presence-list">${people.map((p) => `<li><span class="presence-avatar" aria-hidden="true">${esc(p.avatar)}</span><div><b>${profileLink(p.key, p.name)}${p.key === me ? I18n.t(' (du)') : ''}</b><small>${uiText(p.status)}</small></div>
    ${p.code && p.key !== me ? I18n.html`<div class="presence-actions">${p.canJoin ? I18n.html`<button type="button" class="btn btn-brass" data-join="${esc(p.code)}" data-mode="sit">Mitspielen</button>` : ''}<button type="button" class="btn btn-ghost" data-join="${esc(p.code)}" data-mode="watch">Zuschauen</button></div>` : ''}</li>`).join('')}</ul>`;
  const recent = I18n.html`<details class="presence-recent" data-presence-details="recent"><summary>Zuletzt online (${recentlySeen.length})</summary><ul class="presence-list">${recentlySeen.map((p) => `<li><span class="presence-avatar" aria-hidden="true">${esc(p.avatar)}</span><div><b>${profileLink(p.key, p.name)}</b><small><time datetime="${new Date(p.at).toISOString()}">${relativeSeen(p.at)}</time></small></div></li>`).join('') || I18n.html('<li>Noch niemand in den letzten 24 Stunden.</li>')}</ul></details>`;
  const title = I18n.html`Gerade online (${people.length})`;
  return `<div class="presence-desktop"><h2>${I18n.t(title)}</h2>${list || ''}</div>
    <details class="presence-mobile" data-presence-details="online"><summary><span>${I18n.t(title)}</span><span class="presence-avatars" aria-hidden="true">${people.slice(0, 5).map((p) => `<span>${esc(p.avatar)}</span>`).join('')}</span></summary>${list}</details>
    ${people.length ? '' : I18n.html('<p class="hint">Gerade ist niemand sichtbar online.</p>')}${recent}`;
}
function refreshPresence() {
  const slot = $('#presence-slot');
  if (!hubVisible() || !slot) return;
  const opened = new Set($$('details[open]', slot).map((el) => el.dataset.presenceDetails));
  const focusedSummary = document.activeElement?.closest?.('summary')?.parentElement.dataset.presenceDetails;
  const focused = slot.contains(document.activeElement) ? { code: document.activeElement.dataset.join, mode: document.activeElement.dataset.mode } : null;
  slot.innerHTML = presenceHTML();
  $$('details', slot).forEach((el) => { el.open = opened.has(el.dataset.presenceDetails); });
  if (focused) $$('[data-join]', slot).find((el) => el.dataset.join === focused.code && el.dataset.mode === focused.mode)?.focus({ preventScroll: true });
  if (focusedSummary) $$('details', slot).find((el) => el.dataset.presenceDetails === focusedSummary)?.querySelector('summary').focus({ preventScroll: true });
}
socket.on('presence', (data) => { hubPresence = data; refreshPresence(); });
window.addEventListener('identityready', () => refreshPresence());
document.addEventListener('visibilitychange', () => { if (!document.hidden) lastInput = Date.now(); reportPresence(); });
['pointerdown', 'keydown', 'input'].forEach((event) => document.addEventListener(event, () => { lastInput = Date.now(); reportPresence(); }, { passive: true }));
setInterval(() => { reportPresence(); refreshPresence(); }, 30000);
window.addEventListener('storage', (e) => { if (['poker:name', 'poker:avatar', 'poker:presenceHidden'].includes(e.key)) { renderProfileChip(); reportPresence(true); } });
if (socket.connected) subscribeLobby();
