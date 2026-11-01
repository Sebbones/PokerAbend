// Texas Hold'em im Browser. Zeigt nur an, was der Server schickt, und sendet Wünsche zurück.
// Läuft nach /core.js (Startseite, Verbindung, Dialoge, Hilfen) und meldet sich am Ende mit registerGame('poker', …) an.
'use strict';

// Oberfläche des Tisches – jedes Spiel bringt seine eigene mit
$('#game-root').innerHTML = I18n.html`<div id="game" class="game" hidden>
  <header class="topbar">
    <div class="top-left">
      ${homeButtonHTML()}
      <button class="code-chip" id="copy-link" title="Einladungslink kopieren" aria-label="Einladungslink kopieren">
        <span class="code-label">Tisch</span> <b id="room-code">-----</b>
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
      </button>
    </div>
    <div class="meta" id="meta" aria-live="polite"></div>
    <div class="top-right">
      <button class="btn btn-sm freeze-btn" id="freeze-btn" data-do="freeze" hidden></button>
      <nav class="topnav" aria-label="Seitenleisten">
        <button class="nav-btn" data-panel="log"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Verlauf</span></button>
        <button class="nav-btn" data-panel="stand"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6"/></svg><span>Stand</span></button>
        <button class="nav-btn" data-panel="me"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg><span>Ich</span></button>
        <button class="nav-btn" data-panel="host" id="nav-host" hidden><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg><span>Host</span></button>
      </nav>
    </div>
  </header>

  <section id="poker-program" hidden></section>
  <section class="table-wrap">
    <button class="help-btn" data-help aria-label="Kurzregeln und Hausregeln" title="Kurzregeln">?</button>
    <div class="table" id="table">
      <div class="rail"></div>
      <div class="felt">
        <div class="pot" id="pot"></div>
        <div class="board" id="board"></div>
        <div class="felt-msg" id="felt-msg"></div>
      </div>
      <div id="seats"></div>
      <div class="dealer" id="dealer" hidden aria-label="Dealer-Button">D</div>
    </div>
  </section>

  <section class="dock" id="dock"></section>

  <aside class="panel" id="panel" hidden aria-labelledby="panel-title">
    <button class="grip" id="panel-grip" aria-label="Schließen"></button>
    <div class="panel-head">
      <h2 id="panel-title">Verlauf</h2>
      <button class="icon-btn" id="panel-close" aria-label="Schließen"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="panel-body" id="panel-body"></div>
  </aside>
</div>

<aside id="seb" class="seb-card" hidden></aside>`;

const REACTIONS = ['👍', '😂', '😮', '😬', '🔥', '🙈', 'GG', 'Nice Hand', 'Glück gehabt', 'Respekt'];
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
const STREET = { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', done: 'Hand vorbei' };
// Pokerhände von stark nach schwach: [Kategorie, Name, englisch, Erklärung, Beispiel, Anzahl zählender Karten]
const HANDS = [
  [9, 'Royal Flush', 'Royal Flush', 'Ass bis Zehn in einer Farbe', ['As', 'Ks', 'Qs', 'Js', 'Ts'], 5],
  [8, 'Straight Flush', 'Straight Flush', 'Fünf Karten in Folge, alle in einer Farbe', ['Th', '9h', '8h', '7h', '6h'], 5],
  [7, 'Vierling', 'Four of a Kind', 'Vier Karten mit gleichem Wert', ['Qh', 'Qs', 'Qd', 'Qc', '5d'], 4],
  [6, 'Full House', 'Full House', 'Drilling und Paar zusammen', ['Ad', 'As', 'Ah', '7c', '7d'], 5],
  [5, 'Flush', 'Flush', 'Fünf Karten in einer Farbe, egal welche Werte', ['Ad', 'Jd', '8d', '5d', '7d'], 5],
  [4, 'Straße', 'Straight', 'Fünf Karten in Folge, Farben gemischt', ['Th', '9s', '8d', '7c', '6s'], 5],
  [3, 'Drilling', 'Three of a Kind', 'Drei Karten mit gleichem Wert', ['Qh', 'Qs', 'Qd', '7c', '6s'], 3],
  [2, 'Zwei Paare', 'Two Pair', 'Zwei verschiedene Paare', ['Jh', 'Jc', '9d', '9c', '2d'], 4],
  [1, 'Paar', 'One Pair', 'Zwei Karten mit gleichem Wert', ['Qs', 'Qh', '6h', '9c', '2d'], 2],
  [0, 'Höchste Karte', 'High Card', 'Nichts davon – die höchste Karte zählt', ['Ah', 'Qs', '6s', '5d', 'Tc'], 1],
];
const HAND_NAME = Object.fromEntries(HANDS.map(([cat, name]) => [cat, name]));
// Kleiner Balken: Name, Balken, Prozent – die Zahl steht immer dabei (nicht nur die Länge)
const oddsBar = (name, p) => `<span class="odds-bar"><span class="ob-name">${esc(name)}</span><span class="ob-track"><i style="width:${Math.max(2, Math.min(100, p))}%"></i></span><b>${pct(p)}</b></span>`;
function pct(p) { return p >= 99.95 ? 'sicher' : p < 1 ? '< 1 %' : Math.round(p) + ' %'; }

// ---------- Persönliche Einstellungen (nur in diesem Browser) ----------
const PREF_DEFAULTS = {
  fourColor: false, strength: true, bb: false, sound: true, calm: false, theme: 'classic', keys: true,
  notify: false,      // Browser-Benachrichtigung, wenn man im Hintergrund dran ist
  foldJokes: true,    // freche Sprüche beim Folden statt Checken
  seatCards: false,   // eigene Karten zusätzlich am eigenen Platz
  cardSize: 'normal', // normal | large | xl
  odds: true,         // eigene Gewinnchancen anzeigen (wenn der Host sie erlaubt)
};
// Standard-Abstände der Blind-Vorlagen – wie BLIND_PRESETS in games/poker/blinds.js
const BLIND_DEFAULTS = { fast: { minutes: 6, hands: 8 }, normal: { minutes: 12, hands: 15 }, long: { minutes: 20, hands: 25 }, custom: { minutes: 12, hands: 15 } };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const pctText = (p) => String(p).replace('.', ',') + ' %';
usePrefs(PREF_DEFAULTS);
function applyPrefs() {
  document.body.classList.toggle('four', prefs.fourColor);
  document.body.classList.toggle('calm', prefs.calm);
  document.body.classList.toggle('cards-l', prefs.cardSize === 'large');
  document.body.classList.toggle('cards-xl', prefs.cardSize === 'xl');
  document.documentElement.dataset.theme = prefs.theme;
}
applyPrefs();

// ---------- Zustand ----------
let S = null;            // letzter Zustand vom Server
let prevS = null;
let raiseValue = null;
let raiseKey = null;
let panel = null;
let actionSeq = 0;

// ---------- Hilfen ----------
function amt(n) {
  if (prefs.bb && S?.settings?.bigBlind) {
    const v = n / S.settings.bigBlind;
    return (Number.isInteger(v) ? v : v.toFixed(1)).toLocaleString(I18n.locale) + ' BB';
  }
  return Number(n).toLocaleString(I18n.locale);
}
function cardHTML(c, extra = '') {
  if (!c || c === '??') return I18n.html`<div class="card back ${extra}" aria-label="verdeckte Karte"></div>`;
  const r = c[0] === 'T' ? '10' : c[0];
  const s = c[1];
  const red = s === 'h' || s === 'd' ? 'red' : '';
  return `<div class="card ${red} ${s} ${extra}" aria-label="${r}${SUIT[s]}"><span class="r">${r}</span><span class="s">${SUIT[s]}</span></div>`;
}
function chipClass(n) {
  const bb = S?.settings?.bigBlind || 100;
  const x = n / bb;
  return x >= 50 ? 'c5' : x >= 20 ? 'c4' : x >= 5 ? 'c3' : x >= 2 ? 'c2' : 'c1';
}
// Chip-Stapel: 1–3 Chips je nach Höhe (in Big Blinds)
function chipStack(n, max = 3) {
  const x = n / (S?.settings?.bigBlind || 100);
  const count = Math.min(max, x < 2 ? 1 : x < 10 ? 2 : x < 30 ? 3 : x < 80 ? 4 : 5);
  return `<span class="stack" aria-hidden="true">${`<span class="chip ${chipClass(n)}"></span>`.repeat(count)}</span>`;
}


// ---------- Töne ----------
const sounds = {
  turn: () => { beep(740, 140, 0.06); setTimeout(() => beep(988, 160, 0.05), 140); },
  chips: () => { beep(2200, 40, 0.03, 'triangle'); setTimeout(() => beep(1800, 50, 0.025, 'triangle'), 50); },
  win: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 180, 0.05), i * 110)); },
  bigWin: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 220, 0.055), i * 120)); },
  nudge: () => { [880, 660, 880].forEach((f, i) => setTimeout(() => beep(f, 110, 0.07, 'square'), i * 150)); },
};

socket.on('reaction', ({ seat, id, text }) => showReaction(seat, id, text));
socket.on('nudge', (n) => { if (session) showNudge(n); });


// ---------- Darstellung ----------
// Hochformat (Handy, Tablet hochkant): hoher Tisch. Muss zu den Media-Queries in style.css passen.
const PORTRAIT = '(max-width: 1100px) and (orientation: portrait)';
const COMPACT = '(max-width: 640px)';
// Punkte auf einer leicht eckigen Ellipse, gleichmäßig nach Bogenlänge verteilt (unten beginnend, im Uhrzeigersinn).
// So liegen die Panels überall gleich weit auseinander statt sich oben und unten zu drängen.
function ringPoints(n, aspect) {
  const P = 2.5, M = 360, pts = [];
  for (let k = 0; k <= M; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / M;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([Math.sign(c) * Math.abs(c) ** (2 / P), Math.sign(s) * Math.abs(s) ** (2 / P)]);
  }
  const len = [0];
  for (let k = 1; k <= M; k++) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], (pts[k][1] - pts[k - 1][1]) * aspect));
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = (len[M] * i) / n;
    while (len[j + 1] < t) j++;
    out.push(pts[j]);
  }
  return out;
}
// Wer sitzt, sieht nur besetzte Plätze – man selbst unten. Zuschauer sehen alle 9 Plätze, um sich hinzusetzen.
function seatLayout() {
  const portrait = matchMedia(PORTRAIT).matches;
  const mySeat = S.you?.seat;
  const iAmSeated = mySeat !== null && mySeat !== undefined;
  const seated = S.seats.filter(Boolean).length;
  const showEmpty = !iAmSeated && seated < S.settings.maxPlayers;
  const base = iAmSeated ? mySeat : 0;
  const list = [];
  for (let k = 0; k < 9; k++) { const i = (base + k) % 9; if (S.seats[i] || showEmpty) list.push(i); }
  const t = $('#table');
  const aspect = t.offsetHeight / Math.max(1, t.offsetWidth);
  const rx = portrait ? 42 : 50, ry = portrait ? 47 : 51;
  const pos = {};
  ringPoints(list.length, aspect).forEach(([ux, uy], k) => { pos[list[k]] = { x: 50 + rx * ux, y: 50 + ry * uy }; });
  return pos;
}

// Einsätze, Blind-Chips und Dealer-Puck an den gemessenen Panels ausrichten – ohne Überlappung mit Board, Pot,
// Text, Karten oder anderen Panels. Für jedes Teil gibt es mehrere Ausweichpositionen, die erste freie gewinnt.
function placeExtras(h) {
  const T = $('#table').getBoundingClientRect();
  const rel = (r) => ({ l: r.left - T.left, t: r.top - T.top, r: r.right - T.left, b: r.bottom - T.top });
  const obstacles = [];
  const addObs = (sel) => $$(sel).forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && getComputedStyle(e).display !== 'none') obstacles.push(rel(r)); });
  addObs('#board'); addObs('.pot-box'); addObs('.felt-msg > *'); addObs('.seat .plate'); addObs('.seat-cards .card'); addObs('.empty-seat');
  const pad = 3;
  const free = (c, w, hh) => {
    const b = { l: c.x - w / 2 - pad, r: c.x + w / 2 + pad, t: c.y - hh / 2 - pad, b: c.y + hh / 2 + pad };
    if (b.l < 6 || b.t < 6 || b.r > T.width - 6 || b.b > T.height - 6) return false;
    return !obstacles.some((o) => b.l < o.r && o.l < b.r && b.t < o.b && o.t < b.b);
  };
  const take = (c, w, hh) => obstacles.push({ l: c.x - w / 2, r: c.x + w / 2, t: c.y - hh / 2, b: c.y + hh / 2 });
  const pick = (cands, w, hh) => cands.find((c) => free(c, w, hh)) || cands[0];
  const cx = T.width / 2, cy = T.height / 2;
  const anchors = {}; // Platz → { px, py, ux, uy, e, bet }
  for (const plate of $$('.seat .plate')) {
    const seatEl = plate.closest('[data-seat]');
    if (getComputedStyle(seatEl).display === 'none') {
      // eigenes Panel am Handy ausgeblendet: Anker ist trotzdem sein Platz
      const px = (parseFloat(seatEl.style.left) / 100) * T.width, py = (parseFloat(seatEl.style.top) / 100) * T.height;
      const d = Math.hypot(px - cx, py - cy) || 1;
      anchors[seatEl.dataset.seat] = { px, py, ux: (px - cx) / d, uy: (py - cy) / d, hw: 10, hh: 10 };
      continue;
    }
    const r = rel(plate.getBoundingClientRect());
    const px = (r.l + r.r) / 2, py = (r.t + r.b) / 2;
    const d = Math.hypot(px - cx, py - cy) || 1;
    anchors[seatEl.dataset.seat] = { px, py, ux: (px - cx) / d, uy: (py - cy) / d, hw: (r.r - r.l) / 2, hh: (r.b - r.t) / 2 };
  }
  // Abstand vom Panel-Mittelpunkt bis zum Rand in Richtung Tischmitte
  const edge = (a) => Math.min(a.hw / Math.max(1e-3, Math.abs(a.ux)), a.hh / Math.max(1e-3, Math.abs(a.uy)));
  const inward = (a, w, hh, extra) => {
    const D = edge(a) + 10 + Math.abs(a.ux) * w / 2 + Math.abs(a.uy) * hh / 2 + extra;
    return { x: a.px - a.ux * D, y: a.py - a.uy * D };
  };
  const sideOf = (a, w, hh) => [
    { x: a.px, y: a.py - Math.sign(a.uy || 1) * (a.hh + hh / 2 + 8) },
    { x: a.px - Math.sign(a.ux || 1) * (a.hw + w / 2 + 8), y: a.py },
    { x: a.px + Math.sign(a.ux || 1) * 0, y: a.py + Math.sign(a.uy || 1) * (a.hh + hh / 2 + 8) },
  ];
  // 1. Einsätze
  for (const el of $$('#seats .bet')) {
    const a = anchors[el.dataset.bet]; if (!a) continue;
    const w = el.offsetWidth, hh = el.offsetHeight;
    const c = pick([0, 16, 34, 56, 80].map((x) => inward(a, w, hh, x)).concat(sideOf(a, w, hh)), w, hh);
    take(c, w, hh); a.bet = c;
    el.style.left = (c.x / T.width) * 100 + '%'; el.style.top = (c.y / T.height) * 100 + '%'; el.style.visibility = '';
  }
  // 2. Blind-Chips und Dealer neben dem Einsatz (oder wo er wäre)
  const nearBet = (a, s) => {
    const b = a.bet || inward(a, 60, 24, 0);
    const px = -a.uy, py = a.ux; // senkrecht zur Richtung zur Tischmitte
    const out = [];
    for (const k of [1, -1]) for (const dist of [48, 66, 86]) out.push({ x: b.x + px * dist * k, y: b.y + py * dist * k });
    out.push(inward(a, s, s, 0), inward(a, s, s, 30), ...sideOf(a, s, s));
    return out;
  };
  for (const el of $$('#seats .badge')) {
    const a = anchors[el.dataset.for]; if (!a) continue;
    const s = el.offsetWidth;
    const c = pick(nearBet(a, s), s, s);
    take(c, s, s);
    el.style.left = (c.x / T.width) * 100 + '%'; el.style.top = (c.y / T.height) * 100 + '%'; el.style.visibility = '';
  }
  const dealer = $('#dealer');
  const a = h ? anchors[h.button] : null;
  if (a) {
    dealer.hidden = false;
    const s = dealer.offsetWidth || 26;
    const c = pick(nearBet(a, s), s, s);
    take(c, s, s);
    dealer.style.left = (c.x / T.width) * 100 + '%'; dealer.style.top = (c.y / T.height) * 100 + '%';
  } else dealer.hidden = true;
}
const RING = 138.2; // Umfang des Timer-Rings (r = 22)
const ringSVG = '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="ring-bg" cx="24" cy="24" r="22"/><circle class="ring-fg" cx="24" cy="24" r="22" stroke-dasharray="138.2" stroke-dashoffset="0"/></svg>';

function render() {
  if (!S || $('#game').hidden) return;
  GameDesign.apply($('#game'), session.game);
  $('#game').classList.toggle('has-program', !!S.partyProgram);
  $('#poker-program').hidden = !S.partyProgram;
  $('#poker-program').innerHTML = programBannerHTML(S);
  document.documentElement.style.setProperty('--program-h', $('#poker-program').offsetHeight + 'px');
  if (!$('.table-wrap > .scene-backdrop')) $('.table-wrap').insertAdjacentHTML('afterbegin', GameDesign.backdrop(session.game));
  document.documentElement.style.setProperty('--topbar', $('.topbar').offsetHeight + 'px');
  $('#room-code').textContent = S.code;
  $('#nav-host').hidden = !S.you?.isHost;
  const h = S.hand;
  const st = S.settings;
  const b = S.blinds;
  const levels = b.mode !== 'off';
  $('#meta').innerHTML = I18n.html`<div class="blinds"><small>Blinds${levels ? I18n.html` · Level ${b.level}` : ''}</small>${amt(b.sb)} / ${amt(b.bb)}</div>
    <div class="meta-sub">${h ? I18n.html`Hand #${h.no} · ${STREET[h.street]}` : 'Noch keine Hand'}${S.frozen ? I18n.html(' · <b>Angehalten</b>') : S.paused ? I18n.html(' · <b>Pause</b>') : ''}${levels ? blindNote(b) : ''}</div>`;
  const fb = $('#freeze-btn');
  fb.hidden = !S.you?.isHost || !S.started;
  fb.classList.toggle('btn-brass', !!S.frozen);
  fb.innerHTML = S.frozen ? I18n.html`${ICON.play}<span class="long">Weiterspielen</span>` : I18n.html`${ICON.pause}<span class="long">Alle anhalten</span>`;
  fb.title = S.frozen ? 'Weiterspielen' : 'Spiel für alle sofort anhalten';
  fb.setAttribute('aria-label', fb.title);
  document.body.classList.toggle('frozen', !!S.frozen);
  renderTable();
  renderDock();
  document.documentElement.style.setProperty('--dock-h', $('#dock').offsetHeight + 'px');
  // Erst jetzt steht die Tischgröße fest. Der Dealer-Puck bleibt dasselbe Element und gleitet deshalb.
  placeExtras(h && S.seats[h.button] ? h : null);
  if (panel) renderPanel();
  renderSeb();
  checkGifts();
  renderGamePause(S);
}

// Nach dem Showdown: wie die Chancen auf jeder Straße standen (nur gezeigte Hände)
function afterOddsHTML(h) {
  if (!h.afterOdds || !prefs.odds) return '';
  const seats = Object.keys(h.afterOdds[0].odds);
  const streets = h.afterOdds.map((r) => STREET[r.street]).join(' → ');
  const rows = seats.map((s) => `<span>${esc(S.seats[s]?.name ?? '?')} ${h.afterOdds.map((r) => String(r.odds[s]).replace('.', ',')).join(' → ')} %</span>`).join(' · ');
  return I18n.html`<div class="sub after-odds"><small>Chancen ${streets}:</small> ${rows}</div>`;
}
// „Nächstes Level in 4:32 – 100/200“ (die Uhr zählt in tick() weiter)
function blindNote(b) {
  if (b.pending) return I18n.html` · <b>Ab nächster Hand ${amt(b.pending.sb)}/${amt(b.pending.bb)}</b>`;
  if (!b.next) return ' · höchstes Level';
  const n = b.next;
  const when = n.handsLeft !== null ? I18n.html`in ${n.handsLeft} ${n.handsLeft === 1 ? 'Hand' : 'Händen'}`
    : I18n.html`in <span data-blindclock>${mmss(n.msLeft)}</span>${b.running ? '' : ' (Uhr steht)'}`;
  return I18n.html` · Nächstes Level ${when} – ${amt(n.sb)}/${amt(n.bb)}`;
}

function renderTable() {
  const h = S.hand;
  const pos = seatLayout();
  const winning = new Set();
  const winners = new Map(); // Platz → gewonnener Betrag
  if (h?.done && h.result) {
    for (const p of h.result.pots) {
      (p.cards || []).forEach((c) => winning.add(c));
      for (const w of p.winners) winners.set(w, (winners.get(w) || 0) + Math.floor(p.amount / p.winners.length));
    }
  }
  const justDone = !!(h?.done && !(prevS?.hand?.done && prevS.hand.no === h.no));
  const big = bigWin(h);

  // Pot: Main Pot und Side Pots als eigene Panels
  const pots = h && !h.done ? h.pots.filter((p) => p > 0) : [];
  const onTable = h && !h.done ? S.seats.reduce((a, x) => a + (x?.bet || 0), 0) : 0;
  const total = pots.reduce((a, p) => a + p, 0) + onTable;
  // Großer Pot in der Mitte; Side Pots (wenn es welche gibt) klein daneben
  $('#pot').innerHTML = total ? I18n.html`<div class="pot-box main">${chipStack(total, 5)}<span class="pot-text"><small>Pot${onTable && pots.length ? ' mit Einsätzen' : ''}</small><b>${amt(total)}</b></span></div>`
    + (pots.length > 1 ? pots.map((p, i) => `<div class="pot-box side">${chipStack(p, 2)}<span class="pot-text"><small>${i ? 'Side Pot' + (pots.length > 2 ? ' ' + i : '') : 'Main Pot'}</small><b>${amt(p)}</b></span></div>`).join('') : '') : '';

  // Board
  const board = h?.board || [];
  const prevBoard = prevS?.hand?.no === h?.no ? prevS?.hand?.board || [] : [];
  let html = '';
  for (let i = 0; i < 5; i++) {
    const c = board[i];
    if (c) html += cardHTML(c, `${i >= prevBoard.length ? 'deal' : ''} ${h.done && winning.size ? (winning.has(c) ? I18n.html`win ${justDone ? 'glow' : ''}` : 'dim') : ''}`);
    else html += '<div class="slot" aria-hidden="true"></div>';
  }
  $('#board').innerHTML = html;

  // Nachricht auf dem Filz
  let msg = '';
  if (S.frozen) {
    msg = I18n.html`<div class="big">${ICON.pause} Angehalten</div><div class="sub">${S.you?.isHost ? I18n.html('Mit <b>Weiterspielen</b> oben geht es genau hier weiter.') : 'Der Host hat das Spiel angehalten. Gleich geht es weiter.'}</div>`;
  } else if (!h || (!S.started && !h)) {
    const seated = S.seats.filter(Boolean).length;
    msg = S.you?.isHost
      ? `<div class="big">${seated < 2 ? 'Warte auf Mitspieler' : 'Alle da?'}</div><div class="sub">${seated < 2 ? 'Teil den Link oben – sobald 2 sitzen, kannst du starten.' : I18n.html`<button class="btn btn-brass" data-do="start">Spiel starten</button>`}</div>`
      : I18n.html`<div class="big">Gleich geht’s los</div><div class="sub">Der Host startet das Spiel.</div>`;
  } else if (h.done && h.result) {
    const lines = h.result.pots.map((p, i) => `<div class="${i ? 'sub' : 'big'}">${esc(p.names.join(' & '))} ${p.winners.length > 1 ? 'teilen sich' : 'gewinnt'} ${amt(p.amount)}${p.hand ? I18n.html` mit ${esc(p.hand)}` : ''}</div>`);
    const next = S.nextAt ? Math.max(0, Math.ceil((S.nextAt - gameNow(S)) / 1000)) : null;
    let sub = '';
    if (S.paused) sub = 'Pause – der Host macht weiter';
    else if (next !== null) sub = I18n.html`Nächste Hand in <span data-countdown>${next}</span> s`;
    else if (S.partyProgram && S.partyProgram.status !== 'stopped') sub = S.partyProgram.status === 'between' && S.you?.isHost ? I18n.html('<button class="btn btn-brass btn-sm" data-program="next">Nächstes Programm-Spiel</button>') : I18n.html('<button class="btn btn-sm" data-program="stand">Abendwertung</button>');
    else if (S.you?.isHost) sub = I18n.html('<button class="btn btn-brass btn-sm" data-do="nextHand">Nächste Hand</button>');
    else if (!S.settings.autoNext) sub = 'Der Host startet die nächste Hand';
    msg = lines.join('') + afterOddsHTML(h) + (sub ? `<div class="sub" style="margin-top:6px">${sub}</div>` : '');
  } else if (!h.done && S.paused) {
    msg = I18n.html('<div class="sub">Pause nach dieser Hand</div>');
  }
  $('#felt-msg').innerHTML = msg;

  // Plätze
  const compact = matchMedia(COMPACT).matches;
  const mySeat = S.you?.seat;
  const iAmSeated = mySeat !== null && mySeat !== undefined;
  const seatedCount = S.seats.filter(Boolean).length;
  let seatsHTML = '';
  for (const [key, p] of Object.entries(pos)) {
    const i = Number(key);
    const s = S.seats[i];
    const style = I18n.html`left:${p.x}%;top:${p.y}%`;
    if (!s) {
      seatsHTML += `<div class="empty-seat" style="${style}">${!iAmSeated && seatedCount < S.settings.maxPlayers ? I18n.html`<button class="sit-btn" data-sit="${i}" aria-label="Hier sitzen" ${S.you?.sitLocked ? 'disabled title="Du setzt noch eine Hand aus"' : ''}><span class="plus" aria-hidden="true">+</span><span class="long">Hier sitzen</span></button>` : '<div class="empty-dot"></div>'}</div>`;
      continue;
    }
    const turn = h && !h.done && h.toAct === i;
    const showing = s.cards && s.cards[0] !== '??' && i !== mySeat;
    const won = winners.get(i);
    const prev = prevS?.seats?.[i];
    const fx = (k) => (prev && prev.id === s.id && prev[k] !== s[k] ? 'fx' : '');
    const cls = ['seat', showing && 'showing', turn && 'turn', i === mySeat && 'me', s.folded && 'folded',
      (s.sittingOut || s.busted) && !s.inHand && 'out', s.sittingOut && 'break', !s.connected && 'is-offline',
      s.allIn && 'allin', won && 'winner', won && justDone && 'shine', won && big && 'big-win'].filter(Boolean).join(' ');
    let cards = '';
    // Eigene Karten am eigenen Platz nur auf Wunsch (unter „Ich“) – sonst stehen sie unten in der Aktionsleiste
    if (s.cards && (i !== mySeat || prefs.seatCards)) {
      cards = s.cards.map((c) => cardHTML(c, s.folded ? 'dim' : h.done && winning.size ? (winning.has(c) ? 'win' : '') : '')).join('');
    }
    // Anstupsen: am Panel dessen, der gerade dran ist
    const nudge = turn && iAmSeated && i !== mySeat && S.settings.nudge && !S.frozen
      ? I18n.html`<button class="nudge-btn" data-nudge="${s.id}" title="${esc(s.name)} anstupsen" aria-label="${esc(s.name)} anstupsen">👉</button>` : '';
    // Status: immer Symbol bzw. Text, nie nur Farbe
    let status = '';
    if (won) status = I18n.html('<span class="plaque status gold">★ Gewinnt</span>');
    else if (s.allIn) status = I18n.html`<span class="plaque status red ${fx('allIn')}">All-in</span>`;
    else if (!s.connected) status = I18n.html`<span class="plaque status ${fx('connected')}">${ICON.offline}offline</span>`;
    else if (s.sittingOut) status = I18n.html`<span class="plaque status blue ${fx('sittingOut')}" title="${h && !h.done && s.inHand && !s.folded ? 'Macht ab der nächsten Hand Pause' : 'Macht Pause'}">${ICON.pause}Pause</span>`;
    else if (s.folded) status = I18n.html`<span class="plaque status ${fx('folded')}">Fold</span>`;
    else if (s.busted) status = I18n.html('<span class="plaque status">pleite</span>');
    // Letzte Aktion über dem Panel: Check/Call neutral, Bet/Raise Gold (All-in steht schon als Status da)
    let act = '';
    if (h && !h.done && !s.folded && !s.allIn && ['Check', 'Call', 'Bet', 'Raise'].includes(s.lastAction)) {
      act = `<span class="plaque act ${['Bet', 'Raise'].includes(s.lastAction) ? 'gold' : ''} ${fx('lastAction')}">${esc(s.lastAction)}</span>`;
    }
    const handName = h?.done && h.result?.hands?.[i] ? `<div class="p-hand">${esc(h.result.hands[i])}</div>` : '';
    seatsHTML += `<div class="${cls}" style="${style}" data-seat="${i}">
      <div class="seat-cards">${cards}</div>
      <div class="plate">
        <div class="av-wrap">${ringSVG}<div class="avatar">${avatarHTML(s)}</div></div>
        <div class="p-info">
          <div class="p-name"><span>${esc(s.name)}</span>${s.isHost ? I18n.html`${ICON.crown}<span class="sr-only">(Host)</span>` : ''}</div>
          <div class="p-stack"><span class="chip c5" aria-hidden="true"></span>${amt(s.stack)}</div>
          ${compact && s.bet > 0 ? I18n.html`<div class="p-bet" aria-label="Einsatz ${amt(s.bet)}">↳ ${amt(s.bet)}</div>` : ''}
          ${handName}
        </div>
        ${act}${status}${nudge}
        ${won ? `<span class="p-win ${justDone ? 'pop' : ''} ${big ? 'big' : ''}">+${amt(won)}</span>` : ''}
      </div>
    </div>`;
    // Am Handy steht der Einsatz im Namensschild – auf dem kleinen Tisch ist kein Platz für eigene Chips
    if (s.bet > 0 && !compact) seatsHTML += `<div class="bet" style="visibility:hidden" data-bet="${i}">${chipStack(s.bet, 3)}${amt(s.bet)}</div>`;
    if (h && !h.done) {
      const blind = h.bb === i ? 'bb' : h.sb === i && h.sb !== h.button ? 'sb' : null;
      if (blind) seatsHTML += `<b class="badge ${blind}" style="visibility:hidden" data-for="${i}" title="${blind === 'sb' ? 'Small Blind' : 'Big Blind'}">${blind.toUpperCase()}</b>`;
    }
  }
  $('#seats').innerHTML = seatsHTML;
}

function renderDock() {
  const dock = $('#dock');
  const h = S.hand;
  const mySeat = S.you?.seat;
  if (mySeat === null || mySeat === undefined) {
    const you = S.you;
    let right = '<div></div>';
    let note = I18n.html('Du schaust zu. Klick auf <b>Hier sitzen</b>, um mitzuspielen.');
    if (you?.lastSeat !== null && you?.lastSeat !== undefined) {
      // Nach dem Aufstehen: eine Hand aussetzen, dann wieder rein
      const free = S.seats.filter(Boolean).length < S.settings.maxPlayers;
      note = you.sitLocked ? 'Du setzt eine Hand aus. Sobald die nächste Hand läuft, kannst du wieder einsteigen.' : I18n.t('Du schaust zu.');
      if (free) {
        const label = you.sitLocked || (h && !h.done) ? 'Wieder einsteigen ab nächster Hand' : 'Wieder einsteigen';
        right = `<div class="actions"><div class="act-row"><button class="btn btn-brass" data-do="rejoin" ${you.sitLocked ? 'disabled aria-describedby="lock-note"' : ''}>${label}</button></div></div>`;
      }
    }
    dock.innerHTML = `<div class="mine">${handsBtn()}<div class="waiting" id="lock-note">${note}</div></div>${right}`;
    return;
  }
  const me = S.seats[mySeat];
  const myCards = me.cards && me.cards[0] !== '??' ? me.cards : null;
  const foldedMine = !!(myCards && me.folded); // nach dem Fold weiter sichtbar, abgedunkelt
  const winning = new Set();
  if (h?.done) h.result?.pots.forEach((p) => (p.cards || []).forEach((c) => winning.add(c)));
  const fresh = prevS?.hand?.no !== h?.no;
  const cardsHTML = myCards ? myCards.map((c) => cardHTML(c, `${fresh ? 'deal' : ''} ${winning.has(c) ? 'win' : ''} ${foldedMine ? 'dim' : ''}`)).join('')
    + (foldedMine ? I18n.html('<span class="folded-tag">gefoldet</span>') : '') : '';
  let chances = '';
  if (prefs.odds && S.odds && S.strengthCat !== null && h && !h.done && h.street !== 'river') {
    const better = HANDS.filter(([cat]) => cat > S.strengthCat && S.odds[cat] >= 1).sort((a, b) => S.odds[b[0]] - S.odds[a[0]]).slice(0, 2);
    if (better.length) chances = I18n.html`<span class="odds-bars" aria-label="Chancen bis zum River">${better.map(([cat, name]) => oddsBar(name, S.odds[cat])).join('')}</span>`;
  }
  const showName = prefs.strength && S.strength;
  const strength = myCards && !foldedMine && (showName || chances) ? I18n.html`<button class="strength" data-panel-open="hands" title="Alle Pokerhände und deine Chancen"><span>${showName ? esc(S.strength) : 'Deine Chancen'}</span><small>${STREET[h.street]}</small>${chances}</button>` : '';
  const myChips = `<span class="me-chips"><span class="chip c5" aria-hidden="true"></span>${amt(me.stack)}</span>`;
  const left = `<div class="mine">${handsBtn()}<div class="cards ${foldedMine ? 'is-folded' : ''}">${cardsHTML}</div><div class="mine-info">${strength}${myChips}</div></div>`;

  let right = '';
  const L = S.legal;
  if (L) {
    const key = `${h.no}:${h.street}:${h.currentBet}`;
    if (raiseKey !== key) { raiseKey = key; raiseValue = L.minTo; }
    raiseValue = Math.min(L.maxTo, Math.max(L.minTo, raiseValue));
    const kb = (k) => (prefs.keys ? `<kbd>${k}</kbd>` : '');
    const callInner = L.canCheck
      ? I18n.html`<span class="amt">Check</span><small>kostet nichts ${kb('C')}</small>`
      : `<small>${L.toCall >= me.stack ? 'All-in' : 'Call'} ${kb('C')}</small><span class="amt">${amt(L.toCall)}</span>`;
    const clock = S.hand.turnTime ? I18n.html('<div class="my-clock" data-myclock><b>–</b><small>Sek.</small></div>') : '';
    right = I18n.html`<div class="turn-banner" role="status">Du bist dran</div>
    <div class="actions">
      ${L.canRaise && L.maxTo > L.minTo ? I18n.html`<div class="raise-box">
        <div class="presets">
          <button class="btn btn-sm" data-preset="0.5">½ Pot</button>
          <button class="btn btn-sm" data-preset="0.75">¾ Pot</button>
          <button class="btn btn-sm" data-preset="1">Pot</button>
          <button class="btn btn-sm" data-preset="all">${L.potLimit && L.maxTo < L.stackTo ? 'Max (Pot)' : 'All-in'}</button>
        </div>
        <div class="raise-line">
          <input type="range" id="raise-range" min="${L.minTo}" max="${L.maxTo}" step="${Math.max(1, Math.floor(S.settings.smallBlind))}" value="${raiseValue}" aria-label="Betrag">
          <input type="number" id="raise-num" min="${L.minTo}" max="${L.maxTo}" value="${raiseValue}" aria-label="Betrag eingeben">
        </div>
      </div>` : ''}
      <div class="act-row act-main">
        ${clock}
        <button class="btn btn-outline-red" data-act="fold" ${L.canCheck ? 'title="Du könntest auch checken"' : ''}><span class="amt">Fold</span><small>${L.canCheck ? 'statt Check' : 'aussteigen'} ${kb('F')}</small></button>
        <button class="btn" data-act="${L.canCheck ? 'check' : 'call'}">${callInner}</button>
        ${L.canRaise ? `<button class="btn btn-brass" data-act="raise" id="raise-btn">${raiseInner(raiseValue)}</button>` : ''}
      </div>
    </div>`;
  } else {
    const parts = [];
    if (S.frozen) parts.push(I18n.html`<span class="waiting"><b>${ICON.pause} Angehalten</b> – warte auf den Host</span>`);
    else if (me.sittingOut) parts.push(I18n.html`<span class="waiting break-note">${ICON.pause} Du machst Pause${h && !h.done && me.inHand && !me.folded ? ' ab der nächsten Hand' : ' und bekommst keine Karten'}</span>`);
    else if (h && !h.done && h.toAct >= 0) {
      const who = S.seats[h.toAct];
      parts.push(I18n.html`<span class="waiting">${me.folded ? 'Du bist raus. ' : ''}<b>${esc(who?.name)}</b> ist dran …</span>`);
    } else if (h?.done) {
      parts.push(I18n.html('<span class="waiting">Hand vorbei</span>'));
    }
    if (S.canShow) parts.push(I18n.html('<button class="btn btn-brass" data-do="show">Karten zeigen</button>'));
    if (me.busted && !(h && !h.done && me.inHand && !me.folded)) {
      parts.push(S.settings.rebuy === 'off' ? I18n.html('<span class="waiting">Keine Chips mehr</span>') : I18n.html`<button class="btn btn-brass" data-do="rebuy">Nachkaufen (${amt(S.settings.startStack)})</button>`);
    }
    parts.push(me.sittingOut ? I18n.html('<button class="btn btn-brass" data-do="back">Bin wieder da</button>') : I18n.html`<button class="btn" data-do="sitout" title="Du bekommst keine Karten, bis du zurück bist">${ICON.pause}<span><span class="long">Ich mache </span>Pause</span></button>`);
    if (me.leaving) parts.push(I18n.html('<span class="waiting">Du stehst nach der Hand auf</span>'), I18n.html('<button class="btn btn-ghost" data-do="stand">Doch sitzen bleiben</button>'));
    else parts.push(`<button class="btn btn-ghost" data-do="stand">${h && !h.done && me.inHand ? 'Nach der Hand aufstehen' : I18n.t('Aufstehen')}</button>`);
    right = `<div class="actions">${preActionsHTML(me)}<div class="act-row">${parts.join('')}</div></div>`;
  }
  dock.innerHTML = left + right;
}
// Vorab-Aktionen: gelten nur für die Karten, die man gerade hält – mit der nächsten Hand ist alles zurückgesetzt
const PRE = [['checkfold', 'Check/Fold'], ['check', 'Check'], ['callany', 'Call beliebig'], ['fold', 'Fold']];
function preActionsHTML(me) {
  const h = S.hand;
  if (!h || h.done || S.frozen || !me.inHand || me.folded || me.allIn) return '';
  const pre = S.you.pre;
  const canCheck = h.currentBet <= me.bet;
  const btns = PRE.map(([k, l]) => {
    const off = k === 'check' && !canCheck && pre !== 'check';
    return `<button class="btn btn-sm pre-btn" data-pre="${k}" aria-pressed="${pre === k}" ${off ? 'disabled title="Es wurde gesetzt – Check geht nicht"' : ''}>${l}</button>`;
  }).join('');
  const label = PRE.find(([k]) => k === pre)?.[1];
  const info = pre ? I18n.html`<span class="pre-active">Automatisch: <b>${label}</b></span>`
    : S.you.preNote ? `<span class="pre-note" role="status">${esc(S.you.preNote)}</span>` : I18n.html('<span class="pre-hint">Vorab für diese Hand:</span>');
  return I18n.html`<div class="pre-row ${pre ? 'on' : ''}" role="group" aria-label="Vorab-Aktion für diese Hand">${info}${btns}</div>`;
}
function raiseInner(v) {
  const L = S.legal;
  const val = Math.min(L.maxTo, Math.max(L.minTo, v));
  return `<small>${L.isBet ? 'Bet' : 'Raise auf'}${val === L.maxTo ? (L.potLimit && L.maxTo < L.stackTo ? ' · Pot-Limit' : ' · All-in') : ''} ${prefs.keys ? I18n.html('<kbd>R</kbd>') : ''}</small><span class="amt">${amt(val)}</span>`;
}

// Timer und Countdown laufen ohne komplettes Neuzeichnen
function tick() {
  const seat = $('.seat.turn');
  const fg = seat?.querySelector('.ring-fg');
  if (fg) {
    const frozenLeft = S?.frozen ? S.hand?.frozenLeft : null;
    if (S?.hand && !S.hand.done && (S.hand.deadline || frozenLeft != null) && S.hand.turnTime) {
      const total = Math.max(1, S.hand.turnTime) * 1000;
      const left = frozenLeft != null ? frozenLeft : S.hand.deadline - gameNow(S);
      const f = Math.max(0, Math.min(1, left / total));
      fg.style.strokeDashoffset = String(RING * (1 - f));
      seat.classList.toggle('low', left < 8000);
    } else fg.style.strokeDashoffset = '0'; // ohne Zeitlimit: voller Ring
  }
  const bc = $('[data-blindclock]');
  const nb = S?.blinds?.next;
  if (bc && nb?.msLeft != null && S.blinds.running) {
    const t = mmss(nb.msLeft - (gameNow(S) - S.now));
    if (bc.textContent !== t) bc.textContent = t;
  }
  const mc = $('[data-myclock]');
  if (mc && S?.hand && S.legal) {
    const frozenLeft = S.frozen ? S.hand.frozenLeft : null;
    const left = frozenLeft != null ? frozenLeft : S.hand.deadline ? S.hand.deadline - gameNow(S) : null;
    if (left !== null) {
      const secs = String(Math.max(0, Math.ceil(left / 1000)));
      const b = mc.firstChild;
      if (b.textContent !== secs) b.textContent = secs;
      mc.classList.toggle('low', left < 8000);
    }
  }
  const cd = $('[data-countdown]');
  if (cd && S?.nextAt) cd.textContent = Math.max(0, Math.ceil((S.nextAt - gameNow(S)) / 1000));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Töne und Hinweise bei Zustandswechseln
function cues(a, b) {
  if (!b?.hand) return;
  const mine = b.you?.seat;
  const wasMyTurn = a?.hand && !a.hand.done && a.hand.toAct === mine && a.hand.no === b.hand.no && a.hand.street === b.hand.street && a.hand.currentBet === b.hand.currentBet;
  if (b.legal && !wasMyTurn) {
    sounds.turn();
    if (document.hidden) { blinkTitle(true); notifyTurn(); }
  }
  if (!b.legal) blinkTitle(false);
  // Neue Hand: mischen; neue Karten in der Mitte: Karten legen
  if (a?.hand && a.hand.no !== b.hand.no) sfx('shuffle');
  else if (a?.hand?.no === b.hand.no && (b.hand.board?.length || 0) > (a.hand.board?.length || 0)) sfx('card');
  const betsBefore = a?.hand && !a.hand.done ? a.hand.bets : 0;
  if (b.hand.bets > betsBefore) sounds.chips();
  if (b.hand.done && !(a?.hand?.done && a.hand.no === b.hand.no)) {
    const big = bigWin(b.hand);
    if (b.hand.result?.pots.some((p) => p.winners.includes(mine))) (big ? sounds.bigWin : sounds.win)(); else sounds.chips();
    const winners = [...new Set(b.hand.result?.pots.flatMap((p) => p.winners) || [])];
    // Erst nachdem die Chips in der Mitte angekommen sind
    setTimeout(() => winners.forEach((w) => chipRain(w, big)), 450);
  }
}

// Tab-Titel blinkt, solange man im Hintergrund dran ist
let blinkTimer = null;
function blinkTitle(on) {
  clearInterval(blinkTimer); blinkTimer = null;
  document.title = 'Spieleabend';
  if (!on) return;
  let k = 0;
  blinkTimer = setInterval(() => { document.title = k++ % 2 ? 'Spieleabend' : I18n.t('● Du bist dran – Spieleabend'); }, 900);
}
function notifyTurn() {
  if (!prefs.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('Spieleabend', { body: 'Du bist dran!', tag: 'poker-turn', silent: true });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* manche Handys erlauben das nur mit Service Worker */ }
}

// Großer Gewinn: Pot ab 50 Big Blinds oder Hand ab Full House
const FULL_HOUSE = 6;
function bigWin(h) {
  if (!h?.done || !h.result) return false;
  const bb = S?.settings?.bigBlind || 100;
  return h.result.pots.some((p) => p.amount >= 50 * bb || (HANDS.find(([, name]) => name === p.hand)?.[0] ?? -1) >= FULL_HOUSE);
}
// Chips regnen auf das Gewinner-Panel (nur CSS-Animation, nichts Externes)
function chipRain(seat, big) {
  if (motionOff()) return;
  let plate = $(`.seat[data-seat="${seat}"] .plate`);
  if (!plate?.offsetParent) plate = seat === S?.you?.seat ? $('#dock .cards') : null; // eigener Platz am Handy ausgeblendet
  if (!plate) return;
  const r = plate.getBoundingClientRect();
  const box = document.createElement('div');
  box.className = 'chip-rain' + (big ? ' big' : '');
  box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
  const colors = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const n = big ? 26 : 12;
  for (let k = 0; k < n; k++) {
    const c = document.createElement('span');
    c.className = 'chip ' + colors[k % colors.length];
    c.style.left = Math.round(Math.random() * 100) + '%';
    c.style.animationDelay = Math.round(Math.random() * (big ? 700 : 350)) + 'ms';
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), big ? 2000 : 1500);
}

// ---------- Chips verschenken ----------
const seenGifts = new Set();
async function giftDialog(id) {
  const name = playerName(id);
  const amount = await ask({
    title: I18n.html`${name} Chips schenken`, text: I18n.html`Nur Spielgeld. ${name} muss zustimmen, das Angebot gilt 60 Sekunden.`, ok: I18n.t('Weiter'),
    input: { type: 'number', value: Math.min(1000, S.standings.find((p) => p.id === S.you?.id)?.chips || 0), label: 'Wie viele Chips?' },
  });
  if (amount === false) return;
  const message = await ask({
    title: 'Nachricht dazu?', text: 'Optional, höchstens 100 Zeichen.', ok: I18n.t('Senden'), cancel: 'Ohne Nachricht', cancelValue: '',
    input: { value: '', label: 'Nachricht', maxLength: 100, placeholder: 'z. B. Für die nächste Runde' },
  });
  if (message === false) return;
  send('gift', { id, amount: Number(amount), message }).then((r) => r?.ok && toast(I18n.html`Angebot an ${name} geschickt`));
}
// Neues Angebot für mich: einmal als Dialog zeigen (Esc = später, bleibt unter „Stand“ sichtbar)
async function checkGifts() {
  const g = (S.you?.giftsIn || []).find((x) => !seenGifts.has(x.id));
  if (!g || $('#dlg').open) return;
  seenGifts.add(g.id);
  const r = await ask({
    title: I18n.html`${g.from} möchte dir ${amt(g.amount)} Chips schenken`, text: g.message ? `„${g.message}“` : 'Ohne Nachricht.',
    ok: 'Annehmen', cancel: 'Ablehnen', cancelValue: 'no',
  });
  if (r === true) send('giftAnswer', { id: g.id, accept: true }).then((x) => x?.ok && toast('Angenommen 🎁'));
  else if (r === 'no') send('giftAnswer', { id: g.id, accept: false });
  else if (!panel) toast('Das Angebot findest du unter „Stand“');
}

// ---------- Anstupsen ----------
let nudgeTimer = null;
function showNudge({ from, text }) {
  let el = $('#nudge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'nudge'; el.className = 'nudge-pop'; el.setAttribute('role', 'alert');
    el.addEventListener('click', () => { el.hidden = true; });
    document.body.appendChild(el);
  }
  el.innerHTML = '<span class="nudge-hand" aria-hidden="true">👉</span><b></b><small></small>';
  el.querySelector('b').textContent = text;
  el.querySelector('small').textContent = from ? I18n.html`${from} stupst dich an` : I18n.t('Du bist dran');
  el.hidden = false;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  sounds.nudge();
  try { navigator.vibrate?.([120, 80, 120]); } catch { /* egal */ }
  if (document.hidden) { blinkTitle(true); notifyTurn(); }
  clearTimeout(nudgeTimer); nudgeTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

// Einsätze fliegen in die Mitte, Pots fliegen zum Gewinner
function animateChips(a, b) {
  if (prefs.calm || !a?.hand || !b?.hand || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sameHand = a.hand.no === b.hand.no;
  const streetChanged = sameHand && (a.hand.street !== b.hand.street);
  if (!streetChanged) return;
  const potEl = $('#pot');
  const target = potEl.getBoundingClientRect();
  const tx = target.left + target.width / 2; const ty = target.top + target.height / 2;
  const flights = [];
  $$('.bet').forEach((el) => {
    const r = el.getBoundingClientRect();
    const f = el.cloneNode(true);
    f.classList.add('flying'); f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.transform = 'none';
    document.body.appendChild(f); flights.push([f, tx - r.left - r.width / 2, ty - r.top - r.height / 2]);
  });
  const winners = b.hand.done ? [...new Set(b.hand.result?.pots.flatMap((p) => p.winners) || [])] : [];
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const [f, dx, dy] of flights) { f.style.transform = I18n.html`translate(${dx}px, ${dy}px) scale(.8)`; f.style.opacity = '0'; }
    setTimeout(() => { flights.forEach(([f]) => f.remove()); potEl.classList.add('pulse'); setTimeout(() => potEl.classList.remove('pulse'), 400); }, 400);
    if (winners.length) {
      setTimeout(() => {
        for (const w of winners) {
          const seat = $(`.seat[data-seat="${w}"] .plate`); if (!seat) continue;
          const r = seat.getBoundingClientRect();
          const f = document.createElement('div'); f.className = 'flying';
          f.innerHTML = `<span class="chip c5" style="width:26px;height:26px;display:block"></span>`;
          f.style.left = tx + 'px'; f.style.top = ty + 'px';
          document.body.appendChild(f);
          requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = I18n.html`translate(${r.left + r.width / 2 - tx}px, ${r.top - ty}px)`; f.style.opacity = '.2'; }));
          setTimeout(() => f.remove(), 420);
        }
      }, 420);
    }
  }));
}

function showReaction(seat, id, text) {
  const el = seat !== null && seat !== undefined ? $(`.seat[data-seat="${seat}"]`) : null;
  if (!el) { const who = S?.standings.find((p) => p.id === id); toast(`${who?.name || 'Jemand'}: ${text}`); return; }
  const b = document.createElement('div');
  b.className = 'reaction'; b.textContent = text;
  b.style.left = el.style.left; b.style.top = el.style.top;
  $('#seats').appendChild(b);
  setTimeout(() => b.remove(), 2700);
}

// ---------- Easter Egg „Waiting for Sebastian“ ----------
// Der Server schickt in S.sebs, wer gerade als „Sebastian“ Pause macht. Hier nur Anzeige, kein Spielzustand.
const SEB_JOKES = [
  'Er kommt bestimmt gleich raus. Bestimmt.',
  'Tag 37: Sebastian ist immer noch verschwunden.',
  'Vielleicht kommt er nach 18:00 Uhr raus.',
  'Die nächste Jahreszeit beginnt bald …',
  'Sebastian.exe reagiert nicht.',
  'Wir haben mittlerweile den Winter erreicht.',
];
// Pixel-Art: Farmer wartet vor Sebastians Zimmertür, Uhr dreht, Zzz steigt auf
const SEB_SCENE = I18n.html`<svg class="seb-scene" viewBox="0 0 80 46" shape-rendering="crispEdges" aria-hidden="true">
  <rect width="80" height="34" fill="#5b4030"/>
  <g fill="#4e3627"><rect y="8" width="80" height="1"/><rect y="17" width="80" height="1"/><rect y="26" width="80" height="1"/></g>
  <rect y="31" width="80" height="3" fill="#3b2619"/>
  <rect y="34" width="80" height="12" fill="#8a6a45"/>
  <g fill="#7a5c3a"><rect y="38" width="80" height="1"/><rect y="42" width="80" height="1"/><rect x="18" y="34" width="1" height="4"/><rect x="52" y="38" width="1" height="4"/><rect x="34" y="42" width="1" height="4"/></g>
  <!-- Fenster mit Nachthimmel -->
  <rect x="5" y="9" width="12" height="11" fill="#3b2619"/><rect x="6" y="10" width="10" height="9" fill="#1d2a4d"/>
  <rect x="10" y="10" width="1" height="9" fill="#3b2619"/><rect x="6" y="14" width="10" height="1" fill="#3b2619"/>
  <rect x="13" y="11" width="2" height="2" fill="#f4e7a1"/><rect x="7" y="16" width="1" height="1" fill="#f4e7a1"/>
  <!-- Wanduhr -->
  <rect x="23" y="5" width="9" height="9" fill="#3b2619"/><rect x="24" y="6" width="7" height="7" fill="#f3ead2"/>
  <rect x="27" y="6" width="1" height="1" fill="#3b2619"/><rect x="27" y="12" width="1" height="1" fill="#3b2619"/><rect x="24" y="9" width="1" height="1" fill="#3b2619"/><rect x="30" y="9" width="1" height="1" fill="#3b2619"/>
  <g class="seb-hand-h"><rect x="27" y="8" width="1" height="2" fill="#3b2619"/></g>
  <g class="seb-hand-m"><rect x="27" y="7" width="1" height="3" fill="#c8323c"/></g>
  <!-- Sebastians Tür -->
  <rect x="50" y="7" width="16" height="27" fill="#3b2619"/>
  <rect x="51" y="8" width="14" height="26" fill="#8f5f34"/>
  <rect x="53" y="10" width="10" height="9" fill="#7a4f2a"/><rect x="53" y="21" width="10" height="11" fill="#7a4f2a"/>
  <rect x="55" y="12" width="6" height="3" fill="#d9cba3"/><rect x="56" y="13" width="4" height="1" fill="#5b4030"/>
  <rect x="62" y="20" width="2" height="2" fill="#e8b04a"/>
  <rect x="51" y="33" width="14" height="1" fill="#1a110b"/>
  <!-- Wartender Farmer -->
  <g class="seb-farmer">
    <rect x="37" y="17" width="9" height="1" fill="#c9a24e"/>
    <rect x="38" y="15" width="7" height="2" fill="#e3c16f"/><rect x="38" y="16" width="7" height="1" fill="#b5532f"/>
    <rect x="39" y="18" width="5" height="4" fill="#f1c27d"/><rect x="38" y="18" width="2" height="3" fill="#6b3f1f"/>
    <rect x="43" y="19" width="1" height="1" fill="#2a1a10"/>
    <rect x="38" y="22" width="7" height="5" fill="#4a7fc1"/><rect x="40" y="22" width="1" height="5" fill="#3a6aa5"/>
    <rect x="37" y="23" width="1" height="3" fill="#4a7fc1"/><rect x="37" y="26" width="1" height="1" fill="#f1c27d"/>
    <rect x="45" y="23" width="1" height="3" fill="#4a7fc1"/><rect x="45" y="26" width="1" height="1" fill="#f1c27d"/>
    <rect x="39" y="27" width="5" height="4" fill="#3b4f7a"/><rect x="41" y="28" width="1" height="3" fill="#2d3d60"/>
    <rect x="39" y="31" width="2" height="2" fill="#3b2619"/><rect x="42" y="31" width="2" height="2" fill="#3b2619"/>
  </g>
  <g class="seb-z" fill="#e8f0ff" font-family="monospace" font-weight="700">
    <text x="45" y="14" font-size="4">z</text><text x="47" y="10" font-size="5">z</text><text x="44" y="6" font-size="6">Z</text>
  </g>
</svg>`;
let sebKey = null;
let sebIds = null;
let sebSmall = matchMedia('(max-width: 640px)').matches; // am Handy klein starten
let sebJokeTimer = null;
function sebWho(sebs) {
  const meIn = sebs.some((s) => s.id === S.you?.id);
  const others = sebs.filter((s) => s.id !== S.you?.id).map((s) => esc(s.name));
  const list = others.length > 1 ? others.slice(0, -1).join(', ') + ' und ' + others[others.length - 1] : others[0];
  if (meIn) return 'Alle warten darauf, dass du wiederkommst.' + (others.length ? I18n.html` Und auf ${list}.` : '');
  return I18n.html`${list} ${others.length > 1 ? 'machen' : 'macht'} gerade Pause.`;
}
function renderSeb() {
  const el = $('#seb');
  const sebs = S?.sebs || [];
  const ids = sebs.map((s) => s.id);
  // Wer nicht mehr pausiert, aber noch am Tisch sitzt, ist zurück
  if (sebIds) {
    const back = sebIds.filter((id) => !ids.includes(id)).map((id) => S.seats.find((s) => s?.id === id)).filter((s) => s && !s.sittingOut);
    if (back.length) toast('Sebastian has finally emerged from his room!');
  }
  const fresh = sebIds !== null && ids.some((id) => !sebIds.includes(id));
  sebIds = ids;
  if (!sebs.length) { el.hidden = true; el.innerHTML = ''; sebKey = null; clearInterval(sebJokeTimer); return; }
  const key = JSON.stringify([sebs, S.you?.id, sebSmall]);
  if (key === sebKey) return; // nicht neu zeichnen, sonst starten die Animationen neu
  sebKey = key;
  el.hidden = false;
  el.classList.toggle('small', sebSmall);
  if (fresh) { el.classList.remove('intro'); void el.offsetWidth; el.classList.add('intro'); }
  el.innerHTML = I18n.html`<button class="seb-toggle" data-seb-toggle aria-label="${sebSmall ? 'Szene zeigen' : 'Verkleinern'}" title="${sebSmall ? 'Szene zeigen' : 'Verkleinern'}">${sebSmall ? '▴' : '▾'}</button>
    <div class="seb-title">Waiting for Sebastian...</div>
    ${sebSmall ? '' : SEB_SCENE}
    <div class="seb-who" role="status" aria-live="polite">${sebWho(sebs)}</div>
    ${sebSmall ? '' : `<div class="seb-joke">${SEB_JOKES[0]}</div>`}`;
  clearInterval(sebJokeTimer);
  let i = 0;
  sebJokeTimer = setInterval(() => {
    const j = $('#seb .seb-joke'); if (!j) return;
    i = (i + 1) % SEB_JOKES.length;
    j.textContent = SEB_JOKES[i];
  }, 5000);
}

// ---------- Pokerhände (klappt unten links nach oben auf) ----------
const handsBtn = () => I18n.html`<button class="hands-btn" data-panel-open="hands" aria-expanded="${panel === 'hands'}" title="Welche Pokerhände gibt es?">Hände</button>`;
// Reiter „Hände“: Tabelle der Handwertungen, stärkste zuerst – mit deiner Hand und deinen Chancen, wenn erlaubt
function renderHands(body) {
  const h = S.hand;
  const odds = prefs.odds && h && !h.done && h.street !== 'river' ? S.odds : null;
  const mine = S.strengthCat;
  body.innerHTML = I18n.html`<p class="hint" style="margin:0">Von oben nach unten: die stärkste Hand zuerst. Haben zwei dasselbe, gewinnt die höhere Karte.
      ${odds ? 'Die Balken zeigen, wie wahrscheinlich das am River deine Hand ist.' : ''}</p>
    <table class="hands-table"><thead><tr><th class="num">#</th><th>Hand</th><th>Beispiel</th>${odds ? I18n.html('<th>Chance</th>') : ''}</tr></thead><tbody>
    ${HANDS.map(([cat, name, en, desc, cards, used], k) => {
      const p = odds ? odds[cat] ?? 0 : null;
      return `<tr class="${mine === cat ? 'now' : ''}"><td class="num">${k + 1}</td>
        <td><b>${name}</b>${en !== name ? ` <small class="hr-en">${en}</small>` : ''}${mine === cat ? I18n.html(' <span class="hr-now">Hast du</span>') : ''}<small class="hr-desc">${desc}</small></td>
        <td><span class="hr-cards">${cards.map((c, i) => cardHTML(c, i >= used ? 'dim' : '')).join('')}</span></td>
        ${odds ? `<td>${p > 0 ? oddsBar('', p) : '<span class="hr-pct none">–</span>'}</td>` : ''}</tr>`;
    }).join('')}</tbody></table>`;
}

// ---------- Seitenleiste ----------
const PANEL_TITLES = { log: 'Verlauf', stand: 'Stand des Abends', hands: 'Pokerhände', me: 'Meine Einstellungen', host: 'Host' };
function openPanel(name) {
  panel = panel === name ? null : name;
  $('#panel').hidden = !panel;
  $$('.nav-btn').forEach((b) => b.setAttribute('aria-current', String(b.dataset.panel === panel)));
  if (panel) { $('#panel-title').textContent = I18n.t(PANEL_TITLES[panel]); renderPanel(true); }
}
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.panel)));
$('#panel-close').addEventListener('click', () => openPanel(null));

let hostTab = 'spiel';
let openMenu = null;          // Spieler-ID, deren ⋯-Menü offen ist
const openGroups = new Set(['blinds']);
// Kartennamen im Verlauf als Mini-Karten („Flop: A♠ K♦ 7♣“). Text ist schon escaped.
const SUIT_KEY = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
function miniCards(text) {
  return text.replace(/(^|[\s:(])(10|[2-9JQKA])([♠♥♦♣])/g, (_, pre, r, s) => `${pre}<span class="mc ${s === '♥' || s === '♦' ? 'red' : ''} ${SUIT_KEY[s]}">${r}${s}</span>`);
}

// Host: Blinds erhöhen – Modus, Abstand, Vorlage oder eigene Liste, dazu die Level als Vorschau
function blindsHost(s) {
  const unit = s.blindMode === 'hands' ? I18n.t('Hände') : I18n.t('Minuten');
  const lv = S.blinds.levels;
  const preview = lv.map((l, i) => `<li class="${s.blindMode !== 'off' && i === S.blinds.level - 1 ? 'now' : ''}"><small>${i + 1}</small> ${amt(l.sb)}/${amt(l.bb)}</li>`).join('');
  return I18n.html`<div class="host-grid">
      <label class="field"><span>Blinds erhöhen</span><select data-blind="blindMode">
        ${[['off', 'aus'], ['minutes', 'alle X Minuten'], ['hands', 'alle X Hände']].map(([v, l]) => `<option value="${v}" ${s.blindMode === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <label class="field"><span>Alle wie viele ${unit}?</span><input type="number" min="1" max="240" data-blind="blindEvery" value="${s.blindEvery}" ${s.blindMode === 'off' ? 'disabled' : ''}></label>
      <label class="field" style="grid-column:1/-1"><span>Vorlage</span><select data-blind="blindPreset">
        ${[['fast', 'Schnell'], ['normal', I18n.t('Normal')], ['long', 'Lang'], ['custom', 'Eigene Liste']].map(([v, l]) => `<option value="${v}" ${s.blindPreset === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
    </div>
    ${s.blindPreset === 'custom' ? I18n.html`<label class="field"><span>Eigene Liste</span>
      <textarea class="input" data-set="blindList" rows="6" placeholder="50/100&#10;100/200&#10;200/400">${esc(s.blindList.join('\n'))}</textarea>
      <small class="hint">Ein Level pro Zeile, Small/Big Blind, z. B. 100/200. Höchstens 40 Level.</small></label>` : ''}
    <p class="hint" style="margin:0">Ein neues Level greift immer erst mit der nächsten Hand. Die Uhr steht vor dem Start, bei „Sofort anhalten“ und in der Pause.</p>
    <ol class="levels">${preview}</ol>`;
}

// ---------- Verlauf: ganzer Abend, nach Händen gruppiert, mit Filtern ----------
// Der Server schickt mit jedem Zustand die letzten 40 Einträge; den Rest holt „history“ einmal, wenn der Verlauf aufgeht.
const LOG_FILTERS = [['action', 'Aktionen'], ['win', 'Gewinne'], ['cards', 'Karten'], ['system', 'System'], ['react', 'Reaktionen']];
const hist = { code: null, entries: [], loaded: false, loading: false, cats: new Set(LOG_FILTERS.map(([k]) => k)), q: '', toggled: new Map(), key: '' };
function syncHistory(fetchAll = false) {
  if (!S) return;
  const lastN = hist.entries.at(-1)?.n || 0;
  // Anderer Tisch oder Server neu gestartet (Nummern beginnen neu): von vorn
  if (hist.code !== S.code || (S.logSeq ?? 0) < lastN) {
    hist.code = S.code; hist.entries = []; hist.loaded = false; hist.toggled.clear();
    return syncHistory(fetchAll);
  }
  const tail = S.log || [];
  const gap = !hist.loaded || (tail.length && tail[0].n > lastN + 1);
  if (gap) {
    if (!(fetchAll || panel === 'log') || hist.loading) return;
    hist.loading = true;
    socket.emit('history', { after: lastN }, (r) => {
      hist.loading = false;
      if (!r?.ok) return;
      mergeHistory(r.entries);
      hist.loaded = true;
      if (panel === 'log') renderLog();
    });
    return;
  }
  mergeHistory(tail);
}
function mergeHistory(list) {
  let last = hist.entries.at(-1)?.n || 0;
  for (const e of list) if (e.n > last) { hist.entries.push(e); last = e.n; }
}
const logShown = (e) => e.cat !== 'hand' && hist.cats.has(e.cat) && (!hist.q || e.text.toLowerCase().includes(hist.q));
const logItems = (list) => list.filter(logShown).map((l) => `<li class="${l.kind}">${miniCards(esc(l.text))}</li>`).join('');
function logGroups() {
  const groups = new Map();
  for (const e of hist.entries) { if (!groups.has(e.hand)) groups.set(e.hand, []); groups.get(e.hand).push(e); }
  return groups;
}
function renderLog(force = false) {
  const body = $('#panel-body');
  if (force || !$('#log-groups', body)) {
    body.innerHTML = I18n.html`<div class="reacts">${REACTIONS.map((r) => `<button class="btn btn-sm" data-react="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <div class="log-tools">
        <div class="log-filters" role="group" aria-label="Verlauf filtern">${LOG_FILTERS.map(([k, l]) => `<button class="chip-btn" data-logcat="${k}" aria-pressed="${hist.cats.has(k)}">${l}</button>`).join('')}</div>
        <input type="search" id="log-search" class="input" placeholder="Spieler suchen" aria-label="Im Verlauf nach Spielername suchen" value="${esc(hist.q)}">
      </div>
      <div id="log-groups" aria-live="off"></div>`;
    hist.key = '';
    if (!hist.loaded) syncHistory(true);
  }
  const key = `${hist.entries.at(-1)?.n || 0}|${[...hist.cats].join()}|${hist.q}|${hist.loaded}`;
  if (key === hist.key) return;
  hist.key = key;
  const box = $('#log-groups');
  const groups = logGroups();
  const newest = Math.max(0, ...groups.keys());
  const filtering = !!hist.q || hist.cats.size < LOG_FILTERS.length;
  let html = '';
  // Neueste Hand oben; eingeklappte Hände werden erst beim Aufklappen gefüllt
  for (const h of [...groups.keys()].sort((a, b) => b - a)) {
    const list = groups.get(h);
    const shown = list.filter(logShown);
    if (filtering && !shown.length) continue;
    const open = hist.q ? true : hist.toggled.has(h) ? hist.toggled.get(h) : h === newest;
    const win = list.find((e) => e.cat === 'win' && / (gewinnt|teilen sich) /.test(e.text));
    html += `<details class="lg" data-hand="${h}" ${open ? 'open' : ''}>
      <summary><b>${h ? I18n.html`Hand #${h}` : 'Vor der ersten Hand'}</b>${win ? `<small>${miniCards(esc(win.text))}</small>` : ''}<span class="lg-n">${shown.length}</span></summary>
      <ul class="log">${open ? logItems(list) : ''}</ul>
    </details>`;
  }
  const top = box.scrollTop;
  box.innerHTML = html || `<p class="hint">${hist.loaded ? 'Nichts gefunden – Filter oder Suche ändern.' : 'Lade den Verlauf …'}</p>`;
  box.scrollTop = top;
}

function renderPanel(force = false) {
  const body = $('#panel-body');
  // Formulare nicht neu zeichnen, während jemand tippt oder ein Menü offen ist
  if (!force && (panel === 'host' || panel === 'me') && body.contains(document.activeElement) && document.activeElement.matches('input, select, textarea')) return;
  if (!force && panel === 'host' && openMenu) return;
  if (panel === 'hands') {
    renderHands(body);
  } else if (panel === 'log') {
    renderLog(force);
  } else if (panel === 'stand') {
    const st = S.stats;
    const canGift = S.settings.gifts;
    const giftIn = (S.you?.giftsIn || []).map((g) => I18n.html`<div class="notice gift" role="note">
        <b>${esc(g.from)}</b> möchte dir ${amt(g.amount)} Chips schenken${g.message ? ` – „${esc(g.message)}“` : ''}
        <div class="gift-acts"><button class="btn btn-sm" data-gift-answer="${g.id}" data-accept="0">Ablehnen</button><button class="btn btn-sm btn-brass" data-gift-answer="${g.id}" data-accept="1">Annehmen</button></div>
      </div>`).join('');
    const go = S.you?.giftOut;
    const giftOut = go ? I18n.html`<div class="notice" role="note">Dein Geschenk an <b>${esc(go.to)}</b> (${amt(go.amount)} Chips) wartet auf eine Antwort.</div>` : '';
    body.innerHTML = programStandHTML(S) + giftIn + giftOut + I18n.html`<table class="standings"><tbody>${S.standings.map((p, k) => I18n.html`<tr>
        <td><span class="rank ${k < 3 ? 'r' + (k + 1) : ''}" aria-label="Platz ${k + 1}">${k + 1}</span></td>
        <td><span class="mini-av">${avatarHTML(p)}</span> ${esc(p.name)}${p.connected ? '' : I18n.html` <small style="color:var(--text-2)">${ICON.offline} offline</small>`}${p.rebuys ? I18n.html`<br><small style="color:var(--text-2)">${p.rebuys}× nachgekauft</small>` : ''}</td>
        <td class="num">${amt(p.chips)}</td>
        <td class="num ${p.net > 0 ? 'pos' : p.net < 0 ? 'neg' : ''}">${p.net > 0 ? '+' : p.net < 0 ? '−' : '±'}${amt(Math.abs(p.net))}</td>
        <td class="gift-cell">${canGift && p.id !== S.you?.id ? I18n.html`<button class="icon-btn" data-gift="${p.id}" title="${esc(p.name)} Chips schenken" aria-label="${esc(p.name)} Chips schenken">🎁</button>` : ''}</td></tr>`).join('')}</tbody></table>
      ${canGift ? I18n.html('<p class="hint">🎁 = Chips verschenken. Geht nur zwischen zwei Händen, der andere muss zustimmen. Am Plus/Minus ändert das nichts.</p>') : ''}
      <div class="facts">
        <div class="fact"><small>Gespielte Hände</small>${st.hands}</div>
        ${st.biggestPot ? I18n.html`<div class="fact"><small>Größter Pot</small>${amt(st.biggestPot.amount)} – ${esc(st.biggestPot.name)}${st.biggestPot.hand ? I18n.html` mit ${esc(st.biggestPot.hand)}` : ''}</div>` : ''}
        ${st.bestHand ? I18n.html`<div class="fact"><small>Beste Hand des Abends</small>${esc(st.bestHand.hand)} – ${esc(st.bestHand.name)}</div>` : ''}
      </div>
      <button class="btn btn-sm btn-ghost" data-leaderboard="poker">Bestenliste aller Abende</button>`;
  } else if (panel === 'me') {
    const t = (k, label, sub = '') => `<label class="toggle"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" role="switch" data-pref="${k}" ${prefs[k] ? 'checked' : ''}></label>`;
    body.innerHTML = I18n.html`<div>
      ${t('fourColor', 'Vier-Farben-Deck', 'Karo blau, Kreuz grün')}
      ${t('strength', 'Meine Hand anzeigen', S.settings.handStrength ? 'z. B. „Zwei Paare“ neben deinen Karten' : 'Der Host hat das an diesem Tisch ausgeschaltet')}
      ${t('odds', 'Gewinnchancen anzeigen', { off: 'Der Host hat die Chancen an diesem Tisch ausgeschaltet', own: 'Wie wahrscheinlich deine Hand bis zum River besser wird', after: 'An diesem Tisch erst nach dem Showdown, für alle gezeigten Hände' }[S.settings.oddsMode])}
      ${t('bb', 'Beträge in Big Blinds')}
      ${t('sound', I18n.t('Töne'), 'Mischen, Karten, Chips und ein Signal, wenn du dran bist')}
      ${GameDesign.soundPreference()}
      ${t('intros', I18n.t('Erste Schritte zeigen'), I18n.t('Kurze Einführung beim ersten Spiel jeder Art. Einschalten zeigt sie wieder.'))}
      ${t('keys', 'Tastenkürzel', 'F = Fold, C = Check/Call, R = Raise')}
      ${t('calm', I18n.t('Animationen aus'))}
      ${I18n.selector()}${UITheme.glassPreference()}
      ${t('notify', 'Benachrichtigung, wenn ich dran bin', 'Nur wenn der Tab im Hintergrund ist. Der Browser fragt einmal nach Erlaubnis.')}
      ${t('foldJokes', 'Freche Sprüche beim Folden', 'Wenn du foldest, obwohl du checken könntest')}
      ${t('seatCards', 'Eigene Karten auch am eigenen Platz', 'Zusätzlich zur Aktionsleiste. Am Handy wird der eigene Platz nicht gezeigt.')}
      </div>
      ${GameDesign.cardPreference()}
      ${padOn ? I18n.html`<div class="notice" role="note"><b>Controller erkannt</b><br>A = Check/Call · B = Fold · X = Raise · LB/RB = Betrag − / + · Start = dieses Menü. Im Dialog: A = OK, B = Abbrechen.</div>` : ''}
      <label class="field"><span>Tisch</span>
        <select data-pref="theme"><option value="classic" ${prefs.theme === 'classic' ? 'selected' : ''}>Klassisch – grüner Filz</option><option value="night" ${prefs.theme === 'night' ? 'selected' : ''}>Nacht – blauer Filz</option></select>
      </label>
      ${account.mode === 'password' ? I18n.html('<form method="post" action="/logout" class="logout-form"><button class="btn btn-ghost" type="submit">Von dieser Seite abmelden</button></form>') : ''}`;
  } else if (panel === 'host') {
    if (!S.you?.isHost) { openPanel(null); return; }
    const s = S.settings;
    const num = (k, label, min, step = 1) => `<label class="field"><span>${label}</span><input type="number" data-set="${k}" min="${min}" step="${step}" value="${s[k]}"></label>`;
    const sw = (k, label, sub = '') => `<label class="toggle"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" role="switch" data-set="${k}" ${s[k] ? 'checked' : ''}></label>`;
    const group = (id, title, inner) => `<details class="group" data-group="${id}" ${openGroups.has(id) ? 'open' : ''}><summary>${title}</summary><div class="group-body">${inner}</div></details>`;
    const tabs = [['spiel', I18n.t('Spiel')], ['regeln', I18n.t('Regeln')], ['spieler', I18n.t('Spieler')], ['sprueche', 'Sprüche']]
      .map(([id, l]) => `<button role="tab" aria-selected="${hostTab === id}" data-host-tab="${id}">${l}</button>`).join('');
    let inner = '';
    if (hostTab === 'spiel') {
      inner = I18n.html`<div class="big-actions">
        ${!S.started || !S.hand ? I18n.html`<button class="btn btn-brass" data-do="start">${ICON.play} Spiel starten</button>` : `
          <button class="btn ${S.frozen ? 'btn-brass' : ''}" data-do="freeze">${S.frozen ? I18n.html`${ICON.play} Weiterspielen` : I18n.html`${ICON.pause} Sofort für alle anhalten`}</button>
          <button class="btn" data-do="pause">${S.paused ? I18n.html`${ICON.play} Weiterspielen` : 'Pause nach dieser Hand'}</button>`}
        ${S.hand?.done && (!S.partyProgram || S.partyProgram.status === 'stopped') ? I18n.html('<button class="btn" data-do="nextHand">Nächste Hand</button>') : ''}
      </div>
      <div class="danger-zone">
        <button class="btn btn-outline-red" data-new-game ${S.hand && !S.hand.done ? 'disabled title="Geht nur zwischen zwei Händen"' : ''}>Neues Spiel starten</button>
        <p class="hint" style="margin:0">Alle wieder auf Startchips, Blinds auf Level 1, Nachkäufe auf 0. Spieler und Plätze bleiben, der alte Abendstand steht im Verlauf.</p>
      </div>
      <p class="hint" style="margin:0">„Sofort anhalten“ friert alles ein, auch den Zug-Timer. „Pause nach dieser Hand“ lässt die laufende Hand zu Ende spielen.</p>
      ${programControlsHTML(S)}
      ${botControlsHTML(S, programBusy(S) || programRunning(S))}
      ${unlistedSwitchHTML(S)}
      ${switchGameHTML('poker', !!(S.hand && !S.hand.done))}
      ${endGameHTML(!!(S.hand && !S.hand.done))}`;
    } else if (hostTab === 'regeln') {
      inner = I18n.html`<div class="notice" role="note">Änderungen gelten ab der nächsten Hand.</div>
        ${group('blinds', 'Blinds &amp; Chips', I18n.html`<div class="host-grid">
          ${num('smallBlind', 'Small Blind', 1)}
          ${num('bigBlind', 'Big Blind', 2)}
          ${num('startStack', 'Startchips / Nachkauf', 100, 100)}
          ${num('maxPlayers', 'Max. Spieler', 2)}
          <label class="field" style="grid-column:1/-1"><span>Nachkaufen</span><select data-set="rebuy">
            ${[['unlimited', 'unbegrenzt'], ['off', 'aus'], ['1', 'max. 1×'], ['2', 'max. 2×'], ['3', 'max. 3×'], ['5', 'max. 5×']].map(([v, l]) => `<option value="${v}" ${String(s.rebuy) === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label></div>`)}
        ${group('zeit', 'Zeit', I18n.html`<div class="host-grid">
          <label class="field"><span>Zeit pro Zug</span><select data-set="turnTime">
            ${[[0, 'aus'], [15, '15 s'], [30, '30 s'], [45, '45 s'], [60, '60 s'], [90, '90 s']].map(([v, l]) => `<option value="${v}" ${s.turnTime === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
          ${num('nextDelay', 'Pause zwischen Händen (s)', 2)}</div>
          ${sw('autoNext', 'Nächste Hand automatisch starten')}`)}
        ${group('levels', 'Blinds erhöhen', blindsHost(s))}
        ${group('komfort', 'Komfort', sw('handStrength', 'Handanzeige erlauben', 'Spieler sehen, was sie gerade haben')
          + I18n.html`<label class="field"><span>Gewinnchancen</span><select data-set="oddsMode">
              ${[['own', 'nur eigene, während der Hand'], ['after', 'nach der Hand, für gezeigte Hände'], ['off', 'aus']].map(([v, l]) => `<option value="${v}" ${s.oddsMode === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></label>`
          + sw('gifts', 'Chips verschenken erlauben', 'Nur zwischen zwei Händen, der andere muss zustimmen')
          + sw('nudge', 'Anstupsen erlauben', 'Nach 10 s automatisch, außerdem per 👉 am Panel – höchstens alle 10 s'))}`;
    } else if (hostTab === 'sprueche') {
      const area = (k, label, sub) => `<label class="field"><span>${label}</span>
        <textarea class="input" data-set="${k}" rows="7" spellcheck="true">${esc(s[k].join('\n'))}</textarea><small class="hint">${sub}</small></label>`;
      inner = I18n.html`<p class="hint" style="margin:0">Ein Spruch pro Zeile, höchstens 30 Sprüche mit je 80 Zeichen. Leer lassen = Standardsprüche. Gespeichert wird beim Verlassen des Feldes.</p>
        ${area('nudgeLines', I18n.t('Anstupsen'), 'Zufällig einer, wenn jemand trödelt.')}
        ${area('foldLines', 'Fold statt Check', 'Zufällig einer im Dialog „Trotzdem folden / Doch checken“.')}`;
    } else {
      const others = S.standings.filter((p) => p.id !== S.you.id);
      inner = `<div class="plist">${others.map((p) => I18n.html`<div class="prow">
          <span class="mini-av">${avatarHTML(p)}</span>
          <div class="who"><b>${esc(p.name)}</b><small>${p.seated ? amt(p.chips) + ' Chips' : 'steht'}${p.connected ? '' : ' · offline'}</small></div>
          <button class="icon-btn" data-menu="${p.id}" aria-haspopup="menu" aria-expanded="${openMenu === p.id}" aria-label="Aktionen für ${esc(p.name)}">${ICON.more}</button>
          ${openMenu === p.id ? I18n.html`<div class="menu" role="menu">
            <button role="menuitem" data-adjust-open="${p.id}">Chips korrigieren</button>
            ${(S.bots || []).some((bot) => bot.id === p.id) ? '' : I18n.html`<button role="menuitem" data-host-open="${p.id}">${ICON.crown} Host weitergeben</button>`}
            <button role="menuitem" class="danger" data-kick-open="${p.id}">Vom Tisch entfernen</button>
          </div>` : ''}
        </div>`).join('') || I18n.html('<p class="hint" style="margin:0">Noch niemand sonst da.</p>')}</div>`;
    }
    body.innerHTML = I18n.html`<div class="seg" role="tablist" aria-label="Host-Menü">${tabs}</div>${inner}`;
  }
}

// Kurzregeln („?“ am Tisch) mit den Hausregeln, die an diesem Tisch gelten
function pokerHelp() {
  const s = S?.settings || {};
  const b = S?.blinds || { sb: s.smallBlind, bb: s.bigBlind, mode: 'off' };
  const rebuy = s.rebuy === 'unlimited' ? 'unbegrenzt' : s.rebuy === 'off' ? 'aus' : I18n.html`höchstens ${s.rebuy}×`;
  const onOff = (v) => (v ? 'an' : 'aus');
  showHelp({
    title: s.variant === 'omaha' ? 'Omaha – kurz erklärt' : "Texas Hold'em – kurz erklärt",
    short: [
      ...(s.variant === 'omaha' ? [
        'Jeder bekommt 4 verdeckte Karten. In die Mitte kommen nach und nach 5 offene: Flop (3), Turn, River.',
        'Zählen dürfen genau 2 deiner Karten und genau 3 aus der Mitte – die beste solche Hand gewinnt (Reihenfolge unter „Hände“).',
        ...(s.potLimit ? ['Pot-Limit: Du darfst höchstens so hoch erhöhen, wie der Pot nach deinem Mitgehen groß wäre.'] : []),
      ] : [
        'Jeder bekommt 2 verdeckte Karten. In die Mitte kommen nach und nach 5 offene: Flop (3), Turn, River.',
        'Die beste Hand aus 5 der 7 Karten gewinnt – die Reihenfolge zeigt „Hände“ unten links.',
      ]),
      'Vor jeder neuen Karte wird gesetzt: Check (nichts), Call (mitgehen), Raise (erhöhen) oder Fold (aussteigen).',
      'Small und Big Blind sind Pflichteinsätze und wandern jede Hand einen Platz weiter.',
      'Wer All-in ist, spielt nur um den Teil des Pots, den er abdecken kann (Side Pots).',
      'Steigen alle anderen aus, gewinnt der Letzte ohne Aufdecken.',
    ],
    house: [
      I18n.html`Blinds: <b>${amt(b.sb)} / ${amt(b.bb)}</b>${b.mode !== 'off' ? I18n.html` – steigen alle ${s.blindEvery} ${b.mode === 'hands' ? I18n.t('Hände') : I18n.t('Minuten')}` : ''}`,
      'Pro Setzrunde höchstens ein Einsatz und 3 Erhöhungen',
      I18n.html`Nachkaufen: <b>${rebuy}</b> (${amt(s.startStack)} Chips)`,
      I18n.html`Zeit pro Zug: <b>${s.turnTime ? s.turnTime + ' s' : 'unbegrenzt'}</b>`,
      I18n.html`Gewinnchancen: <b>${{ off: 'aus', own: 'nur eigene', after: 'nach der Hand' }[s.oddsMode] || 'nur eigene'}</b>`,
      I18n.html`Chips verschenken: <b>${onOff(s.gifts)}</b> · Anstupsen: <b>${onOff(s.nudge)}</b>`,
    ],
  });
}

// ---------- Eingaben ----------
function newId() { return Date.now().toString(36) + (actionSeq++).toString(36); }

async function doAction(type) {
  const L = S?.legal; if (!L) return;
  if (type === 'fold' && L.canCheck) {
    const lines = S.settings.foldLines || [];
    const choice = await ask({
      title: prefs.foldJokes && lines.length ? pick(lines) : 'Wirklich folden?',
      text: 'Du könntest kostenlos checken und bleibst trotzdem in der Hand.',
      ok: 'Trotzdem folden', danger: true, cancel: 'Doch checken', cancelValue: 'check',
    });
    if (!S?.legal || !choice) return;
    if (choice === 'check') type = 'check';
  }
  const payload = { type, id: newId() };
  if (type === 'raise') payload.amount = raiseValue;
  send('action', payload);
}

function closeMenu() {
  if (!openMenu) return;
  const id = openMenu; openMenu = null;
  renderPanel(true);
  $(I18n.html`[data-menu="${id}"]`)?.focus();
}
const playerName = (id) => S.standings.find((x) => x.id === id)?.name || I18n.t('Spieler');

document.addEventListener('click', async (e) => {
  // Klick außerhalb schließt das ⋯-Menü
  if (openMenu && !e.target.closest('.menu, [data-menu]')) closeMenu();
  const t = e.target.closest('button, [data-pref], [data-set]');
  if (!t) return;
  if (t.dataset.help !== undefined) pokerHelp();
  else if (t.dataset.act) doAction(t.dataset.act);
  else if (t.dataset.pre) send('preAction', { type: S.you?.pre === t.dataset.pre ? null : t.dataset.pre });
  else if (t.dataset.logcat) {
    const k = t.dataset.logcat;
    if (hist.cats.has(k)) hist.cats.delete(k); else hist.cats.add(k);
    t.setAttribute('aria-pressed', String(hist.cats.has(k)));
    renderLog();
  }
  else if (t.dataset.nudge) send('nudge', { id: t.dataset.nudge }).then((r) => r?.ok && toast(I18n.t('Angestupst 👉')));
  else if (t.dataset.gift) giftDialog(t.dataset.gift);
  else if (t.dataset.giftAnswer) { seenGifts.add(t.dataset.giftAnswer); send('giftAnswer', { id: t.dataset.giftAnswer, accept: t.dataset.accept === '1' }); }
  else if (t.dataset.newGame !== undefined) {
    if (await ask({ title: I18n.t('Neues Spiel starten?'), text: 'Alle bekommen wieder die Startchips, die Blinds gehen auf Level 1 und Nachkäufe auf 0. Der jetzige Abendstand wird im Verlauf gespeichert.', ok: I18n.t('Neues Spiel'), danger: true })) {
      send('newGame').then((r) => r?.ok && toast('Neues Spiel – viel Glück!'));
    }
  }
  else if (t.dataset.end) endGameClick(t.dataset.end);
  else if (t.dataset.sit !== undefined) send('sit', { seat: Number(t.dataset.sit) });
  else if (t.dataset.preset) {
    const L = S.legal; const h = S.hand;
    if (t.dataset.preset === 'all') raiseValue = L.maxTo;
    else {
      const pot = h.pots.reduce((a, b) => a + b, 0) + h.bets + L.toCall;
      raiseValue = Math.round(h.currentBet + pot * Number(t.dataset.preset));
    }
    renderDock();
  } else if (t.dataset.react) socket.emit('react', { text: t.dataset.react });
  else if (t.dataset.panelOpen) { openPanel(t.dataset.panelOpen); $('#panel-body tr.now')?.scrollIntoView({ block: 'center' }); }
  else if (t.dataset.sebToggle !== undefined) { sebSmall = !sebSmall; renderSeb(); }
  else if (t.dataset.hostTab) { hostTab = t.dataset.hostTab; openMenu = null; renderPanel(true); $(I18n.html`[data-host-tab="${hostTab}"]`)?.focus(); }
  else if (t.dataset.menu) {
    openMenu = openMenu === t.dataset.menu ? null : t.dataset.menu;
    renderPanel(true);
    if (openMenu) $('.menu button')?.focus(); else $(I18n.html`[data-menu="${t.dataset.menu}"]`)?.focus();
  } else if (t.dataset.kickOpen) {
    const id = t.dataset.kickOpen; openMenu = null; renderPanel(true);
    const name = playerName(id);
    if (await ask({ title: I18n.html`${name} entfernen?`, text: I18n.html`${name} verliert Platz und Chips an diesem Tisch. Läuft gerade eine Hand, foldet ${name} zuerst.`, ok: I18n.t('Entfernen'), danger: true })) send('kick', { id });
  } else if (t.dataset.adjustOpen) {
    const id = t.dataset.adjustOpen; openMenu = null; renderPanel(true);
    const p = S.standings.find((x) => x.id === id);
    const v = await ask({ title: 'Chips korrigieren', text: I18n.html`Neuer Chipstand für ${p?.name || I18n.t('Spieler')}. Die Korrektur steht im Verlauf.`, ok: I18n.t('Speichern'), input: { type: 'number', value: p?.chips ?? 0, label: 'Neuer Chipstand' } });
    if (v !== false) send('adjust', { id, amount: v }).then((r) => r?.ok && toast('Chips korrigiert'));
  } else if (t.dataset.hostOpen) {
    const id = t.dataset.hostOpen; openMenu = null; renderPanel(true);
    const name = playerName(id);
    if (await ask({ title: I18n.t('Host weitergeben?'), text: I18n.html`${name} wird Host und kann das Spiel steuern. Du bist danach normaler Spieler.`, ok: 'Weitergeben' })) send('makeHost', { id });
  } else if (t.dataset.do) {
    const map = { start: 'start', nextHand: 'nextHand', pause: 'pause', freeze: 'freeze', show: 'show', rebuy: 'rebuy', stand: 'stand' };
    if (t.dataset.do === 'sitout') send('sitOut', { value: true });
    else if (t.dataset.do === 'rejoin') {
      // Am liebsten wieder auf den alten Platz, sonst auf den ersten freien
      const last = S.you?.lastSeat;
      const seat = last !== null && last !== undefined && !S.seats[last] ? last : S.seats.findIndex((x) => !x);
      if (seat >= 0) send('sit', { seat });
    }
    else if (t.dataset.do === 'back') send('sitOut', { value: false });
    else send(map[t.dataset.do]);
  }
});

$('#panel-grip').addEventListener('click', () => openPanel(null));
document.addEventListener('toggle', (e) => {
  const g = e.target.closest?.('details[data-group]');
  if (g) { if (g.open) openGroups.add(g.dataset.group); else openGroups.delete(g.dataset.group); }
  const lg = e.target.matches?.('details[data-hand]') ? e.target : null;
  if (lg) {
    const h = Number(lg.dataset.hand);
    hist.toggled.set(h, lg.open);
    const ul = lg.querySelector('ul');
    if (lg.open && !ul.children.length) ul.innerHTML = logItems(logGroups().get(h) || []);
  }
}, true);

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'log-search') { hist.q = t.value.trim().toLowerCase(); renderLog(); return; }
  if (t.id === 'raise-range' || t.id === 'raise-num') {
    raiseValue = Number(t.value) || 0;
    const other = t.id === 'raise-range' ? $('#raise-num') : $('#raise-range');
    if (other) other.value = raiseValue;
    const L = S.legal; const btn = $('#raise-btn');
    if (btn && L) {
      const v = Math.min(L.maxTo, Math.max(L.minTo, raiseValue));
      btn.innerHTML = raiseInner(v);
    }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'raise-num') { const L = S.legal; raiseValue = Math.min(L.maxTo, Math.max(L.minTo, Number(t.value) || L.minTo)); renderDock(); }
  if (t.dataset.pref) {
    prefs[t.dataset.pref] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.pref === 'notify' && t.checked) askNotify();
    if (t.dataset.pref === 'intros' && t.checked) resetIntros();
    savePrefs();
  }
  if (t.dataset.blind) {
    const s = S.settings;
    const k = t.dataset.blind;
    const payload = { [k]: k === 'blindEvery' ? Number(t.value) : t.value };
    // Modus oder Vorlage gewechselt: passenden Abstand gleich mitschicken
    const mode = k === 'blindMode' ? t.value : s.blindMode;
    const preset = k === 'blindPreset' ? t.value : s.blindPreset;
    if (k !== 'blindEvery' && mode !== 'off') payload.blindEvery = BLIND_DEFAULTS[preset][mode];
    send('settings', payload).then((r) => r?.ok && toast('Gespeichert – gilt ab der nächsten Hand'));
  }
  if (t.dataset.set) {
    const v = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' && t.dataset.set === 'turnTime' ? Number(t.value) : t.value;
    const fun = ['nudge', 'nudgeLines', 'foldLines', 'gifts', 'oddsMode'].includes(t.dataset.set);
    send('settings', { [t.dataset.set]: v }).then((r) => r?.ok && toast(fun ? 'Gespeichert' : 'Gespeichert – gilt ab der nächsten Hand'));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#dlg').open) {
    if (openMenu) { closeMenu(); return; }
    if (panel) { openPanel(null); return; }
  }
  if ($('#dlg').open) return;
  if (!prefs.keys || !S?.legal || e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === 'f') doAction('fold');
  else if (k === 'c') doAction(S.legal.canCheck ? 'check' : 'call');
  else if (k === 'r' && S.legal.canRaise) doAction('raise');
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) blinkTitle(false); });
// Erlaubnis für Benachrichtigungen erst, wenn jemand den Schalter umlegt
async function askNotify() {
  if (!('Notification' in window)) { prefs.notify = false; savePrefs(); toast('Dein Browser kann keine Benachrichtigungen', true); return; }
  let p = Notification.permission;
  if (p === 'default') { try { p = await Notification.requestPermission(); } catch { p = 'denied'; } }
  if (p !== 'granted') { prefs.notify = false; savePrefs(); toast('Benachrichtigungen sind im Browser blockiert', true); }
}

// ---------- Controller (Gamepad-API) – nur aktiv, wenn einer erkannt wird ----------
let padOn = false;
const padPrev = {};
window.addEventListener('gamepadconnected', () => {
  if (!padOn) { padOn = true; requestAnimationFrame(pollPad); toast('Controller erkannt – Hilfe unter „Ich“'); }
  if (panel === 'me') renderPanel(true);
});
window.addEventListener('gamepaddisconnected', () => {
  padOn = [...(navigator.getGamepads?.() || [])].some(Boolean);
  if (panel === 'me') renderPanel(true);
});
function pollPad() {
  if (!padOn) return;
  for (const gp of navigator.getGamepads?.() || []) {
    if (!gp) continue;
    gp.buttons.forEach((b, i) => {
      const k = gp.index + ':' + i;
      if (b.pressed && !padPrev[k]) padPress(i);
      padPrev[k] = b.pressed;
    });
  }
  requestAnimationFrame(pollPad);
}
// Standard-Belegung: 0 = A, 1 = B, 2 = X, 4 = LB, 5 = RB, 9 = Start
function padPress(i) {
  const dlg = $('#dlg');
  if (dlg.open) { if (i === 0) $('#dlg-ok').click(); else if (i === 1) dlg.close(''); return; }
  if (i === 9) { openPanel('me'); return; }
  const L = S?.legal; if (!L) return;
  if (i === 0) doAction(L.canCheck ? 'check' : 'call');
  else if (i === 1) doAction('fold');
  else if (i === 2 && L.canRaise) doAction('raise');
  else if ((i === 4 || i === 5) && L.canRaise) {
    const step = S.settings.bigBlind;
    raiseValue = Math.min(L.maxTo, Math.max(L.minTo, (raiseValue ?? L.minTo) + (i === 5 ? step : -step)));
    renderDock();
  }
}
window.addEventListener('resize', () => render());

$('#copy-link').addEventListener('click', async () => {
  const link = I18n.html`${location.origin}/?t=${S?.code || ''}`;
  try { await navigator.clipboard.writeText(link); toast(I18n.t('Link kopiert – schick ihn in eure Gruppe')); }
  catch { ask({ title: I18n.t('Einladungslink'), text: I18n.t('Kopieren hat nicht geklappt. Markier den Link und kopier ihn selbst.'), ok: I18n.t('Fertig'), input: { value: link, readOnly: true, noCancel: true, label: I18n.t('Einladungslink') } }); }
});

// ---------- Anmelden bei core.js ----------
registerGame('poker', {
  show() {
    $('#game').hidden = false; render();
    // Erste Schritte beim ersten Poker-Abend in diesem Browser
    setTimeout(() => { if (!$('#dlg').open) showIntro('poker', S?.game === 'omaha' ? 'Omaha' : "Texas Hold'em", [
      [I18n.t('Am Tisch'), 'Tipp auf einen freien Platz, um dich hinzusetzen. Der Host startet die Hand.'],
      [I18n.t('Am Zug'), 'Unten stehen deine Karten und was du tun kannst: Fold, Check oder Call, Raise. Die Uhr zeigt, wie lange du noch hast.'],
      [I18n.t('Hilfe'), '„Hände“ unten links zeigt alle Pokerhände von Royal Flush bis High Card, „?“ die Kurzregeln. Deine Einstellungen findest du unter „Ich“.'],
    ]); }, 400);
  },
  onState(st) {
    prevS = S; S = st;
    animateChips(prevS, S); syncHistory(); render(); cues(prevS, S);
  },
  onPrefs() { applyPrefs(); render(); if (panel) { $('#panel-title').textContent = I18n.t(PANEL_TITLES[panel]); renderPanel(true); } },
});
