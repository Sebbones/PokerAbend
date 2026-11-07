// Server-geführte Echtzeit-Spiele auf der festen 50-ms-Schleife der PartyArena-Räume.
// Der Server ist Schiedsrichter über Treffer, Zeitpunkte und Punkte; Clients senden nur Eingaben und zeigen Frames an.
// Latenz: Jeder Frame trägt die Serverzeit (elapsed). Taps tragen die vom Client daraus geschätzte Serverzeit;
// der Server rechnet sie höchstens um die selbst gemessene Verzögerung (LAG_CAP) zurück und nie in die Zukunft.
import { randomBytes } from 'node:crypto';
import { PartyArenaRoom } from './party-arena-room.js';
import { TurnRoom } from '../server/turn-room.js';
import { ARENA, STEP_MS, COUNTDOWN_MS, INPUT_TTL } from './realtime-room.js';
import { arcadeIntent } from './arcade-bot.js';
import {
  mulberry32, makeChart, gradeOf, NOTE_WINDOWS, NOTE_POINTS, NOTE_SHOW, STRAY_PENALTY, comboBonus,
  GIFT, GIFT_POINTS, giftY, makeItems, GRID, BOMB, SPAWNS, cellIndex, cellCentre, makeGrid, blastCells, FREEZE,
} from './arcade-logic.js';

export const LAG_CAP = 200;       // höchstens so viele ms Netzverzögerung werden einem Spieler angerechnet
export const TAP_RATE = 14;       // Taps pro Sekunde und Spieler
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const SECS = { key: 'playSecs', label: 'Spielzeit in Sekunden', type: 'number' };

export class ArcadeRoom extends PartyArenaRoom {
  static MAX = 8;
  static OPTIONS = [{ ...SECS, min: 10, max: 180 }];
  defaultSettings() { return { playSecs: 60 }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange);
    this.rng = Math.random; this.lag = new Map(); this.cmd = new Map(); this.tickWall = 0; this.rs = new Map();
  }
  get secs() { return this.settings.playSecs; }

  // ----- Zeit und Latenz -----
  // Serverzeit mit Teilschritt-Genauigkeit (die Schleife selbst tickt nur alle 50 ms).
  serverNow() { return this.elapsed + clamp(this.clock.now() - this.tickWall, 0, STEP_MS); }
  noteLag(id, ack) {
    if (!Number.isSafeInteger(ack) || ack < 0 || ack > this.tickNo) return;
    const sample = clamp((this.tickNo - ack) * STEP_MS - STEP_MS, 0, LAG_CAP), old = this.lag.get(id);
    this.lag.set(id, old === undefined ? sample : old * .7 + sample * .3);
  }
  lagOf(id) { return clamp(this.lag.get(id) || 0, 0, LAG_CAP); }

  // ----- Rundenstart -----
  setupRound() {
    this.stopLoop(); this.runId = randomBytes(12).toString('hex'); this.stage = 'arena'; this.tickNo = 0; this.elapsed = -COUNTDOWN_MS;
    this.inputs.clear(); this.lag.clear(); this.cmd.clear(); this.rs = new Map(); this.roles = new Map();
    this.roster = [...this.order]; this.points = Object.fromEntries(this.roster.map((id) => [id, 0])); this.gamePts = this.points;
    this.seed = Math.floor(this.rng() * 2 ** 31); this.q = 0; this.total = 1; this.note = null; this.tickWall = this.clock.now();
    this.bodies = this.roster.map((id, i) => ({ id, alive: true, x: 0, y: 0, caught: false, slot: i }));
    this.zones = []; this.setup();
    this.deadline = this.kind === 'bomb' ? null : this.clock.now() + COUNTDOWN_MS + this.secs * 1000;
  }
  setup() {}

  // ----- Eingaben -----
  guard(id, { runId, round, seq } = {}) {
    if (this.gamePaused) throw Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing' || runId !== this.runId || round !== this.roundNo) throw Error('Diese Eingabe gehört nicht zur laufenden Runde');
    const body = this.bodies.find((p) => p.id === id);
    if (!this.order.includes(id) || !body?.alive) throw Error('Du schaust gerade zu');
    if (!Number.isSafeInteger(seq) || seq < 1 || seq > 1e9) throw Error('Ungültige Bewegung');
    return body;
  }
  // Richtungseingabe: nur -1/0/1; keine Positionen, Zeiten oder Sprünge vom Client.
  input(id, data = {}) {
    this.guard(id, data);
    const { seq, x, y, ack } = data;
    if (![-1, 0, 1].includes(x) || ![-1, 0, 1].includes(y) || data.jump) throw Error('Ungültige Bewegung');
    if (seq <= (this.inputs.get(id)?.seq || 0)) throw Error('Diese Eingabe ist bereits veraltet');
    this.noteLag(id, ack);
    this.setInput(id, x, y, seq);
  }
  // Einmalige Befehle (Tipp, Bombe): eigene Folgenummer, damit Wiederholungen nicht doppelt zählen.
  command(id, data, fn) {
    const body = this.guard(id, data);
    if (this.elapsed < 0) throw Error('Die Runde hat noch nicht begonnen');
    if (data.seq <= (this.cmd.get(id) || 0)) throw Error('Diese Eingabe ist bereits veraltet');
    this.cmd.set(id, data.seq); this.noteLag(id, data.ack);
    return fn(body);
  }
  tap(id, data = {}) { if (this.kind !== 'rhythm') throw Error('Das gibt es in diesem Spiel nicht'); return this.command(id, data, () => this.tapNote(id, data)); }
  act(id, data = {}) { if (this.kind !== 'bomb') throw Error('Das gibt es in diesem Spiel nicht'); return this.command(id, data, (body) => this.placeBomb(body)); }
  liveInput(p) {
    const input = this.inputs.get(p.id), person = this.players.get(p.id);
    if (!p.alive || !input || !person?.connected || person.kicked || (this.tickNo - input.at) * STEP_MS > INPUT_TTL) return null;
    return input;
  }

  // ----- Schleife -----
  botStep(id) {
    const view = this.gameView(id), v = arcadeIntent(view, id);
    if (v) this.applyIntent(id, v);
  }
  applyIntent(id, v) { this.setInput(id, v.x || 0, v.y || 0); if (v.bomb) this.placeBomb(this.bodies.find((p) => p.id === id)); }
  step() {
    if (this.phase !== 'playing' || this.gamePaused) return;
    this.tickNo++; this.elapsed += STEP_MS; this.tickWall = this.clock.now();
    if (this.elapsed < 0) return;
    const every = this.kind === 'bomb' ? 3 : 4;
    if (this.kind !== 'rhythm' && this.tickNo % every === 0 && this.humanOnline()) for (const p of this.bodies) if (p.alive && this.players.get(p.id)?.bot) this.botStep(p.id);
    this.advance_();
  }
  advance_() {}
  finishArena(reason) {
    if (this.phase !== 'playing') return;
    this.stopLoop(); this.stage = null; this.deadline = null;
    const best = Math.max(0, ...this.roster.map((id) => this.score(id)));
    const winners = this.pickWinners(reason, best);
    const wins = Object.fromEntries(this.roster.map((id) => [id, Number(winners.includes(id))]));
    this.finishRound(winners, this.resultText(winners, reason), wins);
  }
  score(id) { return this.points[id] || 0; }
  pickWinners(reason, best) { return best > 0 ? this.roster.filter((id) => this.players.has(id) && this.score(id) === best) : []; }
  resultText(winners) { return winners.length ? winners.length > 1 ? 'Gleichstand – die Besten teilen sich den Sieg.' : 'Die höchste Punktzahl gewinnt.' : 'Niemand hat Punkte erzielt – unentschieden.'; }

  // ----- Frames -----
  frame(viewerId = null) {
    const f = { game: this.game, runId: this.runId, round: this.roundNo, tick: this.tickNo, elapsed: this.elapsed, duration: this.secs * 1000, kind: this.kind,
      arena: { ...ARENA }, jumping: false, role: null, q: this.q, total: this.total, note: this.note,
      bodies: this.bodies.map((p) => this.bodyOf(p)), lagCap: LAG_CAP };
    return Object.assign(f, this.extra(viewerId));
  }
  bodyOf(p) { return { id: p.id, x: p.x, y: p.y, alive: p.alive, caught: false, points: this.points[p.id] || 0 }; }
  extra() { return {}; }
  gameView(id) { return { ...this.frame(id), inputSeq: this.inputs.get(id)?.seq || 0, cmdSeq: this.cmd.get(id) || 0 }; }
  publicPlayer(p) { return { pts: this.points?.[p.id] || 0, eliminated: this.bodies.find((b) => b.id === p.id)?.alive === false }; }
  onAbort() { super.onAbort(); this.rs = new Map(); this.lag.clear(); this.cmd.clear(); }
  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}

// ======================================================================================
// Geschenkfänger – jeder fängt für sich, alle sehen denselben Fall (gleicher Seed).
export class GiftRoom extends ArcadeRoom {
  static KIND = 'gift';
  static OPTIONS = [{ ...SECS, min: 10, max: 180 }, { key: 'golden', label: 'Goldene Geschenke', type: 'bool' }, { key: 'shrink', label: 'Korb wird mit jeder Bombe kleiner', type: 'bool' }];
  defaultSettings() { return { playSecs: 30, golden: false, shrink: false }; }
  setup() {
    this.items = makeItems(this.seed, this.secs, this.settings.golden);
    const gap = Math.min(110, 760 / this.bodies.length);
    this.bodies.forEach((p, i) => { p.x = Math.round(450 + (i - (this.bodies.length - 1) / 2) * gap); });
    for (const p of this.bodies) { p.y = GIFT.floor; p.w = GIFT.basket; p.hit = 0; p.done = new Set(); p.recent = []; p.caughtN = 0; }
  }
  advance_() {
    const now = this.elapsed, before = now - STEP_MS;
    for (const p of this.bodies) {
      const input = this.liveInput(p);
      if (input) p.x = clamp(p.x + input.x * GIFT.speed * STEP_MS / 1000, p.w / 2, ARENA.width - p.w / 2);
      p.recent = p.recent.filter((r) => now - r.at < 1200);
    }
    for (const item of this.items) {
      if (now - item.t0 > 4200) continue;
      if (!(giftY(item, before) < GIFT.floor && giftY(item, now) >= GIFT.floor)) continue; // genau der Schritt, in dem es die Korbhöhe erreicht
      for (const p of this.bodies) {
        if (p.done.has(item.id)) continue;
        p.done.add(item.id);
        if (Math.abs(item.x - p.x) > p.w / 2 + GIFT.margin) continue;
        const gain = GIFT_POINTS[item.kind];
        this.points[p.id] = Math.max(0, this.points[p.id] + gain);
        if (item.kind === 'bomb') { p.hit = now; if (this.settings.shrink) p.w = Math.max(GIFT.minBasket, p.w - 10); } else p.caughtN++;
        p.recent.push({ id: item.id, kind: item.kind, at: now, gain });
      }
    }
    if (now >= this.secs * 1000) this.finishArena('time');
  }
  bodyOf(p) { return { id: p.id, x: p.x, y: p.y, w: p.w, alive: true, caught: false, points: this.points[p.id] || 0, hit: p.hit || 0 }; }
  extra(viewerId) {
    const mine = this.bodies.find((p) => p.id === viewerId);
    return { items: this.items.filter((i) => this.elapsed - i.t0 <= 4200 && i.t0 <= this.elapsed + 250), fx: mine?.recent.map((r) => ({ ...r })) || [] };
  }
}

// ======================================================================================
// Rhythm-Rausch – der Server wertet jeden Tipp gegen den Notenzeitpunkt.
export class RhythmRoom extends ArcadeRoom {
  static KIND = 'rhythm';
  static OPTIONS = [{ ...SECS, min: 10, max: 180 }, { key: 'oneLane', label: 'Nur eine Bahn', type: 'bool' }, { key: 'fast', label: 'Schnelleres Tempo', type: 'bool' }];
  defaultSettings() { return { playSecs: 45, oneLane: false, fast: false }; }
  get lanes() { return this.settings.oneLane ? 1 : 4; }
  setup() {
    this.chart = makeChart(this.seed, this.secs, this.lanes, this.settings.fast);
    for (const p of this.bodies) this.rs.set(p.id, { judged: new Map(), cursor: 0, combo: 0, best: 0, perfect: 0, good: 0, ok: 0, miss: 0, stray: 0, taps: [], last: null, plan: new Map(), bot: 0 });
  }
  tapNote(id, { lane, at }) {
    if (!Number.isSafeInteger(lane) || lane < 0 || lane >= this.lanes || !Number.isFinite(at)) throw Error('Ungültiger Tipp');
    const state = this.rs.get(id), now = this.serverNow();
    state.taps = state.taps.filter((t) => now - t < 1000);
    if (state.taps.length >= TAP_RATE) throw Error('Zu viele Tipps auf einmal');
    state.taps.push(now);
    const when = clamp(at, now - this.lagOf(id), now); // nur selbst gemessene Verzögerung wird zurückgerechnet
    return this.judge(id, lane, when);
  }
  // Nächste noch ungewertete Note der Bahn im Zeitfenster; sonst ein Fehltipp.
  judge(id, lane, when) {
    const state = this.rs.get(id);
    let note = null, gap = Infinity;
    for (const n of this.chart) {
      if (n.t - when > NOTE_WINDOWS.ok) break;
      if (n.lane !== lane || state.judged.has(n.id)) continue;
      const d = Math.abs(n.t - when);
      if (d < gap) { gap = d; note = n; }
    }
    const grade = note && gradeOf(note.t - when);
    if (!grade) {
      state.stray++; state.combo = 0; this.points[id] = Math.max(0, this.points[id] - STRAY_PENALTY);
      state.last = { grade: 'stray', lane, at: this.elapsed };
      return { grade: 'stray' };
    }
    state.judged.set(note.id, grade); state[grade]++;
    if (grade === 'ok') { /* Serie bleibt, wächst aber nicht */ } else { state.combo++; state.best = Math.max(state.best, state.combo); }
    this.points[id] += NOTE_POINTS[grade] + (grade === 'ok' ? 0 : comboBonus(state.combo));
    state.last = { grade, lane, at: this.elapsed, dt: Math.round(when - note.t) };
    return { grade };
  }
  advance_() {
    const humans = this.humanOnline();
    for (const p of this.bodies) {
      const state = this.rs.get(p.id), person = this.players.get(p.id);
      if (humans && person?.bot) this.botTaps(p.id, state);
      // Verpasst erst, wenn auch ein verspäteter, ausgeglichener Tipp nicht mehr zählen könnte.
      while (state.cursor < this.chart.length && this.chart[state.cursor].t + NOTE_WINDOWS.ok + LAG_CAP < this.elapsed) {
        const note = this.chart[state.cursor++];
        if (!state.judged.has(note.id)) { state.judged.set(note.id, 'miss'); state.miss++; state.combo = 0; state.last = { grade: 'miss', lane: note.lane, at: this.elapsed }; }
      }
    }
    if (this.elapsed >= this.secs * 1000) this.finishArena('time');
  }
  // Bots tippen mit zufälliger Abweichung und gelegentlich gar nicht – dieselbe Wertung wie bei Menschen.
  botTaps(id, state) {
    while (state.bot < this.chart.length) {
      const note = this.chart[state.bot];
      let plan = state.plan.get(note.id);
      if (!plan) { const miss = this.rng() < .1; plan = { at: miss ? null : note.t + (this.rng() + this.rng() + this.rng() - 1.5) * 110 }; state.plan.set(note.id, plan); }
      if (plan.at !== null && plan.at > this.elapsed) break;
      state.bot++;
      if (plan.at !== null) this.judge(id, note.lane, plan.at);
    }
  }
  bodyOf(p) {
    const s = this.rs.get(p.id);
    return { id: p.id, x: 0, y: 0, alive: true, caught: false, points: this.points[p.id] || 0, combo: s?.combo || 0, best: s?.best || 0, perfect: s?.perfect || 0, miss: s?.miss || 0 };
  }
  extra(viewerId) {
    const s = this.rs.get(viewerId), lo = this.elapsed - NOTE_WINDOWS.ok - LAG_CAP - 300, hi = this.elapsed + NOTE_SHOW;
    const notes = this.chart.filter((n) => n.t >= lo && n.t <= hi).map((n) => ({ ...n, j: s?.judged.get(n.id)?.[0] || null }));
    return { lanes: this.lanes, notes, last: s?.last || null, windows: NOTE_WINDOWS };
  }
}

// ======================================================================================
// Stillgestanden! – Wettlauf; wer sich bei Rot (nach kurzer, latenzgerechter Gnadenfrist) bewegt, wird zurückgesetzt.
export class FreezeRoom extends ArcadeRoom {
  static KIND = 'freeze';
  static OPTIONS = [{ ...SECS, min: 20, max: 180 }, { key: 'returnToStart', label: 'Bei Rot zurück zum Start', type: 'bool' }, { key: 'fake', label: 'Fake-Signal (kurzes Rot ohne Strafe)', type: 'bool' }];
  defaultSettings() { return { playSecs: 90, returnToStart: true, fake: false }; }
  setup() {
    const n = this.bodies.length, gap = Math.min(96, 760 / n);
    this.bodies.forEach((p, i) => Object.assign(p, { x: Math.round(450 + (i - (n - 1) / 2) * gap), y: 540, prog: 0, stunUntil: 0, falls: 0, finishedAt: null, hitAt: -1 }));
    this.signal = { state: 'green', since: 0, until: 2500 + Math.floor(this.rng() * 1500), fake: false };
  }
  grace(id) { return FREEZE.graceBase + this.lagOf(id); }
  nextSignal() {
    const s = this.signal, r = this.rng;
    if (s.state === 'green') this.signal = { state: 'amber', since: this.elapsed, until: this.elapsed + FREEZE.amber, fake: false };
    else if (s.state === 'amber') {
      const fake = !!this.settings.fake && r() < .3;
      this.signal = { state: 'red', since: this.elapsed, until: this.elapsed + (fake ? FREEZE.fakeMs : 1400 + Math.floor(r() * 1400)), fake };
    } else this.signal = { state: 'green', since: this.elapsed, until: this.elapsed + 1800 + Math.floor(r() * 2700), fake: false };
  }
  advance_() {
    if (this.elapsed >= this.signal.until) this.nextSignal();
    const s = this.signal;
    for (const p of this.bodies) {
      if (p.finishedAt !== null) continue;
      const input = this.liveInput(p);
      if (!input || input.y !== -1 || this.elapsed < p.stunUntil) continue;
      if (s.state === 'red' && !s.fake && this.elapsed - s.since >= this.grace(p.id)) {
        p.falls++; p.hitAt = this.elapsed;
        if (this.settings.returnToStart) { p.prog = 0; p.stunUntil = this.elapsed + FREEZE.stunReturn; } else p.stunUntil = this.elapsed + FREEZE.stunSoft;
        continue;
      }
      p.prog = Math.min(1, p.prog + FREEZE.speed * STEP_MS / 1000);
      if (p.prog >= 1) p.finishedAt = this.elapsed;
    }
    for (const p of this.bodies) { p.y = 540 - p.prog * 480; this.points[p.id] = Math.round(p.prog * 100); }
    if (this.bodies.some((p) => p.finishedAt !== null)) this.finishArena('goal');
    else if (this.elapsed >= this.secs * 1000) this.finishArena('time');
  }
  pickWinners(reason) {
    const done = this.bodies.filter((p) => p.finishedAt !== null);
    if (done.length) { const first = Math.min(...done.map((p) => p.finishedAt)); return done.filter((p) => p.finishedAt === first).map((p) => p.id); }
    return super.pickWinners(reason, Math.max(0, ...this.roster.map((id) => this.score(id))));
  }
  resultText(winners, reason) { return !winners.length ? 'Niemand ist losgekommen – unentschieden.' : reason === 'goal' ? 'Das Ziel ist erreicht – wer zuerst da ist, gewinnt.' : 'Die Zeit ist um – der weiteste Lauf gewinnt.'; }
  bodyOf(p) { return { id: p.id, x: p.x, y: p.y, alive: true, caught: false, points: this.points[p.id] || 0, prog: p.prog, stun: Math.max(0, p.stunUntil - Math.max(0, this.elapsed)), falls: p.falls, hitAt: p.hitAt, done: p.finishedAt !== null }; }
  // Das Fake-Flag bleibt auf dem Server: Für alle Spieler ist es ein normales kurzes Rot.
  extra() { return { signal: this.signal.state, signalAt: this.signal.since, grace: this.settings.returnToStart ? 'start' : 'stun' }; }
}

// ======================================================================================
// Bomben-Duell – Raster, sichtbare Zündschnur, mehrere Runden.
export class BombRoom extends ArcadeRoom {
  static KIND = 'bomb';
  static OPTIONS = [{ key: 'playSecs', label: 'Sekunden pro Runde', type: 'number', min: 20, max: 180 }, { key: 'rounds', label: 'Anzahl Runden', type: 'number', min: 1, max: 5 }];
  defaultSettings() { return { playSecs: 75, rounds: 3 }; }
  setup() { this.total = this.settings.rounds; this.startBombRound(); }
  startBombRound() {
    this.elapsed = -COUNTDOWN_MS; this.inputs.clear();
    this.cells = makeGrid(Math.floor(this.rng() * 2 ** 31)); this.bombs = []; this.flames = new Map(); this.bombNo = 0; this.out = 0;
    this.bodies = this.roster.map((id, i) => {
      const [cx, cy] = SPAWNS[i % SPAWNS.length];
      return { id, alive: true, caught: false, ...cellCentre(cx, cy), cx, cy, moveAt: 0, bombs: 0, diedAt: -1 };
    });
  }
  placeBomb(body) {
    if (!body?.alive || this.elapsed < 0 || body.bombs >= 1 || this.bombs.some((b) => b.cx === body.cx && b.cy === body.cy)) return;
    this.bombs.push({ id: this.bombNo++, owner: body.id, cx: body.cx, cy: body.cy, at: this.elapsed, explodeAt: this.elapsed + BOMB.fuse });
    body.bombs++;
  }
  advance_() {
    const now = this.elapsed;
    for (const p of this.bodies) {
      const input = this.liveInput(p);
      if (!input || now < p.moveAt) continue;
      const dx = input.x, dy = dx ? 0 : input.y;
      if (!dx && !dy) continue;
      const nx = p.cx + dx, ny = p.cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID.cols || ny >= GRID.rows || this.cells[cellIndex(nx, ny)] !== 0 || this.bombs.some((b) => b.cx === nx && b.cy === ny)) continue;
      p.cx = nx; p.cy = ny; Object.assign(p, cellCentre(nx, ny)); p.moveAt = now + BOMB.move;
    }
    // Zündschnüre: abgelaufene Bomben und Ketten in einem Schritt auslösen.
    const queue = this.bombs.filter((b) => b.explodeAt <= now);
    while (queue.length) {
      const bomb = queue.pop();
      if (!this.bombs.includes(bomb)) continue;
      this.bombs.splice(this.bombs.indexOf(bomb), 1);
      const owner = this.bodies.find((p) => p.id === bomb.owner); if (owner) owner.bombs = Math.max(0, owner.bombs - 1);
      const { hit, crates } = blastCells(this.cells, bomb.cx, bomb.cy);
      for (const i of hit) this.flames.set(i, now + BOMB.flame);
      for (const i of crates) this.cells[i] = 0;
      for (const other of this.bombs) if (hit.includes(cellIndex(other.cx, other.cy))) queue.push(other);
    }
    for (const [i, until] of this.flames) if (until <= now) this.flames.delete(i);
    const dying = this.bodies.filter((p) => p.alive && this.flames.has(cellIndex(p.cx, p.cy)));
    for (const p of dying) { p.alive = false; p.diedAt = now; this.inputs.delete(p.id); }
    // Wer zusammen ausscheidet, bekommt dieselben Punkte: Zahl der vorher Ausgeschiedenen.
    for (const p of dying) this.points[p.id] += this.out;
    this.out += dying.length;
    const alive = this.bodies.filter((p) => p.alive).length;
    if (alive <= 1 || now >= this.secs * 1000) this.endBombRound();
  }
  endBombRound() {
    for (const p of this.bodies) if (p.alive) this.points[p.id] += this.out;
    this.q++;
    if (this.q >= this.total) return this.finishArena('rounds');
    this.note = { round: this.q, points: { ...this.points } };
    this.startBombRound();
  }
  resultText(winners) { return winners.length ? winners.length > 1 ? 'Gleichstand – die höchste Summe teilen sich mehrere.' : 'Nach allen Runden gewinnt die höchste Punktsumme.' : 'Niemand hat Punkte erzielt – unentschieden.'; }
  bodyOf(p) { return { id: p.id, x: p.x, y: p.y, cx: p.cx, cy: p.cy, alive: p.alive, caught: false, points: this.points[p.id] || 0 }; }
  extra() {
    return { cells: this.cells.join(''), bombs: this.bombs.map((b) => ({ ...b })), flames: [...this.flames].map(([i, until]) => [i, until]), grid: { ...GRID } };
  }
}

export const arcadeEvents = {
  steer: (room, p, data) => { room.input(p.id, data); return { frameOnly: true }; },
  arcTap: (room, p, data) => { room.tap(p.id, data); return { frameOnly: true }; },
  arcAct: (room, p, data) => { room.act(p.id, data); return { frameOnly: true }; },
};
export { mulberry32 };
