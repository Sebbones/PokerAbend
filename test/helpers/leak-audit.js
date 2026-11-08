// Gemeinsame Bausteine der Leck-Prüfung (test/view-leaks.test.js, test/all-games.test.js): seeded Zufall, Raum-Aufbau mit Bots,
// Differenz-Audit der Ansichten und die dokumentierten Ausnahmen. Siehe Kommentar in view-leaks.test.js zum Verfahren.
export const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
// Pfad → Blattwert (nur Text; Zahlen und Wahrheitswerte sind zu mehrdeutig)
export function leaves(value, path = '', out = new Map()) {
  if (typeof value === 'string') { if (value.length >= 2) out.set(path, value); }
  else if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) out.set(path, JSON.stringify(value)); // Würfel, Zellen, Positionen
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, `${path}.${k}`, out);
  return out;
}
export function setup(game, extra = {}) {
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
export function audit(label, r, owner, other, spectator, names) {
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
export const PUBLIC_PATHS = {
  'wer-bin-ich': ['.g.words.'],       // Stirn-Zettel: alle außer dem Besitzer sehen den Begriff (auch Zuschauer); die Gegenregel prüft test/all-games.test.js
  zehnetappen: ['.g.phaseText', '.g.myGroups['],  // Phasenziele sind öffentlich; Gruppentyp-Bezeichner (set/run) sind Vokabular
  schlagfertig: ['.tasks['],           // dieselbe (öffentliche) Aufgabe wurde zwei Spielern zugeteilt
  'story-chaos': ['.previous.text', '.own['], // der nächste Schreiber sieht laut Regel den letzten Satz; der Autor kennt ihn als eigenen
  werwolf: ['.g.roles.', ' bei .g.role,', '.g.seen['],  // Tote dürfen alle Rollen sehen; Lebende getrennt in „werwolf-Rollen“ unten geprüft
  'monopoly-deal': ['.assets['],        // Kategorie-Bezeichner („property“), keine Kartenidentität
  'exploding-deck': ['.g.hand[', '.g.future['], // Blick in die Zukunft sieht nur der Spielende selbst; Kartenarten wiederholen sich
  farbenchaos: ['.g.hand[', '.g.playable[', '.g.drawn'],           // jede UNO-Karte gibt es doppelt: gleiche Kartenkennung in zwei Händen ist regelkonform         // gleiche Kartenarten kommen mehrfach vor; Fremdhände separat unten geprüft
};
// Spiele mit echten Geheimnissen: der Test darf dort nicht „leer“ laufen
export const MUST_HAVE_SECRETS = ['maumau', 'farbenchaos', 'poker', 'omaha', 'mogeln', 'praesident', 'durak', 'schwimmen', 'schiffe', 'hearts', 'skat', 'doppelkopf', 'five-card-draw', 'exploding-deck', 'luegenwuerfel'];
export const secretsSeen = {};
