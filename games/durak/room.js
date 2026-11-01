// Durak – russisches Angriffs- und Abwehrspiel für 2–6 mit 36 Karten (6 bis Ass). Wer am Ende Karten auf der Hand hat, ist der Durak.
// Jeder bekommt 6 Karten, die unterste Karte des Stapels (sie bleibt sichtbar liegen) bestimmt die Trumpffarbe.
// Der Angreifer legt eine Karte aus, der Verteidiger schlägt sie mit einer höheren Karte derselben Farbe oder mit Trumpf (Trumpf schlägt man nur mit höherem Trumpf).
// Weitere Angriffskarten dürfen der Angreifer und die übrigen Mitspieler (außer dem Verteidiger) legen, wenn ihr Wert schon auf dem Tisch liegt;
// höchstens 6 Karten und nicht mehr, als der Verteidiger auf der Hand hat. Wer nichts (mehr) legen kann oder will, sagt „Genug“.
// Ist alles geschlagen und niemand legt nach, kommen die Karten ab, und der Verteidiger greift als Nächster an. Kann oder will er nicht schlagen, nimmt er alle
// Karten auf (die anderen dürfen vorher noch Karten dazulegen) und setzt aus: der Nächste greift an. Danach wird auf 6 aufgefüllt, zuerst der Angreifer, der Verteidiger zuletzt.
// Ist der Stapel leer, scheidet aus, wer keine Karten mehr hat. Wer als Letzter Karten hat, ist der Durak; alle anderen bekommen einen Punkt.
import { TurnRoom } from '../../server/turn-room.js';
import { shuffle } from '../../server/random.js';

export const RANKS = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS = ['c', 'd', 'h', 's'];
export const HAND = 6;
export const deck36 = () => SUITS.flatMap((s) => RANKS.map((r) => r + s));
export const rankIdx = (c) => RANKS.indexOf(c[0]);

export class Room extends TurnRoom {
  static OPTIONS = [];
  defaultSettings() { return {}; }

  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 2, maxPlayers: 6, lowWins: false, scoreLabel: 'Siege' });
    this.resetTable();
  }
  resetTable() {
    this.deck = []; this.discard = []; this.hands = {}; this.board = [];
    this.trump = null; this.trumpCard = null;        // trumpCard: die Karte unten im Stapel (bis sie gezogen wird)
    this.attacker = null; this.defender = null;
    this.taking = false; this.passedAtk = new Set(); this.limit = HAND;
    this.out = new Set(); this.places = [];
  }

  beats(def, atk) {
    if (def[1] === atk[1]) return rankIdx(def) > rankIdx(atk);
    return def[1] === this.trump && atk[1] !== this.trump;
  }
  active() { return this.order.filter((id) => !this.out.has(id)); }
  // Nächster Spieler nach id, der noch im Spiel ist
  after(id) {
    const act = this.active();
    const i = this.order.indexOf(id);
    for (let k = 1; k <= this.order.length; k++) { const c = this.order[(i + k) % this.order.length]; if (act.includes(c)) return c; }
    return null;
  }
  // Wer dem Verteidiger Karten zuspielen darf, in der Reihenfolge: Angreifer, dann reihum
  candidates() {
    const list = [];
    let id = this.attacker;
    for (let k = 0; k < this.order.length; k++) {
      if (id && id !== this.defender && !this.out.has(id) && !list.includes(id)) list.push(id);
      id = this.after(id);
      if (!id) break;
    }
    return list;
  }
  undefended() { return this.board.filter((p) => !p.d).length; }
  ranksOnTable() { return new Set(this.board.flatMap((p) => [p.a[0], ...(p.d ? [p.d[0]] : [])])); }
  canAdd(id) {
    if (!this.hands[id]?.length) return false;
    if (this.board.length >= this.limit) return false;
    if (!this.taking && this.undefended() >= this.hands[this.defender].length) return false;
    if (this.taking && this.board.length >= this.limit) return false;
    if (!this.board.length) return true;
    const ranks = this.ranksOnTable();
    return this.hands[id].some((c) => ranks.has(c[0]));
  }

  setupRound() {
    this.resetTable();
    this.deck = shuffle(deck36(), this.rng); // this.rng: nur Tests setzen einen festen Zufall
    for (const id of this.order) this.hands[id] = this.deck.splice(-HAND);
    if (this.deck.length) { this.trumpCard = this.deck[0]; this.trump = this.deck[0][1]; }
    else this.trump = this.hands[this.order[this.order.length - 1]].at(-1)[1]; // bei 6 Spielern: die zuletzt gegebene Karte
    for (const id of this.order) this.sortHand(id);
    this.attacker = this.order[0];
    this.defender = this.after(this.attacker);
    this.say(`Trumpf: ${this.trumpText()} – ${this.name(this.attacker)} greift ${this.name(this.defender)} an`, 'cards');
  }
  trumpText() { return { c: 'Kreuz ♣', d: 'Karo ♦', h: 'Herz ♥', s: 'Pik ♠' }[this.trump]; }
  sortHand(id) {
    this.hands[id].sort((a, b) => (a[1] === this.trump) - (b[1] === this.trump) || SUITS.indexOf(a[1]) - SUITS.indexOf(b[1]) || rankIdx(a) - rankIdx(b));
  }

  // Wer jetzt etwas tun muss: der Verteidiger bei offenem Angriff, sonst der nächste Angreifer, der noch nicht „Genug“ gesagt hat
  get currentId() {
    if (this.phase !== 'playing') return null;
    if (this.undefended() && !this.taking) return this.defender;
    return this.candidates().find((id) => !this.passedAtk.has(id)) ?? null;
  }
  get current() { return this.players.get(this.currentId); }
  onTurnStart() {}

  // Zug des Spielers prüfen: automatisch „Genug“ für alle, die nichts mehr legen können; danach Abschluss, wenn alle durch sind
  settle() {
    for (let guard = 0; guard < 20 && this.phase === 'playing'; guard++) {
      if (this.undefended() && !this.taking) return; // der Verteidiger ist dran
      const cand = this.candidates().find((id) => !this.passedAtk.has(id));
      if (cand && this.board.length === 0) return; // der Angreifer muss ausspielen
      if (!cand) return this.endExchange();
      if (this.canAdd(cand)) return;
      this.passedAtk.add(cand);
    }
  }

  attack(id, card) {
    this.requireTurn(id);
    if (id === this.defender) throw new Error('Du verteidigst gerade');
    const hand = this.hands[id];
    if (!hand.includes(card)) throw new Error('Diese Karte hast du nicht');
    if (!this.board.length) { this.limit = Math.min(HAND, this.hands[this.defender].length); }
    else {
      if (!this.ranksOnTable().has(card[0])) throw new Error('Dieser Wert liegt noch nicht auf dem Tisch');
      if (this.board.length >= this.limit) throw new Error(`Höchstens ${this.limit} Karten in diesem Angriff`);
      if (!this.taking && this.undefended() >= this.hands[this.defender].length) throw new Error('So viele kann der Verteidiger nicht mehr schlagen');
    }
    this.hands[id] = hand.filter((c) => c !== card);
    this.board.push({ a: card, d: null, by: id });
    this.passedAtk.clear();
    this.say(`${this.name(id)} greift mit ${this.cardText(card)} an`, 'info', 'action');
    this.act(id, `greift an: ${this.cardText(card)}`);
    this.settle();
  }

  defend(id, card, index) {
    this.requireTurn(id);
    if (id !== this.defender || this.taking) throw new Error('Du verteidigst gerade nicht');
    const pair = this.board[Number(index)];
    if (!pair || pair.d) throw new Error('Diese Karte ist schon geschlagen');
    if (!this.hands[id].includes(card)) throw new Error('Diese Karte hast du nicht');
    if (!this.beats(card, pair.a)) throw new Error('Damit schlägst du die Karte nicht');
    this.hands[id] = this.hands[id].filter((c) => c !== card);
    pair.d = card;
    this.passedAtk.clear();
    this.say(`${this.name(id)} schlägt ${this.cardText(pair.a)} mit ${this.cardText(card)}`, 'info', 'action');
    this.act(id, `schlägt: ${this.cardText(card)}`);
    this.settle();
  }

  // Verteidiger gibt auf: alle bekommen noch die Chance, Karten dazuzulegen, dann nimmt er alles
  take(id) {
    this.requireTurn(id);
    if (id !== this.defender || this.taking) throw new Error('Du verteidigst gerade nicht');
    if (!this.undefended()) throw new Error('Es gibt nichts zu nehmen');
    this.taking = true;
    this.passedAtk.clear();
    this.say(`${this.name(id)} nimmt die Karten auf`, 'warn');
    this.act(id, 'nimmt auf');
    this.settle();
  }

  // „Genug“: ich lege nichts mehr nach
  pass(id) {
    this.requireTurn(id);
    if (id === this.defender) throw new Error('Du verteidigst gerade');
    if (!this.board.length) throw new Error('Du musst angreifen');
    this.passedAtk.add(id);
    this.act(id, 'genug');
    this.settle();
  }

  // Alle haben nichts mehr zuzulegen: Karten ab oder zum Verteidiger, auffüllen, Rollen wechseln
  endExchange() {
    const taken = this.taking;
    const def = this.defender;
    const cards = this.board.flatMap((p) => [p.a, ...(p.d ? [p.d] : [])]);
    if (taken) { this.hands[def].push(...cards); this.say(`${this.name(def)} hat ${cards.length} Karten aufgenommen`, 'info'); }
    else { this.discard.push(...cards); this.say(`Alles geschlagen – ${cards.length} Karten ab`, 'info'); }
    const cands = this.candidates();
    this.board = []; this.taking = false; this.passedAtk.clear();
    // Auffüllen: Angreifer zuerst, Verteidiger zuletzt
    for (const id of [...cands, def]) {
      while (this.hands[id].length < HAND && (this.deck.length || this.trumpCard)) {
        const c = this.deck.length ? this.deck.pop() : null;
        if (!c) break;
        this.hands[id].push(c);
        if (!this.deck.length) this.trumpCard = null; // die Trumpfkarte war die letzte
      }
      this.sortHand(id);
    }
    // Stapel leer: wer keine Karten hat, ist fertig
    if (!this.deck.length) for (const id of this.order) if (!this.out.has(id) && !this.hands[id].length) { this.out.add(id); this.places.push(id); this.say(`${this.name(id)} ist fertig`, 'win'); }
    const left = this.active();
    if (left.length <= 1) return this.finish(left[0] ?? null);
    // Wer greift als Nächster an?
    const next = taken ? this.after(def) : (this.out.has(def) ? this.after(def) : def);
    this.attacker = next;
    this.defender = this.after(next);
    this.moveNo++;
    this.say(`${this.name(this.attacker)} greift ${this.name(this.defender)} an`, 'cards');
    this.settle();
  }

  finish(durak) {
    const winners = this.order.filter((id) => id !== durak);
    const points = Object.fromEntries(winners.map((id) => [id, 1]));
    const text = durak ? `${this.name(durak)} ist der Durak` : 'Unentschieden – alle sind fertig';
    this.durak = durak;
    this.finishRound(winners, text, points);
  }

  cardText(c) { return `${c[0] === 'T' ? '10' : c[0]}${{ c: '♣', d: '♦', h: '♥', s: '♠' }[c[1]]}`; }

  onDropOut(p) {
    this.discard.push(...(this.hands[p.id] || []));
    delete this.hands[p.id];
    this.out.delete(p.id);
  }
  // Wer geht, beendet den laufenden Angriff: die Karten auf dem Tisch kommen ab, die Rollen werden neu bestimmt
  dropOut(p, message) {
    const i = this.order.indexOf(p.id);
    if (i < 0) return;
    const nextOf = this.after(p.id);
    if (message) this.say(message);
    this.onDropOut(p);
    this.discard.push(...this.board.flatMap((x) => [x.a, ...(x.d ? [x.d] : [])]));
    this.board = []; this.taking = false; this.passedAtk.clear();
    this.order.splice(i, 1);
    const left = this.active();
    if (this.order.length < 2 || left.length < 2) return this.finish(left.length === 1 && this.hands[left[0]]?.length ? left[0] : null);
    const fallback = this.order.includes(nextOf) ? nextOf : this.order[0];
    if (!this.order.includes(this.attacker)) this.attacker = fallback;
    if (!this.order.includes(this.defender) || this.defender === this.attacker) this.defender = this.after(this.attacker);
    this.turn = 0;
    this.moveNo++;
    this.settle();
  }

  publicPlayer(p) {
    return {
      cards: this.hands[p.id]?.length ?? 0,
      role: p.id === this.attacker ? 'attack' : p.id === this.defender ? 'defend' : null,
      out: this.out.has(p.id),
    };
  }

  gameView(viewerId) {
    const mine = this.hands[viewerId];
    return {
      trump: this.trump, trumpCard: this.trumpCard, deck: this.deck.length, discard: this.discard.length,
      table: this.board.map((p) => ({ a: p.a, d: p.d, by: p.by })),
      attacker: this.attacker, defender: this.defender, taking: this.taking, limit: this.limit,
      hand: mine ? [...mine] : null,
      canAdd: this.phase === 'playing' && this.currentId === viewerId && viewerId !== this.defender && this.canAdd(viewerId),
      places: [...this.places], durak: this.phase === 'over' ? this.durak ?? null : null,
    };
  }

  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}
