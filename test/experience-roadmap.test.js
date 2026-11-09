// Erlebnis-Roadmap (EXP): vollständig, eindeutig, an VIS-Nummern gekoppelt und aus der Markdown-Quelle aktuell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('EXP-Roadmap deckt jedes VIS-Paket und jeden Party-Modus genau einmal ab', () => {
  const exp = json('docs/design/game-experience-roadmap.json'), vis = json('docs/design/game-visual-roadmap.json');
  const ids = exp.packages.map((p) => p.game_id);
  assert.equal(new Set(ids).size, ids.length, 'doppelte Spiele');
  for (const p of vis.packages) assert.ok(ids.includes(p.game_id), 'fehlt: ' + p.game_id);
  for (const mode of ['party-brett', 'modifikatoren', 'chaos-modus', 'survival-abend']) {
    assert.ok(existsSync(`games/${mode}/index.js`)); assert.ok(ids.includes(mode), 'fehlt: ' + mode);
  }
  const games = readdirSync('games').filter((d) => existsSync(`games/${d}/index.js`) && !['bot-strategies', 'singleplayer'].includes(d));
  for (const g of games) assert.ok(ids.includes(g), 'Spiel ohne EXP-Paket: ' + g);
});

test('EXP-Nummern folgen den VIS-Nummern, jedes Paket hat Welt, Sound, Animation und Highlight', () => {
  const exp = json('docs/design/game-experience-roadmap.json');
  for (const p of exp.packages) {
    if (p.vis_id) assert.equal(p.id.slice(4), p.vis_id.slice(4), p.id);
    for (const key of ['world', 'sound', 'animation', 'highlight']) assert.ok(p[key]?.length >= 5, `${p.id} ${key}`);
    assert.match(p.priority, /^P[123]$/);
    if (p.status === 'planned') assert.equal(p.implementation_commit, null, p.id);
  }
  assert.deepEqual(exp.foundation.map((f) => f.id), ['EXP-F1', 'EXP-F2', 'EXP-F3', 'EXP-F4', 'EXP-F5', 'EXP-F6']);
});

test('game-experience-roadmap.json ist aus der Markdown-Quelle erzeugt und aktuell', () => {
  const before = readFileSync('docs/design/game-experience-roadmap.json', 'utf8');
  execFileSync(process.execPath, ['scripts/build-experience-roadmap.mjs']);
  assert.equal(readFileSync('docs/design/game-experience-roadmap.json', 'utf8'), before, 'node scripts/build-experience-roadmap.mjs ausführen');
});

test('Abgeschlossene EXP-Fundamente tragen einen echten Commit und vorhandene Nachweise', () => {
  for (const p of json('docs/design/game-experience-roadmap.json').foundation.filter(p => p.status === 'done')) {
    assert.match(p.implementation_commit, /^[a-f0-9]{40}$/);
    assert.equal(execFileSync('git', ['cat-file', '-t', p.implementation_commit], { encoding: 'utf8' }).trim(), 'commit');
    assert.ok(p.evidence.length);
    for (const path of p.evidence) assert.ok(existsSync(path), path);
  }
});
