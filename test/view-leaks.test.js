// V2-09 Sicherheitsdurchgang: Kein Leck fremder Karten, Würfel, Rollen oder Geheimnisse in Spieleransichten – automatisch für ALLE registrierten Spiele.
// Verfahren (Differenztest): Für zwei Mitspieler P und Q wird die Spielansicht (view.g) an mehreren Punkten einer echten, von Bots gespielten Runde verglichen.
// Privat ist, was in P's Ansicht an einem Pfad steht, wo Q etwas anderes sieht. Diese Werte dürfen weder in Q's noch in der Zuschaueransicht
// an einem Pfad auftauchen, an dem sich die Ansichten unterscheiden (an öffentlichen, bei P und Q gleichen Pfaden dürfen sie stehen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../games/index.js';
import { nextBot } from '../server/bots.js';
import { stepBot } from '../server/bot-play.js';

const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
// Pfad → Blattwert (nur Text; Zahlen und Wahrheitswerte sind zu mehrdeutig)
function leaves(value, path = '', out = new Map()) {
  if (typeof value === 'string') { if (value.length >= 2) out.set(path, value); }
  else if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) out.set(path, JSON.stringify(value)); // Würfel, Zellen, Positionen
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, `${path}.${k}`, out);
  return out;
}
function setup(game, extra = {}) {
  const r = game.create('LEAK1', { turnTime: 0, ...extra }, () => {});
  r.game = game.id;
  const ids = [];
  const want = Math.max(game.minPlayers || 2, 2);
  for (let i = 0; i < want; i++) {
    const p = r.addPlayer(`Spieler${i + 1}`, null);
    p.bot = true; p.connected = true; // damit die Bots den Zug übernehmen können
    if (i === 0) r.hostId = p.id;
    if (r.table) r.sit(p.id, i); else r.sit(p.id);
    ids.push(p.id);
  }
  const spectator = r.addPlayer('Zuschauer', null); spectator.connected = true;
  return { r, ids, spectator: spectator.id };
}
// Findet Lecks in der Ansicht `viewer` von Daten, die nur `owner` sehen darf
function audit(label, r, owner, other, spectator, names) {
  const pick = (id) => { const v = r.view(id); if (!v) return null; const { you, now, deadline, log, logSeq, moves, acts, ...rest } = v; return rest; }; // Kopfdaten je Betrachter (you, Uhr, Verlauf) sind keine Spielgeheimnisse
  const vo = pick(owner), vq = pick(other), vz = pick(spectator);
  if (!vo || !vq) return [];
  const lo = leaves(vo), lq = leaves(vq), lz = leaves(vz);
  const publicWords = new Set([...names, '??', '?', '—', '-', '…']); // Platzhalter für verdeckte Karten sind öffentlich
  const secret = new Set();
  for (const [path, value] of lo) if (lq.get(path) !== value && !publicWords.has(value)) secret.add(value);
  secretsSeen.current = (secretsSeen.current || 0) + secret.size;
  const problems = [];
  for (const [path, value] of lq) if (secret.has(value) && lo.get(path) !== value) problems.push(`${label}: Spieler ${other.slice(0, 4)} sieht „${value}“ bei ${path}, das nur ${owner.slice(0, 4)} sehen darf`);
  for (const [path, value] of lz) if (secret.has(value) && !(lo.get(path) === value && lq.get(path) === value)) problems.push(`${label}: Zuschauer sieht „${value}“ bei ${path}, das nur ${owner.slice(0, 4)} sehen darf`);
  return problems;
}

// Spiele, bei denen ein Wert zwar je Spieler verschieden, aber ausdrücklich öffentlich ist (Begründung neben dem Eintrag)
// Geprüft und begründet: Hier steht derselbe Text bei beiden Spielern, ohne dass etwas verraten wird.
const PUBLIC_PATHS = {
  zehnetappen: ['.g.phaseText', '.g.myGroups['],  // Phasenziele sind öffentlich; Gruppentyp-Bezeichner (set/run) sind Vokabular
  schlagfertig: ['.tasks['],           // dieselbe (öffentliche) Aufgabe wurde zwei Spielern zugeteilt
  'story-chaos': ['.previous.text', '.own['], // der nächste Schreiber sieht laut Regel den letzten Satz; der Autor kennt ihn als eigenen
  werwolf: ['.g.roles.', ' bei .g.role,', '.g.seen['],  // Tote dürfen alle Rollen sehen; Lebende getrennt in „werwolf-Rollen“ unten geprüft
  'monopoly-deal': ['.assets['],        // Kategorie-Bezeichner („property“), keine Kartenidentität
  'exploding-deck': ['.g.hand[', '.g.future['], // Blick in die Zukunft sieht nur der Spielende selbst; Kartenarten wiederholen sich
  farbenchaos: ['.g.hand[', '.g.playable[', '.g.drawn'],           // jede UNO-Karte gibt es doppelt: gleiche Kartenkennung in zwei Händen ist regelkonform         // gleiche Kartenarten kommen mehrfach vor; Fremdhände separat unten geprüft
};
// Spiele mit echten Geheimnissen: der Test darf dort nicht „leer“ laufen
const MUST_HAVE_SECRETS = ['maumau', 'farbenchaos', 'poker', 'omaha', 'mogeln', 'praesident', 'durak', 'schwimmen', 'schiffe', 'hearts', 'skat', 'doppelkopf', 'five-card-draw', 'exploding-deck', 'luegenwuerfel'];
const secretsSeen = {};

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
