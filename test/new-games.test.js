import '../games/seven-card-stud/rules.test.js';
import '../games/short-deck/rules.test.js';
import '../games/omaha-hi-lo/rules.test.js';
import '../games/scrabble/rules.test.js';
import '../games/five-card-draw/rules.test.js';
import '../games/hearts/rules.test.js';
import '../games/backgammon/rules.test.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';

test('BACKLOG-04: four real game commits, private game roots and 64 original images back the completed packet',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url)),plan=JSON.parse(read('docs/backlog/plan.json')),packet=plan.packages.find(p=>p.id==='BACKLOG-04');
  assert.equal(plan.total_count,41);assert.equal(plan.completed_count,plan.games.filter(g=>['done','verified'].includes(g.status)).length);assert.equal(plan.remaining_count,41-plan.completed_count);assert.equal(packet.status,'done');
  assert.deepEqual(packet.games,['scrabble','omaha-hi-lo','short-deck','seven-card-stud']);let images=0;
  for(const id of packet.games){const game=plan.games.find(g=>g.id===id),manifest=JSON.parse(read(`games/${id}/evidence.json`));assert.equal(game.status,'done');assert.match(game.implementation_commit,/^[a-f0-9]{40}$/);assert.equal(game.implementation_commit,packet.implementation_commits[id]);assert.equal(manifest.implementation_commit,game.implementation_commit);assert.equal(manifest.screenshots.length,{scrabble:18,'omaha-hi-lo':14,'short-deck':16,'seven-card-stud':16}[id]);images+=manifest.screenshots.length;
    for(const source of game.source_audit)assert.equal(createHash('sha256').update(read(source.path).toString('utf8').replaceAll('\r\n','\n')).digest('hex'),source.sha256,source.path);
    for(const s of manifest.screenshots){assert.ok(s.path.startsWith(`public/games/${id}/`));assert.equal(createHash('sha256').update(read(s.path)).digest('hex'),s.sha256,s.path);}
  }assert.equal(images,64);assert.equal(packet.permanent_screenshots,64);assert.match(packet.shared_source_audit_commit,/^[a-f0-9]{40}$/);for(const s of packet.shared_source_audit)assert.equal(createHash('sha256').update(read(s.path).toString('utf8').replaceAll('\r\n','\n')).digest('hex'),s.sha256,s.path);
});

test('BACKLOG-03: three completed implementations retain real source and image evidence; denominator remains 41',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url));
  const plan=JSON.parse(read('docs/backlog/plan.json'));
  assert.equal(plan.total_count,41);assert.equal(plan.completed_count,plan.games.filter(g=>['done','verified'].includes(g.status)).length);assert.equal(plan.remaining_count,41-plan.completed_count);
  const packet=plan.packages.find(p=>p.id==='BACKLOG-03');assert.equal(packet.status,'done');
  assert.deepEqual(packet.games,['backgammon','hearts','five-card-draw']);
  for(const id of packet.games){
    const game=plan.games.find(g=>g.id===id),manifest=JSON.parse(read(`games/${id}/evidence.json`));
    assert.equal(game.status,'done');assert.match(game.implementation_commit,/^[a-f0-9]{40}$/);
    assert.equal(game.implementation_commit,packet.implementation_commits[id]);assert.equal(manifest.implementation_commit,game.implementation_commit);
    assert.equal(manifest.screenshots.length,id==='backgammon'?12:id==='hearts'?16:30);
    for(const s of manifest.screenshots)assert.equal(createHash('sha256').update(read(s.path)).digest('hex'),s.sha256,s.path);
    for(const s of game.source_audit)assert.equal(createHash('sha256').update(read(s.path).toString('utf8').replaceAll('\r\n','\n')).digest('hex'),s.sha256,s.path);
  }
});
import { CITY, neighbours, distances } from '../games/scotland-yard/map.js';
import { chooseMove } from '../games/scotland-yard/room.js';
import { connection, adjacent, botCell } from '../games/hex/room.js';
const seeded = (seed = 1) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
function table(t, game, count = GAMES[game].minPlayers, settings = {}) {
  const r = GAMES[game].create('NEU', settings, () => {}); r.game = game;
  t.after(() => r.dispose());
  const ids = Array.from({ length: count }, (_, i) => { const p = r.addPlayer('Spieler ' + i, null); p.connected = true; r.sit(p.id); return p.id; });
  r.start(ids[0]); return { r, ids };
}
function chase(t) {
  const { r, ids } = table(t, 'scotland-yard');
  r.xId = ids[0]; r.order = [...ids]; r.turn = 0;
  r.positions = { [ids[0]]: 9, [ids[1]]: 1, [ids[2]]: 49 };
  r.travel = []; r.lastSeen = null; r.doublePending = false; r.candidates = CITY.nodes.map((n) => n.id).filter((n) => n !== 1 && n !== 49);
  return { r, ids };
}
test('Neue Spiele: Registrierung, Bots, Optionen und eigener zusammenhängender Stadtplan', () => {
  assert.ok(Object.keys(GAMES).length >= 58, 'neue Spiele dürfen den Katalog erweitern');
  for (const id of ['scotland-yard', 'hex', 'wuerfelduell']) { assert.ok(GAMES[id]); assert.equal(typeof BOTS[id], 'function'); }
  assert.equal(CITY.nodes.length, 49); assert.equal(distances(1).size, 49);
  for (const e of CITY.edges) { assert.ok(e.a !== e.b); assert.ok(neighbours(e.a, e.mode).includes(e.b)); assert.ok(neighbours(e.b, e.mode).includes(e.a)); }
  assert.equal(new Set(CITY.edges.map((e) => `${e.a}/${e.b}/${e.mode}`)).size, CITY.edges.length);
  assert.ok(neighbours(15, 'black').includes(41)); assert.ok(!neighbours(15, 'taxi').includes(41));
});
test('Scotland Yard: geheime Position und Tickets bleiben nur bei Mr. X; persönliche Ansicht ist unveränderlich', (t) => {
  const { r, ids: [x, a] } = chase(t);
  const spectator = r.addPlayer('Zuschauer', null).id;
  const before = structuredClone(r.view(a)), watched = structuredClone(r.view(spectator));
  assert.equal(r.view(x).g.xPosition, 9); assert.equal(before.g.xPosition, null); assert.equal(watched.g.xPosition, null);
  r.positions[x] = 10; r.tickets[x].taxi = 999; r.tickets[x].black = 0;
  assert.deepEqual(r.view(a).g, before.g); assert.deepEqual(r.view(spectator).g, watched.g);
  const v = r.view(x); v.g.tickets.bus = 1000; v.g.candidates.length = 0;
  assert.notEqual(r.tickets[x].bus, 1000); assert.ok(r.candidates.length);
});
test('Scotland Yard: alternative verdeckte Ziele erzeugen exakt denselben öffentlichen Zustand', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  const { r, ids: [x, a] } = chase(t);
  const keys = ['positions', 'tickets', 'travel', 'candidates', 'lastSeen', 'doublePending', 'turn', 'phase', 'moves', 'moveNo', 'acts', 'actSeq', 'log', 'logSeq'];
  const backup = Object.fromEntries(keys.map((k) => [k, structuredClone(r[k])]));
  r.move(x, 8, 'taxi'); const publicA = structuredClone(r.view(a));
  for (const k of keys) r[k] = structuredClone(backup[k]);
  r.move(x, 10, 'taxi'); assert.deepEqual(r.view(a), publicA);
});

test('Scotland Yard: Zuschauer und wartende Spieler haben keine aktive Rolle; Abbruch entfernt alte Rollen', (t) => {
  const { r, ids: [x, a] } = chase(t);
  const watcher = r.addPlayer('Zuschauer', null).id;
  const role = (id) => r.view(watcher).players.find((p) => p.id === id).role;
  assert.equal(role(x), 'x'); assert.equal(role(a), 'detective');
  assert.equal(role(watcher), null);
  r.sit(watcher);
  assert.equal(r.view(watcher).you.inRound, false); assert.equal(role(watcher), null);
  r.abortRound(x);
  assert.equal(role(x), null); assert.equal(role(a), null);
  r.newGame(x);
  assert.equal(role(x), null);
});

test('Scotland Yard: veränderte Distanz-Ergebnisse beschädigen den Bot-Cache nicht', () => {
  const first = distances(23);
  assert.equal(first.size, 49); first.clear();
  const second = distances(23);
  assert.equal(second.size, 49); assert.equal(second.get(23), 0); assert.equal(second.get(24), 1);
  second.set(24, 99); assert.equal(distances(23).get(24), 1);
});
test('Scotland Yard: unerlaubte Züge, fremde Rolle und Doppelzug werden ohne Mutation abgelehnt', (t) => {
  const { r, ids: [x, a] } = chase(t);
  for (const args of [[a, 8, 'taxi'], [x, 1, 'taxi'], [x, 999, 'taxi'], [x, '8', 'taxi'], [x, 8, '__proto__'], [x, 8, 'taxi', 'true']]) {
    const before = structuredClone({ positions: r.positions, tickets: r.tickets, travel: r.travel });
    assert.throws(() => r.move(...args)); assert.deepEqual({ positions: r.positions, tickets: r.tickets, travel: r.travel }, before);
  }
  assert.throws(() => r.chooseX(a, a), /Host/); assert.throws(() => r.chooseX(x, a), /zwischen/);
  r.tickets[x].taxi = 0; assert.throws(() => r.move(x, 8, 'taxi'));
});
test('Scotland Yard: Black-Ticket verbirgt Verkehrsmittel; Auftauchen und Doppelzug zählen jede Etappe', (t) => {
  const { r, ids: [x, a] } = chase(t);
  r.travel = [{ move: 1, ticket: 'taxi' }, { move: 2, ticket: 'bus' }];
  const doubles = r.tickets[x].double;
  r.move(x, 10, 'black', true);
  assert.equal(r.currentId, x); assert.equal(r.doublePending, true); assert.equal(r.tickets[x].double, doubles - 1);
  assert.equal(r.view(a).g.xPosition, 10); assert.deepEqual(r.lastSeen, { move: 3, station: 10 });
  r.setGamePaused(x, true);
  assert.throws(() => r.move(x, 11, 'taxi'), /angehalten/);
  assert.equal(r.view(x).g.doublePending, true); assert.equal(r.travel.length, 3);
  r.setGamePaused(x, false);
  r.move(x, 11, 'taxi');
  assert.equal(r.currentId, a); assert.equal(r.doublePending, false); assert.equal(r.view(a).g.xPosition, null);
  assert.deepEqual(r.travel[2], { move: 3, ticket: 'black', station: 10, double: true });
  assert.deepEqual(r.travel[3], { move: 4, ticket: 'taxi', double: true });
  assert.equal(r.view(a).g.lastSeen.station, 10);
});
test('Scotland Yard: Detektiv fängt Mr. X, verbraucht Ticket und gibt es an Mr. X', (t) => {
  const { r, ids: [x, a, b] } = chase(t); r.turn = 1; r.positions[x] = 2;
  const start = r.tickets[x].taxi;
  r.move(a, 2, 'taxi'); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [a, b]);
  assert.equal(r.tickets[a].taxi, 9); assert.equal(r.tickets[x].taxi, start + 1); assert.equal(r.view(b).g.xPosition, 2);
});
test('Scotland Yard: nach dem letzten Mr.-X-Zug dürfen die Detektive noch reagieren', (t) => {
  const { r, ids: [x, a, b] } = chase(t); r.settings.rounds = 12;
  r.travel = Array.from({ length: 11 }, (_, i) => ({ move: i + 1, ticket: 'taxi' }));
  assert.throws(() => r.move(x, 10, 'taxi', true), /Doppelzug/);
  r.move(x, 10, 'taxi'); assert.equal(r.phase, 'playing'); assert.equal(r.view(a).g.xPosition, 10);
  r.move(a, 2, 'taxi'); assert.equal(r.phase, 'playing');
  r.move(b, 48, 'taxi'); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [x]);
});
test('Scotland Yard: Eingeschlossen, blockierte Detektive, Aufgabe und Rollenwahl', (t) => {
  {
    const { r, ids: [x, a, b] } = chase(t); r.tickets[x] = { taxi: 0, bus: 0, underground: 0, black: 0, double: 2 }; r.onTurnStart();
    assert.deepEqual(r.result.winners, [a, b]);
  }
  {
    const { r, ids: [x, a, b] } = chase(t); r.tickets[a] = r.tickets[b] = { taxi: 0, bus: 0, underground: 0 }; r.onTurnStart();
    assert.deepEqual(r.result.winners, [x]);
  }
  {
    const { r, ids: [x, a] } = chase(t); r.tickets[a] = { taxi: 0, bus: 0, underground: 0 }; r.move(x, 10, 'taxi'); assert.notEqual(r.currentId, a);
    r.stand(x); assert.equal(r.phase, 'over');
    r.chooseX(r.hostId, a); const restored = GAMES['scotland-yard'].restore(r.snapshot(), () => {}); t.after(() => restored.dispose()); assert.equal(restored.xChoice, a);
  }
});
test('Scotland Yard: Detektiv-Bot sieht nur öffentliche Kandidaten, keine echte Mr.-X-Position', (t) => {
  const { r, ids: [x, a] } = chase(t); r.turn = 1;
  const first = chooseMove(r.gameView(a), seeded(50)); r.positions[x] = 36;
  assert.deepEqual(chooseMove(r.gameView(a), seeded(50)), first);
});
test('Scotland Yard: ein unmöglicher zweiter Teilzug verbraucht kein Doppel-Ticket; Fähre nur mit Black', (t) => {
  const { r, ids: [x] } = chase(t);
  r.tickets[x] = { taxi: 1, bus: 0, underground: 0, black: 0, double: 2 };
  const before = structuredClone(r.tickets);
  assert.throws(() => r.move(x, 10, 'taxi', true), /Doppelzug/); assert.deepEqual(r.tickets, before); assert.equal(r.positions[x], 9);
  r.positions[x] = 15; r.tickets[x].black = 1;
  assert.throws(() => r.move(x, 41, 'taxi')); r.move(x, 41, 'black'); assert.deepEqual(r.travel, [{ move: 1, ticket: 'black' }]);
});
test('Scotland Yard: eingeschlossener Mr. X verliert auch dann, wenn Detektive keine Tickets mehr haben', (t) => {
  const { r, ids: [x] } = chase(t);
  for (const wallet of Object.values(r.tickets)) for (const key of Object.keys(wallet)) wallet[key] = 0;
  r.onTurnStart(); assert.equal(r.phase, 'over'); assert.ok(!r.result.winners.includes(x));
});
test('Hex: Nachbarschaft, beide Verbindungsrichtungen und unterbrochene Kette', () => {
  assert.deepEqual(adjacent(0, 3), [1, 3]); assert.equal(adjacent(4, 3).length, 6);
  const vertical = [0, null, null, 0, null, null, 0, null, null]; assert.deepEqual(connection(vertical, 3, 0), [0, 3, 6]);
  const horizontal = [1, 1, 1, null, null, null, null, null, null]; assert.deepEqual(connection(horizontal, 3, 1), [0, 1, 2]);
  vertical[3] = 1; assert.deepEqual(connection(vertical, 3, 0), []);
  assert.equal(botCell([0, 1, 1, 0, null, null, null, null, null], 3, 0), 6);
});
test('Hex: Tauschregel erhält den Stein, tauscht die Ziele und ist genau einmal möglich', (t) => {
  const { r, ids: [a, b] } = table(t, 'hex', 2, { size: '9' });
  r.place(a, 40); assert.equal(r.canSwap(b), true); r.swapSides(b);
  assert.equal(r.board[40], 0); assert.equal(r.colors[a], 1); assert.equal(r.colors[b], 0); assert.equal(r.currentId, a);
  assert.throws(() => r.swapSides(a)); r.place(a, 0); assert.throws(() => r.place(b, 0)); assert.throws(() => r.place(b, -1));
});
test('Hex: Gewinner und Gewinnpfad, keine Züge nach dem Ende', (t) => {
  const { r, ids: [a] } = table(t, 'hex', 2, { size: '9', swap: false });
  for (let row = 0; row < 8; row++) r.board[row * 9] = 0;
  r.place(a, 72); assert.equal(r.phase, 'over'); assert.equal(r.path.length, 9); assert.deepEqual(r.result.winners, [a]); assert.throws(() => r.place(a, 1));
});
test('Hex: alle vollständigen 2×2- und 3×3-Bretter haben genau eine verbindende Farbe', () => {
  for (const size of [2, 3]) for (let mask = 0; mask < 2 ** (size * size); mask++) {
    const board = Array.from({ length: size * size }, (_, i) => (mask >> i) & 1);
    assert.notEqual(connection(board, size, 0).length > 0, connection(board, size, 1).length > 0, `${size}/${mask}`);
  }
});
test('Würfelduell: serverseitige Treffer, Schilde, Schaden, Ausscheiden und Sieg', (t) => {
  const { r, ids: [a, b, c] } = table(t, 'wuerfelduell', 3, { health: 5 });
  let rolls = [6, 4, 1, 5, 1, 2]; r.roll = () => rolls.shift();
  r.attack(a, b); assert.equal(r.health[b], 4); assert.equal(r.lastAttack.hits, 2); assert.equal(r.lastAttack.shields, 1); assert.equal(r.lastAttack.damage, 1);
  const before = structuredClone(r.health); assert.throws(() => r.attack(b, b)); assert.deepEqual(r.health, before);
  r.turn = 0; r.health[b] = 1; r.health[c] = 0; r.roll = () => 1; r.attacks = 10;
  r.attack(a, b); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [a]); assert.equal(r.lastAttack.pressure, 1);
});
for (const game of ['scotland-yard', 'hex', 'wuerfelduell']) test(`${game}: komplette Botpartien enden regelkonform; Pause und Wiederaufnahme sperren Aktionen`, (t) => {
  const { r, ids } = table(t, game, GAMES[game].minPlayers, game === 'hex' ? { size: '9' } : {});
  r.setGamePaused(ids[0], true); const before = structuredClone(r.gameView(r.currentId));
  assert.throws(() => BOTS[game](r, r.currentId, seeded(1)), /angehalten/); assert.deepEqual(r.gameView(r.currentId), before);
  r.setGamePaused(ids[0], false);
  const rng = seeded(42);
  let actions = 0;
  while (r.phase === 'playing' && actions++ < 300) BOTS[game](r, r.currentId, rng);
  assert.equal(r.phase, 'over', `${actions} Aktionen`); assert.ok(r.result.winners.length); assert.ok(Object.values(r.scores).every((n) => n >= 0));
});
test('Neue Spiele: 92 vollständige Botpartien über alle Spielerzahlen und beide Hex-Größen', (t) => {
  const rng = seeded(314159);
  let rounds = 0;
  for (const [game, repeats] of [['scotland-yard', 30], ['hex', 12], ['wuerfelduell', 50]]) for (let i = 0; i < repeats; i++) {
    const n = game === 'scotland-yard' ? 3 + i % 4 : game === 'hex' ? 2 : 2 + i % 3;
    const { r } = table(t, game, n, game === 'hex' ? { size: i % 2 ? '9' : '11' } : {});
    let actions = 0;
    while (r.phase === 'playing' && actions++ < 180) {
      const actor = r.currentId; BOTS[game](r, actor, rng);
      if (game === 'scotland-yard') {
        assert.ok(r.travel.length <= r.settings.rounds); assert.ok(Object.values(r.tickets).every((w) => Object.values(w).every((n) => n >= 0)));
        assert.equal(new Set(r.detectives.map((id) => r.positions[id])).size, r.detectives.length);
        if (r.phase === 'playing') assert.ok(r.candidates.includes(r.positions[r.xId]), 'Öffentliche Hinweise schließen die echte Station nicht fälschlich aus');
      } else if (game === 'hex') assert.ok(r.board.every((v) => [null, 0, 1].includes(v)));
      else assert.ok(Object.values(r.health).every((v) => v >= 0 && v <= r.settings.health));
    }
    assert.equal(r.phase, 'over', `${game}/${i}: ${actions}`); assert.ok(r.result.winners.length); r.dispose(); rounds++;
  }
  assert.equal(rounds, 92);
});
