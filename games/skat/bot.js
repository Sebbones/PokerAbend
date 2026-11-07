// Skat-Computerspieler. Er sieht nur, was seine Spieleransicht (gameView) enthält: eigene Karten, öffentlich gespielte Karten, Reizstand.
import { BIDS, skatDeck, sumPoints, cardPoints, isTrump, effSuit, strength, trickWinner, minimumValue, NULL_VALUE } from './rules.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const JACK_WEIGHT = { Jc: 6, Js: 5.5, Jh: 5, Jd: 4.5 };

// ---------- Handbewertung ----------
export function suitScore(hand, s) {
  let score = 0;
  for (const c of hand) {
    if (c[0] === 'J') score += JACK_WEIGHT[c];
    else if (c[1] === s) score += { A: 3.5, T: 3, K: 2, Q: 1.5, 9: 1, 8: 1, 7: 1 }[c[0]];
    else if (c[0] === 'A') score += 3;
    else if (c[0] === 'T') score += hand.includes('A' + c[1]) ? 1.5 : 0.3;
    else if (c[0] === 'K') score += 0.3;
  }
  const trumps = hand.filter((c) => c[0] === 'J' || c[1] === s).length;
  return score + (trumps >= 6 ? (trumps - 5) * 1.5 : 0);
}
export function grandScore(hand) {
  let score = 0;
  for (const c of hand) {
    if (c[0] === 'J') score += JACK_WEIGHT[c] + 1.5;
    else if (c[0] === 'A') score += 4;
    else if (c[0] === 'T') score += hand.includes('A' + c[1]) ? 2.5 : 0.8;
    else if (c[0] === 'K') score += hand.includes('A' + c[1]) || hand.includes('T' + c[1]) ? 1 : 0.2;
  }
  return score;
}
// Niedriger ist besser: hohe Karten ohne tiefe Deckung sind gefährlich
export function nullScore(hand) {
  const order = '789TJQKA', weight = [0, 0, 0.3, 0.8, 1.3, 1.8, 2.4, 3.2];
  let risk = 0;
  for (const s of 'cshd') {
    const cards = hand.filter((c) => c[1] === s).map((c) => order.indexOf(c[0])).sort((a, b) => a - b);
    cards.forEach((r, i) => { risk += weight[r] * (i === 0 ? 0.5 : 1) * (r <= 1 ? 0 : 1); });
    if (cards.length && cards[0] >= 2) risk += 1.5 + cards[0] * 0.2; // keine tiefe Karte in dieser Farbe
  }
  return risk;
}
// Bester Spielplan einer Hand: { game, rating (≥ 1 = lohnt sich), ceiling (höchstes Gebot) }
export function plan(hand) {
  const options = [];
  for (const s of 'cshd') {
    const game = { type: 'suit', suit: s }, rating = suitScore(hand, s) / 17;
    options.push({ game, rating, ceiling: minimumValue(game, hand) + (rating > 1.25 ? { c: 12, s: 11, h: 10, d: 9 }[s] : 0) });
  }
  const grand = { type: 'grand' }, g = grandScore(hand) / 25;
  options.push({ game: grand, rating: g, ceiling: minimumValue(grand, hand) });
  const n = nullScore(hand), nullGame = { type: 'null' };
  options.push({ game: nullGame, rating: n <= 3.2 ? 1.1 + (3.2 - n) / 6 : 0.6 * (3.2 / n), ceiling: NULL_VALUE.plain });
  options.sort((a, b) => b.rating - a.rating);
  const best = options[0];
  best.ceiling = Math.max(best.ceiling, best.rating >= 1 ? 18 : 0);
  return best;
}

// ---------- Kartenspiel ----------
function unseenCards(g, id) {
  const known = new Set([...(g.hand || []), ...g.played.map((p) => p.card), ...(g.pressed || []), ...(g.open || [])]);
  return skatDeck().filter((c) => !known.has(c));
}
const beats = (a, b, game) => {
  const x = effSuit(a, game), y = effSuit(b, game);
  return x === y ? strength(a, game) > strength(b, game) : x === 't';
};

function choosePlay(g, id, level, rng) {
  const legal = g.legal, game = g.game;
  if (legal.length === 1) return legal[0];
  if (level === 'easy') return pick(legal, rng);
  const counting = level === 'hard', unseen = counting ? unseenCards(g, id) : [];
  const decl = g.declarer, ramsch = game.type === 'ramsch', nullGame = game.type === 'null', me = id === decl;
  const later = (n) => 2 - n; // Spieler, die nach der Karte noch kommen
  const scoreOf = (card) => {
    const t = [...g.trick, { id, card }], win = trickWinner(t, game), pts = sumPoints(t.map((p) => p.card)), lead = !g.trick.length;
    const cost = (isTrump(card, game) ? 1.2 : 0) + strength(card, game) * 0.04;
    const winCard = t.find((p) => p.id === win).card, remaining = later(g.trick.length);
    let pBeat = 0;
    if (remaining > 0) {
      const pool = counting ? unseen.filter((c) => !t.some((p) => p.card === c)) : skatDeck();
      const q = pool.length ? pool.filter((c) => beats(c, winCard, game)).length / pool.length : 0;
      pBeat = 1 - (1 - Math.min(0.95, q * (counting ? 1.1 : 1.4))) ** remaining;
    }
    if (nullGame) {
      if (me) return -(win === id ? 1 - pBeat : 0) * 1000 + strength(card, game) * 0.1;
      return win === decl ? 1000 : -strength(card, game) * 0.2;
    }
    if (ramsch) return win === id ? -pts * (t.length === 3 ? 1.2 : 0.8) * (1 - pBeat * 0.5) - cost : cardPoints(card) * 0.7 - cost * 0.3;
    const mate = !me && win !== decl && win !== id, ownWin = win === id;
    let teamWin;
    if (me) teamWin = ownWin ? 1 - pBeat : 0; else teamWin = ownWin ? 1 - pBeat : mate ? 1 - pBeat * 0.8 : 0;
    // Zeigt der Stand, dass der Stich verloren ist: möglichst wenig Augen opfern
    let value = (2 * teamWin - 1) * pts - cost * (teamWin > 0.5 ? 1 : 0.3);
    if (teamWin < 0.5) value -= cardPoints(card) * 0.6;
    if (lead && me && counting) { // Alleinspieler zieht Trumpf, solange die Gegner noch welchen haben
      const oppTrumps = unseen.filter((c) => isTrump(c, game)).length, myTrumps = g.hand.filter((c) => isTrump(c, game)).length;
      if (isTrump(card, game) && oppTrumps > 0 && myTrumps >= 4) value += 4 - strength(card, game) * 0.02;
    }
    if (lead && !me && isTrump(card, game)) value -= 3; // Verteidiger führen selten Trumpf an
    return value;
  };
  let best = legal[0], bestScore = -Infinity;
  for (const card of legal) {
    const s = scoreOf(card) + (level === 'medium' ? (rng() - 0.5) * 1.5 : rng() * 0.01);
    if (s > bestScore) { bestScore = s; best = card; }
  }
  return best;
}

// ---------- Entscheidungen ----------
export function nextBid(value) { return BIDS.find((b) => b > value); }
export function choosePress(hand12) {
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < hand12.length; i++) for (let j = i + 1; j < hand12.length; j++) {
    const left = hand12.filter((_, k) => k !== i && k !== j), pushed = [hand12[i], hand12[j]], p = plan(left);
    const score = p.rating + 0.004 * sumPoints(pushed) - 0.02 * pushed.filter((c) => c[0] === 'J').length;
    if (score > bestScore) { bestScore = score; best = pushed; }
  }
  return best;
}

export function decide(g, id, level = 'medium', rng = Math.random) {
  const d = { key: g.key, revision: g.revision }, act = (method, data) => ({ method, args: [{ ...d, ...data }] });
  const hand = g.hand || [], easy = level === 'easy', hard = level === 'hard';
  if (g.stage === 'bid') {
    const b = g.bd, p = plan(hand), ceiling = easy ? 18 + Math.floor(rng() * 4) * 2 : hard ? p.ceiling : Math.max(0, p.ceiling - 2);
    if (b.phase === 'call') {
      const value = nextBid(b.value);
      return value && value <= ceiling && (easy || p.rating >= 1) ? act('bid', { action: 'bid', value }) : act('bid', { action: 'pass' });
    }
    return b.value <= ceiling && (easy || p.rating >= 1) ? act('bid', { action: 'hold' }) : act('bid', { action: 'pass' });
  }
  if (g.stage === 'ramschChoice') return act('ramschChoice', { play: !easy && plan(hand).rating >= 0.95 });
  if (g.stage === 'pickup') return act('pickup', { take: easy || plan(hand).rating < (hard ? 1.55 : 9) });
  if (g.stage === 'discard') return act('discard', { cards: easy ? hand.slice(0, 2) : choosePress(hand) });
  if (g.stage === 'declare') {
    const p = plan(hand);
    let choice = p;
    if (easy) { const s = pick([...'cshd'], rng); choice = { game: { type: 'suit', suit: s } }; }
    else if (minimumValue(choice.game, g.pressed ? [...hand, ...g.pressed] : hand) < g.bidValue && choice.game.type !== 'null') {
      // höchstes Angebot unter den Farben / Grand wählen, damit das Gebot gedeckt ist
      const cards = g.pressed ? [...hand, ...g.pressed] : hand;
      const all = [...'cshd'].map((s) => ({ type: 'suit', suit: s })).concat({ type: 'grand' }, { type: 'null' });
      choice = { game: all.sort((a, b) => minimumValue(b, cards) - minimumValue(a, cards))[0] };
    }
    const game = { ...choice.game };
    if (g.isHand && hard && game.type !== 'null' && p.rating > 2.1) game.schneider = true;
    return act('declare', { game });
  }
  if (g.stage === 'play') return act('play', { card: choosePlay(g, id, level, rng) });
  return act('play', {});
}

export const fallback = (o) => decide(o.g, o.id, 'medium', () => 0.99);
export const strategy = (o, level, c) => { c.check(); return decide(o.g, o.id, level, c.rng); };
