// Ein Befehl für alle Tests:  npm run test:all
//   1. alle Node-Tests mit Coverage (c8, Konfiguration in .c8rc.json)   → reports/coverage/ (HTML, Text, JSON), reports/node-tests.xml
//   2. die komplette Playwright-Suite (Desktop und Handy)                → reports/playwright-html/ (HTML-Bericht), reports/playwright.json
//   3. Zusammenfassung: bestanden / fehlgeschlagen pro Teil, Coverage in %, Berichtspfade, Dauer → reports/summary.json und reports/summary.md
// Läuft auch bei roten Teilen weiter und endet dann mit Exit-Code 1.
//
// Optionen (alle optional):
//   --only=node | --only=ui    nur einen Teil laufen lassen (z. B. für die Teile der Nacht-CI)
//   --shard=2/12               nur ein Teil der Dateien/Tests (Node: --test-shard, Playwright: --shard)
//   --no-coverage              Node-Tests ohne Coverage (schneller)
//   --reports=<Ordner>         Berichtsordner (Standard: reports)
//   -- <Argumente>             alles danach geht an Playwright (z. B. -- -g "Blackjack" --project=desktop)
//   Umgebung: PLAYWRIGHT_CHANNEL (Standard: chrome; unter Linux chromium), TEST_ALL_NODE_GLOB (Standard: test/*.test.js)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dashDash = args.indexOf('--');
const own = dashDash < 0 ? args : args.slice(0, dashDash);
const passthrough = dashDash < 0 ? [] : args.slice(dashDash + 1);
const flag = (name) => own.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name) => { const f = flag(name); return f?.includes('=') ? f.slice(f.indexOf('=') + 1) : null; };
const only = value('only');
const shard = value('shard');
const withCoverage = !flag('no-coverage');
const reports = resolve(root, value('reports') || 'reports');
const rel = (p) => relative(root, p).split(/[\\/]/).join('/');

if (only && !['node', 'ui'].includes(only)) { console.error('--only erwartet node oder ui'); process.exit(2); }
if (shard && !/^\d+\/\d+$/.test(shard)) { console.error('--shard erwartet die Form 2/12'); process.exit(2); }

const env = { ...process.env };
if (!env.PLAYWRIGHT_CHANNEL && process.platform === 'linux') env.PLAYWRIGHT_CHANNEL = 'chromium'; // auf Linux gibt es meist kein installiertes Chrome

const run = (command, argv, extraEnv = {}) => new Promise((done) => {
  const started = Date.now();
  const child = spawn(command, argv, { cwd: root, env: { ...env, ...extraEnv }, stdio: 'inherit' });
  child.on('error', (error) => { console.error(`Start fehlgeschlagen: ${error.message}`); done({ code: 127, seconds: 0 }); });
  child.on('exit', (code, signal) => done({ code: code ?? (signal ? 1 : 0), seconds: Math.round((Date.now() - started) / 100) / 10 }));
});
const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const fmt = (seconds) => (seconds >= 120 ? `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s` : `${seconds} s`);

mkdirSync(reports, { recursive: true });
const summary = { startedAt: new Date().toISOString(), shard: shard || null, parts: {}, coverage: null, paths: {} };

// ---------- 1. Node-Tests mit Coverage ----------
async function nodeTests() {
  const xml = join(reports, 'node-tests.xml');
  const coverageDir = join(reports, 'coverage');
  const glob = env.TEST_ALL_NODE_GLOB || 'test/*.test.js';
  // Der Node-Testläufer versteht Muster auch unter Windows; die Dateien werden hier selbst aufgelistet, damit c8 und --test-shard gleich arbeiten
  const files = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.js')).sort().map((f) => `test/${f}`);
  const testArgs = ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=junit', `--test-reporter-destination=${xml}`, ...(shard ? [`--test-shard=${shard}`] : []), ...files];
  console.log(`\n=== Node-Tests${withCoverage ? ' mit Coverage' : ''}${shard ? ` (Teil ${shard})` : ''}: ${files.length} Dateien (${glob}) ===\n`);
  let result;
  if (withCoverage) {
    rmSync(coverageDir, { recursive: true, force: true });
    const c8 = join(root, 'node_modules', 'c8', 'bin', 'c8.js');
    result = await run(process.execPath, [c8, '--reports-dir', coverageDir, '--temp-directory', join(coverageDir, 'tmp'), '--reporter=text', '--reporter=html', '--reporter=json-summary', '--reporter=lcovonly', process.execPath, ...testArgs]);
  } else result = await run(process.execPath, testArgs);
  const doc = existsSync(xml) ? readFileSync(xml, 'utf8') : '';
  // Der JUnit-Bericht von Node hat keine Summen; gezählt wird aus den Einträgen (Fehlschläge = <failure>/<error>, übersprungen = <skipped>)
  const count = (re) => (doc.match(re) || []).length;
  const total = count(/<testcase /g), failed = count(/<failure[ >]/g) + count(/<error[ >]/g), skipped = count(/<skipped/g);
  summary.parts.node = { label: 'Node-Tests', exitCode: result.code, seconds: result.seconds, total, passed: total - failed - skipped, failed, skipped };
  summary.paths.node = rel(xml);
  if (withCoverage) {
    const cov = readJson(join(coverageDir, 'coverage-summary.json'));
    if (cov?.total) summary.coverage = { lines: cov.total.lines.pct, statements: cov.total.statements.pct, branches: cov.total.branches.pct, functions: cov.total.functions.pct };
    summary.paths.coverage = rel(join(coverageDir, 'index.html'));
    summary.paths.coverageSummary = rel(join(coverageDir, 'coverage-summary.json'));
  }
}

// ---------- 2. Playwright ----------
async function uiTests() {
  const json = join(reports, 'playwright.json');
  const html = join(reports, 'playwright-html');
  const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  console.log(`\n=== Playwright-Suite (Desktop und Handy)${shard ? ` (Teil ${shard})` : ''} ===\n`);
  rmSync(html, { recursive: true, force: true });
  const result = await run(process.execPath, [cli, 'test', ...(shard ? [`--shard=${shard}`] : []), '--reporter=list,html,json', ...passthrough], {
    PLAYWRIGHT_HTML_REPORT: html, PLAYWRIGHT_HTML_OPEN: 'never', PLAYWRIGHT_JSON_OUTPUT_NAME: json,
  });
  const report = readJson(json);
  const stats = report?.stats || {};
  const passed = (stats.expected || 0), failed = (stats.unexpected || 0), flaky = (stats.flaky || 0), skipped = (stats.skipped || 0);
  summary.parts.ui = { label: 'Playwright', exitCode: result.code, seconds: result.seconds, total: passed + failed + flaky + skipped, passed: passed + flaky, failed, flaky, skipped, noReport: !report };
  summary.paths.ui = rel(html) + '/index.html';
  summary.paths.uiJson = rel(json);
  if (report) {
    const failedTests = [], flakyTests = [];
    (function walk(suite) { for (const s of suite.suites || []) walk(s); for (const spec of suite.specs || []) for (const t of spec.tests || []) { const label = `${t.projectName} › ${spec.file}:${spec.line} › ${spec.title}`; if (t.status === 'unexpected') failedTests.push(label); else if (t.status === 'flaky') flakyTests.push(label); } })({ suites: report.suites });
    summary.parts.ui.failedTests = failedTests; summary.parts.ui.flakyTests = flakyTests;
  }
}

const started = Date.now();
if (only !== 'ui') await nodeTests();
if (only !== 'node') await uiTests();
summary.totalSeconds = Math.round((Date.now() - started) / 100) / 10;

// ---------- 3. Zusammenfassung ----------
const failedParts = Object.values(summary.parts).filter((p) => p.failed > 0 || p.exitCode !== 0 || p.noReport);
summary.ok = failedParts.length === 0;
const lines = [];
lines.push('## Zusammenfassung aller Tests', '');
lines.push('| Teil | Ergebnis | bestanden | fehlgeschlagen | übersprungen | Dauer |', '| --- | --- | ---: | ---: | ---: | ---: |');
for (const p of Object.values(summary.parts)) {
  const bad = p.failed > 0 || p.exitCode !== 0 || p.noReport;
  lines.push(`| ${p.label} | ${bad ? '❌ rot' : '✅ grün'} | ${p.passed}${p.flaky ? ` (davon ${p.flaky} wackelig)` : ''} | ${p.failed} | ${p.skipped} | ${fmt(p.seconds)} |`);
}
if (summary.coverage) lines.push('', `Coverage (server/ und games/): **${summary.coverage.lines} %** Zeilen · ${summary.coverage.statements} % Anweisungen · ${summary.coverage.branches} % Zweige · ${summary.coverage.functions} % Funktionen`);
lines.push('', `Gesamtdauer: ${fmt(summary.totalSeconds)}${shard ? ` (Teil ${shard})` : ''}`, '', '### Berichte');
if (summary.paths.coverage) lines.push(`- Coverage (HTML): \`${summary.paths.coverage}\` · Zusammenfassung \`${summary.paths.coverageSummary}\``);
if (summary.paths.node) lines.push(`- Node-Tests (JUnit): \`${summary.paths.node}\``);
if (summary.paths.ui) lines.push(`- Playwright (HTML): \`${summary.paths.ui}\` — öffnen mit \`npm run test:report\``);
const failedTests = summary.parts.ui?.failedTests || [];
if (failedTests.length) lines.push('', '### Fehlgeschlagene Browser-Prüfungen', ...failedTests.map((t) => `- ${t}`));
const flakyTests = summary.parts.ui?.flakyTests || [];
if (flakyTests.length) lines.push('', '### Wackelige Browser-Prüfungen (erst im Wiederholungsversuch grün)', ...flakyTests.map((t) => `- ${t}`));
if (summary.parts.node && summary.parts.node.failed === 0 && summary.parts.node.exitCode !== 0) lines.push('', '**Achtung:** Die Node-Tests endeten mit einem Fehlercode, obwohl keine Prüfung als fehlgeschlagen gezählt wurde (z. B. Abbruch oder Absturz) – Ausgabe oben lesen.');
writeFileSync(join(reports, 'summary.md'), lines.join('\n') + '\n');
writeFileSync(join(reports, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('\n' + lines.join('\n').replace(/\*\*|`/g, '') + `\n\nZusammenfassung gespeichert: ${rel(join(reports, 'summary.md'))}`);
process.exit(summary.ok ? 0 : 1);
