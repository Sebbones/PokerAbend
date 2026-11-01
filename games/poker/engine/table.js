// Texas-Hold'em-Engine (No-Limit). Kein Netzwerk, keine Oberfläche – nur Regeln.
// Der Server ruft startHand(), act(), forceFold() auf und liest den Zustand aus.
import { newDeck, shuffle, bestHand, omahaBest, compareScores } from './cards.js';

export const SEATS = 9;
const STREETS = ['preflop', 'flop', 'turn', 'river'];
// Hausregel: pro Setzrunde höchstens Bet + 3 Raises (pre-flop zählt der Big Blind als Bet), danach nur noch Call/Fold
export const MAX_RAISES = 3;

export class Table {
  constructor({ smallBlind = 50, bigBlind = 100, rng, holeCards = 2, potLimit = false } = {}) {
    this.holeCards = holeCards;  // 2 = Hold'em, 4 = Omaha
    this.potLimit = potLimit;    // Erhöhen höchstens um die Potgröße
    this.seats = Array(SEATS).fill(null); // { id, name, stack, sittingOut }
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.button = -1;
    this.hand = null;
    this.handNo = 0;
    this.rng = rng;
    this.events = []; // Rundenverlauf, vom Server abgeholt
  }

  // ---------- Sitzplätze ----------
  sit(seat, player) {
    if (!Number.isInteger(seat) || seat < 0 || seat >= SEATS || this.seats[seat]) throw new Error('Platz ist nicht frei');
    this.seats[seat] = { sittingOut: false, ...player };
  }

  leave(seat) {
    if (this.inHand(seat)) throw new Error('Spieler ist noch in der Hand');
    const p = this.seats[seat];
    this.seats[seat] = null;
    return p;
  }

  inHand(seat) {
    const hp = this.hand && !this.hand.done && this.hand.players[seat];
    return !!(hp && !hp.folded);
  }

  eligibleSeats() {
    const out = [];
    for (let i = 0; i < SEATS; i++) {
      const s = this.seats[i];
      if (s && !s.sittingOut && s.stack > 0) out.push(i);
    }
    return out;
  }

  nextFrom(from, list) {
    for (let k = 1; k <= SEATS; k++) {
      const i = (from + k + SEATS) % SEATS;
      if (list.includes(i)) return i;
    }
    return -1;
  }

  // ---------- Hand starten ----------
  startHand() {
    if (this.hand && !this.hand.done) throw new Error('Es läuft schon eine Hand');
    const seats = this.eligibleSeats();
    if (seats.length < 2) throw new Error('Mindestens 2 Spieler mit Chips nötig');

    this.button0 = this.button;
    this.button = this.button < 0 ? seats[0] : this.nextFrom(this.button, seats);
    const headsUp = seats.length === 2;
    const sb = headsUp ? this.button : this.nextFrom(this.button, seats);
    const bb = this.nextFrom(sb, seats);

    // riggedDeck nur für Tests: Karten werden von hinten gezogen
    const deck = this.riggedDeck ? this.riggedDeck.slice() : this.createDeck();
    this.riggedDeck = null;
    const players = {};
    for (const i of seats) {
      players[i] = { seat: i, cards: [], folded: false, allIn: false, bet: 0, total: 0, acted: false, actedAt: -1, lastAction: null };
    }
    // Austeilen wie am echten Tisch: reihum ab Small Blind
    for (let round = 0; round < this.holeCards; round++) {
      let i = sb;
      for (let n = 0; n < seats.length; n++) { players[i].cards.push(deck.pop()); i = this.nextFrom(i, seats); }
    }

    const prevButton = this.button0;
    this.handNo++;
    this.hand = {
      prevButton,
      no: this.handNo, deck, board: [], street: 'preflop', button: this.button, sb, bb, headsUp,
      seats, players, currentBet: 0, lastRaise: this.bigBlind, fullRaises: 0, raises: 1,
      toAct: -1, lastAggressor: -1, done: false, result: null, shown: new Set(),
    };
    this.log({ type: 'hand', no: this.handNo });
    this.post(sb, this.smallBlind, 'sb');
    this.post(bb, this.bigBlind, 'bb');
    this.hand.currentBet = this.bigBlind; // Wer nicht foldet, muss den vollen Big Blind bringen
    this.hand.lastAggressor = bb;

    const first = headsUp ? sb : this.nextActor(bb);
    this.hand.toAct = first;
    this.afterAction();
    return this.hand;
  }

  post(seat, amount, kind) {
    const s = this.seats[seat];
    const p = this.hand.players[seat];
    const a = Math.min(amount, s.stack);
    s.stack -= a; p.bet += a; p.total += a;
    if (s.stack === 0) p.allIn = true;
    p.lastAction = kind === 'sb' ? 'Small Blind' : 'Big Blind';
    this.log({ type: kind, seat, amount: a });
  }

  canAct(seat) {
    const p = this.hand.players[seat];
    return !!p && !p.folded && !p.allIn;
  }

  // Nächster Spieler nach `from`, der noch handeln kann
  nextActor(from) {
    const list = this.hand.seats.filter((i) => this.canAct(i));
    return list.length ? this.nextFrom(from, list) : -1;
  }

  // Beste Hand: Hold'em aus allen sieben, Omaha genau zwei eigene + drei Gemeinschaftskarten
  evaluate(hole, board) { return this.holeCards === 4 ? omahaBest(hole, board) : bestHand([...hole, ...board]); }

  // ---------- Erlaubte Aktionen ----------
  legal(seat) {
    const h = this.hand;
    if (!h || h.done || h.toAct !== seat) return null;
    const p = h.players[seat];
    const stack = this.seats[seat].stack;
    const stackTo = p.bet + stack;
    // Pot-Limit: höchstens so hoch erhöhen, wie der Pot nach dem Mitgehen groß wäre
    const pot = h.seats.reduce((a, i) => a + h.players[i].total, 0);
    const maxTo = this.potLimit ? Math.min(stackTo, h.currentBet + pot + (h.currentBet - p.bet)) : stackTo;
    const toCall = Math.min(h.currentBet - p.bet, stack);
    const othersCanAct = h.seats.some((i) => i !== seat && this.canAct(i));
    const reopened = !p.acted || p.actedAt < h.fullRaises;
    const canRaise = maxTo > h.currentBet && othersCanAct && reopened && h.raises <= MAX_RAISES;
    const minTo = h.currentBet === 0 ? this.bigBlind : h.currentBet + h.lastRaise;
    return {
      canCheck: p.bet >= h.currentBet,
      toCall,
      canRaise,
      isBet: h.currentBet === 0,
      minTo: Math.min(minTo, maxTo),
      maxTo,
      stackTo,
      potLimit: this.potLimit,
      bet: p.bet,
    };
  }

  // action: { type: 'fold'|'check'|'call'|'raise'|'allin', amount? (Raise auf Gesamtbetrag dieser Runde) }
  act(seat, action) {
    const h = this.hand;
    const L = this.legal(seat);
    if (!L) throw new Error('Du bist nicht am Zug');
    const p = h.players[seat];
    const s = this.seats[seat];
    let type = action.type;

    if (type === 'allin') {
      if (L.canRaise && L.maxTo > h.currentBet) { type = 'raise'; action = { amount: L.maxTo }; }
      else type = 'call';
    }

    switch (type) {
      case 'fold':
        p.folded = true; p.lastAction = 'Fold';
        this.log({ type: 'fold', seat });
        break;
      case 'check':
        if (!L.canCheck) throw new Error('Check nicht möglich, du musst callen oder folden');
        p.lastAction = 'Check';
        this.log({ type: 'check', seat });
        break;
      case 'call': {
        if (L.toCall <= 0) throw new Error('Nichts zu callen');
        this.put(seat, L.toCall);
        p.lastAction = p.allIn ? 'All-in' : 'Call';
        this.log({ type: 'call', seat, amount: L.toCall, to: p.bet, allIn: p.allIn });
        break;
      }
      case 'raise': {
        if (!L.canRaise) throw new Error('Erhöhen ist gerade nicht erlaubt');
        const to = Math.floor(Number(action.amount));
        if (!Number.isFinite(to)) throw new Error('Ungültiger Betrag');
        if (to > L.maxTo) throw new Error(to > L.stackTo ? 'So viele Chips hast du nicht' : `Pot-Limit: höchstens ${L.maxTo}`);
        if (to < L.minTo && to !== L.maxTo) throw new Error(`Mindestens ${L.minTo}`);
        if (to <= h.currentBet) throw new Error('Das ist keine Erhöhung');
        const increment = to - h.currentBet;
        const wasBet = h.currentBet === 0;
        this.put(seat, to - p.bet);
        if (increment >= h.lastRaise) { h.lastRaise = increment; h.fullRaises++; }
        // Unvollständiges All-in: Einsatz steigt, Runde wird aber nicht neu eröffnet
        h.currentBet = to;
        h.raises++;
        h.lastAggressor = seat;
        p.lastAction = p.allIn ? 'All-in' : wasBet ? 'Bet' : 'Raise';
        this.log({ type: wasBet ? 'bet' : 'raise', seat, to, allIn: p.allIn });
        break;
      }
      default:
        throw new Error('Unbekannte Aktion');
    }
    p.acted = true;
    p.actedAt = h.fullRaises;
    if (s.stack === 0 && !p.folded) p.allIn = true;
    this.advance(seat);
    return h;
  }

  put(seat, amount) {
    const s = this.seats[seat];
    const p = this.hand.players[seat];
    const a = Math.min(amount, s.stack);
    s.stack -= a; p.bet += a; p.total += a;
    if (s.stack === 0) p.allIn = true;
  }

  // Spieler außerhalb seines Zuges aus der Hand nehmen (Aufstehen, Kick)
  forceFold(seat) {
    const h = this.hand;
    if (!this.inHand(seat)) return;
    if (h.toAct === seat) { this.act(seat, { type: 'fold' }); return; }
    h.players[seat].folded = true;
    h.players[seat].lastAction = 'Fold';
    this.log({ type: 'fold', seat });
    if (this.live().length === 1) this.finish();
    else this.afterAction();
  }

  // Host bricht die Hand ab: jeder bekommt zurück, was er in dieser Hand gesetzt hat – die Chipsumme bleibt gleich
  abort() {
    const h = this.hand;
    if (!h || h.done) throw new Error('Es läuft keine Hand');
    for (const i of h.seats) { const s = this.seats[i]; if (s) s.stack += h.players[i].total; }
    this.button = h.prevButton;
    this.handNo--;
    this.hand = null;
    this.log({ type: 'abort' });
  }

  live() {
    return this.hand.seats.filter((i) => !this.hand.players[i].folded);
  }

  roundComplete() {
    const h = this.hand;
    const actors = h.seats.filter((i) => this.canAct(i));
    if (actors.length === 0) return true;
    if (actors.length === 1) {
      const p = h.players[actors[0]];
      const othersMax = Math.max(0, ...h.seats.filter((i) => i !== actors[0] && !h.players[i].folded).map((i) => h.players[i].bet));
      if (p.bet >= h.currentBet && (p.acted || p.bet >= othersMax)) return true;
    }
    return actors.every((i) => h.players[i].acted && h.players[i].bet === h.currentBet);
  }

  advance(lastSeat) {
    const h = this.hand;
    if (this.live().length === 1) { this.finish(); return; }
    if (this.roundComplete()) { this.nextStreet(); return; }
    h.toAct = this.nextActor(lastSeat);
  }

  // Wird nach Hand-Start und nach forceFold aufgerufen: ggf. direkt weiter
  afterAction() {
    const h = this.hand;
    if (h.done) return;
    if (h.toAct < 0 || !this.canAct(h.toAct)) {
      if (this.roundComplete()) this.nextStreet();
      else h.toAct = this.nextActor(h.toAct < 0 ? h.button : h.toAct);
    } else if (this.roundComplete()) {
      this.nextStreet();
    }
  }

  // Nicht gecallter Überschuss geht zurück
  refundUncalled() {
    const h = this.hand;
    const sorted = h.seats.map((i) => h.players[i]).sort((a, b) => b.bet - a.bet);
    const [top, second] = sorted;
    if (top && second && top.bet > second.bet) {
      const diff = top.bet - second.bet;
      top.bet -= diff; top.total -= diff;
      this.seats[top.seat].stack += diff;
      if (this.seats[top.seat].stack > 0) top.allIn = false;
      this.log({ type: 'refund', seat: top.seat, amount: diff });
    }
  }

  nextStreet() {
    const h = this.hand;
    this.refundUncalled();
    for (const i of h.seats) { const p = h.players[i]; p.bet = 0; p.acted = false; p.actedAt = -1; if (!p.folded && !p.allIn) p.lastAction = null; }
    h.currentBet = 0; h.lastRaise = this.bigBlind; h.fullRaises = 0; h.raises = 0;

    const idx = STREETS.indexOf(h.street);
    if (idx === STREETS.length - 1) { this.finish(); return; }
    h.street = STREETS[idx + 1];
    h.deck.pop(); // Burn Card
    const n = h.street === 'flop' ? 3 : 1;
    for (let k = 0; k < n; k++) h.board.push(h.deck.pop());
    this.log({ type: 'street', street: h.street, board: h.board.slice() });

    const actors = h.seats.filter((i) => this.canAct(i));
    if (actors.length <= 1) { h.runout = true; this.nextStreet(); return; }
    h.toAct = this.nextActor(h.button);
  }

  // ---------- Pots und Auszahlung ----------
  pots() {
    const h = this.hand;
    const ps = h.seats.map((i) => h.players[i]);
    const levels = [...new Set(ps.map((p) => p.total).filter((t) => t > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const L of levels) {
      let amount = 0;
      for (const p of ps) amount += Math.min(p.total, L) - Math.min(p.total, prev);
      const eligible = ps.filter((p) => !p.folded && p.total >= L).map((p) => p.seat);
      const last = pots[pots.length - 1];
      if (eligible.length === 0 && last) last.amount += amount;
      else if (last && last.eligible.join() === eligible.join()) last.amount += amount;
      else pots.push({ amount, eligible });
      prev = L;
    }
    return pots.filter((p) => p.amount > 0);
  }

  // Chips im Pot, ohne die Einsätze der laufenden Setzrunde (für die Anzeige)
  potsDisplay() {
    const h = this.hand;
    if (!h) return [];
    const saved = h.seats.map((i) => h.players[i].total);
    for (const i of h.seats) h.players[i].total -= h.players[i].bet;
    const pots = this.pots();
    h.seats.forEach((i, k) => { h.players[i].total = saved[k]; });
    return pots;
  }

  createDeck() { return shuffle(newDeck(), this.rng); }

  // A split-pot variant may partition an already computed main/side pot.
  // The actual refunds, chip division, tie order and payouts remain below.
  splitPot(pot) { return [pot]; }

  // Flop games complete the board; draw poker overrides only this hook.
  completeBoard() {
    const h = this.hand;
    while (h.board.length < 5) { h.deck.pop(); h.board.push(h.deck.pop()); }
  }

  finish() {
    const h = this.hand;
    this.refundUncalled();
    for (const i of h.seats) h.players[i].bet = 0;
    const live = this.live();
    const showdown = live.length > 1;
    // Siegerhand-Bewertung
    const evals = {};
    if (showdown) {
      this.completeBoard();
      for (const i of live) evals[i] = this.evaluate(h.players[i].cards, h.board);
      for (const i of live) h.shown.add(i);
    }
    // Reihenfolge links vom Button (für unteilbare Rest-Chips)
    const order = [];
    for (let k = 1; k <= SEATS; k++) { const i = (h.button + k) % SEATS; if (h.players[i]) order.push(i); }

    const result = { showdown, pots: [], board: h.board.slice() };
    for (const pot of this.pots().flatMap((p) => this.splitPot(p, evals, showdown))) {
      let winners = pot.fixedWinners || pot.eligible;
      if (!pot.fixedWinners && showdown && winners.length > 1) {
        let best = null;
        for (const i of pot.eligible) {
          const c = best === null ? 1 : compareScores(evals[i].score, evals[best[0]].score);
          if (c > 0) best = [i]; else if (c === 0) best.push(i);
        }
        winners = best;
      }
      winners = order.filter((i) => winners.includes(i));
      const share = Math.floor(pot.amount / winners.length);
      let rest = pot.amount - share * winners.length;
      const payouts = {};
      for (const w of winners) {
        const extra = rest > 0 ? 1 : 0; rest -= extra;
        payouts[w] = share + extra;
        this.seats[w].stack += share + extra;
      }
      result.pots.push({
        amount: pot.amount, winners, payouts,
        hand: showdown ? (pot.handLabel || evals[winners[0]].name) : null,
        cards: showdown ? (pot.handCards || evals[winners[0]].cards) : null,
        ...(pot.kind ? { kind: pot.kind } : {}),
      });
    }
    result.hands = Object.fromEntries(Object.entries(evals).map(([i, e]) => [i, e.name]));
    h.result = result;
    h.done = true;
    h.toAct = -1;
    h.street = 'done';
    this.log({ type: 'result', result });
  }

  // Nach einer Hand ohne Showdown darf der Gewinner seine Karten zeigen
  show(seat) {
    const h = this.hand;
    if (!h || !h.done || !h.players[seat]) throw new Error('Gerade nichts zu zeigen');
    h.shown.add(seat);
  }

  log(e) { this.events.push(e); }

  totalChips() {
    let sum = 0;
    for (const s of this.seats) if (s) sum += s.stack;
    if (this.hand && !this.hand.done) for (const i of this.hand.seats) sum += this.hand.players[i].total;
    return sum;
  }
}
