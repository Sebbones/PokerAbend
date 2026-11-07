import { randomUUID } from 'node:crypto';
import { TurnRoom } from '../../server/turn-room.js';
import { shuffle } from '../poker/engine/cards.js';
import { decide } from './bot.js';
import {
  BIDS, skatDeck, sumPoints, legalCards, trickWinner, normalizeGame, evaluateGame, scoreGame, scoreRamsch, triggersBock, cardName,
} from './rules.js';

const SERIES = [3, 6, 12, 24, 36].map((n) => ({ value: n, label: `${n} Spiele` }));

export class Room extends TurnRoom {
  static OPTIONS = [
    { key: 'deals', label: 'Spiele pro Serie', type: 'select', values: SERIES },
    { key: 'ramsch', label: 'Ramsch, wenn alle passen', type: 'bool' },
    { key: 'bock', label: 'Bockrunden', type: 'bool' },
    { key: 'turnTime', label: 'Zeit pro Entscheidung in Sekunden (0 = ohne)', type: 'number', min: 0, max: 300 },
  ];
  defaultSettings() { return { deals: 12, ramsch: false, bock: false, turnTime: 60 }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 3, maxPlayers: 3 });
    this.reset();
    this.deckFactory = () => shuffle(skatDeck());
  }
  reset() {
    Object.assign(this, {
      base: [], pos: [], hands: {}, skat: [], pressed: [], stage: null, bd: null, passed: [], declarer: null, bidValue: 0, contract: null, isHand: false,
      origCards: [], trick: [], lastTrick: null, taken: {}, tricks: {}, played: [], leader: null, turnId: null, totals: {}, dealNo: 0, bockLeft: 0, bockNow: false,
      lastDeal: null, revision: 0, dealKey: null,
    });
  }

  validateStart(ids) { if (ids.length !== 3) throw new Error('Skat braucht genau drei Spieler'); }
  get currentId() {
    if (this.phase !== 'playing') return null;
    switch (this.stage) {
      case 'bid': return this.bd.phase === 'call' ? this.bd.caller : this.bd.listener;
      case 'ramschChoice': return this.pos[0];
      case 'pickup': case 'discard': case 'declare': return this.declarer;
      case 'play': return this.turnId;
      default: return null;
    }
  }
  setupRound() {
    this.reset();
    this.base = [...this.order];
    this.totals = Object.fromEntries(this.order.map((id) => [id, 0]));
    this.beginDeal();
  }
  onTurnStart() {}
  beginDeal() {
    this.dealNo++;
    this.dealKey = randomUUID(); this.revision++;
    const n = (this.dealNo - 1) % 3;
    this.pos = [this.base[n], this.base[(n + 1) % 3], this.base[(n + 2) % 3]]; // Vorhand, Mittelhand, Hinterhand (= Geber)
    const deck = this.deckFactory();
    if (deck.length !== 32 || new Set(deck).size !== 32 || deck.some((c) => !skatDeck().includes(c))) throw new Error('Ungültiges Skatblatt');
    this.hands = Object.fromEntries(this.pos.map((id, i) => [id, deck.slice(i * 10, i * 10 + 10)]));
    this.skat = deck.slice(30); this.pressed = [];
    this.taken = Object.fromEntries(this.pos.map((id) => [id, []])); this.tricks = Object.fromEntries(this.pos.map((id) => [id, 0]));
    this.trick = []; this.lastTrick = null; this.played = []; this.declarer = null; this.bidValue = 0; this.contract = null; this.isHand = false; this.origCards = [];
    this.bockNow = !!this.settings.bock && this.bockLeft > 0;
    if (this.bockNow) this.bockLeft--;
    this.stage = 'bid'; this.passed = [];
    this.bd = { caller: this.pos[1], listener: this.pos[0], value: 0, phase: 'call', round: 1 };
    this.acts = {}; this.moves = [];
    this.say(`Spiel ${this.dealNo} von ${this.settings.deals}${this.bockNow ? ' · Bockrunde (doppelte Punkte)' : ''}`, 'hand');
    this.turn = this.order.indexOf(this.currentId);
  }

  // ---------- Prüfungen ----------
  check(id, d, stage) {
    if (this.gamePaused) throw new Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing' || !this.order.includes(id)) throw new Error('Du spielst nicht in dieser Partie');
    if (!d || d.key !== this.dealKey) throw new Error('Dieses Spiel ist nicht mehr aktuell');
    if (this.stage !== stage) throw new Error('Das geht gerade nicht');
    if (this.currentId !== id) throw new Error('Du bist nicht dran');
    if (d.revision !== this.revision) throw new Error('Dieser Spielstand ist nicht mehr aktuell');
  }

  // ---------- Reizen ----------
  bid(id, d) {
    this.check(id, d, 'bid');
    const b = this.bd, action = d.action;
    if (b.phase === 'call') {
      if (action === 'pass') { this.passed.push(id); this.act(id, 'passt'); return this.duelDone(b.listener); }
      if (action !== 'bid') throw new Error('Reize einen Wert oder passe');
      const value = Number(d.value);
      if (!BIDS.includes(value) || value <= b.value) throw new Error('Das Gebot muss höher sein als das letzte');
      b.value = value; b.phase = 'respond';
      return this.bump(id, `reizt ${value}`);
    }
    if (action === 'hold') { b.phase = 'call'; return this.bump(id, `hält ${b.value}`); }
    if (action !== 'pass') throw new Error('Halte das Gebot oder passe');
    this.passed.push(id); this.act(id, 'passt');
    this.duelDone(b.caller);
  }
  duelDone(winner) {
    const b = this.bd;
    if (b.round === 1) { this.bd = { caller: this.pos[2], listener: winner, value: b.value, phase: 'call', round: 2 }; return this.bump(null, null, true); }
    if (b.value === 0) { this.stage = 'ramschChoice'; return this.bump(null, null); }
    this.declarer = winner; this.bidValue = b.value; this.stage = 'pickup';
    this.say(`${this.name(winner)} spielt mit ${b.value}`, 'hand');
    this.bump(null, null);
  }
  bump(id, text) { this.revision++; if (text) this.act(id, text); const at = this.order.indexOf(this.currentId); if (at >= 0) this.turn = at; }

  ramschChoice(id, d) {
    this.check(id, d, 'ramschChoice');
    if (d.play) { this.declarer = id; this.bidValue = 18; this.stage = 'pickup'; return this.bump(id, 'spielt selbst'); }
    if (this.settings.ramsch) {
      this.contract = { type: 'ramsch' }; this.stage = 'play'; this.turnId = this.pos[0]; this.leader = this.pos[0];
      this.say('Alle passen – Ramsch', 'hand');
      return this.bump(id, 'Ramsch');
    }
    this.act(id, 'wirft ein');
    this.say('Alle passen – eingeworfen, neu gegeben', 'hand');
    this.lastDeal = { no: this.dealNo, thrownIn: true, points: {}, game: null };
    this.afterDeal();
  }

  // ---------- Skat und Spielansage ----------
  pickup(id, d) {
    this.check(id, d, 'pickup');
    if (d.take) { this.hands[id].push(...this.skat); this.stage = 'discard'; return this.bump(id, 'nimmt den Skat auf'); }
    this.isHand = true; this.stage = 'declare';
    this.bump(id, 'spielt Hand');
  }
  discard(id, d) {
    this.check(id, d, 'discard');
    const cards = d.cards;
    if (!Array.isArray(cards) || cards.length !== 2 || new Set(cards).size !== 2 || cards.some((c) => !this.hands[id].includes(c))) throw new Error('Drücke genau zwei eigene Karten');
    this.hands[id] = this.hands[id].filter((c) => !cards.includes(c)); this.pressed = [...cards]; this.stage = 'declare';
    this.bump(id, 'drückt zwei Karten');
  }
  declare(id, d) {
    this.check(id, d, 'declare');
    const game = normalizeGame(d.game, { hand: this.isHand });
    this.contract = game; this.origCards = this.isHand ? [...this.hands[id]] : [...this.hands[id], ...this.pressed];
    this.stage = 'play'; this.turnId = this.pos[0]; this.leader = this.pos[0];
    this.bump(id, describe(game));
  }

  // ---------- Stichspiel ----------
  allowed(id) { return this.stage === 'play' && this.currentId === id ? legalCards(this.hands[id], this.trick, this.contract) : []; }
  play(id, d) {
    this.check(id, d, 'play');
    const card = d.card;
    if (!this.allowed(id).includes(card)) throw new Error('Diese Karte ist nicht erlaubt – Farbe bzw. Trumpf bedienen');
    this.hands[id].splice(this.hands[id].indexOf(card), 1);
    this.trick.push({ id, card }); this.played.push({ id, card });
    this.revision++; this.act(id, `legt ${cardName(card)}`);
    if (this.trick.length < 3) { this.turnId = this.pos[(this.pos.indexOf(id) + 1) % 3]; this.turn = this.order.indexOf(this.turnId); return; }
    const winner = trickWinner(this.trick, this.contract), cards = this.trick.map((p) => p.card);
    this.taken[winner].push(...cards); this.tricks[winner]++;
    this.lastTrick = { winner, cards: this.trick.map((p) => ({ ...p })) };
    this.trick = []; this.turnId = winner; this.leader = winner; this.turn = this.order.indexOf(winner);
    const nullLost = this.contract.type === 'null' && winner === this.declarer;
    if (nullLost || this.pos.every((p) => !this.hands[p].length)) this.finishDeal(winner);
  }

  finishDeal(lastWinner) {
    const ids = [...this.pos], g = this.contract;
    let points, detail;
    if (g.type === 'ramsch') {
      const r = scoreRamsch(ids, this.taken, this.tricks, this.skat, lastWinner, this.bockNow);
      points = r.points; detail = { ramsch: true, augen: r.augen, march: r.march, losers: r.losers };
      this.say(r.march ? `${this.name(r.march)} geht durch` : `Ramsch verloren: ${r.losers.map((l) => this.name(l)).join(', ')}`, 'win');
    } else {
      const skatPoints = this.isHand ? this.skat : this.pressed;
      const augen = sumPoints(this.taken[this.declarer]) + sumPoints(skatPoints);
      const ev = evaluateGame(g, { cards: this.origCards, points: augen, tricks: this.tricks[this.declarer], bid: this.bidValue });
      points = scoreGame(ids, this.declarer, ev, this.bockNow);
      const bock = !!this.settings.bock && triggersBock(g, ev, augen);
      if (bock) this.bockLeft = Math.min(6, this.bockLeft + 3);
      detail = { eval: ev, augen, spitzen: ev.spitzen, bockTriggered: bock };
      this.say(`${this.name(this.declarer)} ${ev.won ? 'gewinnt' : ev.overbid ? 'hat sich überreizt und verliert' : 'verliert'} (${augen} Augen)`, 'win');
    }
    for (const id of ids) this.totals[id] += points[id] || 0;
    this.lastDeal = {
      no: this.dealNo, game: structuredClone(g), declarer: this.declarer, bid: this.bidValue, points, bock: this.bockNow, hand: this.isHand,
      skat: [...(this.isHand || g.type === 'ramsch' ? this.skat : this.pressed)], ...detail,
    };
    this.afterDeal();
  }
  afterDeal() {
    this.stage = 'deal-over'; this.revision++;
    if (this.dealNo >= this.settings.deals) {
      const best = Math.max(...Object.values(this.totals));
      this.stage = 'match-over';
      this.finishRound(this.order.filter((id) => this.totals[id] === best), 'Serie beendet – die meisten Punkte gewinnen', { ...this.totals });
    }
  }
  nextDeal(id) {
    this.requireHost(id);
    if (this.gamePaused) throw new Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing' || this.stage !== 'deal-over') throw new Error('Dieses Spiel ist noch nicht beendet');
    this.beginDeal();
    this.act(id, 'Nächstes Spiel');
  }
  onDropOut(p) { this.order = this.order.filter((i) => i !== p.id); this.stage = 'match-over'; this.finishRound([], 'Serie wegen Aussteigen abgebrochen – keine Wertung'); }

  // ---------- Bots und Zeit ----------
  botDue() {
    if (this.phase !== 'playing') return null;
    const id = this.currentId;
    return id && this.players.get(id)?.bot ? id : null;
  }
  botStep(id, rng = Math.random) {
    const action = decide(this.gameView(id), id, 'medium', rng);
    return this[action.method](id, ...action.args);
  }
  onTimeout(id) { if (id) this.botStep(id); }
  timerActive() { return this.stage !== 'deal-over' && this.stage !== 'match-over'; }

  // ---------- Ansichten ----------
  publicPlayer(p) {
    return {
      cards: this.hands[p.id]?.length || 0, tricks: this.tricks[p.id] || 0, matchPoints: this.totals[p.id] || 0,
      seatName: this.pos.length ? ['Vorhand', 'Mittelhand', 'Hinterhand'][this.pos.indexOf(p.id)] || null : null,
      declarer: this.declarer === p.id, passed: this.passed.includes(p.id),
    };
  }
  gameView(id) {
    const mine = this.hands[id] ? [...this.hands[id]] : null;
    return {
      stage: this.stage, key: this.dealKey, dealKey: this.dealKey, revision: this.revision, dealNo: this.dealNo, deals: this.settings.deals,
      pos: [...this.pos], bd: this.bd && this.stage === 'bid' ? { ...this.bd } : null, bids: BIDS, passed: [...this.passed],
      declarer: this.declarer, bidValue: this.bidValue, game: this.contract ? { ...this.contract } : null, isHand: this.isHand,
      hand: mine, legal: this.allowed(id), pressed: this.declarer === id ? [...this.pressed] : null, skatCount: this.skat.length,
      open: this.contract?.ouvert && this.declarer && this.hands[this.declarer] ? [...this.hands[this.declarer]] : null,
      trick: this.trick.map((p) => ({ ...p })), lastTrick: this.lastTrick ? structuredClone(this.lastTrick) : null, played: this.played.map((p) => ({ ...p })),
      tricks: { ...this.tricks }, totals: { ...this.totals }, bock: { now: this.bockNow, left: this.bockLeft },
      ramsch: !!this.settings.ramsch, canPickup: this.stage === 'pickup' && this.declarer === id,
      lastDeal: this.lastDeal ? structuredClone(this.lastDeal) : null,
    };
  }
  onAbort() { this.reset(); }
  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}

export function describe(g) {
  if (g.type === 'null') return `Null${g.ouvert ? ' Ouvert' : ''}${g.hand ? ' Hand' : ''}`;
  const name = g.type === 'grand' ? 'Grand' : { d: 'Karo', h: 'Herz', s: 'Pik', c: 'Kreuz' }[g.suit];
  return `${name}${g.hand ? ' Hand' : ''}${g.ouvert ? ' Ouvert' : g.schwarz ? ' Schwarz angesagt' : g.schneider ? ' Schneider angesagt' : ''}`;
}
