// Einstellungen (V2-05/V2-15): eine Seite für Anzeige, Bedienung, Hub-Filter, Ton, Datenschutz und eigene Daten.
// Speicherung: sofort im Browser (Gast und Offline-Rückfall), dazu am Konto (/api/me/settings), damit sie auf allen verbundenen Geräten gelten.
// Das Ausblenden betrifft nur die Anzeige. Rechte, Regeln und Einladungslinks bleiben unberührt; Privatsphäre ist getrennt (/api/profile/privacy).
'use strict';
const Settings = (() => {
  const tx = (de, en) => (I18n.language === 'en' ? en : de);
  const KEY = 'poker:settings';
  const DEFAULTS = { display: { theme: 'classic', cardSize: 'normal', calm: false, reduceGlass: false, language: 'de' }, controls: { doubleTap: true, confirmations: true }, hub: { hiddenCategories: [], defaultFilter: 'all', hiddenBlocks: [] }, sound: { enabled: true, master: 1, effects: 1, atmosphere: 0, speech: 1, mutedGames: [] } };
  const CATEGORIES = [['karten', 'Kartenspiele', 'Card games'], ['wuerfel', 'Würfelspiele', 'Dice games'], ['brett', 'Brettspiele', 'Board games'], ['party', 'Party', 'Party'], ['einzelspieler', 'Einzelspieler', 'Single player']];
  const BLOCKS = [['presence', 'Gerade online', 'Who is online'], ['recent', 'Zuletzt gespielt', 'Recently played'], ['favorites', 'Favoriten auf der Startseite', 'Favourites on the start page'], ['achievements', 'Erfolge', 'Achievements'], ['leaderboard', 'Bestenliste', 'Leaderboard'], ['reviews', 'Abend-Rückblicke', 'Evening reviews'], ['planning', 'Abend planen', 'Plan an evening'], ['roadmap', 'Roadmap', 'Roadmap'], ['tickets', 'Tickets', 'Tickets']];
  const FILTERS = [['all', 'Alle Spiele', 'All games'], ['fav', 'Nur Favoriten', 'Favourites only'], ['p2', '2 Spieler', '2 players'], ['p34', '3–4 Spieler', '3–4 players'], ['p56', '5–6 Spieler', '5–6 players'], ['p7', '7 und mehr', '7 or more']];
  const SECTIONS = ['anzeige', 'bedienung', 'hub', 'ton', 'datenschutz', 'daten'];
  const PRIVACY = [
    ['showOnline', 'Online-Status zeigen', 'Show my online status', 'Andere sehen dich unter „Gerade online“.', 'Others see you under “Who is online”.'],
    ['showStats', 'Partien, Siege und Siegquote zeigen', 'Show games, wins and win rate', 'Im öffentlichen Profil.', 'In your public profile.'],
    ['showFavorites', 'Lieblingsspiele zeigen', 'Show favourite games', 'Im öffentlichen Profil.', 'In your public profile.'],
    ['showRecent', 'Letzte Partien zeigen', 'Show recent games', 'Im öffentlichen Profil.', 'In your public profile.'],
    ['showAchievements', 'Erfolge zeigen', 'Show achievements', 'Öffentlich sichtbar – unabhängig davon, ob du sie im Hub ausblendest.', 'Publicly visible – independent of hiding them in the hub.'],
    ['showDiscord', 'Discord-Namen zeigen', 'Show Discord name', 'Nur wenn du mit Discord verknüpft bist.', 'Only if you are linked with Discord.'],
    ['hidden', 'Mein Profil ganz verbergen', 'Hide my profile entirely', 'Niemand außer dir kann es öffnen.', 'Nobody but you can open it.'],
  ];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const bool = (v) => typeof v === 'boolean';
  const volume = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
  const gameIds = (v) => Array.isArray(v) && v.length <= 200 && v.every(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id));
  const oneOf = (list) => (v) => typeof v === 'string' && list.includes(v);
  const subset = (list) => (v) => Array.isArray(v) && v.every((x) => list.includes(x));
  const VALID = {
    display: { theme: oneOf(['classic', 'night']), cardSize: oneOf(['normal', 'large', 'xl']), calm: bool, reduceGlass: bool, language: oneOf(['de', 'en']) },
    controls: { doubleTap: bool, confirmations: bool },
    hub: { hiddenCategories: subset(CATEGORIES.map((c) => c[0])), defaultFilter: oneOf(FILTERS.map((f) => f[0])), hiddenBlocks: subset(BLOCKS.map((b) => b[0])) },
    sound: { enabled: bool, master: volume, effects: volume, atmosphere: volume, speech: volume, mutedGames: gameIds },
  };
  function sanitize(input) {
    const out = clone(DEFAULTS);
    for (const [s, fields] of Object.entries(VALID)) for (const [k, ok] of Object.entries(fields)) { const v = input?.[s]?.[k]; if (ok(v)) out[s][k] = Array.isArray(v) ? [...new Set(v)] : v; }
    return out;
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function legacy() { // vorhandene Browser-Einstellungen übernehmen, damit nichts zurückspringt
    const s = clone(DEFAULTS), p = typeof prefs === 'object' ? prefs : {};
    if (['classic', 'night'].includes(p.theme)) s.display.theme = p.theme;
    if (['normal', 'large', 'xl'].includes(p.cardSize)) s.display.cardSize = p.cardSize;
    s.display.calm = !!p.calm; s.display.reduceGlass = !!p.reduceGlass; s.display.language = I18n.language === 'en' ? 'en' : 'de';
    s.sound.enabled = p.sound !== false;
    return s;
  }
  window.__settingsFromPrefs = () => fromPrefs(); // wird von savePrefs (core.js) gerufen
  const stored = readLocal();
  let version = 0; // zählt lokale Änderungen: eine ältere Serverantwort darf neuere lokale Änderungen nie überschreiben
  let state = stored?.v ? sanitize(stored.v) : legacy(), changedAt = Number(stored?.at) || 0, dirty = !!stored?.dirty, synced = false, privacy = null, registered = false, applying = false, timer = null;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ v: state, at: changedAt, dirty })); } catch { /* ohne Speicher gilt die Einstellung bis zum Neuladen */ } };
  const emit = () => window.dispatchEvent(new CustomEvent('settingschange', { detail: state }));

  // ---------- Anwenden auf die bestehenden Browser-Einstellungen ----------
  function apply() {
    applying = true;
    try {
      const p = prefs, d = state.display;
      p.theme = d.theme; p.cardSize = d.cardSize; p.calm = d.calm; p.reduceGlass = d.reduceGlass; p.sound = state.sound.enabled;
      p.doubleTap = state.controls.doubleTap; p.confirmations = state.controls.confirmations;
      savePrefs();
      if (I18n.language !== d.language) I18n.select(d.language);
    } finally { applying = false; }
  }
  // Schalter an anderer Stelle (z. B. am Tisch) ändern prefs; das spiegelt sich hierher zurück
  function fromPrefs() {
    if (applying) return;
    const p = prefs, next = { display: { theme: p.theme === 'night' ? 'night' : 'classic', cardSize: ['normal', 'large', 'xl'].includes(p.cardSize) ? p.cardSize : 'normal', calm: !!p.calm, reduceGlass: !!p.reduceGlass }, sound: { enabled: p.sound !== false } };
    const differs = Object.entries(next).some(([s, o]) => Object.entries(o).some(([k, v]) => state[s][k] !== v));
    if (differs) update(next, { quiet: true });
  }
  function update(patch, { quiet = false } = {}) {
    for (const [s, o] of Object.entries(patch)) for (const [k, v] of Object.entries(o)) if (VALID[s]?.[k]?.(v)) state[s][k] = Array.isArray(v) ? [...new Set(v)] : v;
    changedAt = Date.now(); version++; dirty = true; persist();
    if (!quiet) apply();
    emit(); push(patch);
  }
  // ---------- Abgleich mit dem Konto ----------
  let pending = {};
  async function call(path, method = 'GET', body) {
    const res = await fetch('/api/me' + path, { method, cache: 'no-store', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' } : method === 'POST' ? { 'X-Requested-With': 'spieleabend', 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : method === 'POST' ? '{}' : undefined });
    const json = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
    if (!res.ok) throw Object.assign(new Error(json.error || tx('Das hat nicht geklappt.', 'That did not work.')), { status: res.status });
    return json;
  }
  function push(patch) {
    for (const [s, o] of Object.entries(patch)) pending[s] = { ...(pending[s] || {}), ...o };
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const body = pending, sentAt = version; pending = {};
      try { const r = await call('/settings', 'PUT', body); synced = true; changedAt = r.updatedAt; dirty = version !== sentAt ? dirty : false; persist(); } catch { synced = false; }
      refreshStatus();
    }, 400);
  }
  async function sync() {
    try {
      const seen = version, r = await call('/settings');
      privacy = r.privacy; registered = r.registered; synced = true;
      if (Object.keys(pending).length || seen !== version) { /* ungesendete lokale Änderungen gehen vor und werden gleich hochgeladen */ }
      else if (dirty) push(state); // beim letzten Besuch nicht mehr hochgeladen (z. B. Seite sofort neu geladen): lokale Werte ans Konto geben
      else if (r.updatedAt > 0) { state = sanitize(r.settings); changedAt = r.updatedAt; persist(); apply(); emit(); }
      else if (stored || changedAt) push(state); // erste Anmeldung mit schon vorhandenen Browser-Einstellungen: ans Konto übernehmen
    } catch { synced = false; }
    refreshStatus();
    if (page.mounted) render();
  }
  async function reset(section) {
    const language = state.display.language; // die Sprache bleibt: ein Zurücksetzen soll niemanden aus seiner Sprache werfen
    if (section) { const next = clone(DEFAULTS[section]); if (section === 'display') next.language = language; update({ [section]: next }); }
    else {
      state = clone(DEFAULTS); state.display.language = language; changedAt = Date.now(); persist(); apply(); emit();
      try { await call('/settings/reset', 'POST'); synced = true; } catch { synced = false; }
    }
    if (page.mounted) render();
  }

  // ---------- Seite ----------
  const page = { mounted: false };
  const row = (path, label, hint, control) => `<div class="set-row"><div><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</div>${control}</div>`;
  const toggle = (path, label, hint) => { const [s, k] = path.split('.'); return `<label class="toggle set-toggle"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><input type="checkbox" role="switch" data-set="${path}" ${state[s][k] ? 'checked' : ''}></label>`; };
  const select = (path, label, options) => { const [s, k] = path.split('.'); return `<label class="field set-field"><span>${esc(label)}</span><select class="input" data-set="${path}">${options.map(([v, text]) => `<option value="${v}" ${state[s][k] === v ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`; };
  const listToggle = (path, items) => items.map(([id, de, en]) => { const [s, k] = path.split('.'); return `<label class="toggle set-toggle"><span>${esc(tx(de, en))}</span><input type="checkbox" role="switch" data-set-list="${path}" data-value="${id}" ${state[s][k].includes(id) ? '' : 'checked'}></label>`; }).join('');
  const head = (id, de, en, section) => `<div class="set-head"><h2>${esc(tx(de, en))}</h2>${section ? `<button type="button" class="btn btn-ghost" data-set-reset="${section}">${esc(tx('Zurücksetzen', 'Reset'))}</button>` : ''}</div>`;
  const soundSlider = (key, label, hint = '') => `<label class="field set-field"><span>${esc(label)} <output data-sound-value="${key}">${Math.round(state.sound[key] * 100)} %</output></span>${hint ? `<small>${esc(hint)}</small>` : ''}<input type="range" min="0" max="100" step="1" value="${Math.round(state.sound[key] * 100)}" data-sound-level="${key}" aria-label="${esc(label)}"></label>`;
  function syncSoundMute() {
    const game = document.querySelector('[data-sound-game]')?.value, control = document.querySelector('[data-sound-mute]');
    if (control) { control.disabled = !game; control.checked = state.sound.mutedGames.includes(game); }
  }
  function body() {
    const p = privacy;
    return `<section class="hub-head"><h1>${esc(tx('Einstellungen', 'Settings'))}</h1><p>${esc(tx('Alles an einem Ort. Änderungen gelten sofort.', 'Everything in one place. Changes apply immediately.'))}</p><p class="set-status" id="set-status" role="status"></p></section>
    <div class="set-page">
    <section class="home-panel set-section" id="set-anzeige">${head('anzeige', 'Anzeige', 'Display', 'display')}
      ${select('display.theme', tx('Tisch', 'Table'), [['classic', tx('Klassisch – grüner Filz', 'Classic – green felt')], ['night', tx('Nacht', 'Night')]])}
      ${select('display.cardSize', tx('Kartengröße', 'Card size'), [['normal', tx('Normal', 'Normal')], ['large', tx('Groß', 'Large')], ['xl', tx('Sehr groß', 'Extra large')]])}
      ${select('display.language', tx('Sprache', 'Language'), [['de', 'Deutsch'], ['en', 'English']])}
      ${toggle('display.calm', tx('Animationen reduzieren', 'Reduce animations'), tx('Weniger Bewegung auf allen Seiten.', 'Less motion everywhere.'))}
      ${toggle('display.reduceGlass', tx('Transparenz reduzieren', 'Reduce transparency'), tx('Deckende Flächen statt Glaseffekt.', 'Solid surfaces instead of glass.'))}</section>
    <section class="home-panel set-section" id="set-bedienung">${head('bedienung', 'Bedienung', 'Controls', 'controls')}
      ${toggle('controls.doubleTap', tx('Doppeltipp zum Ausspielen', 'Double tap to play'), tx('Auf dem Handy erst vergrößern, beim zweiten Tippen spielen. Aus: ein Tippen spielt.', 'On phones, tap once to enlarge and again to play. Off: one tap plays.'))}
      ${toggle('controls.confirmations', tx('Bestätigungen bei Alltagsaktionen', 'Confirm routine actions'), tx('Zum Beispiel beim Weitergeben des Hosts. Endgültiges Löschen fragt immer nach.', 'For example when handing over the host. Deleting for good always asks.'))}</section>
    <section class="home-panel set-section" id="set-hub">${head('hub', 'Startseite und Filter', 'Start page and filters', 'hub')}
      <p class="hint">${esc(tx('Nur Ausblenden in deiner Ansicht: Einladungslinks zu Tischen funktionieren weiterhin.', 'Hiding only affects your view: invitation links to tables keep working.'))}</p>
      <fieldset class="set-group"><legend>${esc(tx('Spielkategorien anzeigen', 'Show game categories'))}</legend>${listToggle('hub.hiddenCategories', CATEGORIES)}</fieldset>
      ${select('hub.defaultFilter', tx('Standardfilter in der Bibliothek', 'Default library filter'), FILTERS.map(([v, de, en]) => [v, tx(de, en)]))}
      <fieldset class="set-group"><legend>${esc(tx('Bereiche anzeigen', 'Show areas'))}</legend>${listToggle('hub.hiddenBlocks', BLOCKS)}</fieldset></section>
    <section class="home-panel set-section" id="set-ton">${head('ton', 'Ton', 'Sound', 'sound')}${toggle('sound.enabled', tx('Töne', 'Sounds'), tx('Kurze Signaltöne am Tisch.', 'Short signal sounds at the table.'))}
      ${soundSlider('master', tx('Gesamt', 'Master'))}
      ${soundSlider('effects', tx('Effekte', 'Effects'))}
      ${soundSlider('atmosphere', tx('Atmosphäre', 'Atmosphere'), tx('Standardmäßig aus. Nur in Welten mit Atmosphäre hörbar.', 'Off by default. Audible only in worlds with atmosphere.'))}
      ${soundSlider('speech', tx('Sprachausgabe', 'Speech'), tx('Lautstärke für spätere Ansagen.', 'Volume for future announcements.'))}
      <fieldset class="set-group"><legend>${esc(tx('Stumm pro Spiel', 'Mute per game'))}</legend>
        <label class="field set-field"><span>${esc(tx('Spiel auswählen', 'Choose game'))}</span><select class="input" data-sound-game>${[...(account.games || []), ...(account.singleplayerGames || [])].map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>
        <label class="toggle set-toggle"><span>${esc(tx('Dieses Spiel stummschalten', 'Mute this game'))}</span><input type="checkbox" role="switch" data-sound-mute></label>
      </fieldset></section>
    <section class="home-panel set-section" id="set-datenschutz">${head('datenschutz', 'Datenschutz', 'Privacy')}
      <p class="hint">${esc(tx('Das bestimmt, was andere sehen. Der Server setzt es durch – nicht nur deine Anzeige.', 'This controls what others see. The server enforces it – not just your display.'))}</p>
      ${p ? `${registered ? '' : `<p class="hint set-guest">${esc(tx('Ohne Discord-Verknüpfung ist dein Profil für andere ohnehin nicht öffentlich.', 'Without a Discord link your profile is not public anyway.'))}</p>`}${PRIVACY.map(([k, de, en, hd, he]) => `<label class="toggle set-toggle"><span>${esc(tx(de, en))}<small>${esc(tx(hd, he))}</small></span><input type="checkbox" role="switch" data-set-privacy="${k}" ${p[k] ? 'checked' : ''}></label>`).join('')}` : `<p class="hint">${esc(tx('Wird geladen …', 'Loading …'))}</p>`}
      <div class="set-actions"><button type="button" class="btn" data-profile="me">${esc(tx('Mein Profil ansehen', 'View my profile'))}</button></div></section>
    <section class="home-panel set-section" id="set-daten">${head('daten', 'Meine Daten', 'My data')}
      <p class="hint">${esc(tx('Alles, was zu deinem Konto gespeichert ist, als JSON-Datei. Mitspieler erscheinen nur als Anzahl.', 'Everything stored for your account as a JSON file. Other players appear only as a count.'))}</p>
      <p class="hint"><a href="/datenschutz" data-privacy-link>${esc(tx('Datenschutz in Kürze: was gespeichert wird, wie lange und wie du es löschst', 'Privacy in brief: what is stored, for how long and how to delete it'))}</a></p>
      <div class="set-actions"><button type="button" class="btn" data-set-export>${esc(tx('Meine Daten herunterladen', 'Download my data'))}</button></div>
      <p class="hint">${esc(tx('Löschen entfernt dein Konto, Name, Einstellungen, Erfolge, Discord-Verknüpfung und deine alte Namensstatistik. Ergebnisse deiner Mitspieler bleiben, dein Name darin wird entfernt.', 'Deleting removes your account, name, settings, achievements, Discord link and old name statistics. Your fellow players’ results stay; your name in them is removed.'))}</p>
      <div class="set-actions"><button type="button" class="btn btn-outline-red" data-set-delete>${esc(tx('Meine Daten löschen …', 'Delete my data …'))}</button></div></section>
    <section class="home-panel set-section"><div class="set-actions"><button type="button" class="btn" data-set-reset-all>${esc(tx('Alles zurücksetzen', 'Reset everything'))}</button></div><p class="hint">${esc(tx('Setzt Anzeige, Bedienung, Filter und Ton auf die Standardwerte. Datenschutz und Daten bleiben unverändert.', 'Resets display, controls, filters and sound to defaults. Privacy and data stay unchanged.'))}</p></section>
    </div>`;
  }
  function refreshStatus() {
    const el = document.getElementById('set-status'); if (!el) return;
    el.textContent = synced ? tx('Gilt auf allen mit deiner Spieler-ID verbundenen Geräten.', 'Applies on all devices linked to your player ID.') : tx('Nur in diesem Browser gespeichert (kein Konto erreichbar).', 'Saved in this browser only (no account reachable).');
  }
  function render() {
    const main = document.getElementById('settings-root'); if (!main) return;
    const y = document.getElementById('hub-main')?.scrollTop || 0;
    main.innerHTML = body(); refreshStatus(); syncSoundMute();
    if (document.getElementById('hub-main')) document.getElementById('hub-main').scrollTop = y;
  }
  function pageHTML() {
    page.mounted = true;
    queueMicrotask(() => { render(); if (!privacy) sync(); const sub = location.hash.split('/')[1]; if (SECTIONS.includes(sub)) document.getElementById('set-' + sub)?.scrollIntoView(); });
    return '<div id="settings-root"></div>';
  }
  async function download() {
    try {
      const res = await fetch('/api/me/export', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || tx('Export nicht möglich.', 'Export not possible.'));
      const url = URL.createObjectURL(await res.blob()), a = document.createElement('a');
      a.href = url; a.download = (res.headers.get('content-disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'spieleabend-daten.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast(error.message, true); }
  }
  async function erase() {
    const id = window.Identity?.gameId || '';
    const typed = await ask({ title: tx('Daten endgültig löschen?', 'Delete your data for good?'), text: tx(`Das lässt sich nicht rückgängig machen. Zur Bestätigung gib deine Game-ID ein (${id}).`, `This cannot be undone. To confirm, enter your game ID (${id}).`), ok: tx('Endgültig löschen', 'Delete for good'), danger: true, input: { label: 'Game-ID', placeholder: id, maxLength: 8 } });
    if (!typed) return;
    try {
      await call('/delete', 'POST', { confirm: typed });
      for (const key of ['poker:name', 'poker:avatar', KEY, 'poker:favs', 'poker:recent', 'poker:last', 'poker:presenceHidden']) { try { localStorage.removeItem(key); } catch { /* egal */ } }
      location.href = '/';
    } catch (error) { toast(error.message, true); }
  }

  document.addEventListener('input', (e) => {
    const key = e.target.dataset?.soundLevel;
    if (!volume(Number(e.target.value) / 100) || !['master', 'effects', 'atmosphere', 'speech'].includes(key)) return;
    update({ sound: { [key]: Number(e.target.value) / 100 } });
    const output = document.querySelector(`[data-sound-value="${key}"]`);
    if (output) output.textContent = `${e.target.value} %`;
  });
  document.addEventListener('change', async (e) => {
    if (e.target.matches?.('[data-sound-game]')) { syncSoundMute(); return; }
    if (e.target.matches?.('[data-sound-mute]')) {
      const id = document.querySelector('[data-sound-game]')?.value, list = new Set(state.sound.mutedGames);
      if (id) { e.target.checked ? list.add(id) : list.delete(id); update({ sound: { mutedGames: [...list] } }); }
      return;
    }
    const t = e.target;
    if (t.matches?.('[data-set]')) { const [s, k] = t.dataset.set.split('.'); update({ [s]: { [k]: t.type === 'checkbox' ? t.checked : t.value } }); return; }
    if (t.matches?.('[data-set-list]')) { // Schalter „anzeigen“: an = nicht in der Verstecken-Liste
      const [s, k] = t.dataset.setList.split('.'), list = new Set(state[s][k]);
      t.checked ? list.delete(t.dataset.value) : list.add(t.dataset.value);
      update({ [s]: { [k]: [...list] } }); return;
    }
    if (t.matches?.('[data-set-privacy]')) {
      const key = t.dataset.setPrivacy; t.disabled = true;
      try {
        const res = await fetch('/api/profile/privacy', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' }, body: JSON.stringify({ [key]: t.checked }) });
        const json = await res.json(); if (!res.ok) throw new Error(json.error);
        privacy = json.privacy;
        if (key === 'showOnline') { try { localStorage.setItem('poker:presenceHidden', JSON.stringify(!t.checked)); } catch { /* egal */ } window.reportPresence?.(true); }
      } catch (error) { t.checked = !t.checked; toast(error.message, true); }
      t.disabled = false;
    }
  });
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest?.('[data-set-reset]')) { reset(t.closest('[data-set-reset]').dataset.setReset); return; }
    if (t.closest?.('[data-set-reset-all]')) { if (await ask({ title: tx('Alles zurücksetzen?', 'Reset everything?'), text: tx('Anzeige, Bedienung, Filter und Ton gehen auf die Standardwerte.', 'Display, controls, filters and sound go back to defaults.'), ok: tx('Zurücksetzen', 'Reset'), danger: true })) reset(); return; }
    if (t.closest?.('[data-set-export]')) { download(); return; }
    if (t.closest?.('[data-set-delete]')) erase();
  });
  // Doppeltipp aus: die Karte verliert ihre „erst vergrößern“-Markierung, ein Tippen spielt (kit.js bleibt unverändert)
  document.addEventListener('click', (e) => { if (prefs.doubleTap === false) e.target.closest?.('[data-peek]')?.removeAttribute('data-peek'); }, true);
  window.addEventListener('identityready', sync);
  // Seite wird verlassen, bevor die verzögerte Übertragung lief: noch schnell senden (die lokale Kopie bleibt als Rückfall)
  window.addEventListener('pagehide', () => { if (Object.keys(pending).length) { try { fetch('/api/me/settings', { method: 'PUT', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' }, body: JSON.stringify(pending) }); } catch { /* lokale Kopie reicht */ } } });
  window.addEventListener('languagechange', (e) => { if (!applying && state.display.language !== e.detail) { state.display.language = e.detail === 'en' ? 'en' : 'de'; changedAt = Date.now(); persist(); push({ display: { language: state.display.language } }); } if (page.mounted && document.getElementById('settings-root')) render(); });
  window.addEventListener('hashchange', () => { page.mounted = location.hash.startsWith('#einstellungen'); });
  apply();
  return {
    get: () => state, page: pageHTML, fromPrefs, sync, reset, SECTIONS,
    categoryHidden: (id) => state.hub.hiddenCategories.includes(id), blockHidden: (id) => state.hub.hiddenBlocks.includes(id),
  };
})();
