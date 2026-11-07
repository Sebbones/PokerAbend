// Städtehandel – reine Spielregeln (ohne Netzwerk). Alle Würfe, Ziehungen und Prüfungen laufen hier, der Raum (room.js) ruft nur auf.
// Der Spielstand ist reines JSON (wird mitten im Spiel gespeichert). Geheim: Rohstoffe (res), Entwicklungskarten (dev) und der Kartenstapel (deck).
import { RES, SIZES, topology, makeBoard, portTypes, shuffle } from './map.js';

export const COST = {
  road: { holz: 1, ton: 1 },
  settlement: { holz: 1, ton: 1, wolle: 1, korn: 1 },
  city: { korn: 2, kupfer: 3 },
  dev: { wolle: 1, korn: 1, kupfer: 1 },
};
export const LIMITS = { road: 15, settlement: 5, city: 4 };
export const DEV_KINDS = ['ritter', 'siegpunkt', 'strassenbau', 'erfindung', 'monopol'];
export const DEV_NAMES = { ritter: 'Ritter', siegpunkt: 'Bauwerk (1 Punkt)', strassenbau: 'Straßenbau', erfindung: 'Erfindung', monopol: 'Handelsmonopol' };

const fail = (m) => { throw new Error(m); };
const zero = () => Object.fromEntries(RES.map((r) => [r, 0]));
const total = (h) => RES.reduce((n, r) => n + h[r], 0);
const isInt = (n) => Number.isInteger(n);
export const cardsOf = (s, id) => total(s.res[id] || zero());

// ---------- Aufbau ----------
export function newGame({ players, size = 'standard', layout = 'random', target = 10 }, rng = Math.random) {
  const cfg = SIZES[size];
  if (!cfg) fail('Unbekannte Brettgröße');
  if (!Array.isArray(players) || players.length < 2 || players.length > 6) fail('Städtehandel braucht zwei bis sechs Spieler');
  const t = topology(size), { terrain, nums } = makeBoard(size, layout, rng), types = portTypes(size, rng);
  const deck = shuffle(Object.entries(cfg.dev).flatMap(([k, n]) => Array(n).fill(k)), rng);
  return {
    players: [...players], size, layout, target: Math.max(5, Math.min(15, Math.floor(target) || 10)),
    terrain, nums, robber: terrain.indexOf('duene'),
    ports: t.slots.map((sl, i) => ({ type: types[i], e: sl.e })),
    res: Object.fromEntries(players.map((p) => [p, zero()])),
    bank: Object.fromEntries(RES.map((r) => [r, cfg.bank])),
    dev: Object.fromEntries(players.map((p) => [p, []])), deck, bought: [], devPlayed: false,
    knights: Object.fromEntries(players.map((p) => [p, 0])),
    buildings: {}, roads: {}, out: [],
    longest: { holder: null, len: 0 }, army: { holder: null, n: 0 },
    stage: 'setup', cur: players[0], turnNo: 0,
    setup: { order: [...players, ...[...players].reverse()], i: 0, step: 'settlement', last: null },
    dice: null, rolled: false, after: 'main', discard: {}, victims: [], roadsLeft: 0,
    offer: null, offerSeq: 0, offers: 0, last: null,
  };
}

const alive = (s) => s.players.filter((p) => !s.out.includes(p));
const own = (s, id) => s.players.includes(id) && !s.out.includes(id);
const pieces = (s, id, kind) => (kind === 'road' ? Object.values(s.roads).filter((o) => o === id).length : Object.values(s.buildings).filter((b) => b.o === id && b.t === (kind === 'city' ? 'c' : 's')).length);
export const piecesLeft = (s, id) => ({ road: LIMITS.road - pieces(s, id, 'road'), settlement: LIMITS.settlement - pieces(s, id, 'settlement'), city: LIMITS.city - pieces(s, id, 'city') });
const hasCost = (s, id, cost) => RES.every((r) => (s.res[id][r] || 0) >= (cost[r] || 0));
const pay = (s, id, cost) => { for (const r of RES) { const n = cost[r] || 0; s.res[id][r] -= n; s.bank[r] += n; } };
const gain = (s, id, r, n) => { s.res[id][r] += n; s.bank[r] -= n; };

// ---------- Bauplätze ----------
function vertexFree(s, t, v) {
  return !s.buildings[v] && t.vs[v].adj.every((w) => !s.buildings[w]);
}
const roadAt = (s, t, id, v, except = -1) => t.vs[v].es.some((e) => e !== except && s.roads[e] === id);
// Eine Kante ist anschließbar, wenn an einer Ecke ein eigenes Gebäude steht oder eine eigene Straße ankommt, die nicht durch fremde Gebäude unterbrochen ist
function connected(s, t, id, e) {
  const ed = t.es[e];
  return [ed.a, ed.b].some((v) => (s.buildings[v]?.o === id) || ((!s.buildings[v] || s.buildings[v].o === id) && roadAt(s, t, id, v, e)));
}
export function settlementSpots(s, id) {
  const t = topology(s.size);
  if (s.stage === 'setup') return t.vs.filter((v) => vertexFree(s, t, v.id)).map((v) => v.id);
  return t.vs.filter((v) => vertexFree(s, t, v.id) && roadAt(s, t, id, v.id)).map((v) => v.id);
}
export const citySpots = (s, id) => Object.entries(s.buildings).filter(([, b]) => b.o === id && b.t === 's').map(([v]) => Number(v));
export function roadSpots(s, id) {
  const t = topology(s.size);
  if (s.stage === 'setup') return s.setup.last === null ? [] : t.vs[s.setup.last].es.filter((e) => s.roads[e] === undefined);
  return t.es.filter((e) => s.roads[e.id] === undefined && connected(s, t, id, e.id)).map((e) => e.id);
}

// ---------- Längste Straße und größte Rittermacht ----------
export function roadLength(s, id) {
  const t = topology(s.size), mine = Object.keys(s.roads).filter((e) => s.roads[e] === id).map(Number);
  if (!mine.length) return 0;
  const used = new Set();
  let best = 0;
  const walk = (v, len) => {
    best = Math.max(best, len);
    for (const e of t.vs[v].es) {
      if (s.roads[e] !== id || used.has(e)) continue;
      const w = t.es[e].a === v ? t.es[e].b : t.es[e].a;
      used.add(e);
      // Ein fremdes Gebäude beendet die Straße an dieser Ecke
      if (s.buildings[w] && s.buildings[w].o !== id) best = Math.max(best, len + 1); else walk(w, len + 1);
      used.delete(e);
    }
  };
  const starts = new Set(mine.flatMap((e) => [t.es[e].a, t.es[e].b]));
  for (const v of starts) walk(v, 0);
  return best;
}
export function updateAwards(s) {
  const events = [];
  const lens = Object.fromEntries(alive(s).map((p) => [p, roadLength(s, p)])), max = Math.max(0, ...Object.values(lens));
  const before = s.longest.holder;
  let holder = null;
  if (max >= 5) {
    const top = Object.keys(lens).filter((p) => lens[p] === max);
    holder = top.includes(before) ? before : top.length === 1 ? top[0] : null;
  }
  s.longest = { holder, len: holder ? max : 0 };
  if (holder !== before) events.push({ award: 'longest', from: before, to: holder });
  const armyBefore = s.army.holder;
  let top = s.army.n, aHolder = armyBefore;
  for (const p of alive(s)) if (s.knights[p] >= 3 && s.knights[p] > top) { top = s.knights[p]; aHolder = p; }
  s.army = { holder: aHolder, n: aHolder ? s.knights[aHolder] : 0 };
  if (aHolder !== armyBefore) events.push({ award: 'army', from: armyBefore, to: aHolder });
  return events;
}

// ---------- Punkte ----------
export function publicPoints(s, id) {
  let n = 0;
  for (const b of Object.values(s.buildings)) if (b.o === id) n += b.t === 'c' ? 2 : 1;
  if (s.longest.holder === id) n += 2;
  if (s.army.holder === id) n += 2;
  return n;
}
export const hiddenPoints = (s, id) => (s.dev[id] || []).filter((k) => k === 'siegpunkt').length;
export const points = (s, id) => publicPoints(s, id) + hiddenPoints(s, id);
// Gewonnen wird nur im eigenen Zug
export function winner(s, id) {
  if (s.stage === 'setup' || s.cur !== id || !own(s, id)) return null;
  return points(s, id) >= s.target ? id : null;
}

// ---------- Ablauf ----------
function startTurn(s, id) {
  s.cur = id; s.stage = 'roll'; s.dice = null; s.rolled = false; s.after = 'main'; s.bought = []; s.devPlayed = false;
  s.offer = null; s.offers = 0; s.discard = {}; s.victims = []; s.roadsLeft = 0; s.turnNo++;
}
export { startTurn };
const needCur = (s, id) => { if (s.cur !== id || !own(s, id)) fail('Du bist nicht dran'); };
const needStage = (s, ...stages) => { if (!stages.includes(s.stage)) fail('Das geht jetzt nicht'); };

export function roll(s, id, rng = Math.random, forced = null) {
  needCur(s, id); needStage(s, 'roll');
  const dice = forced || [Math.floor(rng() * 6) + 1, Math.floor(rng() * 6) + 1], sum = dice[0] + dice[1];
  s.dice = dice; s.rolled = true;
  const out = { dice, sum, gains: {}, discard: {} };
  if (sum === 7) {
    for (const p of alive(s)) { const n = cardsOf(s, p); if (n > 7) out.discard[p] = Math.floor(n / 2); }
    s.discard = { ...out.discard }; s.after = 'main';
    s.stage = Object.keys(s.discard).length ? 'discard' : 'robber';
  } else { out.gains = produce(s, sum); s.stage = 'main'; }
  s.last = { kind: 'roll', dice, sum, by: id };
  return out;
}
// Ertrag: Siedlung 1, Stadt 2. Reicht der Vorrat der Bank nicht: ein einzelner Empfänger bekommt den Rest, mehrere gehen leer aus.
export function produce(s, sum) {
  const t = topology(s.size), owed = {};
  for (const h of t.hexes) {
    if (s.nums[h.id] !== sum || h.id === s.robber || s.terrain[h.id] === 'duene') continue;
    for (const v of h.vs) {
      const b = s.buildings[v];
      if (!b || s.out.includes(b.o)) continue;
      const r = s.terrain[h.id];
      owed[r] ||= {}; owed[r][b.o] = (owed[r][b.o] || 0) + (b.t === 'c' ? 2 : 1);
    }
  }
  const gains = {};
  for (const [r, who] of Object.entries(owed)) {
    const sum2 = Object.values(who).reduce((a, b) => a + b, 0), ids = Object.keys(who);
    if (sum2 <= s.bank[r]) for (const p of ids) { gain(s, p, r, who[p]); (gains[p] ||= {})[r] = who[p]; }
    else if (ids.length === 1) { const n = s.bank[r]; if (n > 0) { gain(s, ids[0], r, n); (gains[ids[0]] ||= {})[r] = n; } }
  }
  return gains;
}
function cleanCards(cards) {
  const out = zero();
  for (const [r, n] of Object.entries(cards || {})) {
    if (!RES.includes(r) || !isInt(n) || n < 0 || n > 99) fail('Ungültige Rohstoffe');
    out[r] = n;
  }
  return out;
}
export function discard(s, id, cards) {
  needStage(s, 'discard');
  const need = s.discard[id];
  if (!need) fail('Du musst nichts abwerfen');
  const c = cleanCards(cards);
  if (total(c) !== need) fail(`Wirf genau ${need} Karten ab`);
  if (!hasCost(s, id, c)) fail('Du hast diese Rohstoffe nicht');
  pay(s, id, c); delete s.discard[id];
  if (!Object.keys(s.discard).length) s.stage = 'robber';
  return { done: s.stage === 'robber' };
}
export function moveRobber(s, id, hex, rng = Math.random) {
  needCur(s, id); needStage(s, 'robber');
  const t = topology(s.size);
  if (!isInt(hex) || hex < 0 || hex >= t.hexes.length) fail('Dieses Feld gibt es nicht');
  if (hex === s.robber) fail('Der Räuber muss auf ein anderes Feld');
  s.robber = hex;
  s.victims = [...new Set(t.hexes[hex].vs.map((v) => s.buildings[v]?.o).filter((o) => o && o !== id && !s.out.includes(o) && cardsOf(s, o) > 0))];
  s.last = { kind: 'robber', hex, by: id };
  if (s.victims.length === 1) return { hex, victims: [...s.victims], stolen: steal(s, id, s.victims[0], rng) };
  if (s.victims.length === 0) s.stage = s.after; else s.stage = 'steal';
  return { hex, victims: [...s.victims], stolen: null };
}
export function steal(s, id, victim, rng = Math.random) {
  needCur(s, id);
  if (s.stage !== 'steal' && !(s.stage === 'robber' && s.victims.includes(victim))) fail('Das geht jetzt nicht');
  if (!s.victims.includes(victim)) fail('Von diesem Spieler kannst du nicht stehlen');
  const pool = RES.flatMap((r) => Array(s.res[victim][r]).fill(r));
  const r = pool[Math.floor(rng() * pool.length)];
  s.res[victim][r]--; s.res[id][r]++;
  s.victims = []; s.stage = s.after;
  s.last = { kind: 'steal', from: victim, to: id, res: r };
  return { victim, res: r };
}

// ---------- Bauen ----------
export function build(s, id, kind, at) {
  needCur(s, id);
  if (!['road', 'settlement', 'city'].includes(kind) || !isInt(at)) fail('Ungültiger Bauplatz');
  const t = topology(s.size);
  if (s.stage === 'setup') return setupBuild(s, t, id, kind, at);
  if (s.stage === 'roadbuilding') {
    if (kind !== 'road') fail('Jetzt nur Straßen');
    placeRoad(s, t, id, at);
    s.roadsLeft--;
    if (s.roadsLeft <= 0 || piecesLeft(s, id).road <= 0 || !roadSpots(s, id).length) { s.stage = 'main'; s.roadsLeft = 0; }
    return { kind, at, free: true, awards: updateAwards(s) };
  }
  needStage(s, 'main');
  if (piecesLeft(s, id)[kind] <= 0) fail('Du hast keine Bauteile dieser Art mehr');
  if (!hasCost(s, id, COST[kind])) fail('Dir fehlen Rohstoffe');
  if (kind === 'road') placeRoad(s, t, id, at, true);
  else if (kind === 'settlement') {
    if (!settlementSpots(s, id).includes(at)) fail('Hier darf keine Siedlung stehen');
    pay(s, id, COST.settlement); s.buildings[at] = { o: id, t: 's' };
  } else {
    if (!citySpots(s, id).includes(at)) fail('Nur eine eigene Siedlung wird zur Stadt');
    pay(s, id, COST.city); s.buildings[at] = { o: id, t: 'c' };
  }
  return { kind, at, free: false, awards: updateAwards(s) };
}
function placeRoad(s, t, id, at, paid = false) {
  if (at < 0 || at >= t.es.length) fail('Diese Kante gibt es nicht');
  if (s.roads[at] !== undefined) fail('Hier liegt schon eine Straße');
  if (piecesLeft(s, id).road <= 0) fail('Du hast keine Straßen mehr');
  if (!connected(s, t, id, at)) fail('Die Straße muss an deine Straßen oder Gebäude anschließen');
  if (paid) pay(s, id, COST.road);
  s.roads[at] = id;
}
function setupBuild(s, t, id, kind, at) {
  const st = s.setup;
  if (st.order[st.i] !== id) fail('Du bist nicht dran');
  if (kind !== st.step) fail(st.step === 'settlement' ? 'Setze zuerst eine Siedlung' : 'Setze jetzt eine Straße');
  if (kind === 'settlement') {
    if (at < 0 || at >= t.vs.length || !vertexFree(s, t, at)) fail('Hier darf keine Siedlung stehen');
    s.buildings[at] = { o: id, t: 's' }; st.last = at; st.step = 'road';
    const second = st.i >= s.players.length, got = {};
    if (second) for (const h of t.vs[at].hexes) { const r = s.terrain[h]; if (r !== 'duene' && s.bank[r] > 0) { gain(s, id, r, 1); got[r] = (got[r] || 0) + 1; } }
    return { kind, at, setup: true, got };
  }
  if (!roadSpots(s, id).includes(at)) fail('Die Straße muss an deine neue Siedlung anschließen');
  s.roads[at] = id; st.last = null; st.step = 'settlement'; st.i++;
  const done = st.i >= st.order.length;
  if (done) startTurn(s, s.players.filter((p) => !s.out.includes(p))[0]);
  else s.cur = st.order[st.i];
  return { kind, at, setup: true, done, awards: updateAwards(s) };
}

// ---------- Entwicklungskarten ----------
export const devCount = (s, id, k) => (s.dev[id] || []).filter((x) => x === k).length;
export const playable = (s, id, k) => devCount(s, id, k) - s.bought.filter((x) => x === k).length * (s.cur === id ? 1 : 0);
export function buyDev(s, id, rng = Math.random) {
  needCur(s, id); needStage(s, 'main');
  if (!s.deck.length) fail('Der Kartenstapel ist leer');
  if (!hasCost(s, id, COST.dev)) fail('Dir fehlen Rohstoffe');
  pay(s, id, COST.dev);
  const k = s.deck.pop();
  s.dev[id].push(k); s.bought.push(k);
  void rng;
  return { kind: k };
}
function useDev(s, id, k) {
  if (s.devPlayed) fail('Pro Zug nur eine Entwicklungskarte');
  if (playable(s, id, k) < 1) fail(s.dev[id].includes(k) ? 'Diese Karte hast du gerade erst gekauft' : 'Du hast diese Karte nicht');
  s.dev[id].splice(s.dev[id].indexOf(k), 1); s.devPlayed = true; s.offer = null;
}
export function playKnight(s, id) {
  needCur(s, id); needStage(s, 'roll', 'main');
  useDev(s, id, 'ritter');
  s.knights[id]++; s.after = s.stage; s.stage = 'robber'; s.last = { kind: 'knight', by: id };
  return { awards: updateAwards(s) };
}
export function playRoads(s, id) {
  needCur(s, id); needStage(s, 'main');
  if (piecesLeft(s, id).road <= 0 || !roadSpots(s, id).length) fail('Du kannst keine Straße mehr legen');
  useDev(s, id, 'strassenbau');
  s.roadsLeft = Math.min(2, piecesLeft(s, id).road); s.stage = 'roadbuilding';
  return {};
}
export function endRoads(s, id) { needCur(s, id); needStage(s, 'roadbuilding'); s.stage = 'main'; s.roadsLeft = 0; return {}; }
export function playPlenty(s, id, a, b) {
  needCur(s, id); needStage(s, 'main');
  if (!RES.includes(a) || !RES.includes(b)) fail('Wähle zwei Rohstoffe');
  const want = zero(); want[a]++; want[b]++;
  if (!RES.every((r) => s.bank[r] >= want[r])) fail('Die Bank hat nicht genug davon');
  useDev(s, id, 'erfindung');
  gain(s, id, a, 1); gain(s, id, b, 1);
  return { a, b };
}
export function playMonopoly(s, id, r) {
  needCur(s, id); needStage(s, 'main');
  if (!RES.includes(r)) fail('Wähle einen Rohstoff');
  useDev(s, id, 'monopol');
  let n = 0;
  for (const p of alive(s)) if (p !== id) { n += s.res[p][r]; s.res[id][r] += s.res[p][r]; s.res[p][r] = 0; }
  return { res: r, n };
}

// ---------- Handel ----------
export function ratio(s, id, r) {
  const t = topology(s.size);
  let best = 4;
  for (const p of s.ports) {
    const e = t.es[p.e];
    if (s.buildings[e.a]?.o !== id && s.buildings[e.b]?.o !== id) continue;
    if (p.type === 'any') best = Math.min(best, 3); else if (p.type === r) best = Math.min(best, 2);
  }
  return best;
}
export function bankTrade(s, id, give, get) {
  needCur(s, id); needStage(s, 'main');
  if (!RES.includes(give) || !RES.includes(get) || give === get) fail('Wähle zwei verschiedene Rohstoffe');
  const n = ratio(s, id, give);
  if (s.res[id][give] < n) fail(`Du brauchst ${n}× ${give} für diesen Tausch`);
  if (s.bank[get] < 1) fail('Die Bank hat davon nichts mehr');
  s.res[id][give] -= n; s.bank[give] += n; gain(s, id, get, 1);
  return { give, get, n };
}
export function makeOffer(s, id, give, want) {
  needCur(s, id); needStage(s, 'main');
  if (s.offers >= 8) fail('Genug Angebote in diesem Zug');
  const g = cleanCards(give), w = cleanCards(want);
  if (total(g) < 1 || total(w) < 1) fail('Ein Angebot braucht etwas zum Geben und etwas zum Bekommen');
  if (RES.some((r) => g[r] && w[r])) fail('Denselben Rohstoff kann man nicht tauschen');
  if (!hasCost(s, id, g)) fail('Du hast nicht genug zum Geben');
  s.offerSeq++; s.offers++;
  s.offer = { id: s.offerSeq, from: id, give: g, want: w, res: Object.fromEntries(alive(s).filter((p) => p !== id).map((p) => [p, null])) };
  return { offer: s.offer.id };
}
export function respond(s, id, offerId, accept) {
  const o = s.offer;
  needStage(s, 'main');
  if (!o || o.id !== offerId) fail('Dieses Angebot gibt es nicht mehr');
  if (!own(s, id) || id === o.from || !(id in o.res)) fail('Du kannst hier nicht antworten');
  if (accept && !hasCost(s, id, o.want)) fail('Dir fehlen die gefragten Rohstoffe');
  o.res[id] = accept ? 'accept' : 'decline';
  return { accept: !!accept };
}
export function confirmOffer(s, id, offerId, withId) {
  needCur(s, id); needStage(s, 'main');
  const o = s.offer;
  if (!o || o.id !== offerId || o.from !== id) fail('Dieses Angebot gibt es nicht mehr');
  if (o.res[withId] !== 'accept') fail('Dieser Spieler hat nicht zugestimmt');
  if (!hasCost(s, id, o.give) || !hasCost(s, withId, o.want)) fail('Jemand hat die Rohstoffe nicht mehr');
  for (const r of RES) { s.res[id][r] += o.want[r] - o.give[r]; s.res[withId][r] += o.give[r] - o.want[r]; }
  s.offer = null;
  return { with: withId, give: o.give, want: o.want };
}
export function cancelOffer(s, id) { needCur(s, id); if (!s.offer) fail('Es gibt kein Angebot'); s.offer = null; return {}; }

export function endTurn(s, id) {
  needCur(s, id); needStage(s, 'main');
  s.offer = null;
  return {};
}

// ---------- Was darf angetippt werden? ----------
// Listen zeigen alle regelkonformen Plätze; can sagt, ob man sie gerade bezahlen kann (Bots planen mit den Listen, die Oberfläche mit can)
export function legal(s, id) {
  const out = { settlement: [], city: [], road: [], robber: [], victims: [], can: { settlement: false, city: false, road: false, dev: false } };
  if (!own(s, id) || s.cur !== id) return out;
  if (s.stage === 'setup') {
    if (s.setup.order[s.setup.i] !== id) return out;
    if (s.setup.step === 'settlement') out.settlement = settlementSpots(s, id); else out.road = roadSpots(s, id);
    out.can.settlement = out.settlement.length > 0; out.can.road = out.road.length > 0;
  } else if (s.stage === 'main') {
    const left = piecesLeft(s, id);
    if (left.settlement > 0) out.settlement = settlementSpots(s, id);
    if (left.city > 0) out.city = citySpots(s, id);
    if (left.road > 0) out.road = roadSpots(s, id);
    out.can = {
      settlement: out.settlement.length > 0 && hasCost(s, id, COST.settlement), city: out.city.length > 0 && hasCost(s, id, COST.city),
      road: out.road.length > 0 && hasCost(s, id, COST.road), dev: s.deck.length > 0 && hasCost(s, id, COST.dev),
    };
  } else if (s.stage === 'roadbuilding') { out.road = roadSpots(s, id); out.can.road = out.road.length > 0; }
  else if (s.stage === 'robber') out.robber = topology(s.size).hexes.map((h) => h.id).filter((h) => h !== s.robber);
  else if (s.stage === 'steal') out.victims = [...s.victims];
  return out;
}

// ---------- Auswertung für die Anzeige ----------
export function standings(s) {
  return s.players.map((p) => ({ id: p, points: points(s, p), pub: publicPoints(s, p), vpCards: hiddenPoints(s, p), roads: roadLength(s, p), knights: s.knights[p] }));
}
export function leaveGame(s, id) {
  if (!s.players.includes(id) || s.out.includes(id)) return;
  s.out.push(id);
  for (const r of RES) { s.bank[r] += s.res[id][r]; s.res[id][r] = 0; }
  s.deck.unshift(...s.dev[id].filter((k) => k !== 'siegpunkt')); s.dev[id] = [];
  delete s.discard[id];
  if (s.offer) { if (s.offer.from === id) s.offer = null; else delete s.offer.res[id]; }
  s.victims = s.victims.filter((v) => v !== id);
  if (s.army.holder === id) { s.army = { holder: null, n: 0 }; }
  if (s.stage === 'setup') {
    const st = s.setup, before = st.order.slice(0, st.i).filter((p) => p === id).length, current = st.order[st.i] === id;
    st.order = st.order.filter((p) => p !== id); st.i -= before;
    if (current) { st.step = 'settlement'; st.last = null; }
    if (st.i >= st.order.length) { startTurn(s, alive(s)[0]); } else s.cur = st.order[st.i];
  }
  updateAwards(s);
  if (s.stage === 'discard' && !Object.keys(s.discard).length) s.stage = 'robber';
}
