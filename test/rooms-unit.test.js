// Unit-Tests für die gemeinsamen Raum-Bausteine mit der schlechtesten Abdeckung:
// games/art-kit.js (Spielbilder), games/drawing-room.js (Zeichenspiele), games/solo-room.js (Bauart B: alle spielen gleichzeitig solo).
// Schwerpunkt: ungültiger Zug, falscher Spieler, Raum voll, Reconnect, Spielende, Speichern und Laden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ART from '../games/art-kit.js';
import { GAMES } from '../games/index.js';
import { KritzelRoom, CaptionRoom, GuessRoom, drawingEvents } from '../games/drawing-room.js';
import { COLORS } from '../games/drawing.js';

// ---------- art-kit ----------
test('Spielbilder: jede Funktion liefert ein kleines, skriptfreies SVG ohne externe Verweise', () => {
  const samples = {
    fan: () => ART.fan([{ kind: 'dot' }, { kind: 'diamond' }, { kind: 'heart' }, { kind: 'bars' }, {}]),
    stairs: () => ART.stairs(['#fff', '#eee', '#ddd']),
    cardsChip: () => ART.cardsChip({ kind: 'heart' }, { kind: 'dot' }, '#c33'),
    dice: () => ART.dice([{ x: 4, y: 4, n: 1 }, { x: 30, y: 4, n: 6, s: 22, rot: 10 }, { x: 4, y: 30, n: 3 }]),
    glyph: () => ART.glyph('pen'),
    hexBoard: () => ART.hexBoard(),
  };
  for (const [name, fn] of Object.entries(ART)) {
    if (typeof fn !== 'function') continue;
    let svg;
    try { svg = (samples[name] || fn)(); } catch (error) { assert.fail(`${name}: wirft ${error.message}`); }
    if (typeof svg !== 'string') continue; // Hilfswerte
    assert.match(svg, /^<svg class="game-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">.*<\/svg>$/s, name);
    assert.ok(!/<script|javascript:|onload=|onerror=|href=|<image|<foreignObject/i.test(svg), `${name}: nur reine Formen, keine Skripte oder Verweise`);
    assert.ok(svg.length < 6000, `${name}: Bild bleibt klein (${svg.length} Zeichen)`);
    assert.equal((svg.match(/<(?!\/)[a-z]/gi) || []).length, (svg.match(/<\/[a-z]+>|\/>/gi) || []).length, `${name}: Tags sind ausgeglichen`);
  }
});
test('Spielbilder: Glyphen sind vollständig benannt, das Würfelbild zeigt Augen nach Zahl', () => {
  assert.ok(ART.GLYPH_NAMES.length >= 20 && new Set(ART.GLYPH_NAMES).size === ART.GLYPH_NAMES.length);
  for (const name of ART.GLYPH_NAMES) assert.match(ART.glyph(name), /<g fill="none"/, name);
  const pips = (n) => (ART.dice([{ x: 4, y: 4, n }]).match(/<circle/g) || []).length;
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(pips), [1, 2, 3, 4, 5, 6]);
  assert.equal(ART.dice([]).includes('<rect'), false, 'ohne Würfel keine Formen');
});
test('Spielbilder: jedes registrierte Spiel bringt ein Bild mit', () => {
  for (const g of Object.values(GAMES)) {
    const art = typeof g.art === 'function' ? g.art() : g.art;
    assert.equal(typeof art, 'string', `${g.id}: Spielbild fehlt`);
    assert.match(art, /^<svg /, g.id);
  }
});

// ---------- Zeichenspiele ----------
const stroke = () => [{ color: COLORS[0], size: 8, points: [[100, 100], [400, 500], [900, 200]] }];
function table(Room, game, count, settings = {}) {
  const r = new Room('ZEICH', { rounds: 1, ...settings }, () => {});
  r.game = game;
  const ids = Array.from({ length: count }, (_, i) => { const p = r.addPlayer(`Mensch${i + 1}`, null); p.connected = true; r.sit(p.id); return p.id; });
  return { r, ids };
}

test('Zeichenräume: Start nur durch den Host, mit genug Menschen und ohne Bots', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 2);
  assert.throws(() => r.start(ids[0]), /mindestens|Mitspieler|brauch/i, 'zu wenige Spieler');
  const third = r.addPlayer('Mensch3', null); third.connected = true; r.sit(third.id);
  assert.throws(() => r.start(ids[1]), /Host/, 'Nicht-Host');
  const bot = r.addPlayer('Bot 1', null); bot.bot = true; bot.connected = true; r.sit(bot.id);
  assert.throws(() => r.start(ids[0]), /Bots/, 'Bots sind in Zeichenspielen nicht erlaubt');
  r.stand(bot.id); r.players.delete(bot.id);
  r.start(ids[0]);
  assert.equal(r.phase, 'playing');
  assert.ok(r.view(ids[0]).g.key);
});
test('Zeichenräume: Raum voll – nach dem letzten Platz kommt niemand mehr an den Tisch', () => {
  const r = new KritzelRoom('VOLL', {}, () => {});
  const seated = [];
  for (let i = 0; i < 12; i++) { const p = r.addPlayer(`S${i}`, null); r.sit(p.id); seated.push(p.id); }
  const extra = r.addPlayer('Zu viel', null);
  assert.throws(() => r.sit(extra.id), /Mehr als [0-9]+ Mitspieler/);
  assert.equal(r.seats.length, 12);
});
test('Kritzelpost: falscher Spieler, falsche Runde, leere und doppelte Beiträge werden abgelehnt', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 3);
  const outsider = r.addPlayer('Zuschauer', null); outsider.connected = true;
  r.start(ids[0]);
  const key = r.stateKey;
  assert.throws(() => r.answer(outsider.id, key, 'hallo'), /Aufgabe/, 'Zuschauer');
  assert.throws(() => r.answer(ids[0], '0:0:write:99', 'hallo'), /Aufgabe/, 'alter Schlüssel');
  assert.throws(() => r.answer(ids[0], key, '   '), /Begriff|Beschreibung/, 'leer');
  assert.throws(() => r.answer(ids[0], key, '\u0000\n'), /Begriff|Beschreibung/, 'nur Steuerzeichen');
  r.answer(ids[0], key, 'Ein Drache');
  assert.throws(() => r.answer(ids[0], key, 'Noch einer'), /fertig|gezeichnet/, 'doppelt');
  assert.throws(() => r.drawing(ids[1], key, stroke(), true), /nicht zeichnen|Aufgabe/, 'zeichnen in der Schreibstufe');
  assert.throws(() => drawingEvents.vote(r, { id: ids[1] }, { key, choice: 0 }), /gibt es in diesem Spiel nicht/, 'Abstimmung gibt es nicht');
});
test('Kritzelpost: kompletter Durchgang bis zum Spielende, jede Kette hat so viele Seiten wie Autoren', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 3);
  r.start(ids[0]);
  for (let step = 0; step < 3; step++) {
    const key = r.stateKey;
    for (const id of ids) {
      if (r.canDraw(id)) assert.throws(() => r.drawing(id, key, [], true), /Zeichne erst etwas/, 'leere Zeichnung');
      if (r.canDraw(id)) r.drawing(id, key, stroke(), true); else r.answer(id, key, `Idee ${step}`);
    }
  }
  assert.equal(r.stage, 'reveal');
  const view = r.view(ids[0]).g;
  assert.equal(view.chains.length, 3);
  for (const chain of view.chains) assert.equal(chain.pages.length, 3);
  assert.ok(ids.every((id) => r.gamePts[id] >= 300), 'jeder Beitrag zählt 100 Punkte');
  r.next(ids[0]);
  assert.notEqual(r.phase, 'playing', 'nach der Auflösung ist die Partie zu Ende');
  assert.ok(r.winners?.length || r.lastResult || r.phase !== 'playing');
});
test('Bildunterschrift: Zeichnende*r darf nicht unterschreiben oder für sich stimmen, Abstimmung nur mit gültiger Wahl', () => {
  const { r, ids } = table(CaptionRoom, 'bildunterschrift', 3);
  const outsider = r.addPlayer('Zuschauer', null).id; r.players.get(outsider).connected = true;
  r.start(ids[0]);
  const artist = r.artist, others = ids.filter((id) => id !== artist);
  let key = r.stateKey;
  assert.throws(() => r.answer(artist, key, 'Meine Unterschrift'), /keine Bildunterschrift|Aufgabe/);
  assert.throws(() => r.drawing(others[0], key, stroke(), true), /nicht zeichnen/);
  r.drawing(artist, key, stroke(), true);
  assert.equal(r.sub, 1);
  key = r.stateKey;
  assert.throws(() => r.drawing(artist, key, stroke(), true), /Aufgabe|nicht zeichnen/, 'Zeichnung nach der Zeichenstufe');
  r.answer(others[0], key, 'Erste'); r.answer(others[1], key, 'Zweite');
  assert.equal(r.stage, 'vote');
  key = r.stateKey;
  assert.throws(() => r.vote(others[0], 'falsch', 0), /abstimmen/, 'falscher Schlüssel');
  assert.throws(() => r.vote(others[0], key, 7), /fremde/, 'Wahl außerhalb der Liste');
  assert.throws(() => r.vote(others[0], key, 1.5), /fremde/, 'keine ganze Zahl');
  const own = r.display.indexOf(others[0]);
  assert.throws(() => r.vote(others[0], key, own), /fremde/, 'für die eigene Unterschrift');
  assert.throws(() => r.vote(outsider, key, 0), /abstimmen/, 'Zuschauer ohne Zuschauer-Abstimmung');
  for (const id of ids) r.vote(id, key, r.display.findIndex((a) => a !== id)); // auch die Zeichnende darf abstimmen
  assert.equal(r.stage, 'reveal');
  assert.equal(r.view(ids[0]).g.results.length, 2);
});
test('Malen & Raten: Raten mit Sperrfrist, richtige Antwort bringt Punkte, Zeichnende*r kann nicht raten', () => {
  const { r, ids } = table(GuessRoom, 'malen-raten', 3, { rounds: 3 });
  r.start(ids[0]);
  const artist = r.artist, guessers = ids.filter((id) => id !== artist);
  const key = r.stateKey;
  assert.equal(r.view(guessers[0]).g.prompt, null, 'Raten sehen den Begriff nicht');
  assert.ok(r.view(artist).g.prompt, 'die Zeichnende sieht ihn');
  assert.throws(() => r.answer(artist, key, 'egal'), /zeichnest|erraten/);
  assert.throws(() => r.answer(guessers[0], key, '  '), /Vermutung/);
  r.answer(guessers[0], key, 'ganz falsch');
  assert.throws(() => r.answer(guessers[0], key, 'noch falscher'), /Warte kurz/, 'Sperrfrist zwischen zwei Versuchen');
  r.answer(guessers[1], key, r.cur.q.toUpperCase());
  assert.ok(r.gamePts[guessers[1]] >= 100 && r.gamePts[artist] >= 100);
  assert.throws(() => r.answer(guessers[1], key, r.cur.q), /erraten/, 'nach dem Erraten nicht noch einmal');
});
test('Zeichenräume: Speichern und Laden – Spieler, Plätze und Einstellungen bleiben, Zustand kehrt in die Lobby zurück', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 3, { writeSecs: 45 });
  r.scores = { [ids[0]]: 5 };
  const data = JSON.parse(JSON.stringify(r.snapshot()));
  const back = KritzelRoom.restore(data, () => {});
  assert.deepEqual([...back.players.keys()].sort(), [...ids].sort());
  assert.deepEqual(back.seats, r.seats);
  assert.equal(back.settings.writeSecs, 45);
  assert.equal(back.scores[ids[0]], 5);
  assert.equal(back.phase, 'lobby');
  assert.equal(back.hostId, ids[0]);
  assert.doesNotThrow(() => { back.sit; back.start(ids[0]); });
  assert.equal(back.phase, 'playing');
});
test('Zeichenräume: Reconnect – wer offline ist, blockiert die Stufe nicht, und kehrt mit demselben Platz zurück', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 3);
  r.start(ids[0]);
  r.players.get(ids[2]).connected = false;
  const key = r.stateKey;
  r.answer(ids[0], key, 'A'); r.answer(ids[1], key, 'B');
  assert.equal(r.sub, 1, 'ohne den Offline-Spieler geht es weiter');
  r.players.get(ids[2]).connected = true;
  const v = r.view(ids[2]);
  assert.ok(v.you && v.g.key === r.stateKey, 'die Rückkehr sieht den aktuellen Schritt');
});
test('Zeichenräume: Aussteigen mitten in der Partie – bei zu wenigen Mitspielern endet sie', () => {
  const { r, ids } = table(KritzelRoom, 'kritzelpost', 3);
  r.start(ids[0]);
  r.dropOut(r.players.get(ids[2]), 'ist gegangen');
  assert.notEqual(r.phase, 'playing', 'mit zwei Autoren ist unter dem Minimum von drei Schluss');
});

// ---------- Solo-Räume (Bauart B) ----------
function soloTable(game, count = 3, settings = {}) {
  const r = GAMES[game].create('SOLOX', { rounds: 2, ...settings }, () => {});
  r.game = game;
  const ids = Array.from({ length: count }, (_, i) => { const p = r.addPlayer(`Solo${i + 1}`, null); p.connected = true; r.sit(p.id); return p.id; });
  return { r, ids };
}
test('Solo-Raum: Abgabe nur während der Runde, nur von Mitspielenden, nur einmal', () => {
  const { r, ids } = soloTable('zahlenzoo');
  assert.throws(() => r.submit(ids[0], {}), /keine Runde/, 'vor dem Start');
  r.start(ids[0]);
  const outsider = r.addPlayer('Zuschauer', null); outsider.connected = true;
  assert.throws(() => r.submit(outsider.id, {}), /nicht mit/, 'Zuschauer');
  r.submit(ids[0], { answer: 3 });
  assert.throws(() => r.submit(ids[0], { answer: 4 }), /schon abgegeben/);
  assert.equal(r.view(ids[0]).g.mine !== null, true, 'die eigene Wertung ist sichtbar');
  assert.equal(r.view(ids[1]).g.mine, null, 'fremde Wertungen nicht');
  for (const junk of [null, 5, 'text', [1, 2]]) {
    const { r: r2, ids: i2 } = soloTable('zahlenzoo');
    r2.start(i2[0]);
    assert.doesNotThrow(() => r2.submit(i2[1], junk), `Müll-Eingabe ${JSON.stringify(junk)} wird wie eine leere Abgabe gewertet`);
    assert.equal(r2.subs[i2[1]].pts, 0);
  }
});
test('Solo-Raum: Zahlenzoo – Lösung und Seed erst zur richtigen Zeit, alle fertig → Auflösung → nächste Runde → Spielende', () => {
  const { r, ids } = soloTable('zahlenzoo', 2, { rounds: 2 });
  const bots = r.addPlayer('Bot 1', null); bots.bot = true; bots.connected = true;
  r.start(ids[0]);
  assert.equal(r.stage, 'write');
  assert.ok(r.view(ids[0]).g.seed != null, 'Seed in der Schreibstufe');
  assert.equal(r.view(ids[0]).g.reveal, null, 'noch keine Lösung');
  assert.deepEqual(r.waiting().sort(), [...ids].sort());
  for (const id of ids) r.submit(id, { answer: 1 });
  assert.equal(r.stage, 'reveal');
  const rev = r.view(ids[0]).g;
  assert.equal(rev.seed, null, 'in der Auflösung kein Seed mehr');
  assert.equal(rev.reveal.results.length, ids.length);
  assert.ok(rev.reveal.solution != null);
  r.next(ids[0]);
  assert.equal(r.q, 1, 'zweite Runde');
  assert.equal(r.stage, 'write');
  r.fallback(ids[0]); // Zeit abgelaufen: Computer-Eingabe für die Offline-/Zeit-Fälle
  r.closeStage('write');
  assert.ok(ids.every((id) => r.subs[id]), 'wer nichts abgibt, bekommt 0 Punkte statt zu blockieren');
  assert.equal(r.subs[ids[1]].missing, true);
  r.advance(); r.next(ids[0]);
  assert.notEqual(r.phase, 'playing', 'nach der letzten Runde endet die Partie');
});
test('Solo-Raum: Abbruch der Runde setzt Abgaben zurück, Speichern und Laden behält Plätze und Einstellungen', () => {
  const { r, ids } = soloTable('zahlenzoo', 3, { rounds: 4, countOnly: true });
  r.start(ids[0]);
  r.submit(ids[1], {});
  r.onAbort();
  assert.deepEqual(r.subs, {}); assert.equal(r.reveal, null);
  const back = GAMES.zahlenzoo.restore(JSON.parse(JSON.stringify(r.snapshot())), () => {});
  assert.deepEqual(back.seats, r.seats);
  assert.equal(back.settings.countOnly, true);
  assert.equal(back.settings.rounds, 4);
  assert.deepEqual(back.roundOptions(), { countOnly: true });
});
test('Solo-Raum: Raum voll und Mindestzahl – alle Solo-Spiele lehnen den neunten Platz und den Start allein ab', () => {
  for (const game of ['zahlenzoo', 'gedaechtnis-kueche', 'pfeilfieber', 'sortierstation']) {
    const r = GAMES[game].create('SOLOV', {}, () => {}); r.game = game;
    const first = r.addPlayer('Allein', null); first.connected = true; r.sit(first.id);
    assert.throws(() => r.start(first.id), /mindestens|Mitspieler|brauch/i, `${game}: allein`);
    const ids = [first.id];
    for (let i = 1; i < 8; i++) { const p = r.addPlayer(`S${i}`, null); p.connected = true; r.sit(p.id); ids.push(p.id); }
    const ninth = r.addPlayer('Neunter', null);
    assert.throws(() => r.sit(ninth.id), /Mehr als [0-9]+ Mitspieler/, `${game}: neunter Platz`);
  }
});
