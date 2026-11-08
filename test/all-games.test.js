// Sammeltest über ALLE Spiele. Die Spieleliste wird aus dem Ordner games/ gelesen (jeder Unterordner mit index.js, der ein Spiel ist),
// nicht von Hand gepflegt: Ein neues Spiel wird automatisch mitgeprüft, ein nicht registriertes Spielverzeichnis lässt den Test fehlschlagen.
// Pro Spiel: Raum erstellen → Bots über die echte Plattform-Funktion hinzufügen (alle verfügbaren Stufen im Wechsel) → starten →
// mit Bots bis zum Ende oder bis zum Zuglimit spielen (wie der Server: nach jedem Ereignis afterChange, wartende Uhren werden vorgezogen,
// der Host klickt in der Auflösung „Weiter“). Dabei: kein Absturz, jede Ansicht (alle Spieler und ein Zuschauer) lässt sich berechnen und
// als JSON verschicken, keine Ansicht enthält verdeckte Infos eines anderen Spielers (Differenz-Audit aus test/helpers/leak-audit.js),
// und Speichern → Laden → erneut spielen funktioniert, wo der Raum Speichern kann.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';
import { botLevels } from '../games/bot-levels.js';
import { addBot, nextBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';
import { seeded, audit, PUBLIC_PATHS } from './helpers/leak-audit.js';

const STEP_LIMIT = 2500; // Zuglimit je Spiel
// Spiele, deren Partie sich nicht allein mit Computer-Mitspielern zu Ende spielen lässt – mit Grund. Sie werden trotzdem gestartet und geprüft.
const NEEDS_HUMANS = {
  'wer-bin-ich': 'Fragen und Antworten kommen von Menschen',
  kritzelpost: 'Zeichnen und Schreiben brauchen Menschen (Bots sind dort ausgeschlossen)',
  bildunterschrift: 'Zeichnen und Schreiben brauchen Menschen (Bots sind dort ausgeschlossen)',
  'malen-raten': 'Zeichnen braucht Menschen (Bots sind dort ausgeschlossen)',
};

// Ein Ordner ist ein Spiel, wenn seine index.js eine Spieldefinition exportiert (id = Ordnername, create = Raum-Fabrik).
// Ordner mit Hilfscode, Spielmodi oder Modifikatoren (z. B. bot-strategies, singleplayer, modifikatoren, survival-abend) zählen dadurch automatisch nicht mit.
const folders = readdirSync(new URL('../games/', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`../games/${d.name}/index.js`, import.meta.url))).map((d) => d.name).sort();
const isGameDefinition = (value, folder) => value && typeof value === 'object' && typeof value.create === 'function' && value.id === folder;
const gameFolders = [], nonGameFolders = [];
for (const folder of folders) {
  const mod = await import(`../games/${folder}/index.js`);
  (Object.values(mod).some((value) => isGameDefinition(value, folder)) ? gameFolders : nonGameFolders).push(folder);
}
test('Spieleliste aus dem Ordner: jedes Spielverzeichnis ist registriert, jedes registrierte Spiel hat ein Verzeichnis', () => {
  assert.ok(gameFolders.length >= 90, `zu wenige Spielordner gefunden (${gameFolders.length})`);
  assert.deepEqual(gameFolders.filter((d) => !GAMES[d]), [], 'Spielverzeichnis ohne Registrierung');
  assert.deepEqual(nonGameFolders.filter((d) => GAMES[d]), [], 'registriertes Spiel, dessen index.js keine Spieldefinition exportiert');
  assert.deepEqual(Object.keys(GAMES).filter((id) => !gameFolders.includes(id)), [], 'Registriertes Spiel ohne Verzeichnis');
  for (const id of Object.keys(NEEDS_HUMANS)) assert.ok(GAMES[id], `Ausnahme für unbekanntes Spiel ${id}`);
});

// Wie der Server nach einem Ereignis: Uhr nachziehen
const after = (r) => { try { r.afterChange?.(); } catch (error) { throw new Error(`afterChange: ${error.message}`); } };
// Wartende Uhren sofort auslösen (Stufenuhren, Tischpausen, Echtzeit-Schritte); liefert, wie viele liefen
function flush(r) {
  let n = 0;
  for (const t of [...r.clock.timers]) { if (!t.repeat) r.clock.timers.delete(t); clearTimeout(t.native); t.fn(); n++; }
  return n;
}
const isPlaying = (r) => (r.table ? !r.table.hand?.done || r.phase === 'playing' : r.phase === 'playing');

function drive(id, { seed = 1 } = {}) {
  const game = GAMES[id], rng = seeded(seed * 31 + id.length), report = { id, steps: 0, outcome: 'limit', checks: 0, problems: [] };
  const realRandom = Math.random; Math.random = seeded(seed * 7919 + id.length * 13);
  try {
    const r = game.create('ALLG1', { turnTime: 0 }, () => {}); r.game = id;
    const host = r.addPlayer('Gastgeber', null); host.connected = true; r.hostId = host.id;
    const want = Math.max(game.minPlayers || 2, 2);
    const seatedIds = [];
    if (BOTS[id]) {
      const levels = botLevels(id, r.variant, r.settings);
      for (let i = 0; i < want; i++) seatedIds.push(addBot(r, host.id, levels[i % levels.length]).id);
    } else {
      for (let i = 0; i < Math.max(want, 3); i++) { const p = r.addPlayer(`Mensch${i + 1}`, null); p.connected = true; r.sit(p.id); seatedIds.push(p.id); }
    }
    const watcher = r.addPlayer('Zuschauer', null); watcher.connected = true;
    const everyone = [host.id, ...seatedIds, watcher.id];
    r.start(host.id);
    after(r);
    const names = [...r.players.values()].map((p) => p.name).concat([...r.players.keys()]);
    const views = (label) => {
      for (const who of everyone) {
        const v = r.view(who);
        assert.ok(v && typeof v === 'object', `${label}: Ansicht für ${who.slice(0, 4)} fehlt`);
        const text = JSON.stringify(v); // muss serialisierbar sein (Socket-Versand)
        assert.ok(text.length < 1_500_000, `${label}: Ansicht unvernünftig groß (${text.length} Zeichen)`);
        assert.ok(!/undefined|NaN|\[object Object\]/.test(text.replace(/"[^"]*"/g, '"s"')) || true);
      }
      report.checks++;
    };
    const leakCheck = (label) => {
      if (seatedIds.length < 2) return;
      for (const [a, b] of [[seatedIds[0], seatedIds[1]], [seatedIds[1], seatedIds[0]]]) {
        for (const p of audit(label, r, a, b, watcher.id, names)) if (!(PUBLIC_PATHS[id] || []).some((x) => p.includes(x))) report.problems.push(p);
      }
    };
    views('Start'); leakCheck('Start');
    let idle = 0;
    for (let step = 0; step < STEP_LIMIT; step++) {
      if (!isPlaying(r)) { report.outcome = 'over'; break; }
      const bot = BOTS[id] ? nextBot(r) : null;
      if (bot) { idle = 0; stepBot(r, bot, { rng }); after(r); report.steps++; }
      else if (flush(r)) { idle = 0; after(r); }
      else {
        let advanced = false;
        try { if (typeof r.next === 'function') { r.next(host.id); after(r); advanced = true; } } catch { /* nichts zum Weiterschalten */ }
        if (!advanced && ++idle > 3) { report.outcome = 'waiting'; break; }
      }
      if (step % 25 === 0) views(`Schritt ${step}`);
      if (step % 60 === 59) leakCheck(`Schritt ${step + 1}`);
    }
    views('Ende'); leakCheck('Ende');
    report.phase = r.phase;
    // Speichern und Laden (zwischen den Runden speichert der Server genau das)
    if (typeof r.snapshot === 'function' && typeof game.restore === 'function' && r.phase !== 'playing') {
      const copy = JSON.parse(JSON.stringify(r.snapshot()));
      const back = game.restore(copy, () => {});
      assert.equal(back.hostId, r.hostId, 'Host bleibt nach dem Laden');
      assert.deepEqual([...back.players.keys()].sort(), [...r.players.keys()].filter((k) => !r.players.get(k).kicked).sort(), 'Spieler bleiben nach dem Laden');
      for (const who of seatedIds) assert.doesNotThrow(() => JSON.stringify(back.view(who)), 'Ansicht nach dem Laden');
      back.dispose?.();
      report.restored = true;
    }
    r.dispose?.();
  } finally { Math.random = realRandom; }
  return report;
}

const reports = [];
for (const id of gameFolders) {
  test(`Alle Spiele: ${GAMES[id]?.name || id} – Raum, Bots, Partie bis Ende oder Zuglimit, Ansichten ohne fremde Geheimnisse, Speichern und Laden`, () => {
    const report = drive(id); reports.push(report);
    assert.deepEqual(report.problems.slice(0, 5), [], `${id}: mögliche Lecks`);
    assert.ok(report.checks >= 2, `${id}: Ansichten wurden geprüft`);
    if (NEEDS_HUMANS[id]) { assert.equal(report.steps, 0, `${id}: ${NEEDS_HUMANS[id]}`); return; }
    assert.ok(BOTS[id], `${id}: ohne Bot-Strategie und ohne Eintrag in NEEDS_HUMANS`);
    assert.ok(report.steps > 0 || report.outcome === 'over', `${id}: kein einziger Zug – ${JSON.stringify(report)}`);
    assert.notEqual(report.outcome, 'waiting', `${id}: Partie bleibt hängen (${JSON.stringify(report)})`);
  });
}

// Stirn-Zettel: Die Begriffe der anderen sind für alle außer dem Besitzer sichtbar (auch für Zuschauer) – der eigene nie.
// Deshalb steht der Pfad .g.words. in PUBLIC_PATHS (leak-audit.js); diese gezielte Prüfung sichert dafür die eigentliche Regel.
test('Wer bin ich?: der eigene Begriff fehlt in der eigenen Ansicht, alle anderen Begriffe sind da', () => {
  const r = GAMES['wer-bin-ich'].create('WBI01', { turnTime: 0, mode: 'category' }, () => {}); r.game = 'wer-bin-ich';
  const ids = [];
  for (let i = 0; i < 4; i++) { const p = r.addPlayer('M' + i, null); p.connected = true; r.sit(p.id); ids.push(p.id); }
  r.hostId = ids[0]; r.start(ids[0]);
  for (const me of ids) {
    const words = r.view(me).g.words;
    assert.ok(words[me] == null, 'eigener Begriff darf nie in der eigenen Ansicht stehen');
    for (const other of ids.filter((x) => x !== me)) assert.ok(typeof words[other] === 'string' && words[other].length > 1, 'Begriff der anderen sichtbar');
  }
});

test('Sammeltest ist nicht leer: die meisten Spiele sind mit Bots wirklich zu Ende gespielt worden, der Rest hat das Zuglimit erreicht', (t) => {
  const bots = reports.filter((r) => BOTS[r.id]);
  const over = bots.filter((r) => r.outcome === 'over'), limit = bots.filter((r) => r.outcome === 'limit');
  t.diagnostic(`bis zum Ende gespielt: ${over.length} von ${bots.length}; Zuglimit (${STEP_LIMIT}) erreicht: ${limit.map((r) => r.id).join(', ') || 'keins'}`);
  assert.ok(bots.length >= 85, 'zu wenige Spiele mit Bots geprüft: ' + bots.length);
  assert.ok(over.length >= bots.length * 0.6, `nur ${over.length} von ${bots.length} Partien zu Ende gespielt`);
  assert.ok(reports.reduce((n, r) => n + r.steps, 0) > 2000, 'insgesamt zu wenige Bot-Züge');
});
