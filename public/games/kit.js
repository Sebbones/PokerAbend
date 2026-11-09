// Gemeinsame Oberfläche für rundenbasierte Spiele (alles außer Poker): Kopfzeile, Spielerleiste,
// Seitenleiste (Verlauf, Stand, Regeln, Host), Mitspielen/Zuschauen und Runde starten.
// Ein Spiel meldet sich mit kitGame({ … }) an und liefert nur, was auf seinen Tisch und in seine Aktionsleiste gehört:
//   id, name, rules (HTML), short (Kurzregeln, Zeilen), house(S) → aktive Hausregeln (Zeilen),
//   main(S) → HTML Tisch, dock(S) → HTML Aktionen (nur wenn man in der Runde ist),
//   playerInfo(p, S) → kurzer Text in der Spielerleiste, seat(p, S) → HTML am Platz am Tisch (sonst playerInfo),
//   hint(S, myTurn) → ein Satz über der eigenen Hand: was man gerade tun kann,
//   sort: { color(c), number(c) } → Sortierschlüssel für die Hand (Knopf „Sortieren“),
//   onDrop(quelle, ziel, S) → Karte per Ziehen abgelegt (Desktop; Ziele tragen data-drop),
//   peek: true → bei überlappender Hand (Handy) erst vergrößern, zweites Tippen spielt,
//   status(S, myTurn) → eigene Statuszeile oben, direction: false → keinen Richtungspfeil zeigen, afterRender(S) → nach dem Zeichnen (z. B. Animationen),
//   prefs() → eigene Schalter im Reiter „Ich“, standExtra(S) → zusätzlicher Teil im Reiter „Stand“,
//   intro: [[Überschrift, Text], …] → Erste Schritte beim ersten Spiel (3 Schritte), sounds(S, prev) → eigene Töne (Namen aus SFX),
//   translate(text) → Texte vom Server anders benennen (z. B. deutsches Blatt), onClick(el, S) für Elemente mit data-g,
//   ring: false → auch am großen Bildschirm die Spielerleiste oben statt Plätzen rund um den Tisch,
//   lobby(S) → optionale eigene Lobby; ohne Haken bleibt die gemeinsame Lobby unverändert,
//   roundWord → statt „Runde“ (Partyspiele: „Partie“), dockKey(S) → nur wenn sich der Schlüssel ändert, wird die Aktionsleiste neu gezeichnet
//   (Eingabefelder behalten so ihren Text), watchDock(S) → Aktionen für Zuschauer, hostExtra(S) → zusätzlicher Teil im Host-Menü
// Läuft nach /core.js ($, esc, send, toast, ask, beep, socket …).
'use strict';

// Game-local language and touch corrections, loaded without modifying hub or
// platform files. Existing German copy stays intact; user text is never scanned.
let releaseEnglishRules = {};
if (typeof HTMLLinkElement !== 'undefined' && document.head?.appendChild) {
  const touch = document.createElement('link'); touch.rel = 'stylesheet'; touch.href = '/games/release-touch.css'; document.head.appendChild(touch);
  window.gameRulesReady = import('/games/release-rules.js').then((module) => {
    releaseEnglishRules = module.rules;
    for (const [source, english] of Object.entries(module.copy || {})) if (!Object.hasOwn(window.EN, source)) window.EN[source] = english;
    if (I18n.language === 'en') window.dispatchEvent(new CustomEvent('languagechange', { detail: 'en' }));
  });
}

// EXP-F4: shared result component; also callable by non-kit games.
const winnerStageModule = import('/motion/celebrate.js');
let winnerStageGeneration = 0;
let winnerStageReconnecting = false;
window.configureWinnerWorld = (game, options) => winnerStageModule.then(m => m.configureWorld(game, options));
window.finishWinnerStages = () => { winnerStageGeneration++; winnerStageModule.then(m => m.finishAll()); };
window.showWinnerStage = (host, state, options = {}) => {
  const generation = ++winnerStageGeneration, requested = performance.now(), restoring = winnerStageReconnecting;
  if (options.poker) winnerStageReconnecting = false;
  return winnerStageModule.then(m => {
    if (generation !== winnerStageGeneration || !host?.isConnected) return;
    if (options.poker && !state.hand?.done) { m.finishAll(); host.querySelector('[data-result-stage]')?.remove(); return; }
    let root = options.poker ? host.querySelector('[data-result-stage]') : host;
    if (!root) { root = document.createElement('section'); root.dataset.resultStage = ''; host.append(root); }
    const model = options.poker ? m.pokerResultModel(state) : m.resultModel(state, options);
    const stage = m.mountStage(root, model, { ...options, fresh: options.fresh && !restoring && performance.now() - requested < 600,
      language: I18n.language, reduced: motionOff,
      playSound: async (event, world) => { if (world.palette) await Sound.use(world.palette); if (root.isConnected && !root.closest('[hidden]') && generation === winnerStageGeneration) await Sound.play(event, { game: state.game }); },
    });
    if (options.poker) { const close = document.createElement('button'); close.className = 'btn btn-ghost'; close.textContent = I18n.language === 'en' ? 'Close result' : 'Ergebnis schließen'; close.onclick = () => { stage?.finish(); root.remove(); }; root.append(close); }
    return stage;
  });
};
socket.on('disconnect', () => { winnerStageReconnecting = true; window.finishWinnerStages(); });

usePrefs({ marks: true });

// ---------- Bausteine, die mehrere Spiele brauchen ----------
// Farbsymbol für farbbasierte Karten (Farbenblind-Hilfe, Schalter unter „Ich“): jede Farbe hat ihre eigene Form
const MARK_SHAPE = {
  r: '<path d="M12 3 22 20H2z"/>',                 // Rot: Dreieck
  y: '<circle cx="12" cy="12" r="9.5"/>',           // Gelb: Kreis
  g: '<rect x="3" y="3" width="18" height="18"/>',  // Grün: Quadrat
  b: '<path d="M12 1.5 22.5 12 12 22.5 1.5 12z"/>', // Blau: Raute
};
const MARK_NAME = { r: 'Dreieck', y: 'Kreis', g: 'Quadrat', b: 'Raute' };
const colorMark = (k) => (MARK_SHAPE[k] ? `<svg class="cm" viewBox="0 0 24 24" aria-hidden="true">${MARK_SHAPE[k]}</svg>` : '');
// Verdeckter Kartenfächer für den Platz am Tisch (zeigt nur die Anzahl)
function fanHTML(n) {
  const k = Math.min(n, 7);
  return `<span class="fan" aria-hidden="true">${[...Array(k)].map((_, i) => `<i style="--r:${(i - (k - 1) / 2) * 9}deg"></i>`).join('')}</span>`;
}

const SUIT_SIGN = { c: '♣', s: '♠', h: '♥', d: '♦' };
const RANK_DE = { T: '10', J: 'B', Q: 'D', K: 'K', A: 'A' };
// Französische Karte (Mau-Mau): "Th" → 10♥
function frenchCard(c, { cls = '', attrs = '' } = {}) {
  const red = c[1] === 'h' || c[1] === 'd';
  const r = RANK_DE[c[0]] || c[0];
  return `<button type="button" class="kc kc-fr ${red ? 'red' : ''} ${cls}" ${attrs} aria-label="${esc(r + ' ' + SUIT_SIGN[c[1]])}"><span class="r">${r}</span><span class="s">${SUIT_SIGN[c[1]]}</span></button>`;
}
// Würfel mit Augen (3 × 3 Raster)
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function dieHTML(n, { cls = '', attrs = '', tag = 'span' } = {}) {
  return I18n.html`<${tag} class="die ${cls}" ${attrs} role="img" aria-label="Würfel ${n || I18n.t('leer')}">${[...Array(9)].map((_, i) => `<i class="${PIPS[n]?.includes(i) ? 'on' : ''}"></i>`).join('')}</${tag}>`;
}
const backCard = (label = '') => `<div class="kc kc-back" aria-hidden="true">${label}</div>`;

// ---------- Kartenblatt: französisch (Kreuz, Pik, Herz, Karo) oder deutsch (Eichel, Grün, Herz, Schellen) ----------
// Gilt für alle Spiele mit 32er-Blatt (Mau-Mau, Schwimmen). Karten sind immer „Rang + Farbe“ (z. B. "Kh");
// das deutsche Blatt ist nur eine andere Ansicht (Bube = Unter, Dame = Ober). Schalter unter „Ich“: deckPrefHTML().
const DECK = (() => {
  usePrefs({ deck: 'fr' });
  const german = () => prefs.deck === 'de';

  // Deutsche Farben als eigene kleine Zeichnungen (keine Bilder aus dem Netz)
  const DE_SUIT = {
    c: '<ellipse cx="12" cy="15.2" rx="5.3" ry="6.6" fill="#C8963A"/><path d="M5 10.6a7 6.2 0 0 1 14 0z" fill="#6B4423"/><path d="M7.5 8.3l9 0M6.6 9.8h10.8" stroke="#8A5C33" stroke-width=".9"/><path d="M12 4.6V1.8" stroke="#6B4423" stroke-width="2" stroke-linecap="round"/>', // Eichel
    s: '<path d="M12 2C6.4 5.8 4.3 10.8 6.1 15.6c1.3 3.3 3.7 5 5.9 5s4.6-1.7 5.9-5C19.7 10.8 17.6 5.8 12 2z" fill="#2E8B4E"/><path d="M12 5.5V23M12 10l-3-2.2M12 10l3-2.2M12 14l-3.6-2.4M12 14l3.6-2.4" stroke="#1A5A31" stroke-width="1.2" fill="none" stroke-linecap="round"/>', // Grün (Blatt)
    h: '<path d="M12 21s-7.6-4.7-9.6-9.3C.9 8.3 3.1 4.4 6.7 4.4c2.2 0 3.7 1.3 5.3 3.3 1.6-2 3.1-3.3 5.3-3.3 3.6 0 5.8 3.9 4.3 7.3C19.6 16.3 12 21 12 21z" fill="#C8322D"/>', // Herz
    d: '<circle cx="12" cy="12.5" r="8.6" fill="#E8B21C" stroke="#9A6B00" stroke-width="1"/><path d="M3.8 10.6h16.4" stroke="#C8322D" stroke-width="2.6"/><circle cx="12" cy="16.2" r="1.7" fill="#5A3A00"/><path d="M12 16.5v3.8" stroke="#5A3A00" stroke-width="1.5"/>', // Schellen
  };
  const deSuit = (s, cls = '') => `<svg class="de-suit ${cls}" viewBox="0 0 24 24" aria-hidden="true">${DE_SUIT[s]}</svg>`;
  const NAME = {
    fr: { c: 'Kreuz', s: 'Pik', h: 'Herz', d: 'Karo' },
    de: { c: 'Eichel', s: 'Grün', h: 'Herz', d: 'Schellen' },
  };
  const DE_RANK = { T: '10', J: 'U', Q: 'O', K: 'K', A: 'A' };
  const DE_RANK_NAME = { T: '10', J: 'Unter', Q: 'Ober', K: 'König', A: 'Ass' };
  const suitName = (s) => NAME[german() ? 'de' : 'fr'][s];
  const suitSign = (s) => (german() ? deSuit(s, 'inline') : SUIT_SIGN[s]);

  // Deutsches Blatt: Wert in der Ecke, große Farbe in der Mitte
  function germanCard(c, { cls = '', attrs = '' } = {}) {
    const r = DE_RANK[c[0]] || c[0];
    return `<button type="button" class="kc kc-de ${cls}" ${attrs} aria-label="${esc(`${NAME.de[c[1]]} ${DE_RANK_NAME[c[0]] || c[0]}`)}"><span class="r">${r}</span>${deSuit(c[1], 'big-suit')}</button>`;
  }
  const card = (c, o) => (german() ? germanCard(c, o) : frenchCard(c, o));

  // Texte vom Server (Verlauf, Sprechblasen) nennen französische Karten – beim deutschen Blatt übersetzen
  const DE_WORDS = [[/Kreuz/g, 'Eichel'], [/Pik/g, 'Grün'], [/Karo/g, 'Schellen'], [/Buben/g, 'Unter'], [/Bube/g, 'Unter'], [/Damen/g, 'Ober'], [/Dame/g, 'Ober'], [/[♣♠♦♥]\s?/g, '']];
  const translate = (t) => (german() ? DE_WORDS.reduce((s, [re, to]) => s.replace(re, to), t) : t);
  return { german, deSuit, suitName, suitSign, card, translate };
})();
const isGermanDeck = () => DECK.german();
const deckCard = (c, o) => DECK.card(c, o);
const deckTranslate = (t) => DECK.translate(t);
const deckSuit = (s, cls) => DECK.deSuit(s, cls);
const deckSuitName = (s) => DECK.suitName(s);
const deckSuitSign = (s) => DECK.suitSign(s);
const deckPrefHTML = () => I18n.html`<label class="toggle"><span>Kartenblatt<small>Französisch: Kreuz, Pik, Herz, Karo. Deutsch: Eichel, Grün, Herz, Schellen (Unter, Ober). Gilt für alle Spiele mit 32 Karten.</small></span>
      <select data-pref="deck" class="input" style="max-width:150px">
        <option value="fr" ${isGermanDeck() ? '' : 'selected'}>Französisch</option>
        <option value="de" ${isGermanDeck() ? 'selected' : ''}>Deutsch</option>
      </select></label>`;

  // Welcher Ton passt zu einer Aktion („legt Herz König“, „UNO!“, „würfelt 5“ …)? Wichtigeres zuerst.
const ACT_SOUNDS = [[/^(UNO|Mau|31|Feuer|Kniffel)!/, 'call'], [/^Box zu!/, 'call'], [/^alle sechs!/, 'call'], [/^Mühle!/, 'call'], [/^setzt$/, 'chips'], [/^Niete/, 'end'], [/^schreibt/, 'done'], [/^\+\d/, 'chips'], [/^schließt/, 'chips'], [/^klopft/, 'drum'], [/versenkt!$/, 'drum'], [/^Blackjack!/, 'call'], [/über 21/, 'end'], [/ Treffer$/, 'hit'], [/ Wasser$/, 'splash'], [/^Erwischt/, 'catch'], [/schlägt/, 'hit'], [/zweifelt/, 'drum'], [/^Phase \d+ ✓/, 'done'],
  [/setzt aus/, 'skip'], [/würfelt/, 'dice'], [/^(zieht|nimmt Ablage|erwischt)/, 'draw'], [/^(legt|wirft ab|ungesehen|tauscht|Karte:|verdoppelt|teilt)/, 'card'], [/^(setzt \d|versichert|kauft)/, 'chips']];
function actSound(acts, prev) {
  const seen = Math.max(0, ...Object.values(prev || {}).map((a) => a.n));
  const fresh = Object.values(acts || {}).filter((a) => a.n > seen).map((a) => a.text);
  for (const [re, name] of ACT_SOUNDS) if (fresh.some((t) => re.test(t))) return name;
  return null;
}

// ---------- Rahmen ----------
function kitGame(def) {
  const originalRules = Object.getOwnPropertyDescriptor(def, 'rules');
  const originalShort = Object.getOwnPropertyDescriptor(def, 'short');
  const original = (descriptor) => descriptor?.get ? descriptor.get.call(def) : descriptor?.value;
  const english = () => I18n.language === 'en' && (!S?.variant || S.variant === 'classic') && releaseEnglishRules[def.id];
  Object.defineProperty(def, 'rules', { configurable: true, get() { const text = english(); return Array.isArray(text) ? text.map((line) => `<p>${line}</p>`).join('') : original(originalRules); } });
  Object.defineProperty(def, 'short', { configurable: true, get() { const text = english(); return (Array.isArray(text) && text.slice(0, 3)) || original(originalShort); } });
  const mod = {};
  let S = null;
  let panel = null;
  let fullLog = null; // ganzer Verlauf, wenn geladen
  const isMine = () => current === mod && S;
  const cardTracker = def.cardUX ? CardInteraction.tracker() : null;
  let reconnecting = false;
  const actionGate = def.cardUX ? CardInteraction.gate(send, () => render(), () => !!(isMine() && socket.connected && !reconnecting && !S.gamePaused && S.phase === 'playing')) : null;
  const command = (event, data = {}) => actionGate ? actionGate.run(event, data) : send(event, data);
  function cards() {
    if (!cardTracker || !S) return [];
    const records = [...cardTracker.update(S)], key = def.sort?.[prefs['sort:' + def.id]];
    return key ? records.sort((a,b) => { const x=key(a.card),y=key(b.card);return (x<y?-1:x>y?1:0)||a.index-b.index; }) : records;
  }

  // Was „Ansehen“ zeigt: die Teile des Spiels (def.look) und die letzten Züge – alles aus dem öffentlichen Zustand
  function lookSheet(st) {
    return { title: I18n.html`${def.name} ansehen`, sections: [...(def.look?.(st) || []), { title: I18n.t('Letzte Züge'), html: lookMoves(st.moves, { detail: def.moveDetail ? (m) => def.moveDetail(m, st) : null }) }] };
  }
  mod.lookSheet = lookSheet;

  function mount() {
    $('#game-root').innerHTML = I18n.html`<div id="kg" class="kg kg-${def.id}${def.cardUX ? ' cix-game' : ''}">
      <header class="topbar">
        <div class="top-left">
          ${homeButtonHTML()}
          <button class="code-chip" data-kit="copy" title="Einladungslink kopieren" aria-label="Einladungslink kopieren">
            <span class="code-label">Raum</span> <b id="kg-code">-----</b>
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
          </button>
        </div>
        <div class="meta" id="kg-meta" aria-live="polite"></div>
        <div class="top-right">
          <span id="kg-pause-control"></span>
          <nav class="topnav" aria-label="Seitenleisten">
            <button class="nav-btn" data-kit-panel="log">${svg('<path d="M4 6h16M4 12h16M4 18h10"/>')}<span>Verlauf</span></button>
            <button class="nav-btn" data-kit="look" id="kg-nav-look" hidden aria-label="Ansehen">${svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>')}<span>Ansehen</span></button>
            <button class="nav-btn" data-kit-panel="stand">${svg('<path d="M5 20V11M12 20V5M19 20v-6"/>')}<span>Stand</span></button>
            <button class="nav-btn" data-kit-panel="rules">${svg('<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6"/>')}<span>Regeln</span></button>
            <button class="nav-btn" data-kit-panel="me">${svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}<span>Ich</span></button>
            <button class="nav-btn" data-kit-panel="host" id="kg-nav-host" hidden>${svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>')}<span>Host</span></button>
          </nav>
        </div>
      </header>
      <section class="kg-players" id="kg-players" aria-label="Mitspieler"></section>
      <main class="kg-main" id="kg-main"></main>
      <section class="kg-dock" id="kg-dock"></section>
      <aside class="panel" id="kg-panel" hidden aria-labelledby="kg-panel-title">
        <button class="grip" data-kit="close" aria-label="Schließen"></button>
        <div class="panel-head"><h2 id="kg-panel-title"></h2>
          <button class="icon-btn" data-kit="close" aria-label="Schließen"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <div class="panel-body" id="kg-panel-body"></div>
      </aside>
    </div>`;
    fullLog = null;
    if (panel) openPanel(panel, true);
  }

  const nameOf = (id) => S.players.find((p) => p.id === id)?.name ?? '?';
  // Regel-Optionen kommen vom Server (games/<id>/room.js → static OPTIONS), über /me in account.games
  const gameOptions = () => variantMeta(def.id, S?.variant)?.options || account.games.find((g) => g.id === def.id)?.options || [];
  const optionLines = () => gameOptions().map((o) => `${uiText(o.label)}: <b>${o.type === 'bool' ? (S.settings[o.key] ? 'an' : 'aus') : esc(o.type === 'select' ? o.values.find((v) => v.value === S.settings[o.key])?.label || S.settings[o.key] : S.settings[o.key])}</b>`);
  const seatedCount = () => S.players.filter((p) => p.seated).length;

  // Große Bildschirme: Gegner sitzen rund um den Tisch. Handy und kleine Fenster: kompakte Leiste oben.
  const WIDE = matchMedia('(min-width: 900px) and (min-height: 620px)');
  WIDE.addEventListener('change', () => { if (isMine()) render(); });
  const FINE = matchMedia('(pointer: fine)');
  let dockKeyPrev = null; // Schlüssel der zuletzt gezeichneten Aktionsleiste (dockKey)
  let resultFresh = false;
  let resultClosed = 0; // Rundennummer, deren Ergebnisfenster weggeklickt wurde
  let peekKey = null;   // Handy: vergrößerte Karte in einer überlappenden Hand

  // Was am Platz bzw. in der Leiste über einen Spieler steht
  // Am eigenen Platz unten reicht die kurze Zeile – Hand, Stapel usw. liegen ohnehin vor dir
  const infoOf = (p, seat) => (S.phase !== 'lobby' && p.inRound !== undefined ? (seat && def.seat && p.id !== S.you?.id ? def.seat(p, S) : def.playerInfo?.(p, S)) || '' : '');
  const tr = (t) => (def.translate ? def.translate(t) : t);
  let RW = I18n.t(def.roundWord || 'Runde');
  const lastAct = () => Math.max(0, ...Object.values(S.acts || {}).map((a) => a.n));
  const bubble = (p, cls) => {
    const a = S.acts?.[p.id];
    return a ? `<span class="${cls} ${a.n === lastAct() ? 'fresh' : ''}">${esc(tr(a.text))}</span>` : '';
  };
  const nameHTML = (p) => `${esc(p.name)}${typeof botBadgeHTML==='function'?botBadgeHTML(S,p.id):''}${p.isHost ? I18n.html` ${ICON.crown}<span class="sr-only">(Host)</span>` : ''}`;
  const statusText = (p) => [p.id === S.turnId && I18n.html('<em>am Zug</em>'), !p.connected && I18n.html`${ICON.offline} offline`,
    S.phase === 'playing' && !p.inRound && I18n.t('ab nächster Runde')].filter(Boolean).join(' · ');
  const pClass = (p) => `${p.id === S.turnId ? 'turn' : ''} ${p.id === S.you?.id ? 'me' : ''} ${p.connected ? '' : 'is-offline'} ${S.phase === 'playing' && !p.inRound ? 'out' : ''} ${def.cardUX && p.eliminated ? 'eliminated' : ''}`;
  function cardPlayerInfo(p) {
    const tx=CardInteraction.tx, count=Number.isInteger(p.cards)?p.cards:0;
    const extra=p.eliminated?tx('Ausgeschieden','Eliminated'):def.id==='stapelrennen'?`${tx('Spielstapel','Stock pile')}: <b>${p.stock ?? 0}</b>`:def.id==='zehnetappen'?`${tx('Phase','Phase')} ${p.phase ?? '–'} · ${p.laidDone?tx('✓ ausgelegt','✓ laid down'):tx('noch offen','not laid down')}`:'';
    return `<span class="cix-opponent"><span class="cix-count ${def.id==='farbenchaos'&&count===1&&!p.eliminated?'last':''}" aria-label="${esc(p.name)} · ${count} ${count===1?tx('Handkarte','hand card'):tx('Handkarten','hand cards')}">${svg('<rect x="5" y="4" width="12" height="16" rx="2"/><path d="M9 2h10v15"/>')}<span data-hand-count="${esc(p.id)}">${count}</span> ${count===1?tx('Karte','card'):tx('Karten','cards')}${p.last&&def.id==='farbenchaos'?' · UNO!':''}</span>${extra?`<span>${extra}</span>`:''}</span>`;
  }

  function seatHTML(p) {
    return `<div class="ks ${pClass(p)}" data-pid="${esc(p.id)}">
      ${bubble(p, 'ks-bubble')}
      <div class="ks-head"><span class="kp-av" aria-hidden="true">${avatarHTML(p)}</span>
        <span class="kp-txt"><b>${nameHTML(p)}${p.id === S.you?.id ? I18n.html(' <small>(du)</small>') : ''}</b><small>${statusText(p)}</small></span></div>
      <div class="ks-info">${infoOf(p, true)}</div>
    </div>`;
  }

  // Tisch mit Plätzen: links (von unten nach oben), oben (von links nach rechts), rechts (von oben nach unten) –
  // so sitzt der Nächste in Spielrichtung links von dir, wie am echten Tisch. Du selbst unten.
  function ringHTML(center) {
    const seated = S.players.filter((p) => p.seated || p.inRound);
    const meI = seated.findIndex((p) => p.id === S.you?.id);
    const others = meI < 0 ? seated : [...seated.slice(meI + 1), ...seated.slice(0, meI)];
    const n = others.length;
    const side = n < 3 ? 0 : n < 6 ? 1 : 2;
    const left = others.slice(0, side), top = others.slice(side, n - side), right = others.slice(n - side);
    const me = meI < 0 ? null : seated[meI];
    const watchers = S.players.length - seated.length;
    const showDir = def.direction !== false && S.phase === 'playing' && seated.filter((p) => p.inRound).length > 2;
    const dirText = S.dir < 0 ? I18n.t('Spielrichtung: gegen den Uhrzeigersinn') : I18n.t('Spielrichtung: im Uhrzeigersinn');
    return `<div class="kt">
      <div class="kt-rail kt-left">${left.map(seatHTML).join('')}</div>
      <div class="kt-rail kt-top">${top.map(seatHTML).join('')}</div>
      <div class="kt-rail kt-right">${right.map(seatHTML).join('')}</div>
      <div class="kt-center">
        ${showDir ? `<div class="kt-dir ${S.dir < 0 ? 'ccw' : ''}" role="img" aria-label="${dirText}" title="${dirText}"><i></i><b>➜</b></div>` : ''}
        <div class="kt-content">${center}</div>
      </div>
      <div class="kt-rail kt-bottom">${me ? seatHTML(me) : ''}${watchers ? I18n.html`<span class="kt-watch">${watchers} schau${watchers === 1 ? 't' : 'en'} zu</span>` : ''}</div>
    </div>`;
  }

  // Kompakte Leiste (Handy): wer mitspielt, wer dran ist, was man über ihn wissen darf
  function stripHTML() {
    const players = S.players.filter((p) => p.seated || p.inRound);
    const watchers = S.players.length - players.length;
    const dir = def.direction !== false && S.phase === 'playing' && players.filter((p) => p.inRound).length > 2
      ? I18n.html`<div class="kp kp-watch" title="Spielrichtung"><small>${S.dir < 0 ? I18n.t('↺ andersherum') : I18n.t('↻ Richtung')}</small></div>` : '';
    return dir + players.map((p) => {
      const info = def.cardUX && S.phase !== 'lobby' ? cardPlayerInfo(p) : infoOf(p, false);
      const st = statusText(p);
      return `<div class="kp ${pClass(p)}" data-pid="${esc(p.id)}">
        <span class="kp-av" aria-hidden="true">${avatarHTML(p)}</span>
        <span class="kp-txt"><b>${nameHTML(p)}${def.cardUX&&p.id===S.you?.id?` <small>${CardInteraction.tx('(du)','(you)')}</small>`:''}</b>
          <small>${st}${st && info && !def.cardUX ? ' · ' : ''}${def.cardUX?'':info}</small>${def.cardUX?info:''}${bubble(p, 'kp-act')}</span>
      </div>`;
    }).join('') + (watchers ? I18n.html`<div class="kp kp-watch"><small>${watchers} schau${watchers === 1 ? 't' : 'en'} zu</small></div>` : '')
      || I18n.html('<p class="hint" style="margin:0">Noch spielt niemand mit.</p>');
  }

  // Restzeit des Zug-Timers anzeigen (Serverzeit, an die eigene Uhr angeglichen)
  function tickClock() {
    const el = $('#kg-clock');
    if (!el || !S?.deadline) return;
    const left = Math.max(0, Math.ceil((S.deadline - gameNow(S)) / 1000));
    el.textContent = I18n.html`noch ${left} s`;
    el.classList.toggle('urgent', left <= 10);
    if (def.cardUX) $$('[data-cix-clock]').forEach((clock) => { clock.textContent = `${left} s`; });
  }
  setInterval(() => { if (isMine()) tickClock(); }, 1000);

  function render() {
    RW = I18n.t(def.roundWord || 'Runde');
    if (!isMine() || !$('#kg')) return;
    GameDesign.apply($('#kg'), def.id);
    document.documentElement.style.setProperty('--topbar', $('#kg .topbar').offsetHeight + 'px');
    document.body.classList.toggle('calm', !!prefs.calm);
    document.body.classList.toggle('marks', !!prefs.marks);
    $('#kg-code').textContent = S.code;
    $('#kg-nav-host').hidden = !S.you?.isHost;
    $('#kg-pause-control').innerHTML = gamePauseButtonHTML(S);
    $('#kg-nav-look').hidden = S.phase === 'lobby';
    const myTurn = S.turnId && S.turnId === S.you?.id;
    // status(S) darf das Spiel selbst liefern (z. B. „Schiffe setzen“, wenn niemand dran ist)
    const status = (S.phase === 'playing' && def.status?.(S, myTurn)) || (S.phase === 'playing' ? `${RW} #${S.roundNo} · ${myTurn ? I18n.html('<b>Du bist dran</b>') : I18n.html`${esc(nameOf(S.turnId))} ist dran`}`
      : S.phase === 'over' ? I18n.html`${RW} #${S.roundNo} vorbei` : I18n.t('Noch nicht gestartet'));
    // Zug-Timer: Restzeit (läuft im Sekundentakt weiter, siehe tickClock)
    const clock = S.phase === 'playing' && S.deadline ? ` · <span id="kg-clock" class="${myTurn ? 'mine' : ''}"></span>` : '';
    $('#kg-meta').innerHTML = `<div class="blinds">${uiText(def.name)}${S.variant && S.variant !== 'classic' ? ` <span class="variant-title">${uiText(S.variantName)}</span>` : ''}</div><div class="meta-sub">${status}${clock}</div>`;
    tickClock();
    document.body.classList.toggle('kg-myturn', !!myTurn);

    const ring = WIDE.matches && def.ring !== false; // ring: false → immer die kompakte Spielerleiste (Partyspiele haben lange Auflösungen)
    $('#kg-players').hidden = ring;
    if (!ring) $('#kg-players').innerHTML = stripHTML();

    // Tisch – mit „?“ für die Kurzregeln oben rechts
    const main = $('#kg-main');
    main.classList.toggle('ring', ring);
    const help = I18n.html('<button class="help-btn" data-kit="help" aria-label="Kurzregeln und Hausregeln" title="Kurzregeln">?</button>');
    const center = S.phase === 'lobby' ? (def.lobby?.(S) || lobbyHTML()) : def.main(S, { ring });
    main.classList.toggle('has-program', !!S.partyProgram);
    if (!def.keepMain?.(S)) {
      const html=GameDesign.backdrop(def.id)+help+programBannerHTML(S)+(ring?ringHTML(center):center)+(S.phase==='over'&&S.result&&resultClosed!==S.roundNo?resultHTML():'');
      if(def.cardUX)CardInteraction.patch(main,html);else main.innerHTML=html;
    }

    // Aktionsleiste
    const baseDockKey = def.dockKey ? def.dockKey(S, myTurn) : null;
    const dkey = baseDockKey === null ? null : `${baseDockKey}|${S.partyProgram?.status || ''}|${S.partyProgram?.index ?? ''}`;
    if (dkey === null || dkey !== dockKeyPrev || !$('#kg-dock').firstChild) { const html=dockHTML(myTurn);if(def.cardUX)CardInteraction.patch($('#kg-dock'),html);else $('#kg-dock').innerHTML=html;dockKeyPrev=dkey; }
    if(def.cardUX){
      const blocked=actionGate.busy||reconnecting||!socket.connected||S.gamePaused;
      $('#kg').classList.toggle('cix-pending',actionGate.busy);$('#kg-dock').setAttribute('aria-busy',String(actionGate.busy));
      if(blocked)$$('#kg [data-g],#kg .kg-sort').forEach((el)=>{if(el.matches('button,input,select'))el.disabled=true;});
      tickClock();
    }
    GameDesign.scaleCards($('#kg'));
    setupHand();
    document.documentElement.style.setProperty('--dock-h', $('#kg-dock').offsetHeight + 'px');
    if (panel) renderPanel();
    const stage = $('#kg [data-result-stage]');
    if (stage) window.showWinnerStage(stage, S, { fresh: resultFresh, roundWord: def.roundWord, category: account.games.find(g => g.id === def.id)?.category });
    resultFresh = false;
    def.afterRender?.(S);
    renderGamePause(S);
    GameDesign.fit($('#kg'));
    GameDesign.watch($('#kg'), () => {
      setupHand();
      document.documentElement.style.setProperty('--dock-h', $('#kg-dock').offsetHeight + 'px');
    });
  }

  // Hand nach dem Zeichnen: Ziehen auf die Ablage (Maus) und Überlappen bei vielen Karten (Handy)
  function setupHand() {
    const hand = $('#kg-dock .kg-hand');
    if(def.cardUX)$$('#kg [data-card-key]').forEach((el)=>{el.draggable=!!(FINE.matches&&def.onDrop&&el.hasAttribute('data-drag')&&!el.disabled);});
    else if (FINE.matches && def.onDrop) $$('#kg [data-drag]').forEach((el) => { if (!el.disabled) el.draggable = true; });
    if (!hand) return;
    if (def.cardUX) { hand.classList.remove('overlap');hand.style.removeProperty('--ov');return; }
    const cards = [...hand.children];
    hand.classList.remove('overlap');
    hand.style.removeProperty('--ov');
    if (cards.length < 2 || FINE.matches && innerWidth > 640) return;
    const w = cards[0].offsetWidth;
    const gap = 6;
    const avail = hand.clientWidth - 20; // Rand, damit die vergrößerte Karte nicht abgeschnitten wird
    if (cards.length * (w + gap) - gap <= avail) return;
    // So weit überlappen, dass alles in eine Zeile passt – aber von jeder Karte bleibt ein Streifen zu sehen
    const step = Math.max(20, (avail - w) / (cards.length - 1));
    hand.classList.add('overlap');
    hand.style.setProperty('--ov', I18n.html`${Math.min(0, step - w)}px`);
    if (peekKey) hand.querySelector(I18n.html`[data-peek="${CSS.escape(peekKey)}"]`)?.classList.add('peek');
  }

  function lobbyHTML() {
    const n = seatedCount();
    const enough = n >= S.minPlayers;
    return I18n.html`<div class="kg-lobby">
      ${GameDesign.hero(def.id)}
      <h2>${uiText(def.name)}</h2>
      <p>${n} von höchstens ${S.maxPlayers} spielen mit${enough ? '.' : I18n.html` – es braucht mindestens ${S.minPlayers}.`}</p>
      <p class="hint">${S.you?.isHost ? (enough ? I18n.t('Du bist Host: Starte die Runde unten.') : I18n.t('Teil den Link oben, damit die anderen dazukommen.')) : I18n.t('Der Host startet die Runde.')}
        Die Regeln stehen oben unter „Regeln“.</p>
      ${def.lobbyExtra?.(S) || ''}
    </div>`;
  }

  // Rundenende: großes Fenster mit den Punkten dieser Runde und dem Stand des Abends
  function resultHTML() {
    const r = S.result;
    const ids = (r.players || Object.keys(r.points || {})).filter((id) => S.players.some((p) => p.id === id));
    const pts = (id) => r.points?.[id] || 0;
    const dir = S.lowWins ? 1 : -1;
    ids.sort((a, b) => (r.winners.includes(b) - r.winners.includes(a)) || (pts(a) - pts(b)) * dir);
    const rows = ids.map((id) => {
      const p = S.players.find((x) => x.id === id);
      const won = r.winners.includes(id);
      return `<tr class="${won ? 'won' : ''}"><td><span class="mini-av">${avatarHTML(p)}</span> ${esc(p.name)}${id === S.you?.id ? I18n.html(' <small>(du)</small>') : ''}${won ? I18n.html` <span class="kg-won">${ICON.crown} gewinnt</span>` : ''}${r.detail?.[id] ? `<small class="kg-detail">${esc(r.detail[id])}</small>` : ''}</td>
        <td class="num">${pts(id)}</td><td class="num">${p.score}</td></tr>`;
    }).join('');
    const host = S.you?.isHost;
    const eveningDone = S.partyProgram?.config.mode === 'abend' && S.partyProgram.status === 'done';
    // The server's free-form result sentence contains names and is German.
    // Use structured winners in English rather than translating player input.
    const resultTitle = I18n.language === 'en'
      ? r.winners.length ? `${r.winners.map(id => esc(nameOf(id))).join(' & ')} ${r.winners.length === 1 ? 'wins' : 'share the win'}` : 'Round complete'
      : esc(r.text);
    return I18n.html`<div class="kg-over" role="dialog" aria-labelledby="kg-over-title"><div class="kg-over-card">
      <small class="kg-over-kicker">${eveningDone ? 'Abend-Modus' : I18n.html`${RW} #${S.roundNo} vorbei`}</small>
      <h2 id="kg-over-title">${eveningDone ? I18n.t('Spieleabend beendet') : resultTitle}</h2>
      <section data-result-stage></section>
      ${eveningDone ? programStandHTML(S) : ''}
      ${rows ? I18n.html`<table class="standings"><thead><tr><th>Name</th><th class="num">Runde</th><th class="num">Abend (${uiText(S.scoreLabel)})</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="hint" style="margin:0">${S.lowWins ? I18n.t('Wenig Punkte sind gut.') : I18n.t('Viel ist gut.')}</p>` : ''}
      ${def.resultExtra ? def.resultExtra(S) : ''}
      ${S.partyProgram?.status === 'done' && !eveningDone ? programStandHTML(S) : ''}
      <div class="kg-over-acts">
        <button class="btn btn-ghost" data-kit="closeResult">Schließen</button>
        ${host && S.partyProgram?.status === 'done' ? I18n.html('<button type="button" class="btn btn-brass" data-program="plan">Neues Programm planen</button>') : host ? I18n.html`<button class="btn" data-kit="switchPanel">Spiel wechseln</button><button class="btn btn-brass" data-kit="start" ${seatedCount() >= S.minPlayers ? '' : 'disabled'}>${S.partyProgram?.status === 'between' ? I18n.t('Nächstes Programm-Spiel') : I18n.html`Nächste ${RW}`}</button>`
          : I18n.html('<span class="waiting">Der Host startet die nächste Runde.</span>')}
      </div></div></div>`;
  }

  // Ein Satz über der Hand, was man gerade tun kann – plus Sortieren, wenn das Spiel es anbietet
  function hintRow(myTurn) {
    // hint() liefert HTML – Namen darin escapt das Spiel selbst
    const text = (def.hint && def.hint(S, myTurn)) || (myTurn ? I18n.t('Du bist dran') : I18n.html`${esc(nameOf(S.turnId))} ist dran`);
    const sortKey = prefs['sort:' + def.id] || 'none';
    const sort = !def.sort ? '' : def.cardUX ? `<button class="btn btn-sm btn-ghost kg-sort" data-kit="sort" title="${CardInteraction.tx('Handkarten sortieren','Sort your hand')}">${CardInteraction.tx('Sortieren','Sort')}: ${{none:CardInteraction.tx('aus','off'),color:CardInteraction.tx('Farbe','colour'),number:CardInteraction.tx('Zahl','number')}[sortKey]}</button>` : I18n.html`<button class="btn btn-sm btn-ghost kg-sort" data-kit="sort" title="Handkarten sortieren">Sortieren: ${{ none: 'aus', color: 'Farbe', number: 'Zahl' }[sortKey]}</button>`;
    if(def.cardUX){
      const tx=CardInteraction.tx,own=S.phase==='playing'&&myTurn;
      const title=reconnecting||!socket.connected?tx('Verbindung wird wiederhergestellt','Reconnecting'):S.gamePaused?tx('Spiel pausiert','Game paused'):actionGate.busy?tx('Warte auf Bestätigung','Waiting for confirmation'):S.phase==='over'?tx('Runde beendet','Round complete'):S.phase==='lobby'?tx('Warte auf Mitspieler','Waiting for players'):!S.you?.inRound?tx('Du schaust zu','You are watching'):own?tx('DU BIST DRAN','YOUR TURN'):esc(nameOf(S.turnId))+' '+tx('ist dran','is on turn');
      const hint=actionGate.busy?tx('Die Aktion wird vom Server geprüft.','The server is checking your action.'):reconnecting||!socket.connected?tx('Warte auf den aktuellen Spielstand.','Waiting for the current game state.'):S.gamePaused?tx('Für alle angehalten. Der Host setzt das Spiel fort.','Paused for everyone. The host resumes the game.'):S.phase==='lobby'?tx('Der Host startet, sobald alle bereit sind.','The host starts when everyone is ready.'):!S.you?.inRound?tx('Verfolge die offenen Züge und Kartenzahlen.','Follow public moves and card counts.'):text;
      return `<div class="cix-turn ${own&&!S.gamePaused&&!reconnecting?'is-mine':''}" data-turn-state="${reconnecting?'reconnecting':S.gamePaused?'paused':own?'mine':'waiting'}"><div role="status" aria-live="polite" aria-atomic="true"><strong>${title}</strong><small>${hint}</small></div>${S.deadline?'<span class="cix-clock" data-cix-clock aria-live="off"></span>':''}${sort}</div>${actionGate.error?`<div class="cix-error" role="alert">${esc(actionGate.error)}${actionGate.uncertain?` <button type="button" class="btn" data-kit="resync">${tx('Spielstand neu laden','Refresh game state')}</button>`:''}</div>`:''}`;
    }
    return `<div class="kg-hint-row"><p class="kg-hint ${myTurn ? 'mine' : ''}" aria-live="polite">${text}</p>${sort}</div>`;
  }

  function dockHTML(myTurn) {
    const me = S.you;
    if (S.phase === 'playing' && me?.inRound) {
      const html = def.dock(S, myTurn);
      // Spiele ohne Kartenhand liefern nur Knöpfe – die kommen in eine zentrierte Zeile
      return `<div class="kg-dock-in">${hintRow(myTurn)}${html.includes('kg-acts') ? html : `<div class="kg-acts">${html}</div>`}</div>`;
    }
    const parts = [];
    const watch = S.phase === 'playing' && def.watchDock ? def.watchDock(S) : '';
    if (me?.playing) {
      parts.push(`<span class="waiting">${S.phase === 'playing' ? I18n.t('Du spielst ab der nächsten Runde mit.') : I18n.t('Du spielst mit.')}</span>`);
      parts.push(I18n.html('<button class="btn btn-ghost" data-kit="stand">Zuschauen</button>'));
    } else {
      parts.push(I18n.html('<span class="waiting">Du schaust zu.</span>'));
      parts.push(I18n.html`<button class="btn btn-brass" data-kit="sit" ${seatedCount() >= S.maxPlayers ? 'disabled title="Alle Plätze sind besetzt"' : ''}>Mitspielen</button>`);
    }
    if (me?.isHost && S.phase !== 'playing') {
      const p = S.partyProgram;
      const pending = p?.status === 'ready' || programRunning(S);
      const enough = pending ? seatedCount() > 0 : seatedCount() >= S.minPlayers;
      const label = p?.status === 'ready' ? I18n.t('Abendprogramm starten') : p?.status === 'between' ? I18n.t('Nächstes Programm-Spiel') : programRunning(S) ? I18n.t('Partie wiederholen') : S.phase === 'over' ? I18n.t('Nochmal') : S.roundNo ? I18n.html`Nächste ${RW}` : I18n.html`${RW} starten`;
      parts.push(p?.status === 'done' ? I18n.html('<button type="button" class="btn btn-brass" data-program="plan">Programm planen</button>') : `<button class="btn btn-brass" data-kit="start" ${enough ? '' : `disabled title="Es müssen mindestens ${S.minPlayers} mitspielen"`}>${label}</button>`);
      if (S.phase === 'over') parts.push(`<button class="btn" data-kit-panel="host">${programRunning(S) ? I18n.t('Programm verwalten') : I18n.t('Anderes Spiel …')}</button>`);
    }
    const row = `<div class="kg-dock-row">${parts.join('')}</div>`;
    if(def.cardUX)return `<div class="kg-dock-in">${hintRow(myTurn)}${watch}${row}</div>`;
    return watch ? `<div class="kg-dock-in">${watch}${row}</div>` : row;
  }

  // ---------- Seitenleiste ----------
  const TITLES = { log: 'Verlauf', stand: 'Stand des Abends', rules: 'Regeln', host: 'Host', me: 'Ich' };
  function openPanel(name, keep = false) {
    panel = keep ? name : panel === name ? null : name;
    $('#kg-panel').hidden = !panel;
    $$('#kg [data-kit-panel]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.kitPanel === panel)));
    if (panel) { $('#kg-panel-title').textContent = I18n.t(TITLES[panel]); renderPanel(true); }
  }
  function renderPanel(force = false) {
    const body = $('#kg-panel-body');
    if (!force && body.contains(document.activeElement) && document.activeElement.matches('input, select, textarea')) return;
    if (panel === 'log') {
      const list = fullLog || S.log;
      let round = null;
      const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 30;
      body.innerHTML = `<ul class="log">${list.filter((l) => l.cat !== 'hand').map((l) => {
        const head = l.hand !== round ? `<li class="hand">${l.hand ? `${RW} #${l.hand}` : I18n.t('Vor der ersten Runde')}</li>` : '';
        round = l.hand;
        return `${head}<li class="${esc(l.kind)}">${esc(tr(l.text))}</li>`;
      }).join('')}</ul>
        ${fullLog ? '' : I18n.html('<button class="btn btn-sm btn-ghost" data-kit="history">Ganzen Verlauf laden</button>')}`;
      if (atBottom || force) body.scrollTop = body.scrollHeight;
    } else if (panel === 'stand') {
      const winsCol = S.scoreLabel !== 'Siege'; // zählt das Spiel ohnehin Siege, nicht zweimal zeigen
      body.innerHTML = I18n.html`${programStandHTML(S)}<table class="standings"><thead><tr><th></th><th>Name</th><th class="num">${uiText(S.scoreLabel)}</th>${winsCol ? I18n.html('<th class="num">Siege</th>') : ''}</tr></thead><tbody>
        ${S.standings.map((p, k) => I18n.html`<tr><td><span class="rank ${k < 3 ? 'r' + (k + 1) : ''}" aria-label="Platz ${k + 1}">${k + 1}</span></td>
          <td><span class="mini-av">${avatarHTML(p)}</span> ${esc(p.name)}</td><td class="num">${p.score}</td>${winsCol ? `<td class="num">${p.wins}</td>` : ''}</tr>`).join('')}
        </tbody></table>
        <p class="hint">${S.lowWins ? I18n.t('Wenig Punkte sind gut.') : I18n.t('Viel ist gut.')}</p>
        ${def.standExtra ? def.standExtra(S) : ''}
        <button class="btn btn-sm btn-ghost" data-leaderboard="${def.id}${S.variant && S.variant !== 'classic' ? '~' + S.variant : ''}">Bestenliste aller Abende</button>`;
    } else if (panel === 'rules') {
      const ownRules = S.variant && S.variant !== 'classic' && (S.game === 'farbenchaos' || S.game === 'monopoly' && S.variant === 'junior');
      body.innerHTML = `<div class="kg-rules">${variantRulesHTML(S)}${ownRules ? '' : def.rules}</div>`;
    } else if (panel === 'me') {
      // Persönliche Einstellungen – gelten in diesem Browser für alle Spiele (gleicher Speicher wie beim Poker)
      const t = (k, label, sub = '') => `<label class="toggle"><span>${I18n.t(label)}${sub ? `<small>${I18n.t(sub)}</small>` : ''}</span><input type="checkbox" role="switch" data-pref="${k}" ${prefs[k] ? 'checked' : ''}></label>`;
      body.innerHTML = `<div class="kg-switches">
        ${I18n.selector()}
        ${t('marks', I18n.t('Farbsymbole auf Karten'), I18n.html`Jede Farbe hat zusätzlich eine Form: ${Object.keys(MARK_SHAPE).map((k) => `${colorMark(k)} ${MARK_NAME[k]}`).join(', ')}`)}
        ${t('sound', I18n.t('Töne'), I18n.t('Karten, Würfel, „UNO!“ und ein Signal, wenn du dran bist'))}
        ${GameDesign.soundPreference()}
        ${GameDesign.scene(def.id).family === 'cards' ? GameDesign.cardPreference() : ''}
        ${t('calm', I18n.t('Animationen aus'), I18n.t('Karten, Würfel und Figuren springen ohne Bewegung an ihren Platz. Ist am Gerät „Bewegung reduzieren“ an, gilt das sowieso.'))}
        ${UITheme.glassPreference()}
        ${t('intros', I18n.t('Erste Schritte zeigen'), I18n.t('Kurze Einführung beim ersten Spiel jeder Art. Einschalten zeigt sie wieder.'))}
        ${def.prefs ? def.prefs() : ''}
        ${def.meExtra?.(S) || ''}
      </div>`;
    } else if (panel === 'host') {
      if (!S.you?.isHost) { openPanel(null); return; }
      const others = S.players.filter((p) => p.id !== S.you.id);
      const off = S.phase === 'playing' || programRunning(S) ? 'disabled' : '';
      const opts = gameOptions();
      const selects = opts.filter((o) => o.type === 'select').map((o) => `<label class="field"><span>${uiText(o.label)}</span><select data-kit-set="${o.key}" ${off}>${o.values.map((v) => `<option value="${esc(v.value)}" ${S.settings[o.key] === v.value ? 'selected' : ''}>${uiText(v.label)}</option>`).join('')}</select></label>`).join('');
      const nums = opts.filter((o) => o.type !== 'bool' && o.type !== 'select').map((o) => `<label class="field"><span>${uiText(o.label)}</span>
        <input type="number" data-kit-set="${o.key}" min="${o.min}" max="${o.max}" value="${esc(S.settings[o.key])}" ${off}></label>`).join('');
      const bools = opts.filter((o) => o.type === 'bool').map((o) => `<label class="toggle"><span>${uiText(o.label)}</span>
        <input type="checkbox" role="switch" data-kit-set="${o.key}" ${S.settings[o.key] ? 'checked' : ''} ${off}></label>`).join('');
      const fields = opts.length ? `${selects}${nums ? `<div class="host-grid">${nums}</div>` : ''}<div class="kg-switches">${bools}</div>` : '';
      body.innerHTML = I18n.html`<div class="big-actions">
          ${gamePauseButtonHTML(S)}
          ${S.phase !== 'playing' ? `<button class="btn btn-brass" data-kit="start">${ICON.play} ${S.phase === 'over' ? I18n.t('Nochmal') : S.roundNo ? I18n.html`Nächste ${RW}` : I18n.html`${RW} starten`}</button>` : ''}
          <button class="btn btn-outline-red" data-kit="newGame" ${S.phase === 'playing' ? 'disabled title="Geht nur zwischen zwei Runden"' : ''}>Neues Spiel (Punkte auf null)</button>
        </div>
        ${programControlsHTML(S)}
        ${variantControlsHTML(S)}
        ${def.noBots ? '' : botControlsHTML(S, S.phase === 'playing' || programRunning(S))}
        ${unlistedSwitchHTML(S)}
        ${fields ? I18n.html`<h3>Regeln an diesem Tisch</h3>${fields}<p class="hint" style="margin:0">Änderungen gehen nur zwischen den Runden. Die Standardwerte sind unsere üblichen Hausregeln – alle sehen die aktiven Regeln unter „?“.</p>` : ''}
        ${def.hostExtra ? def.hostExtra(S) : ''}
        ${switchGameHTML(def.id, S.phase === 'playing')}
        ${endGameHTML(S.phase === 'playing', RW)}
        <h3>Leute im Raum</h3>
        <div class="plist">${others.map((p) => I18n.html`<div class="prow"><span class="mini-av">${avatarHTML(p)}</span>
          <div class="who"><b>${esc(p.name)}</b><small>${p.seated ? I18n.t('spielt mit') : I18n.t('schaut zu')}${p.connected ? '' : ' · offline'}</small></div>
          ${p.bot ? '' : I18n.html`<button class="btn btn-sm" data-kit-host="${p.id}" title="Host weitergeben">${ICON.crown}</button>`}
          <button class="btn btn-sm btn-outline-red" data-kit-kick="${p.id}">Entfernen</button></div>`).join('') || I18n.html('<p class="hint" style="margin:0">Noch niemand sonst da.</p>')}</div>`;
    }
  }

  // ---------- Eingaben ----------
  document.addEventListener('click', async (e) => {
    if (!isMine()) return;
    const t = e.target.closest('[data-kit], [data-end], [data-kit-panel], [data-kit-kick], [data-kit-host], [data-g]');
    if (!t || t.disabled) return;
    if (t.dataset.end) return endGameClick(t.dataset.end, RW);
    if (t.dataset.kitPanel) return openPanel(t.dataset.kitPanel);
    if (t.dataset.kitKick) {
      const name = nameOf(t.dataset.kitKick);
      if (await ask({ title: I18n.html`${name} entfernen?`, text: I18n.html`${name} fliegt aus dem Raum. Läuft gerade eine Runde, steigt ${name} aus.`, ok: I18n.t('Entfernen'), danger: true })) send('kick', { id: t.dataset.kitKick });
      return;
    }
    if (t.dataset.kitHost) {
      const name = nameOf(t.dataset.kitHost);
      if (await ask({ title: I18n.t('Host weitergeben?'), text: I18n.html`${name} wird Host und startet die Runden.`, ok: 'Weitergeben' })) send('makeHost', { id: t.dataset.kitHost });
      return;
    }
    // Überlappende Hand auf dem Handy: erstes Tippen vergrößert die Karte, zweites spielt sie
    if (!def.cardUX && def.peek && t.dataset.peek && t.closest('.kg-hand.overlap') && peekKey !== t.dataset.peek) {
      peekKey = t.dataset.peek;
      $$('#kg-dock .kg-hand .peek').forEach((x) => x.classList.remove('peek'));
      t.classList.add('peek');
      return;
    }
    peekKey = null;
    const k = t.dataset.kit;
    if (k === 'close') openPanel(null);
    else if(k==='resync'&&def.cardUX){socket.disconnect();socket.connect();}
    else if (k === 'closeResult') { resultClosed = S.roundNo; render(); }
    else if (k === 'switchPanel') { resultClosed = S.roundNo; openPanel('host', true); render(); $('#switch-game')?.focus(); }
    else if (k === 'sort') {
      const order = ['none', 'color', 'number'];
      prefs['sort:' + def.id] = order[(order.indexOf(prefs['sort:' + def.id] || 'none') + 1) % 3];
      savePrefs();
    }
    else if (k === 'sit') send('sit');
    else if (k === 'stand') {
      if (S.phase === 'playing' && S.you?.inRound && !(await ask({ title: I18n.t('Aus der Runde aussteigen?'), text: I18n.t('Deine Karten bzw. dein Spielstand in dieser Runde sind dann weg.'), ok: I18n.t('Aussteigen'), danger: true }))) return;
      send('stand');
    } else if (k === 'help') {
      showHelp({ title: I18n.html`${def.name} – kurz erklärt`, short: variantRuleLines(S)?.slice(1) || def.short || [], house: [...optionLines(), ...(def.house?.(S) || [])], more: () => openPanel('rules', true) });
    } else if (k === 'look') openLook(lookSheet(S));
    else if (k === 'start') send('start');
    else if (k === 'newGame') {
      if (await ask({ title: I18n.t('Neues Spiel starten?'), text: I18n.t('Alle Punkte und Siege gehen auf null. Der alte Stand kommt in den Verlauf.'), ok: I18n.t('Neues Spiel'), danger: true })) send('newGame');
    } else if (k === 'history') {
      socket.emit('history', { after: 0 }, (r) => { if (r?.ok) { fullLog = r.entries; renderPanel(true); } });
    } else if (k === 'copy') {
      const link = I18n.html`${location.origin}/?t=${S.code}`;
      try { await navigator.clipboard.writeText(link); toast(I18n.t('Link kopiert – schick ihn in eure Gruppe')); }
      catch { ask({ title: I18n.t('Einladungslink'), text: I18n.t('Kopieren hat nicht geklappt. Markier den Link und kopier ihn selbst.'), ok: I18n.t('Fertig'), input: { value: link, readOnly: true, noCancel: true, label: I18n.t('Einladungslink') } }); }
    } else if (t.dataset.g !== undefined) {
      if(def.cardUX&&(actionGate.busy||reconnecting||!socket.connected||S.gamePaused))return;
      def.onClick?.(t,S,e);
    }
  });
  // Karte auf ein Ziel ziehen (nur mit Maus): Quelle trägt data-drag, Ziel data-drop
  let dragEl = null;
  document.addEventListener('dragstart', (e) => {
    if (!isMine() || !def.onDrop) return;
    dragEl = e.target.closest?.('#kg [data-drag]');
    if (!dragEl) return;
    if(def.cardUX&&(dragEl.disabled||actionGate.busy||reconnecting||!socket.connected||S.gamePaused)){e.preventDefault();dragEl=null;return;}
    if(def.cardUX){def.onDragStart?.(dragEl,S);render();}
    if(def.cardUX)dragEl.classList.add('cix-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragEl.dataset.drag);
    $$('#kg [data-drop]').forEach((z) => {if(!def.canDrop||def.canDrop(dragEl,z,S))z.classList.add('drop-ok');});
  });
  const clearDrag=()=>{dragEl=null;$$('#kg .drop-ok,#kg .drag-over,#kg .cix-dragging').forEach((z)=>z.classList.remove('drop-ok','drag-over','cix-dragging'));};
  document.addEventListener('dragend',()=>{clearDrag();if(def.cardUX&&isMine()){def.onDragEnd?.();render();}});
  document.addEventListener('dragover', (e) => {
    const z = dragEl && e.target.closest?.('#kg [data-drop]');
    if (!z||def.cardUX&&(!dragEl.isConnected||S.gamePaused||actionGate.busy||!def.canDrop?.(dragEl,z,S)))return;
    e.preventDefault();
    $$('#kg .drag-over').forEach((x) => x !== z && x.classList.remove('drag-over'));
    z.classList.add('drag-over');
  });
  document.addEventListener('drop', (e) => {
    const z = dragEl && e.target.closest?.('#kg [data-drop]');
    if (!z||def.cardUX&&(!dragEl.isConnected||S.gamePaused||actionGate.busy||!def.canDrop?.(dragEl,z,S))){if(def.cardUX)clearDrag();return;}
    e.preventDefault();
    const src = dragEl;
    dragEl = null;
    if(def.cardUX)clearDrag();
    def.onDrop(src, z, S);
  });

  document.addEventListener('change', (e) => {
    if (!isMine()) return;
    const t = e.target;
    if (t.dataset?.pref && t.closest('#kg')) {
      prefs[t.dataset.pref] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.pref === 'intros' && t.checked) resetIntros();
      savePrefs();
      return;
    }
    if (t.dataset?.kitSet) send('settings', { [t.dataset.kitSet]: t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : Number(t.value) }).then((r) => r?.ok && toast(I18n.t('Gespeichert – gilt ab der nächsten Runde')));
    else if (t.closest?.('#kg') && t.dataset?.g !== undefined) def.onChange?.(t, S, e);
  });
  document.addEventListener('keydown', (e) => {
    if(def.cardUX&&isMine()&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)&&e.target.closest('.kg-hand [data-card-key]')){
      const hand=$$('#kg-dock .kg-hand [data-card-key]'),i=hand.indexOf(e.target.closest('[data-card-key]')),next=e.key==='Home'?0:e.key==='End'?hand.length-1:Math.max(0,Math.min(hand.length-1,i+(e.key==='ArrowLeft'?-1:1)));e.preventDefault();hand[next]?.focus({preventScroll:true});hand[next]?.scrollIntoView({block:'nearest',inline:'nearest'});return;
    }
    if (!isMine() || e.key !== 'Escape' || $('#dlg').open) return;
    if (panel) openPanel(null);
    else if(def.cardUX){def.onClear?.();clearDrag();render();}
  });
  if(def.cardUX)socket.on('disconnect',()=>{if(isMine()){reconnecting=true;actionGate.invalidate();def.onClear?.();clearDrag();render();}});
  document.addEventListener('visibilitychange', () => { if (!document.hidden && isMine()) document.title = 'Spieleabend'; });

  // Hand nur im Browser sortieren – gespielt wird über den Kartenwert bzw. die Karten-ID, nicht die Position
  function sortHand(st) {
    const how = prefs['sort:' + def.id];
    const key = def.sort?.[how];
    if (!key || !Array.isArray(st.g?.hand)) return;
    st.g.hand = st.g.hand.map((c, i) => [key(c), i, c]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1])).map((x) => x[2]);
  }

  Object.assign(mod, {
    show() {
      mount(); render();
      if (def.intro) setTimeout(() => { if (isMine() && !$('#dlg').open) showIntro(def.id, def.name, def.intro); }, 400);
    },
    onState(st) {
      const prev = S;
      window.finishWinnerStages();
      resultFresh = prev?.phase === 'playing' && st.phase === 'over' && socket.connected && !winnerStageReconnecting;
      winnerStageReconnecting = false;
      S = st;
      // Bin ich gerade drangekommen? Ton und Hinweis im Tab
      const now = st.turnId && st.turnId === st.you?.id;
      const before = prev && prev.turnId === prev.you?.id && prev.roundNo === st.roundNo;
      if (now && !before) { beep(740, 140, 0.06); setTimeout(() => beep(988, 160, 0.05), 140); if (document.hidden) document.title = I18n.t('● Du bist dran – Spieleabend'); }
      if (!now) document.title = 'Spieleabend';
      if (!now || !before) peekKey = null;
      // Spiel-Töne: neue Runde = mischen, Rundenende = Sieg oder Schluss, sonst passend zur letzten Aktion
      let cue = null;
      if (prev && prev.roundNo !== st.roundNo && st.phase === 'playing') cue = 'shuffle';
      else if (prev?.phase === 'playing' && st.phase === 'over') cue = st.result?.winners?.includes(st.you?.id) ? 'win' : 'end';
      else if (prev && prev.roundNo === st.roundNo) cue = def.sounds?.(st, prev) || actSound(st.acts, prev.acts);
      if (cue && !['win','end'].includes(cue)) GameDesign.sound(def.id, cue);
      if(def.cardUX){cardTracker.update(st);reconnecting=!socket.connected;if(prev&&CardInteraction.context(prev)!==CardInteraction.context(st))clearDrag();}else sortHand(st);
      def.onState?.(st, prev);
      render();
      if (cue && !['win','end'].includes(cue)) GameDesign.pulse($('#kg'), cue);
      // Neues Rundenende: Fokus ins Ergebnisfenster (Tastatur, Bildschirmleser)
      if (st.phase === 'over' && prev?.phase === 'playing') $('#kg .kg-over .btn-brass, #kg .kg-over .btn')?.focus();
    },
    onPrefs() { dockKeyPrev = null; if (S&&!def.cardUX) sortHand(S); render(); if (panel) { $('#kg-panel-title').textContent = I18n.t(TITLES[panel]); renderPanel(true); } },
  });
  registerGame(def.id, mod);
  return { render, get S() { return S; }, lookSheet, command, cards, get busy(){return !!actionGate?.busy;} };
}

// ---------- Ablegespiele (Mau-Mau, UNO): gleiche Bedienung, andere Karten ----------
// opts: { id, name, rules, card(c, extra) → HTML, wishes: [[Wert, Beschriftung, Klasse]], wishLabel, lastWord }
function kitShedding(opts) {
  if(opts.cardUX)return kitSafeShedding(opts);
  let wishFor = null; // Karte, für die gerade eine Farbe gewählt wird
  let targetFor = null, chosenTarget = null;
  let callArmed = false; // „Mau“/„UNO“ für den nächsten Zug angesagt
  function prepare(c, S) {
    if (opts.needsTarget?.(c, S) && !chosenTarget) { targetFor = c; kit.render(); return; }
    if (opts.needsWish(c, S)) { wishFor = c; kit.render(); return; }
    send('play', { card: c, call: callArmed, target: chosenTarget }); chosenTarget = null; callArmed = false;
  }
  const kit = kitGame({
    id: opts.id, name: opts.name, house: opts.house, sort: opts.sort, prefs: opts.prefs, translate: opts.translate, intro: opts.intro,
    // Optional presentation hooks; existing shedding games keep their defaults.
    lobby: opts.lobby, ring: opts.ring, resultExtra: opts.resultExtra,
    afterRender: opts.afterRender,
    look: (S) => [{ title: I18n.t('Zuletzt gelegt'), html: lookMoves(S.moves, { filter: (m) => /^legt /.test(m.t), n: 10 }) }],
    moveDetail: () => '',
    get rules() { return opts.rules; },
    get short() { return opts.short; },
    peek: true,
    playerInfo: (p) => I18n.html`${p.cards} Karte${p.cards === 1 ? '' : 'n'}${p.last ? ` · <b class="kg-call">${opts.lastWord}</b>` : ''}`,
    seat: (p, S) => opts.seat?.(p, S) ?? I18n.html`${fanHTML(p.cards)}<span>${p.cards} Karte${p.cards === 1 ? '' : 'n'}</span>${p.last ? `<b class="kg-call">${opts.lastWord}</b>` : ''}`,
    hint(S, myTurn) {
      const g = S.g;
      const special = opts.specialHint?.(S, myTurn); if (special) return special;
      if (g.forgot && g.forgot !== S.you?.id) return I18n.html`<b>${esc(S.players.find((p) => p.id === g.forgot)?.name ?? '?')} hat „${opts.lastWord.replace('!', '')}“ vergessen</b> – tipp schnell auf „Erwischt!“`;
      if (!myTurn) return I18n.html`${esc(S.players.find((p) => p.id === S.turnId)?.name ?? '?')} ist dran`;
      if (wishFor) return esc(opts.wishLabel);
      if (g.forgot === S.you?.id) return I18n.html`Du hast „${opts.lastWord.replace('!', '')}“ vergessen – schnell nachholen, bevor dich jemand erwischt!`;
      const n = g.playable.length;
      if (g.drawn) return n ? I18n.t('Gezogen – du darfst die Karte gleich legen oder „Weiter“ sagen') : I18n.t('Die gezogene Karte passt nicht – sag „Weiter“');
      if (g.pending) return n ? I18n.html`${opts.pendingHint(g)} – oder zieh ${g.pending}` : I18n.html`Zieh ${g.pending} Karten`;
      return n ? opts.playHint(g) : I18n.t('Nichts passt – zieh eine Karte');
    },
    onDrop(src) { if (src.dataset.card) src.click(); }, // Ablage ist das einzige Ziel – Ziehen = Antippen
    onState(S, prev) {
      if (!S.g?.playable?.includes(wishFor)) wishFor = null; // Karte weg oder nicht mehr spielbar
      if (targetFor && !S.g?.playable?.includes(targetFor)) { targetFor = null; chosenTarget = null; }
      if (S.turnId !== S.you?.id) chosenTarget = null;
      if (S.turnId !== S.you?.id) callArmed = false;
      opts.onState?.(S, prev);
    },
    main(S) {
      const g = S.g;
      const wishBig = g.wish && opts.wishBadge
        ? I18n.html`<div class="kg-pile kg-wish" role="status"><div class="kg-wish-badge">${opts.wishBadge(g.wish)}</div><small>Gewünscht: <b>${esc(opts.wishName(g.wish))}</b></small></div>` : '';
      const wish = g.wish && !opts.wishBadge ? I18n.html`<div class="kg-chip">Gewünscht: <b>${esc(opts.wishName(g.wish))}</b></div>` : '';
      const pending = g.pending ? `<div class="kg-chip warn">${esc(opts.pendingText(g))}</div>` : '';
      const penalty = g.pending ? I18n.html`<span class="kg-penalty" aria-label="Strafe: ${g.pending} Karten ziehen">+${g.pending}</span>` : '';
      return I18n.html`<div class="kg-table">
        ${opts.tableIntro?.(S) || ''}
        <div class="kg-piles">
          <div class="kg-pile">${opts.backCard ? opts.backCard(g.deck, S) : backCard(g.deck)}<small>Stapel</small></div>
          <div class="kg-pile kg-discard ${opts.pileClass ? opts.pileClass(g) : ''}" data-drop="discard">${g.top ? opts.card(g.top, { cls: 'big', attrs: 'disabled' }, S) : ''}${penalty}<small>Ablage</small></div>
          ${wishBig}
        </div>
        <div class="kg-chips">${wish}${pending}</div>${opts.extraMain?.(S) || ''}
      </div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const playable = new Set(g.playable);
      // Spielbare Karten heben sich an und haben einen Goldrand, die anderen bleiben normal
      const hand = (g.hand || []).map((c, i) => opts.card(c, {
        cls: `${myTurn && playable.has(c) ? 'can' : ''} ${wishFor === c ? 'sel' : ''}`,
        attrs: `data-g="card" data-card="${c}" data-peek="${c}:${i}" ${myTurn && playable.has(c) ? `data-drag="${c}"` : ''} ${myTurn ? '' : 'disabled'}`,
      }, S)).join('');
      let acts = '';
      if (myTurn && targetFor) {
        acts = I18n.html`<div class="kg-acts">${S.players.filter((p) => p.inRound && p.id !== S.you.id && !p.eliminated).map((p) => I18n.html`<button class="btn" data-g="target" data-target="${esc(p.id)}">${esc(p.name)} (${p.cards} Karten)</button>`).join('')}<button class="btn btn-ghost" data-g="nowish">Abbrechen</button></div>`;
      } else if (myTurn && wishFor) {
        const wishes = typeof opts.wishes === 'function' ? opts.wishes(S) : opts.wishes;
        acts = I18n.html`<div class="kg-wishes" role="group" aria-label="${esc(opts.wishLabel)}">${wishes.map(([v, l, cls]) => `<button class="btn wish ${cls}" data-g="wish" data-wish="${v}">${l}</button>`).join('')}</div>
          <button class="btn btn-ghost" data-g="nowish">Abbrechen</button>`;
      } else if (myTurn) {
        const call = g.callNeeded && (g.hand || []).length === 2
          ? I18n.html`<button class="btn btn-call ${callArmed ? 'armed' : ''}" data-g="call" aria-pressed="${callArmed}" title="Bei der vorletzten Karte selbst sagen – sonst gibt es Strafkarten">${callArmed ? '✓ ' : ''}${opts.lastWord}</button>` : '';
        acts = call + (g.drawn
          ? g.mustPlay ? I18n.html('<span class="hint">Gezogene Karte ausspielen</span>') : I18n.html('<button class="btn" data-g="pass">Weiter</button>')
          : `<button class="btn ${playable.size ? '' : 'btn-brass'}" data-g="draw">${g.pending ? I18n.html`${g.pending} Karten ziehen` : I18n.t('Karte ziehen')}</button>`);
      }
      if (g.forgot === S.you?.id) acts = `<button class="btn btn-call" data-g="late">${opts.lastWord}</button>` + acts;
      else if (g.forgot) acts = I18n.html`<button class="btn btn-call catch" data-g="catch">Erwischt! (+2 für ${esc(S.players.find((p) => p.id === g.forgot)?.name ?? '?')})</button>` + acts;
      acts = opts.specialDock?.(S, myTurn) ?? acts;
      return I18n.html`<div class="kg-hand" role="group" aria-label="Deine Karten">${hand}</div><div class="kg-acts">${acts}</div>`;
    },
    onClick(t, S) {
      if (opts.onClick?.(t, S)) return;
      const g = t.dataset.g;
      if (g === 'card') {
        const c = t.dataset.card;
        chosenTarget = null; prepare(c, S);
      } else if (g === 'target') { const c = targetFor; targetFor = null; chosenTarget = t.dataset.target; prepare(c, S); }
      else if (g === 'wish') { send('play', { card: wishFor, wish: t.dataset.wish, call: callArmed, target: chosenTarget }); wishFor = null; callArmed = false; chosenTarget = null; }
      else if (g === 'call') { callArmed = !callArmed; kit.render(); }
      else if (g === 'nowish') { wishFor = null; targetFor = null; chosenTarget = null; kit.render(); }
      else if (g === 'draw') send('draw');
      else if (g === 'pass') send('pass');
      else if (g === 'catch') send('catch');
      else if (g === 'late') send('late');
    },
  });
  return kit;
}
