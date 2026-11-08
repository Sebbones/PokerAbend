// scripts/release-check.sh (V2-10): prüft .env, Image, Sicherung und Healthcheck – und verändert dabei nichts. Ohne Docker getestet (RELEASE_CHECK_SKIP_DOCKER=1),
// der Healthcheck gegen einen kleinen lokalen Server. Braucht bash und tar (Linux, macOS, Git-Bash unter Windows); sonst werden die Tests übersprungen.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, statSync, utimesSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '');
const SCRIPT = join(root, 'scripts', 'release-check.sh').split('\\').join('/');
const VERSION = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const probe = spawnSync('bash', ['-c', 'command -v tar >/dev/null && echo bash-ok'], { encoding: 'utf8' });
const HAS_BASH = probe.status === 0 && probe.stdout.includes('bash-ok');
const skip = HAS_BASH ? false : 'bash oder tar nicht verfügbar';
const posix = (p) => p.split('\\').join('/');

// Der Healthcheck-Server läuft als eigener Prozess: spawnSync blockiert sonst die Ereignisschleife dieses Prozesses, und der Server könnte nicht antworten.
// Antwort und Statuscode liest er bei jeder Anfrage aus einer Datei, die die Tests umschreiben.
const stateDir = mkdtempSync(join(tmpdir(), 'rc-health-'));
const stateFile = join(stateDir, 'state.json');
const setHealth = (body, status = 200) => writeFileSync(stateFile, JSON.stringify({ body, status }));
let health, healthUrl;
before(async () => {
  if (!HAS_BASH) return;
  setHealth({ ok: true, version: VERSION, commit: 'abc1234', uptime: 5 });
  health = spawn(process.execPath, ['-e', `
    const { createServer } = require('node:http'), { readFileSync } = require('node:fs');
    createServer((req, res) => { const s = JSON.parse(readFileSync(process.argv[1], 'utf8')); res.writeHead(s.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(s.body)); })
      .listen(0, '127.0.0.1', function () { console.log('PORT:' + this.address().port); });`, posix(stateFile)], { stdio: ['ignore', 'pipe', 'inherit'] });
  healthUrl = await new Promise((resolve, reject) => { health.stdout.on('data', (d) => { const m = /PORT:([0-9]+)/.exec(String(d)); if (m) resolve(`http://127.0.0.1:${m[1]}/health`); }); health.on('exit', reject); });
});
after(() => health?.kill());

const GOOD_ENV = ['DOMAIN=spiele.example.org', 'IMAGE=ghcr.io/example/pokerabend:3.0.0', 'SITE_PASSWORD=Ein-gutes-Passwort-2026', 'ADMIN_PASSWORD=Anderes-Admin-Passwort-2026', 'TICKET_ADMIN_PASSWORD=Ticket-Passwort-2026',
  'FEATURE_RANKED=on', 'FEATURE_CAMERA=off', 'DISABLED_GAMES=blackjack,sudoku', 'MAX_ROOMS=60'].join('\n') + '\n';

function backupDir({ ageHours = 1, corrupt = false, files = ['leaderboard.json', 'rooms.json', 'accounts.json', 'secret.key'] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rc-backup-')), data = mkdtempSync(join(tmpdir(), 'rc-data-'));
  for (const f of files) writeFileSync(join(data, f), f === 'secret.key' ? 'x'.repeat(64) : '{"schemaVersion":1,"padding":"' + 'x'.repeat(200) + '"}');
  const name = 'spieleabend-2026-11-08_0430.tar.gz', archive = posix(join(dir, name));
  if (corrupt) writeFileSync(archive, 'das ist kein tar-archiv '.repeat(20));
  else assert.equal(spawnSync('tar', ['czf', name, '-C', posix(data), '.'], { cwd: dir, encoding: 'utf8' }).status, 0); // relativer Name: GNU-tar hielte „C:/…“ für einen fremden Rechner
  const when = new Date(Date.now() - ageHours * 3600 * 1000);
  utimesSync(archive, when, when);
  return dir;
}
function envFile(text = GOOD_ENV) { const dir = mkdtempSync(join(tmpdir(), 'rc-env-')); const file = join(dir, '.env'); writeFileSync(file, text, { mode: 0o600 }); return file; }
function run(mode, env = {}) {
  const r = spawnSync('bash', [SCRIPT, mode], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME || '', SYSTEMROOT: process.env.SYSTEMROOT || '', RELEASE_CHECK_SKIP_DOCKER: '1', HEALTH_WAIT_S: '3', ...env }, timeout: 60000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const snapshot = (dir) => readdirSync(dir).sort().map((f) => `${f}:${statSync(join(dir, f)).size}:${statSync(join(dir, f)).mtimeMs}`).join('|');

test('Alles in Ordnung: Exit 0, alle Bereiche geprüft, keine Geheimnisse in der Ausgabe', { skip }, () => {
  const env = envFile(), backup = backupDir();
  const r = run('alles', { ENV_FILE: posix(env), BACKUP_DIR: posix(backup), HEALTH_URL: healthUrl });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Ergebnis: keine Fehler/);
  for (const part of ['== .env', '== Docker-Image ==', '== Sicherung', '== Healthcheck']) assert.ok(r.out.includes(part), part);
  assert.match(r.out, /Version 3\.0\.0|Version .* entspricht/);
  assert.match(r.out, /DISABLED_GAMES: blackjack,sudoku/);
  for (const secret of ['Ein-gutes-Passwort-2026', 'Anderes-Admin-Passwort-2026', 'Ticket-Passwort-2026']) assert.ok(!r.out.includes(secret), 'Passwort in der Ausgabe');
});

test('.env: fehlende Pflichtwerte, kurze/Platzhalter-Passwörter, ungültige Schalter, Spiel-IDs und Zahlen werden als Fehler gemeldet', { skip }, () => {
  const bad = ['DOMAIN=https://spiele.example.org/', 'SITE_PASSWORD=test', 'FEATURE_RANKED=vielleicht', 'FEATURE_CAMERA=2', 'DISABLED_GAMES=blackjack,../etc,Poker', 'MAX_ROOMS=viele', 'CREATE_LIMIT=0', 'TIPPFEHLER_VAR=1'].join('\n');
  const r = run('vorher', { ENV_FILE: posix(envFile(bad)), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl });
  assert.equal(r.code, 1);
  for (const re of [/IMAGE fehlt/, /DOMAIN ist keine Domain/, /SITE_PASSWORD ist ein Platzhalter/, /FEATURE_RANKED hat keinen gültigen Wert/, /FEATURE_CAMERA hat keinen gültigen Wert/, /DISABLED_GAMES enthält ungültige Spiel-IDs/, /MAX_ROOMS muss eine positive ganze Zahl/, /CREATE_LIMIT muss eine positive ganze Zahl/, /unbekannte Variablen.*TIPPFEHLER_VAR/]) assert.match(r.out, re);
  assert.match(r.out, /NICHT aufspielen/);
});

test('.env: keine Datei → Fehler; Discord nur ganz oder gar nicht; PUBLIC_URL muss https ohne Schrägstrich sein', { skip }, () => {
  assert.match(run('vorher', { ENV_FILE: posix(join(tmpdir(), 'gibt-es-nicht', '.env')), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl }).out, /\.env nicht gefunden/);
  const partial = run('vorher', { ENV_FILE: posix(envFile(GOOD_ENV + 'DISCORD_CLIENT_SECRET=geheim\n')), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl });
  assert.match(partial.out, /Discord unvollständig/); assert.equal(partial.code, 1); assert.ok(!partial.out.includes('geheim\n'));
  const slash = run('vorher', { ENV_FILE: posix(envFile(GOOD_ENV + 'DISCORD_CLIENT_ID=1563578924007694346\nDISCORD_CLIENT_SECRET=geheim\nPUBLIC_URL=http://spiele.example.org/\n')), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl });
  assert.match(slash.out, /PUBLIC_URL muss mit https:\/\/ beginnen/);
  const full = run('vorher', { ENV_FILE: posix(envFile(GOOD_ENV + 'DISCORD_CLIENT_ID=1563578924007694346\nDISCORD_CLIENT_SECRET=geheim\nPUBLIC_URL=https://spiele.example.org\nDISCORD_GUILD_ID=900000000000000001\n')), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl });
  assert.equal(full.code, 0, full.out); assert.match(full.out, /Discord: Client-ID, Secret und PUBLIC_URL sind gesetzt/);
  const example = run('vorher', { ENV_FILE: posix(join(root, '.env.example')), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl });
  assert.doesNotMatch(example.out, /Discord unvollständig/, 'die unveränderte .env.example (mit öffentlicher Client-ID) ist kein Fehler');
});

test('Sicherung: fehlender Ordner, keine Archive, zu alt, beschädigt → Fehler; frisch und lesbar → OK', { skip }, () => {
  const common = { ENV_FILE: posix(envFile()), HEALTH_URL: healthUrl };
  assert.match(run('vorher', { ...common, BACKUP_DIR: posix(join(tmpdir(), 'rc-gibt-es-nicht')) }).out, /Sicherungsordner .* gibt es nicht/);
  assert.match(run('vorher', { ...common, BACKUP_DIR: posix(mkdtempSync(join(tmpdir(), 'rc-leer-'))) }).out, /Keine Sicherung/);
  const old = run('vorher', { ...common, BACKUP_DIR: posix(backupDir({ ageHours: 80 })) });
  assert.equal(old.code, 1); assert.match(old.out, /Sicherung ist 80 Stunden alt/);
  assert.equal(run('vorher', { ...common, BACKUP_DIR: posix(backupDir({ ageHours: 80 })), MAX_BACKUP_AGE_H: '100' }).code, 0, 'Grenze einstellbar');
  assert.match(run('vorher', { ...common, BACKUP_DIR: posix(backupDir({ corrupt: true })) }).out, /beschädigt/);
  const empty = run('vorher', { ...common, BACKUP_DIR: posix(backupDir({ files: ['nur-eine-datei.txt'] })) });
  assert.match(empty.out, /fehlen rooms\.json, leaderboard\.json und accounts\.json/); assert.equal(empty.code, 0, 'nur eine Warnung');
  const fresh = run('vorher', { ...common, BACKUP_DIR: posix(backupDir()) });
  assert.match(fresh.out, /Archiv lässt sich lesen/); assert.match(fresh.out, /secret\.key ist gesichert/);
});

test('Healthcheck: nachher muss gesund und in der erwarteten Version laufen; vorher ist die alte Version nur eine Info', { skip }, () => {
  const base = { ENV_FILE: posix(envFile()), BACKUP_DIR: posix(backupDir()), HEALTH_URL: healthUrl };
  setHealth({ ok: true, version: VERSION, commit: 'abc1234', uptime: 5 });
  assert.equal(run('nachher', base).code, 0);
  assert.match(run('nachher', { ...base, EXPECTED_COMMIT: 'abc1234def' }).out, /läuft: Version/);
  assert.equal(run('nachher', { ...base, EXPECTED_COMMIT: 'fff9999' }).code, 1, 'falscher Commit');
  setHealth({ ok: true, version: '2.0.0', commit: 'old0000', uptime: 5 });
  const old = run('nachher', base);
  assert.equal(old.code, 1); assert.match(old.out, /Es läuft Version 2\.0\.0, erwartet wird/);
  const before = run('vorher', base);
  assert.equal(before.code, 0, before.out); assert.match(before.out, /Noch die alte Version \(2\.0\.0\)/);
  setHealth({ ok: false }, 503);
  const down = run('nachher', base);
  assert.equal(down.code, 1); assert.match(down.out, /Kein gesunder \/health/);
  assert.equal(run('nachher', { ...base, HEALTH_URL: 'http://127.0.0.1:9/health' }).code, 1, 'nichts erreichbar');
  setHealth({ ok: true, version: VERSION, commit: 'abc1234', uptime: 5 });
});

test('Nur prüfen, nichts verändern: .env, Sicherungsordner und Repository-Ordner sind danach unverändert', { skip }, () => {
  const envPath = envFile(), backup = backupDir(), repoBefore = snapshot(join(root, 'scripts'));
  const envBefore = readFileSync(envPath, 'utf8'), backupBefore = snapshot(backup);
  const r = run('alles', { ENV_FILE: posix(envPath), BACKUP_DIR: posix(backup), HEALTH_URL: healthUrl });
  assert.equal(r.code, 0, r.out);
  assert.equal(readFileSync(envPath, 'utf8'), envBefore);
  assert.equal(snapshot(backup), backupBefore);
  assert.equal(snapshot(join(root, 'scripts')), repoBefore);
  const source = readFileSync(join(root, 'scripts', 'release-check.sh'), 'utf8');
  const code = source.replace(/^s*#.*$/gm, '');
  // Nur lesende Docker-Befehle: image inspect, info, context show, run --rm (Version lesen), inspect, compose config/ps
  for (const forbidden of [/docker compose (?:--env-file "[$]ENV_FILE" )?(?:[$]COMPOSE_FILES )?(up|down|pull|restart|stop|rm|exec|run|build|create|kill)[ ]/, /docker (rm|stop|kill|pull|push|rmi|build|volume rm|system prune|network rm|exec)[ ]/, /[ ;]rm -rf?[ ]/, /[ ;]mv [^ ]/, /sed -i/, /> *"?[$]ENV_FILE/]) {
    assert.doesNotMatch(code, forbidden, String(forbidden));
  }
  mkdirSync(join(tmpdir(), 'rc-done'), { recursive: true });
});

test('Aufruf: unbekannter Modus → Exit 2, --help zeigt die Hilfe', { skip }, () => {
  assert.equal(run('quatsch').code, 2);
  const help = run('--help'); assert.equal(help.code, 0); assert.match(help.out, /Release-Check/);
});
