import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GAMES, PLANNED } from '../games/index.js';
import { resolvedRoadmap } from '../games/roadmap.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url));
const json = (path) => JSON.parse(read(path));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const ids = ['party-brett','modifikatoren','chaos-modus','survival-abend'];

test('Party feature evidence: four verified features, original 41-game denominator, real implementation commit and no dummy games', () => {
  const e = json('games/party-brett/evidence.json'), b = json('docs/backlog/plan.json');
  const pack = b.feature_packages.find((p) => p.id === 'PARTY-EXTRAS-01');
  assert.deepEqual(e.features, ids); assert.deepEqual(pack.features, ids); assert.equal(pack.status, 'verified');
  assert.equal(pack.implementation_commit, e.implementation_commit); assert.match(e.implementation_commit, /^[a-f0-9]{40}$/);
  assert.equal(b.total_count, 41); assert.equal(b.completed_count, 41); assert.equal(b.games.length, 41);
  for (const id of ids) {
    assert.equal(GAMES[id], undefined); assert.ok(!PLANNED.some((p) => p.id === id));
    const points = resolvedRoadmap().flatMap((s) => s.punkte).filter((p) => p.id === id);
    assert.equal(points.length, 1); assert.equal(points[0].art, 'funktion'); assert.equal(points[0].erledigt, true);
  }
  assert.ok(e.tests.every((t) => t.failed === 0)); assert.equal(e.bot_simulated_games, 180);
});

test('VIS-108: independent feature package, 107 game packages unchanged, original desktop/mobile images at six sizes', () => {
  const e = json('games/party-brett/evidence.json'), v = json('docs/design/game-visual-roadmap.json');
  const p = v.feature_packages.find((p) => p.id === 'VIS-108');
  assert.equal(p.visual_status, 'done'); assert.equal(p.implementation_commit, e.implementation_commit);
  assert.equal(v.packages.length, 107); assert.equal(v.inventory.playable_count, 107);
  assert.equal(new Set([...v.packages, ...v.feature_packages].map((p) => p.id)).size, v.packages.length + v.feature_packages.length);
  assert.deepEqual(p.feature_ids, ids); assert.deepEqual(p.screenshots, e.screenshots.map((s) => s.path));
  assert.equal(e.screenshots.length, 48);
  for (const s of e.screenshots) assert.equal(hash(read(s.path)), s.sha256, s.path);
  for (const project of ['desktop','mobil']) for (const feature of ['board','survival']) for (const size of ['1920x1080','1440x900','768x1024','390x844','360x800','900x450']) assert.ok(e.screenshots.some((s) => s.path.endsWith(`/${project}/${feature}-layout-${size}.png`)));
});

test('Party feature sources: current tested integration plus archived original sources, without Git or rewriting historic evidence', () => {
  const a = json('games/party-brett/source-audit.json');
  assert.match(a.baseline_commit, /^[a-f0-9]{40}$/);
  for (const s of a.current_sources) assert.equal(hash(read(s.path).toString('utf8').replaceAll('\r\n','\n')), s.sha256, s.path);
  for (const s of a.previous_shared_sources) assert.equal(hash(read(s.archive).toString('utf8').replaceAll('\r\n','\n')), s.sha256, s.archive);
  for (const path of ['server/index.js','server/party-program.js','public/index.html','public/i18n-en.js','games/index.js']) assert.ok(a.previous_shared_sources.some((s) => s.path === path));
});

test('Party verification logs: full baseline, full comparison, browser regression and honest post-translation checks are retained', () => {
  const e = json('games/party-brett/evidence.json');
  for (const log of e.logs) assert.equal(hash(read(log.path).toString('utf8').replaceAll('\r\n','\n')), log.sha256, log.path);
  const full = e.tests.find((t) => t.id === 'full-node');
  assert.equal(full.total, 1778); assert.equal(full.passed, 1772); assert.equal(full.failed, 0); assert.equal(full.skipped, 6);
  for (const [id, count] of [['post-english-node',31],['browser-regression',16],['browser-after-review',8],['browser-roadmap',2]]) assert.equal(e.tests.find((t) => t.id === id).passed, count, id);
  assert.equal(e.concurrent_changes_excluded, true);
});
