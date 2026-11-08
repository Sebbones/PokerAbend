import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAMES } from '../games/index.js';
import { parseNumber, scoreGuesses } from '../games/schaetzmeister/room.js';

const CATALOG = JSON.parse(readFileSync(new URL('../games/schaetzmeister/fragen.json', import.meta.url), 'utf8'));

test('Katalog: mindestens 100 Fragen, jede mit Zahl, Einheit und Quelle, keine doppelten', () => {
  assert.ok(CATALOG.length >= 100, `${CATALOG.length} Fragen`);
  assert.equal(new Set(CATALOG.map((c) => c.id)).size, CATALOG.length, 'IDs eindeutig');
  assert.equal(new Set(CATALOG.map((c) => c.q)).size, CATALOG.length, 'Fragen eindeutig');
  for (const c of CATALOG) {
    assert.ok(typeof c.q === 'string' && c.q.endsWith('?') && c.q.length > 10, c.id);
    assert.ok(Number.isFinite(c.a) && Math.abs(c.a) < 1e15, `${c.id}: Antwort`);
    assert.ok(typeof c.unit === 'string' && c.unit.length, `${c.id}: Einheit`);
    assert.ok(typeof c.src === 'string' && c.src.length >= 3, `${c.id}: Quelle`);
    assert.equal(parseNumber(c.a), c.a, `${c.id}: Antwort lässt sich eintippen`);
  }
});

test('Zahlen lesen: Komma, Tausenderpunkte, Minus, Müll', () => {
  const ok = { '206': 206, ' 3,5 ': 3.5, '3.5': 3.5, '1.234': 1234, '1.234,5': 1234.5, '12.345.678': 12345678, '-273,15': -273.15, '−5': -5, '+7': 7, '0,001': 0.001, '42.195': 42195, '9,81': 9.81, '1 000': 1000 };
  for (const [text, n] of Object.entries(ok)) assert.equal(parseNumber(text), n, text);
  for (const bad of ['', ' ', 'abc', '1e5', '--1', '1,2,3', '1.2.3', ',', '.', '12 Knochen', '9'.repeat(31), '1000000000000000000', undefined, NaN, Infinity]) assert.equal(parseNumber(bad), null, String(bad));
  assert.equal(parseNumber(3.14159), 3.142);
});

test('Punkte: 3, 2, 1, genau richtig +2, Gleichstand = gleiche Punkte, danach der nächste Abstand', () => {
  const g = (list) => list.map(([id, value]) => ({ id, value }));
  let s = scoreGuesses(g([['a', 95], ['b', 120], ['c', 70], ['d', 10]]), 100);
  assert.deepEqual(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.pts])), { a: 3, b: 2, c: 1, d: 0 });
  s = scoreGuesses(g([['a', 90], ['b', 110], ['c', 80]]), 100); // a und b gleich weit weg
  assert.deepEqual([s.a.pts, s.b.pts, s.c.pts], [3, 3, 2]);
  s = scoreGuesses(g([['a', 100], ['b', 101]]), 100);
  assert.deepEqual([s.a.pts, s.a.exact, s.b.pts], [5, true, 2]);
  s = scoreGuesses(g([['a', 100], ['b', 100]]), 100);
  assert.deepEqual([s.a.pts, s.b.pts], [5, 5]);
  s = scoreGuesses(g([['a', 7.1], ['b', 7.2]]), 7.15); // Kommazahlen: gleich weit weg trotz Gleitkomma
  assert.deepEqual([s.a.pts, s.b.pts], [3, 3]);
  assert.deepEqual(scoreGuesses([], 5), {});
});

test('Hausregel Prozent: bis 5 % 3, bis 15 % 2, bis 30 % 1 Punkt – unabhängig von den anderen', () => {
  const g = (list) => list.map(([id, value]) => ({ id, value }));
  const s = scoreGuesses(g([['a', 1040000], ['b', 1100000], ['c', 1250000], ['d', 2000000], ['e', 1000000]]), 1000000, true);
  assert.deepEqual(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.pts])), { a: 3, b: 2, c: 1, d: 0, e: 5 });
  // Antwort 0: jede Abweichung ist „unendlich“ viel
  const z = scoreGuesses(g([['a', 0], ['b', 1]]), 0, true);
  assert.deepEqual([z.a.pts, z.b.pts], [5, 0]);
});

test('Partie: Frage, Schätzen, Auflösung mit Abstand und Punkten, gespeicherte Abendpunkte', () => {
  const r = GAMES.schaetzmeister.create('SCHAE', { rounds: 2 }, () => {});
  const [a, b, c] = ['Anna', 'Ben', 'Cara'].map((n) => { const p = r.addPlayer(n, null); p.connected = true; r.sit(p.id); return p.id; });
  r.setCustom(a, 'Wie viele Punkte hat das Spiel? | 100 | Punkte\nWie viele sind es noch? | 8');
  r.start(a);
  const first = r.cur;
  assert.match(r.view(b).g.question, /Wie viele/);
  assert.equal(r.view(b).g.of, 2);
  r.guess(a, '105'); r.guess(b, '100'); r.guess(c, '30');
  const R = r.view(c).g.reveal;
  assert.equal(R.answer, first.a);
  const expected = scoreGuesses([{ id: a, value: 105 }, { id: b, value: 100 }, { id: c, value: 30 }], first.a);
  for (const id of [a, b, c]) assert.equal(r.gamePts[id], expected[id].pts, 'Punkte dieser Frage');
  assert.deepEqual(R.guesses.map((x) => x.id), [a, b, c].sort((x, y) => Math.abs({ [a]: 105, [b]: 100, [c]: 30 }[x] - first.a) - Math.abs({ [a]: 105, [b]: 100, [c]: 30 }[y] - first.a)), 'nach Abstand sortiert');
  assert.ok(R.src && R.unit !== undefined);
  // Schätzung ändern ist bis zum Ende der Stufe erlaubt
  r.next(a); // weiter zur zweiten Frage
  r.guess(a, '1'); r.guess(a, '2');
  assert.equal(r.view(a).g.mine, 2);
  r.guess(b, '3'); r.guess(c, '4');
  r.next(a);
  assert.equal(r.phase, 'over');
  assert.equal(Object.values(r.scores).reduce((x, y) => x + y, 0), Object.values(r.gamePts).reduce((x, y) => x + y, 0));
  r.dispose();
});

test('Katalog wiederholt keine Frage, bis alle einmal dran waren', () => {
  const r = GAMES.schaetzmeister.create('WIEDER', { rounds: 30 }, () => {});
  const ids = ['Anna', 'Ben'].map((n) => { const p = r.addPlayer(n, null); r.sit(p.id); return p.id; });
  const seen = new Set();
  for (let game = 0; game < 4; game++) { // 4 × 30 = 120 Fragen: noch keine Wiederholung
    r.start(ids[0]);
    for (const c of r.picks) { assert.ok(!seen.has(c.id), `${c.id} doppelt`); seen.add(c.id); }
    r.phase = 'over'; r.stage = null;
  }
  r.dispose();
});

test('Lobby-Feld und Optionen: Runden, Zeit, Punkte-Ziel, Zuschauer, Prozent-Regel', () => {
  const keys = GAMES.schaetzmeister.options.map((o) => o.key);
  assert.deepEqual(keys, ['rounds', 'writeSecs', 'target', 'spectators', 'percent', 'modifierRule', 'chaosMode', 'modifierScope']);
  const r = GAMES.schaetzmeister.create('OPT', {}, () => {});
  assert.deepEqual(r.settings, { rounds: 10, writeSecs: 30, target: 0, spectators: false, percent: false, modifierRule: 'off', chaosMode: false, modifierScope: 'session' });
  r.settings = r.clampSettings({ rounds: 999, writeSecs: 1, target: -5, spectators: 1 }, r.settings);
  assert.deepEqual([r.settings.rounds, r.settings.writeSecs, r.settings.target, r.settings.spectators], [10, 30, 0, true], 'Werte außerhalb der Grenzen werden ignoriert');
  assert.equal(GAMES.schaetzmeister.category, 'party');
  r.dispose();
});
