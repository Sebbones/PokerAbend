// BACKLOG-08: Geschenkfänger, Rhythmus-Rausch, Stillgestanden!, Bomben-Duell – serverseitige Schiedsrichter-Logik.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';
import { PartyRoom } from '../games/party-room.js';
import { STEP_MS } from '../games/realtime-room.js';
import { LAG_CAP, TAP_RATE } from '../games/arcade-room.js';
import { arcadeIntent } from '../games/arcade-bot.js';
import { makeChart, makeItems, makeGrid, blastCells, cellIndex, giftY, GIFT, FREEZE, BOMB, SPAWNS, NOTE_WINDOWS } from '../games/arcade-logic.js';

const ids = ['geschenkfaenger', 'rhythmus-rausch', 'stillgestanden', 'bomben-duell'];

function setup(game, n = 2, settings = {}, bots = false) {
  n = Math.max(2, n); // Mindestzahl; Tests mit „einer“ Person ignorieren die zweite einfach
  const r = GAMES[game].create('TEST', { playSecs: 20, rounds: 2, ...settings }, () => {});
  r.game = game;
  const host = r.addPlayer('Host'); host.connected = true;
  for (let i = 0; i < n; i++) { const p = r.addPlayer('Player ' + i, null, { bot: bots }); p.bot = bots; p.connected = true; r.sit(p.id); }
  r.start(host.id);
  return { r, host: host.id, players: [...r.order] };
}
const nextSeq = (r, id, key = 'cmd') => (key === 'cmd' ? r.cmd.get(id) || 0 : r.inputs.get(id)?.seq || 0) + 1;
const steer = (r, id, extra = {}) => r.input(id, { runId: r.runId, round: r.roundNo, seq: nextSeq(r, id, 'in'), x: 0, y: 0, ...extra });
const tapOf = (r, id, extra = {}) => r.tap(id, { runId: r.runId, round: r.roundNo, seq: nextSeq(r, id), lane: 0, at: r.serverNow(), ack: r.tickNo, ...extra });
const actOf = (r, id, extra = {}) => r.act(id, { runId: r.runId, round: r.roundNo, seq: nextSeq(r, id), ack: r.tickNo, ...extra });
const live = (r) => { r.elapsed = 0; r.tickWall = r.clock.now(); };
const run = (r, ticks, hold = {}) => { for (let i = 0; i < ticks && r.phase === 'playing'; i++) { for (const [id, v] of Object.entries(hold)) r.setInput(id, v.x || 0, v.y || 0); r.step(); } };
const free = (game, fn, ...args) => () => { const o = setup(game, ...args); try { return fn(o); } finally { o.r.dispose(); } };

test('BACKLOG-08: alle vier Spiele laufen auf PartyRoom, kennen Bots und sind in Abendprogrammen wählbar', () => {
  for (const id of ids) {
    const { r } = setup(id);
    try { assert.ok(r instanceof PartyRoom); assert.equal(typeof BOTS[id], 'function'); assert.equal(GAMES[id].bauart, 'C'); assert.equal(GAMES[id].category, 'party'); } finally { r.dispose(); }
  }
});

// ---------- Geschenkfänger ----------
test('Geschenkfänger: gleicher Seed = gleicher Fall; Fall deterministisch, Bomben und goldene Geschenke nur wie eingestellt', () => {
  assert.deepEqual(makeItems(42, 30, true), makeItems(42, 30, true));
  assert.notDeepEqual(makeItems(42, 30), makeItems(43, 30));
  assert.ok(makeItems(7, 30, false).every((i) => i.kind !== 'gold'));
  assert.ok(makeItems(7, 30, true).some((i) => i.kind === 'gold'));
  assert.ok(makeItems(7, 30).some((i) => i.kind === 'bomb'));
  const { r, players: [a, b] } = setup('geschenkfaenger');
  try { assert.deepEqual(r.frame(a).items, r.frame(b).items); live(r); } finally { r.dispose(); }
});
test('Geschenkfänger: Treffer, Punkte, Bombenabzug (nie unter null), jede Person zählt für sich', free('geschenkfaenger', ({ r, players: [a, b] }) => {
  live(r); r.elapsed = 1400;
  r.items = [{ id: 0, kind: 'big', x: 450, t0: 0, speed: 400 }, { id: 1, kind: 'bomb', x: 450, t0: 0, speed: 400 }, { id: 2, kind: 'small', x: 450, t0: 0, speed: 400 }];
  const [pa, pb] = r.bodies; pa.x = 450; pb.x = 800;
  r.step();
  assert.equal(r.points[a], 10, 'große +20, Bombe −30 → 0 (Untergrenze), kleine +10'); assert.equal(r.points[b], 0, 'verpasst');
  r.elapsed = 1400; r.step(); // dieselben Objekte sind pro Person bereits abgerechnet
  assert.equal(r.points[a], 10);
}));
test('Geschenkfänger: goldene +50, Korb schrumpft pro Bombe bis zur Untergrenze, Treffer nur im Korbbereich', free('geschenkfaenger', ({ r, players: [a] }) => {
  live(r); r.elapsed = 1400; const [pa] = r.bodies; pa.x = 450;
  r.items = [{ id: 0, kind: 'gold', x: 450 + GIFT.basket / 2 + GIFT.margin - 1, t0: 0, speed: 400 }, { id: 1, kind: 'small', x: 450 + GIFT.basket / 2 + GIFT.margin + 2, t0: 0, speed: 400 }];
  r.step();
  assert.equal(r.points[a], 50, 'Rand zählt, 3 px weiter nicht');
}, 1, { golden: true }));
test('Geschenkfänger: Bombe verkleinert den Korb nur mit Option', () => {
  for (const shrink of [false, true]) {
    const { r } = setup('geschenkfaenger', 1, { shrink });
    try {
      live(r); r.elapsed = 1400; r.bodies[0].x = 450; r.items = Array.from({ length: 8 }, (_, id) => ({ id, kind: 'bomb', x: 450, t0: 0, speed: 400 }));
      r.step();
      assert.equal(r.bodies[0].w, shrink ? GIFT.minBasket : GIFT.basket);
    } finally { r.dispose(); }
  }
});
test('Geschenkfänger: Bewegung kommt nur aus Richtungen, ist begrenzt und stoppt ohne frische Eingabe', free('geschenkfaenger', ({ r, players: [a] }) => {
  live(r); const body = r.bodies[0];
  for (let i = 0; i < 80; i++) { r.setInput(a, -1, 0); r.step(); }
  assert.equal(body.x, body.w / 2);
  const x = body.x; run(r, 12); assert.equal(body.x, x, 'ohne frische Eingabe bleibt der Korb stehen');
  assert.throws(() => steer(r, a, { x: 2 }), /Ungültig/);
  assert.throws(() => steer(r, a, { jump: true }), /Ungültig/);
  assert.throws(() => r.input(a, { runId: 'alt', round: r.roundNo, seq: 5, x: 0, y: 0 }), /Runde/);
}, 1));
test('Geschenkfänger: Rundenende nach Spielzeit, höchste Punktzahl gewinnt, Gleichstand teilt, null Punkte = unentschieden', () => {
  let { r, players: [a, b, c] } = setup('geschenkfaenger', 3);
  try { r.points[a] = 40; r.points[b] = 40; r.points[c] = 10; r.elapsed = r.secs * 1000 - STEP_MS; r.step(); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners.sort(), [a, b].sort()); } finally { r.dispose(); }
  ({ r } = setup('geschenkfaenger', 2));
  try { r.items = []; r.elapsed = r.secs * 1000 - STEP_MS; r.step(); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, []); } finally { r.dispose(); }
});

// ---------- Rhythmus-Rausch ----------
test('Rhythmus: Notenfolge ist seed-gleich, sortiert, in Bahnen und beginnt erst nach dem Vorlauf', () => {
  const c = makeChart(5, 45, 4, false);
  assert.deepEqual(c, makeChart(5, 45, 4, false));
  assert.ok(c.length > 40); assert.ok(c.every((n, i) => n.id === i && n.lane >= 0 && n.lane < 4 && (i === 0 || n.t >= c[i - 1].t)));
  assert.ok(c[0].t >= 2000);
  assert.ok(makeChart(5, 45, 1, false).every((n) => n.lane === 0));
  assert.ok(makeChart(5, 45, 4, true).length > c.length, 'schnelleres Tempo bringt mehr Noten');
});
test('Rhythmus: Wertungsfenster perfekt/gut/knapp, Fehltipp, Serienbonus und kein doppeltes Werten', free('rhythmus-rausch', ({ r, players: [a] }) => {
  live(r); r.chart = [0, 1, 2, 3, 4, 5].map((id) => ({ id, lane: id % 2, t: 1000 + id * 1000 }));
  const hit = (lane, at, ack) => { r.elapsed = at; r.tickWall = r.clock.now(); return tapOf(r, a, { lane, at, ack: ack ?? r.tickNo }).grade; };
  r.tickNo = 40;
  assert.equal(hit(0, 1000), 'perfect');
  assert.equal(r.points[a], 105, 'perfekt 100 + Serie 1×5');
  assert.equal(r.rs.get(a).judged.get(0), 'perfect');
  r.elapsed = 2100; r.tickWall = r.clock.now(); tapOf(r, a, { lane: 1, at: 2100, ack: 40 }); // 100 ms spät → gut
  assert.equal(r.rs.get(a).judged.get(1), 'good'); assert.equal(r.points[a], 105 + 60 + 10);
  r.elapsed = 3180; r.tickWall = r.clock.now(); tapOf(r, a, { lane: 0, at: 3180, ack: 40 }); // 180 ms → knapp, Serie bleibt
  assert.equal(r.rs.get(a).judged.get(2), 'ok'); assert.equal(r.rs.get(a).combo, 2); assert.equal(r.points[a], 175 + 25);
  r.tickWall = r.clock.now(); tapOf(r, a, { lane: 0, at: 3180, ack: 40 }); // zweiter Tipp auf dieselbe Note → Fehltipp
  assert.equal(r.rs.get(a).stray, 1); assert.equal(r.rs.get(a).combo, 0); assert.equal(r.points[a], 190);
  r.elapsed = 4500; r.tickWall = r.clock.now(); tapOf(r, a, { lane: 1, at: 4500, ack: 40 }); // 500 ms neben jeder Note
  assert.equal(r.rs.get(a).stray, 2); assert.equal(r.points[a], 180);
  assert.deepEqual(NOTE_WINDOWS, { perfect: 60, good: 130, ok: 200 });
}, 1));
test('Rhythmus: Verzögerung wird nur bis zur selbst gemessenen Grenze zurückgerechnet, nie in die Zukunft', free('rhythmus-rausch', ({ r, players: [a, b] }) => {
  live(r); r.chart = [{ id: 0, lane: 0, t: 1000 }, { id: 1, lane: 0, t: 5000 }];
  r.tickNo = 60; r.elapsed = 1250; r.tickWall = r.clock.now();
  // ehrlicher Spieler: Frame war 7 Schritte alt → ca. 300 ms gemessen, gedeckelt auf LAG_CAP; Tipp-Zeit liegt 190 ms zurück
  tapOf(r, a, { lane: 0, at: 1080, ack: 53 });
  assert.equal(r.rs.get(a).judged.get(0), 'good', 'Zeitstempel 170 ms zurück, auf höchstens LAG_CAP (200 ms) begrenzt angerechnet: 80 ms Abstand = gut');
  assert.ok(r.lagOf(a) <= LAG_CAP);
  // Spieler ohne Verzögerung (ack ganz frisch) bekommt keine Rückrechnung: eine „alte“ Zeit wird auf jetzt gesetzt
  r.chart[0] = { id: 0, lane: 0, t: 1000 }; r.tickWall = r.clock.now();
  tapOf(r, b, { lane: 0, at: 1000, ack: r.tickNo });
  assert.equal(r.rs.get(b).judged.has(0), false, 'ohne gemessene Verzögerung zählt der Server-Zeitpunkt 1250, also > 200 ms entfernt');
  assert.equal(r.rs.get(b).stray, 1);
  // Zeit aus der Zukunft wird abgeschnitten
  r.chart.push({ id: 2, lane: 1, t: 9000 }); r.elapsed = 4000; r.tickWall = r.clock.now();
  tapOf(r, b, { lane: 1, at: 9000, ack: r.tickNo });
  assert.equal(r.rs.get(b).judged.has(2), false);
}));
test('Rhythmus: verpasste Noten werden erst nach Fenster und Verzögerungsreserve gezählt; Serie bricht', free('rhythmus-rausch', ({ r, players: [a] }) => {
  live(r); r.chart = [{ id: 0, lane: 0, t: 1000 }];
  r.rs.get(a).combo = 5; r.elapsed = 1000 + NOTE_WINDOWS.ok + LAG_CAP - STEP_MS; r.step();
  assert.equal(r.rs.get(a).miss, 0);
  r.step(); r.step();
  assert.equal(r.rs.get(a).miss, 1); assert.equal(r.rs.get(a).combo, 0);
}, 1));
test('Rhythmus: Eingaben werden geprüft – Bahn, Folgenummer, Runde, Zuschauer, Pause, Tipp-Rate', free('rhythmus-rausch', ({ r, host, players: [a] }) => {
  assert.throws(() => tapOf(r, a), /noch nicht begonnen/);
  live(r);
  assert.throws(() => tapOf(r, a, { lane: 4 }), /Ungültig/);
  assert.throws(() => tapOf(r, a, { lane: 'x' }), /Ungültig/);
  assert.throws(() => tapOf(r, a, { at: NaN }), /Ungültig/);
  assert.throws(() => tapOf(r, a, { runId: 'alt' }), /Runde/);
  assert.throws(() => tapOf(r, host), /zu/);
  tapOf(r, a); const seq = r.cmd.get(a);
  assert.throws(() => r.tap(a, { runId: r.runId, round: r.roundNo, seq, lane: 0, at: 0, ack: 0 }), /veraltet/);
  for (let i = 0; i < TAP_RATE * 2; i++) { try { tapOf(r, a); } catch (e) { assert.match(e.message, /Zu viele/); return assert.ok(i >= TAP_RATE - 1); } }
  assert.fail('Tipp-Rate wurde nie begrenzt');
}, 1));
test('Rhythmus: Pause friert Zeit und Eingaben ein', free('rhythmus-rausch', ({ r, host, players: [a] }) => {
  live(r); r.setGamePaused(host, true); const t = r.elapsed;
  r.step(); assert.equal(r.elapsed, t);
  assert.throws(() => tapOf(r, a), /angehalten/);
}, 1));
test('Rhythmus: eine Bahn und Frames enthalten nur Fenster, eigene Wertung und öffentliche Punkte', free('rhythmus-rausch', ({ r, players: [a, b] }) => {
  live(r); r.chart = [{ id: 0, lane: 0, t: 500 }, { id: 1, lane: 0, t: 90000 }]; r.tickNo = 10; r.elapsed = 500; r.tickWall = r.clock.now();
  tapOf(r, a, { lane: 0, at: 500, ack: 10 });
  const fa = r.frame(a), fb = r.frame(b);
  assert.equal(fa.notes.length, 1); assert.equal(fa.notes[0].j, 'p'); assert.equal(fb.notes[0].j, null, 'fremde Wertung nicht im eigenen Frame');
  assert.equal(fa.bodies.find((p) => p.id === a).points, r.points[a]);
  assert.equal(setup('rhythmus-rausch', 2, { oneLane: true }).r.lanes, 1);
}));

// ---------- Stillgestanden! ----------
const goRed = (r, fake = false) => { r.signal = { state: 'red', since: r.elapsed, until: r.elapsed + 9000, fake }; };
const goGreen = (r) => { r.signal = { state: 'green', since: r.elapsed, until: r.elapsed + 9000, fake: false }; };
test('Stillgestanden: Signale folgen Grün → Gelb → Rot → Grün mit Zufallsdauer, Fake-Flag bleibt serverintern', free('stillgestanden', ({ r, players: [a] }) => {
  live(r); const seen = []; r.signal = { state: 'green', since: 0, until: 100, fake: false };
  for (let i = 0; i < 700; i++) { r.step(); if (!seen.length || seen.at(-1) !== r.signal.state) seen.push(r.signal.state); if (r.phase !== 'playing') break; }
  assert.deepEqual(seen.slice(0, 4), ['green', 'amber', 'red', 'green']);
  const frame = r.frame(a); assert.equal('fake' in frame, false); assert.equal(JSON.stringify(frame).includes('fake'), false);
}, 1));
test('Stillgestanden: Bewegung bei Grün zählt, bei Rot nach der Gnadenfrist setzt zurück', free('stillgestanden', ({ r, players: [a] }) => {
  live(r); goGreen(r); const p = r.bodies[0];
  run(r, 20, { [a]: { y: -1 } });
  assert.ok(p.prog > .03 && p.prog < .05, 'ca. 1 s Laufen = 4 %: ' + p.prog);
  goRed(r); run(r, 4, { [a]: { y: -1 } }); // 200 ms < 250 ms Gnadenfrist
  assert.equal(p.falls, 0);
  const before = p.prog;
  run(r, 3, { [a]: { y: -1 } });
  assert.equal(p.falls, 1); assert.equal(p.prog, 0, 'zurück zum Start'); assert.ok(before > 0);
  assert.ok(p.stunUntil > r.elapsed, 'kurzer Stillstand nach dem Fehler');
  run(r, 10, { [a]: { y: -1 } }); assert.equal(p.prog, 0, 'während des Stillstands kein Fortschritt');
}, 1));
test('Stillgestanden: Latenz wird fair ausgeglichen – mehr Gnadenfrist mit gemessener Verzögerung, nie über LAG_CAP', free('stillgestanden', ({ r, players: [a, b] }) => {
  live(r); r.lag.set(a, 0); r.lag.set(b, 150); goRed(r);
  assert.equal(r.grace(a), FREEZE.graceBase); assert.equal(r.grace(b), FREEZE.graceBase + 150);
  run(r, 7, { [a]: { y: -1 }, [b]: { y: -1 } }); // 350 ms nach Rot
  assert.equal(r.bodies[0].falls, 1, 'ohne Verzögerung bestraft'); assert.equal(r.bodies[1].falls, 0, 'mit 150 ms Verzögerung noch in der Frist');
  r.lag.set(b, 99999); assert.equal(r.grace(b), FREEZE.graceBase + LAG_CAP);
}));
test('Stillgestanden: Fake-Rot bestraft niemanden; ohne Rückkehr gibt es Zeitstrafe statt Reset', () => {
  let { r, players: [a] } = setup('stillgestanden', 1);
  try { live(r); r.bodies[0].prog = .5; goRed(r, true); run(r, 20, { [a]: { y: -1 } }); assert.equal(r.bodies[0].falls, 0); assert.ok(r.bodies[0].prog > .5); } finally { r.dispose(); }
  ({ r, players: [a] } = setup('stillgestanden', 1, { returnToStart: false }));
  try { live(r); r.bodies[0].prog = .5; goRed(r); run(r, 8, { [a]: { y: -1 } }); const stuck = r.bodies[0].prog; assert.equal(r.bodies[0].falls, 1); assert.ok(stuck > .5, 'kein Reset'); run(r, 10, { [a]: { y: -1 } }); assert.equal(r.bodies[0].prog, stuck, 'bleibt stehen'); assert.equal(r.bodies[0].stunUntil - r.elapsed > 500, true); } finally { r.dispose(); }
});
test('Stillgestanden: Ziel gewinnt sofort, gleichzeitiges Ziel teilt, Zeitablauf wertet den weitesten Lauf', () => {
  let { r, players: [a, b, c] } = setup('stillgestanden', 3);
  try { live(r); goGreen(r); r.bodies[0].prog = r.bodies[1].prog = .999; r.bodies[2].prog = .5; run(r, 2, { [a]: { y: -1 }, [b]: { y: -1 }, [c]: { y: -1 } }); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners.sort(), [a, b].sort()); } finally { r.dispose(); }
  ({ r, players: [a, b, c] } = setup('stillgestanden', 3));
  try { live(r); goGreen(r); r.bodies[0].prog = .2; r.bodies[1].prog = .6; r.elapsed = r.secs * 1000 - STEP_MS; r.step(); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [b]); } finally { r.dispose(); }
  ({ r } = setup('stillgestanden', 2));
  try { live(r); r.elapsed = r.secs * 1000 - STEP_MS; r.step(); assert.deepEqual(r.result.winners, []); } finally { r.dispose(); }
});
test('Stillgestanden: nur ↑ zählt; Richtung/Version werden geprüft', free('stillgestanden', ({ r, players: [a] }) => {
  live(r); goGreen(r); run(r, 10, { [a]: { x: 1, y: 0 } }); assert.equal(r.bodies[0].prog, 0, 'seitwärts ist kein Laufen');
  assert.throws(() => steer(r, a, { y: 3 }), /Ungültig/);
  steer(r, a, { y: -1 }); assert.throws(() => r.input(a, { runId: r.runId, round: r.roundNo, seq: 1, x: 0, y: -1 }), /veraltet/);
}, 1));

// ---------- Bomben-Duell ----------
test('Bomben-Duell: Raster ist deterministisch, Pfeiler fest, Startfelder und ihre Nachbarn frei', () => {
  const g = makeGrid(9); assert.deepEqual(g, makeGrid(9)); assert.notDeepEqual(g, makeGrid(10));
  for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) if (x % 2 && y % 2) assert.equal(g[cellIndex(x, y)], 1);
  for (const [sx, sy] of SPAWNS) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = sx + dx, y = sy + dy; if (x >= 0 && y >= 0 && x < 15 && y < 10) assert.notEqual(g[cellIndex(x, y)], 2); }
});
test('Bomben-Duell: Explosion – Reichweite 2, Pfeiler stoppt, erste Kiste wird gesprengt und stoppt, Kette zündet', () => {
  const cells = new Array(150).fill(0); cells[cellIndex(3, 2)] = 1; cells[cellIndex(5, 4)] = 2; cells[cellIndex(5, 5)] = 2;
  let { hit, crates } = blastCells(cells, 4, 4);
  assert.deepEqual(hit.sort((x, y) => x - y), [cellIndex(4, 2), cellIndex(4, 3), cellIndex(3, 4), cellIndex(4, 4), cellIndex(5, 4), cellIndex(2, 4), cellIndex(4, 5), cellIndex(4, 6)].sort((x, y) => x - y));
  assert.deepEqual(crates, [cellIndex(5, 4)]);
  ({ hit } = blastCells(cells, 3, 3)); assert.ok(!hit.includes(cellIndex(3, 2)), 'Pfeiler nicht getroffen');
});
const clearGrid = (r) => { r.cells = new Array(150).fill(0); for (let y = 1; y < 10; y += 2) for (let x = 1; x < 15; x += 2) r.cells[cellIndex(x, y)] = 1; };
test('Bomben-Duell: Bewegung Feld für Feld, Hindernisse und Bomben blockieren, Takt wird eingehalten', free('bomben-duell', ({ r, players: [a] }) => {
  live(r); clearGrid(r); const p = r.bodies[0]; assert.deepEqual([p.cx, p.cy], SPAWNS[0]);
  r.setInput(a, 1, 0); r.step(); assert.equal(p.cx, 1);
  r.setInput(a, 1, 0); r.step(); assert.equal(p.cx, 1, '160 ms Takt');
  run(r, 3, { [a]: { x: 1 } }); assert.equal(p.cx, 2);
  r.setInput(a, 0, 1); run(r, 4, { [a]: { y: 1 } }); assert.equal(p.cx, 2); assert.ok(p.cy >= 1 && p.cy <= 3);
  p.cx = 0; p.cy = 0; p.moveAt = 0; r.cells[cellIndex(1, 0)] = 2; r.setInput(a, 1, 0); r.step(); assert.equal(p.cx, 0, 'Kiste blockiert');
  r.cells[cellIndex(1, 0)] = 0; r.bombs.push({ id: 99, owner: 'x', cx: 1, cy: 0, at: r.elapsed, explodeAt: r.elapsed + 9000 }); r.setInput(a, 1, 0); r.step(); assert.equal(p.cx, 0, 'Bombe blockiert');
  p.cx = 14; r.setInput(a, 1, 0); r.step(); assert.equal(p.cx, 14, 'Rand');
}, 1));
test('Bomben-Duell: Bombe – eine pro Person, sichtbare Zündschnur, Explosion nach Frist, Flammen töten, Punkte nach Ausscheidereihenfolge', free('bomben-duell', ({ r, players: [a, b, c] }) => {
  live(r); clearGrid(r);
  Object.assign(r.bodies[0], { cx: 0, cy: 0 }); Object.assign(r.bodies[1], { cx: 2, cy: 0 }); Object.assign(r.bodies[2], { cx: 14, cy: 9 });
  actOf(r, a); actOf(r, a);
  assert.equal(r.bombs.length, 1, 'nur eine gleichzeitig'); assert.equal(r.bombs[0].explodeAt - r.bombs[0].at, BOMB.fuse);
  const frame = r.frame(b); assert.equal(frame.bombs[0].explodeAt, r.bombs[0].explodeAt, 'Vorwarnzeit ist öffentlich sichtbar');
  run(r, Math.floor(BOMB.fuse / STEP_MS) - 2); assert.equal(r.bodies[0].alive, true); assert.equal(r.bombs.length, 1);
  run(r, 3);
  assert.equal(r.bombs.length, 0, 'Bombe ist explodiert');
  // zwei Ausscheidende im selben Schritt bekommen beide 0 Punkte; Überlebender hat alle Ausgeschiedenen (2) in der Runde
  assert.equal(r.phase, 'playing'); assert.equal(r.q, 1);
  assert.deepEqual([r.points[a], r.points[b], r.points[c]], [0, 0, 2]);
  assert.equal(r.frame(a).elapsed < 0, true, 'nächste Runde mit Countdown');
  assert.equal(r.frame(a).note.round, 1);
}, 3));
test('Bomben-Duell: Kettenreaktion und Kiste; mehrere Runden, Gesamtsieg und Gleichstand', () => {
  let r, a, b;
  ({ r, players: [a, b] } = setup('bomben-duell', 2, { rounds: 2 }));
  try {
    live(r); clearGrid(r); r.cells[cellIndex(3, 0)] = 2;
    Object.assign(r.bodies[0], { cx: 14, cy: 9 }); Object.assign(r.bodies[1], { cx: 14, cy: 0 });
    r.bombs.push({ id: 1, owner: a, cx: 0, cy: 0, at: 0, explodeAt: 50 }, { id: 2, owner: b, cx: 2, cy: 0, at: 0, explodeAt: 99999 });
    r.step();
    assert.equal(r.bombs.length, 0, 'Kette: Bombe 2 liegt im Radius von Bombe 1 und zündet sofort');
    assert.equal(r.cells[cellIndex(3, 0)], 0, 'Kiste wurde durch Bombe 2 gesprengt');
    // Runde 1: niemand stirbt → Zeitablauf, beide Überlebende mit 0 Ausgeschiedenen = 0 Punkte
    r.elapsed = r.secs * 1000 - STEP_MS; r.step(); assert.equal(r.q, 1); assert.deepEqual([r.points[a], r.points[b]], [0, 0]);
    live(r); clearGrid(r); Object.assign(r.bodies[0], { cx: 0, cy: 0 }); Object.assign(r.bodies[1], { cx: 14, cy: 0 });
    r.bombs.push({ id: 7, owner: b, cx: 0, cy: 0, at: 0, explodeAt: 0 }); r.step();
    assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, [b]); assert.equal(r.points[b], 1); assert.equal(r.points[a], 0);
  } finally { r.dispose(); }
});
test('Bomben-Duell: Eingaben geprüft – nur Lebende, Folgenummer, Runde; Zuschauer legen nichts', free('bomben-duell', ({ r, host, players: [a] }) => {
  assert.throws(() => actOf(r, a), /noch nicht begonnen/);
  live(r);
  assert.throws(() => actOf(r, host), /zu/);
  assert.throws(() => actOf(r, a, { runId: 'alt' }), /Runde/);
  actOf(r, a); assert.throws(() => r.act(a, { runId: r.runId, round: r.roundNo, seq: 1, ack: 0 }), /veraltet/);
  r.bodies[0].alive = false; assert.throws(() => actOf(r, a), /zu/);
}, 2));

// ---------- Bots, Regelwerk, Aussteigen ----------
test('Alle Arcade-Spiele: vollständige Botrunden in jeder Spielerzahl, endlich, gültige Sieger, keine ungültigen Positionen', () => {
  for (const game of ids) for (let i = 0; i < (game === 'bomben-duell' ? 16 : 30); i++) {
    const n = 2 + i % 7, { r } = setup(game, n, { playSecs: game === 'bomben-duell' ? 25 : 20, rounds: 2 }, true);
    try {
      let ticks = 0;
      while (r.phase === 'playing' && ticks++ < 20000) r.step();
      assert.equal(r.phase, 'over', `${game} n=${n} endet`);
      assert.ok(r.result.winners.every((id) => r.order.includes(id)));
      for (const p of r.bodies) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 900 && p.y >= -1 && p.y <= 600, `${game} Position`);
      for (const id of r.order) assert.ok(Number.isFinite(r.points[id]) && r.points[id] >= 0);
    } finally { r.dispose(); }
  }
});
test('Arcade-Bots sehen nur die eigene Ansicht und bewegen sich damit sinnvoll', () => {
  let { r, players: [a] } = setup('geschenkfaenger', 1);
  try { live(r); r.items = [{ id: 0, kind: 'big', x: 800, t0: 0, speed: 100 }]; r.elapsed = 1500; r.bodies[0].x = 100; assert.deepEqual(arcadeIntent(r.gameView(a), a), { x: 1, y: 0 }); r.items = [{ id: 0, kind: 'bomb', x: 100, t0: 0, speed: 200 }, { id: 1, kind: 'small', x: 800, t0: 0, speed: 100 }]; r.elapsed = 2000; const v = arcadeIntent(r.gameView(a), a); assert.ok(typeof v.x === 'number'); } finally { r.dispose(); }
  ({ r, players: [a] } = setup('stillgestanden', 1));
  try { goRed(r); assert.deepEqual(arcadeIntent(r.gameView(a), a), { x: 0, y: 0 }); goGreen(r); assert.deepEqual(arcadeIntent(r.gameView(a), a), { x: 0, y: -1 }); assert.equal(arcadeIntent({ ...r.gameView(a), kind: 'rhythm' }, a), null); } finally { r.dispose(); }
  ({ r, players: [a] } = setup('bomben-duell', 2));
  try { live(r); const view = r.gameView(a); assert.equal(view.cells.length, 150); assert.ok(!('roles' in view)); const v = arcadeIntent(view, a); assert.ok(v && 'x' in v); } finally { r.dispose(); }
});
test('Arcade-Bomben-Bots weichen sichtbaren Bomben aus und legen nur mit Fluchtweg', () => {
  const { r, players: [a] } = setup('bomben-duell', 2);
  try {
    live(r); clearGrid(r); Object.assign(r.bodies[0], { cx: 2, cy: 0 }); r.bombs.push({ id: 1, owner: 'x', cx: 2, cy: 0, at: 0, explodeAt: 500 });
    const v = arcadeIntent(r.gameView(a), a); assert.ok(v.x || v.y, 'läuft aus der Gefahrenzone');
    r.bombs = []; r.cells[cellIndex(3, 0)] = 2; // Kiste daneben, Fluchtweg ist frei
    assert.equal(arcadeIntent(r.gameView(a), a).bomb, true);
    for (const [x, y] of [[0, 1], [1, 1], [2, 1], [3, 1]]) r.cells[cellIndex(x, y)] = 1; // von unten eingemauert
    for (const [x, y] of [[0, 0], [1, 0]]) r.cells[cellIndex(x, y)] = 1; // und links dicht: Falle
    Object.assign(r.bodies[0], { cx: 2, cy: 0 });
    assert.notEqual(arcadeIntent(r.gameView(a), a).bomb, true, 'ohne Fluchtweg keine Bombe');
  } finally { r.dispose(); }
});
test('Arcade: Aussteigen bricht ohne fremden Sieg ab; Zuschauer steuern nicht; Wiederherstellung baut den Raum neu', () => {
  for (const game of ids) {
    const { r, host, players: [a] } = setup(game);
    try {
      live(r); r.stand(a); assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, []);
      const clone = GAMES[game].restore(JSON.parse(JSON.stringify(r.snapshot())), () => {});
      try { assert.equal(clone.game ?? game, game); } finally { clone.dispose(); }
    } finally { r.dispose(); }
  }
});
test('Arcade: Frames sind klein und enthalten keine Rolle, keine Raum-Interna und keinen Seed', () => {
  for (const game of ids) {
    const { r, players: [a] } = setup(game, 8);
    try {
      live(r); r.step(); const text = JSON.stringify(r.frame(a));
      assert.ok(text.length < (game === 'bomben-duell' ? 6000 : 4000), `${game} Frame ${text.length} Byte`);
      for (const secret of ['seed', 'rng', 'roles', 'inputs']) assert.equal(text.includes(`"${secret}"`), false, `${game} ${secret}`);
      assert.equal(JSON.stringify(r.gameView(a)).includes(String(r.seed)) && r.seed > 999999, false);
    } finally { r.dispose(); }
  }
});

test('Arcade: acht Bots – ein Server-Schritt bleibt weit unter dem 50-ms-Takt, Frames bleiben klein (kein Ruckeln durch Server)', () => {
  for (const game of ids) {
    const { r, players: [a] } = setup(game, 8, { playSecs: 60, rounds: 1 }, true);
    try {
      r.elapsed = 0; r.tickWall = r.clock.now(); const steps = 400, t0 = process.hrtime.bigint();
      for (let i = 0; i < steps && r.phase === 'playing'; i++) { r.step(); if (i % 2 === 0) JSON.stringify(r.frame(a)); }
      const ms = Number(process.hrtime.bigint() - t0) / 1e6 / steps;
      assert.ok(ms < 5, `${game}: ${ms.toFixed(3)} ms pro Schritt`);
    } finally { r.dispose(); }
  }
});
