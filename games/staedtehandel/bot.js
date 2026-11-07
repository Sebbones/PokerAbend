// Städtehandel-Computerspieler. Er sieht genau die Ansicht eines Spielers: Brett, eigene Rohstoffe und Karten, von den anderen nur,
// was am Tisch offen liegt (Kartenzahlen, Gebäude, Straßen). Stufen: easy – eher zufällig und zögerlich, medium – baut nach Ertragswert,
// hard – plant Kupfer-/Korn-Städte, nutzt Häfen, Räuber gegen den Führenden und Karten gezielt.
import { RES } from './map.js';
import { COST } from './rules.js';

const act = (method, data = {}) => ({ method, args: [data] });
const pipsOf = (n) => (n ? 6 - Math.abs(7 - n) : 0);
const sum = (h) => RES.reduce((n, r) => n + (h[r] || 0), 0);

function ctx(g, id) {
  const hexes = g.board.hexes, vs = g.board.vs, es = g.board.es;
  const vhex = vs.map(() => []);
  for (const h of hexes) for (const v of h.vs) vhex[v].push(h.id);
  const adj = vs.map(() => []);
  es.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const bld = (v) => g.buildings[v];
  const free = (v) => !bld(v) && adj[v].every((w) => !bld(w));
  const portOf = (v) => g.board.ports.filter((p) => p.a === v || p.b === v).map((p) => p.type);
  const myRes = new Set();
  for (const [v, b] of Object.entries(g.buildings)) if (b.o === id) for (const h of vhex[v]) if (hexes[h].num) myRes.add(hexes[h].terrain);
  const value = (v, level) => {
    let n = 0; const kinds = new Set();
    for (const h of vhex[v]) {
      const x = hexes[h];
      if (!x.num) continue;
      n += pipsOf(x.num) * (g.robber === h ? 0.3 : 1);
      kinds.add(x.terrain);
    }
    const fresh = [...kinds].filter((k) => !myRes.has(k)).length;
    let val = n + kinds.size * 1.2 + (level === 'easy' ? 0 : fresh * 1.5);
    if (level === 'hard') {
      for (const p of portOf(v)) val += p === 'any' ? 1.5 : kinds.has(p) ? 3.5 : 0.5;
      if ([...kinds].includes('korn') && [...kinds].includes('kupfer')) val += 2;
    }
    return val;
  };
  return { hexes, vs, es, vhex, adj, bld, free, portOf, value };
}

const have = (g, r) => g.hand[r] || 0;
const afford = (g, cost) => RES.every((r) => have(g, r) >= (cost[r] || 0));
const missing = (g, cost) => Object.fromEntries(RES.map((r) => [r, Math.max(0, (cost[r] || 0) - have(g, r))]));
const surplusOver = (g, need) => Object.fromEntries(RES.map((r) => [r, Math.max(0, have(g, r) - (need[r] || 0))]));

// Wunschliste in Reihenfolge der Wichtigkeit (nur, was auch wirklich möglich ist)
function goals(g, level) {
  const list = [];
  const can = g.legal;
  if (can.city.length) list.push('city');
  if (can.settlement.length) list.push('settlement');
  if (g.deckLeft > 0) list.push('dev');
  if (can.road.length) list.push('road');
  if (level === 'hard' && list.includes('settlement') && list.includes('city') && have(g, 'korn') < 2) return ['settlement', ...list.filter((x) => x !== 'settlement')];
  return list;
}

function pickRoad(c, g, id, level, rng, list) {
  if (!list.length) return null;
  if (level === 'easy') return list[Math.floor(rng() * list.length)];
  let best = null;
  for (const e of list) {
    const [a, b] = c.es[e];
    // Wohin führt die Straße? Wertvolle freie Ecke in zwei Schritten Entfernung
    let score = 0;
    for (const v of [a, b]) {
      if (c.bld(v)) continue;
      const own = Object.entries(g.buildings).some(([k, bb]) => Number(k) === v && bb.o === id);
      if (own) continue;
      if (c.free(v)) score = Math.max(score, c.value(v, level));
      for (const w of c.adj[v]) if (c.free(w)) score = Math.max(score, c.value(w, level) * 0.7);
    }
    score += rng() * 0.3;
    if (!best || score > best.score) best = { e, score };
  }
  return best.e;
}

function robberHex(g, id, c, level, rng) {
  const options = g.legal.robber;
  if (level === 'easy') return options[Math.floor(rng() * options.length)];
  const pointsOf = (p) => g.points[p] ?? 0;
  let best = null;
  for (const h of options) {
    let harm = 0;
    for (const v of c.hexes[h].vs) {
      const b = c.bld(v);
      if (!b) continue;
      const w = pipsOf(c.hexes[h].num) * (b.t === 'c' ? 2 : 1);
      if (b.o === id) harm -= w * 3;
      else harm += w * (level === 'hard' ? 1 + pointsOf(b.o) / 5 : 1);
    }
    harm += rng() * 0.5;
    if (!best || harm > best.harm) best = { h, harm };
  }
  return best.h;
}

function discardChoice(g, level, rng) {
  const need = g.discard[g.me], keep = { ...g.hand }, out = {};
  let n = need;
  const wanted = level === 'easy' ? {} : COST.city;
  while (n > 0) {
    // Zuerst, was am häufigsten da ist und nicht für ein Ziel gebraucht wird
    let r = null, score = -1;
    for (const k of RES) {
      if (keep[k] < 1) continue;
      const s = keep[k] - (wanted[k] || 0) * 0.4 + (level === 'easy' ? rng() * 2 : 0);
      if (s > score) { score = s; r = k; }
    }
    keep[r]--; out[r] = (out[r] || 0) + 1; n--;
  }
  return out;
}

function respondToOffer(g, level, rng) {
  const o = g.offer, me = g.me;
  if (!o || o.from === me || o.res[me] !== null) return null;
  const ok = RES.every((r) => have(g, r) >= (o.want[r] || 0));
  if (!ok) return act('ssRespond', { offerId: o.id, accept: false });
  if (level === 'easy') return act('ssRespond', { offerId: o.id, accept: rng() < 0.45 });
  // Nützt es mir? Ich bekomme etwas, das ich für ein Ziel brauche, und gebe nichts davon her
  const need = {};
  for (const goal of ['city', 'settlement', 'dev', 'road']) for (const r of RES) need[r] = Math.max(need[r] || 0, COST[goal][r] || 0);
  const gives = RES.some((r) => (o.want[r] || 0) > Math.max(0, have(g, r) - (need[r] || 0)) && have(g, r) - (o.want[r] || 0) < (need[r] || 0) && (o.want[r] || 0) > 0 && have(g, r) <= (need[r] || 0));
  const gets = RES.some((r) => (o.give[r] || 0) > 0 && have(g, r) < (need[r] || 0));
  const sizeOk = sum(o.give) >= sum(o.want);
  let accept = gets && !gives && sizeOk;
  if (level === 'hard' && (g.points[o.from] ?? 0) >= g.target - 2) accept = false;
  return act('ssRespond', { offerId: o.id, accept });
}

export function strategy(o, level, ctx0) {
  const g = o.g, id = o.id, rng = ctx0?.rng || Math.random;
  ctx0?.check?.();
  const c = ctx(g, id);
  const me = g.me;
  g.legal ||= { settlement: [], city: [], road: [], robber: [], victims: [], can: {} };

  // Pflichten außerhalb des eigenen Zuges
  if (g.stage === 'discard') return g.discard[me] ? act('ssDiscard', { cards: discardChoice(g, level, rng) }) : null;
  if (g.cur !== me) return g.stage === 'main' ? respondToOffer(g, level, rng) : null;

  switch (g.stage) {
    case 'setup': {
      if (g.legal.settlement.length) {
        const list = g.legal.settlement;
        if (level === 'easy') return act('ssBuild', { kind: 'settlement', at: list[Math.floor(rng() * list.length)] });
        let best = null;
        for (const v of list) { const val = c.value(v, level) + rng() * 0.4; if (!best || val > best.val) best = { v, val }; }
        return act('ssBuild', { kind: 'settlement', at: best.v });
      }
      return act('ssBuild', { kind: 'road', at: pickRoad(c, g, id, level, rng, g.legal.road) });
    }
    case 'roll': {
      const knight = g.devPlayable.ritter > 0 && !g.devPlayed;
      if (knight && level !== 'easy') {
        // Der Räuber blockiert eines meiner Felder: vor dem Würfeln vertreiben
        const blocked = Object.entries(g.buildings).some(([v, b]) => b.o === id && c.vhex[v].includes(g.robber) && pipsOf(c.hexes[g.robber].num) >= 4);
        if (blocked) return act('ssPlay', { card: 'ritter' });
      }
      return act('ssRoll');
    }
    case 'robber': return act('ssRobber', { hex: robberHex(g, id, c, level, rng) });
    case 'steal': {
      const list = g.legal.victims;
      const pick = level === 'easy' ? list[Math.floor(rng() * list.length)] : [...list].sort((a, b) => (g.points[b] ?? 0) - (g.points[a] ?? 0) || (g.cards[b] ?? 0) - (g.cards[a] ?? 0))[0];
      return act('ssSteal', { victim: pick });
    }
    case 'roadbuilding': {
      const e = pickRoad(c, g, id, level, rng, g.legal.road);
      return e === null ? act('ssEndRoads') : act('ssBuild', { kind: 'road', at: e });
    }
    default: break;
  }

  // Angebot, das ich gemacht habe, ist beantwortet
  if (g.offer && g.offer.from === me) {
    const yes = Object.entries(g.offer.res).filter(([, v]) => v === 'accept').map(([p]) => p);
    if (yes.length) return act('ssConfirm', { offerId: g.offer.id, with: [...yes].sort((a, b) => (g.points[a] ?? 0) - (g.points[b] ?? 0))[0] });
    return act('ssCancel');
  }

  // Hauptphase
  const can = g.legal.can || {};
  const knightOn = g.devPlayable.ritter > 0 && !g.devPlayed;
  if (!g.devPlayed && level !== 'easy') {
    if (knightOn) {
      const blocked = Object.entries(g.buildings).some(([v, b]) => b.o === id && c.vhex[v].includes(g.robber) && pipsOf(c.hexes[g.robber].num) >= 4);
      if (blocked || (level === 'hard' && g.knights[me] === 2 && g.army.holder !== me)) return act('ssPlay', { card: 'ritter' });
    }
    if (level === 'hard' && g.devPlayable.strassenbau > 0 && g.left.road >= 2 && g.legal.road.length >= 2 && !can.settlement) return act('ssPlay', { card: 'strassenbau' });
    if (g.devPlayable.erfindung > 0) {
      const goal = goals(g, level).find((x) => x === 'city' || x === 'settlement');
      if (goal) {
        const m = missing(g, COST[goal]), want = RES.flatMap((r) => Array(m[r]).fill(r));
        if (want.length >= 1 && want.length <= 2) { while (want.length < 2) want.push(want[0]); return act('ssPlay', { card: 'erfindung', a: want[0], b: want[1] }); }
      }
    }
    if (level === 'hard' && g.devPlayable.monopol > 0) {
      const r = RES.slice().sort((a, b) => have(g, a) - have(g, b))[0];
      if (g.bankCards[r] < 15) return act('ssPlay', { card: 'monopol', res: r });
    }
  }
  const order = level === 'easy' ? ['road', 'settlement', 'city', 'dev'] : level === 'medium' ? ['city', 'settlement', 'dev', 'road'] : null;
  const tryBuild = (kind) => {
    if (kind === 'city' && can.city) { let best = null; for (const v of g.legal.city) { const val = c.value(Number(v), level); if (!best || val > best.val) best = { v, val }; } return act('ssBuild', { kind: 'city', at: Number(best.v) }); }
    if (kind === 'settlement' && can.settlement) {
      let best = null;
      for (const v of g.legal.settlement) { const val = c.value(v, level) + rng() * 0.3; if (!best || val > best.val) best = { v, val }; }
      if (level === 'easy' && rng() < 0.3) return null;
      return act('ssBuild', { kind: 'settlement', at: best.v });
    }
    if (kind === 'dev' && can.dev) return level === 'easy' && rng() < 0.4 ? null : act('ssBuyDev');
    if (kind === 'road' && can.road) {
      // Straßen nur, wenn sie etwas bringen: keine freie Siedlungsstelle in Reichweite oder Rennen um die längste Straße
      const spots = g.legal.settlement.length;
      if (level !== 'easy' && spots) return null;
      if (g.left.road <= 0) return null;
      if (level !== 'easy' && g.myRoad >= 8 && g.longest.holder === me) return null;
      return act('ssBuild', { kind: 'road', at: pickRoad(c, g, id, level, rng, g.legal.road) });
    }
    return null;
  };
  const sequence = order || (goals(g, level).includes('settlement') && have(g, 'korn') >= 2 && have(g, 'kupfer') >= 3 ? ['city', 'settlement', 'dev', 'road'] : ['settlement', 'city', 'dev', 'road']);
  for (const kind of sequence) { const a = tryBuild(kind); if (a) return a; }

  // Fehlt genau eine Karte für ein Ziel? Hafen/Bank, dann ein Angebot an die Mitspieler
  if (level !== 'easy' || rng() < 0.25) {
    for (const goal of goals(g, level)) {
      if (goal === 'road') continue;
      const m = missing(g, COST[goal]), lack = RES.filter((r) => m[r] > 0);
      if (!lack.length || sum(m) > 2) continue;
      const spare = surplusOver(g, COST[goal]);
      if (lack.length === 1) {
        const r = lack[0];
        const give = RES.filter((x) => x !== r && spare[x] >= g.ratios[x]).sort((a, b) => g.ratios[a] - g.ratios[b] || spare[b] - spare[a])[0];
        if (give && g.bankCards[r] > 0 && m[r] === 1) return act('ssBank', { give, get: r });
        if (level !== 'easy' && g.offers === 0 && m[r] === 1) {
          const extra = RES.filter((x) => x !== r && spare[x] >= 1).sort((a, b) => spare[b] - spare[a])[0];
          if (extra && g.players.length > 1) return act('ssOffer', { give: { [extra]: 1 }, want: { [r]: 1 } });
        }
      }
    }
  }
  // Überfluss in Notfall am Zugende bunkern: lieber wertvoll tauschen als verlieren (Räuber ab 8 Karten)
  if (level === 'hard' && sum(g.hand) > 7) {
    const big = RES.slice().sort((a, b) => have(g, b) - have(g, a))[0], small = RES.slice().sort((a, b) => have(g, a) - have(g, b))[0];
    if (have(g, big) >= g.ratios[big] + 1 && big !== small && g.bankCards[small] > 0) return act('ssBank', { give: big, get: small });
  }
  return act('ssEnd');
}

// Sicherer Zug, wenn die Zeit abläuft oder die Strategie scheitert: legal und ohne Risiko
export function fallback(o) {
  const g = o.g, me = g.me ?? o.id;
  const first = (list) => list[0];
  if (g.stage === 'discard') {
    const need = g.discard[me]; if (!need) return act('ssEnd');
    const out = {}, h = { ...g.hand }; let n = need;
    while (n > 0) { const r = RES.slice().sort((a, b) => h[b] - h[a])[0]; h[r]--; out[r] = (out[r] || 0) + 1; n--; }
    return act('ssDiscard', { cards: out });
  }
  if (g.cur !== me) return g.offer && g.offer.res?.[me] === null ? act('ssRespond', { offerId: g.offer.id, accept: false }) : act('ssEnd');
  if (g.stage === 'setup') return g.legal.settlement.length ? act('ssBuild', { kind: 'settlement', at: first(g.legal.settlement) }) : act('ssBuild', { kind: 'road', at: first(g.legal.road) });
  if (g.stage === 'roll') return act('ssRoll');
  if (g.stage === 'robber') return act('ssRobber', { hex: first(g.legal.robber) });
  if (g.stage === 'steal') return act('ssSteal', { victim: first(g.legal.victims) });
  if (g.stage === 'roadbuilding') return act('ssEndRoads');
  if (g.offer && g.offer.from === me) return act('ssCancel');
  return act('ssEnd');
}
