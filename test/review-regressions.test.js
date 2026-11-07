// Regressionen aus der Codeprüfung: Kartenvorrat, Namen, Pflichtwürfe und Poker-Wertung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { i18nContext } from './i18n-harness.js';
import { Room as MauMau } from '../games/maumau/room.js';
import { Room as SkipBo } from '../games/stapelrennen/room.js';
import { Room as Schocken } from '../games/schocken/room.js';
import { Room as Poker } from '../games/poker/room.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { GAMES } from '../games/index.js';

const seat = (r, count) => Array.from({ length: count }, (_, i) => {
  const p = r.addPlayer('Spieler' + i, null);
  r.sit(p.id, i);
  return p.id;
});
const seq = (...rolls) => () => { assert.ok(rolls.length, 'unerwarteter weiterer Würfelwurf'); return rolls.shift(); };

for (const [label, Room, key, maxPlayers, min, max, capacity, reserved] of [
  ['Mau-Mau', MauMau, 'handSize', 8, 3, 10, (n) => n > 5 ? 64 : 32, () => 1],
  ['Skip-Bo', SkipBo, 'stockSize', 6, 5, 30, () => 162, (n) => n * 5],
]) {
  test(`${label}: alle Spielerzahlen und Kartenzahlen starten vollständig oder werden ohne Zustandsänderung abgelehnt`, () => {
    for (let n = 2; n <= maxPlayers; n++) {
      for (let size = min; size <= max; size++) {
        const r = new Room('CARDS', { [key]: size }, () => {});
        const ids = seat(r, n);
        const enough = n * size + reserved(n) <= capacity(n);
        if (!enough) {
          const before = JSON.stringify({ snapshot: r.snapshot(), log: r.log, order: r.order, result: r.result });
          assert.throws(() => r.start(ids[0]), /höchstens.*Karten/, `${n} Spieler, ${size} Karten`);
          assert.equal(r.phase, 'lobby');
          assert.equal(r.currentId, null);
          assert.equal(JSON.stringify({ snapshot: r.snapshot(), log: r.log, order: r.order, result: r.result }), before);
          // Der Host kann die Einstellung korrigieren und denselben Raum direkt starten.
          r.updateSettings(ids[0], { [key]: Room === MauMau ? 5 : 20 });
          r.start(ids[0]);
          assert.equal(r.phase, 'playing');
          continue;
        }
        r.start(ids[0]);
        assert.equal(r.phase, 'playing');
        if (Room === MauMau) {
          assert.ok(ids.every((id) => r.hands[id].length === size));
          assert.equal(typeof r.discard[0], 'string');
          assert.equal(r.deck.length + r.discard.length + Object.values(r.hands).flat().length, capacity(n));
        } else {
          assert.ok(ids.every((id) => r.stock[id].length === size));
          // Jeder bekommt beim ersten Zug eine vollständige Hand, auch am erlaubten Maximum.
          for (const id of ids) {
            assert.equal(r.currentId, id);
            assert.equal(r.hand[id].length, 5);
            r.throwAway(id, 0, 0);
          }
          assert.equal(r.deck.length + Object.values(r.stock).flat().length + Object.values(r.hand).flat().length + Object.values(r.piles).flat(2).length, 162);
        }
      }
    }
  });
}

test('Abgelehnter Neustart erhält das Ergebnis und den Verlauf der letzten Runde', () => {
  const r = new MauMau('RESTART', {}, () => {});
  const ids = seat(r, 4);
  r.start(ids[0]);
  r.finishRound([ids[1]], 'Spieler1 gewinnt');
  r.updateSettings(ids[0], { handSize: 10 });
  const before = JSON.stringify({ snapshot: r.snapshot(), result: r.result, log: r.log, hands: r.hands });
  assert.throws(() => r.start(ids[0]), /höchstens 7 Karten/);
  assert.equal(r.phase, 'over');
  assert.equal(JSON.stringify({ snapshot: r.snapshot(), result: r.result, log: r.log, hands: r.hands }), before);
});

test('Skip-Bo: leerer Nachziehstapel erlaubt Weitergeben, Handkarten müssen weiterhin abgelegt werden', () => {
  const r = new SkipBo('EMPTY', {}, () => {});
  const [a, b] = seat(r, 2);
  r.start(a);
  assert.throws(() => r.pass(a), /Handkarte ablegen/);
  r.hand[a] = []; r.deck = []; r.used = [1];
  assert.throws(() => r.pass(a), /Handkarte ablegen/, 'fertige Baureihen müssen erst nachgezogen werden');
  r.used = []; r.stock[a] = [2]; r.stock[b] = [1];
  assert.equal(r.view(a).g.canPass, true);
  assert.equal(r.view(b).g.canPass, false);
  assert.throws(() => r.pass(b), /nicht dran/);
  GAMES.stapelrennen.events.pass(r, r.players.get(a));
  assert.equal(r.currentId, b);
  r.play(b, { kind: 'stock' }, 0);
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.result.winners, [b]);
});

test('Skip-Bo: wenn niemand mehr ziehen oder legen kann, endet die Runde ohne Sieger', () => {
  const r = new SkipBo('BLOCKED', {}, () => {});
  const [a, b] = seat(r, 2);
  r.start(a);
  r.hand[a] = []; r.deck = []; r.used = [];
  r.stock[a] = [2]; r.stock[b] = [3];
  r.pass(a);
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.result.winners, []);
  assert.deepEqual(r.result.points, {});
  assert.match(r.result.text, /unentschieden/);
});

test('Bestenliste: constructor und __proto__ funktionieren beim Rundenende und nach dem Laden', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lb-regression-'));
  const lb = createLeaderboard(dir, { now: () => new Date(2026, 9, 25) });
  const beforeName = Object.getOwnPropertyDescriptor(Object.prototype, 'name');
  const r = new MauMau('NAMES', {}, (kind, data) => { if (kind === 'result') lb.record('maumau', data.entries); });
  const ids = ['constructor', '__proto__'].map((name) => { const p = r.addPlayer(name, null); r.sit(p.id); return p.id; });
  r.start(ids[0]);
  r.hands[ids[0]] = ['Kh']; r.hands[ids[1]] = ['Ac']; r.discard = ['9h'];
  r.play(ids[0], 'Kh');
  assert.equal(r.phase, 'over');
  assert.deepEqual(lb.table('maumau'), [
    { name: 'constructor', played: 1, wins: 1, points: 0 },
    { name: '__proto__', played: 1, wins: 0, points: 11 },
  ]);
  lb.save();
  const again = createLeaderboard(dir, { now: () => new Date(2026, 9, 25) });
  again.record('maumau', [{ name: 'Constructor', win: false, points: 7 }, { name: '__proto__', win: true, points: 0 }]);
  const expected = [
    { name: 'Constructor', played: 2, wins: 1, points: 7 },
    { name: '__proto__', played: 2, wins: 1, points: 11 },
  ];
  assert.deepEqual(again.table('maumau', '2026-10'), expected);
  again.save();
  assert.deepEqual(createLeaderboard(dir).table('maumau'), expected);
  assert.deepEqual(Object.getOwnPropertyDescriptor(Object.prototype, 'name'), beforeName);
});

test('Schocken: nach Sechsen-Drehen muss die zweite Sechs neu geworfen werden, auch wenn man sie halten will', () => {
  const r = new Schocken('SIX', { sixToOne: true }, () => {});
  const [a, b] = seat(r, 2);
  r.start(a);
  r.roll = seq(6, 6, 1, 4, 3);
  r.throwDice(a);
  r.turnSixes(a);
  assert.throws(() => r.stop(a), /erneut würfeln/);
  assert.equal(r.currentId, a);
  assert.equal(r.throws[a], 1);
  assert.equal(r.done.has(a), false);
  assert.equal(r.view(a).g.reroll[a], 1);
  r.throwDice(a, [0, 1, 2]); // versucht, auch die zweite Sechs festzuhalten
  assert.deepEqual(r.dice[a], [1, 4, 1]);
  assert.equal(r.throws[a], 2);
  assert.equal(r.view(a).g.reroll[a], undefined);
  r.throwDice(a, [1]); // die gedrehte Eins bleibt auch bei späteren Würfen liegen
  assert.deepEqual(r.dice[a], [1, 4, 3]);
  assert.equal(r.currentId, b);
  assert.ok(r.done.has(a));
});

test('Schocken: nach dem Pflichtwurf darf man vor dem dritten Wurf aufhören', () => {
  const r = new Schocken('STOP', { sixToOne: true }, () => {});
  const [a, b] = seat(r, 2);
  r.start(a);
  r.roll = seq(6, 6, 3, 2);
  r.throwDice(a); r.turnSixes(a); r.throwDice(a, [2]); r.stop(a);
  assert.equal(r.currentId, b);
  assert.equal(r.maxThrows, 2);
});

test('Schocken-Oberfläche: Fertig erst nach dem Pflichtwurf, feste Würfel sind nicht umschaltbar', () => {
  let def;
  runInNewContext(readFileSync(new URL('../public/games/schocken/schocken.js', import.meta.url), 'utf8'), i18nContext({
    kitGame: (d) => { def = d; return { render() {} }; },
    esc: String, uiText: String, WorldKit: { t: (de) => de, chip: () => '', head: () => '' }, // Spielwelt-Kopf ist für diese Prüfung ohne Belang
    dieHTML: (_d, { attrs = '' }) => `<button ${attrs}></button>`,
  }));
  const r = new Schocken('UI', { sixToOne: true }, () => {});
  const [a] = seat(r, 2);
  r.start(a);
  r.roll = seq(6, 6, 1, 4, 2);
  r.throwDice(a); r.turnSixes(a);
  let state = r.view(a);
  def.onState(state);
  assert.match(def.dock(state, true), /data-g="stop"[^>]*disabled/);
  assert.match(def.main(state), /data-i="0"[^>]*aria-pressed="true"[^>]*disabled/);
  assert.match(def.main(state), /data-i="1"[^>]*aria-pressed="false"[^>]*disabled/);
  r.throwDice(a);
  state = r.view(a); def.onState(state);
  assert.doesNotMatch(def.dock(state, true), /data-g="stop"[^>]*disabled/);
});

test('Poker: beim letzten Fold entfernter Spieler behält seinen Verlust in der Bestenliste', (t) => {
  const results = [];
  const r = new Poker('KICK', { autoNext: false, turnTime: 0 }, (kind, data) => { if (kind === 'result') results.push(data.entries); });
  t.after(() => r.dispose());
  const ids = seat(r, 2);
  r.start(ids[0]);
  const removed = r.playerAt(r.table.hand.toAct);
  r.remove(removed.id);
  assert.equal(r.players.has(removed.id), false);
  assert.equal(r.table.seats[removed.seat], null);
  r.afterChange(); r.afterChange();
  assert.equal(results.length, 1, 'jede Hand genau einmal zählen');
  assert.deepEqual(results[0], [
    { name: 'Spieler0', win: false, points: -50 },
    { name: 'Spieler1', win: true, points: 50 },
  ]);
});

test('Poker: Side Pots und nicht gecallte Einsätze ergeben dieselben Nettopunkte wie die Chips', (t) => {
  const results = [];
  const r = new Poker('POTS', { autoNext: false, turnTime: 0 }, (kind, data) => { if (kind === 'result') results.push(data.entries); });
  t.after(() => r.dispose());
  const ids = seat(r, 3);
  const before = [1000, 2000, 3000];
  before.forEach((stack, i) => { r.table.seats[i].stack = stack; });
  r.start(ids[0]);
  for (const id of ids) r.act(id, { type: 'allin' });
  assert.equal(results.length, 1);
  assert.equal(r.table.hand.result.pots.length, 2);
  assert.deepEqual(results[0].map((e) => e.points), before.map((stack, i) => r.table.seats[i].stack - stack));
  assert.equal(results[0].reduce((sum, e) => sum + e.points, 0), 0);
});
