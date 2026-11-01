// Backlog (games/planned.js): Pflichtfelder, eindeutige IDs, Vollständigkeit der Päckchen, nur das nächste Päckchen auf „next“.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, PLANNED, plannedGames, gameEvents } from '../games/index.js';

const CATEGORIES = ['karten', 'wuerfel', 'brett', 'party', 'einzelspieler'];
const PACKAGES = ['4', '5', '6', '7', '7b', '8', '9', 'spaeter', 'gross', 'solo-zukunft'];
const games = PLANNED.filter((e) => e.type !== 'feature');
const features = PLANNED.filter((e) => e.type === 'feature');

test('Spiel-Einträge haben alle Pflichtfelder', () => {
  assert.ok(games.length >= 30);
  for (const g of games) {
    const w = `${g.id}`;
    assert.match(g.id, /^[a-z0-9-]{1,30}$/, `${w}: id`);
    assert.ok(g.name && g.name.length <= 40, `${w}: name`);
    assert.ok(typeof g.description === 'string' && g.description.length >= 15 && g.description.length <= 200, `${w}: description`);
    assert.ok(CATEGORIES.includes(g.category), `${w}: category`);
    assert.ok(Number.isInteger(g.minPlayers) && Number.isInteger(g.maxPlayers) && g.minPlayers >= 1 && g.minPlayers <= g.maxPlayers && g.maxPlayers <= 18, `${w}: Spielerzahl`);
    assert.ok(Number.isInteger(g.duration) && g.duration > 0 && g.duration <= 180, `${w}: duration`);
    assert.ok(['next', 'planned'].includes(g.status), `${w}: status`);
    assert.ok(PACKAGES.includes(g.paeckchen), `${w}: paeckchen ${g.paeckchen}`);
    assert.ok(Array.isArray(g.rules) && g.rules.length >= 3 && g.rules.length <= 8 && g.rules.every((r) => typeof r === 'string' && r.length >= 15 && r.length <= 260), `${w}: 3–8 Regeln`);
    assert.ok(Array.isArray(g.houseRules) && g.houseRules.every((r) => typeof r === 'string' && r.length >= 5), `${w}: houseRules`);
    assert.match(g.art, /^<svg class="game-art" viewBox="0 0 64 64"[^>]*>.*<\/svg>$/s, `${w}: art`);
    assert.ok(!/<script|on\w+=|href=|<image|<foreignObject/i.test(g.art), `${w}: art ohne Skripte und Bilder`);
    if (g.category === 'party') assert.ok(['A', 'B', 'C'].includes(g.bauart), `${w}: Partyspiele brauchen eine Bauart`);
    else assert.equal(g.bauart, undefined, `${w}: Bauart gibt es nur bei Partyspielen`);
    if (g.vorbild !== undefined) assert.ok(typeof g.vorbild === 'string' && g.vorbild.length > 3, `${w}: vorbild`);
  }
});

test('Funktions-Einträge: id, name, type, paeckchen, status, beschreibung – und sie sind keine Spiele', () => {
  assert.ok(features.length >= 4);
  for (const f of features) {
    assert.match(f.id, /^[a-z0-9-]{1,30}$/);
    assert.ok(f.name && f.type === 'feature' && PACKAGES.includes(f.paeckchen) && ['next', 'planned'].includes(f.status), f.id);
    assert.ok(typeof f.beschreibung === 'string' && f.beschreibung.length >= 30, `${f.id}: beschreibung`);
    assert.ok(!('rules' in f) && !('category' in f), `${f.id}: Funktionen haben keine Spielfelder`);
  }
  assert.ok(plannedGames().every((e) => e.type !== 'feature'), 'plannedGames() enthält keine Funktionen');
  assert.equal(plannedGames().length, games.length);
});

test('IDs sind eindeutig und kollidieren nicht mit gebauten Spielen oder Spiel-Ereignissen', () => {
  const ids = PLANNED.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'doppelte ID');
  for (const id of ids) {
    assert.ok(!(id in GAMES), `${id} ist schon gebaut – aus planned.js streichen`);
    assert.ok(!gameEvents().includes(id), `${id} ist ein Spiel-Ereignis`);
  }
  assert.equal(new Set(PLANNED.map((e) => e.name)).size, PLANNED.length, 'doppelter Name');
});

test('Alle Spiele und Funktionen der Liste sind eingetragen – im richtigen Päckchen', () => {
  const want = {
    'solo-zukunft': ['snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3'],
    spaeter: ['stichmeister', 'exploding-deck', 'labyrinth-brett', 'regelwahnsinn', 'jaeger-schatten', 'infektionsjagd', 'letzter-schutzplatz', 'kistenchaos', 'survival-abend', 'chaos-modus',  'schatzinsel', 'gummiband-challenge', 'geschenkfaenger', 'rhythmus-rausch', 'puzzle-panik', 'wortjagd', 'stillgestanden', 'schatzgraeber', 'minenlauf', 'labyrinth-chaos', 'schubsarena', 'scheinwerfer-flucht', 'doppelagent', 'luegenbaron', 'brueckenroulette', 'modifikatoren', 'turmbauer', 'geschenkdiebe', 'fallenbauer', 'reaktor-notfall', 'bomben-duell'],
    gross: ['skat', 'doppelkopf',  'schach', 'staedtehandel', 'gebietskampf', 'party-brett'],
  };
  for (const [p, ids] of Object.entries(want)) {
    assert.deepEqual(PLANNED.filter((e) => e.paeckchen === p).map((e) => e.id), ids, `Päckchen ${p}`);
  }
  assert.equal(PLANNED.length, Object.values(want).flat().length, 'nichts Zusätzliches');
  // Reine Mechanik: keine Original-Grafiken, eigene Namen
  assert.ok(!PLANNED.some((e) => /pummel party|machine party/i.test(e.name)));
});

test('Ohne weiteres nummeriertes Päckchen ist kein Backlog-Spiel vorgezogen', () => {
  assert.deepEqual(PLANNED.filter((e) => e.status === 'next').map((e) => e.id), []);
  assert.ok(PLANNED.every((e) => e.status === 'planned'));
});
