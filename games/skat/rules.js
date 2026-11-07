// Skat nach Skatordnung: reine Regelfunktionen (Karten, Reizen, Spielwert, Abrechnung).
// Karten sind Strings "Rang+Farbe", z. B. "Jc" (Kreuz-Bube). Farben: c Kreuz/Eichel, s Pik/Grün, h Herz, d Karo/Schellen.
export const RANKS = '789TJQKA';
export const SUITS = 'dhsc'; // aufsteigend nach Grundwert: Karo 9, Herz 10, Pik 11, Kreuz 12
export const BASE = { d: 9, h: 10, s: 11, c: 12, grand: 24 };
export const NULL_VALUE = { plain: 23, hand: 35, ouvert: 46, ouvertHand: 59 };
export const JACKS = ['Jc', 'Js', 'Jh', 'Jd']; // Kreuz-Bube ist der höchste Trumpf
const POINTS = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };

export const skatDeck = () => [...RANKS].flatMap((r) => [...SUITS].map((s) => r + s));
export const cardPoints = (c) => POINTS[c[0]];
export const sumPoints = (cards) => cards.reduce((n, c) => n + cardPoints(c), 0);
export const cardName = (c) => `${{ c: 'Kreuz', s: 'Pik', h: 'Herz', d: 'Karo' }[c[1]]} ${{ 7: 'Sieben', 8: 'Acht', 9: 'Neun', T: 'Zehn', J: 'Bube', Q: 'Dame', K: 'König', A: 'Ass' }[c[0]]}`;
export const rankOf = (c) => c[0];
export const suitOf = (c) => c[1];

// Mögliche Reizwerte: alle Spielwerte (Grundwert × 2 … ) plus die vier Nullspiele
export const BIDS = (() => {
  const set = new Set(Object.values(NULL_VALUE));
  for (const base of Object.values(BASE)) for (let m = 2; m <= 17; m++) set.add(base * m);
  return [...set].sort((a, b) => a - b).filter((v) => v >= 18 && v <= 264);
})();

// ---------- Spielbeschreibung ----------
// game: { type: 'suit'|'grand'|'null'|'ramsch', suit?, hand?, ouvert?, schneider?, schwarz? }
export function normalizeGame(input, { hand }) {
  const g = input || {};
  if (!['suit', 'grand', 'null'].includes(g.type)) throw new Error('Wähle Farbspiel, Grand oder Null');
  const out = { type: g.type, hand: !!hand, ouvert: !!g.ouvert, schneider: false, schwarz: false };
  if (g.type === 'suit') {
    if (typeof g.suit !== 'string' || g.suit.length !== 1 || !SUITS.includes(g.suit)) throw new Error('Wähle die Trumpffarbe');
    out.suit = g.suit;
  }
  if (g.type === 'null') {
    delete out.schneider; delete out.schwarz;
    return out;
  }
  if (out.ouvert && !hand) throw new Error('Ouvert ist bei Farbspiel und Grand nur als Handspiel erlaubt');
  if (!hand && (g.schneider || g.schwarz)) throw new Error('Schneider und Schwarz lassen sich nur im Handspiel ansagen');
  out.schneider = !!g.schneider || !!g.schwarz || out.ouvert;
  out.schwarz = !!g.schwarz || out.ouvert;
  return out;
}

export const nullKind = (g) => (g.ouvert ? (g.hand ? 'ouvertHand' : 'ouvert') : g.hand ? 'hand' : 'plain');
export const baseValue = (g) => (g.type === 'null' ? NULL_VALUE[nullKind(g)] : g.type === 'grand' ? BASE.grand : BASE[g.suit]);

// ---------- Trumpf und Stiche ----------
export const isTrump = (c, g) => g.type === 'suit' ? c[0] === 'J' || c[1] === g.suit : g.type === 'grand' || g.type === 'ramsch' ? c[0] === 'J' : false;
export const effSuit = (c, g) => (isTrump(c, g) ? 't' : c[1]);
const PLAIN = '789QKTA';
const NULL_ORDER = '789TJQKA';
export function strength(c, g) {
  if (g.type === 'null') return NULL_ORDER.indexOf(c[0]);
  if (isTrump(c, g)) return c[0] === 'J' ? 100 - JACKS.indexOf(c) : PLAIN.indexOf(c[0]);
  return PLAIN.indexOf(c[0]);
}
export function legalCards(hand, trick, g) {
  if (!trick.length) return [...hand];
  const lead = effSuit(trick[0].card, g), follow = hand.filter((c) => effSuit(c, g) === lead);
  return follow.length ? follow : [...hand];
}
export function trickWinner(trick, g) {
  let best = trick[0];
  for (const play of trick.slice(1)) {
    const a = effSuit(play.card, g), b = effSuit(best.card, g);
    if (a === b ? strength(play.card, g) > strength(best.card, g) : a === 't') best = play;
  }
  return best.id;
}

// ---------- Spitzen ----------
// cards: alle zwölf Karten des Alleinspielers (Hand + Skat/Druck)
export function trumpSequence(g) {
  const seq = [...JACKS];
  if (g.type === 'suit') for (const r of 'ATKQ987') seq.push(r + g.suit);
  return seq;
}
export function spitzen(cards, g) {
  if (g.type === 'null') return { count: 0, mit: true };
  const seq = trumpSequence(g), has = cards.includes(seq[0]);
  let n = 0;
  while (n < seq.length && cards.includes(seq[n]) === has) n++;
  return { count: n, mit: has };
}

// ---------- Auswertung eines Spiels ----------
// result: { cards (alle 12 des Alleinspielers), points (Augen inkl. Skat), tricks (Stiche des Alleinspielers), bid }
export function evaluateGame(g, { cards, points, tricks, bid = 0 }) {
  if (g.type === 'null') {
    const value = NULL_VALUE[nullKind(g)], overbid = value < bid, won = tricks === 0 && !overbid;
    return { won, value, levels: 1, spitzen: null, overbid, schneider: false, schwarz: false, base: value };
  }
  const sp = spitzen(cards, g), base = baseValue(g);
  const announcedSchneider = g.schneider || g.schwarz, announcedSchwarz = g.schwarz;
  const reachedWin = points >= 61 && (!announcedSchneider || points >= 90) && (!announcedSchwarz || tricks === 10);
  const schneider = reachedWin ? points >= 90 : points <= 30; // gewonnen: Gegner Schneider; verloren: Alleinspieler Schneider
  const schwarz = reachedWin ? tricks === 10 : tricks === 0;
  let levels = 1 + sp.count + (g.hand ? 1 : 0) + (g.ouvert ? 1 : 0);
  if (announcedSchneider) levels++;
  if (announcedSchwarz) levels++;
  if (schneider) levels++;
  if (schwarz) levels++;
  let value = base * levels, won = reachedWin;
  const overbid = value < bid;
  if (overbid) { won = false; value = base * Math.ceil(bid / base); }
  return { won, value, levels, spitzen: sp, overbid, schneider, schwarz, base };
}

// Punkte der drei Spieler für ein gespieltes Spiel (Skatordnung): gewonnen +Wert +50, verloren −2×Wert −50,
// jeder Gegner erhält 30 Punkte, wenn der Alleinspieler verliert. Bockrunde verdoppelt alles.
export function scoreGame(ids, declarer, evaluation, bock = false) {
  const f = bock ? 2 : 1, out = Object.fromEntries(ids.map((id) => [id, 0]));
  if (evaluation.won) out[declarer] = (evaluation.value + 50) * f;
  else {
    out[declarer] = -(2 * evaluation.value + 50) * f;
    for (const id of ids) if (id !== declarer) out[id] = 30 * f;
  }
  return out;
}

// Ramsch: jeder zählt seine Augen, der Skat gehört dem letzten Stich. Wer die meisten hat, bekommt sie als Minus;
// holt jemand alle zehn Stiche, bekommt er 120 gutgeschrieben (Durchmarsch). Gleichstand an der Spitze: beide verlieren.
export function scoreRamsch(ids, taken, tricks, skat, lastWinner, bock = false) {
  const f = bock ? 2 : 1, pts = Object.fromEntries(ids.map((id) => [id, sumPoints(taken[id]) + (id === lastWinner ? sumPoints(skat) : 0)]));
  const out = Object.fromEntries(ids.map((id) => [id, 0]));
  const march = ids.find((id) => tricks[id] === 10);
  if (march) { out[march] = 120 * f; return { points: out, augen: pts, march, losers: [] }; }
  const top = Math.max(...Object.values(pts)), losers = ids.filter((id) => pts[id] === top);
  for (const id of losers) out[id] = -top * f;
  return { points: out, augen: pts, march: null, losers };
}

// Bockrunde auslösen? Verlorenes Spiel oder genau 60 Augen (60:60) – nur bei normalen Spielen.
export function triggersBock(g, evaluation, points) {
  if (g.type === 'ramsch') return false;
  return !evaluation.won || (g.type !== 'null' && points === 60);
}

// Hilfen für Bots und Anzeige: kleinster erlaubter Wert für ein Spiel
export function minimumValue(g, cards) {
  if (g.type === 'null') return NULL_VALUE[nullKind(g)];
  const sp = spitzen(cards, g);
  return baseValue(g) * (1 + sp.count + (g.hand ? 1 : 0) + (g.ouvert ? 1 : 0) + (g.schneider ? 1 : 0) + (g.schwarz ? 1 : 0));
}
