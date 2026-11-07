// Gebietskampf-Computerspieler. Er sieht nur die Karte, die Truppen, seine eigenen Karten und sein eigenes Ziel
// (also genau die Ansicht eines Spielers, nie fremde Handkarten oder Ziele).
// Stufen: easy – grob und sprunghaft, medium – sicherer Angriff nach Truppenüberlegenheit, hard – plant Kontinente, Zielvorgaben und Verschiebungen.
import { neighbors, continentTerritories, TERRITORIES } from './map.js';

const act = (method, data) => ({ method, args: [data] });
const mapOf = (g) => g.map.id;
const mineOf = (g, id) => (t) => g.owners[t] === id;

function context(g, id) {
  const mine = mineOf(g, id), map = mapOf(g);
  const own = Object.keys(g.owners).map(Number).filter(mine);
  const nb = (t) => neighbors(t, map);
  const foes = (t) => nb(t).filter((n) => !mine(n));
  const border = (t) => foes(t).length > 0;
  const threat = (t) => foes(t).reduce((n, f) => n + g.armies[f], 0);
  // Wie nah ist ein Kontinent daran, mir zu gehören? (Anteil eigener Gebiete)
  const contShare = (ci) => { const ts = continentTerritories(ci).filter((t) => t in g.owners); return ts.filter(mine).length / ts.length; };
  const contOf = (t) => TERRITORIES[t].continent;
  const bonusOf = (ci) => g.map.continents.find((c) => c.id === ci)?.bonus || 0;
  return { mine, own, nb, foes, border, threat, contShare, contOf, bonusOf, map };
}

function reinforceTarget(g, id, level, c, rng) {
  const borders = c.own.filter(c.border);
  const pool = borders.length ? borders : c.own;
  if (level === 'easy') return pool[Math.floor(rng() * pool.length)];
  let best = null;
  for (const t of pool) {
    const weakest = Math.min(...c.foes(t).map((f) => g.armies[f]), 99);
    const score = (c.threat(t) - g.armies[t]) * 0.6 + c.contShare(c.contOf(t)) * 6 * (level === 'hard' ? 1.5 : 1) * (1 + c.bonusOf(c.contOf(t)) / 6)
      + (weakest < 99 ? Math.max(0, g.armies[t] - weakest) * 0.15 : 0) + rng() * 0.3;
    if (!best || score > best.score) best = { t, score };
  }
  return best.t;
}

function attackOptions(g, id, level, c, rng) {
  const out = [];
  for (const t of c.own) {
    if (g.armies[t] < 2) continue;
    for (const f of c.foes(t)) {
      const ratio = (g.armies[t] - 1) / Math.max(1, g.armies[f]);
      const owner = g.owners[f];
      const lastOne = owner && Object.keys(g.owners).filter((x) => g.owners[x] === owner).length === 1;
      const completes = continentTerritories(c.contOf(f)).filter((x) => x in g.owners).every((x) => x === f || c.mine(x));
      const score = ratio + (completes ? 1.5 + c.bonusOf(c.contOf(f)) * 0.2 : 0) + (lastOne ? 1 : 0) + (level === 'hard' ? c.contShare(c.contOf(f)) : 0) + rng() * 0.2;
      out.push({ from: t, to: f, ratio, completes, lastOne, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function fortifyMove(g, id, c) {
  // von einem ruhigen Gebiet mit Truppen zu der Grenze mit der größten Bedrohung (über eigene Gebiete erreichbar)
  const interior = c.own.filter((t) => !c.border(t) && g.armies[t] >= 2).sort((a, b) => g.armies[b] - g.armies[a]);
  const borders = c.own.filter(c.border).sort((a, b) => (c.threat(b) - g.armies[b]) - (c.threat(a) - g.armies[a]));
  for (const from of interior) {
    const seen = new Set([from]), queue = [from];
    while (queue.length) {
      const t = queue.shift();
      for (const n of c.nb(t)) if (c.mine(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
    const to = borders.find((b) => seen.has(b));
    if (to !== undefined) return act('gkFortify', { from, to, n: g.armies[from] - 1 });
  }
  return null;
}

export function strategy(o, level, ctx) {
  const g = o.g, id = o.id, rng = ctx.rng, c = context(g, id);
  ctx.check?.();
  if (g.pending) {
    const { from, to, extra } = g.pending;
    const toBorder = c.border(to), fromBorder = c.border(from);
    const n = level === 'easy' ? Math.floor(extra / 2) : toBorder && !fromBorder ? extra : toBorder ? Math.ceil(extra / 2) : fromBorder ? Math.floor(extra / 3) : 0;
    return act('gkOccupy', { n });
  }
  if (g.stage === 'reinforce' || g.needTrade || g.reserve > 0) {
    if (g.sets.length && (g.needTrade || (g.canTrade && level !== 'easy') || (g.canTrade && g.hand.length >= 4))) return act('gkTrade', { cards: g.sets[0] });
    if (g.reserve > 0) return act('gkPlace', { t: reinforceTarget(g, id, level, c, rng), n: g.reserve });
    if (g.stage === 'reinforce') return act('gkNext', {});
  }
  if (g.stage === 'attack') {
    // Mit der Zeit werden alle mutiger, damit eine Partie nicht ewig stehen bleibt
    const press = Math.min(0.6, (g.turnNo || 0) / 250), cap = (level === 'easy' ? 3 : level === 'medium' ? 10 : 14) + Math.floor((g.turnNo || 0) / 40);
    if (g.attacks < cap) {
      const need = Math.max(1, (level === 'easy' ? 1.6 : level === 'medium' ? 1.35 : 1.15) - press);
      const options = attackOptions(g, id, level, c, rng).filter((x) => x.ratio >= need || (level !== 'easy' && (x.completes || x.lastOne) && x.ratio >= 1));
      const pick = level === 'easy' ? options[Math.floor(rng() * options.length)] : options[0];
      if (pick) return act('gkAttack', { from: pick.from, to: pick.to, dice: Math.min(3, g.armies[pick.from] - 1), blitz: level !== 'easy' && pick.ratio >= 2 });
    }
    return act('gkNext', {});
  }
  if (g.stage === 'fortify') {
    const move = level === 'easy' ? null : fortifyMove(g, id, c);
    return move || act('gkEnd', {});
  }
  return act('gkEnd', {});
}

// Sicherer Zug, wenn Zeit abläuft oder die Strategie scheitert: legal und ohne Risiko
export function fallback(o) {
  const g = o.g, id = o.id, own = Object.keys(g.owners).map(Number).filter((t) => g.owners[t] === id);
  if (g.pending) return act('gkOccupy', { n: 0 });
  if ((g.stage === 'reinforce' || g.needTrade) && g.sets.length && g.needTrade) return act('gkTrade', { cards: g.sets[0] });
  if (g.reserve > 0 && own.length) return act('gkPlace', { t: own[0], n: g.reserve });
  if (g.stage === 'reinforce') return act('gkNext', {});
  if (g.stage === 'attack') return act('gkNext', {});
  return act('gkEnd', {});
}
