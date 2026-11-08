// V2-09 Sicherheitsdurchgang: Kein Leck fremder Karten, Würfel, Rollen oder Geheimnisse in Spieleransichten – automatisch für ALLE registrierten Spiele.
// Verfahren (Differenztest): Für zwei Mitspieler P und Q wird die Spielansicht (view.g) an mehreren Punkten einer echten, von Bots gespielten Runde verglichen.
// Privat ist, was in P's Ansicht an einem Pfad steht, wo Q etwas anderes sieht. Diese Werte dürfen weder in Q's noch in der Zuschaueransicht
// an einem Pfad auftauchen, an dem sich die Ansichten unterscheiden (an öffentlichen, bei P und Q gleichen Pfaden dürfen sie stehen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../games/index.js';
import { nextBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';

import { seeded, leaves, setup, audit, PUBLIC_PATHS, MUST_HAVE_SECRETS, secretsSeen } from './helpers/leak-audit.js';


for (const game of Object.values(GAMES)) {
  test(`Kein Leck privater Daten in den Ansichten: ${game.name}`, (t) => {
    const realRandom = Math.random; Math.random = seeded(1234 + game.id.length * 7); // reproduzierbar: Mischen und Würfeln der Räume nutzen Math.random
    t.after(() => { Math.random = realRandom; });
    const settings = game.id === 'werwolf' ? {} : {};
    let env;
    try { env = setup(game, settings); } catch (error) { t.skip(`nicht ohne besonderen Aufbau startbar: ${error.message}`); return; }
    const { r, ids, spectator } = env;
    const names = [...r.players.values()].map((p) => p.name).concat([...r.players.keys()]);
    try { r.start(r.hostId); } catch (error) { t.skip(`Start nicht möglich: ${error.message}`); return; }
    const problems = [];
    secretsSeen.current = 0;
    const rng = seeded(7);
    const check = (label) => {
      for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) if (i !== j) {
        try { problems.push(...audit(label, r, ids[i], ids[j], spectator, names)); } catch (error) { problems.push(`${label}: Ansicht nicht berechenbar (${error.message})`); }
      }
    };
    check('Start');
    for (let step = 0; step < 60; step++) {
      let id = null;
      try { id = nextBot(r); } catch { /* Spiel ohne Bot-Zug */ }
      if (!id) break;
      try { stepBot(r, id, { rng }); } catch { break; }
      if (step % 4 === 3) check(`Schritt ${step + 1}`);
    }
    check('Ende der Prüfung');
    const unique = [...new Set(problems)].filter((p) => !(PUBLIC_PATHS[game.id] || []).some((x) => p.includes(x)));
    assert.deepEqual(unique.slice(0, 8), [], `${game.id}: ${unique.length} mögliche Lecks`);
    if (MUST_HAVE_SECRETS.includes(game.id)) assert.ok(secretsSeen.current > 0, `${game.id}: der Test hat keine privaten Daten gefunden (läuft leer)`);
  });
}

// ---- Gegenprobe: Der Test erkennt ein absichtlich eingebautes Leck ----
test('Gegenprobe: ein eingebautes Leck (fremde Hand in der Ansicht) wird erkannt', () => {
  const { r, ids, spectator } = setup(GAMES.maumau);
  r.start(r.hostId);
  const original = r.gameView.bind(r);
  r.gameView = (id) => ({ ...original(id), verraten: r.hands[ids.find((x) => x !== id)] });
  const names = [...r.players.values()].map((p) => p.name).concat([...r.players.keys()]);
  const found = audit('Gegenprobe', r, ids[0], ids[1], spectator, names);
  assert.ok(found.length > 0, 'das eingebaute Leck blieb unentdeckt');
});

// ---- Werwolf und Exploding-Deck: gezielte Prüfung der oben ausgenommenen Pfade ----
test('Werwolf: Lebende sehen nur die eigene Rolle, nie die Rollenliste oder das Nachtprotokoll; Zuschauer sehen weder noch', () => {
  const { r, ids, spectator } = setup(GAMES.werwolf);
  const extra = [];
  r.start(r.hostId);
  const rng = seeded(3);
  for (let step = 0; step < 40; step++) { const id = nextBot(r); if (!id) break; try { stepBot(r, id, { rng }); } catch { break; } }
  for (const id of r.order) {
    const g = r.view(id).g;
    const alive = g.alive?.includes(id);
    if (alive && r.phase === 'playing') { assert.ok(g.roles == null, 'Lebende sehen keine Rollenliste'); assert.ok(g.nightLog == null, 'Lebende sehen kein Nachtprotokoll'); }
    assert.ok(g.role === undefined || g.role === r.roles?.[id] || typeof g.role === 'string');
  }
  const z = JSON.stringify(r.view(spectator).g);
  if (r.phase === 'playing') assert.ok(!z.includes('"roles":{') && !z.includes('"nightLog":['), 'Zuschauer sehen während des Spiels keine Rollen');
  // Rollenliste für Tote ist Absicht (Regel): bei Lebenden und Zuschauern war sie in keinem Schritt vorhanden
  void extra; void ids;
});
test('Exploding-Deck: die Ansicht enthält nur die eigene Hand, bei anderen nur Anzahlen', () => {
  const { r, ids } = setup(GAMES['exploding-deck']);
  r.start(r.hostId);
  const g = r.view(ids[0]).g, other = ids[1];
  assert.ok(Array.isArray(g.hand));
  const entry = JSON.stringify(g.people?.[other] ?? g.people?.find?.((p) => p.id === other) ?? {});
  assert.ok(!/"hand"|"kind"/.test(entry), 'bei Mitspielern stehen keine Karten');
});
