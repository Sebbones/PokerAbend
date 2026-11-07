// Doppelkopf (nach den üblichen Turnierregeln): reine Regelfunktionen.
// Karten sind "Rang+Farbe+Kopie", z. B. "Qc0" (erste Kreuz-Dame) – jede Karte gibt es doppelt. Farben: c Kreuz, s Pik, h Herz, d Karo.
export const SUITS = 'cshd';
export const POINTS = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0 };
export const base = (c) => c.slice(0, 2);
export const cardName = (c) => `${{ c: 'Kreuz', s: 'Pik', h: 'Herz', d: 'Karo' }[c[1]]} ${{ 7: 'Sieben', 8: 'Acht', 9: 'Neun', T: 'Zehn', J: 'Bube', Q: 'Dame', K: 'König', A: 'Ass' }[c[0]]}`;
export const cardPoints = (c) => POINTS[c[0]];
export const sumPoints = (cards) => cards.reduce((n, c) => n + cardPoints(c), 0);

export function dkDeck(nines = true) {
  const ranks = nines ? '9TJQKA' : 'TJQKA';
  return [...ranks].flatMap((r) => [...SUITS].flatMap((s) => [r + s + '0', r + s + '1']));
}
export const handSize = (nines) => (nines ? 12 : 10);

// ---------- Spielarten ----------
export const SOLOS = ['queens', 'jacks', 'plain', 'c', 's', 'h', 'd'];
// contract: { kind: 'normal' | 'hochzeit' | 'solo', solo?, schweine?: boolean }
export function normalizeContract(input) {
  const kind = input?.kind;
  if (kind === 'normal' || kind === 'hochzeit') return { kind };
  if (kind === 'solo' && SOLOS.includes(input.solo)) return { kind, solo: input.solo };
  throw new Error('Wähle gesund, Hochzeit oder ein Solo');
}
const QUEENS = ['Qc', 'Qs', 'Qh', 'Qd'], JACKS = ['Jc', 'Js', 'Jh', 'Jd'];
// Trumpfliste von hoch nach niedrig (Kartenarten ohne Kopie)
export function trumpList(k) {
  const solo = k.kind === 'solo' ? k.solo : null;
  if (solo === 'queens') return [...QUEENS];
  if (solo === 'jacks') return [...JACKS];
  if (solo === 'plain') return [];
  const suit = SOLOS.includes(solo) && solo.length === 1 ? solo : 'd';
  const list = ['Th', ...QUEENS, ...JACKS, ...[...'ATK9'].map((r) => r + suit).filter((c) => c !== 'Th')];
  return k.schweine ? ['Ad', ...list.filter((c) => c !== 'Ad')] : list;
}
const SUIT_ORDER = (k) => (k.kind === 'solo' && k.solo === 'queens' ? 'ATKJ9' : k.kind === 'solo' && k.solo === 'jacks' ? 'ATKQ9' : k.kind === 'solo' && k.solo === 'plain' ? 'ATKQJ9' : 'ATK9');
const cache = new WeakMap();
function tables(k) {
  if (cache.has(k)) return cache.get(k);
  const list = trumpList(k), t = { trump: new Map(list.map((c, i) => [c, 100 - i])), order: SUIT_ORDER(k), dulle: list.includes('Th') };
  cache.set(k, t);
  return t;
}
export const isTrump = (c, k) => tables(k).trump.has(base(c));
export const effSuit = (c, k) => (isTrump(c, k) ? 't' : c[1]);
export const strength = (c, k) => { const t = tables(k); return t.trump.get(base(c)) ?? t.order.length - t.order.indexOf(c[0]); };
export function legalCards(hand, trick, k) {
  if (!trick.length) return [...hand];
  const lead = effSuit(trick[0].card, k), follow = hand.filter((c) => effSuit(c, k) === lead);
  return follow.length ? follow : [...hand];
}
// Gleiche Karten: die zuerst gespielte gewinnt – außer die zweite Herz-Zehn (Dulle) sticht die erste
export function beats(a, b, k) {
  const x = effSuit(a, k), y = effSuit(b, k);
  if (x !== y) return x === 't';
  const sa = strength(a, k), sb = strength(b, k);
  return sa > sb || (sa === sb && tables(k).dulle && base(a) === 'Th');
}
export function trickWinner(trick, k) {
  let best = trick[0];
  for (const p of trick.slice(1)) if (beats(p.card, best.card, k)) best = p;
  return best.id;
}

// ---------- Ansagen ----------
export const LEVELS = ['', 'Re/Kontra', 'keine 90', 'keine 60', 'keine 30', 'schwarz'];
export const levelName = (party, level) => (level === 1 ? (party === 're' ? 'Re' : 'Kontra') : LEVELS[level]);
// Wie viele Karten müssen mindestens noch auf der Hand sein, wenn die Ansage fällt (N = Startkarten)
export const announceDeadline = (N, level) => N - level;
const THRESHOLD = { 2: 90, 3: 60, 4: 30 };
function targetMet(level, ownPoints, otherPoints, otherTricks) {
  if (level < 2) return true;
  if (level === 5) return otherTricks === 0;
  return otherPoints < THRESHOLD[level];
}

// ---------- Auswertung ----------
// input: { contract, re: [ids], kontra: [ids], points: {re, kontra}, tricks: {re, kontra}, levels: {re, kontra},
//          specials: { re: n, kontra: n }, partnerFound }
export function scoreDeal(input) {
  const { contract: k, re, kontra, points, tricks, levels, specials } = input;
  const solo = k.kind === 'solo' || (k.kind === 'hochzeit' && re.length === 1);
  const reNormal = points.re >= 121, kNormal = !reNormal;
  const reMet = reNormal && targetMet(levels.re, points.re, points.kontra, tricks.kontra);
  const kMet = kNormal && targetMet(levels.kontra, points.kontra, points.re, tricks.re);
  const reFail = levels.re >= 1 && !reMet, kFail = levels.kontra >= 1 && !kMet;
  let winner;
  if (reFail && kFail) winner = null;
  else if (reFail) winner = 'kontra';
  else if (kFail) winner = 're';
  else winner = reNormal ? 're' : 'kontra';

  const detail = [];
  let gp = 0;
  if (winner) {
    const loser = winner === 're' ? 'kontra' : 're', lp = points[loser];
    gp = 1; detail.push('Sieg');
    if (winner === 'kontra' && !solo) { gp++; detail.push('gegen die Alten'); }
    for (const party of ['re', 'kontra']) {
      if (levels[party] >= 1) { gp += 2; detail.push(levelName(party, 1)); }
      for (let l = 2; l <= levels[party]; l++) { gp++; detail.push(`${party === 're' ? 'Re' : 'Kontra'}: ${levelName(party, l)}`); }
    }
    for (const [t, name] of [[90, 'keine 90'], [60, 'keine 60'], [30, 'keine 30']]) if (lp < t) { gp++; detail.push(name + ' gespielt'); }
    if (tricks[loser] === 0) { gp++; detail.push('schwarz gespielt'); }
  }
  const sign = winner === 're' ? 1 : winner === 'kontra' ? -1 : 0;
  const value = winner ? sign * gp + specials.re - specials.kontra : 0;
  const per = {};
  for (const id of re) per[id] = value * (solo ? 3 : 1);
  for (const id of kontra) per[id] = -value || 0;
  return { winner, gamePoints: gp, value, per, detail, solo, reMet, kMet };
}

// Sonderpunkte aus den gespielten Stichen: tricks = [{ plays:[{id,card}], winner, points }]
export function specialPoints(tricks, partyOf, k) {
  const out = { re: 0, kontra: 0, list: [] };
  const give = (party, text) => { out[party]++; out.list.push({ party, text }); };
  tricks.forEach((t, i) => {
    const party = partyOf(t.winner);
    if (t.points >= 40) give(party, 'Doppelkopf');
    if (!k.schweine) for (const p of t.plays) if (base(p.card) === 'Ad' && partyOf(p.id) !== party) give(party, 'Fuchs gefangen');
    if (i === tricks.length - 1 && isTrump('Jc0', k) && base(t.plays.find((p) => p.id === t.winner).card) === 'Jc') give(party, 'Karlchen');
  });
  return out;
}
