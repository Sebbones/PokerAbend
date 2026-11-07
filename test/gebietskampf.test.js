// V2-11 Gebietskampf: Karte, Verstärkung, Kampfregeln, Kartentausch, Missionen, Bots und Speicherstand.
import test from 'node:test';
import assert from 'node:assert/strict';
import GAME from '../games/gebietskampf/index.js';
import * as R from '../games/gebietskampf/rules.js';
import { TERRITORIES, EDGES, MAPS, CONTINENTS, mapTerritories, neighbors, continentTerritories } from '../games/gebietskampf/map.js';
import { strategy, fallback } from '../games/gebietskampf/bot.js';
import { addBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';
import { GAMES, PLANNED } from '../games/index.js';
import { botLevels } from '../games/bot-levels.js';

// Würfel mit festen Augen: die Liste wird der Reihe nach abgearbeitet
const dice = (...values) => { let i = 0; return () => (values[i++ % values.length] - 1) / 6 + 0.01; };
const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const fresh = (players = ['a', 'b', 'c'], extra = {}) => R.newGame({ players, ...extra }, seeded(7));
// Gebiete gezielt besetzen
const setup = (s, owners) => { for (const [t, [p, n]] of Object.entries(owners)) { s.owners[t] = p; s.armies[t] = n; } };

function room(n, settings = {}, levels = []) {
  const r = GAME.create('TEST1', { turnTime: 0, ...settings }, () => {});
  r.game = 'gebietskampf';
  const host = r.addPlayer('Host', '🦊'); r.hostId = host.id; r.sit(host.id);
  const ids = [host.id];
  for (let i = 1; i < n; i++) ids.push(addBot(r, host.id, levels[i] || 'medium').id);
  return { r, host, ids };
}

test('Karte: 42 eigene Gebiete in sechs Landmassen, Grenzen sind symmetrisch und überall erreichbar', () => {
  assert.equal(TERRITORIES.length, 42);
  assert.equal(CONTINENTS.length, 6);
  assert.equal(new Set(TERRITORIES.map((t) => t.name)).size, 42, 'Gebietsnamen sind eindeutig');
  for (const t of TERRITORIES) { assert.ok(t.x > 0 && t.x < 1000 && t.y > 0 && t.y < 620, t.name); }
  for (const mapId of Object.keys(MAPS)) {
    const ids = mapTerritories(mapId), seen = new Set([ids[0]]), queue = [ids[0]];
    while (queue.length) for (const n of neighbors(queue.shift(), mapId)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    assert.equal(seen.size, ids.length, `${mapId} hängt zusammen`);
    for (const t of ids) for (const n of neighbors(t, mapId)) assert.ok(neighbors(n, mapId).includes(t), 'symmetrisch');
  }
  assert.equal(mapTerritories('small').length, 28);
  assert.equal(EDGES.length, new Set(EDGES.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)).size, 'keine doppelten Grenzen');
  // keine Entlehnung: kein Name der bekannten Vorlage
  assert.ok(!TERRITORIES.some((t) => /alaska|kamtschatka|ural|irkutsk|ukraine|kongo|madagaskar|venezuela/i.test(t.name)));
});

test('Aufbau: jeder Spieler bekommt die vorgesehene Truppenzahl, alle Gebiete sind besetzt', () => {
  for (const [n, mapId] of [[2, 'full'], [3, 'full'], [6, 'full'], [4, 'small'], [6, 'small']]) {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, n), s = R.newGame({ players, mapId }, seeded(n));
    for (const p of players) assert.equal(R.totalArmies(s, p), R.START_ARMIES[mapId][n], `${n} Spieler ${mapId}`);
    assert.ok(mapTerritories(mapId).every((t) => s.owners[t] && s.armies[t] >= 1));
    assert.equal(s.deck.length, mapTerritories(mapId).length + 2, 'ein Gebiet pro Karte plus zwei Joker');
  }
  assert.throws(() => R.newGame({ players: ['a'] }), /zwei bis sechs/);
});

test('Verstärkung: ein Drittel der Gebiete (mindestens 3) plus Kontinent-Boni', () => {
  const s = fresh(['a', 'b']);
  for (const t of mapTerritories('full')) s.owners[t] = 'b';
  for (const t of [0, 1]) s.owners[t] = 'a';
  assert.equal(R.reinforcement(s, 'a'), 3, 'Minimum');
  for (const t of continentTerritories(0)) s.owners[t] = 'a'; // Nordmark: 7 Gebiete, Bonus 4
  assert.equal(R.reinforcement(s, 'a'), 3 + CONTINENTS[0].bonus);
  assert.deepEqual(R.ownedContinents(s, 'a'), [0]);
  for (const t of continentTerritories(1)) s.owners[t] = 'a'; // 14 Gebiete → 4, plus beide Boni
  assert.equal(R.reinforcement(s, 'a'), 4 + CONTINENTS[0].bonus + CONTINENTS[1].bonus);
  assert.equal(R.reinforcement(s, 'b'), Math.floor(28 / 3) + [2, 3, 4, 5].reduce((n, ci) => n + CONTINENTS[ci].bonus, 0), 'der Rest: Gebiete plus seine vier Landmassen');
});

test('Verstärkung setzen: nur eigene Gebiete, nur bis zur Reserve', () => {
  const s = fresh(['a', 'b']); s.owners[0] = 'a'; s.owners[1] = 'b'; s.reserve = 5;
  assert.throws(() => R.place(s, 'a', 1, 1), /gehört dir nicht/);
  assert.throws(() => R.place(s, 'a', 0, 6), /Ungültige/);
  const before = s.armies[0]; R.place(s, 'a', 0, 5);
  assert.equal(s.armies[0], before + 5); assert.equal(s.reserve, 0);
  assert.throws(() => R.place(s, 'a', 0, 1), /keine Verstärkung/);
  assert.throws(() => R.toFortify(s, 'a'), /Angriffsphase/);
});

test('Kampf: höchste Würfel zählen, Gleichstand gewinnt die Verteidigung, Verluste stimmen', () => {
  const s = fresh(['a', 'b']);
  setup(s, { 0: ['a', 6], 1: ['b', 4] }); s.stage = 'attack'; s.reserve = 0;
  // Angreifer 6,5,2 gegen Verteidiger 4,3 → beide Vergleiche gewinnt der Angreifer
  let r = R.attack(s, 'a', 0, 1, 3, dice(6, 5, 2, 4, 3));
  assert.deepEqual([r.att, r.def, r.atkLoss, r.defLoss], [[6, 5, 2], [4, 3], 0, 2]);
  assert.equal(s.armies[1], 2);
  // Gleichstand 4:4 geht an die Verteidigung, 3:2 an den Angreifer → je ein Verlust
  r = R.attack(s, 'a', 0, 1, 2, dice(4, 3, 4, 2));
  assert.deepEqual([r.atkLoss, r.defLoss], [1, 1]);
  assert.equal(s.armies[0], 5); assert.equal(s.armies[1], 1);
  // Verteidiger mit nur einer Truppe würfelt mit einem Würfel
  r = R.attack(s, 'a', 0, 1, 3, dice(2, 2, 2, 6));
  assert.equal(r.def.length, 1); assert.equal(r.atkLoss, 1);
});

test('Kampf: Regeln für Angriffe werden geprüft', () => {
  const s = fresh(['a', 'b']);
  setup(s, { 0: ['a', 3], 1: ['b', 2], 2: ['a', 1], 14: ['b', 2] }); s.stage = 'attack'; s.reserve = 0;
  const go = (from, to, d) => () => R.attack(s, 'a', from, to, d, dice(1));
  assert.throws(go(0, 14, 1), /grenzen nicht/);
  assert.throws(go(0, 2, 1), /gegnerisches/);
  assert.throws(go(2, 1, 1), /mindestens zwei|grenzen/);
  assert.throws(go(0, 1, 3), /Würfelzahl/, 'höchstens Truppen minus eins');
  assert.throws(go(0, 1, 0), /Würfelzahl/);
  assert.throws(() => R.attack(s, 'b', 0, 1, 1, dice(1)), /gehört dir nicht/);
  s.stage = 'reinforce'; assert.throws(go(0, 1, 1), /Angriffsphase/);
  s.stage = 'attack'; s.reserve = 2; assert.throws(go(0, 1, 1), /Verstärkung/);
});

test('Eroberung: Truppen ziehen nach, Angreifer kann weitere nachziehen; Karte nur nach Eroberung', () => {
  const s = fresh(['a', 'b', 'c']);
  setup(s, { 0: ['a', 5], 1: ['b', 1] }); s.stage = 'attack'; s.reserve = 0; s.deck = [{ t: 3, s: 0 }, { t: 4, s: 1 }];
  const r = R.attack(s, 'a', 0, 1, 3, dice(6, 6, 6, 1));
  assert.ok(r.conquered); assert.equal(s.owners[1], 'a');
  assert.equal(s.armies[1], 3, 'mindestens so viele Truppen wie Würfel');
  assert.deepEqual(s.pending, { from: 0, to: 1, extra: 1 });
  assert.throws(() => R.toFortify(s, 'a'), /nachziehen/);
  assert.throws(() => R.occupy(s, 'a', 2), /Ungültige/);
  R.occupy(s, 'a', 1);
  assert.equal(s.armies[0], 1); assert.equal(s.armies[1], 4);
  const card = R.endTurn(s, 'a', dice(1));
  assert.deepEqual(card, { t: 4, s: 1 }); assert.equal(s.hands.a.length, 1);
  // ohne Eroberung keine Karte
  const s2 = fresh(['a', 'b']); s2.stage = 'attack'; s2.reserve = 0;
  assert.equal(R.endTurn(s2, 'a'), null); assert.equal(s2.hands.a.length, 0);
});

test('Ausscheiden: wer das letzte Gebiet verliert, gibt seine Karten ab; Weltherrschaft gewinnt', () => {
  const s = R.newGame({ players: ['a', 'b'], mapId: 'small' }, seeded(3));
  for (const t of mapTerritories('small')) { s.owners[t] = 'a'; s.armies[t] = 2; }
  setup(s, { 0: ['a', 9], 1: ['b', 1] }); s.stage = 'attack'; s.reserve = 0; s.hands.b = [{ t: 5, s: 2 }, { t: null, s: null }];
  const r = R.attack(s, 'a', 0, 1, 3, dice(6, 6, 6, 1));
  assert.equal(r.eliminated, 'b'); assert.deepEqual(s.eliminated, ['b']);
  assert.equal(s.hands.a.length, 2); assert.equal(s.hands.b.length, 0);
  assert.deepEqual(R.winner(s, 'a'), { id: 'a', by: 'world' });
});

test('Kartensätze: gleich, verschieden oder mit Joker; steigender und fester Bonus; Gebietsbonus +2', () => {
  const c = (t, s) => ({ t, s }), W = c(null, null);
  assert.ok(R.validSet([c(0, 0), c(3, 0), c(6, 0)]));
  assert.ok(R.validSet([c(0, 0), c(1, 1), c(2, 2)]));
  assert.ok(R.validSet([c(0, 0), c(1, 0), W]));
  assert.ok(!R.validSet([c(0, 0), c(1, 0), c(2, 1)]));
  assert.ok(!R.validSet([c(0, 0), c(1, 1)]));
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((n) => R.tradeValue(n)), [4, 6, 8, 10, 12, 15, 20, 25]);
  assert.equal(R.tradeValue(9, 'fixed'), 6);
  const s = fresh(['a', 'b']); setup(s, { 5: ['a', 2], 6: ['b', 2] });
  s.hands.a = [c(5, 2), c(1, 1), c(0, 0), c(9, 0)];
  assert.throws(() => R.trade(s, 'a', [1, 2, 3]), /kein gültiger Satz/);
  assert.throws(() => R.trade(s, 'a', [0, 0, 1]), /drei verschiedene/);
  const before = s.reserve, r = R.trade(s, 'a', [0, 1, 2]);
  assert.equal(r.value, 4); assert.equal(s.reserve, before + 4); assert.equal(r.bonusOn, 5); assert.equal(s.armies[5], 4, '+2 auf dem eigenen Gebiet der Karte');
  assert.equal(s.hands.a.length, 1); assert.equal(s.tradeCount, 1);
  s.hands.a = [c(7, 0), c(8, 1), W]; assert.equal(R.trade(s, 'a', [0, 1, 2]).value, 6, 'zweiter Tausch zählt höher');
  assert.equal(R.findSets([c(0, 0), c(1, 1), c(2, 2), c(3, 0)]).length, 2, 'zwei Sätze aus vier Karten');
});

test('Kartenzwang: ab fünf Karten ist Tauschen Pflicht, davor geht nichts anderes', () => {
  const s = fresh(['a', 'b']); setup(s, { 0: ['a', 3] });
  s.hands.a = [0, 1, 2, 3, 4].map((t) => ({ t, s: t % 3 }));
  assert.ok(R.needTrade(s, 'a'));
  assert.throws(() => R.place(s, 'a', 0, 1), /Tausche zuerst/);
  assert.throws(() => R.toAttack(s, 'a'), /Tausche zuerst/);
  R.trade(s, 'a', R.findSets(s.hands.a)[0]);
  assert.ok(!R.needTrade(s, 'a'));
  s.stage = 'attack'; s.hands.a = [0, 1, 2, 3, 4, 5].map((t) => ({ t, s: t % 3 }));
  assert.ok(R.needTrade(s, 'a'), 'nach einem Ausscheiden mit sechs Karten sofort');
  assert.ok(R.trade(s, 'a', R.findSets(s.hands.a)[0]).value > 0);
});

test('Verschieben: nur über zusammenhängende eigene Gebiete, eine Truppe bleibt zurück', () => {
  const s = fresh(['a', 'b']);
  for (const t of mapTerritories('full')) { s.owners[t] = 'b'; s.armies[t] = 1; }
  setup(s, { 0: ['a', 5], 1: ['a', 1], 2: ['a', 1], 3: ['a', 1], 10: ['a', 2] }); s.stage = 'fortify'; s.reserve = 0;
  assert.throws(() => R.fortify(s, 'a', 0, 10, 1), /nicht über eigene/);
  assert.throws(() => R.fortify(s, 'a', 0, 1, 5), /Ungültige/);
  assert.throws(() => R.fortify(s, 'a', 0, 4, 1), /müssen dir gehören/);
  R.fortify(s, 'a', 0, 2, 4); // 0–1–2 sind verbunden
  assert.deepEqual([s.armies[0], s.armies[2]], [1, 5]);
  s.stage = 'attack'; assert.throws(() => R.fortify(s, 'a', 2, 1, 1), /nach dem Angriff/);
});

test('Missionen: jeder hat ein Ziel, es wird zuverlässig erkannt; erledigt durch Dritte → neues Ziel', () => {
  const s = R.newGame({ players: ['a', 'b', 'c'], mode: 'mission' }, seeded(11));
  assert.deepEqual(Object.keys(s.missions).sort(), ['a', 'b', 'c']);
  s.missions.a = { kind: 'continents', a: 0, b: 1 };
  assert.ok(!R.missionDone(s, 'a'));
  for (const t of [...continentTerritories(0), ...continentTerritories(1)]) s.owners[t] = 'a';
  assert.ok(R.missionDone(s, 'a'));
  assert.deepEqual(R.winner(s, 'b'), { id: 'a', by: 'mission' });
  s.missions.a = { kind: 'eliminate', target: 'b' }; s.eliminated.push('b'); s.eliminatedBy.b = 'c';
  assert.equal(R.effectiveMission(s, 'a').kind, 'territories');
  assert.equal(R.effectiveMission(s, 'a').fallback, true);
  assert.match(R.missionText(s, 'a').de, /24 Gebiete/);
  const world = R.newGame({ players: ['a', 'b'], mode: 'world' }, seeded(1));
  assert.equal(world.missions, null); assert.equal(R.winner(world, 'a'), null);
});

test('Spiel ist registriert: kein zweites Risiko-Spiel, Backlog-ID gebietskampf bleibt erhalten', () => {
  assert.ok(GAMES.gebietskampf); assert.ok(GAMES['risiko-wuerfeln'], 'bestehendes Würfelspiel bleibt');
  assert.ok(!PLANNED.some((g) => g.id === 'gebietskampf'));
  assert.equal(GAMES.gebietskampf.minPlayers, 2); assert.equal(GAMES.gebietskampf.maxPlayers, 6);
  assert.deepEqual(botLevels('gebietskampf'), ['easy', 'medium', 'hard']);
});

test('Raum: nur wer dran ist handelt, Würfel kommen vom Server, fremde Karten und Missionen bleiben verborgen', () => {
  const { r, host, ids } = room(3, { mode: 'mission' });
  r.rng = seeded(5); r.start(host.id);
  const cur = r.currentId, other = ids.find((i) => i !== cur);
  assert.throws(() => r.gkPlace(other, { t: 0, n: 1 }), /nicht dran/);
  const mine = Object.keys(r.s.owners).map(Number).find((t) => r.s.owners[t] === cur);
  const reserve = r.s.reserve; r.gkPlace(cur, { t: mine, n: reserve });
  r.gkNext(cur);
  // Ein Client kann keine Würfelergebnisse mitschicken: gkAttack ignoriert unbekannte Felder
  const from = Object.keys(r.s.owners).map(Number).find((t) => r.s.owners[t] === cur && R.canAttackFrom(r.s, cur, t).length);
  if (from !== undefined) {
    const to = R.canAttackFrom(r.s, cur, from)[0], fixed = { att: [6, 6, 6], def: [1, 1], atkLoss: 0, defLoss: 2 };
    r.gkAttack(cur, { from, to, dice: 1, ...fixed });
    assert.ok(r.s.last.att.length === 1, 'Würfelzahl bestimmt der Server aus der Anfrage, Ergebnisse würfelt er selbst');
  }
  r.s.hands[other] = [{ t: 1, s: 1 }];
  const view = r.gameView(cur), otherView = r.gameView(other);
  assert.equal(view.hand.length, r.s.hands[cur].length); assert.deepEqual(otherView.hand, [{ t: 1, s: 1 }]);
  assert.ok(view.mission && otherView.mission && view.mission.de !== undefined);
  const spectator = r.gameView('zuschauer'); assert.equal(spectator.hand, null); assert.equal(spectator.mission, null);
  assert.ok(!JSON.stringify(spectator).includes('"missions"') && !JSON.stringify(view).includes('"deck":['), 'kein Kartenstapel in der Ansicht');
  const pub = r.view(host.id); assert.ok(pub.players.every((p) => typeof p.cards === 'number'));
});

test('Raum: Reconnect mitten im Zug und Speicherstand überleben einen Neustart', () => {
  const { r, host } = room(3, { map: 'small' });
  r.rng = seeded(9); r.start(host.id);
  const cur = r.currentId, t = Object.keys(r.s.owners).map(Number).find((x) => r.s.owners[x] === cur);
  r.gkPlace(cur, { t, n: 1 });
  const snap = JSON.parse(JSON.stringify(r.snapshot()));
  assert.ok(snap.extra?.s, 'Spielstand liegt im Snapshot');
  const back = GAME.restore({ ...snap, game: 'gebietskampf' }, () => {});
  assert.equal(back.phase, 'playing'); assert.equal(back.currentId, cur);
  assert.deepEqual(back.s.owners, r.s.owners); assert.deepEqual(back.s.armies, r.s.armies);
  assert.equal(back.s.reserve, r.s.reserve); assert.equal(back.s.stage, 'reinforce');
  assert.deepEqual(back.gameView(cur).hand, r.gameView(cur).hand);
  // das Spiel geht weiter: der Zug ist mit dem gespeicherten Stand fortsetzbar
  back.gkPlace(cur, { t, n: back.s.reserve }); back.gkNext(cur); back.gkNext(cur); back.gkEnd(cur);
  assert.notEqual(back.currentId, cur);
  assert.equal(r.persistMidGame, true);
});

test('Raum: Zeit abgelaufen beendet den Zug sicher; Aussteiger hinterlassen neutrale Gebiete', () => {
  const { r, host, ids } = room(3, { map: 'small' });
  r.rng = seeded(2); r.start(host.id);
  const cur = r.currentId, before = Object.values(r.s.armies).reduce((a, b) => a + b, 0), reserve = r.s.reserve;
  r.onTimeout(cur);
  assert.notEqual(r.currentId, cur);
  assert.equal(Object.values(r.s.armies).reduce((a, b) => a + b, 0), before + reserve, 'Verstärkung wurde gesetzt, nichts ging verloren');
  const leaver = r.currentId, own = R.ownedBy(r.s, leaver).length;
  assert.ok(own > 0);
  r.leaveGame(r.players.get(leaver));
  assert.equal(R.ownedBy(r.s, leaver).length, 0);
  assert.equal(Object.values(r.s.owners).filter((o) => o === null).length, own);
  assert.ok(r.order.length === 2 && r.phase === 'playing' && r.currentId !== leaver);
  assert.ok(ids.length === 3);
});

test('Bots: legale Züge in allen Stufen, Entscheidung sieht keine fremden Karten', () => {
  const { r, host } = room(3, { map: 'small' }, ['', 'easy', 'hard']);
  host.bot = true; r.rng = seeded(4); r.start(host.id);
  for (let i = 0; i < 40 && r.phase === 'playing'; i++) {
    const id = r.currentId, g = r.gameView(id);
    for (const level of ['easy', 'medium', 'hard']) {
      const a = strategy({ game: 'gebietskampf', id, g }, level, { rng: seeded(i) });
      assert.ok(['gkPlace', 'gkTrade', 'gkNext', 'gkAttack', 'gkOccupy', 'gkFortify', 'gkEnd'].includes(a.method), level);
    }
    assert.ok(fallback({ game: 'gebietskampf', id, g }).method);
    stepBot(r, id);
  }
  const o = r.gameView(r.currentId); assert.ok(!('hands' in o) && !('missions' in o));
});

test('Bot-Partien laufen auf beiden Karten und in beiden Siegmodi bis zum Ende', () => {
  for (const [n, settings, levels] of [[3, { map: 'small' }, ['', 'medium', 'hard']], [4, { map: 'full' }, ['', 'hard', 'medium', 'hard']], [5, { map: 'small', mode: 'mission', cardBonus: 'fixed' }, []], [2, { map: 'full', mode: 'mission' }, ['', 'hard']]]) {
    const { r, host } = room(n, settings, levels);
    host.bot = true; r.rng = seeded(n * 31); r.start(host.id);
    let steps = 0; while (r.phase === 'playing' && steps < 60000) { steps++; stepBot(r, r.currentId, { rng: seeded(steps) }); }
    assert.equal(r.phase, 'over', `${n} Spieler ${JSON.stringify(settings)} endet`);
    assert.equal(r.result.winners.length, 1);
    assert.equal(r.scores[r.result.winners[0]], 1, 'Sieg wird gebucht');
    const w = r.result.winners[0], s = r.s;
    assert.ok(R.alive(s).length === 1 || (s.missions && R.missionDone(s, w)), 'Sieg ist echt: Weltherrschaft oder erfüllte Mission');
    assert.ok(R.ownedBy(s, w).length > 0);
    for (const t of mapTerritories(s.mapId)) assert.ok(s.armies[t] >= 1 && Number.isInteger(s.armies[t]), 'jedes Gebiet bleibt besetzt');
  }
});
