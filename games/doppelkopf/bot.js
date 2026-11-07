// Doppelkopf-Computerspieler. Er kennt nur seine Karten, die öffentlich gespielten Karten und die öffentlich bekannten Parteien.
import { base, cardPoints, sumPoints, dkDeck, isTrump, strength, trickWinner, beats } from './rules.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const WEIGHT = { Th: 4.5, Qc: 4, Qs: 3.6, Qh: 3.2, Qd: 2.8, Jc: 2.4, Js: 2.2, Jh: 2, Jd: 1.8, Ad: 1.6, Td: 1.4, Kd: 1, '9d': 0.6 };

// Wie stark ist die Hand als normale Partie? (grob 0 … 30)
export function handStrength(hand) {
  return hand.reduce((n, c) => n + (WEIGHT[base(c)] ?? ((c[0] === 'A' ? 1.6 : c[0] === 'T' ? 0.4 : 0))), 0);
}
function soloPlan(hand) {
  const count = (pred) => hand.filter(pred).length, queens = count((c) => c[0] === 'Q'), jacks = count((c) => c[0] === 'J');
  let best = null;
  for (const s of 'cshd') {
    const trumps = count((c) => c[0] === 'Q' || c[0] === 'J' || c[1] === s || base(c) === 'Th');
    if (trumps >= 10 && queens >= 3 && (!best || trumps > best.trumps)) best = { solo: s, trumps };
  }
  if (queens >= 4 && jacks >= 3) return { solo: 'queens' };
  return best;
}

// ---------- Parteien-Schätzung ----------
function guessParty(g, id, pid) {
  if (pid === id) return g.myParty;
  const k = g.contract;
  if (g.known[pid]) return g.known[pid];
  if (k.kind === 'solo') return pid === g.soloist ? 're' : 'kontra';
  if (k.kind === 'hochzeit') return g.partner ? 'kontra' : null;
  const re = Object.values(g.known).filter((v) => v === 're').length;
  if (g.myParty === 're' && re >= 2) return 'kontra';
  if (g.myParty === 'kontra' && re >= 2) return 'kontra';
  return null;
}

function unseen(g) {
  const known = new Set([...(g.hand || []), ...g.played.map((p) => p.card)]);
  return dkDeck(g.nines).filter((c) => !known.has(c));
}

function choosePlay(g, id, level, rng) {
  const legal = g.legal, k = g.contract;
  if (legal.length === 1) return legal[0];
  if (level === 'easy') return pick(legal, rng);
  const counting = level === 'hard', pool0 = counting ? unseen(g) : dkDeck(g.nines);
  const rel = (pid) => { if (pid === id) return 1; const p = guessParty(g, id, pid); return p ? (p === g.myParty ? 1 : -1) : 0; };
  const scoreOf = (card) => {
    const t = [...g.trick, { id, card }], win = trickWinner(t, k), pts = sumPoints(t.map((p) => p.card)), remaining = 4 - t.length;
    const winCard = t.find((p) => p.id === win).card;
    let pBeat = 0;
    if (remaining > 0) {
      const pool = pool0.filter((c) => !t.some((p) => p.card === c));
      const q = pool.length ? pool.filter((c) => beats(c, winCard, k)).length / pool.length : 0;
      pBeat = 1 - (1 - Math.min(0.95, q * (counting ? 1.15 : 1.4))) ** remaining;
    }
    const r = rel(win);
    const teamWin = win === id ? 1 - pBeat : r > 0 ? 1 - pBeat * 0.6 : r < 0 ? pBeat * 0.2 : 0.4 * (1 - pBeat) + 0.1;
    const cost = (isTrump(card, k) ? 0.8 : 0) + strength(card, k) * 0.03;
    let value = (2 * teamWin - 1) * pts - cost * (teamWin > 0.5 ? 1 : 0.2);
    if (teamWin < 0.5) value -= cardPoints(card) * 0.6;
    if (base(card) === 'Ad' && teamWin < 0.7 && !k.schweine) value -= 4;
    if (teamWin > 0.6 && t.some((p) => base(p.card) === 'Ad' && rel(p.id) < 0)) value += 3;
    if (!g.trick.length && !isTrump(card, k) && g.myParty === 'kontra' && card[0] === 'A') value += 1.5; // Fehl-Ass früh ausspielen
    return value;
  };
  let best = legal[0], bestScore = -Infinity;
  for (const card of legal) {
    const s = scoreOf(card) + (level === 'medium' ? (rng() - 0.5) * 1.5 : rng() * 0.01);
    if (s > bestScore) { bestScore = s; best = card; }
  }
  return best;
}

export function decide(g, id, level = 'medium', rng = Math.random) {
  const d = { key: g.key, revision: g.revision }, act = (method, data) => ({ method, args: [{ ...d, ...data }] });
  const hand = g.hand || [], easy = level === 'easy', hard = level === 'hard';
  if (g.stage === 'reserve') {
    if (g.hasBothQueens) {
      const solo = !easy && soloPlan(hand);
      return act('reserve', { choice: solo ? solo.solo : 'hochzeit' });
    }
    const solo = hard ? soloPlan(hand) : null;
    return act('reserve', { choice: solo ? solo.solo : 'healthy' });
  }
  if (g.canAnnounce === 1 && !easy) {
    const strong = handStrength(hand) / hand.length, threshold = hard ? 1.7 : 2.0;
    if (strong >= threshold && g.myParty && (g.myParty === 're' ? true : strong >= threshold + 0.1)) return act('announce', { level: 1 });
  }
  if (g.stage === 'play') return act('play', { card: choosePlay(g, id, level, rng) });
  return act('play', {});
}

export const fallback = (o) => decide(o.g, o.id, 'medium', () => 0.99);
export const strategy = (o, level, c) => { c.check(); return decide(o.g, o.id, level, c.rng); };
