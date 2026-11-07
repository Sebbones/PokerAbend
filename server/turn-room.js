// Grundlage für rundenbasierte Spiele (Karten, Würfel, Brett): Mitspieler, Reihenfolge, Runden, Punkte des Abends.
// Ein Spiel erweitert diese Klasse und füllt die Haken: setupRound, onTurnStart, onDropOut, gameView, publicPlayer.
import { BaseRoom } from './base-room.js';
import { assertNewRoundAllowed } from './maintenance.js';
import {savedBotLevel,effectiveBotLevel} from '../games/bot-levels.js';

export class TurnRoom extends BaseRoom {
  // opts: { minPlayers, maxPlayers, lowWins (wenig Punkte = gut), scoreLabel, winPoints (Punkte für einen Sieg, wenn Punkte = Siege) }
  constructor(code, settings, onChange, opts) {
    super(code, onChange);
    this.variant = settings?.variant || 'classic';
    this.opts = { minPlayers: 2, maxPlayers: 6, lowWins: false, scoreLabel: 'Punkte', ...opts };
    this.settings = this.clampSettings(settings || {}, this.defaultSettings());
    this.seats = [];      // Mitspieler (IDs) in Sitzreihenfolge
    this.order = [];      // wer in der laufenden Runde mitspielt
    this.turn = 0;        // Index in order
    this.dir = 1;         // Spielrichtung
    this.phase = 'lobby'; // lobby | playing | over
    this.roundNo = 0;
    this.scores = {};     // ID → Punkte des Abends
    this.wins = {};       // ID → gewonnene Runden
    this.result = null;   // Ergebnis der letzten Runde
    this.acts = {};       // ID → { text, n }: letzte Aktion je Spieler in dieser Runde (Sprechblase am Platz)
    this.actSeq = 0;
    this.moves = [];      // Züge dieser Runde für „Ansehen“: { n: Name, t: Text, d?: Einzelheiten }. Nur, was alle ohnehin als Sprechblase sehen.
    // Zug-Timer (nur Spiele mit der Einstellung turnTime, Sekunden, 0 = aus): wer zu lange braucht, für den entscheidet onTimeout
    this.turnTimer = null; this.timerKey = null; this.deadline = null;
    this.moveNo = 0;      // zählt Züge – ein neuer Zug startet die Uhr neu, auch wenn derselbe nochmal dran ist
  }

  // ---------- Haken für das Spiel ----------
  defaultSettings() { return {}; }
  // Regel-Optionen des Spiels stehen als static OPTIONS in der Klasse: Zahl (in Grenzen) oder Schalter
  clampSettings(input, base) {
    const s = { ...base };
    for (const o of this.constructor.OPTIONS || []) {
      if (!(o.key in input)) continue;
      if (o.type === 'bool') s[o.key] = !!input[o.key];
      else if (o.type === 'select') { if (o.values.some((v) => v.value === input[o.key])) s[o.key] = input[o.key]; }
      else { const n = Math.floor(Number(input[o.key])); if (Number.isFinite(n) && n >= o.min && n <= o.max) s[o.key] = n; }
    }
    return s;
  }
  validateStart() {}      // Einstellungen und Mitspieler prüfen, bevor sich der Spielstand ändert
  setupRound() {}         // Karten geben, Würfel bereitlegen …
  onTurnStart() {}        // wer jetzt dran ist (z. B. Aussetzen überspringen)
  onDropOut() {}          // jemand verlässt die laufende Runde (Karten zurück …)
  gameView() { return {}; }          // spielspezifische Ansicht – nur, was dieser Spieler sehen darf
  publicPlayer() { return {}; }      // was alle über einen Mitspieler sehen (z. B. Kartenanzahl)

  // ---------- Grundlage ----------
  get round() { return this.roundNo; }
  // Liste der offenen Tische (Startseite): wer sitzt, wie viele Plätze, wie weit das Spiel ist – nichts vom Spielstand
  lobbyInfo() {
    const seated = this.seats.map((id) => this.players.get(id)).filter((p) => p && !p.kicked);
    const watchers = [...this.players.values()].filter((p) => !p.kicked && !this.seats.includes(p.id) && !p.bot).length;
    return { seats: seated.map((p) => ({ name: p.name, avatar: p.avatar, bot: !!p.bot })), max: this.opts.maxPlayers, watchers, status: this.gamePaused ? 'Spiel pausiert' : this.lobbyStatus() };
  }
  lobbyStatus() { return this.phase === 'playing' ? `Runde #${this.roundNo} läuft` : this.phase === 'over' ? `Runde #${this.roundNo} vorbei` : 'wartet auf Start'; }
  get busy() { return this.phase === 'playing'; }
  get currentId() { return this.phase === 'playing' ? this.order[this.turn] ?? null : null; }
  get current() { return this.players.get(this.currentId); }
  name(id) { return this.players.get(id)?.name ?? '?'; }
  // Kurz, was jemand gerade getan hat („zieht 2“, „sagt 52“) – erscheint als Sprechblase an seinem Platz
  act(id, text, detail) {
    if (id) this.acts[id] = { text, n: ++this.actSeq };
    this.moves.push({ n: id ? this.name(id) : '', t: text, ...(detail !== undefined ? { d: detail } : {}) });
    if (this.moves.length > 80) this.moves.shift();
    this.moveNo++;
  }

  // ---------- Zug-Timer ----------
  timerActive() { return true; }   // Haken: läuft die Uhr gerade? (z. B. nicht beim Schiffe-Setzen)
  onTimeout() {}                   // Haken: Zeit abgelaufen – das Spiel entscheidet für den, der dran ist
  // Nach jedem Ereignis (Plattform ruft afterChange): Uhr starten, neu starten oder stoppen
  afterChange() { if (!this.gamePaused) this.syncTimer(); }
  syncTimer() {
    const secs = Number(this.settings.turnTime) || 0;
    const key = this.phase === 'playing' && secs > 0 && this.currentId && this.timerActive() ? `${this.roundNo}:${this.currentId}:${this.moveNo}` : null;
    if (key === this.timerKey) return;
    this.clock.clearTimeout(this.turnTimer);
    this.turnTimer = null; this.deadline = null; this.timerKey = key;
    if (!key) return;
    this.deadline = this.clock.now() + secs * 1000;
    this.turnTimer = this.clock.setTimeout(() => {
      this.turnTimer = null;
      if (this.timerKey !== key) return;
      try { this.onTimeout(this.currentId); } catch { /* nichts zu entscheiden */ }
      this.syncTimer();
      this.onChange('state');
    }, secs * 1000);
    this.turnTimer.unref?.();
  }
  dispose() { this.clock.clearTimeout(this.turnTimer); this.turnTimer = null; super.dispose(); }


  sit(id) {
    const p = this.players.get(id);
    if (this.seats.includes(id)) throw new Error('Du spielst schon mit');
    if (this.seats.length >= this.opts.maxPlayers) throw new Error(`Mehr als ${this.opts.maxPlayers} Mitspieler gehen nicht`);
    this.seats.push(id);
    this.say(this.phase === 'playing' ? `${p.name} spielt ab der nächsten Runde mit` : `${p.name} spielt mit`);
  }

  stand(id) {
    const p = this.players.get(id);
    if (!this.seats.includes(id)) return;
    this.seats = this.seats.filter((x) => x !== id);
    if (this.phase === 'playing' && this.order.includes(id)) this.dropOut(p, `${p.name} steigt aus der Runde aus`);
    else this.say(`${p.name} schaut zu`);
  }

  // Aus der laufenden Runde nehmen. Bleibt nur einer übrig, ist die Runde vorbei.
  dropOut(p, message) {
    const i = this.order.indexOf(p.id);
    if (i < 0) return;
    if (message) this.say(message);
    const wasCurrent = i === this.turn;
    this.onDropOut(p);
    if (this.phase !== 'playing') return; // das Spiel hat die Runde schon beendet
    this.order.splice(i, 1);
    if (i < this.turn) this.turn--;
    // Bleibt nur einer übrig, gewinnt er – außer bei Spielen, die man auch allein spielt (minPlayers 1): dann erst, wenn niemand mehr da ist
    if (this.order.length < (this.opts.minPlayers <= 1 ? 1 : 2)) {
      const left = this.order[0];
      this.finishRound(left ? [left] : [], left ? `${this.name(left)} bleibt übrig und gewinnt die Runde` : 'Runde abgebrochen', left && this.opts.winPoints ? { [left]: this.opts.winPoints } : {});
      return;
    }
    // Removing the current seat shifts the clockwise neighbour into its index.
    // In reverse play, continue with the preceding seat instead.
    if (wasCurrent && this.dir === -1) this.turn = (this.turn - 1 + this.order.length) % this.order.length;
    if (this.turn >= this.order.length) this.turn = 0;
    if (wasCurrent) this.onTurnStart();
  }

  // Die Plattform entfernt jemanden (Host, Wegbleiben): aus der Runde und von den Plätzen
  leaveGame(p) {
    this.seats = this.seats.filter((x) => x !== p.id);
    if (this.phase === 'playing' && this.order.includes(p.id)) this.dropOut(p, null);
    return false;
  }

  start(id) {
    this.requireHost(id);
    if (this.phase === 'playing') throw new Error('Die Runde läuft schon');
    assertNewRoundAllowed(); // Update angekündigt: neue Runden erst nach dem Neustart
    const ids = this.seats.filter((x) => this.players.has(x));
    if (ids.length < this.opts.minPlayers) throw new Error(`Es müssen mindestens ${this.opts.minPlayers} mitspielen`);
    this.validateStart(ids);
    if (ids.length > this.opts.maxPlayers) throw new Error(`Diese Variante erlaubt höchstens ${this.opts.maxPlayers} Mitspieler`);
    // Wer anfängt, wechselt jede Runde
    const s = this.roundNo % ids.length;
    this.order = [...ids.slice(s), ...ids.slice(0, s)];
    this.roundNo++;
    this.turn = 0; this.dir = 1;
    this.phase = 'playing';
    this.result = null;
    this.acts = {}; this.moves = [];
    this.say(`Runde #${this.roundNo}`, 'hand');
    if (this.variant !== 'classic') this.say(`Variante: ${this.variantLabel || this.variant}`);
    this.setupRound();
    this.roundPlayers = [...this.order]; // für die Bestenliste (auch wer unterwegs ausscheidet)
    this.onChange('roundStart', { ids: [...this.order] }); // V2-03: Ranked-Berechtigung wird hier eingefroren
    if (this.phase === 'playing') this.onTurnStart();
  }

  // Weiter zum nächsten (oder übernächsten) Spieler in Spielrichtung
  next(steps = 1) {
    const n = this.order.length;
    this.turn = (((this.turn + this.dir * steps) % n) + n) % n;
    this.onTurnStart();
  }
  // Nächster in Spielrichtung, ohne zu wechseln
  peek(steps = 1) {
    const n = this.order.length;
    return this.order[(((this.turn + this.dir * steps) % n) + n) % n];
  }

  requireTurn(id) {
    if (this.gamePaused) throw new Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing') throw new Error('Gerade läuft keine Runde');
    if (this.currentId !== id) throw new Error('Du bist nicht dran');
  }

  // Runde beenden. points: Punkte dieser Runde je Spieler (kommen auf den Abend), winners: Gewinner
  finishRound(winners, text, points = {}) {
    this.phase = 'over';
    for (const [id, pts] of Object.entries(points)) this.scores[id] = (this.scores[id] || 0) + pts;
    for (const w of winners) this.wins[w] = (this.wins[w] || 0) + 1;
    const players = (this.roundPlayers || this.order).filter((id) => this.players.has(id));
    this.result = { text, winners, points, players };
    this.onChange('result', { entries: players.map((id) => ({ name: this.name(id), win: winners.includes(id), points: points[id] || 0 })), ids: players });
    this.say(text, 'win');
    this.onChange('handDone');
  }

  // Host bricht die laufende Runde ab: ohne Wertung, alles zurück auf den Stand vor der Runde, danach Wartezustand
  abortRound(id) {
    this.requireHost(id);
    if (this.phase !== 'playing') throw new Error('Gerade läuft keine Runde');
    this.onAbort();
    this.onChange('roundAbort');
    this.phase = 'lobby';
    this.roundNo = Math.max(0, this.roundNo - 1); // die abgebrochene Runde zählt nicht (auch nicht für den Startspieler)
    this.result = null; this.acts = {}; this.moves = [];
    this.moveNo++;
    this.say('Runde vom Host abgebrochen', 'warn');
  }
  onAbort() {} // Haken: Einsätze zurückgeben, Zwischenstände der Runde verwerfen (Punkte werden erst am Rundenende gebucht)

  newGame(id) {
    this.requireHost(id);
    if (this.phase === 'playing') throw new Error('Ein neues Spiel geht nur zwischen zwei Runden');
    const list = this.standingsList().filter((p) => p.score || p.wins).map((p) => `${p.name} ${p.score} ${this.opts.scoreLabel}, ${p.wins} gewonnen`);
    this.say(`Abendstand vor dem neuen Spiel: ${list.join(' · ') || 'noch nichts gespielt'}`, 'summary');
    this.scores = {}; this.wins = {}; this.result = null; this.phase = 'lobby';
    this.resetGame();
    this.say('Neues Spiel – alle starten bei null', 'warn');
  }
  resetGame() {} // Haken: Fortschritt über mehrere Runden zurücksetzen (z. B. Phasen bei Phase 10)

  updateSettings(id, input) {
    this.requireHost(id);
    if (this.phase === 'playing') throw new Error('Einstellungen gehen nur zwischen den Runden');
    this.settings = this.clampSettings(input || {}, this.settings);
    this.say('Einstellungen geändert');
  }

  standingsList() {
    const list = [...this.players.values()].filter((p) => !p.kicked)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: this.scores[p.id] || 0, wins: this.wins[p.id] || 0, connected: p.connected, playing: this.seats.includes(p.id) }));
    const dir = this.opts.lowWins ? 1 : -1;
    return list.sort((a, b) => (a.score - b.score) * dir || b.wins - a.wins);
  }

  view(viewerId) {
    const me = this.players.get(viewerId);
    const people = [...this.players.values()].filter((p) => !p.kicked);
    // Mitspieler in Sitzreihenfolge zuerst, dann Zuschauer
    people.sort((a, b) => (this.seats.indexOf(a.id) + 1 || 99) - (this.seats.indexOf(b.id) + 1 || 99));
    return {
      code: this.code, game: this.game, ...this.pauseView(),
      variant: this.variant, variantName: this.variantLabel || this.variant,
      you: me ? { id: me.id, name: me.name, isHost: me.id === this.hostId, playing: this.seats.includes(me.id), inRound: this.order.includes(me.id) } : null,
      hostId: this.hostId, settings: this.settings, phase: this.phase, roundNo: this.roundNo, turnId: this.currentId, deadline: this.deadline, dir: this.dir, acts: this.phase === 'lobby' ? {} : this.acts, moves: this.phase === 'lobby' ? [] : this.moves.slice(-40),
      minPlayers: this.opts.minPlayers, maxPlayers: this.opts.maxPlayers, scoreLabel: this.opts.scoreLabel, lowWins: this.opts.lowWins,
      players: people.map((p) => ({
        id: p.id, name: p.name, avatar: p.avatar, bot: !!p.bot, ...(p.bot?{botDifficulty:effectiveBotLevel(this,p)}:{}), connected: p.connected, isHost: p.id === this.hostId,
        seated: this.seats.includes(p.id), inRound: this.order.includes(p.id), score: this.scores[p.id] || 0, wins: this.wins[p.id] || 0,
        ...(this.order.includes(p.id) || this.phase !== 'lobby' ? this.publicPlayer(p) : {}),
      })),
      result: this.result,
      log: this.log.slice(-40), logSeq: this.logSeq,
      standings: this.standingsList(),
      g: this.phase === 'lobby' ? null : this.gameView(viewerId),
    };
  }

  // Gespeichert wird nur zwischen den Runden: Spieler, Plätze, Punkte und Einstellungen
  snapshot() {
    return {
      code: this.code, settings: this.settings, hostId: this.hostId, roundNo: this.roundNo, scores: this.scores, wins: this.wins, seats: this.seats,
      ...(this.variant !== 'classic' ? { variant: this.variant } : {}),
      extra: this.saveExtra(),
      players: [...this.players.values()].filter((p) => !p.kicked).map((p) => ({ id: p.id, token: p.token, name: p.name, avatar: p.avatar, bot: !!p.bot, ...(p.bot?{botDifficulty:savedBotLevel(p)}:{}) })),
    };
  }
  saveExtra() { return null; }
  loadExtra() {}

  static restoreInto(r, data) {
    r.hostId = data.hostId;
    r.roundNo = Number(data.roundNo) || 0;
    r.scores = data.scores || {};
    r.wins = data.wins || {};
    for (const d of data.players || []) {
      r.players.set(d.id, { ...r.playerFields(), id: d.id, token: d.token, name: d.name, avatar: d.avatar, bot: d.bot === true, ...(d.bot?{botDifficulty:savedBotLevel(d)}:{}), connected: d.bot === true, socketId: null, offlineSince: Date.now() });
    }
    r.seats = (data.seats || []).filter((id) => r.players.has(id));
    if (data.extra) r.loadExtra(data.extra);
    r.say('Server neu gestartet – der Host startet die nächste Runde');
    return r;
  }
}

// Ereignisse, die jedes rundenbasierte Spiel versteht
export const turnEvents = {
  sit: (room, p) => room.sit(p.id),
  stand: (room, p) => room.stand(p.id),
  start: (room, p) => room.start(p.id),
  newGame: (room, p) => room.newGame(p.id),
  settings: (room, p, s) => room.updateSettings(p.id, s),
};
