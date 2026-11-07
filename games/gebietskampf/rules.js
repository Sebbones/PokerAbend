// Gebietskampf: reine Regeln ohne Raum und Netzwerk. Der Zustand ist reines JSON (überlebt einen Neustart),
// Würfel und Mischen kommen von einer übergebenen Zufallsquelle (serverseitig, in Tests festlegbar).
import { CONTINENTS, MAPS, mapTerritories, neighbors, continentTerritories } from './map.js';

export const START_ARMIES = {
  full: { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 },
  small: { 2: 28, 3: 24, 4: 20, 5: 17, 6: 14 },
};
export const SYMBOLS = ['Fahne', 'Schild', 'Fackel'];
export const HAND_LIMIT = 5; // ab fünf Karten muss getauscht werden

const die = (rng) => 1 + Math.floor(rng() * 6);
export function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fail = (message) => { throw new Error(message); };

// ---------- Aufbau ----------
export function newGame({ players, mapId = 'full', mode = 'world', cardBonus = 'rising' }, rng = Math.random) {
  if (!MAPS[mapId]) fail('Unbekannte Karte');
  const ids = mapTerritories(mapId), n = players.length;
  if (n < 2 || n > 6) fail('Gebietskampf braucht zwei bis sechs Spieler');
  const owners = {}, armies = {};
  shuffle(ids, rng).forEach((t, i) => { owners[t] = players[i % n]; armies[t] = 1; });
  const mine = Object.fromEntries(players.map((p) => [p, ids.filter((t) => owners[t] === p)]));
  for (const p of players) {
    for (let left = START_ARMIES[mapId][n] - mine[p].length; left > 0; left--) armies[mine[p][Math.floor(rng() * mine[p].length)]]++;
  }
  const cards = [...ids.map((t) => ({ t, s: t % 3 })), { t: null, s: null }, { t: null, s: null }];
  const s = {
    mapId, mode, cardBonus, owners, armies, players: [...players], eliminated: [], eliminatedBy: {},
    deck: shuffle(cards, rng), discard: [], hands: Object.fromEntries(players.map((p) => [p, []])), tradeCount: 0,
    stage: 'reinforce', reserve: 0, conquered: false, attacks: 0, pending: null, last: null, turnNo: 1,
    missions: mode === 'mission' ? dealMissions(players, mapId, rng) : null,
  };
  s.reserve = reinforcement(s, players[0]);
  return s;
}

// ---------- Auswertung ----------
export const ownedBy = (s, p) => mapTerritories(s.mapId).filter((t) => s.owners[t] === p);
export const alive = (s) => s.players.filter((p) => !s.eliminated.includes(p));
export function ownedContinents(s, p) {
  return MAPS[s.mapId].continents.filter((ci) => continentTerritories(ci).every((t) => s.owners[t] === p));
}
export function reinforcement(s, p) {
  const base = Math.max(3, Math.floor(ownedBy(s, p).length / 3));
  return base + ownedContinents(s, p).reduce((sum, ci) => sum + CONTINENTS[ci].bonus, 0);
}
export const reinforcementParts = (s, p) => ({
  territories: Math.max(3, Math.floor(ownedBy(s, p).length / 3)),
  continents: ownedContinents(s, p).map((ci) => ({ id: ci, bonus: CONTINENTS[ci].bonus })),
});
export const totalArmies = (s, p) => ownedBy(s, p).reduce((n, t) => n + s.armies[t], 0);

// ---------- Karten ----------
export const tradeValue = (count, mode = 'rising') => (mode === 'fixed' ? 6 : count < 6 ? [4, 6, 8, 10, 12, 15][count] : 15 + 5 * (count - 5));
export function validSet(cards) {
  if (cards.length !== 3) return false;
  const wild = cards.filter((c) => c.t === null).length;
  if (wild >= 1) return true;
  const sym = new Set(cards.map((c) => c.s));
  return sym.size === 1 || sym.size === 3;
}
// Alle möglichen Dreiersätze einer Hand (Indizes), beste zuerst: erst Sätze mit eigenem Gebiet
export function findSets(hand, owned = () => false) {
  const out = [];
  for (let a = 0; a < hand.length; a++) for (let b = a + 1; b < hand.length; b++) for (let c = b + 1; c < hand.length; c++) {
    const idx = [a, b, c];
    if (validSet(idx.map((i) => hand[i]))) out.push({ idx, bonus: idx.some((i) => hand[i].t !== null && owned(hand[i].t)) ? 1 : 0, wild: idx.filter((i) => hand[i].t === null).length });
  }
  return out.sort((x, y) => y.bonus - x.bonus || x.wild - y.wild).map((x) => x.idx);
}
export const needTrade = (s, p) => (s.stage === 'reinforce' && s.hands[p].length >= HAND_LIMIT) || s.hands[p].length > HAND_LIMIT;
export function trade(s, p, idx) {
  if (s.pending) fail('Zuerst Truppen nachziehen');
  if (!(s.stage === 'reinforce' || (s.stage === 'attack' && needTrade(s, p)))) fail('Tauschen geht nur zu Beginn des Zuges');
  if (!Array.isArray(idx) || idx.length !== 3 || new Set(idx).size !== 3 || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= s.hands[p].length)) fail('Wähle drei verschiedene Karten');
  const cards = idx.map((i) => s.hands[p][i]);
  if (!validSet(cards)) fail('Das ist kein gültiger Satz: dreimal gleich, dreimal verschieden oder mit Joker');
  const value = tradeValue(s.tradeCount, s.cardBonus);
  s.tradeCount++;
  s.hands[p] = s.hands[p].filter((_, i) => !idx.includes(i));
  s.discard.push(...cards);
  s.reserve += value;
  const own = cards.find((c) => c.t !== null && s.owners[c.t] === p);
  if (own) s.armies[own.t] += 2; // Gebietsbonus: +2 Truppen auf dem eigenen Gebiet der Karte
  return { value, bonusOn: own ? own.t : null };
}
function draw(s, p, rng) {
  if (!s.deck.length && s.discard.length) { s.deck = shuffle(s.discard, rng); s.discard = []; }
  const card = s.deck.pop();
  if (card) s.hands[p].push(card);
  return card || null;
}

// ---------- Zugablauf ----------
export function startTurn(s, p) {
  s.stage = 'reinforce'; s.reserve = reinforcement(s, p); s.conquered = false; s.attacks = 0; s.pending = null; s.last = null;
}
export function place(s, p, t, n) {
  if (s.pending) fail('Zuerst Truppen nachziehen');
  if (s.reserve <= 0) fail('Du hast keine Verstärkung mehr');
  if (needTrade(s, p)) fail('Tausche zuerst einen Kartensatz ein');
  if (s.owners[t] !== p) fail('Das Gebiet gehört dir nicht');
  if (!Number.isInteger(n) || n < 1 || n > s.reserve) fail('Ungültige Truppenzahl');
  s.armies[t] += n; s.reserve -= n;
}
export function toAttack(s, p) {
  if (s.stage !== 'reinforce') fail('Du bist nicht in der Verstärkung');
  if (needTrade(s, p)) fail('Tausche zuerst einen Kartensatz ein');
  if (s.reserve > 0) fail('Setze zuerst alle Verstärkung ein');
  s.stage = 'attack';
}
export function canAttackFrom(s, p, t) {
  return s.owners[t] === p && s.armies[t] >= 2 ? neighbors(t, s.mapId).filter((n) => s.owners[n] !== p) : [];
}
export function attack(s, p, from, to, dice, rng) {
  if (s.stage !== 'attack') fail('Angreifen geht nur in der Angriffsphase');
  if (s.pending) fail('Zuerst Truppen in das eroberte Gebiet nachziehen');
  if (s.reserve > 0 || needTrade(s, p)) fail('Setze zuerst deine Verstärkung ein');
  if (s.owners[from] !== p) fail('Das Ausgangsgebiet gehört dir nicht');
  if (s.owners[to] === p || !(to in s.owners)) fail('Wähle ein gegnerisches Gebiet');
  if (!neighbors(from, s.mapId).includes(to)) fail('Die Gebiete grenzen nicht aneinander');
  if (s.armies[from] < 2) fail('Zum Angreifen braucht es mindestens zwei Truppen');
  const maxDice = Math.min(3, s.armies[from] - 1);
  if (!Number.isInteger(dice) || dice < 1 || dice > maxDice) fail('Ungültige Würfelzahl');
  const att = Array.from({ length: dice }, () => die(rng)).sort((a, b) => b - a);
  const def = Array.from({ length: Math.min(2, s.armies[to]) }, () => die(rng)).sort((a, b) => b - a);
  let atkLoss = 0, defLoss = 0;
  for (let i = 0; i < Math.min(att.length, def.length); i++) att[i] > def[i] ? defLoss++ : atkLoss++; // Gleichstand gewinnt die Verteidigung
  s.armies[from] -= atkLoss; s.armies[to] -= defLoss; s.attacks++;
  const defender = s.owners[to];
  const result = { from, to, att, def, atkLoss, defLoss, attacker: p, defender, conquered: false, eliminated: null };
  if (s.armies[to] <= 0) {
    const move = Math.min(dice, s.armies[from] - 1);
    s.owners[to] = p; s.armies[to] = move; s.armies[from] -= move; s.conquered = true;
    s.pending = { from, to, extra: s.armies[from] - 1 };
    result.conquered = true; result.moved = move;
    if (defender && !ownedBy(s, defender).length) {
      s.eliminated.push(defender); s.eliminatedBy[defender] = p;
      s.hands[p].push(...s.hands[defender]); s.hands[defender] = [];
      result.eliminated = defender;
    }
    if (s.pending.extra <= 0) s.pending = null;
  }
  s.last = result;
  return result;
}
export function occupy(s, p, n) {
  if (!s.pending) fail('Es gibt nichts nachzuziehen');
  const { from, to, extra } = s.pending;
  if (!Number.isInteger(n) || n < 0 || n > extra) fail('Ungültige Truppenzahl');
  s.armies[from] -= n; s.armies[to] += n; s.pending = null;
  return n;
}
export function toFortify(s, p) {
  if (s.stage !== 'attack') fail('Du bist nicht in der Angriffsphase');
  if (s.pending) fail('Zuerst Truppen nachziehen');
  if (s.reserve > 0 || needTrade(s, p)) fail('Setze zuerst deine Verstärkung ein');
  s.stage = 'fortify';
}
// Verschieben: nur über zusammenhängende eigene Gebiete
export function connected(s, p, from, to) {
  const seen = new Set([from]), queue = [from];
  while (queue.length) {
    const t = queue.shift();
    if (t === to) return true;
    for (const n of neighbors(t, s.mapId)) if (s.owners[n] === p && !seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return false;
}
export function fortify(s, p, from, to, n) {
  if (s.stage !== 'fortify') fail('Verschieben geht erst nach dem Angriff');
  if (s.owners[from] !== p || s.owners[to] !== p || from === to) fail('Beide Gebiete müssen dir gehören');
  if (!Number.isInteger(n) || n < 1 || n > s.armies[from] - 1) fail('Ungültige Truppenzahl (ein Truppe bleibt zurück)');
  if (!connected(s, p, from, to)) fail('Die Gebiete sind nicht über eigene Gebiete verbunden');
  s.armies[from] -= n; s.armies[to] += n;
}
// Zug beenden: wer in diesem Zug erobert hat, zieht eine Karte
export function endTurn(s, p, rng = Math.random) {
  if (s.stage === 'reinforce') fail('Verstärke und greife zuerst an – oder beende die Verstärkung');
  if (s.pending) fail('Zuerst Truppen nachziehen');
  if (s.reserve > 0 || needTrade(s, p)) fail('Setze zuerst deine Verstärkung ein');
  const card = s.conquered ? draw(s, p, rng) : null;
  return card;
}

// ---------- Missionen ----------
function dealMissions(players, mapId, rng) {
  const conts = MAPS[mapId].continents, big = mapId === 'full';
  const out = {};
  for (const p of players) {
    const kinds = ['continents', 'territories', 'strong', ...(players.length > 2 ? ['eliminate'] : [])];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    if (kind === 'continents') { const [a, b] = shuffle(conts, rng); out[p] = { kind, a, b }; }
    else if (kind === 'territories') out[p] = { kind, n: big ? 24 : 16 };
    else if (kind === 'strong') out[p] = { kind, n: big ? 16 : 11 };
    else out[p] = { kind, target: shuffle(players.filter((x) => x !== p), rng)[0] };
  }
  return out;
}
// Ein Ziel, das nicht mehr möglich ist (der Gegner wurde von jemand anderem besiegt), wird zu „24 Gebiete“
export function effectiveMission(s, p) {
  const m = s.missions?.[p];
  if (!m) return null;
  if (m.kind === 'eliminate' && s.eliminated.includes(m.target) && s.eliminatedBy[m.target] !== p) return { kind: 'territories', n: s.mapId === 'full' ? 24 : 16, fallback: true };
  return m;
}
export function missionDone(s, p) {
  const m = effectiveMission(s, p);
  if (!m) return false;
  if (m.kind === 'continents') return [m.a, m.b].every((ci) => continentTerritories(ci).every((t) => s.owners[t] === p));
  if (m.kind === 'territories') return ownedBy(s, p).length >= m.n;
  if (m.kind === 'strong') return ownedBy(s, p).filter((t) => s.armies[t] >= 2).length >= m.n;
  if (m.kind === 'eliminate') return s.eliminated.includes(m.target) && s.eliminatedBy[m.target] === p;
  return false;
}
export function missionText(s, p, nameOf = (x) => x) {
  const m = effectiveMission(s, p);
  if (!m) return null;
  const c = (ci) => CONTINENTS[ci].name, e = (ci) => CONTINENTS[ci].nameEn;
  if (m.kind === 'continents') return { de: `Beherrsche ${c(m.a)} und ${c(m.b)} vollständig.`, en: `Control ${e(m.a)} and ${e(m.b)} completely.` };
  if (m.kind === 'territories') return { de: `Besitze ${m.n} Gebiete${m.fallback ? ' (dein Ziel wurde von jemand anderem erledigt)' : ''}.`, en: `Own ${m.n} territories${m.fallback ? ' (someone else removed your target)' : ''}.` };
  if (m.kind === 'strong') return { de: `Besitze ${m.n} Gebiete mit je mindestens 2 Truppen.`, en: `Own ${m.n} territories with at least 2 armies each.` };
  return { de: `Besiege ${nameOf(m.target)} selbst – wer ihn vor dir ausschaltet, ändert dein Ziel.`, en: `Eliminate ${nameOf(m.target)} yourself – if someone else does, your goal changes.` };
}

// Wer hat gewonnen? Weltherrschaft oder (im Missionsmodus) ein erfülltes Ziel – der Spieler am Zug zuerst.
export function winner(s, actor) {
  const live = alive(s);
  if (live.length === 1) return { id: live[0], by: 'world' };
  if (s.missions) for (const p of [actor, ...live.filter((x) => x !== actor)]) if (p && !s.eliminated.includes(p) && missionDone(s, p)) return { id: p, by: 'mission' };
  return null;
}
