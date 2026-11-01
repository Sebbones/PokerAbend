// Ein Pokertisch: Einstellungen, Timer, Hände. Spieler, Host und Verlauf kommen aus der gemeinsamen Grundlage.
// Die Regeln selbst stecken in engine/table.js – hier geht es um Menschen und Zeit.
import { randomBytes } from 'node:crypto';
import { Table, SEATS } from './engine/table.js';
import { bestHand, omahaBest, compareScores, outlook, equity } from './engine/cards.js';
import { BLIND_MODES, BLIND_PRESETS, blindLevels, levelIndex, untilNext, parseBlindList } from './blinds.js';
import { cleanText } from '../../server/security.js';
import { BaseRoom, AVATARS, HISTORY_ROUNDS } from '../../server/base-room.js';
import { maintenance } from '../../server/maintenance.js';
import { isSebastian } from './sebastian.js';

export const DEFAULT_SETTINGS = {
  smallBlind: 50,
  bigBlind: 100,
  startStack: 10000,
  rebuy: 'unlimited', // 'off' | 'unlimited' | '1' | '2' | '3' ...
  turnTime: 30,       // Sekunden, 0 = aus
  nextDelay: 10,      // Sekunden bis zur nächsten Hand (Zeit für den Gewinnmoment)
  autoNext: true,
  handStrength: true, // Spieler dürfen sich ihre Hand anzeigen lassen
  maxPlayers: 9,
  variant: 'holdem',  // 'holdem' | 'omaha' (steht beim Anlegen des Tisches fest)
  potLimit: false,    // Erhöhen höchstens um die Potgröße (Omaha: an)
  oddsMode: 'own',    // Gewinnchancen: 'off' | 'own' (eigene, während der Hand) | 'after' (nach dem Showdown, nur gezeigte Hände)
  blindMode: 'off',   // Blinds erhöhen: 'off' | 'minutes' | 'hands'
  blindEvery: 12,     // alle X Minuten bzw. Hände
  blindPreset: 'normal', // fast | normal | long | custom
  blindList: [],      // eigene Liste, Zeilen wie „50/100“
  gifts: true,        // Chips verschenken (mit Zustimmung) erlaubt
  nudge: true,        // Anstupsen, wenn jemand trödelt
  nudgeLines: [
    'Ey, du bist dran!', 'Wir werden hier alt …', 'Hallo? Erde an Spieler!', 'Die Karten werden vom Anschauen nicht besser.',
    'Kurz eingeschlafen?', 'Tick, tack …', 'Der Kaffee wird kalt.', 'Heute noch?',
  ],
  // Sprüche, wenn jemand folden will, obwohl er kostenlos checken könnte
  foldLines: [
    'Folden statt checken? Mutig.', 'Checken kostet nichts. Wirklich gar nichts.', 'Du weißt schon, dass Checken gratis ist?',
    'Aufgeben, ohne dass es was kostet?', 'Die Chips bleiben beim Checken trotzdem bei dir.', 'Ernsthaft? Ohne Einsatz raus?',
  ],
};
export const MAX_LINES = 30;      // Sprüche pro Liste
export const MAX_LINE_LEN = 80;   // Zeichen pro Spruch
const NUDGE_AFTER = 10000;        // so lange darf man trödeln, bevor automatisch angestupst wird
const NUDGE_GAP = 10000;          // pro Spieler höchstens einmal so oft anstupsen bzw. angestupst werden
export const PRE_ACTIONS = ['checkfold', 'check', 'callany', 'fold'];
const GIFT_TTL = 60000;           // so lange gilt ein Geschenk-Angebot
export const HISTORY_HANDS = HISTORY_ROUNDS; // eine Runde ist beim Poker eine Hand
const OFFLINE_TURN = 20; // Sekunden für Spieler ohne Verbindung
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
const fmtCard = (c) => (c[0] === 'T' ? '10' : c[0]) + SUIT[c[1]];
export const fmt = (n) => n.toLocaleString('de-DE');

export function clampSettings(input, base = DEFAULT_SETTINGS) {
  const s = { ...base };
  const int = (v, lo, hi, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  if (!input) return s;
  if ('bigBlind' in input) s.bigBlind = int(input.bigBlind, 2, 1e7, s.bigBlind);
  if ('smallBlind' in input) s.smallBlind = int(input.smallBlind, 1, s.bigBlind, s.smallBlind);
  s.smallBlind = Math.min(s.smallBlind, s.bigBlind);
  if ('startStack' in input) s.startStack = int(input.startStack, s.bigBlind, 1e9, s.startStack);
  if ('rebuy' in input) s.rebuy = ['off', 'unlimited'].includes(input.rebuy) ? input.rebuy : String(int(input.rebuy, 1, 99, 3));
  if ('turnTime' in input) s.turnTime = int(input.turnTime, 0, 300, s.turnTime);
  if ('nextDelay' in input) s.nextDelay = int(input.nextDelay, 2, 60, s.nextDelay);
  if ('autoNext' in input) s.autoNext = !!input.autoNext;
  if ('handStrength' in input) s.handStrength = !!input.handStrength;
  if ('maxPlayers' in input) s.maxPlayers = int(input.maxPlayers, 2, SEATS, s.maxPlayers);
  if ('variant' in input && base === DEFAULT_SETTINGS) s.variant = ['holdem', 'omaha'].includes(input.variant) ? input.variant : s.variant;
  if ('potLimit' in input) s.potLimit = !!input.potLimit;
  if ('oddsMode' in input) s.oddsMode = ['off', 'own', 'after'].includes(input.oddsMode) ? input.oddsMode : s.oddsMode;
  if ('blindMode' in input) s.blindMode = BLIND_MODES.includes(input.blindMode) ? input.blindMode : s.blindMode;
  if ('blindEvery' in input) s.blindEvery = int(input.blindEvery, 1, 240, s.blindEvery);
  if ('blindPreset' in input) s.blindPreset = [...Object.keys(BLIND_PRESETS), 'custom'].includes(input.blindPreset) ? input.blindPreset : s.blindPreset;
  if ('blindList' in input) s.blindList = parseBlindList(input.blindList).map((l) => `${l.sb}/${l.bb}`);
  if ('gifts' in input) s.gifts = !!input.gifts;
  if ('nudge' in input) s.nudge = !!input.nudge;
  if ('nudgeLines' in input) s.nudgeLines = cleanLines(input.nudgeLines, DEFAULT_SETTINGS.nudgeLines);
  if ('foldLines' in input) s.foldLines = cleanLines(input.foldLines, DEFAULT_SETTINGS.foldLines);
  return s;
}

// Liste aus dem Host-Menü: ein Spruch pro Zeile. Leer = wieder die Standardsprüche.
export function cleanLines(input, fallback) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/\r?\n/);
  const lines = raw.slice(0, 200).map((l) => cleanText(l, MAX_LINE_LEN)).filter(Boolean).slice(0, MAX_LINES);
  return lines.length ? lines : [...fallback];
}

export class Room extends BaseRoom {
  constructor(code, settings, onChange) {
    super(code, onChange);
    this.settings = clampSettings(settings);
    this.table = new Table({ smallBlind: this.settings.smallBlind, bigBlind: this.settings.bigBlind, holeCards: this.settings.variant === 'omaha' ? 4 : 2, potLimit: this.settings.potLimit });
    this.started = false;
    this.paused = false;
    this.frozen = null; // Host hat sofort angehalten: { turnLeft, turnKey, nextLeft } in ms
    this.stats = { hands: 0, biggestPot: null, bestHand: null };
    this.turnTimer = null;
    this.turnKey = null;
    this.deadline = null;
    this.nextTimer = null;
    this.nextAt = null;
    this.seq = 0;
    this.nudgeAfter = NUDGE_AFTER; // Tests setzen das kürzer
    this.nudgeTimer = null;
    this.nudgeKey = null;
    this.blind = { level: 0, elapsed: 0, hands: 0, since: null }; // steigende Blinds: Level, gespielte Zeit (ms) und Hände
    this.gifts = new Map(); // offene Chip-Geschenke
    this.giftTtl = GIFT_TTL;
  }

  // ---------- Haken für die gemeinsame Grundlage (server/base-room.js) ----------
  get round() { return this.table.handNo; }
  get busy() { return this.handRunning; }
  // Liste der offenen Tische (Startseite): wer sitzt, Hand-Nummer – keine Karten, keine Chips
  lobbyInfo() {
    const seats = this.table.seats.filter(Boolean).map((s) => { const p = this.players.get(s.id); return { name: s.name, avatar: p?.avatar, bot: !!p?.bot }; });
    const watchers = [...this.players.values()].filter((p) => !p.kicked && p.seat === null && !p.bot).length;
    const status = this.gamePaused ? 'Spiel pausiert' : this.handRunning ? `Hand #${this.table.handNo}` : this.table.handNo ? `Pause nach Hand #${this.table.handNo}` : 'wartet auf Start';
    return { seats, max: this.settings.maxPlayers, watchers, status };
  }
  playerFields() {
    return { seat: null, bank: this.settings.startStack, buyIn: this.settings.startStack, rebuys: 0, missed: 0, leaveAfterHand: false, seen: [] };
  }
  // Beim Entfernen: in der laufenden Hand erst folden und danach verschwinden (Chips im Pot bleiben im Pot)
  leaveGame(p) {
    for (const g of [...this.gifts.values()]) if (g.from === p.id || g.to === p.id) this.dropGift(g);
    if (p.seat === null) return false;
    if (this.handRunning && this.table.hand.players[p.seat]) { this.table.forceFold(p.seat); this.flushEvents(); }
    if (this.handRunning && this.table.hand.players[p.seat]) { p.leaveAfterHand = true; return true; }
    this.table.leave(p.seat);
    return false;
  }
  dispose() {
    super.dispose();
    this.clock.clearTimeout(this.turnTimer); this.clock.clearTimeout(this.nextTimer); this.clock.clearTimeout(this.nudgeTimer);
    for (const g of this.gifts.values()) this.clock.clearTimeout(g.timer);
  }

  // ---------- Spieler ----------
  seatOf(id) { return this.players.get(id)?.seat ?? null; }
  playerAt(seat) { const s = this.table.seats[seat]; return s ? this.players.get(s.id) : null; }
  get handRunning() { return !!(this.table.hand && !this.table.hand.done); }

  sit(id, seat) {
    const p = this.players.get(id);
    if (p.seat !== null) throw new Error('Du sitzt schon');
    if (this.sitLocked(p)) throw new Error('Du setzt noch eine Hand aus. Sobald die nächste Hand läuft, kannst du wieder einsteigen.');
    const seated = this.table.seats.filter(Boolean).length;
    if (seated >= this.settings.maxPlayers) throw new Error('Der Tisch ist voll');
    this.table.sit(seat, { id, name: p.name, stack: p.bank });
    p.bank = 0; p.seat = seat; p.leaveAfterHand = false;
    this.say(`${p.name} setzt sich`);
    this.maybeStart();
  }

  // Wer in der laufenden Hand sitzt, spielt sie zu Ende und steht danach auf. Nochmal drücken = doch sitzen bleiben.
  stand(id) {
    const p = this.players.get(id);
    if (p.seat === null || p.kicked) return;
    if (this.handRunning && this.table.hand.players[p.seat]) {
      p.leaveAfterHand = !p.leaveAfterHand;
      this.say(p.leaveAfterHand ? `${p.name} steht nach der Hand auf` : `${p.name} bleibt doch sitzen`);
      return;
    }
    this.doStand(p);
  }

  // Aufstehen per Knopf: danach eine Hand aussetzen (nicht bei Pause oder Verbindungsabbruch – da steht niemand auf)
  doStand(p) {
    const seat = p.seat;
    const s = this.table.leave(seat);
    p.bank = s.stack; p.seat = null; p.leaveAfterHand = false; p.sebPause = false;
    p.lastSeat = seat;
    p.sitLock = this.table.handNo + 1; // diese Hand läuft ohne ihn
    this.say(`${p.name} steht auf`);
  }

  // Gesperrt, bis die ausgesetzte Hand begonnen hat. Wer sich während dieser Hand setzt, bekommt erst danach Karten.
  // Ohne genug andere Spieler gäbe es diese Hand nie – dann gilt keine Sperre.
  sitLocked(p) {
    if (!p.sitLock) return false;
    if (this.table.handNo >= p.sitLock || this.table.eligibleSeats().length < 2) { p.sitLock = 0; return false; }
    return true;
  }

  setSittingOut(id, value) {
    const p = this.players.get(id);
    if (p.seat === null) throw new Error('Du sitzt nicht am Tisch');
    this.table.seats[p.seat].sittingOut = value;
    p.sebPause = value && isSebastian(p.name); // Easter Egg, nur bei Pause per Knopf
    p.missed = 0;
    this.say(value ? `${p.name} macht Pause` : `${p.name} ist wieder dabei`);
    if (!value) this.maybeStart();
  }

  rebuy(id) {
    const p = this.players.get(id);
    if (p.seat === null) throw new Error('Setz dich zuerst an den Tisch');
    const s = this.table.seats[p.seat];
    if (s.stack > 0) throw new Error('Nachkaufen geht erst, wenn du keine Chips mehr hast');
    if (this.handRunning && this.table.hand.players[p.seat] && !this.table.hand.players[p.seat].folded) throw new Error('Warte bis die Hand vorbei ist');
    const r = this.settings.rebuy;
    if (r === 'off') throw new Error('Nachkaufen ist an diesem Tisch aus');
    if (r !== 'unlimited' && p.rebuys >= Number(r)) throw new Error(`Maximal ${r}× nachkaufen`);
    s.stack = this.settings.startStack;
    s.sittingOut = false;
    p.sebPause = false;
    p.rebuys++; p.buyIn += this.settings.startStack;
    this.say(`${p.name} kauft ${fmt(this.settings.startStack)} Chips nach`);
    this.maybeStart();
  }

  // ---------- Host ----------
  updateSettings(id, input) {
    this.requireHost(id);
    this.blindTick();
    const oldMode = this.settings.blindMode;
    this.settings = clampSettings(input, this.settings);
    this.table.potLimit = this.settings.potLimit;
    if (this.settings.blindMode !== oldMode) this.resetBlinds();
    this.blindTick();
    if (!this.handRunning) this.applyBlinds();
    const onlyFun = Object.keys(input || {}).every((k) => ['nudge', 'nudgeLines', 'foldLines', 'gifts', 'oddsMode'].includes(k));
    this.say(onlyFun ? 'Sprüche und Anstupsen geändert' : 'Tischregeln geändert' + (this.handRunning ? ' – gilt ab der nächsten Hand' : ''));
  }

  // Blinds für die nächste Hand. Mit steigenden Blinds greift ein neues Level immer erst hier, nie mitten in der Hand.
  applyBlinds() {
    if (this.settings.blindMode === 'off') {
      this.table.smallBlind = this.settings.smallBlind;
      this.table.bigBlind = this.settings.bigBlind;
      return;
    }
    this.blindTick();
    const { levels, args } = this.blindInfo();
    const i = levelIndex(args);
    const l = levels[i];
    if (i !== this.blind.level) {
      this.say(`Blinds ${i > this.blind.level ? 'steigen' : 'jetzt'}: Level ${i + 1} – ${fmt(l.sb)}/${fmt(l.bb)}`, 'warn');
      this.blind.level = i;
    }
    this.table.smallBlind = l.sb;
    this.table.bigBlind = l.bb;
  }

  // ---------- Steigende Blinds ----------
  // Die Uhr läuft nur, solange gespielt wird: nach dem Start, nicht angehalten, nicht in der Pause zwischen zwei Händen
  blindRunning() {
    return this.settings.blindMode === 'minutes' && this.started && !this.frozen && !(this.paused && !this.handRunning);
  }
  // Nach jeder Zustandsänderung aufrufen: rechnet die gelaufene Zeit an und startet bzw. stoppt die Uhr
  blindTick(now = this.clock.now()) {
    const b = this.blind;
    if (b.since !== null) b.elapsed += now - b.since;
    b.since = this.blindRunning() ? now : null;
  }
  blindInfo() {
    const s = this.settings;
    const levels = blindLevels(s);
    const elapsedMs = this.blind.elapsed + (this.blind.since !== null ? this.clock.now() - this.blind.since : 0);
    return { levels, args: { mode: s.blindMode, every: s.blindEvery, elapsedMs, hands: this.blind.hands, count: levels.length } };
  }
  resetBlinds() {
    this.blind = { level: 0, elapsed: 0, hands: 0, since: null };
    this.blindTick();
  }

  // Neues Spiel: alle wieder auf Startchips, Blinds auf Level 1, Nachkäufe auf 0 – Spieler und Plätze bleiben
  newGame(id) {
    this.requireHost(id);
    if (this.handRunning) throw new Error('Ein neues Spiel geht nur zwischen zwei Händen');
    const list = this.standingsList(null)
      .map((p) => `${p.name} ${p.net > 0 ? '+' : p.net < 0 ? '−' : '±'}${fmt(Math.abs(p.net))}${p.rebuys ? ` (${p.rebuys}× nachgekauft)` : ''}`);
    this.say(`Abendstand vor dem neuen Spiel nach ${this.stats.hands} Händen: ${list.join(', ') || 'niemand da'}`, 'summary');
    this.clock.clearTimeout(this.nextTimer); this.nextTimer = null; this.nextAt = null;
    this.clock.clearTimeout(this.turnTimer); this.turnTimer = null; this.deadline = null;
    for (const g of [...this.gifts.values()]) this.dropGift(g);
    const start = this.settings.startStack;
    for (const p of this.players.values()) {
      this.setChips(p, start);
      p.buyIn = start; p.rebuys = 0;
    }
    this.stats = { hands: 0, biggestPot: null, bestHand: null };
    this.started = false; this.paused = false; this.frozen = null;
    this.table.hand = null;
    this.resetBlinds();
    this.applyBlinds();
    this.say(`Neues Spiel – alle haben wieder ${fmt(start)} Chips`, 'warn');
  }

  // ---------- Chips verschenken: nur Spielgeld, nur mit Zustimmung, nur zwischen zwei Händen ----------
  chipsOf(p) { return p.seat !== null ? this.table.seats[p.seat].stack : p.bank; }
  setChips(p, n) { if (p.seat !== null) this.table.seats[p.seat].stack = n; else p.bank = n; }

  offerGift(fromId, toId, amount, message) {
    if (!this.settings.gifts) throw new Error('Chips verschenken ist an diesem Tisch aus');
    if (this.handRunning) throw new Error('Chips verschenken geht nur zwischen zwei Händen');
    const from = this.players.get(fromId);
    const to = this.players.get(toId);
    if (!to || to.kicked || to.id === from.id) throw new Error('Diesen Spieler gibt es nicht');
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n < 1) throw new Error('Bitte einen Betrag über 0 eingeben');
    if (n > this.chipsOf(from)) throw new Error('So viele Chips hast du nicht');
    if ([...this.gifts.values()].some((g) => g.from === from.id)) throw new Error('Du hast schon ein offenes Angebot – warte auf die Antwort');
    const g = { id: randomBytes(6).toString('hex'), from: from.id, to: to.id, amount: n, message: cleanText(message, 100), expires: this.clock.now() + this.giftTtl };
    g.timer = this.clock.setTimeout(() => {
      if (this.gifts.get(g.id) !== g) return;
      this.dropGift(g);
      this.say(`Das Geschenk von ${from.name} an ${to.name} ist abgelaufen`, 'react');
      this.onChange('state');
    }, this.giftTtl);
    g.timer.unref?.();
    this.gifts.set(g.id, g);
    this.say(`${from.name} möchte ${to.name} ${fmt(n)} Chips schenken`, 'react');
    return g;
  }

  answerGift(toId, giftId, accept) {
    const g = this.gifts.get(String(giftId));
    if (!g || g.to !== toId || this.clock.now() > g.expires) throw new Error('Dieses Angebot gibt es nicht mehr');
    const from = this.players.get(g.from);
    const to = this.players.get(g.to);
    if (!accept) {
      this.dropGift(g);
      this.say(`${to.name} lehnt das Geschenk von ${from.name} ab`, 'react');
      return false;
    }
    if (this.handRunning) throw new Error('Annehmen geht erst, wenn die Hand vorbei ist');
    this.dropGift(g);
    if (this.chipsOf(from) < g.amount) throw new Error(`${from.name} hat nicht mehr genug Chips`);
    this.setChips(from, this.chipsOf(from) - g.amount);
    this.setChips(to, this.chipsOf(to) + g.amount);
    // Zählt wie ein Einkauf: am Plus/Minus des Abends ändert ein Geschenk nichts
    from.buyIn -= g.amount;
    to.buyIn += g.amount;
    this.say(`${from.name} schenkt ${to.name} ${fmt(g.amount)} Chips${g.message ? `: „${g.message}“` : ''}`, 'react');
    if (to.seat !== null) this.maybeStart();
    return true;
  }

  dropGift(g) { this.clock.clearTimeout(g.timer); this.gifts.delete(g.id); }

  adjustStack(id, targetId, amount) {
    this.requireHost(id);
    if (this.handRunning) throw new Error('Chips korrigieren geht nur zwischen zwei Händen');
    const p = this.players.get(targetId);
    if (!p) throw new Error('Spieler nicht gefunden');
    const n = Math.max(0, Math.floor(Number(amount)));
    if (!Number.isFinite(n)) throw new Error('Ungültiger Betrag');
    const old = p.seat !== null ? this.table.seats[p.seat].stack : p.bank;
    if (p.seat !== null) this.table.seats[p.seat].stack = n; else p.bank = n;
    this.say(`Host-Korrektur: ${p.name} ${fmt(old)} → ${fmt(n)}`, 'warn');
  }

  // Host bricht die laufende Hand ab: Einsätze zurück, danach wartet der Tisch auf „Start“
  abortRound(id) {
    this.requireHost(id);
    if (!this.handRunning) throw new Error('Gerade läuft keine Hand');
    this.table.abort();
    this.flushEvents();
    this.clock.clearTimeout(this.turnTimer); this.turnTimer = null; this.turnKey = null; this.deadline = null;
    this.clock.clearTimeout(this.nudgeTimer); this.nudgeTimer = null; this.nudgeKey = null;
    this.clock.clearTimeout(this.nextTimer); this.nextTimer = null; this.nextAt = null;
    for (const p of this.players.values()) { p.pre = null; p.preNote = null; }
    this.started = false; this.frozen = null;
    this.say('Runde vom Host abgebrochen', 'warn');
  }

  start(id) {
    this.requireHost(id);
    if (this.handRunning) return;
    if (this.table.eligibleSeats().length < 2) throw new Error('Es müssen mindestens 2 Spieler mit Chips sitzen');
    this.paused = false;
    this.say('Das Spiel läuft');
    this.startNext(true);
  }

  togglePause(id) {
    this.requireHost(id);
    this.paused = !this.paused;
    this.say(this.paused ? 'Pause nach dieser Hand' : 'Weiter geht’s');
    this.blindTick();
    if (!this.paused) this.maybeStart();
  }

  // Sofort-Pause für alle: Timer bleiben stehen, niemand kann handeln, bis der Host weitermacht
  toggleFreeze(id) { this.setGamePaused(id, !this.gamePaused); }

  onGamePause(paused) {
    this.frozen = paused ? {
      turnLeft: this.deadline ? Math.max(0, this.deadline - this.clock.now()) : null,
      turnKey: this.turnKey,
      nextLeft: this.nextAt ? Math.max(0, this.nextAt - this.clock.now()) : null,
    } : null;
    this.blindTick();
  }

  nextHand(id) {
    this.requireHost(id);
    if (this.frozen) throw new Error('Das Spiel ist angehalten');
    if (this.handRunning) throw new Error('Die Hand läuft noch');
    this.startNext(true);
  }

  // ---------- Spielablauf ----------
  maybeStart() {
    if (!this.started || this.paused || this.frozen || this.handRunning || this.nextTimer) return this.handRunning;
    if (this.table.hand?.done && !this.settings.autoNext) return false;
    return this.startNext();
  }

  startNext(force = false) {
    this.clock.clearTimeout(this.nextTimer); this.nextTimer = null; this.nextAt = null;
    if (this.handRunning || (!this.started && !force) || (this.paused && !force)) return false;
    if (maintenance.active) { // Update angekündigt: keine neue Hand, auch nicht per Timer
      if (!this.updateNoted) { this.updateNoted = true; this.say('Update angekündigt – die nächste Hand startet erst nach dem Neustart'); }
      return false;
    }
    this.updateNoted = false;
    if (force) this.started = true;
    this.cleanupAfterHand();
    this.applyBlinds();
    if (this.table.eligibleSeats().length < 2) return false;
    // Namen bleiben für die Wertung erhalten, auch wenn ein Spieler beim letzten Fold entfernt wird.
    this.handNames = Object.fromEntries(this.table.eligibleSeats().map((seat) => [seat, this.table.seats[seat].name]));
    this.handIds = Object.fromEntries(this.table.eligibleSeats().map((seat) => [seat, this.table.seats[seat].id]));
    this.table.startHand();
    this.flushEvents();
    this.afterChange();
    return true;
  }

  cleanupAfterHand() {
    for (const p of [...this.players.values()]) {
      if (p.leaveAfterHand && p.seat !== null) {
        if (p.kicked) { this.table.leave(p.seat); this.players.delete(p.id); }
        else this.doStand(p);
      }
    }
  }

  act(id, action) {
    const p = this.players.get(id);
    if (p.seat === null) throw new Error('Du sitzt nicht am Tisch');
    if (this.frozen) throw new Error('Das Spiel ist gerade angehalten');
    if (action.id) {
      if (p.seen.includes(action.id)) return false; // doppelt gesendet
      p.seen.push(action.id); if (p.seen.length > 50) p.seen.shift();
    }
    this.table.act(p.seat, action);
    p.missed = 0; p.preNote = null;
    this.flushEvents();
    this.afterChange();
    return true;
  }

  show(id) {
    const p = this.players.get(id);
    if (p.seat === null) throw new Error('Du sitzt nicht am Tisch');
    this.table.show(p.seat);
    this.say(`${p.name} zeigt ${this.table.hand.players[p.seat].cards.map(fmtCard).join(' ')}`, 'info', 'cards');
  }

  // ---------- Vorab-Aktionen (gelten nur für die laufende Hand) ----------
  setPreAction(id, type) {
    const p = this.players.get(id);
    p.preNote = null;
    if (type === null || type === undefined || type === '') { p.pre = null; return; }
    if (!PRE_ACTIONS.includes(type)) throw new Error('Unbekannte Vorab-Aktion');
    const h = this.table.hand;
    const hp = p.seat !== null && this.handRunning ? h.players[p.seat] : null;
    if (!hp || hp.folded || hp.allIn) throw new Error('Vorab-Aktionen gehen nur, solange du in der Hand bist');
    if (type === 'check' && h.currentBet > hp.bet) throw new Error('Check geht gerade nicht – es wurde gesetzt');
    p.pre = { type, hand: h.no };
  }

  // Auf dem Server ausgeführt, damit es auch bei kurzem Verbindungsabbruch greift
  runPreActions() {
    const t = this.table;
    for (let guard = 0; guard < 100; guard++) {
      const h = t.hand;
      if (!h || h.done || this.frozen) return;
      for (const p of this.players.values()) {
        if (!p.pre) continue;
        const hp = p.seat !== null ? h.players[p.seat] : null;
        if (p.pre.hand !== h.no || !hp || hp.folded || hp.allIn) { p.pre = null; continue; }
        // „Check“ gilt nicht mehr, sobald jemand gesetzt hat
        if (p.pre.type === 'check' && h.currentBet > hp.bet) {
          p.pre = null;
          p.preNote = 'Es wurde gesetzt – deine Vorauswahl „Check“ ist aufgehoben.';
        }
      }
      const p = this.playerAt(h.toAct);
      if (!p?.pre) return;
      const L = t.legal(h.toAct);
      const { type } = p.pre;
      const action = type === 'fold' ? 'fold' : L.canCheck ? 'check' : type === 'callany' ? 'call' : 'fold';
      t.act(h.toAct, { type: action });
      p.missed = 0;
      this.flushEvents();
    }
  }

  // ---------- Anstupsen ----------
  // Nur wer am Tisch sitzt, und nur den, der gerade dran ist
  nudge(fromId, targetId) {
    const from = this.players.get(fromId);
    const target = this.players.get(targetId);
    if (!this.settings.nudge) throw new Error('Anstupsen ist an diesem Tisch aus');
    if (from.seat === null) throw new Error('Nur wer am Tisch sitzt, kann anstupsen');
    if (!target || target.id === from.id) throw new Error('Das geht nicht');
    if (!this.handRunning || this.frozen || this.table.hand.toAct !== target.seat) throw new Error(`${target.name} ist gerade nicht dran`);
    const now = this.clock.now();
    if (now - (from.nudgeSentAt || 0) < NUDGE_GAP) throw new Error('Nicht so schnell – höchstens alle 10 Sekunden');
    if (!this.sendNudge(target, from.name)) throw new Error(`${target.name} wurde gerade erst angestupst`);
    from.nudgeSentAt = now;
    this.say(`${from.name} stupst ${target.name} an`, 'react');
  }

  sendNudge(target, fromName) {
    const now = this.clock.now();
    if (now - (target.nudgedAt || 0) < NUDGE_GAP) return false;
    target.nudgedAt = now;
    const lines = this.settings.nudgeLines;
    this.onChange('nudge', { to: target.id, from: fromName, text: lines[Math.floor(Math.random() * lines.length)] });
    return true;
  }

  // Einmal pro Zug: wer nach 10 Sekunden noch nichts gemacht hat, wird automatisch angestupst
  scheduleNudge() {
    if (!this.turnKey || this.turnKey === this.nudgeKey) return;
    this.clock.clearTimeout(this.nudgeTimer);
    const key = this.nudgeKey = this.turnKey;
    const seat = this.table.hand.toAct;
    this.nudgeTimer = this.clock.setTimeout(() => {
      this.nudgeTimer = null;
      const p = this.playerAt(seat);
      if (this.turnKey !== key || this.frozen || !this.handRunning || !this.settings.nudge || !p?.connected) return;
      this.sendNudge(p, null);
    }, this.nudgeAfter);
    this.nudgeTimer.unref?.();
  }

  // Wird nach jeder Änderung am Spielzustand aufgerufen
  afterChange() {
    if (this.gamePaused) return;
    this.runPreActions();
    this.blindTick();
    const h = this.table.hand;
    if (h && h.done) {
      this.clock.clearTimeout(this.turnTimer); this.turnTimer = null; this.turnKey = null; this.deadline = null;
      this.clock.clearTimeout(this.nudgeTimer); this.nudgeTimer = null; this.nudgeKey = null;
      if (!h.counted) {
        h.counted = true;
        this.blind.hands++;
        this.recordStats(h);
        this.reportResult(h);
        if (this.settings.oddsMode === 'after' && this.settings.variant !== 'omaha') this.logAfterOdds(h);
        this.onChange('handDone');
      }
      if (this.started && !this.paused && !this.frozen && this.settings.autoNext && !this.nextTimer) this.scheduleNext(this.settings.nextDelay * 1000);
      return;
    }
    if (!this.frozen) { this.scheduleTurn(); this.scheduleNudge(); }
  }

  scheduleNext(ms) {
    this.nextAt = this.clock.now() + ms;
    this.nextTimer = this.clock.setTimeout(() => { this.nextTimer = null; this.nextAt = null; this.startNext(); this.onChange('state'); }, ms);
  }

  scheduleTurn() {
    const h = this.table.hand;
    if (!h || h.done || h.toAct < 0) return;
    const key = `${h.no}:${this.seq}:${h.toAct}`;
    const p = this.playerAt(h.toAct);
    const offline = !!p && !p.connected;
    let secs = this.settings.turnTime || 0;
    if (offline) secs = secs ? Math.min(secs, OFFLINE_TURN) : OFFLINE_TURN;
    if (key === this.turnKey) {
      // Gleicher Zug: nur verkürzen, wenn der Spieler gerade offline gegangen ist
      if (!offline || (this.deadline && this.deadline - this.clock.now() <= secs * 1000)) return;
    }
    this.clock.clearTimeout(this.turnTimer);
    this.turnKey = key;
    if (!secs) { this.deadline = null; return; }
    this.deadline = this.clock.now() + secs * 1000;
    const seat = h.toAct;
    this.turnTimer = this.clock.setTimeout(() => this.timeout(seat, key), secs * 1000);
  }

  timeout(seat, key) {
    const h = this.table.hand;
    if (!h || h.done || h.toAct !== seat || this.turnKey !== key) return;
    const p = this.playerAt(seat);
    const L = this.table.legal(seat);
    this.table.act(seat, { type: L.canCheck ? 'check' : 'fold' });
    if (p) {
      p.missed++;
      this.say(`${p.name}: Zeit abgelaufen`);
      if (p.missed >= 2) { this.table.seats[seat].sittingOut = true; this.say(`${p.name} wird auf Pause gesetzt`); }
    }
    this.flushEvents();
    this.afterChange();
    this.onChange('state');
  }

  // Gewinnchancen nach dem Showdown – nur für Hände, die alle gesehen haben, also ohne etwas Verdecktes zu verraten
  afterOdds(h) {
    if (h.afterOdds !== undefined) return h.afterOdds;
    h.afterOdds = null;
    if (!h.result?.showdown) return null;
    const seats = [...h.shown].filter((s) => h.players[s] && !h.players[s].folded);
    if (seats.length < 2) return null;
    const hands = seats.map((s) => h.players[s].cards);
    h.afterOdds = [['preflop', 0], ['flop', 3], ['turn', 4]].filter(([, n]) => h.board.length >= n).map(([street, n]) => {
      const eq = equity(hands, h.board.slice(0, n), { samples: 6000 });
      return { street, odds: Object.fromEntries(seats.map((s, i) => [s, Math.round(eq[i] * 1000) / 10])) };
    });
    return h.afterOdds;
  }
  logAfterOdds(h) {
    const rows = this.afterOdds(h);
    if (!rows) return;
    const label = { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn' };
    const name = (s) => this.table.seats[s]?.name ?? '?';
    this.say('Chancen – ' + rows.map((r) => `${label[r.street]}: ${Object.entries(r.odds).map(([s, p]) => `${name(s)} ${String(p).replace('.', ',')} %`).join(', ')}`).join(' · '), 'info', 'win');
  }

  // Ergebnis der Hand an die Plattform (Bestenliste): jeder, der Karten hatte
  reportResult(h) {
    const winners = new Set(h.result.pots.flatMap((p) => p.winners));
    const entries = h.seats.map((seat) => ({
      name: this.handNames[seat],
      win: winners.has(seat),
      // total enthält nur die tatsächlichen Einsätze, nicht gecallte Überschüsse sind bereits erstattet.
      points: h.result.pots.reduce((sum, pot) => sum + (pot.payouts[seat] || 0), 0) - h.players[seat].total,
    })).filter((e) => e.name);
    this.onChange('result', { entries });
  }

  recordStats(h) {
    this.stats.hands++;
    for (const pot of h.result.pots) {
      const name = pot.winners.map((s) => this.playerAt(s)?.name).join(' & ');
      if (!this.stats.biggestPot || pot.amount > this.stats.biggestPot.amount) {
        this.stats.biggestPot = { amount: pot.amount, name, hand: pot.hand };
      }
    }
    if (h.result.showdown) {
      for (const seat of h.shown) {
        const e = this.table.evaluate(h.players[seat].cards, h.board);
        const best = this.stats.bestHand;
        if (!best || compareScores(e.score, best.score) > 0) {
          this.stats.bestHand = { score: e.score, name: this.playerAt(seat)?.name, hand: e.name };
        }
      }
    }
  }

  // Engine-Ereignisse in lesbaren Rundenverlauf übersetzen
  flushEvents() {
    const t = this.table;
    const name = (seat) => t.seats[seat]?.name ?? '?';
    for (const e of t.events.splice(0)) {
      this.seq++;
      switch (e.type) {
        case 'hand': this.say(`Hand #${e.no}`, 'hand'); break;
        case 'sb': this.say(`${name(e.seat)} zahlt Small Blind ${fmt(e.amount)}`, 'info', 'action'); break;
        case 'bb': this.say(`${name(e.seat)} zahlt Big Blind ${fmt(e.amount)}`, 'info', 'action'); break;
        case 'fold': this.say(`${name(e.seat)} foldet`, 'info', 'action'); break;
        case 'check': this.say(`${name(e.seat)} checkt`, 'info', 'action'); break;
        case 'call': this.say(`${name(e.seat)} callt ${fmt(e.amount)}${e.allIn ? ' und ist All-in' : ''}`, 'info', 'action'); break;
        case 'bet': this.say(`${name(e.seat)} setzt ${fmt(e.to)}${e.allIn ? ' (All-in)' : ''}`, 'bet'); break;
        case 'raise': this.say(`${name(e.seat)} erhöht auf ${fmt(e.to)}${e.allIn ? ' (All-in)' : ''}`, 'bet'); break;
        case 'refund': this.say(`${name(e.seat)} bekommt ${fmt(e.amount)} zurück`, 'info', 'action'); break;
        case 'street': {
          const label = { flop: 'Flop', turn: 'Turn', river: 'River' }[e.street];
          const cards = e.street === 'flop' ? e.board : e.board.slice(-1);
          this.say(`${label}: ${cards.map(fmtCard).join(' ')}`, 'street');
          break;
        }
        case 'result':
          for (const pot of e.result.pots) {
            const who = pot.winners.map(name).join(' & ');
            const verb = pot.winners.length > 1 ? 'teilen sich' : 'gewinnt';
            this.say(`${who} ${verb} ${fmt(pot.amount)}${pot.hand ? ` mit ${pot.hand}` : ''}`, 'win');
          }
          break;
      }
    }
  }

  // ---------- Ansicht pro Spieler (nur was er sehen darf!) ----------
  view(viewerId) {
    const t = this.table;
    const h = t.hand;
    const me = this.players.get(viewerId);
    const mySeat = me?.seat ?? null;
    const seats = t.seats.map((s, i) => {
      if (!s) return null;
      const p = this.players.get(s.id);
      const hp = h?.players[i];
      let cards = null;
      if (hp && (!hp.folded || i === mySeat)) {
        const visible = i === mySeat || (h.done && h.shown.has(i));
        cards = visible ? hp.cards : Array(this.table.holeCards).fill('??');
      }
      return {
        seat: i, id: s.id, name: s.name, avatar: p?.avatar, bot: !!p?.bot, stack: s.stack,
        sittingOut: s.sittingOut, busted: s.stack === 0 && !(hp && !h.done && !hp.folded),
        connected: !!p?.connected, isHost: s.id === this.hostId,
        inHand: !!hp, folded: !!hp?.folded, allIn: !!hp?.allIn && !h?.done,
        bet: hp && !h.done ? hp.bet : 0, lastAction: hp?.lastAction ?? null,
        cards, leaving: !!p?.leaveAfterHand,
      };
    });

    let hand = null;
    if (h) {
      const result = h.result && {
        showdown: h.result.showdown,
        pots: h.result.pots.map((pot) => ({
          amount: pot.amount, winners: pot.winners, hand: pot.hand, cards: pot.cards,
          names: pot.winners.map((s) => t.seats[s]?.name ?? '?'),
        })),
        hands: Object.fromEntries([...h.shown].filter((s) => h.result.hands[s]).map((s) => [s, h.result.hands[s]])),
      };
      hand = {
        no: h.no, street: h.street, board: h.board, button: h.button, sb: h.sb, bb: h.bb,
        toAct: h.toAct, currentBet: h.currentBet, done: h.done,
        pots: h.done ? [] : t.potsDisplay().map((p) => p.amount),
        bets: h.done ? 0 : h.seats.reduce((a, i) => a + h.players[i].bet, 0),
        deadline: this.deadline, frozenLeft: this.frozen?.turnLeft ?? null, turnTime: this.settings.turnTime, result,
        afterOdds: h.done && this.settings.oddsMode === 'after' && this.settings.variant !== 'omaha' ? this.afterOdds(h) : null,
      };
    }

    let legal = null;
    let strength = null;
    let odds = null;
    let strengthCat = null;
    if (mySeat !== null && h) {
      if (!h.done && !this.frozen && h.toAct === mySeat) legal = t.legal(mySeat);
      const hp = h.players[mySeat];
      const ownOdds = this.settings.oddsMode === 'own' && this.settings.variant !== 'omaha'; // Gewinnchancen gibt es nur beim Hold'em
      if (hp && !hp.folded && (this.settings.handStrength || ownOdds)) {
        const e = this.table.evaluate(hp.cards, h.board);
        strengthCat = e.category;
        if (this.settings.handStrength) strength = e.name;
        // Nur aus den eigenen Karten und dem Board – fremde Karten fließen nie ein
        if (!h.done && ownOdds) odds = this.oddsFor(mySeat);
      }
    }
    const canShow = !!(h && h.done && mySeat !== null && h.players[mySeat] && !h.shown.has(mySeat) && !h.result.showdown);

    const standings = this.standingsList();
    const bi = this.blindInfo();
    const nx = untilNext(bi.args);
    const due = levelIndex(bi.args);
    const now = this.clock.now();
    const gifts = [...this.gifts.values()].filter((g) => g.expires > now);
    const nameOf = (id) => this.players.get(id)?.name ?? '?';

    return {
      code: this.code,
      you: me ? {
        id: me.id, name: me.name, seat: mySeat, isHost: me.id === this.hostId, rebuys: me.rebuys,
        leaving: !!me.leaveAfterHand, sitLocked: mySeat === null && this.sitLocked(me), lastSeat: me.lastSeat ?? null,
        pre: me.pre && h && !h.done && me.pre.hand === h.no ? me.pre.type : null, preNote: me.preNote || null,
        giftsIn: gifts.filter((g) => g.to === me.id).map((g) => ({ id: g.id, from: nameOf(g.from), amount: g.amount, message: g.message, expires: g.expires })),
        giftOut: gifts.filter((g) => g.from === me.id).map((g) => ({ id: g.id, to: nameOf(g.to), amount: g.amount, expires: g.expires }))[0] || null,
      } : null,
      blinds: {
        sb: t.smallBlind, bb: t.bigBlind, mode: this.settings.blindMode, level: this.blind.level + 1, levels: bi.levels,
        // Fälliges Level greift erst mit der nächsten Hand
        pending: due > this.blind.level ? bi.levels[due] : null,
        next: nx ? { ...bi.levels[nx.index], msLeft: nx.msLeft ?? null, handsLeft: nx.handsLeft ?? null } : null,
        running: this.blindRunning(),
      },
      hostId: this.hostId,
      settings: this.settings,
      started: this.started, paused: this.paused, frozen: !!this.frozen, nextAt: this.nextAt, ...this.pauseView(),
      seats, hand, legal, strength, strengthCat, odds, canShow,
      log: this.log.slice(-40), logSeq: this.logSeq,
      // Easter Egg: wer gerade als „Sebastian“ Pause macht (per ID, nur dieser Raum)
      sebs: [...this.players.values()]
        .filter((p) => p.sebPause && p.seat !== null && t.seats[p.seat]?.sittingOut)
        .map((p) => ({ id: p.id, name: p.name })),
      standings,
      stats: { hands: this.stats.hands, biggestPot: this.stats.biggestPot, bestHand: this.stats.bestHand && { name: this.stats.bestHand.name, hand: this.stats.bestHand.hand } },
    };
  }

  standingsList() {
    const t = this.table;
    const h = t.hand;
    return [...this.players.values()].map((p) => {
      const chips = p.seat !== null ? t.seats[p.seat].stack : p.bank;
      const inPot = p.seat !== null && h && !h.done && h.players[p.seat] ? h.players[p.seat].total : 0;
      return { id: p.id, name: p.name, avatar: p.avatar, chips: chips + inPot, net: chips + inPot - p.buyIn, rebuys: p.rebuys, seated: p.seat !== null, connected: p.connected };
    }).sort((a, b) => b.net - a.net);
  }

  // Chancen je Hand bis zum River – nur einmal pro Straße rechnen, nicht bei jedem Update
  oddsFor(seat) {
    const h = this.table.hand;
    if (this.oddsCache?.no !== h.no) this.oddsCache = { no: h.no, map: new Map() };
    const key = seat + ':' + h.board.length;
    let odds = this.oddsCache.map.get(key);
    if (!odds) {
      odds = outlook(h.players[seat].cards, h.board).map((p) => Math.round(p * 1000) / 10);
      this.oddsCache.map.set(key, odds);
    }
    return odds;
  }

  // ---------- Speichern / Laden ----------
  snapshot() {
    return {
      code: this.code, settings: this.settings, hostId: this.hostId,
      button: this.table.button, handNo: this.table.handNo, stats: this.stats,
      blind: { level: this.blind.level, elapsed: this.blindInfo().args.elapsedMs, hands: this.blind.hands },
      players: [...this.players.values()].map((p) => ({
        id: p.id, token: p.token, name: p.name, avatar: p.avatar, seat: p.seat, bot: !!p.bot,
        chips: p.seat !== null ? this.table.seats[p.seat].stack : p.bank,
        sittingOut: p.seat !== null ? this.table.seats[p.seat].sittingOut : false,
        buyIn: p.buyIn, rebuys: p.rebuys, sebPause: !!p.sebPause,
        sitLock: p.sitLock || 0, lastSeat: p.lastSeat ?? null,
      })),
    };
  }

  static restore(data, onChange) {
    const r = new Room(data.code, data.settings, onChange);
    r.hostId = data.hostId;
    r.table.button = data.button;
    r.table.handNo = data.handNo;
    r.stats = data.stats || r.stats;
    r.loadHistory(data.log || []); // alte Stände hatten die letzten Einträge im Spielstand
    for (const d of data.players) {
      // Alte Stände können Felder früherer Versionen enthalten (z. B. avatarUrl) – die werden ignoriert.
      // Wer damals ein Profilbild statt Emoji hatte, bekommt ein Emoji.
      const p = {
        id: d.id, token: d.token, name: d.name, seat: null, bank: d.chips,
        avatar: AVATARS.includes(d.avatar) ? d.avatar : AVATARS[r.players.size % AVATARS.length],
        buyIn: d.buyIn, rebuys: d.rebuys, bot: d.bot === true, connected: d.bot === true, socketId: null, missed: 0, leaveAfterHand: false, seen: [],
        offlineSince: Date.now(), // nach einem Neustart bekommt jeder wieder die volle Frist
        sebPause: !!d.sebPause,
        sitLock: Number(d.sitLock) || 0, lastSeat: Number.isInteger(d.lastSeat) ? d.lastSeat : null,
      };
      r.players.set(p.id, p);
      if (d.seat !== null && d.seat !== undefined) {
        r.table.sit(d.seat, { id: p.id, name: p.name, stack: d.chips, sittingOut: d.sittingOut });
        p.seat = d.seat; p.bank = 0;
      }
    }
    if (data.blind) r.blind = { level: Number(data.blind.level) || 0, elapsed: Number(data.blind.elapsed) || 0, hands: Number(data.blind.hands) || 0, since: null };
    r.applyBlinds();
    r.say('Server neu gestartet – Host startet weiter');
    return r;
  }
}
