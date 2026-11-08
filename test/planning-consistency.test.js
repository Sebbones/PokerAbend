// V2-10: Abgleich aller Planungsdateien. Nichts darf sich widersprechen:
//   games/planned.js (Backlog) · games/roadmap.js (öffentliche Roadmap im Hub) · docs/roadmap (V2-Pakete) · docs/backlog · docs/design · README · CHANGELOG · package.json
// Die Regeln sind absichtlich in beide Richtungen formuliert (erledigt ⇔ gebaut), damit ein vergessener Haken auf der einen Seite auffällt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { GAMES, PLANNED, SINGLEPLAYER_GAMES, gameList, singleplayerGameList } from '../games/index.js';
import { resolvedRoadmap, whatsNew } from '../games/roadmap.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const pkg = json('package.json'), lock = json('package-lock.json');
const plan = json('docs/roadmap/plan.json'), backlog = json('docs/backlog/plan.json'), visual = json('docs/design/game-visual-roadmap.json');
const sections = resolvedRoadmap();
const points = sections.flatMap((s) => s.punkte.map((p) => ({ ...p, section: s })));
const registered = (id) => Object.hasOwn(GAMES, id) || Object.hasOwn(SINGLEPLAYER_GAMES, id);

test('Version: package.json, package-lock.json, CHANGELOG, README und Betriebsanleitung nennen dieselbe Version', () => {
  assert.match(pkg.version, /^[0-9]+[.][0-9]+[.][0-9]+$/);
  assert.equal(lock.version, pkg.version); assert.equal(lock.packages[''].version, pkg.version);
  const top = /^## ([0-9]+[.][0-9]+[.][0-9]+) – ([0-9]{1,2}[.] [A-Za-zä]+ [0-9]{4})/m.exec(read('CHANGELOG.md'));
  assert.ok(top, 'CHANGELOG.md hat keinen Eintrag mit Version und Datum');
  assert.equal(top[1], pkg.version, 'neuester CHANGELOG-Eintrag = Version in package.json');
  assert.match(read('README.md'), new RegExp(`jetzt \\*\\*${pkg.version.replaceAll('.', '[.]')}\\*\\*`), 'README nennt die aktuelle Version');
  assert.match(read('docs/betrieb.md'), new RegExp(`Version \\*\\*${pkg.version.replaceAll('.', '[.]')}\\*\\*`), 'docs/betrieb.md nennt die aktuelle Version');
  const versions = [...read('CHANGELOG.md').matchAll(/^## ([0-9]+[.][0-9]+[.][0-9]+) /gm)].map((m) => m[1].split('.').map(Number));
  for (let i = 1; i < versions.length; i++) assert.ok(versions[i - 1] > versions[i] || versions[i - 1].join() > versions[i].join(), 'CHANGELOG: neueste Version zuerst');
});

test('Spielezahlen: README, CHANGELOG und Katalog nennen dieselben Zahlen', () => {
  const online = gameList().length, solo = singleplayerGameList().length;
  const readme = /Spielesammlung mit ([0-9]+) Spielen: ([0-9]+) Online-\/Partyspiele/.exec(read('README.md'));
  assert.ok(readme, 'README: Zeile „Spielesammlung mit N Spielen: M Online-/Partyspiele“ fehlt');
  assert.equal(Number(readme[1]), online + solo, 'README: Gesamtzahl der Spiele'); assert.equal(Number(readme[2]), online, 'README: Zahl der Online-/Partyspiele');
  const log = /[Aa]us [0-9]+ Spielen sind \*\*([0-9]+)\*\* geworden/.exec(read('CHANGELOG.md'));
  assert.equal(Number(log?.[1]), online + solo, 'CHANGELOG: Gesamtzahl der Spiele');
});

test('Backlog (planned.js): nichts, was schon gebaut ist, steht noch als geplant; IDs eindeutig; Status gültig', () => {
  const ids = PLANNED.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'doppelte IDs in planned.js');
  assert.deepEqual(PLANNED.filter((p) => p.type !== 'feature' && registered(p.id)).map((p) => p.id), [], 'geplantes Spiel ist schon registriert – aus planned.js entfernen');
  for (const p of PLANNED) { assert.ok(['next', 'planned'].includes(p.status), `${p.id}: Status ${p.status}`); assert.ok(p.name && (p.description || p.beschreibung), `${p.id}: Name/Beschreibung`); }
});

test('Backlog (docs/backlog/plan.json): erledigt ⇔ gebaut, Zähler stimmen, alle Pakete haben Commit und Nachweis', () => {
  assert.equal(backlog.games.length, backlog.total_count);
  const done = backlog.games.filter((g) => ['done', 'verified'].includes(g.status));
  assert.equal(backlog.completed_count, done.length); assert.equal(backlog.remaining_count, backlog.total_count - done.length);
  for (const g of backlog.games) {
    assert.equal(registered(g.id), ['done', 'verified'].includes(g.status), `${g.id}: Status ${g.status}, registriert: ${registered(g.id)}`);
    if (['done', 'verified'].includes(g.status)) assert.match(g.implementation_commit, /^[0-9a-f]{7,40}$/, g.id);
    else assert.ok(PLANNED.some((p) => p.id === g.id), `${g.id}: offenes Backlog-Spiel fehlt in planned.js`);
  }
  for (const p of backlog.packages) assert.ok(['planned', 'in_progress', 'done', 'verified'].includes(p.status), `${p.id}: ${p.status}`);
  assert.deepEqual(backlog.packages.filter((p) => ['done', 'verified'].includes(p.status) && !/^[0-9a-f]{7,40}$/.test(p.implementation_commit || '')).map((p) => p.id), [], 'erledigte Pakete ohne Commit');
});

test('Visuelle Planung (docs/design): jedes registrierte Spiel hat genau ein VIS-Paket, erledigt ⇔ Spiel vorhanden, IDs stabil und lückenlos', () => {
  const ids = visual.packages.map((p) => p.game_id);
  assert.equal(new Set(ids).size, ids.length, 'ein Spiel hat zwei VIS-Pakete');
  assert.deepEqual([...Object.keys(GAMES), ...Object.keys(SINGLEPLAYER_GAMES)].filter((id) => !ids.includes(id)), [], 'Spiel ohne VIS-Paket');
  assert.deepEqual(ids.filter((id) => !registered(id)), [], 'VIS-Paket für ein Spiel, das es nicht gibt');
  const nums = visual.packages.map((p) => Number(/^VIS-([0-9]+)$/.exec(p.id)?.[1])).sort((a, b) => a - b);
  assert.ok(nums.every((n, i) => i === 0 || n > nums[i - 1]), 'VIS-IDs doppelt'); assert.ok(nums.every(Number.isFinite), 'VIS-ID ohne Nummer');
  for (const p of visual.packages) if (p.visual_status === 'done') assert.ok(p.implementation_commit, `${p.id}: erledigt ohne Commit`);
  assert.deepEqual(visual.packages.filter((p) => p.visual_status !== 'done' && !['planned', 'in_progress'].includes(p.visual_status)).map((p) => p.id), [], 'unbekannter visual_status');
  const md = read('docs/design/GAME_VISUAL_ROADMAP.md');
  for (const p of visual.packages) assert.ok(md.includes(p.id), `${p.id} fehlt in GAME_VISUAL_ROADMAP.md`);
});

test('V2-Pakete (docs/roadmap/plan.json) ⇔ öffentliche Roadmap im Hub: ein Punkt ist erledigt, wenn alle Pakete, die ihn umsetzen, fertig sind – und nur dann', () => {
  const byId = new Map(points.map((p) => [p.id, p]));
  const doneTasks = new Map();
  for (const t of plan.tasks) for (const id of t.public_roadmap_ids) doneTasks.set(id, [...(doneTasks.get(id) || []), t]);
  assert.ok(doneTasks.size >= 18);
  for (const [id, tasks] of doneTasks) {
    const point = byId.get(id);
    assert.ok(point, `Roadmap-Punkt ${id} (${tasks.map((t) => t.id)}) fehlt im Hub`);
    const finished = tasks.every((t) => t.status === 'done');
    assert.equal(!!point.erledigt, finished, `${id}: Pakete ${tasks.map((t) => `${t.id}=${t.status}`).join(', ')}, Hub sagt erledigt=${!!point.erledigt}`);
    if (finished) {
      const dates = tasks.map((t) => t.completed_at).sort(), datum = point.datum || point.section.datum;
      assert.match(datum || '', /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, `${id}: Datum`);
      if (['v2-', 'discord-'].some((prefix) => id.startsWith(prefix))) assert.ok(datum >= dates[0] && datum <= dates.at(-1), `${id}: Datum ${datum} passt nicht zu den Paketen (${dates.join(', ')})`);
    }
  }
  for (const t of plan.tasks) {
    assert.ok(['planned', 'done'].includes(t.status), `${t.id}: Status ${t.status}`);
    if (t.status === 'done') { assert.match(t.implementation_commit, /^[0-9a-f]{7,40}$/); assert.match(t.completed_at, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/); assert.ok(t.test_results.length, `${t.id}: Testergebnisse`); }
  }
});

test('Hub-Roadmap: IDs eindeutig, erledigte Etappen vollständig mit Datum, Spiele erledigt ⇔ gebaut, „Was ist neu“ stimmt', () => {
  const all = points.map((p) => p.id);
  assert.equal(new Set(all).size, all.length, 'doppelte Roadmap-Punkte: ' + all.filter((id, i) => all.indexOf(id) !== i).join(', '));
  assert.ok(sections.filter((s) => s.stufe === 'jetzt').length <= 1, 'höchstens eine Etappe „jetzt“');
  for (const s of sections) {
    if (s.stufe === 'erledigt') { assert.match(s.datum, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, `${s.id}: Datum`); assert.ok(s.punkte.every((p) => p.erledigt), `${s.id}: erledigte Etappe mit offenem Punkt`); }
    else if (s.stufe === 'jetzt') assert.ok(s.punkte.some((p) => !p.erledigt), `${s.id}: „jetzt“ ohne offenen Punkt`);
  }
  for (const p of points.filter((x) => x.art === 'spiel')) {
    assert.equal(!!p.erledigt, registered(p.id), `${p.id} (${p.section.id}): erledigt=${!!p.erledigt}, gebaut=${registered(p.id)}`);
    assert.equal(PLANNED.some((x) => x.id === p.id), !registered(p.id), `${p.id}: planned.js und Registrierung widersprechen sich`);
  }
  const news = whatsNew(8);
  assert.equal(news.length, 8); assert.ok(news.every((e, i) => i === 0 || news[i - 1].datum >= e.datum), 'Was ist neu: neueste zuerst');
  assert.ok(news[0].datum <= new Date().toISOString().slice(0, 10), 'kein Datum in der Zukunft');
});

test('Dokumentation verweist nur auf vorhandene Dateien (docs/roadmap, docs/design, docs/backlog, CHANGELOG, Betriebsanleitung)', () => {
  const files = ['README.md', 'CHANGELOG.md', 'docs/betrieb.md', 'docs/roadmap/README.md', 'docs/design/GAME_VISUAL_ROADMAP.md'];
  const missing = [];
  for (const file of files) {
    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
    for (const m of read(file).matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('mailto:')) continue;
      const parts = (dir + target).split('/'); const stack = [];
      for (const part of parts) { if (part === '..') stack.pop(); else if (part && part !== '.') stack.push(part); }
      if (!existsSync(new URL('../' + stack.join('/'), import.meta.url))) missing.push(`${file} → ${target}`);
    }
  }
  assert.deepEqual(missing, [], 'tote Verweise');
});

test('Skripte aus der Betriebsanleitung existieren, sind ausführbar benannt und stehen im Kopf des README/der Anleitung', () => {
  const betrieb = read('docs/betrieb.md');
  for (const script of ['scripts/backup.sh', 'scripts/restore-test.sh', 'scripts/release-check.sh']) { assert.ok(existsSync(new URL('../' + script, import.meta.url)), script); assert.ok(betrieb.includes(script), `${script} fehlt in docs/betrieb.md`); }
  assert.ok(readdirSync(new URL('../scripts/', import.meta.url)).includes('release-check.sh'));
});

test('.env.example, Compose und Anleitung kennen dieselben Einstellungen: jede Variable aus der Anleitung ist in der Beispiel-Datei und im Compose (oder bewusst nicht)', () => {
  const example = read('.env.example'), compose = read('docker-compose.yml'), betrieb = read('docs/betrieb.md');
  const inExample = new Set([...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]{2,})=/gm)].map((m) => m[1]));
  const inCompose = new Set([...compose.matchAll(/^\s+([A-Z][A-Z0-9_]{2,}):/gm)].map((m) => m[1]));
  const documented = [...betrieb.matchAll(/^\| `([A-Z][A-Z0-9_]{2,})` \|/gm)].map((m) => m[1]);
  // Fest eingestellte und reine Test-/Skript-Variablen stehen in der Anleitung, aber nicht in der .env.example
  const FIXED = new Set(['PORT', 'DATA_DIR', 'TRUST_PROXY', 'NODE_ENV', 'APP_COMMIT']);
  const operator = documented.filter((name) => !FIXED.has(name));
  assert.ok(operator.length >= 20, `zu wenige Variablen in der Anleitung gefunden (${operator.length})`);
  assert.deepEqual(operator.filter((name) => !inExample.has(name)), [], 'in docs/betrieb.md, aber nicht in .env.example');
  const passedThrough = operator.filter((name) => !['DOMAIN', 'IMAGE'].includes(name));
  assert.deepEqual(passedThrough.filter((name) => !inCompose.has(name)), [], 'in docs/betrieb.md, aber nicht an den Container durchgereicht (docker-compose.yml)');
  // und umgekehrt: nichts, was der Server liest, fehlt in der Anleitung
  const server = ['server', 'games'].flatMap((dir) => readdirSync(new URL(`../${dir}/`, import.meta.url), { recursive: true }).filter((f) => String(f).endsWith('.js')).map((f) => read(`${dir}/${f}`))).join('\n');
  const used = new Set([...server.matchAll(/(?:process\.env|\benv)\.([A-Z][A-Z0-9_]{2,})/g)].map((m) => m[1]));
  const TESTING = new Set(['POKER_NO_DOTENV', 'DISCORD_API_BASE', 'DISCORD_AUTHORIZE_URL', 'DISCORD_RECHECK_MIN', 'DISCORD_RATE_MAX', 'CLASSIC_CAPTURE_EVIDENCE', 'BACKLOG05_CAPTURE', 'CARDS_CAPTURE']);
  assert.deepEqual([...used].filter((name) => !TESTING.has(name) && !betrieb.includes('`' + name + '`')), [], 'vom Server gelesene Variable fehlt in docs/betrieb.md');
  for (const name of TESTING) assert.ok(!operator.includes(name), `${name} gehört nicht in die Betriebsliste`);
});
