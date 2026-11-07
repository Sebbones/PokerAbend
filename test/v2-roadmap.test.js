// Dokumentations-/Metadaten-Invarianten: keine V2-Implementierung und keine Git-/Netzwerkabhängigkeit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GAMES } from '../games/index.js';
import { PLANNED } from '../games/planned.js';
import { ROADMAP, resolvedRoadmap } from '../games/roadmap.js';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plan = JSON.parse(read('docs/roadmap/plan.json'));
const inventory = JSON.parse(read('docs/roadmap/consolidation.json'));
const DONE = ['V2-00', 'V2-01', 'V2-02', 'V2-03', 'V2-04', 'V2-05', 'V2-06', 'V2-07', 'V2-11', 'V2-12', 'V2-13', 'V2-14', 'V2-15', 'V2-16', 'V2-17'];
const V2_DONE_POINTS = ['v2-erfolge-ausbauen', 'v2-online-verbessern', 'v2-bot-schwierigkeit', 'v2-audit', 'v2-backup-migration', 'v2-account-identity', 'v2-platform-integration', 'v2-admin-rueckblicke', 'v2-admin-bestenlisten', 'v2-admin-sicherheit', 'gebietskampf', 'staedtehandel', 'discord-1', 'discord-3', 'discord-4', 'v2-session-security', 'v2-liquid-glass']; // ausdrücklich freigegebene und umgesetzte Pakete

test('V2-Plan: 18 vollständige, eindeutig geplante Pakete mit gültigen Abhängigkeiten', () => {
  const ids = Array.from({ length: 18 }, (_, i) => `V2-${String(i).padStart(2, '0')}`);
  assert.deepEqual(plan.tasks.map(t => t.id), ids);
  assert.equal(plan.implementation_authorized, false);
  assert.equal(plan.documentation_only, true);
  assert.equal(plan.status, 'planned');
  assert.equal(plan.baseline.registered_games, 46, 'Historische Konsolidierungsbasis bleibt erhalten');
  assert.ok(Object.keys(GAMES).length >= plan.baseline.registered_games, 'Spätere Spiele dürfen den Katalog erweitern');
  const visited = new Set(), stack = new Set();
  const visit = (id) => {
    assert.ok(ids.includes(id), 'Unbekannte Abhängigkeit: ' + id);
    assert.ok(!stack.has(id), 'Zyklische Abhängigkeit: ' + id);
    if (visited.has(id)) return;
    stack.add(id);
    for (const dependency of plan.tasks.find(t => t.id === id).depends_on) visit(dependency);
    stack.delete(id); visited.add(id);
  };
  for (const t of plan.tasks) {
    assert.ok(t.title && t.goal && ['critical', 'high', 'medium', 'later'].includes(t.priority), t.id);
    for (const field of ['files', 'security', 'acceptance', 'public_roadmap_ids']) assert.ok(Array.isArray(t[field]) && t[field].length, `${t.id}: ${field}`);
    if (DONE.includes(t.id)) {
      // Nur ausdrücklich freigegebene und wirklich umgesetzte Pakete tragen Nachweise (V2-00, V2-01 am 01.11.2026)
      assert.equal(t.status, 'done', t.id);
      assert.match(t.implementation_commit, /^[0-9a-f]{7,40}$/, t.id);
      assert.match(t.completed_at, /^\d{4}-\d{2}-\d{2}$/, t.id);
      assert.ok(t.commits.length && t.commits.every((c) => /^[0-9a-f]{7,40}$/.test(c)), t.id);
      assert.ok(t.test_results.length && t.test_results.every((r) => r.command && r.result), t.id);
    } else {
      assert.equal(t.status, 'planned');
      assert.equal(t.implementation_commit, null);
      assert.equal(t.completed_at, null);
      assert.deepEqual(t.commits, []);
      assert.deepEqual(t.test_results, []);
    }
    visit(t.id);
  }
});

test('Alle V2-Pakete sind über echte, noch offene Besucher-Einträge mit der öffentlichen Roadmap verbunden', () => {
  const sections = resolvedRoadmap();
  const points = sections.flatMap(s => s.punkte.map(p => ({ ...p, stage: s.stufe })));
  for (const t of plan.tasks) for (const id of t.public_roadmap_ids) {
    const found = points.filter(p => p.id === id);
    assert.equal(found.length, 1, `${t.id}: ${id}`);
    // Only the explicitly authorized DONE packages may complete their linked points.
    assert.equal(!!found[0].erledigt, DONE.includes(t.id) && V2_DONE_POINTS.includes(id), id + ' darf nur durch echte Umsetzung erledigt werden');
    assert.ok(['spaeter', 'gross'].includes(found[0].stage), id);
  }
  for (const [taskId, gameId] of [['V2-11', 'gebietskampf'], ['V2-12', 'staedtehandel']]) {
    const built = DONE.includes(taskId); // V2-11 (Gebietskampf) und V2-12 (Städtehandel) sind umgesetzt
    assert.equal(PLANNED.filter(g => g.id === gameId).length, built ? 0 : 1);
    assert.equal(!!GAMES[gameId], built);
    assert.deepEqual(plan.tasks.find(t => t.id === taskId).public_roadmap_ids, [gameId]);
  }
});

test('Historische Etappen und die Reihenfolge laufender Arbeiten bleiben bei der Konsolidierung erhalten', () => {
  assert.deepEqual(ROADMAP.filter(s => inventory.existing_section_order.includes(s.id)).map(s => s.id), inventory.existing_section_order);
  assert.deepEqual(ROADMAP.filter(s => s.stufe === 'jetzt').map(s => s.id), inventory.current_work);
  for (const saved of inventory.completed_sections) {
    const current = ROADMAP.find(s => s.id === saved.id);
    assert.equal(current.stufe, 'erledigt');
    assert.equal(current.datum, saved.date);
    assert.deepEqual(current.punkte.map(p => p.id), saved.point_ids);
    assert.ok(current.punkte.every(p => p.erledigt));
  }
});

test('Alle 28 alten Party-Ideen sind erhalten; Aliasnamen erzeugen keine Duplikate', () => {
  assert.equal(inventory.legacy_party_ideas.length, 28);
  assert.equal(new Set(inventory.legacy_party_ideas.map(i => i.id)).size, 28);
  assert.equal(new Set(inventory.legacy_party_ideas.map(i => i.current_id)).size, 28);
  for (const idea of inventory.legacy_party_ideas) {
    assert.ok(idea.name && idea.description && idea.players && idea.duration && idea.subtype && idea.effort);
    const targets = [GAMES[idea.current_id], ...PLANNED.filter(p => p.id === idea.current_id)].filter(Boolean);
    assert.equal(targets.length, 1, idea.id);
  }
  assert.equal(inventory.legacy_party_ideas.find(i => i.id === 'stille-post').current_id, 'kritzelpost');
  assert.equal(inventory.legacy_party_ideas.find(i => i.id === 'gedaechtniskueche').current_id, 'gedaechtnis-kueche');
});

test('Main-Only und Paketfreigabe sind dauerhaft für beide Agenten und in der Projektdokumentation verankert', () => {
  for (const path of ['AGENTS.md', 'CLAUDE.md', 'README.md']) {
    const text = read(path);
    for (const rule of [
      'Dieses Projekt verwendet ausschließlich den Branch `main` als aktiven Entwicklungsbranch.',
      'Erstelle nicht eigenständig neue Git-Branches oder Pull Requests.',
      'Vor jedem Schreibvorgang ist der aktuelle Remote-Stand zu prüfen.',
      'Verwende niemals Force-Push, um Konflikte zu umgehen.',
      'Ohne ausdrückliche Freigabe darf kein neues Entwicklungsarbeitspaket begonnen werden.',
      'Dokumentation und Planungsdateien sind keine automatische Implementierungsfreigabe.',
    ]) assert.ok(text.includes(rule), path + ': ' + rule);
  }
  assert.deepEqual(plan.workflow, { branch: 'main', create_branches: false, create_pull_requests: false, force_push: false, remote_check_before_write: true, package_authorization_required: true, production_deployment_authorized: false });
  const human = read('docs/roadmap/POKERABEND_V2_ROADMAP.md');
  for (const t of plan.tasks) assert.ok(human.includes(`| ${t.id} |`));
  assert.ok(!human.includes('in separatem Feature-Branch implementieren'));
});

test('Archivierter V2-Masterprompt ist unverändert erhalten und ausdrücklich keine Ausführungsfreigabe', () => {
  const file = 'docs/roadmap/MASTERPROMPT_V2_SOURCE.md';
  const expected = inventory.source_files.find(s => s.path === file);
  // Git-Inhalt vergleichen; ein Windows-Checkout darf LF in CRLF umwandeln.
  assert.equal(createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex'), expected.sha256);
  assert.ok(read(file).startsWith('# Archivierte Spezifikation – kein Ausführungsauftrag!'));
  assert.ok(read('PROMPT.md').startsWith('# Historischer UI-Auftrag'));
});
