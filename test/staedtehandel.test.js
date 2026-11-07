// V2-12 Städtehandel: Brett, Ertrag, Bauregeln, längste Straße, Räuber, Handel, Entwicklungskarten, Bots bis zum Sieg, Geheimhaltung, Speicherstand.
import test from 'node:test';
import assert from 'node:assert/strict';
import GAME from '../games/staedtehandel/index.js';
import * as R from '../games/staedtehandel/rules.js';
import { topology, SIZES, RES, BEGINNER, randomLayout, pips } from '../games/staedtehandel/map.js';
import { strategy, fallback } from '../games/staedtehandel/bot.js';
import { addBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';
import { botObservation, applyBotAction } from '../server/bot-observation.js';
import { chooseBotAction } from '../games/bot-strategies/index.js';
import { botLevels } from '../games/bot-levels.js';
import { GAMES, PLANNED } from '../games/index.js';

const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const P = ['a', 'b', 'c'];
const fresh = (players = P, extra = {}) => R.newGame({ players, ...extra }, seeded(5));
const t0 = topology('standard');
// Aus der Aufbauphase direkt in den ersten Zug springen (leeres Brett, Spieler a ist dran)
function play(players = P, extra = {}) {
  const s = fresh(players, extra);
  s.stage = 'roll'; s.setup = null; R.startTurn(s, players[0]);
  return s;
}
const give = (s, id, cards) => { for (const [r, n] of Object.entries(cards)) { s.res[id][r] += n; s.bank[r] -= n; } };
const house = (s, v, o, t = 's') => { s.buildings[v] = { o, t }; };
const road = (s, e, o) => { s.roads[e] = o; };
const edgeBetween = (a, b) => t0.es.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)).id;
// Zusammenhängende Kantenfolge ab einer Ecke (für Straßentests)
function path(start, len, avoid = new Set()) {
  const out = [], seen = new Set([start]); let v = start;
  while (out.length < len) {
    const w = t0.vs[v].adj.find((x) => !seen.has(x) && !avoid.has(x));
    if (w === undefined) throw new Error('Pfad zu kurz');
    out.push(edgeBetween(v, w)); seen.add(w); v = w;
  }
  return { edges: out, end: v };
}
const total = (s, r) => s.bank[r] + s.players.reduce((n, p) => n + s.res[p][r], 0);

// ---------- Brett ----------
test('Brett: Standard 19 Felder/54 Ecken/72 Kanten, groß 30/80/109, Häfen berühren sich nie', () => {
  for (const [size, h, v, e, ports] of [['standard', 19, 54, 72, 9], ['xl', 30, 80, 109, 11]]) {
    const t = topology(size);
    assert.deepEqual([t.hexes.length, t.vs.length, t.es.length, t.slots.length], [h, v, e, ports]);
    assert.ok(t.vs.every((x) => x.adj.length >= 2 && x.adj.length <= 3 && x.hexes.length >= 1 && x.hexes.length <= 3));
    assert.ok(t.es.every((x) => x.hexes.length >= 1 && x.hexes.length <= 2));
    const used = new Set();
    for (const sl of t.slots) for (const x of [t.es[sl.e].a, t.es[sl.e].b]) { assert.ok(!used.has(x), 'Hafenecke doppelt'); used.add(x); }
    assert.ok(t.slots.every((sl) => t.es[sl.e].hexes.length === 1), 'Häfen liegen an der Küste');
  }
});
test('Feld: Landschaften und Zahlen stimmen, rote Zahlen grenzen nie aneinander, Einsteigerfeld ist fest', () => {
  for (const size of ['standard', 'xl']) {
    const cfg = SIZES[size], t = topology(size);
    for (let seed = 1; seed <= 40; seed++) {
      const { terrain, nums } = randomLayout(size, seeded(seed));
      for (const [k, n] of Object.entries(cfg.terrain)) assert.equal(terrain.filter((x) => x === k).length, n, `${size} ${k}`);
      assert.deepEqual(nums.filter(Boolean).sort((a, b) => a - b), [...cfg.tokens].sort((a, b) => a - b));
      assert.ok(terrain.every((k, i) => (k === 'duene') === (nums[i] === null)), 'Düne trägt keine Zahl');
      for (const h of t.hexes) if ([6, 8].includes(nums[h.id])) assert.ok(h.nb.every((n) => ![6, 8].includes(nums[n])), `rote Zahlen benachbart (Seed ${seed})`);
    }
  }
  const a = fresh(P, { layout: 'beginner' }), b = fresh(P, { layout: 'beginner' });
  assert.deepEqual(a.terrain, BEGINNER.terrain); assert.deepEqual(a.nums, b.nums); assert.deepEqual(a.terrain, b.terrain);
  assert.equal(a.robber, a.terrain.indexOf('duene'));
  assert.equal(pips(6), 5); assert.equal(pips(8), 5); assert.equal(pips(2), 1); assert.equal(pips(12), 1);
});
test('Neues Spiel: Bank, Karten, Häfen, Reihenfolge des Aufbaus und Fehleingaben', () => {
  const s = fresh(['a', 'b', 'c', 'd']);
  assert.deepEqual(s.setup.order, ['a', 'b', 'c', 'd', 'd', 'c', 'b', 'a']);
  assert.ok(RES.every((r) => s.bank[r] === 19));
  assert.equal(s.deck.length, 25);
  assert.equal(s.ports.filter((p) => p.type === 'any').length, 4);
  assert.deepEqual(s.ports.filter((p) => p.type !== 'any').map((p) => p.type).sort(), [...RES].sort());
  assert.equal(fresh(['a', 'b', 'c', 'd', 'e'], { size: 'xl' }).deck.length, 34);
  assert.throws(() => R.newGame({ players: ['a'] }), /zwei bis sechs/);
  assert.throws(() => R.newGame({ players: P, size: 'riesig' }), /Brettgröße/);
});

// ---------- Aufbau ----------
test('Aufbau: Schlange, Abstandsregel, Straße nur an die neue Siedlung, zweite Siedlung bringt Rohstoffe', () => {
  const s = fresh();
  assert.throws(() => R.build(s, 'b', 'settlement', 0), /nicht dran/);
  assert.throws(() => R.build(s, 'a', 'road', 0), /Siedlung/);
  const v = t0.hexes[9].vs[0]; // mittleres Feld
  R.build(s, 'a', 'settlement', v);
  assert.throws(() => R.build(s, 'a', 'settlement', t0.vs[v].adj[0]), /Straße/); // erst die Straße
  assert.throws(() => R.build(s, 'a', 'road', edgeBetween(...t0.es[40].a < 0 ? [0, 1] : [t0.es[40].a, t0.es[40].b])), /anschließen/);
  R.build(s, 'a', 'road', t0.vs[v].es[0]);
  assert.equal(s.cur, 'b');
  assert.throws(() => R.build(s, 'b', 'settlement', t0.vs[v].adj[0]), /keine Siedlung/); // Abstand
  assert.equal(Object.values(s.res.a).reduce((x, y) => x + y, 0), 0, 'die erste Siedlung bringt nichts');
  // alle gehen reihum, in der zweiten Runde rückwärts
  const free = () => R.settlementSpots(s, s.cur)[0];
  const order = [];
  while (s.stage === 'setup') { const id = s.cur; order.push(id); const at = free(); R.build(s, id, 'settlement', at); R.build(s, id, 'road', R.roadSpots(s, id)[0]); }
  assert.deepEqual(order, ['b', 'c', 'c', 'b', 'a']);
  assert.equal(s.stage, 'roll'); assert.equal(s.cur, 'a'); assert.equal(s.turnNo, 1);
  // zweite Siedlung: je ein Rohstoff pro angrenzendem Ertragsfeld
  const second = Object.entries(s.buildings).filter(([, b]) => b.o === 'a').map(([k]) => Number(k)).pop();
  const expect_ = t0.vs[second].hexes.filter((h) => s.terrain[h] !== 'duene').length;
  assert.equal(Object.values(s.res.a).reduce((x, y) => x + y, 0), expect_);
  for (const r of RES) assert.equal(total(s, r), 19);
});

// ---------- Ertrag ----------
test('Ertrag: Siedlung 1, Stadt 2, Räuber blockiert, Düne bringt nichts, andere Zahlen bringen nichts', () => {
  const setupAt = () => {
    const s = play();
    const h = s.nums.findIndex((n, i) => n === 8 && s.terrain[i] !== 'duene'), vs = t0.hexes[h].vs;
    house(s, vs[0], 'a'); house(s, vs[2], 'b', 'c'); house(s, vs[4], 'b');
    return { s, h, res: s.terrain[h] };
  };
  const { s, res } = setupAt();
  const r = R.roll(s, 'a', Math.random, [4, 4]);
  assert.equal(r.sum, 8); assert.equal(s.stage, 'main');
  assert.equal(s.res.a[res], 1, 'Siedlung bringt 1');
  assert.equal(s.res.b[res], 3, 'Stadt 2 plus Siedlung 1');
  assert.deepEqual(r.gains.b, { [res]: 3 });
  for (const k of RES) assert.equal(total(s, k), 19);
  // andere Zahl: nichts
  const o = setupAt(); R.roll(o.s, 'a', Math.random, [3, 3]);
  assert.ok(o.s.players.every((p) => RES.every((k) => o.s.res[p][k] === 0)));
  // Räuber auf dem Feld
  const rb = setupAt(); rb.s.robber = rb.h; R.roll(rb.s, 'a', Math.random, [4, 4]);
  assert.ok(rb.s.players.every((p) => RES.every((k) => rb.s.res[p][k] === 0)));
  // Düne trägt keinen Ertrag, selbst mit einer Zahl
  const s3 = play(); const d = s3.terrain.indexOf('duene'); s3.nums[d] = 6; s3.robber = (d + 1) % 19; house(s3, t0.hexes[d].vs[0], 'a');
  const only = t0.vs[t0.hexes[d].vs[0]].hexes.every((x) => x === d);
  R.roll(s3, 'a', Math.random, [3, 3]);
  assert.ok(only || RES.every((k) => s3.res.a[k] <= 1));
  assert.equal(RES.reduce((n, k) => n + s3.res.a[k], 0) <= 2, true);
});
test('Ertrag: reicht die Bank nicht, bekommt ein einziger Empfänger den Rest, mehrere gehen leer aus', () => {
  const s = play();
  const h = s.nums.findIndex((n, i) => n === 6 && s.terrain[i] !== 'duene'), res = s.terrain[h], vs = t0.hexes[h].vs;
  house(s, vs[0], 'a', 'c'); house(s, vs[3], 'b', 'c'); // Bedarf 4 von a? a:2, b:2 → 4
  s.bank[res] = 3;
  R.produce(s, 6);
  assert.equal(s.res.a[res] + s.res.b[res], 0, 'zwei Empfänger, zu wenig Vorrat → niemand');
  assert.equal(s.bank[res], 3);
  const s2 = play(); house(s2, vs[0], 'a', 'c'); s2.bank[res] = 1;
  R.produce(s2, 6);
  assert.equal(s2.res.a[res], 1, 'einziger Empfänger bekommt den Rest'); assert.equal(s2.bank[res], 0);
});

// ---------- Bauen ----------
test('Bauen: Kosten, Anschluss, Abstand, fremde Gebäude unterbrechen, Städte nur auf eigenen Siedlungen, Bauteil-Grenzen', () => {
  const s = play();
  s.stage = 'main';
  const v = t0.hexes[9].vs[0];
  house(s, v, 'a'); road(s, t0.vs[v].es[0], 'a');
  assert.throws(() => R.build(s, 'a', 'road', t0.vs[v].es[1]), /Rohstoffe/);
  give(s, 'a', { holz: 5, ton: 5, wolle: 2, korn: 4, kupfer: 3 });
  // Straße muss anschließen
  const far = t0.es.find((e) => ![e.a, e.b].some((x) => x === v || t0.vs[x].adj.includes(v)) && !t0.vs[e.a].adj.some((w) => t0.vs[w].es.some((z) => s.roads[z])) && !t0.vs[e.b].adj.some((w) => t0.vs[w].es.some((z) => s.roads[z]))).id;
  assert.throws(() => R.build(s, 'a', 'road', far), /anschließen/);
  const first = t0.vs[v].es[0], end = t0.es[first].a === v ? t0.es[first].b : t0.es[first].a;
  const next = t0.vs[end].es.find((e) => e !== first);
  R.build(s, 'a', 'road', next);
  assert.equal(s.res.a.holz, 4); assert.equal(s.bank.holz, 19 - 5 + 1);
  assert.throws(() => R.build(s, 'a', 'road', next), /schon/);
  // Siedlung: Abstandsregel und Anschluss
  assert.throws(() => R.build(s, 'a', 'settlement', t0.vs[v].adj[0]), /Siedlung/);
  const end2 = t0.es[next].a === end ? t0.es[next].b : t0.es[next].a;
  R.build(s, 'a', 'settlement', end2);
  assert.equal(s.buildings[end2].t, 's');
  // Stadt nur auf eigener Siedlung
  assert.throws(() => R.build(s, 'a', 'city', t0.vs[end2].adj[0]), /eigene Siedlung/);
  R.build(s, 'a', 'city', end2);
  assert.equal(s.buildings[end2].t, 'c'); assert.equal(R.piecesLeft(s, 'a').city, 3);
  // Bauteile begrenzt
  const s2 = play(); s2.stage = 'main'; give(s2, 'a', { holz: 19, ton: 19 });
  const long = path(t0.hexes[9].vs[0], 6); for (const e of long.edges) road(s2, e, 'a');
  for (let i = 0; i < 9; i++) { const e = R.roadSpots(s2, 'a')[0]; R.build(s2, 'a', 'road', e); }
  assert.equal(R.piecesLeft(s2, 'a').road, 0);
  assert.throws(() => R.build(s2, 'a', 'road', R.roadSpots(s2, 'a')[0]), /keine Bauteile|keine Straßen/);
});
test('Bauen: eine fremde Siedlung unterbricht den Anschluss einer Straße', () => {
  const s = play(); s.stage = 'main'; give(s, 'a', { holz: 5, ton: 5 });
  const { edges, end } = path(t0.hexes[9].vs[0], 2);
  for (const e of edges) road(s, e, 'a');
  house(s, end, 'b');
  const onward = t0.vs[end].es.find((e) => !edges.includes(e));
  assert.ok(!R.roadSpots(s, 'a').includes(onward), 'hinter der fremden Siedlung geht es nicht weiter');
  assert.throws(() => R.build(s, 'a', 'road', onward), /anschließen/);
});
test('Zugrechte: nur wer dran ist baut, würfelt und beendet; vor dem Würfeln wird nicht gebaut', () => {
  const s = play(); give(s, 'a', { holz: 5, ton: 5, wolle: 5, korn: 5, kupfer: 5 });
  assert.throws(() => R.build(s, 'a', 'road', 0), /nicht jetzt|geht jetzt nicht/);
  assert.throws(() => R.roll(s, 'b', Math.random, [1, 2]), /nicht dran/);
  assert.throws(() => R.endTurn(s, 'a'), /geht jetzt nicht/);
  R.roll(s, 'a', Math.random, [1, 2]);
  assert.throws(() => R.roll(s, 'a', Math.random, [1, 2]), /geht jetzt nicht/);
  assert.throws(() => R.build(s, 'b', 'road', 0), /nicht dran/);
});

// ---------- Längste Straße und Rittermacht ----------
// Einfacher Pfad aus len Kanten, der keine der gesperrten Ecken berührt
function findPath(len, avoid = new Set()) {
  for (const v0 of t0.vs.map((v) => v.id)) {
    if (avoid.has(v0)) continue;
    const walk = (v, seen, edges) => {
      if (edges.length === len) return edges;
      for (const w of t0.vs[v].adj) {
        if (seen.has(w) || avoid.has(w)) continue;
        const r = walk(w, new Set([...seen, w]), [...edges, edgeBetween(v, w)]);
        if (r) return r;
      }
      return null;
    };
    const r = walk(v0, new Set([v0]), []);
    if (r) return r;
  }
  throw new Error('kein Pfad');
}
const ends = (edges) => new Set(edges.flatMap((e) => [t0.es[e].a, t0.es[e].b]));
test('Längste Straße: ab 5, strikt mehr als der Halter, Gleichstand behält, fremde Siedlung unterbricht', () => {
  const s = play();
  const p1 = findPath(5);
  for (const e of p1.slice(0, 4)) road(s, e, 'a');
  assert.equal(R.roadLength(s, 'a'), 4); R.updateAwards(s); assert.equal(s.longest.holder, null);
  road(s, p1[4], 'a');
  assert.equal(R.roadLength(s, 'a'), 5);
  assert.deepEqual(R.updateAwards(s), [{ award: 'longest', from: null, to: 'a' }]);
  assert.equal(R.publicPoints(s, 'a'), 2);
  // b baut anderswo ebenfalls 5 → a behält; mit 6 übernimmt b
  const p2 = findPath(6, ends(p1));
  for (const e of p2.slice(0, 5)) road(s, e, 'b');
  assert.equal(R.roadLength(s, 'b'), 5); R.updateAwards(s); assert.equal(s.longest.holder, 'a', 'Gleichstand: Halter behält');
  road(s, p2[5], 'b'); R.updateAwards(s); assert.equal(s.longest.holder, 'b');
  assert.equal(R.publicPoints(s, 'a'), 0); assert.equal(R.publicPoints(s, 'b'), 2);
  // Eine fremde Siedlung mitten auf der Straße von b zerschneidet sie: a bekommt die Auszeichnung zurück
  const shared = [t0.es[p2[2]].a, t0.es[p2[2]].b].find((v) => [t0.es[p2[3]].a, t0.es[p2[3]].b].includes(v));
  house(s, shared, 'c');
  const ev = R.updateAwards(s);
  assert.equal(R.roadLength(s, 'b'), 3); assert.equal(s.longest.holder, 'a'); assert.deepEqual(ev, [{ award: 'longest', from: 'b', to: 'a' }]);
  // Zwei gleich lange Straßen gleichzeitig und kein Halter: niemand bekommt die Auszeichnung
  const s2 = play(); const q1 = findPath(5), q2 = findPath(5, ends(q1));
  for (const e of q1) road(s2, e, 'a'); for (const e of q2) road(s2, e, 'b');
  assert.deepEqual(R.updateAwards(s2), []); assert.equal(s2.longest.holder, null);
});
test('Längste Straße: Stern mit drei Armen zählt nur den längsten Weg', () => {
  const s2 = play(); const hub = t0.hexes[9].vs[0];
  for (const w of t0.vs[hub].adj.slice(0, 3)) road(s2, edgeBetween(hub, w), 'a');
  assert.equal(R.roadLength(s2, 'a'), 2);
});
test('Längste Straße: ein Ring aus sechs Kanten zählt sechs, Kreise werden nicht doppelt gezählt', () => {
  const s = play(); const h = t0.hexes[9];
  for (const e of h.es) road(s, e, 'a');
  assert.equal(R.roadLength(s, 'a'), 6);
});
test('Größte Rittermacht: ab drei gespielten Rittern, nur strikt mehr übernimmt', () => {
  const s = play(); s.knights.a = 3; R.updateAwards(s);
  assert.equal(s.army.holder, 'a'); assert.equal(R.publicPoints(s, 'a'), 2);
  s.knights.b = 3; R.updateAwards(s); assert.equal(s.army.holder, 'a');
  s.knights.b = 4; R.updateAwards(s); assert.equal(s.army.holder, 'b'); assert.equal(R.publicPoints(s, 'a'), 0);
});

// ---------- Räuber ----------
test('Sieben: wer mehr als 7 Karten hat, wirft genau die Hälfte ab; danach zieht der Räuber und stiehlt', () => {
  const s = play(); give(s, 'b', { holz: 5, ton: 4 }); give(s, 'c', { korn: 7 }); give(s, 'a', { wolle: 3 });
  const r = R.roll(s, 'a', Math.random, [3, 4]);
  assert.deepEqual(r.discard, { b: 4 }); assert.equal(s.stage, 'discard');
  assert.throws(() => R.discard(s, 'c', { korn: 1 }), /nichts abwerfen/);
  assert.throws(() => R.discard(s, 'b', { holz: 3 }), /genau 4/);
  assert.throws(() => R.discard(s, 'b', { holz: 6, ton: -2 }), /Ungültige|genau/);
  assert.throws(() => R.discard(s, 'b', { kupfer: 4 }), /nicht/);
  const bank = s.bank.holz;
  R.discard(s, 'b', { holz: 4 }); assert.equal(s.bank.holz, bank + 4);
  assert.equal(s.stage, 'robber');
  assert.throws(() => R.moveRobber(s, 'b', 0), /nicht dran/);
  assert.throws(() => R.moveRobber(s, 'a', s.robber), /anderes Feld/);
  assert.throws(() => R.moveRobber(s, 'a', 99), /gibt es nicht/);
  const hexId = 0; house(s, t0.hexes[hexId].vs[0], 'b'); house(s, t0.hexes[hexId].vs[2], 'c');
  const res = R.moveRobber(s, 'a', hexId, seeded(1));
  assert.deepEqual(res.victims.sort(), ['b', 'c']); assert.equal(s.stage, 'steal');
  assert.throws(() => R.steal(s, 'a', 'a'), /nicht stehlen/);
  const hand = (id) => Object.values(s.res[id]).reduce((x, y) => x + y, 0);
  const [hb, hc] = [hand('b'), hand('c')];
  const st = R.steal(s, 'a', 'c', seeded(2));
  assert.equal(st.victim, 'c'); assert.equal(hand('c'), hc - 1); assert.equal(hand('b'), hb); assert.equal(s.stage, 'main');
  assert.equal(s.robber, hexId);
});
test('Sieben ohne Abwurf und ohne Opfer: der Zug geht ohne Umweg weiter; bei genau einem Opfer wird automatisch gestohlen', () => {
  const s = play();
  R.roll(s, 'a', Math.random, [6, 1]); assert.equal(s.stage, 'robber');
  R.moveRobber(s, 'a', 3); assert.equal(s.stage, 'main');
  const s2 = play(); give(s2, 'b', { holz: 2 }); R.roll(s2, 'a', Math.random, [2, 5]);
  house(s2, t0.hexes[4].vs[1], 'b'); house(s2, t0.hexes[4].vs[3], 'b');
  const r = R.moveRobber(s2, 'a', 4, seeded(3));
  assert.equal(r.stolen.victim, 'b'); assert.equal(s2.res.a.holz, 1); assert.equal(s2.stage, 'main');
  const s3 = play(); R.roll(s3, 'a', Math.random, [2, 5]); house(s3, t0.hexes[4].vs[1], 'b'); // b hat keine Karten
  assert.equal(R.moveRobber(s3, 'a', 4).stolen, null); assert.equal(s3.stage, 'main');
});

// ---------- Handel ----------
test('Bank und Häfen: 4:1, 3:1 mit allgemeinem Hafen, 2:1 mit Spezialhafen – nur mit eigener Siedlung am Hafen', () => {
  const s = play(); s.stage = 'main'; give(s, 'a', { holz: 8, ton: 4 });
  assert.equal(R.ratio(s, 'a', 'holz'), 4);
  assert.throws(() => R.bankTrade(s, 'a', 'holz', 'holz'), /verschiedene/);
  assert.throws(() => R.bankTrade(s, 'a', 'wolle', 'holz'), /brauchst/);
  const r = R.bankTrade(s, 'a', 'holz', 'korn'); assert.equal(r.n, 4);
  assert.equal(s.res.a.holz, 4); assert.equal(s.res.a.korn, 1);
  for (const k of RES) assert.equal(total(s, k), 19);
  const gen = s.ports.find((p) => p.type === 'any'), spec = s.ports.find((p) => p.type !== 'any');
  house(s, t0.es[gen.e].a, 'a'); assert.equal(R.ratio(s, 'a', 'ton'), 3);
  house(s, t0.es[spec.e].a, 'b'); assert.equal(R.ratio(s, 'a', spec.type), 3, 'fremder Hafen zählt nicht');
  house(s, t0.es[spec.e].b, 'a'); assert.equal(R.ratio(s, 'a', spec.type), 2); assert.equal(R.ratio(s, 'a', 'ton'), spec.type === 'ton' ? 2 : 3);
  s.bank.korn = 0; give(s, 'a', { ton: 4 });
  assert.throws(() => R.bankTrade(s, 'a', 'ton', 'korn'), /nichts mehr/);
});
test('Spielerhandel: Angebot, Annahme, Bestätigung durch den Anbieter – ohne Betrug', () => {
  const s = play(); s.stage = 'main'; give(s, 'a', { holz: 2 }); give(s, 'b', { korn: 1 }); give(s, 'c', { korn: 1 });
  assert.throws(() => R.makeOffer(s, 'b', { korn: 1 }, { holz: 1 }), /nicht dran/);
  assert.throws(() => R.makeOffer(s, 'a', { holz: 3 }, { korn: 1 }), /nicht genug/);
  assert.throws(() => R.makeOffer(s, 'a', { holz: 1 }, { holz: 1 }), /Denselben/);
  assert.throws(() => R.makeOffer(s, 'a', {}, { korn: 1 }), /etwas zum Geben/);
  assert.throws(() => R.makeOffer(s, 'a', { holz: 1, gold: 5 }, { korn: 1 }), /Ungültige/);
  const { offer } = R.makeOffer(s, 'a', { holz: 2 }, { korn: 1 });
  assert.throws(() => R.respond(s, 'a', offer, true), /nicht antworten/);
  assert.throws(() => R.respond(s, 'b', offer + 1, true), /nicht mehr/);
  assert.throws(() => R.confirmOffer(s, 'a', offer, 'b'), /nicht zugestimmt/);
  assert.throws(() => R.confirmOffer(s, 'b', offer, 'b'), /nicht dran/);
  R.respond(s, 'b', offer, true); R.respond(s, 'c', offer, false);
  assert.throws(() => R.confirmOffer(s, 'a', offer, 'c'), /nicht zugestimmt/);
  // b verliert inzwischen das Korn (z. B. Monopol): die Bestätigung scheitert
  s.res.b.korn = 0;
  assert.throws(() => R.confirmOffer(s, 'a', offer, 'b'), /nicht mehr/);
  s.res.b.korn = 1;
  const before = JSON.stringify([s.res.a, s.res.b, s.bank]);
  const r = R.confirmOffer(s, 'a', offer, 'b');
  assert.equal(r.with, 'b'); assert.deepEqual([s.res.a.holz, s.res.a.korn, s.res.b.holz, s.res.b.korn], [0, 1, 2, 0]);
  assert.notEqual(before, JSON.stringify([s.res.a, s.res.b, s.bank]));
  for (const k of RES) assert.equal(total(s, k), 19);
  assert.equal(s.offer, null);
  assert.throws(() => R.confirmOffer(s, 'a', offer, 'b'), /nicht mehr/, 'ein Angebot lässt sich nicht wiederholen');
  assert.throws(() => R.respond(s, 'b', offer, true), /nicht mehr/);
  // Annahme ohne die gefragten Rohstoffe ist unmöglich; Angebots-Limit gegen Endlosschleifen
  const s2 = play(); s2.stage = 'main'; give(s2, 'a', { holz: 1 });
  const o2 = R.makeOffer(s2, 'a', { holz: 1 }, { korn: 1 }).offer;
  assert.throws(() => R.respond(s2, 'b', o2, true), /fehlen/);
  for (let i = 0; i < 7; i++) R.makeOffer(s2, 'a', { holz: 1 }, { korn: 1 });
  assert.throws(() => R.makeOffer(s2, 'a', { holz: 1 }, { korn: 1 }), /Genug/);
});

// ---------- Entwicklungskarten ----------
test('Entwicklungskarten: gekaufte Karte erst im nächsten Zug, eine Karte pro Zug, Ritter, Straßenbau, Erfindung, Monopol, geheime Punkte', () => {
  const s = play(); s.stage = 'main'; give(s, 'a', { wolle: 3, korn: 3, kupfer: 3 });
  house(s, t0.hexes[9].vs[0], 'a');
  s.deck = ['monopol', 'ritter', 'erfindung', 'strassenbau', 'siegpunkt'];
  assert.throws(() => R.playKnight(s, 'a'), /nicht|geht/);
  R.buyDev(s, 'a'); // siegpunkt
  assert.equal(R.hiddenPoints(s, 'a'), 1); assert.equal(R.points(s, 'a'), 2); assert.equal(R.publicPoints(s, 'a'), 1, 'das Bauwerk bleibt verborgen');
  R.buyDev(s, 'a'); // strassenbau
  assert.throws(() => R.playRoads(s, 'a'), /gerade erst gekauft/);
  s.bought = []; // nächster Zug
  R.playRoads(s, 'a'); assert.equal(s.stage, 'roadbuilding'); assert.equal(s.roadsLeft, 2);
  const r1 = R.roadSpots(s, 'a')[0]; R.build(s, 'a', 'road', r1); assert.equal(s.stage, 'roadbuilding');
  assert.equal(s.res.a.holz, 0, 'Straßenbau kostet nichts');
  R.build(s, 'a', 'road', R.roadSpots(s, 'a')[0]); assert.equal(s.stage, 'main');
  s.bought = []; assert.throws(() => R.playPlenty(s, 'a', 'holz', 'ton'), /Pro Zug|nicht/);
  // neuer Zug: Erfindung, Monopol, Ritter
  R.startTurn(s, 'a'); s.stage = 'main'; s.dev.a = ['erfindung', 'monopol', 'ritter'];
  R.playPlenty(s, 'a', 'holz', 'holz'); assert.equal(s.res.a.holz, 2);
  assert.throws(() => R.playMonopoly(s, 'a', 'ton'), /Pro Zug/);
  R.startTurn(s, 'a'); s.stage = 'main'; give(s, 'b', { ton: 3 }); give(s, 'c', { ton: 2 });
  const m = R.playMonopoly(s, 'a', 'ton'); assert.equal(m.n, 5); assert.equal(s.res.a.ton, 5); assert.equal(s.res.b.ton, 0);
  R.startTurn(s, 'a'); s.stage = 'main';
  R.playKnight(s, 'a'); assert.equal(s.stage, 'robber'); assert.equal(s.knights.a, 1);
  R.moveRobber(s, 'a', 2); assert.equal(s.stage, 'main');
  // Erfindung: die Bank muss liefern
  const s2 = play(); s2.stage = 'main'; s2.dev.a = ['erfindung']; s2.bank.kupfer = 1;
  assert.throws(() => R.playPlenty(s2, 'a', 'kupfer', 'kupfer'), /nicht genug/);
  // Ritter vor dem Würfeln
  const s3 = play(); s3.dev.a = ['ritter']; R.playKnight(s3, 'a'); R.moveRobber(s3, 'a', 5);
  assert.equal(s3.stage, 'roll', 'danach wird noch gewürfelt');
});
test('Sieg: nur im eigenen Zug, versteckte Bauwerke zählen mit, Zielpunkte einstellbar', () => {
  const s = play(P, { target: 10 });
  for (let i = 0; i < 4; i++) house(s, [0, 20, 40, 5][i], 'a', 'c');
  s.dev.a = ['siegpunkt', 'siegpunkt']; // 8 + 2
  assert.equal(R.points(s, 'a'), 10); assert.equal(R.winner(s, 'a'), 'a'); assert.equal(R.winner(s, 'b'), null);
  s.cur = 'b'; assert.equal(R.winner(s, 'a'), null, 'nicht im fremden Zug');
  assert.equal(fresh(P, { target: 7 }).target, 7); assert.equal(fresh(P, { target: 99 }).target, 15);
});

// ---------- Raum, Geheimhaltung, Speichern ----------
function room(n = 3, settings = {}, levels = []) {
  const r = GAME.create('TEST1', { turnTime: 0, ...settings }, () => {});
  r.game = 'staedtehandel'; r.rng = seeded(11);
  const host = r.addPlayer('Host', '🦊'); r.hostId = host.id; r.sit(host.id);
  const ids = [host.id];
  for (let i = 1; i < n; i++) ids.push(addBot(r, host.id, levels[i] || 'medium').id);
  return { r, host, ids };
}
function finishBots(r, limit = 20000, rng = seeded(7)) {
  let steps = 0;
  while (r.phase === 'playing' && steps++ < limit) { const id = r.botDue(); assert.ok(id, `niemand dran in Stufe ${r.s.stage}`); stepBot(r, id, { rng }); }
  return steps;
}
test('Spiel registriert: Backlog-Eintrag ersetzt, kein Duplikat, 3–6 Spieler und Bot-Stufen', () => {
  assert.ok(GAMES.staedtehandel); assert.ok(!PLANNED.some((p) => p.id === 'staedtehandel'));
  assert.equal(GAMES.staedtehandel.name, 'Städtehandel');
  assert.deepEqual(botLevels('staedtehandel'), ['easy', 'medium', 'hard']);
  assert.deepEqual(Object.keys(GAMES).filter((k) => /stadt|staedte|catan|siedler/i.test(k)), ['staedtehandel']);
  const { r } = room(3);
  assert.equal(r.opts.minPlayers, 3); assert.equal(r.opts.maxPlayers, 6);
  // keine geschützten Namen in den eigenen Texten
  const text = JSON.stringify([GAMES.staedtehandel.rules, GAMES.staedtehandel.description, GAMES.staedtehandel.name]);
  assert.ok(!/catan|siedler von|klaus teuber|kosmos|brick|ore\b|erz\b|getreide/i.test(text));
});
test('Raum: Spielerzahl passt zum Brett, 5–6 Spieler brauchen das große Brett', () => {
  const a = room(5, { size: 'standard' });
  assert.throws(() => a.r.start(a.host.id), /3–4 Spieler/);
  const b = room(4, { size: 'xl' });
  assert.throws(() => b.r.start(b.host.id), /5–6 Spieler/);
  const c = room(2); assert.throws(() => c.r.start(c.host.id), /mindestens 3/);
  const d = room(6, { size: 'xl' }); d.r.start(d.host.id);
  assert.equal(d.r.s.players.length, 6); assert.equal(topology(d.r.s.size).hexes.length, 30);
});
test('Geheimhaltung: Ansicht und Bot-Beobachtung zeigen nie fremde Rohstoffe, Karten oder den Stapel', () => {
  const { r, host, ids } = room(4);
  host.bot = true;
  r.start(host.id);
  // Aufbau fertig spielen, dann ein paar Würfe
  for (let i = 0; i < 400 && (r.s.stage === 'setup' || r.s.turnNo < 6); i++) { stepBot(r, r.botDue(), { rng: seeded(i) }); if (r.phase !== 'playing') break; }
  for (let i = 0; i < 0; i++) { const id = r.botDue() || (r.currentId === host.id ? host.id : null); if (id === host.id) { r.apply(host.id, strategy({ game: 'staedtehandel', id: host.id, g: r.gameView(host.id) }, 'medium', { rng: seeded(i) })); } else stepBot(r, id, { rng: seeded(i) }); if (r.phase !== 'playing') break; }
  const other = ids[1];
  r.s.dev[other] = ['ritter', 'siegpunkt']; r.s.res[other].kupfer = 5;
  const v = r.gameView(host.id);
  assert.equal(v.dev.length, r.s.dev[host.id].length);
  assert.deepEqual(v.hand, r.s.res[host.id]);
  const text = JSON.stringify(v);
  assert.ok(!text.includes('"deck"'), 'kein Kartenstapel'); assert.equal(v.cards[other], R.cardsOf(r.s, other)); assert.equal(v.devCounts[other], 2);
  assert.equal(v.points[other], R.publicPoints(r.s, other), 'verdeckte Bauwerke bleiben verborgen');
  assert.equal(v.myPoints, R.points(r.s, host.id));
  const spectator = r.gameView('niemand');
  assert.equal(spectator.hand, null); assert.deepEqual(spectator.dev, []); assert.equal(spectator.myPoints, null); assert.equal(spectator.legal.settlement.length, 0);
  // der Bot sieht dieselbe Ansicht wie ein Spieler (kein Zugriff auf Stapel oder Gegnerhand)
  const obs = botObservation(r, ids[2]), ot = JSON.stringify(obs);
  assert.ok(!ot.includes('"deck"')); assert.deepEqual(obs.g.hand, r.s.res[ids[2]]); assert.equal(obs.g.cards[other], R.cardsOf(r.s, other));
  assert.equal(obs.g.devCounts[other], 2); assert.ok(!('res' in obs.g));
  // fremde Karten tauchen nicht in einer gestohlenen Meldung auf
  r.s.last = { kind: 'steal', from: ids[1], to: ids[2], res: 'kupfer' };
  assert.equal(r.gameView(host.id).last.res, undefined); assert.equal(r.gameView(ids[2]).last.res, 'kupfer'); assert.equal(r.gameView(ids[1]).last.res, 'kupfer');
});
test('Server-Prüfung: Fehlbedienung und fremde Eingriffe sind wirkungslos', () => {
  const { r, host, ids } = room(3);
  r.start(host.id);
  assert.throws(() => r.ssRoll(ids[1]), /nicht dran/);
  assert.throws(() => r.ssBuild(host.id, { kind: 'castle', at: 1 }), /Ungültiger/);
  assert.throws(() => r.ssBuild(host.id, { kind: 'settlement', at: 'x' }), /Ungültiger/);
  assert.throws(() => r.ssBuild(host.id, { kind: 'settlement', at: 999 }), /Siedlung/);
  assert.throws(() => r.ssEnd(host.id), /geht jetzt nicht/);
  assert.throws(() => r.ssDiscard(host.id, { cards: { holz: 1 } }), /geht jetzt nicht/);
  assert.throws(() => r.ssConfirm(host.id, { offerId: 1, with: ids[1] }), /nicht mehr|geht jetzt/);
  r.gamePaused;
  r.clock.setPaused(true); assert.throws(() => r.ssBuild(host.id, { kind: 'settlement', at: 1 }), /angehalten/); r.clock.setPaused(false);
});
test('Bots: vollständige Partien bis zum Sieg in allen Stufen, 3 bis 6 Spieler, Ressourcen bleiben erhalten', () => {
  const lv = ['easy', 'medium', 'hard'];
  for (const [n, seed, size] of [[3, 1, 'standard'], [4, 2, 'standard'], [4, 3, 'standard'], [5, 4, 'xl'], [6, 5, 'xl'], [3, 6, 'standard']]) {
    const { r, host } = room(n, { size, layout: seed % 2 ? 'beginner' : 'random' }, Array.from({ length: n }, (_, i) => lv[(i + seed) % 3]));
    r.rng = seeded(seed * 17); host.bot = true; host.botDifficulty = lv[seed % 3];
    r.start(host.id);
    finishBots(r, 20000, seeded(seed));
    assert.equal(r.phase, 'over', `Partie ${n}/${seed} endet`);
    const s = r.s, w = r.result.winners[0];
    assert.ok(R.points(s, w) >= s.target, 'Sieger hat die Zielpunkte');
    assert.equal(s.cur, w, 'gewonnen wird im eigenen Zug');
    for (const k of RES) assert.equal(total(s, k), SIZES[size].bank);
    for (const p of s.players) { const l = R.piecesLeft(s, p); assert.ok(l.road >= 0 && l.settlement >= 0 && l.city >= 0); }
    assert.equal(r.view(host.id).g.final.length, n, 'am Ende liegen alle Punkte offen');
    assert.equal(r.scores[w], 1);
  }
});
test('Bots: Schwierigkeitsstufen unterscheiden sich messbar (schwer schlägt leicht)', () => {
  const wins = { easy: 0, hard: 0 };
  for (let seed = 40; seed < 52; seed++) {
    const { r, host } = room(3, {}, ['hard', 'easy', 'easy']);
    r.rng = seeded(seed); host.bot = true; host.botDifficulty = 'hard';
    r.start(host.id); finishBots(r, 20000, seeded(seed + 1));
    const w = r.result.winners[0]; wins[r.players.get(w).botDifficulty]++;
  }
  assert.ok(wins.hard > wins.easy, `hard ${wins.hard} : easy ${wins.easy}`);
});
test('Bots antworten außerhalb des eigenen Zuges: Abwerfen bei einer Sieben und Angebote von Menschen', () => {
  const { r, host, ids } = room(3);
  r.start(host.id); r.diceQueue = [];
  // Aufbau schnell erledigen
  for (let i = 0; i < 100 && r.s.stage === 'setup'; i++) { const id = r.s.cur; r.apply(id, fallback({ game: 'staedtehandel', id, g: r.gameView(id) })); }
  assert.equal(r.s.stage, 'roll');
  const cur = r.s.cur; assert.equal(cur, host.id);
  const bot = ids[1];
  r.s.res[bot] = { holz: 6, ton: 4, wolle: 0, korn: 0, kupfer: 0 };
  r.diceQueue = [[3, 4]];
  r.ssRoll(host.id);
  assert.equal(r.s.stage, 'discard');
  assert.equal(r.botDue(), bot, 'der Bot muss abwerfen, obwohl er nicht dran ist');
  stepBot(r, bot, { rng: seeded(1) });
  assert.equal(Object.values(r.s.res[bot]).reduce((x, y) => x + y, 0), 5);
  assert.equal(r.s.stage, 'robber');
  // Mensch macht ein Angebot, Bots antworten, danach ist niemand mehr fällig
  const empty = t0.hexes.find((h) => h.id !== r.s.robber && h.vs.every((v) => !r.s.buildings[v])).id;
  r.ssRobber(host.id, { hex: empty });
  assert.equal(r.s.stage, 'main');
  r.s.res[host.id] = { holz: 2, ton: 0, wolle: 0, korn: 0, kupfer: 0 };
  r.ssOffer(host.id, { give: { holz: 2 }, want: { kupfer: 1 } });
  const answered = [];
  for (let i = 0; i < 4 && r.botDue(); i++) { const id = r.botDue(); stepBot(r, id, { rng: seeded(i) }); answered.push(id); }
  assert.equal(new Set(answered).size, 2, 'beide Bots haben geantwortet');
  assert.equal(r.botDue(), null, 'jetzt entscheidet der Mensch');
  assert.ok(Object.values(r.s.offer.res).every((v) => v === 'accept' || v === 'decline'));
});
test('Zeitablauf und Fehlerfall: Fallback beendet den Zug sicher, auch beim Abwerfen und im Aufbau', () => {
  const { r, host, ids } = room(3);
  r.start(host.id);
  r.onTimeout(host.id); // Aufbau: setzt automatisch Siedlung und Straße
  assert.equal(r.s.cur, ids[1]);
  for (let i = 0; i < 100 && r.s.stage === 'setup'; i++) r.onTimeout(r.s.cur);
  assert.equal(r.s.stage, 'roll');
  r.diceQueue = [[3, 4]];
  r.s.res[host.id] = { holz: 6, ton: 4, wolle: 0, korn: 0, kupfer: 0 };
  r.s.cur = host.id;
  const start = r.currentId;
  r.onTimeout(start);
  assert.notEqual(r.currentId, start, 'der Zug wurde zu Ende gespielt');
  assert.ok(Object.values(r.s.res[host.id]).reduce((x, y) => x + y, 0) <= 7);
  // Fallback liefert in jeder Lage eine gültige Aktion
  for (const stg of ['roll', 'main']) { const g = r.gameView(r.currentId); g.stage = stg; assert.ok(fallback({ game: 'staedtehandel', id: r.currentId, g }).method); }
});
test('Neustart-fest: Speicherstand mitten im Spiel, Wiederherstellung und Weiterspielen bis zum Sieg', () => {
  const { r, host } = room(3);
  host.bot = true; r.rng = seeded(99);
  r.start(host.id);
  for (let i = 0; i < 160 && r.phase === 'playing'; i++) stepBot(r, r.botDue(), { rng: seeded(i) });
  assert.equal(r.phase, 'playing'); assert.ok(r.s.turnNo > 3);
  assert.equal(r.persistMidGame, true);
  const snap = JSON.parse(JSON.stringify(r.snapshot()));
  const back = GAME.restore(snap, () => {});
  back.game = 'staedtehandel';
  assert.equal(back.phase, 'playing'); assert.equal(back.currentId, r.currentId);
  assert.deepEqual(back.s, r.s); assert.deepEqual(back.gameView(host.id), r.gameView(host.id));
  assert.deepEqual(back.s.deck, r.s.deck, 'Kartenstapel bleibt im Speicherstand, aber nur dort');
  back.players.get(host.id).bot = true; back.players.get(host.id).connected = true;
  finishBots(back, 20000, seeded(5));
  assert.equal(back.phase, 'over');
  // Aufbau mitten im Spiel zwischen zwei Zügen wird ebenfalls gespeichert
  const x = room(3); x.r.start(x.host.id); x.r.onTimeout(x.host.id);
  const copy = GAME.restore(JSON.parse(JSON.stringify(x.r.snapshot())), () => {});
  assert.equal(copy.s.stage, 'setup'); assert.equal(copy.s.cur, x.r.s.cur);
  // Bot-Angebot ohne Uhr wird nach dem Neustart nicht festgehalten
  const y = room(3); y.r.start(y.host.id); y.r.s.stage = 'main'; y.r.s.cur = y.ids[1]; y.r.s.offer = { id: 1, from: y.ids[1], give: { holz: 1 }, want: { ton: 1 }, res: {} };
  const z = GAME.restore(JSON.parse(JSON.stringify(y.r.snapshot())), () => {});
  assert.equal(z.s.offer, null);
});
test('Mitten im Spiel gehen: Zug und Abwurf werden sauber übernommen, Gebäude bleiben, der Rest spielt weiter', () => {
  const { r, host, ids } = room(4);
  r.start(host.id);
  for (let i = 0; i < 100 && r.s.stage === 'setup'; i++) r.onTimeout(r.s.cur);
  const gone = ids[2], built = Object.values(r.s.buildings).filter((b) => b.o === gone).length;
  assert.ok(built > 0);
  give(r.s, gone, { holz: 4 });
  r.leaveGame(r.players.get(gone));
  assert.ok(r.s.out.includes(gone)); assert.ok(!r.order.includes(gone));
  assert.equal(Object.values(r.s.buildings).filter((b) => b.o === gone).length, built, 'Gebäude bleiben als Hindernisse');
  assert.equal(R.cardsOf(r.s, gone), 0);
  for (const k of RES) assert.equal(total(r.s, k), 19);
  // der Rest spielt zu Ende
  for (const id of r.order) { const p = r.players.get(id); p.bot = true; p.connected = true; }
  finishBots(r, 20000, seeded(8));
  assert.equal(r.phase, 'over'); assert.notEqual(r.result.winners[0], gone);
  // Verlassen während des Aufbaus
  const t = room(3); t.r.start(t.host.id); t.r.leaveGame(t.r.players.get(t.ids[1]));
  assert.ok(!t.r.s.setup.order.includes(t.ids[1])); assert.equal(t.r.currentId, t.r.s.cur);
});
test('Bot-Plattform: Aktionen laufen nur über die erlaubten Methoden, die Strategie liefert für jede Lage etwas Legales', () => {
  const { r, host, ids } = room(3, {}, ['easy', 'hard', 'easy']);
  r.start(host.id);
  assert.throws(() => applyBotAction(r, host.id, { method: 'finishRound', args: [] }), /Ungültige/);
  assert.throws(() => applyBotAction(r, host.id, { method: 'ssBuild', args: 'x' }), /Ungültige/);
  for (const level of ['easy', 'medium', 'hard']) {
    const g = r.gameView(host.id);
    const a = chooseBotAction(botObservation(r, host.id), level, { rng: seeded(3) });
    assert.ok(a.action.method.startsWith('ss'), level);
    assert.ok(strategy({ game: 'staedtehandel', id: host.id, g }, level, { rng: seeded(1) }));
  }
  void ids;
});
test('Sieg zu Beginn des eigenen Zuges: Punkte, die im fremden Zug entstanden sind, werden beim Zugwechsel gewertet', () => {
  const { r, host, ids } = room(3);
  r.start(host.id);
  for (let i = 0; i < 100 && r.s.stage === 'setup'; i++) r.onTimeout(r.s.cur);
  assert.equal(r.currentId, host.id);
  r.s.dev[ids[1]] = Array(10).fill('siegpunkt'); // zehn verdeckte Punkte
  r.diceQueue = [[1, 2]]; r.ssRoll(host.id);
  assert.equal(r.phase, 'playing', 'im fremden Zug wird nicht gewonnen');
  r.ssEnd(host.id);
  assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [ids[1]]);
  assert.match(r.result.text, /gewinnt mit [0-9]+ Punkten/);
});
