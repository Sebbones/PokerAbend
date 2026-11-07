import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ACHIEVEMENTS, achievementCatalog, achievementProgress, createAchievements } from '../server/achievements.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { GAMES } from '../games/index.js';

const games = Object.values(GAMES), progress = (rows) => achievementProgress({ name: 'Anna', games: rows }, games);
const row = (id, played = 1, wins = 0, months = ['2026-10']) => ({ id, played, wins, months });

test('Abzeichen: eindeutige Definitionen und ein leerer Start mit ehrlichem Fortschritt', () => {
  const p = progress([]); assert.equal(p.total, 21 + 3 * games.length); assert.equal(new Set(achievementCatalog(games).map(b=>b.id)).size,p.total); assert.equal(new Set(ACHIEVEMENTS.map((b) => b.id)).size, 17);
  assert.equal(p.unlocked, 0); assert.equal(p.recorded, false);
  assert.ok(p.badges.every((b) => !b.unlocked && b.progress === 0 && b.target > 0 && b.description && b.title));
});

test('Abzeichen: genaue Schwellen für Partien und Siege, Fortschritt endet am Ziel', () => {
  for (const target of [1, 10, 50, 100]) {
    const b = ACHIEVEMENTS.find((b) => b.metric === 'played' && b.target === target);
    assert.equal(progress([row('maumau', target - 1)]).badges.find((v) => v.id === b.id).unlocked, false);
    assert.equal(progress([row('maumau', target)]).badges.find((v) => v.id === b.id).unlocked, true);
    assert.equal(progress([row('maumau', target + 10)]).badges.find((v) => v.id === b.id).progress, target);
  }
  for (const target of [1, 10, 50]) {
    const b = ACHIEVEMENTS.find((b) => b.metric === 'wins' && b.target === target);
    assert.equal(progress([row('poker', 100, target - 1)]).badges.find((v) => v.id === b.id).unlocked, false);
    assert.equal(progress([row('poker', 100, target)]).badges.find((v) => v.id === b.id).unlocked, true);
  }
});

test('Entdecken: verschiedene Spiele und Kategorien statt wiederholter Partien zählen', () => {
  const p = progress([row('maumau', 100, 5), row('poker', 5, 1), row('omaha', 10, 2)]);
  assert.equal(p.stats.distinctGames, 3); assert.equal(p.stats.categories, 1); assert.equal(p.stats.winningGames, 3);
  assert.equal(p.badges.find((b) => b.id === 'allrounder').unlocked, false);
  for (const category of ['karten', 'wuerfel', 'brett', 'party']) {
    const game = games.find((g) => g.category === category);
    const result = progress([row(game.id, 1, 1)]);
    assert.equal(result.stats[category + 'Wins'], 1);
    assert.equal(result.badges.filter((b) => b.id.endsWith('-sieg') && b.metric.endsWith('Wins')).length, 4);
  }
});

test('Alle 17 Abzeichen sind über echte Katalogspiele erreichbar; Monate zählen nur einmal', () => {
  const result = progress(games.map((g) => row(g.id, 3, 2, ['2026-10', '2026-11', '2027-01', '2026-10', 'bad', '2026-13'])));
  assert.equal(result.stats.activeMonths, 3); assert.equal(result.stats.categories, 4); assert.equal(result.stats.distinctGames, games.length);
  assert.equal(result.unlocked, 17, 'The original achievements remain reachable; new ranked achievements need qualified rounds');
});

test('Statistik bleibt unverändert; ungültige oder ungespielte Werte vergeben keine Abzeichen', () => {
  const rows = [row('unknown', 1000, 999), row('maumau', 0, 1), row('poker', -1, 1), row('kniffel', NaN, 50)];
  const before = structuredClone(rows), p = progress(rows); assert.equal(p.unlocked, 0); assert.deepEqual(rows, before);
  assert.equal(progress([row('maumau', 1, 100)]).stats.wins, 1, 'Siege können gespielte Partien nicht übersteigen');
});

test('Bestandsdaten, Neustart und Namenszuordnung vergeben dieselben Abzeichen ohne zweite Datenquelle', () => {
  const dir = mkdtempSync(join(tmpdir(), 'achievements-')), lb = createLeaderboard(dir);
  lb.record('maumau', [{ name: 'Anna', win: true, points: 0 }]); lb.save();
  const service = createAchievements({ leaderboard: lb, games });
  const first = service.detail('ANNA '); assert.equal(first.name, 'Anna'); assert.equal(first.unlocked, 3);
  const cloned = lb.profile('anna'); cloned.games[0].played = 1000; cloned.games[0].months.push('2000-01');
  assert.equal(service.detail('Anna').stats.played, 1); assert.equal(service.detail('Anna').stats.activeMonths, 1);
  const restored = createAchievements({ leaderboard: createLeaderboard(dir), games }); assert.deepEqual(restored.detail('anna'), service.detail('Anna'));
  assert.equal(restored.detail('Neuer Name').unlocked, 0); assert.equal(restored.detail().unlocked, 0);
  assert.throws(() => service.detail({ name: 'Anna' }), { status: 400 }); assert.throws(() => service.detail('x'.repeat(17)), { status: 400 });
});

test('Namensvorschläge sind begrenzt, ohne Token oder interne Kennungen; Sondernamen sind sicher', () => {
  const lb = createLeaderboard(mkdtempSync(join(tmpdir(), 'achievement-names-')));
  lb.record('poker', ['__proto__', 'constructor', ...Array.from({ length: 30 }, (_, i) => 'Gast ' + i)].map((name) => ({ name, win: true, points: 10 })));
  const service = createAchievements({ leaderboard: lb, games });
  assert.equal(service.players().length, 20); assert.deepEqual(service.players('constructor'), ['constructor']);
  assert.equal(service.detail('__proto__').stats.wins, 1); assert.equal(service.detail('constructor').unlocked, 3);
  assert.ok(!JSON.stringify(service.detail('constructor')).includes('token'));
});
