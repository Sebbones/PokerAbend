'use strict';
const Achievements = (() => {
  const groups = { mitspielen: I18n.t('Mitspielen'), gewinnen: I18n.t('Gewinnen'), entdecken: 'Entdecken' };
  const paths = {
    play: '<path d="m9 5 11 7-11 7z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4m-4 2v4m-4 3h8"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
    cards: '<rect x="4" y="6" width="11" height="14" rx="2"/><path d="M9 3h8a2 2 0 0 1 2 2v11M8 12l2-2 2 2-2 2z"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    board: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
    party: '<path d="m12 3 2.5 5.6 6 .8-4.4 4.3 1 6L12 17l-5.1 2.7 1-6-4.4-4.3 6-.8z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16m-12 5 3 2 5-4"/>',
  };
  let data = null, selectedName = null, group = 'all', state = 'all', generation = 0, search = 0, timer;
  const active = (g) => g === generation && hubVisible() && route.page === 'erfolge';
  async function request(path) {
    const res = await fetch('/api/achievements' + path, { cache: 'no-store' });
    if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('Bitte melde dich erneut auf der Seite an');
    const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Erfolge konnten nicht geladen werden'); return json;
  }
  function cards() {
    if (!data || !$('#achievement-cards')) return;
    const filtered = data.badges.filter((b) => (group === 'all' || b.group === group) && (state === 'all' || b.unlocked === (state === 'unlocked')));
    $('#achievement-cards').innerHTML = filtered.map((b) => I18n.html`<article class="achievement-card ${b.unlocked ? 'earned' : 'locked'} tier-${b.tier}" data-badge="${esc(b.id)}"><div class="achievement-card-head"><div class="achievement-medal" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[b.icon] || paths.trophy}</svg></div><div><small>${groups[b.group]} · ${{ bronze: 'Bronze', silver: 'Silber', gold: 'Gold' }[b.tier]}</small><h2>${esc(b.title)}</h2></div><span class="achievement-state">${b.unlocked ? '✓ Erreicht' : 'Noch offen'}</span></div><p>${esc(b.description)}</p><progress value="${b.progress}" max="${b.target}" aria-label="${esc(b.title)}: ${b.progress} von ${b.target}"></progress><small class="achievement-count">${b.progress.toLocaleString(I18n.locale)} / ${b.target.toLocaleString(I18n.locale)}</small></article>`).join('') || I18n.html('<p>Für diesen Filter gibt es keine Abzeichen.</p>');
    $('#achievement-result-count').textContent = I18n.html`${filtered.length} Abzeichen angezeigt`;
  }
  function render(result) {
    data = result; selectedName = result.name;
    $('#achievement-name').value = result.name;
    $('#achievement-body').innerHTML = I18n.html`<section class="achievement-summary"><div><p>Erfolge für</p><h2>${esc(result.name || 'deinen Namen')}</h2><strong>${result.unlocked} von ${result.total} Abzeichen erreicht</strong><progress value="${result.unlocked}" max="${result.total}" aria-label="${result.unlocked} von ${result.total} Abzeichen erreicht"></progress></div><dl>${[['Partien', result.stats.played], [I18n.t('Siege'), result.stats.wins], [I18n.t('Spiele'), result.stats.distinctGames], ['Kategorien', result.stats.categories]].map(([label, value]) => `<div><dt>${label}</dt><dd>${value.toLocaleString(I18n.locale)}</dd></div>`).join('')}</dl></section>
      ${!result.recorded ? I18n.html('<p class="notice">Für diesen Namen gibt es noch keine gewerteten Partien. Spiele eine Partie zu Ende, um das erste Abzeichen zu erhalten.</p>') : ''}
      <div class="achievement-filters"><label class="field"><span>Bereich</span><select class="input" id="achievement-group" aria-label="Abzeichen-Bereich">${Object.entries({ all: 'Alle Bereiche', ...groups }).map(([v, label]) => `<option value="${v}" ${v === group ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field"><span>Fortschritt</span><select class="input" id="achievement-state" aria-label="Abzeichen-Fortschritt">${[['all', 'Alle Abzeichen'], ['unlocked', 'Erreicht'], ['locked', 'Noch offen']].map(([v, label]) => `<option value="${v}" ${v === state ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><p id="achievement-result-count" class="hint" role="status"></p><div class="achievement-grid" id="achievement-cards"></div>`;
    cards();
  }
  async function load(name, g) {
    try { const result = await request('?' + new URLSearchParams({ name, ...(name === profile.name ? { me: '1' } : {}) })); if (active(g)) render(result); }
    catch (error) { if (active(g)) $('#achievement-body').innerHTML = I18n.html`<p class="error" role="alert">${esc(error.message)}</p><button class="btn" data-achievements-refresh>Erneut versuchen</button>`; }
  }
  function page() {
    const name = selectedName ?? profile.name, g = ++generation; data = null;
    queueMicrotask(() => load(name, g));
    return I18n.html`<section class="hub-head"><h1>Erfolge & Abzeichen</h1><p>Deine Meilensteine über alle gewerteten Partien und Spieleabende.</p></section><p class="hint">Wie in der Bestenliste zählt der Anzeigename. Gleiche Namen teilen den Fortschritt; ein anderer Name hat einen eigenen Stand.</p>
      <form id="achievement-player" class="achievement-player"><label class="field"><span>Spielername</span><input class="input" id="achievement-name" maxlength="16" required list="achievement-players" value="${esc(name)}" autocomplete="off"><datalist id="achievement-players"></datalist></label><button class="btn btn-brass" type="submit">Erfolge ansehen</button><button class="btn" type="button" data-achievements-own>Meine Erfolge</button></form><p class="hint">Poker und Omaha zählen pro Hand, andere Spiele pro gewerteter Partie. Zuschauer und abgebrochene Partien zählen nicht. Bereits gespeicherte Ergebnisse gelten ebenfalls.</p><div id="achievement-body" aria-live="polite"><p>Lade Erfolge …</p></div>`;
  }
  function open() {
    selectedName = profile.name; group = 'all'; state = 'all';
    $('#profile-dlg').close(); if (!hubVisible()) parkRoom();
    if (location.hash === '#erfolge') renderHub(true); else location.hash = '#erfolge';
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'achievement-player') return;
    e.preventDefault(); selectedName = $('#achievement-name').value.trim(); if (!selectedName) return;
    load(selectedName, ++generation);
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'achievement-group') { group = e.target.value; cards(); }
    if (e.target.id === 'achievement-state') { state = e.target.value; cards(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'achievement-name') return;
    const value = e.target.value, n = ++search; clearTimeout(timer);
    timer = setTimeout(async () => {
      try { const { names } = await request('/players?' + new URLSearchParams({ q: value })); if (n === search && $('#achievement-players')) $('#achievement-players').innerHTML = names.map((name) => `<option value="${esc(name)}"></option>`).join(''); }
      catch { /* Vorschläge sind optional; das Namenformular bleibt nutzbar. */ }
    }, 200);
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-achievements-open]')) open();
    if (e.target.closest('[data-achievements-own]')) { selectedName = profile.name; load(selectedName, ++generation); }
    if (e.target.closest('[data-achievements-refresh]')) load(selectedName ?? profile.name, ++generation);
  });
  socket.on('achievements', (event) => {
    if (!Array.isArray(event?.names) || !event.names.length) return;
    toast(I18n.html`Neue Abzeichen für ${event.name}: ${event.names.slice(0, 3).join(' · ')}${event.names.length > 3 ? ` (+${event.names.length - 3})` : ''}`);
    if (hubVisible() && route.page === 'erfolge') load(selectedName ?? profile.name, ++generation);
  });
  return { page, open };
})();
