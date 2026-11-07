import { randomUUID } from 'node:crypto';
import { TurnRoom } from '../../server/turn-room.js';
import { shuffle } from '../poker/engine/cards.js';
import { decide } from './bot.js';
import {
  dkDeck, handSize, sumPoints, legalCards, trickWinner, normalizeContract, scoreDeal, specialPoints, levelName, announceDeadline, base, effSuit, strength, cardName,
} from './rules.js';

const SERIES = [4, 8, 12, 16, 24].map((n) => ({ value: n, label: `${n} Spiele` }));
const SOLO_NAME = { queens: 'Damensolo', jacks: 'Bubensolo', plain: 'Fleischlos', c: 'Kreuzsolo', s: 'Piksolo', h: 'Herzsolo', d: 'Karosolo' };

export class Room extends TurnRoom {
  static OPTIONS = [
    { key: 'deals', label: 'Spiele pro Serie', type: 'select', values: SERIES },
    { key: 'nines', label: 'Mit Neunen (48 statt 40 Karten)', type: 'bool' },
    { key: 'schweine', label: 'Schweinchen (zwei Karo-Asse sind höchster Trumpf)', type: 'bool' },
    { key: 'turnTime', label: 'Zeit pro Entscheidung in Sekunden (0 = ohne)', type: 'number', min: 0, max: 300 },
  ];
  defaultSettings() { return { deals: 8, nines: true, schweine: false, turnTime: 60 }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 4, maxPlayers: 4 });
    this.reset();
    this.deckFactory = (nines) => shuffle(dkDeck(nines));
  }
  reset() {
    Object.assign(this, {
      base: [], pos: [], hands: {}, stage: null, res: null, contract: null, partyMap: {}, hochzeit: null, partner: null, schweineHolder: null,
      taken: {}, trickCount: {}, trick: [], lastTrick: null, soloist: null, tricksLog: [], played: [], turnId: null, levels: { re: 0, kontra: 0 }, annBy: { re: [], kontra: [] },
      totals: {}, dealNo: 0, lastDeal: null, revision: 0, dealKey: null,
    });
  }

  validateStart(ids) { if (ids.length !== 4) throw new Error('Doppelkopf braucht genau vier Spieler'); }
  get N() { return handSize(this.settings.nines); }
  get currentId() {
    if (this.phase !== 'playing') return null;
    if (this.stage === 'reserve') return this.pos[this.res.i];
    return this.stage === 'play' ? this.turnId : null;
  }
  setupRound() {
    this.reset();
    this.base = [...this.order];
    this.totals = Object.fromEntries(this.order.map((id) => [id, 0]));
    this.beginDeal();
  }
  onTurnStart() {}
  beginDeal() {
    this.dealNo++; this.dealKey = randomUUID(); this.revision++;
    const n = (this.dealNo - 1) % 4;
    this.pos = [0, 1, 2, 3].map((i) => this.base[(n + i) % 4]); // Vorhand … Geber
    const deck = this.deckFactory(this.settings.nines), full = dkDeck(this.settings.nines), size = this.N;
    if (deck.length !== full.length || new Set(deck).size !== full.length || deck.some((c) => !full.includes(c))) throw new Error('Ungültiges Doppelkopfblatt');
    this.hands = Object.fromEntries(this.pos.map((id, i) => [id, deck.slice(i * size, (i + 1) * size)]));
    this.taken = Object.fromEntries(this.pos.map((id) => [id, []])); this.trickCount = Object.fromEntries(this.pos.map((id) => [id, 0]));
    this.trick = []; this.lastTrick = null; this.tricksLog = []; this.played = []; this.contract = null; this.partyMap = {}; this.hochzeit = null; this.partner = null;
    this.schweineHolder = null; this.levels = { re: 0, kontra: 0 }; this.annBy = { re: [], kontra: [] };
    this.stage = 'reserve'; this.res = { i: 0, calls: {} };
    this.acts = {}; this.moves = [];
    this.say(`Spiel ${this.dealNo} von ${this.settings.deals}`, 'hand');
    this.turn = this.order.indexOf(this.currentId);
  }

  check(id, d, stage) {
    if (this.gamePaused) throw new Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing' || !this.order.includes(id)) throw new Error('Du spielst nicht in dieser Partie');
    if (!d || d.key !== this.dealKey) throw new Error('Dieses Spiel ist nicht mehr aktuell');
    if (this.stage !== stage) throw new Error('Das geht gerade nicht');
    if (this.currentId !== id) throw new Error('Du bist nicht dran');
    if (d.revision !== this.revision) throw new Error('Dieser Spielstand ist nicht mehr aktuell');
  }
  bump(id, text) { this.revision++; if (text) this.act(id, text); const at = this.order.indexOf(this.currentId); if (at >= 0) this.turn = at; }

  // ---------- Vorbehalt: gesund, Hochzeit oder Solo ----------
  reserve(id, d) {
    this.check(id, d, 'reserve');
    const choice = d.choice, hand = this.hands[id];
    if (choice === 'healthy') this.res.calls[id] = 'healthy';
    else if (choice === 'hochzeit') {
      if (hand.filter((c) => base(c) === 'Qc').length !== 2) throw new Error('Eine Hochzeit braucht beide Kreuz-Damen');
      this.res.calls[id] = 'hochzeit'; this.hochzeit = id;
    } else {
      const contract = normalizeContract({ kind: 'solo', solo: choice });
      this.res.calls[id] = choice;
      this.soloist = id; this.contract = contract;
      this.act(id, SOLO_NAME[choice]);
      return this.beginPlay();
    }
    this.act(id, choice === 'healthy' ? 'gesund' : 'Hochzeit');
    if (++this.res.i >= 4) return this.beginPlay();
    this.bump(null, null);
  }

  beginPlay() {
    if (!this.contract) this.contract = normalizeContract({ kind: this.hochzeit ? 'hochzeit' : 'normal' });
    const c = this.contract;
    if (this.settings.schweine && c.kind !== 'solo') {
      const holder = this.pos.find((id) => this.hands[id].filter((x) => base(x) === 'Ad').length === 2);
      if (holder) { c.schweine = true; this.schweineHolder = holder; this.say(`${this.name(holder)} hat Schweinchen`, 'hand'); }
    }
    if (c.kind === 'solo') {
      this.partyMap = Object.fromEntries(this.pos.map((id) => [id, id === this.soloist ? 're' : 'kontra']));
      this.say(`${this.name(this.soloist)} spielt ${SOLO_NAME[c.solo]}`, 'hand');
    } else if (c.kind === 'hochzeit') {
      this.partyMap = { [this.hochzeit]: 're' };
      this.say(`${this.name(this.hochzeit)} spielt Hochzeit – der Partner wird in den ersten drei Stichen gefunden`, 'hand');
    } else this.partyMap = Object.fromEntries(this.pos.map((id) => [id, this.hands[id].some((x) => base(x) === 'Qc') ? 're' : 'kontra']));
    this.stage = 'play'; this.res = null;
    this.turnId = c.kind === 'solo' ? this.soloist : this.pos[0];
    this.bump(null, null);
  }

  // ---------- Ansagen ----------
  nextAnnounce(id) {
    if (this.stage !== 'play' || this.currentId !== id) return 0;
    const party = this.partyMap[id];
    if (!party) return 0;
    const level = this.levels[party] + 1;
    return level <= 5 && this.hands[id].length >= announceDeadline(this.N, level) ? level : 0;
  }
  announce(id, d) {
    this.check(id, d, 'play');
    const level = this.nextAnnounce(id);
    if (!level || d.level !== level) throw new Error('Diese Ansage ist jetzt nicht möglich');
    const party = this.partyMap[id];
    this.levels[party] = level; this.annBy[party].push(id);
    this.bump(id, `sagt ${levelName(party, level)}`);
    this.say(`${this.name(id)}: ${levelName(party, level)}!`, 'hand');
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
    if (this.trick.length < 4) { this.turnId = this.pos[(this.pos.indexOf(id) + 1) % 4]; this.turn = this.order.indexOf(this.turnId); return; }
    const winner = trickWinner(this.trick, this.contract), cards = this.trick.map((p) => p.card), points = sumPoints(cards);
    this.taken[winner].push(...cards); this.trickCount[winner]++;
    this.tricksLog.push({ plays: this.trick.map((p) => ({ ...p })), winner, points });
    this.lastTrick = { winner, cards: this.trick.map((p) => ({ ...p })), points };
    this.trick = []; this.turnId = winner; this.turn = this.order.indexOf(winner);
    this.resolveHochzeit(winner);
    if (this.pos.every((p) => !this.hands[p].length)) this.finishDeal();
  }
  get partnerResolved() { return this.contract.kind !== 'hochzeit' || !!this.partner || this.tricksLog.length >= 3; }
  resolveHochzeit(winner) {
    if (this.contract.kind !== 'hochzeit' || this.partner) return;
    if (winner !== this.hochzeit) {
      this.partner = winner; this.partyMap[winner] = 're';
      for (const id of this.pos) this.partyMap[id] ||= 'kontra';
      this.say(`${this.name(winner)} wird Partner von ${this.name(this.hochzeit)} (Re)`, 'hand');
    } else if (this.tricksLog.length >= 3) {
      for (const id of this.pos) this.partyMap[id] ||= 'kontra';
      this.say(`${this.name(this.hochzeit)} findet keinen Partner und spielt allein`, 'hand');
    }
  }

  finishDeal() {
    const k = this.contract, re = this.pos.filter((id) => this.partyMap[id] === 're'), kontra = this.pos.filter((id) => this.partyMap[id] === 'kontra');
    const sum = (ids) => ids.reduce((n, id) => n + sumPoints(this.taken[id]), 0), cnt = (ids) => ids.reduce((n, id) => n + this.trickCount[id], 0);
    const points = { re: sum(re), kontra: sum(kontra) }, tricks = { re: cnt(re), kontra: cnt(kontra) };
    const specials = specialPoints(this.tricksLog, (id) => this.partyMap[id], k);
    const result = scoreDeal({ contract: k, re, kontra, points, tricks, levels: { ...this.levels }, specials });
    for (const id of this.pos) this.totals[id] += result.per[id] || 0;
    this.say(result.winner ? `${result.winner === 're' ? 'Re' : 'Kontra'} gewinnt (${points.re} : ${points.kontra} Augen)` : 'Unentschieden – beide Ansagen verfehlt', 'win');
    this.lastDeal = {
      no: this.dealNo, contract: structuredClone(k), re, kontra, points, tricks, levels: { ...this.levels }, specials: specials.list, specialsRe: specials.re, specialsKontra: specials.kontra,
      winner: result.winner, gamePoints: result.gamePoints, value: result.value, detail: result.detail, solo: result.solo, per: result.per,
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
  onTimeout(id) {
    if (!id) return;
    const action = decide(this.gameView(id), id, 'medium', () => 0.99);
    if (action.method === 'announce') { this.play(id, { key: this.dealKey, revision: this.revision, card: this.allowed(id)[0] }); return; }
    this[action.method](id, ...action.args);
  }
  timerActive() { return this.stage === 'reserve' || this.stage === 'play'; }

  // ---------- Ansichten ----------
  // Öffentlich bekannte Parteien: Ansager, Solist, Hochzeit-Paar und alle, die eine Kreuz-Dame gespielt haben
  knownParties() {
    const out = {};
    if (!this.contract) return out;
    for (const party of ['re', 'kontra']) for (const id of this.annBy[party]) out[id] = party;
    if (this.contract.kind !== 'solo') for (const p of this.played) if (base(p.card) === 'Qc') out[p.id] = 're';
    if (this.contract.kind === 'solo') out[this.soloist] = 're';
    if (this.contract.kind === 'hochzeit') { out[this.hochzeit] = 're'; if (this.partner) out[this.partner] = 're'; }
    return out;
  }
  publicPlayer(p) {
    const known = this.knownParties();
    return {
      cards: this.hands[p.id]?.length || 0, tricks: this.trickCount[p.id] || 0, matchPoints: this.totals[p.id] || 0,
      seatName: this.pos.length ? ['Vorhand', 'Mittelhand', 'Rückhand', 'Geber'][this.pos.indexOf(p.id)] || null : null,
      party: known[p.id] || null,
    };
  }
  gameView(id) {
    const over = this.stage === 'deal-over' || this.stage === 'match-over';
    return {
      stage: this.stage, key: this.dealKey, dealKey: this.dealKey, revision: this.revision, dealNo: this.dealNo, deals: this.settings.deals,
      nines: !!this.settings.nines, handSize: this.N, pos: [...this.pos], reserve: this.res ? { current: this.pos[this.res.i], calls: { ...this.res.calls } } : null,
      hand: this.hands[id] ? [...this.hands[id]] : null, legal: this.allowed(id),
      sortKeys: this.hands[id] ? Object.fromEntries(this.hands[id].map((c) => [c, [effSuit(c, this.contract || { kind: 'normal' }), strength(c, this.contract || { kind: 'normal' })]])) : null,
      contract: this.contract ? { ...this.contract } : null, soloist: this.contract?.kind === 'solo' ? this.soloist : null, hochzeit: this.contract?.kind === 'hochzeit' ? this.hochzeit : null,
      partner: this.partner, schweine: this.schweineHolder,
      myParty: this.partyMap[id] ?? (this.stage === 'reserve' && this.hands[id] ? (this.hands[id].some((c) => base(c) === 'Qc') ? 're' : 'kontra') : null),
      known: this.knownParties(), levels: { ...this.levels }, annBy: { re: [...this.annBy.re], kontra: [...this.annBy.kontra] }, canAnnounce: this.nextAnnounce(id),
      hasBothQueens: !!this.hands[id] && this.hands[id].filter((c) => base(c) === 'Qc').length === 2,
      trick: this.trick.map((p) => ({ ...p })), lastTrick: this.lastTrick ? structuredClone(this.lastTrick) : null, played: this.played.map((p) => ({ ...p })),
      tricks: { ...this.trickCount }, trickNo: this.tricksLog.length, totals: { ...this.totals },
      lastDeal: over && this.lastDeal ? structuredClone(this.lastDeal) : null,
    };
  }
  onAbort() { this.reset(); }
  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}
