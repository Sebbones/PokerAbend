import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROADMAP, resolvedRoadmap } from '../games/roadmap.js';
import { PLANNED } from '../games/planned.js';

test('Roadmap: gültige Stufen und Arten, eindeutige IDs und Abschlussdaten', () => {
  const stages = ['jetzt', 'naechstes', 'danach', 'spaeter', 'gross', 'erledigt'];
  const arts = ['spiel', 'funktion', 'design', 'discord', 'betrieb', 'fehler'];
  const list = resolvedRoadmap();
  assert.equal(new Set(list.map((e) => e.id)).size, list.length);
  const points = list.flatMap((e) => e.punkte);
  assert.equal(new Set(points.map((p) => p.id)).size, points.length);
  for (const e of list) {
    assert.ok(stages.includes(e.stufe) && e.titel && e.satz, e.id);
    if (e.stufe === 'erledigt') { assert.match(e.datum, /^\d{4}-\d{2}-\d{2}$/); assert.ok(e.punkte.every((p) => p.erledigt)); }
    for (const p of e.punkte) { assert.ok(p.id && p.titel && p.text && arts.includes(p.art), p.id); if (p.art === 'spiel') assert.match(p.spiel.art, /^<svg/); }
  }
  assert.equal(ROADMAP.filter((e) => e.stufe === 'jetzt').length, 1);
});

test('Jeder Backlog-Eintrag kommt genau einmal vor, mit automatisch übernommenen Informationen', () => {
  const points = resolvedRoadmap().flatMap((e) => e.punkte);
  for (const planned of PLANNED) {
    const matches = points.filter((p) => p.plannedId === planned.id);
    assert.equal(matches.length, 1, planned.id);
    assert.equal(matches[0].titel, planned.name);
    assert.equal(matches[0].text, planned.beschreibung || planned.description);
  }
  for (const [pkg, target] of [['spaeter', 'spaetere-spiele'], ['gross', 'grosse-projekte'], ['unbekannt', 'spaetere-spiele']]) {
    const added = { id: 'zukunft', name: 'Neue Idee', type: 'feature', paeckchen: pkg, beschreibung: 'Ein automatisch zugeordneter Backlog-Eintrag.' };
    const resolved = resolvedRoadmap([...PLANNED, added]);
    assert.equal(resolved.find((e) => e.id === target).punkte.filter((p) => p.id === 'zukunft').length, 1);
  }
  assert.ok(!points.some((p) => p.titel === 'Stille Post Deluxe'));
  const extras = resolvedRoadmap().find((e) => e.id === 'poker-extras').punkte;
  assert.ok(extras.find((p) => p.id === 'pre-actions').erledigt);
  assert.ok(extras.find((p) => p.id === 'turnier-blinds').erledigt);
  assert.ok(!extras.find((p) => p.id === 'time-bank').erledigt);
});

test('Öffentliche Roadmap enthält die geplanten V2-Wünsche ohne Doppelungen oder falsche Fertigmeldungen', () => {
  const sections = resolvedRoadmap();
  const points = sections.flatMap((section) => section.punkte);
  const byId = new Map(points.map((item) => [item.id, item]));
  const games = [['gebietskampf', /Risiko/], ['staedtehandel', /Catan/]];
  for (const [id, title] of games) {
    const matches = points.filter((item) => item.id === id);
    assert.equal(matches.length, 1, id + ' steht genau einmal im Backlog');
    assert.match(byId.get(id).titel, title);
    assert.equal(byId.get(id).art, 'spiel');
    assert.ok(!byId.get(id).erledigt);
  }
  const features = [
    'discord-1', 'discord-3', 'discord-4', 'discord-5', 'discord-6',
    'v2-liquid-glass', 'v2-einstellungen', 'v2-online-verbessern',
    'v2-erfolge-ausbauen', 'v2-bot-schwierigkeit',
    'v2-admin-rueckblicke', 'v2-admin-bestenlisten', 'v2-admin-sicherheit',
  ];
  for (const id of features) {
    assert.ok(byId.has(id), 'Fehlender V2-Roadmap-Eintrag: ' + id);
    // Only explicitly authorized implementations are completed; all other wishes stay planned.
    assert.equal(!!byId.get(id).erledigt, ['discord-1', 'discord-3', 'discord-4', 'v2-bot-schwierigkeit'].includes(id), id);
  }
  for (const id of ['v2-spielerkomfort', 'v2-admin-verwaltung', 'discord-login']) {
    assert.equal(sections.find((section) => section.id === id)?.stufe, 'spaeter');
  }
  assert.equal(new Set(points.map((item) => item.id)).size, points.length);
});
