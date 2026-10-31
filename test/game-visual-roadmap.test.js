import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PLAYABLE_GAMES as GAMES, PLANNED } from '../games/index.js';
import { resolvedRoadmap } from '../games/roadmap.js';
import { i18nContext } from './i18n-harness.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const plan = JSON.parse(read('docs/design/game-visual-roadmap.json'));
const packages = plan.packages, byId = new Map(packages.map((p) => [p.id, p]));
const byGame = new Map(packages.map((p) => [p.game_id, p]));
const backlog = PLANNED.filter((p) => p.type !== 'feature');

test('Visual roadmap: every registered and unimplemented game has exactly one independent package', () => {
  assert.equal(plan.schema_version, 1);
  assert.equal(byId.size, packages.length); assert.equal(byGame.size, packages.length);
  assert.deepEqual(packages.filter((p) => p.implementation_status === 'playable').map((p) => p.game_id).sort(), Object.keys(GAMES).sort());
  assert.deepEqual(packages.filter((p) => p.implementation_status === 'not_implemented').map((p) => p.game_id).sort(), backlog.map((p) => p.id).sort());
  assert.equal(plan.inventory.playable_count, Object.keys(GAMES).length);
  assert.equal(plan.inventory.not_implemented_count, backlog.length);
  assert.equal(plan.inventory.total_visual_packages, packages.length);
  for (const p of packages) {
    assert.match(p.id, /^VIS-\d{3,}$/); assert.equal(p.implementation_authorized_now, false);
    assert.equal(p.game_name, (GAMES[p.game_id] || backlog.find((g) => g.id === p.game_id)).name);
  }
  assert.equal(byGame.get('scotland-yard').id, 'VIS-001');
  assert.equal(byGame.get('schiffe').id, 'VIS-013');
  assert.deepEqual(byGame.get('farbenchaos').existing_variants, GAMES.farbenchaos.variants.map((v) => v.id));
});

test('Visual roadmap: individual concepts and real frontend files are complete, including Omaha alias and shared renderers', () => {
  const fields = ['current_design','planned_style','background_concept','board_concept','objects_concept','status_and_actions','mobile_concept','assessment_method'];
  for (const p of packages) {
    for (const field of fields) assert.ok(typeof p[field] === 'string' && p[field].length > 15, `${p.id}.${field}`);
    assert.ok(p.known_visual_weaknesses.length); assert.ok(p.technical_constraints.length >= 2); assert.ok(p.acceptance_criteria.length);
    assert.ok(p.effort.min_hours >= 0 && p.effort.max_hours >= p.effort.min_hours);
    assert.equal(p.common_acceptance_ids.length, 10);
    for (const path of [...p.current_frontend_files, ...p.shared_frontend_files]) assert.ok(existsSync(new URL(path, root)), path);
    if (p.implementation_status === 'playable') assert.ok(p.current_frontend_files.some((f) => f.endsWith('.js')) && p.current_frontend_files.some((f) => f.endsWith('.css')));
    else { assert.deepEqual(p.current_frontend_files, []); assert.equal(p.gameplay_prerequisite.requires_separate_authorization, true); }
  }
  for (const field of ['planned_style','board_concept','objects_concept','mobile_concept']) assert.equal(new Set(packages.map((p) => p[field])).size, packages.length, `${field}: no copied generic concepts`);
  assert.deepEqual(byGame.get('omaha').current_frontend_files, byGame.get('poker').current_frontend_files);
  assert.ok(byGame.get('kritzelpost').shared_frontend_files.includes('public/games/drawing-kit.js'));
  assert.ok(byGame.get('kronenjagd').shared_frontend_files.includes('public/games/realtime-kit.js'));
});

test('Visual roadmap: completion requires real evidence; planned packages contain no invented completion data', () => {
  const completed = packages.filter((p) => p.visual_status === 'done');
  assert.equal(plan.inventory.completed_visual_count, completed.length);
  assert.equal(plan.inventory.planned_visual_count, packages.length - completed.length);
  assert.equal(byGame.get('scotland-yard').visual_status, 'done');
  for (const p of packages) {
    if (p.visual_status === 'done') {
      assert.equal(p.implementation_status, 'playable'); assert.match(p.implementation_commit, /^[a-f0-9]{40}$/);
      assert.ok(p.commits.includes(p.implementation_commit)); assert.match(p.completed_at, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(p.test_results.length); assert.ok(p.screenshots.length);
      for (const path of p.screenshots) assert.ok(existsSync(new URL(path, root)), path);
    } else {
      assert.equal(p.visual_status, 'planned'); assert.equal(p.implementation_commit, null); assert.equal(p.completed_at, null);
      for (const field of ['commits','test_results','screenshots']) assert.deepEqual(p[field], [], `${p.id}.${field}`);
    }
    if (p.implementation_status === 'not_implemented') assert.equal(p.visual_status, 'planned');
  }
  for (const file of ['docs/design/scotland-yard-screenshots.json', 'docs/design/card-worlds-screenshots.json', 'docs/design/uno-ultimate-screenshots.json', 'docs/solo-games/screenshots.json', 'docs/design/card-interaction-screenshots.json']) {
    const manifest = JSON.parse(read(file));
    for (const { path, sha256 } of [...(manifest.comparisons || manifest.screenshots), ...(manifest.observations || [])]) {
      const bytes=readFileSync(new URL(path,root)),data=path.endsWith('.json')?bytes.toString('utf8').replaceAll('\r\n','\n'):bytes;
      assert.equal(createHash('sha256').update(data).digest('hex'),sha256,path);
    }
  }
});

test('Visual roadmap: development order covers all open playable packages and respects dependencies; backlog stays separate', () => {
  const open = packages.filter((p) => p.implementation_status === 'playable' && p.visual_status === 'planned');
  assert.deepEqual([...plan.suggested_development_order].sort(), open.map((p) => p.id).sort());
  assert.deepEqual([...plan.effort_order].sort(), open.map((p) => p.id).sort());
  assert.deepEqual([...plan.all_effort_order].sort(), packages.map((p) => p.id).sort());
  assert.deepEqual([...plan.future_concepts_order].sort(), packages.filter((p) => p.implementation_status === 'not_implemented').map((p) => p.id).sort());
  const available = new Set(packages.filter((p) => p.visual_status === 'done').map((p) => p.id));
  for (const id of plan.suggested_development_order) { const p = byId.get(id); assert.ok(p.depends_on.every((dep) => available.has(dep)), id); available.add(id); }
  const amounts = plan.effort_order.map((id) => byId.get(id).effort.min_hours);
  assert.deepEqual(amounts, [...amounts].sort((a, b) => a - b));
  for (const p of packages) for (const dep of p.depends_on) { assert.ok(byId.has(dep), `${p.id} -> ${dep}`); assert.notEqual(dep, p.id); }
});

test('Visual roadmap: human instructions cover every package and both agents point to the authoritative JSON', () => {
  const md = read('docs/design/GAME_VISUAL_ROADMAP.md');
  assert.equal((md.match(/^### VIS-\d+ – /gm) || []).length, packages.length);
  for (const p of packages) assert.ok(md.includes(`### ${p.id} – ${p.game_name}`), p.id);
  for (const path of ['AGENTS.md','CLAUDE.md']) assert.ok(read(path).includes('docs/design/game-visual-roadmap.json'), path);
  for (const path of plan.references) assert.ok(existsSync(new URL(path, root)), path);
});

test('Visual roadmap: one compact public section, verified visual packages and authored English metadata', () => {
  const section = resolvedRoadmap().filter((p) => p.id === 'neue-spielwelten');
  assert.equal(section.length, 1); assert.equal(section[0].stufe, 'spaeter');
  assert.equal(section[0].punkte.length, 7);
  assert.deepEqual(section[0].punkte.filter((p) => p.erledigt).map((p) => p.id), ['visual-scotland-yard', 'visual-kartenwelten']);
  for (const game of ['scotland-yard', 'farbenchaos', 'stapelrennen', 'zehnetappen']) assert.equal(byGame.get(game).visual_status, 'done');
  assert.ok(section[0].punkte.every((p) => p.art === 'design' && !p.spiel && !p.plannedId));
  const { I18n } = i18nContext({}, 'en');
  for (const text of [section[0].titel, section[0].satz, ...section[0].punkte.flatMap((p) => [p.titel, p.text])]) assert.notEqual(I18n.t(text), text, text);
});
