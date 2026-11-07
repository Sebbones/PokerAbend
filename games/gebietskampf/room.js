// Gebietskampf: Raum (Plattform-Anbindung). Alle Regeln stehen in rules.js; hier laufen Zugprüfung, Verlauf, Bots und Speichern.
import { TurnRoom } from '../../server/turn-room.js';
import * as R from './rules.js';
import { TERRITORIES, MAPS, mapView } from './map.js';
import { strategy, fallback } from './bot.js';

const tname = (t) => TERRITORIES[t]?.name ?? '?';
const int = (v) => (typeof v === 'number' ? v : Number(v));

export class Room extends TurnRoom {
  static OPTIONS = [
    { key: 'map', label: 'Karte', type: 'select', values: [{ value: 'full', label: 'Meridia – 42 Gebiete (lang)' }, { value: 'small', label: 'Klein-Meridia – 28 Gebiete (schnell)' }] },
    { key: 'mode', label: 'Siegbedingung', type: 'select', values: [{ value: 'world', label: 'Weltherrschaft' }, { value: 'mission', label: 'Geheime Missionen' }] },
    { key: 'cardBonus', label: 'Kartentausch-Bonus', type: 'select', values: [{ value: 'rising', label: 'Steigend (4, 6, 8, 10 …)' }, { value: 'fixed', label: 'Fest (6 Truppen)' }] },
    { key: 'turnTime', label: 'Zeit pro Zug in Sekunden (0 = ohne)', type: 'number', min: 0, max: 600 },
  ];
  defaultSettings() { return { map: 'full', mode: 'world', cardBonus: 'rising', turnTime: 180 }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 2, maxPlayers: 6, scoreLabel: 'Siege', winPoints: 1 });
    this.s = null; this.rng = Math.random;
    this.persistMidGame = true; // lange Partie: der Spielstand wird auch mitten im Spiel gespeichert (rooms.json)
  }
  setupRound() {
    this.s = R.newGame({ players: this.order, mapId: this.settings.map, mode: this.settings.mode, cardBonus: this.settings.cardBonus }, this.rng);
    this.say(`Karte: ${MAPS[this.settings.map].label} · ${this.settings.mode === 'mission' ? 'Geheime Missionen' : 'Weltherrschaft'}`);
  }
  onTurnStart() {
    if (this.phase !== 'playing' || !this.s) return;
    R.startTurn(this.s, this.currentId);
    this.s.turnNo = (this.s.turnNo || 0) + 1;
  }
  onAbort() { this.s = null; }
  onDropOut(p) {
    const s = this.s;
    if (!s || s.eliminated.includes(p.id)) return;
    // Wer geht, hinterlässt neutrale Gebiete (Truppen bleiben stehen und können erobert werden)
    s.eliminated.push(p.id);
    for (const t of R.ownedBy(s, p.id)) s.owners[t] = null;
    s.discard.push(...(s.hands[p.id] || [])); s.hands[p.id] = [];
  }
  timerActive() { return !!this.s; }
  resetGame() { this.s = null; }

  // ---------- Züge ----------
  guard(id) { this.requireTurn(id); return this.s; }
  gkPlace(id, d = {}) {
    const s = this.guard(id), t = int(d.t), n = int(d.n);
    R.place(s, id, t, n);
    this.act(id, `+${n} ${tname(t)}`);
  }
  gkTrade(id, d = {}) {
    const s = this.guard(id), r = R.trade(s, id, (d.cards || []).map(int));
    this.act(id, `tauscht Karten: +${r.value} Truppen`);
    this.say(`${this.name(id)} tauscht einen Kartensatz gegen ${r.value} Truppen${r.bonusOn !== null ? ` (+2 auf ${tname(r.bonusOn)})` : ''}`, 'cards');
  }
  gkNext(id) {
    const s = this.guard(id);
    if (s.stage === 'reinforce') { R.toAttack(s, id); this.act(id, 'beginnt den Angriff'); }
    else if (s.stage === 'attack') { R.toFortify(s, id); this.act(id, 'verschiebt Truppen'); }
    else throw new Error('Es gibt keinen nächsten Schritt');
  }
  gkAttack(id, d = {}) {
    const s = this.guard(id), from = int(d.from), to = int(d.to);
    let result = null, rounds = 0, atk = 0, def = 0;
    const dice = (cur) => Math.min(int(d.dice) || 3, s.armies[cur] - 1);
    do {
      result = R.attack(s, id, from, to, d.blitz ? Math.min(3, s.armies[from] - 1) : dice(from), this.rng);
      rounds++; atk += result.atkLoss; def += result.defLoss;
    } while (d.blitz && !result.conquered && s.armies[from] >= 2 && rounds < 200);
    const defender = result.defender ? this.name(result.defender) : 'Neutral';
    this.act(id, `${tname(from)} → ${tname(to)}${result.conquered ? ' ✓' : ''}`, { att: result.att, def: result.def });
    this.say(`${this.name(id)} greift ${tname(to)} (${defender}) von ${tname(from)} an: ${result.att.join('-')} gegen ${result.def.join('-')}${rounds > 1 ? ` (Blitz, ${rounds} Würfe)` : ''} – Verluste ${atk}:${def}${result.conquered ? ' – erobert!' : ''}`, 'action');
    if (result.eliminated) this.eliminated(id, result.eliminated);
    if (this.phase === 'playing') this.checkWin(id);
  }
  gkOccupy(id, d = {}) {
    const s = this.guard(id), n = R.occupy(s, id, int(d.n));
    this.act(id, n ? `zieht ${n} nach` : 'zieht nicht nach');
    this.checkWin(id);
  }
  gkFortify(id, d = {}) {
    const s = this.guard(id), from = int(d.from), to = int(d.to), n = int(d.n);
    R.fortify(s, id, from, to, n);
    this.act(id, `${n} ${tname(from)} → ${tname(to)}`);
    this.finishTurn(id);
  }
  gkEnd(id) { this.guard(id); this.finishTurn(id); }
  finishTurn(id) {
    const card = R.endTurn(this.s, id, this.rng);
    if (card) this.say(`${this.name(id)} zieht eine Karte`, 'cards');
    if (this.checkWin(id)) return;
    this.act(id, 'beendet den Zug');
    this.next();
  }
  eliminated(by, victim) {
    this.say(`${this.name(victim)} ist ausgeschieden – ${this.name(by)} übernimmt die Karten`, 'warn');
    if (R.alive(this.s).length <= 1) { this.checkWin(by); return; }
    this.dropOut(this.players.get(victim), null);
  }
  checkWin(actor) {
    if (this.phase !== 'playing') return true;
    const w = R.winner(this.s, actor);
    if (!w) return false;
    const text = w.by === 'mission' ? `${this.name(w.id)} erfüllt die Mission und gewinnt.` : `${this.name(w.id)} beherrscht Meridia und gewinnt.`;
    this.finishRound([w.id], text, { [w.id]: 1 });
    return true;
  }
  // Zeit abgelaufen: der Zug wird sicher zu Ende gespielt (Verstärkung auf das erste Gebiet, kein Angriff)
  onTimeout(id) {
    for (let i = 0; i < 12 && this.phase === 'playing' && this.currentId === id; i++) this.apply(id, fallback({ game: 'gebietskampf', id, g: this.gameView(id) }));
  }
  apply(id, a) { return this[a.method](id, ...a.args); }
  botStep(id, rng = Math.random) { return this.apply(id, strategy({ game: 'gebietskampf', id, g: this.gameView(id) }, 'medium', { rng })); }

  // ---------- Ansichten ----------
  publicPlayer(p) {
    const s = this.s;
    if (!s || !s.players.includes(p.id)) return {};
    return { color: s.players.indexOf(p.id), terr: R.ownedBy(s, p.id).length, troops: R.totalArmies(s, p.id), cards: s.hands[p.id].length, out: s.eliminated.includes(p.id) };
  }
  gameView(id) {
    const s = this.s, mine = s.players.includes(id);
    const hand = mine ? s.hands[id] : [], cur = this.currentId, myTurn = cur === id && this.phase === 'playing';
    const sets = myTurn ? R.findSets(hand, (t) => s.owners[t] === id) : [];
    const mission = mine && s.missions ? R.missionText(s, id, (p) => this.name(p)) : null;
    return {
      me: id, map: mapView(s.mapId), mode: s.mode, cardBonus: s.cardBonus,
      owners: { ...s.owners }, armies: { ...s.armies }, order: [...this.order], colors: Object.fromEntries(s.players.map((p, i) => [p, i])),
      stage: s.stage, reserve: s.reserve, conquered: s.conquered, attacks: s.attacks, turnNo: s.turnNo,
      pending: s.pending ? { ...s.pending } : null,
      last: s.last, hand: mine ? hand.map((c) => ({ ...c })) : null,
      needTrade: myTurn && R.needTrade(s, id), canTrade: myTurn && (s.stage === 'reinforce' || R.needTrade(s, id)) && !s.pending,
      sets, nextTrade: R.tradeValue(s.tradeCount, s.cardBonus), tradeCount: s.tradeCount,
      mission: mission ? { ...mission, done: R.missionDone(s, id) } : null,
      reinforcement: myTurn ? R.reinforcementParts(s, id) : null, deck: s.deck.length + s.discard.length,
    };
  }

  // ---------- Speichern: auch mitten im Spiel ----------
  saveExtra() {
    return this.s && this.phase !== 'lobby' ? { s: this.s, order: this.order, turn: this.turn, phase: this.phase, roundPlayers: this.roundPlayers, result: this.result, moveNo: this.moveNo } : null;
  }
  loadExtra(x) {
    if (!x?.s) return;
    this.s = x.s; this.order = x.order || []; this.turn = x.turn || 0; this.phase = x.phase === 'over' ? 'over' : 'playing';
    this.roundPlayers = x.roundPlayers || [...this.order]; this.result = x.result || null; this.moveNo = x.moveNo || 0;
  }
  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}
