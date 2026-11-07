// Spieleabend – gemeinsamer Teil im Browser: Startseite mit Spielauswahl, Lobby, Verbindung, Dialoge.
// Die Spiele selbst liegen unter /games/<id>/<id>.js (+ .css) und melden sich mit registerGame() an.
// Alles hier ist für die Spiele sichtbar ($, esc, store, prefs, socket, send, toast, ask, beep …).
/* global io */
'use strict';
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Use only for system labels. Player-supplied text must continue to use esc().
const uiText = (source) => esc(I18n.t(source));

const AVATARS = ['🦊', '🐻', '🐼', '🐸', '🦉', '🐯', '🐙', '🦄', '🐺', '🐧', '🦁', '🐢'];
const store = {
  get(k, d) {
    try {
      const raw = localStorage.getItem(k), value = raw === null ? d : JSON.parse(raw);
      // Old or damaged caches must not turn an object/array preference into a scalar.
      if (d && typeof d === 'object' && (!value || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(d))) return d;
      return value;
    } catch { return d; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privater Modus */ } },
};

// ---------- Persönliche Einstellungen (nur in diesem Browser) ----------
// Jedes Spiel bringt seine Standardwerte mit (usePrefs), gespeichert wird alles zusammen.
const prefs = store.get('poker:prefs', {});
function usePrefs(defaults) { for (const [k, v] of Object.entries(defaults)) if (!(k in prefs)) prefs[k] = v; }
usePrefs({ sound: true, calm: false, cardSize: 'normal' });
function savePrefs() { store.set('poker:prefs', prefs); if (session) current?.onPrefs?.(); window.UITheme?.apply(); }

let renderedLanguage = I18n.language;
window.addEventListener('languagechange', () => {
  // Repaint existing state only: do not reconnect, reset a round or reload local games.
  const previousLanguage = renderedLanguage;
  renderedLanguage = I18n.language;
  const active = document.activeElement;
  const drafts = [...document.querySelectorAll('input[id]:not([type=checkbox]):not([type=radio]):not([data-language]), textarea[id], select[id]:not([data-language])')]
    .map((el) => ({ id: el.id, value: el.inputMode === 'decimal' ? I18n.numberDraft(el.value, previousLanguage, renderedLanguage) : el.value, focus: el === active, start: el.selectionStart, end: el.selectionEnd }));
  if (typeof hubVisible === 'function' && hubVisible()) renderHub();
  if (session) current?.onPrefs?.();
  if (typeof renderProfileChip === 'function') renderProfileChip();
  if (typeof syncSideToggle === 'function') syncSideToggle();
  if ($('#profile-dlg')?.open) {
    $('#profile-title').textContent = I18n.t($('#profile-dlg').dataset.first ? 'Wie heißt du?' : 'Ich');
    $('#p-preferences').innerHTML = UITheme.preferences();
  }
  I18n.staticText(document);
  for (const draft of drafts) {
    const el = document.getElementById(draft.id);
    if (!el) continue;
    el.value = draft.value;
    if (draft.focus) {
      el.focus({ preventScroll: true });
      if (draft.start !== null && typeof el.setSelectionRange === 'function') el.setSelectionRange(draft.start, draft.end);
    }
  }
});

// ---------- Zustand ----------
let session = null;                       // { code, token, game }
let account = { mode: 'open', games: [] }; // aus /me: Passwort oder offen, und welche Spiele es gibt
const socket = io({ transports: ['websocket', 'polling'] });

// Die Server-Spielzeit steht während einer gemeinsamen Pause; die Browseruhr läuft weiter.
const receivedGameTimes = new WeakMap();
function gameNow(st) {
  if (!st) return Date.now();
  if (!receivedGameTimes.has(st)) receivedGameTimes.set(st, Date.now());
  return (st.now ?? Date.now()) + (st.gamePaused ? 0 : Date.now() - receivedGameTimes.get(st));
}
const gamePauseButtonHTML = (st) => st?.you?.isHost ? `<button type="button" class="btn btn-sm ${st.gamePaused ? 'btn-brass' : ''}" data-game-pause="${!st.gamePaused}" ${!st.gamePaused && st.phase !== 'playing' && !st.started ? 'disabled' : ''} aria-label="${st.gamePaused ? I18n.t('Spiel fortsetzen') : I18n.t('Spiel für alle pausieren')}" title="${st.gamePaused ? I18n.t('Spiel fortsetzen') : I18n.t('Spiel für alle pausieren')}">${st.gamePaused ? ICON.play : ICON.pause}<span class="game-pause-label">${st.gamePaused ? I18n.t('Fortsetzen') : I18n.t('Pause')}</span></button>` : '';
let observedGameHeader = null;
const gameHeaderObserver = new ResizeObserver(() => {
  if (observedGameHeader?.isConnected) document.documentElement.style.setProperty('--topbar', observedGameHeader.offsetHeight + 'px');
});
function renderGamePause(st) {
  const root = $('#game-root');
  if (!root || !st) return;
  const header = root.querySelector('.topbar');
  if (header && header !== observedGameHeader) { gameHeaderObserver.disconnect(); observedGameHeader = header; gameHeaderObserver.observe(header); }
  root.classList.toggle('game-paused', !!st.gamePaused);
  root.querySelectorAll('#kg-main, #kg-dock, .table-wrap, #dock').forEach((el) => { el.inert = !!st.gamePaused; });
  let banner = $('#game-pause-banner');
  if (st.gamePaused && !banner) {
    banner = document.createElement('section'); banner.id = 'game-pause-banner';
    banner.className = 'game-pause-banner'; banner.setAttribute('aria-label', I18n.t('Gemeinsame Spielpause'));
    root.append(banner);
  }
  if (banner) {
    banner.hidden = !st.gamePaused;
    const content = I18n.html`<div role="status"><b>${ICON.pause} Spiel pausiert</b><span>Für alle angehalten. ${st.you?.isHost ? I18n.t('Du kannst das Spiel fortsetzen.') : I18n.t('Der Host setzt das Spiel fort.')}</span></div>${gamePauseButtonHTML(st)}`;
    if (banner.innerHTML !== content) banner.innerHTML = content;
  }
}
document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-game-pause]');
  if (button) send('gamePause', { paused: button.dataset.gamePause === 'true' });
});

// ---------- Hilfen ----------
const avatarHTML = (p) => esc(p?.avatar || '🙂');
const motionOff = () => prefs.calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
let toastTimer;
function toast(text, bad = false) {
  const t = $('#toast');
  t.textContent = text; t.classList.toggle('bad', bad); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function send(event, data = {}) {
  return new Promise((res) => socket.emit(event, data, (r) => { if (!r?.ok) toast(r?.error || I18n.t('Das hat nicht geklappt'), true); res(r); }));
}

// Kleine Symbole als Inline-SVG – nur wo sie Bedeutung tragen
const svg = (d, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  play: svg('<path d="M7 5l12 7-12 7z"/>', 'fill'),
  offline: svg('<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.6a10 10 0 0 1 4.3-2.4M14.7 10.2A10 10 0 0 1 19 12.6"/><path d="M12 20h.01"/>'),
  crown: svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', 'crown fill'),
  more: svg('<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>', 'fill'),
};

// Eigener Bestätigungsdialog (statt confirm/prompt): Titel, ein Satz, Abbrechen links, Aktion rechts.
// <dialog> hält den Fokus im Dialog, Esc schließt. Ergebnis: false, true oder der eingegebene Wert.
// cancel/cancelValue: eigener Text für den linken Knopf; wer ihn drückt, bekommt cancelValue (Esc bleibt „nichts tun“).
function ask({ title, text = '', ok = 'OK', danger = false, input = null, cancel = I18n.t('Abbrechen'), cancelValue }) {
  const d = $('#dlg');
  if (d.open) d.close();
  $('#dlg-title').textContent = title;
  $('#dlg-text').textContent = text;
  const extra = $('#dlg-extra');
  extra.innerHTML = '';
  extra.hidden = !input;
  let field = null;
  if (input) {
    field = document.createElement('input');
    field.className = 'input';
    field.type = input.type || 'text';
    field.value = input.value ?? '';
    field.readOnly = !!input.readOnly;
    if (input.maxLength) field.maxLength = input.maxLength;
    if (input.placeholder) field.placeholder = input.placeholder;
    field.setAttribute('aria-label', input.label || title);
    // Enter = Aktion (sonst würde das Formular den ersten Knopf, also „Abbrechen“, auslösen)
    field.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); d.close('ok'); } });
    extra.append(field);
  }
  const okBtn = $('#dlg-ok');
  okBtn.textContent = ok;
  okBtn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-brass');
  $('#dlg-cancel').hidden = !!input?.noCancel;
  $('#dlg-cancel').textContent = cancel;
  return new Promise((res) => {
    d.returnValue = '';
    d.addEventListener('close', () => {
      if (d.returnValue === 'ok') res(field && !field.readOnly ? field.value : true);
      else res(d.returnValue === 'cancel' && cancelValue !== undefined ? cancelValue : false);
    }, { once: true });
    d.showModal();
    if (field && !field.readOnly) { field.focus(); field.select(); }
    else if (field) { okBtn.focus(); field.select(); }
    else (danger ? $('#dlg-cancel') : okBtn).focus();
  });
}

// Kurzregeln („?“ am Tisch): ein paar Zeilen und die Hausregeln, die an diesem Tisch gelten.
// Zeilen sind HTML aus dem Spielcode (keine Eingaben von Spielern).
function showHelp({ title, short, house = [], more = null }) {
  let d = $('#help-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'help-dlg'; d.className = 'dlg help-dlg';
    d.setAttribute('aria-labelledby', 'help-title');
    document.body.append(d);
    // Klick neben den Dialog oder auf „Alles klar“ schließt
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-help-close]')) d.close(); });
  }
  d.innerHTML = I18n.html`<div class="help-body"><h2 id="help-title">${esc(title)}</h2>
    <ul class="help-list">${short.map((l) => `<li>${I18n.html(l)}</li>`).join('')}</ul>
    ${house.length ? I18n.html`<h3>Hausregeln an diesem Tisch</h3><ul class="help-list house">${house.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
    <div class="dlg-actions">${more ? I18n.html('<button class="btn btn-ghost" data-help-more>Alle Regeln</button>') : '<span></span>'}<button class="btn btn-brass" data-help-close>Alles klar</button></div></div>`;
  d.querySelector('[data-help-more]')?.addEventListener('click', () => { d.close(); more(); });
  d.showModal();
  d.querySelector('[data-help-close]').focus();
}

// ---------- Töne ----------
let audio;
function beep(freq = 660, ms = 120, vol = 0.05, type = 'sine') {
  if (!prefs.sound) return;
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator(); const g = audio.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audio.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* kein Ton */ }
}

// Kurze Spiel-Töne, alle per Web Audio erzeugt (keine Dateien): Karten, Würfel, Rufe. Schalter „Töne“ unter „Ich“.
function noise(sec, freq, vol, type = 'bandpass', q = 1) {
  if (!prefs.sound) return;
  try {
    audio = audio || new AudioContext();
    const len = Math.max(1, Math.floor(audio.sampleRate * sec));
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); // klingt von selbst aus
    const src = audio.createBufferSource(); const f = audio.createBiquadFilter(); const g = audio.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(audio.destination);
    src.start();
  } catch { /* kein Ton */ }
}
const SFX = {
  card: () => noise(0.06, 2600, 0.35),                                                       // Karte legen: kurzes Wischen
  draw: () => noise(0.1, 1600, 0.22, 'bandpass', 0.7),                                       // Karte ziehen
  shuffle: () => [0, 45, 90, 135, 180, 225].forEach((t) => setTimeout(() => noise(0.04, 3200, 0.2), t)), // Mischen
  dice: () => [0, 55, 95, 150, 185].forEach((t, i) => setTimeout(() => noise(0.025, 1800 + i * 300, 0.5, 'bandpass', 4), t + Math.random() * 20)), // Würfelklappern
  call: () => { beep(660, 110, 0.07, 'square'); setTimeout(() => beep(990, 170, 0.07, 'square'), 110); }, // „UNO!“ / „Mau!“
  catch: () => { beep(180, 220, 0.08, 'sawtooth'); },                                          // Erwischt
  hit: () => { beep(420, 90, 0.07, 'triangle'); setTimeout(() => beep(210, 160, 0.07, 'triangle'), 90); }, // Schlagen
  skip: () => { beep(520, 90, 0.05); setTimeout(() => beep(390, 120, 0.05), 90); },          // Aussetzen
  drum: () => noise(0.22, 300, 0.6, 'lowpass'),                                               // Aufdecken
  chips: () => { beep(2200, 40, 0.03, 'triangle'); setTimeout(() => beep(1800, 50, 0.025, 'triangle'), 50); }, // Chips setzen
  splash: () => { noise(0.28, 700, 0.5, 'lowpass'); setTimeout(() => noise(0.18, 1400, 0.15, 'bandpass'), 60); }, // Wasser (Schiffe versenken)
  done: () => [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 140, 0.05), i * 90)), // Phase geschafft
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 200, 0.055), i * 110)),
  end: () => { beep(440, 160, 0.045); setTimeout(() => beep(330, 220, 0.045), 160); },
};
const sfx = (name) => SFX[name]?.();

// ---------- Erste Schritte: beim ersten Spiel einer Art eine kurze Einführung in 3 Schritten ----------
// Wird pro Browser gemerkt (poker:intro); unter „Ich“ abschaltbar (prefs.intros).
usePrefs({ intros: true });
function showIntro(gameId, title, steps, force = false) {
  const seen = store.get('poker:intro', {});
  if (!force && (!prefs.intros || seen[gameId] || !steps?.length)) return;
  seen[gameId] = true;
  store.set('poker:intro', seen);
  let d = $('#intro-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'intro-dlg'; d.className = 'dlg help-dlg intro-dlg';
    d.setAttribute('aria-labelledby', 'intro-title');
    document.body.append(d);
  }
  let k = 0;
  const draw = () => {
    const [head, text] = steps[k];
    d.innerHTML = I18n.html`<div class="help-body"><small class="intro-step">Erste Schritte · ${esc(title)} · Schritt ${k + 1} von ${steps.length}</small>
      <h2 id="intro-title">${uiText(head)}</h2><p class="intro-text">${I18n.html(text)}</p>
      <div class="intro-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join('')}</div>
      <label class="toggle intro-off"><span>Keine Einführungen mehr zeigen<small>Wieder einschalten unter „Ich“</small></span><input type="checkbox" role="switch" data-intro-off ${prefs.intros ? '' : 'checked'}></label>
      <div class="dlg-actions"><button class="btn btn-ghost" data-intro="skip">${k ? I18n.t('Zurück') : I18n.t('Überspringen')}</button>
        <button class="btn btn-brass" data-intro="next">${k === steps.length - 1 ? I18n.t('Los geht’s') : I18n.t('Weiter')}</button></div></div>`;
    d.querySelector('[data-intro="next"]').focus();
  };
  d.onclick = (e) => {
    const b = e.target.closest('[data-intro]');
    if (!b) return;
    if (b.dataset.intro === 'next') { if (k < steps.length - 1) { k++; draw(); } else d.close(); }
    else if (k) { k--; draw(); } else d.close();
  };
  d.onchange = (e) => { if (e.target.matches('[data-intro-off]')) { prefs.intros = !e.target.checked; savePrefs(); } };
  draw();
  if (!d.open) d.showModal();
}
// Alle Einführungen wieder zeigen (Schalter unter „Ich“ wieder an)
function resetIntros() { store.set('poker:intro', {}); }

// ---------- Spielmodule ----------
// Ein Modul ist ein Objekt mit show() (Spiel einblenden), onState(state) (neuer Stand vom Server)
// und optional onPrefs() (persönliche Einstellungen geändert).
const GAME_MODULES = {};
const gameLoads = {};
let current = null;   // laufendes Spielmodul
let mounted = null;   // dessen Oberfläche gerade in #game-root steckt
let lastState = null; // letzter Stand vom Server – kommt oft, bevor das Modul geladen ist
function registerGame(id, mod) { GAME_MODULES[id] = mod; }
// Spielarten, die die Oberfläche eines anderen Spiels nutzen (Omaha ist Poker mit vier Karten)
const GAME_FILES = { omaha: 'poker' };
async function loadGame(id) {
  // Ein schneller Reconnect kann schon während des Parsens eintreffen. Erst alle
  // gemeinsamen Bausteine (kitGame/partyGame/soloGame) laden, dann das Spielskript.
  if (document.readyState === 'loading') await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  if (GAME_MODULES[id]) return Promise.resolve(GAME_MODULES[id]);
  if (!/^[a-z0-9-]{1,30}$/.test(id)) return Promise.reject(new Error(I18n.t('Dieses Spiel gibt es nicht')));
  if (GAME_FILES[id]) return loadGame(GAME_FILES[id]).then((m) => (GAME_MODULES[id] = m));
  gameLoads[id] ||= new Promise((res, rej) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = `/games/${id}/${id}.css`;
    const js = document.createElement('script');
    js.src = `/games/${id}/${id}.js`;
    let ready = 0;
    const done = () => {
      if (++ready < 2) return;
      if (GAME_MODULES[id]) res(GAME_MODULES[id]); else { delete gameLoads[id]; rej(new Error(I18n.t('Das Spiel konnte nicht geladen werden'))); }
    };
    css.addEventListener('load', done); css.addEventListener('error', done); // ohne Stylesheet geht es zur Not auch
    js.addEventListener('load', done);
    js.addEventListener('error', () => { delete gameLoads[id]; rej(new Error(I18n.t('Das Spiel konnte nicht geladen werden'))); });
    document.head.append(css);
    document.body.append(js);
  });
  return gameLoads[id];
}

// ---------- Verlauf: Raum = /?t=CODE, Startseite = /#seite ----------
// Ein Raum hat immer die Adresse /?t=CODE, die Startseite nie ein ?t=. Raum betreten = pushState, damit „Zurück“ sauber zur Startseite führt.
// „Zurück“ aus dem Raum parkt den Raum: Wir bleiben am Tisch angemeldet (Platz bleibt), sehen aber die Startseite;
// der Tisch steht dort unter „Weiterspielen“, und „Vor“ führt wieder an den Tisch.
const roomCodeFromUrl = () => (new URLSearchParams(location.search).get('t') || '').toUpperCase();
let parked = false;
function pushRoomUrl(code) {
  if (roomCodeFromUrl() === code) { if (location.hash) history.replaceState({ room: code }, '', '/?t=' + code); return; } // Link oder Neuladen: die Adresse stimmt schon
  history.pushState({ room: code }, '', '/?t=' + code);
}

// Ins Spiel wechseln, sobald das Modul geladen ist
async function enterGame(r) {
  window.Singleplayer?.leave();
  const prev = session;
  const game = r.game || 'poker';
  session = { code: r.code, token: r.token, game };
  store.set('poker:session:' + r.code, r.token);
  store.set('poker:last', r.code);
  if (typeof markPlayed === 'function') markPlayed(game); // Startseite: „zuletzt gespielt“
  pushRoomUrl(r.code);
  // Anderes Spiel oder anderer Raum als der, der in dieser Seite hängt: frisch laden (saubere Oberfläche, neue Verbindung).
  // Die Adresse steht schon richtig, und location.reload() legt keinen weiteren Verlaufseintrag an.
  if ((mounted && mounted !== game) || (prev && prev.code !== r.code)) { location.reload(); return; }
  try { current = await loadGame(game); } catch (e) { session = null; showLobby(e.message); return; }
  if (!session) return; // inzwischen rausgeflogen
  mounted = game;
  parked = false;
  $('#hub').hidden = true;
  $('#game-root').hidden = false;
  current.show();
  if (lastState && (!lastState.game || lastState.game === game)) current.onState(lastState); // nie den Stand eines anderen Spiels in dieses Modul geben
}
// Gemeinsamer Teil des Host-Menüs „Spiel beenden“: zwei Knöpfe mit eigenen Bestätigungsdialogen
function endGameHTML(running, noun = I18n.t('Runde')) {
  return I18n.html`<h3>Spiel beenden</h3>
    <div class="danger-zone">
      <button class="btn btn-outline-red" data-end="abort" ${running ? '' : 'disabled title="Gerade läuft keine ' + noun + '"'}>Aktive ${noun} abbrechen</button>
      <p class="hint" style="margin:0">Die ${noun} endet sofort ohne Wertung. Karten, Einsätze und Chips gehen zurück auf den Stand davor.</p>
      <button class="btn btn-outline-red" data-end="close">Tisch schließen</button>
      <p class="hint" style="margin:0">Alle landen auf der Startseite, der Tisch und sein Code sind danach weg. Schon eingetragene Ergebnisse bleiben in der Bestenliste.</p>
    </div>`;
}
async function endGameClick(kind, noun = I18n.t('Runde')) {
  if (kind === 'abort') {
    if (await ask({ title: I18n.html`Aktive ${noun} abbrechen?`, text: I18n.html`Die ${noun} endet sofort ohne Wertung. Einsätze und Chips gehen zurück, danach wartet der Tisch auf den Start.`, ok: I18n.html`${noun} abbrechen`, danger: true })) {
      socket.emit('abortRound', {}, (r) => { if (r && !r.ok) toast(r.error, true); else toast(I18n.html`${noun} abgebrochen`); });
    }
  } else if (kind === 'close') {
    if (await ask({ title: I18n.t('Tisch schließen?'), text: I18n.t('Alle gehen zur Startseite, der Tisch wird gelöscht und der Code wird frei. Ergebnisse bleiben in der Bestenliste.'), ok: I18n.t('Tisch schließen'), danger: true })) {
      socket.emit('closeTable', {}, (r) => { if (r && !r.ok) toast(r.error, true); });
    }
  }
}
// Der Host hat den Tisch geschlossen (oder man selbst): Token vergessen, zur Startseite
socket.on('closed', (c) => {
  if (!session) return;
  const code = session.code;
  store.set('poker:session:' + code, null);
  if (store.get('poker:last', null) === code) store.set('poker:last', null);
  leaveGame();
  showHub();
  toast(c?.text || I18n.t('Der Tisch wurde geschlossen'), true);
});
function leaveGame() {
  session = null; lastState = null; parked = false;
  $('#game-root').hidden = true;
}
// ---------- „Ansehen“: gemeinsame Ansicht für offene Informationen (Stapel, Züge, Blätter) ----------
// Zeigt nur, was alle am Tisch ohnehin sehen dürfen. Am Handy als Blatt von unten, am großen Bildschirm mittig.
// Schließen: Knopf, Klick daneben oder Esc. sections: [{ title, note?, html }] (HTML aus dem Spielcode, Texte von Spielern vorher mit esc())
function openLook({ title = I18n.t('Ansehen'), sections = [] }) {
  let d = $('#look-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'look-dlg'; d.className = 'look-dlg'; d.setAttribute('aria-labelledby', 'look-title');
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-look-close]')) d.close(); });
    document.body.append(d);
  }
  d.innerHTML = I18n.html`<div class="look-grip" aria-hidden="true"></div>
    <div class="look-head"><h2 id="look-title">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-look-close aria-label="Schließen">${svg('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <div class="look-body">${sections.map((s) => `<section class="look-sec"><h3>${esc(s.title)}</h3>${s.note ? `<p class="hint">${esc(s.note)}</p>` : ''}${s.html}</section>`).join('') || I18n.html('<p class="hint">Noch nichts zu sehen.</p>')}</div>`;
  if (!d.open) d.showModal();
  d.querySelector('[data-look-close]').focus();
}
// Fächer: Karten von unten nach oben, die oberste ist hervorgehoben und beschriftet
function lookFan(cardsHTML, { topLabel = 'oben' } = {}) {
  if (!cardsHTML.length) return I18n.html('<p class="hint">leer</p>');
  return `<div class="look-fan" role="list">${cardsHTML.map((c, i) => `<div class="look-card${i === cardsHTML.length - 1 ? ' top' : ''}" role="listitem">${c}${i === cardsHTML.length - 1 ? `<small>${esc(topLabel)}</small>` : ''}</div>`).join('')}</div>`;
}
// Liste der Züge dieser Runde (neuester oben): die letzten n offen, der Rest ausklappbar. detail(m) darf HTML liefern.
function lookMoves(moves, { filter = null, n = 10, detail = null } = {}) {
  const list = (moves || []).filter((m) => (filter ? filter(m) : true)).slice().reverse();
  if (!list.length) return I18n.html('<p class="hint">Noch keine Züge in dieser Runde.</p>');
  const row = (m) => `<li><b>${esc(m.n)}</b> ${esc(m.t)}${detail ? ' ' + (detail(m) || '') : ''}</li>`;
  return `<ol class="look-moves">${list.slice(0, n).map(row).join('')}</ol>${list.length > n ? I18n.html`<details><summary>Alle ${list.length} Züge</summary><ol class="look-moves">${list.slice(n).map(row).join('')}</ol></details>` : ''}`;
}

// Home-Knopf oben links in jedem Spiel: Startseite mit Platz behalten, oder den Tisch ganz verlassen
const homeButtonHTML = () => I18n.html`<button class="home-btn" data-home="open" title="Zur Startseite" aria-label="Zur Startseite">${svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>')}<span>Start</span></button>`;
// Platz behalten: der Server behandelt uns wie bei einem Verbindungsabbruch (Zug-Timer, Pause), der Tisch steht unter „Weiterspielen“
function parkRoom() {
  if (!session || parked) return;
  parked = true;
  socket.emit('park', {});
  showHub();
}
// Tisch endgültig verlassen: Token vergessen, Server räumt die Runde auf (und schließt den Raum, wenn niemand mehr da ist)
function leaveTable() {
  if (!session) return;
  const code = session.code;
  socket.emit('leave', {}, () => {});
  store.set('poker:session:' + code, null);
  if (store.get('poker:last', null) === code) store.set('poker:last', null);
  leaveGame();
  showHub();
}
function openHomeDialog() {
  const d = $('#home-dlg');
  if (d.open) return;
  d.returnValue = '';
  d.showModal();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-home="open"]')) { openHomeDialog(); return; }
  const a = e.target.closest('#home-dlg [data-home-do]');
  if (!a) return;
  $('#home-dlg').close();
  if (a.dataset.homeDo === 'park') {
    parkRoom();
  } else if (a.dataset.homeDo === 'leave') {
    leaveTable();
  }
});
// Vor/Zurück im Browser: Startseite ↔ Raum
function returnToRoom() {
  if (mounted !== session.game) { parked = false; location.reload(); return; } // der Host hat das Spiel gewechselt, während wir auf der Startseite waren
  // Zurück an den Tisch: mit dem Token wieder anmelden, der Server schickt den frischen Stand
  socket.emit('join', { code: session.code, token: session.token }, (r) => {
    if (!r?.ok) { store.set('poker:session:' + session.code, null); toast(r?.error, true); leaveGame(); showHub(); return; }
    parked = false;
    $('#hub').hidden = true;
    $('#game-root').hidden = false;
    if (lastState && (!lastState.game || lastState.game === mounted)) current.onState(lastState);
  });
}
window.addEventListener('popstate', () => {
  const code = roomCodeFromUrl();
  if (!code) {
    if (hubVisible()) return; // nur eine Seite der Startseite (Hash) – das zeichnet hub.js
    if (session) { parkRoom(); return; } // Platz am Tisch behalten
    showHub('', { keepUrl: true });
    return;
  }
  if (session && session.code === code && mounted) { returnToRoom(); return; }
  openRoomByUrl();
});
// Aus dem Rückwärts-/Vorwärts-Cache (bfcache) zurück: die Verbindung dieser Seite ist tot, also sauber neu laden
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
// Statt eines schwarzen Bildschirms: Ist der Raum sichtbar, aber nichts gemountet oder keine Verbindung da, kommt nach 3 s ein Hinweis
let brokenSince = 0;
setInterval(() => {
  const broken = !$('#game-root').hidden && (!mounted || !socket.connected || !lastState);
  if (!broken) { brokenSince = 0; $('#lost').hidden = true; return; }
  brokenSince ||= Date.now();
  if (Date.now() - brokenSince >= 3000) $('#lost').hidden = false;
}, 1000);
$('#lost-reload').addEventListener('click', () => location.reload());

// ---------- Startseite ----------
// Die Startseite (Hub) liegt in hub.js: Profil, Seitenleiste, Tische, Spiele, Hosten, Bestenliste.

// Adresse mit ?t=CODE (Neuladen, Link, „Vor“): mit Token wieder an den Tisch, sonst mit dem Profil beitreten (ohne Profil erst der Profil-Dialog)
function openRoomByUrl() {
  const code = roomCodeFromUrl();
  if (!code) { showLobby(); return; }
  const token = store.get('poker:session:' + code, null);
  if (!token) { joinFromLink(code); return; }
  socket.emit('join', { code, token }, (r) => {
    if (r?.ok) enterGame(r);
    else { store.set('poker:session:' + code, null); joinFromLink(code); }
  });
}

// ---------- Verbindung ----------
socket.on('connect', () => {
  $('#offline').hidden = true;
  if (session && !parked) socket.emit('join', { code: session.code, token: session.token }, (r) => { if (!r?.ok) { toast(r?.error, true); leaveGame(); showLobby(); } });
});
socket.on('disconnect', () => { if (session) $('#offline').hidden = false; });
// Verbindung abgelehnt? Dann ist meist das Passwort-Cookie abgelaufen → zur Passwort-Seite
socket.on('connect_error', async () => {
  try {
    const r = await fetch('/me', { credentials: 'same-origin' });
    if (r.status === 401) location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
  } catch { /* Server nicht erreichbar – Socket.IO versucht es weiter */ }
});
socket.on('replaced', () => { session = null; document.body.innerHTML = I18n.html('<main class="lobby"><div class="lobby-felt"><h1 class="wordmark">Spieleabend</h1><p class="lobby-sub">Du spielst gerade in einem anderen Tab weiter. Diesen Tab kannst du schließen.</p></div></main>'); });
socket.on('kicked', () => { if (session) store.set('poker:session:' + session.code, null); leaveGame(); toast(I18n.t('Der Host hat dich vom Tisch genommen'), true); showLobby(); });
socket.on('state', (st) => {
  receivedGameTimes.set(st, Date.now());
  lastState = st;
  // Der Host hat das Spiel gewechselt: neu laden, das neue Spiel kommt automatisch (gleicher Raum, gleiches Token)
  if (session && st.game && st.game !== session.game) {
    session.game = st.game;
    if (mounted && !parked) { location.reload(); return; }
  }
  if (session && current && !parked && (!st.game || !mounted || st.game === mounted)) current.onState(st);
});

// ---------- Bestenliste über alle Abende ----------
// Daten von /api/leaderboard; Spiel und Zeitraum (alle Abende oder ein Monat) wählbar
// Daten holen und als HTML-Teil bauen (Filter + Tabelle) – gleich für den Dialog am Tisch und die Seite #bestenliste der Startseite.
// pre = Präfix der Element-IDs (lb im Dialog, lbp auf der Seite), damit beide nie dieselben IDs haben.
async function fetchLeaderboard(game, period = 'all') {
  try {
    const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(game || '')}&period=${encodeURIComponent(period)}`, { credentials: 'same-origin' });
    return await res.json();
  } catch { toast(I18n.t('Die Bestenliste ist gerade nicht erreichbar'), true); return null; }
}
function leaderboardInner(r, pre = 'lb') {
  const info = r.games.find((g) => g.id === r.game);
  const isPoker = r.game === 'poker' || r.game === 'omaha';
  const monthName = (m) => new Date(m + '-15T12:00:00').toLocaleDateString(I18n.locale, { month: 'long', year: 'numeric' });
  const months = r.months.includes(r.current) ? r.months : [r.current, ...r.months];
  const fmtPoints = (n) => (isPoker ? `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toLocaleString(I18n.locale)}` : n.toLocaleString(I18n.locale));
  const rows = r.rows.map((x, k) => I18n.html`<tr><td><span class="rank ${k < 3 ? 'r' + (k + 1) : ''}" aria-label="Platz ${k + 1}">${k + 1}</span></td>
    <td>${esc(x.name)}</td><td class="num">${x.played}</td>
    <td class="num">${x.wins} <small>(${Math.round((100 * x.wins) / x.played)} %)</small></td>
    <td class="num ${isPoker ? (x.points > 0 ? 'pos' : x.points < 0 ? 'neg' : '') : ''}">${fmtPoints(x.points)}</td></tr>`).join('');
  return I18n.html`<div class="lb-filters">
      <label class="field"><span>Spiel</span><select id="${pre}-game" class="input" data-${pre}>${r.games.map((g) => `<option value="${esc(g.id)}" ${g.id === r.game ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Zeitraum</span><select id="${pre}-period" class="input" data-${pre}><option value="all">Alle Abende</option>${months.map((m) => `<option value="${m}" ${m === r.period ? 'selected' : ''}>${monthName(m)}</option>`).join('')}</select></label>
    </div>
    ${rows ? I18n.html`<div class="lb-scroll"><table class="standings lb-table"><thead><tr><th></th><th>Name</th><th class="num">${isPoker ? I18n.t('Hände') : 'Partien'}</th><th class="num">Siege</th><th class="num">${esc(info?.scoreLabel || I18n.t('Punkte'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : I18n.html('<p class="hint">In diesem Zeitraum wurde das noch nicht gespielt.</p>')}
    <p class="hint" style="margin:0">Sortiert nach Siegen. ${isPoker ? I18n.t('Eine Partie ist eine Hand, gezählt werden gewonnene und verlorene Chips.') : I18n.html`Eine Partie ist eine Runde. ${info?.lowWins ? I18n.t('Punkte: wenig ist gut.') : ''}`} Wiedererkannt wird man am Namen.</p>`;
}
async function showLeaderboard(game, period = 'all') {
  let d = $('#lb-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'lb-dlg'; d.className = 'dlg lb-dlg';
    d.setAttribute('aria-labelledby', 'lb-title');
    document.body.append(d);
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-lb-close]')) d.close(); });
    d.addEventListener('change', (e) => { if (e.target.matches('[data-lb]')) showLeaderboard($('#lb-game').value, $('#lb-period').value); });
  }
  const r = await fetchLeaderboard(game, period);
  if (!r) return;
  d.innerHTML = I18n.html`<div class="help-body"><h2 id="lb-title">Bestenliste aller Abende</h2>${leaderboardInner(r, 'lb')}
    <div class="dlg-actions"><span></span><button class="btn btn-brass" data-lb-close>Schließen</button></div></div>`;
  if (!d.open) d.showModal();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-leaderboard]');
  if (t) showLeaderboard(t.dataset.leaderboard || 'poker');
});

// Optionale Computer-Mitspieler, für Poker und alle Rundenspiele gleich.
const botLevelName=level=>I18n.t(({easy:'Leicht',medium:'Mittel',hard:'Schwer'})[level]||'Mittel');
let addBotDifficulty='medium',botDraftRoom='';
function botBadgeHTML(state,id){
  const bot=(state.bots||[]).find(p=>p.id===id),player=(state.players||state.seats||[]).find(p=>p?.id===id);
  if(!bot&&!player?.bot)return '';
  return '<small class="bot-difficulty-badge">Bot \u00b7 '+esc(botLevelName(bot?.difficulty||player?.botDifficulty||'medium'))+'</small>';
}
function botControlsHTML(state,busy){
  const bots=state.bots||[],levels=state.botLevels||['medium'],single=levels.length===1;
  const key=state.code+':'+state.game+':'+(state.variant||'classic');if(botDraftRoom!==key){addBotDifficulty='medium';botDraftRoom=key;}
  const occupied=state.players?state.players.filter(p=>p.seated).length:state.seats.filter(Boolean).length,full=occupied>=(state.maxPlayers||state.settings.maxPlayers);
  const options=selected=>levels.map(level=>'<option value="'+level+'" '+(level===selected?'selected':'')+'>'+esc(botLevelName(level))+'</option>').join('');
  return '<section class="bot-controls" aria-label="'+I18n.t('Computer-Mitspieler')+'"><h3>'+I18n.t('Mit Bots spielen (optional)')+'</h3><p class="hint">'+(bots.length?bots.length+' '+I18n.t('Computer-Mitspieler am Tisch.')+' ':I18n.t('Ohne Bots.')+' ')+I18n.t(busy?'\u00c4nderungen gehen nach dieser Runde.':'Du startest die Runde wie gewohnt.')+'</p>'+(single?'<p class="hint" data-bot-single>'+I18n.t('Nur eine Stufe verf\u00fcgbar')+'</p>':'')+'<label class="bot-add-level">'+I18n.t('Schwierigkeit beim Hinzuf\u00fcgen')+' <select data-add-bot-level aria-label="'+I18n.t('Schwierigkeit beim Hinzuf\u00fcgen')+'" '+(busy||single?'disabled':'')+'>'+options(levels.includes(addBotDifficulty)?addBotDifficulty:'medium')+'</select></label> <button type="button" class="btn" data-add-bot '+(busy||full?'disabled':'')+'>'+I18n.t('Bot hinzuf\u00fcgen')+(full?' \u2013 '+I18n.t('Tisch voll'):'')+'</button>'+bots.map(p=>'<div class="bot-row"><span>'+esc(p.name)+' \u00b7 '+I18n.t('Computer')+'</span><label><span class="sr-only">'+esc(p.name)+': '+I18n.t('Schwierigkeit')+'</span><select data-bot-level="'+esc(p.id)+'" aria-label="'+esc(p.name)+': '+I18n.t('Schwierigkeit')+'" '+(busy||single?'disabled':'')+'>'+options(p.difficulty||'medium')+'</select></label><button type="button" class="btn btn-outline-red" data-remove-bot="'+esc(p.id)+'" aria-label="'+esc(p.name)+' '+I18n.t('entfernen')+'" '+(busy?'disabled':'')+'>'+I18n.t('Entfernen')+'</button></div>').join('')+'</section>';
}
document.addEventListener('change',e=>{
  if(e.target.matches('[data-add-bot-level]'))addBotDifficulty=e.target.value;
  if(e.target.matches('[data-bot-level]:not(:disabled)'))send('setBotDifficulty',{id:e.target.dataset.botLevel,difficulty:e.target.value}).then(r=>{if(!r.ok)toast(r.error,true);});
});
document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add-bot]:not(:disabled)');if(add)send('addBot',{difficulty:add.closest('.bot-controls')?.querySelector('[data-add-bot-level]')?.value||'medium'}).then(r=>{if(!r.ok)toast(r.error,true);});
  const remove=e.target.closest('[data-remove-bot]:not(:disabled)');if(remove)send('removeBot',{id:remove.dataset.removeBot});
});

// Host-Schalter: Tisch nicht in der Liste der offenen Tische zeigen (privat, nur per Code/Link). Für Poker und alle Rundenspiele gleich.
function unlistedSwitchHTML(state) {
  return I18n.html`<label class="toggle"><span>Tisch nicht in der Liste zeigen<small>Privat: nur per Code oder Link erreichbar</small></span>
    <input type="checkbox" role="switch" data-unlisted ${state.unlisted ? 'checked' : ''}></label>`;
}
document.addEventListener('change', (e) => {
  const t = e.target.closest?.('[data-unlisted]');
  if (t) send('unlisted', { value: t.checked }).then((r) => { if (r?.ok) toast(t.checked ? I18n.t('Tisch ist jetzt privat – nur per Code oder Link') : I18n.t('Tisch steht wieder in der Liste')); else t.checked = !t.checked; });
});

// Host-Menü: in ein anderes Spiel wechseln (gleicher Raum, alle bleiben drin)
function switchGameHTML(currentId, busy) {
  busy ||= ['running', 'between'].includes(lastState?.partyProgram?.status);
  const others = account.games.filter((g) => g.id !== currentId);
  return I18n.html`<h3>Spiel wechseln</h3>
    <div class="switch-game"><select class="input" id="switch-game" aria-label="Neues Spiel">${others.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select>
      <button class="btn" data-switch-game ${busy ? 'disabled title="Geht erst, wenn die Runde vorbei ist"' : ''}>Wechseln</button></div>
    <p class="hint" style="margin:0">Gleicher Raum und Code, alle bleiben drin. Wer gerade mitspielt, sitzt im neuen Spiel wieder. Der bisherige Stand kommt in den Verlauf.</p>`;
}
async function askSwitchGame() {
  const id = $('#switch-game')?.value;
  const g = account.games.find((x) => x.id === id);
  if (!g) return;
  if (await ask({ title: I18n.html`Zu ${g.name} wechseln?`, text: I18n.t('Die laufende Wertung dieses Spiels endet – sie steht danach im Verlauf. Alle bleiben im Raum.'), ok: I18n.t('Wechseln') })) send('switchGame', { game: id });
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-switch-game]:not(:disabled)')) askSwitchGame(); });

// Abmelden immer erst bestätigen
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.matches('form[action="/logout"]') || form.dataset.confirmed) return;
  e.preventDefault();
  if (await ask({ title: 'Abmelden?', text: I18n.t('Du musst danach das Gruppenpasswort neu eingeben. Am Tisch bleibt dein Platz 5 Minuten frei.'), ok: 'Abmelden', danger: true })) {
    form.dataset.confirmed = '1';
    form.submit();
  }
});

async function boot() {
  try {
    const r = await fetch('/me', { credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return; }
    if (r.ok) { account = { games: [], ...(await r.json()) }; I18n.configureGames([...account.games, ...(account.singleplayerGames || []), ...(account.planned || [])]); }
  } catch { /* offline – Socket.IO versucht es weiter */ }
  // Der Hub und seine Seiten stehen erst nach den gemeinsamen Skripten bereit.
  if (document.readyState === 'loading') await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  openRoomByUrl();
}
boot();

// Als App installierbar (Homescreen): kleiner Service Worker ohne Zwischenspeicher
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* egal – geht auch ohne */ });
