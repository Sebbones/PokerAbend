// Feature-Flags (V2-10): Funktionen und einzelne Spiele lassen sich ein- und ausschalten – über die .env oder zur Laufzeit in /admin.
//
// Reihenfolge (die erste Quelle, die etwas sagt, gewinnt):
//   1. Admin-Einstellung (data/features.json, gesetzt unter /admin → Funktionen)
//   2. .env-Variable   FEATURE_DISCORD, FEATURE_RANKED, FEATURE_CAMERA (on/off) bzw. DISABLED_GAMES (Liste von Spiel-IDs)
//   3. sicherer Standard: Discord an (wirkt nur, wenn Discord eingerichtet ist), Ranked an, Kamera AUS, alle Spiele an
//
// Ausschalten ändert nie Daten: Konten, Ergebnisse, Tische und Verläufe bleiben erhalten. Laufende Tische eines abgeschalteten Spiels
// werden nicht abgebrochen; es lassen sich nur keine neuen anlegen und das Spiel verschwindet aus den Listen.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FLAGS = {
  discord: { env: 'FEATURE_DISCORD', label: 'Anmeldung mit Discord', fallback: true, hint: 'Aus: kein Discord-Knopf, die Discord-Routen antworten 404, Discord-Sitzungen geben keinen Zugang mehr. Wirkt nur, wenn Discord in der .env eingerichtet ist.' },
  ranked: { env: 'FEATURE_RANKED', label: 'Ranked-Wertung', fallback: true, hint: 'Aus: neue Runden zählen nicht für die Ranked-Bestenliste (Grund „ausgeschaltet“). Die alte Namensstatistik läuft weiter, bisherige Ranked-Ergebnisse bleiben erhalten.' },
  camera: { env: 'FEATURE_CAMERA', label: 'Kamera / Video (für später)', fallback: false, hint: 'Noch ohne Wirkung: reserviert für die spätere Video-Funktion. Standard ist aus.' },
};
export const FLAG_NAMES = Object.keys(FLAGS);
const FILE = 'features.json';
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** on/off/true/false/1/0/ja/nein → Wahrheitswert; alles andere (auch leer) → null */
export function parseSwitch(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'ja', 'an'].includes(v)) return true;
  if (['off', 'false', '0', 'no', 'nein', 'aus'].includes(v)) return false;
  return null;
}
export function parseGameList(value) {
  return [...new Set(String(value ?? '').split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => ID.test(s)))];
}

export function createFeatures({ dir, env = process.env, knownGames = [], warn = (text) => console.warn(text) } = {}) {
  const known = new Set(knownGames);
  const envFlag = {};
  for (const [name, def] of Object.entries(FLAGS)) {
    const raw = env[def.env];
    const parsed = parseSwitch(raw);
    if (raw !== undefined && String(raw).trim() !== '' && parsed === null) warn(`${def.env}="${raw}" ist kein gültiger Wert (on/off) – der Standard gilt.`);
    envFlag[name] = parsed;
  }
  const envOff = parseGameList(env.DISABLED_GAMES);
  for (const id of envOff) if (known.size && !known.has(id)) warn(`DISABLED_GAMES: „${id}“ ist kein bekanntes Spiel und wird ignoriert.`);

  const file = dir ? join(dir, FILE) : null;
  let saved = { flags: {}, games: {} };
  if (file && existsSync(file)) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      for (const name of FLAG_NAMES) if (typeof data?.flags?.[name] === 'boolean') saved.flags[name] = data.flags[name];
      for (const [id, value] of Object.entries(data?.games || {})) if (ID.test(id) && typeof value === 'boolean') saved.games[id] = value;
    } catch (error) { warn(`${FILE} ist nicht lesbar und wird ignoriert (Datei bleibt unverändert): ${error.message}`); }
  }
  const persist = () => {
    if (!file) return;
    writeFileSync(file + '.tmp', JSON.stringify({ version: 1, flags: saved.flags, games: saved.games }, null, 2), { mode: 0o600 });
    renameSync(file + '.tmp', file);
  };

  const flagSource = (name) => (name in saved.flags ? 'admin' : envFlag[name] !== null ? 'env' : 'standard');
  const flagValue = (name) => (name in saved.flags ? saved.flags[name] : envFlag[name] !== null ? envFlag[name] : FLAGS[name].fallback);
  const gameSource = (id) => (id in saved.games ? 'admin' : envOff.includes(id) ? 'env' : 'standard');
  const gameOn = (id) => (id in saved.games ? saved.games[id] : !envOff.includes(id));
  const check = (name) => { if (typeof name !== 'string' || !Object.hasOwn(FLAGS, name)) throw Object.assign(new Error('Diese Funktion gibt es nicht'), { status: 404 }); };
  const checkGame = (id) => { if (typeof id !== 'string' || !ID.test(id) || (known.size && !known.has(id))) throw Object.assign(new Error('Dieses Spiel gibt es nicht'), { status: 404 }); };

  return {
    enabled: (name) => { check(name); return flagValue(name); },
    gameEnabled: (id) => gameOn(id),
    /** Spielliste ohne abgeschaltete Spiele (Einträge mit id) */
    filterGames: (list) => list.filter((g) => gameOn(g.id)),
    disabledGames: () => [...known].filter((id) => !gameOn(id)),
    // Für /admin: alles auf einen Blick, mit Quelle (admin | env | standard) und dem Wert, auf den „zurücksetzen“ führt
    describe() {
      return {
        flags: FLAG_NAMES.map((name) => ({ name, label: FLAGS[name].label, hint: FLAGS[name].hint, value: flagValue(name), source: flagSource(name), envName: FLAGS[name].env, baseline: envFlag[name] !== null ? envFlag[name] : FLAGS[name].fallback })),
        games: [...known].sort().map((id) => ({ id, enabled: gameOn(id), source: gameSource(id), baseline: !envOff.includes(id) })),
      };
    },
    // value true/false setzt die Admin-Einstellung, null nimmt sie zurück (dann gilt .env bzw. Standard)
    set(name, value) {
      check(name);
      if (value !== null && typeof value !== 'boolean') throw Object.assign(new Error('Bitte an oder aus angeben'), { status: 400 });
      const before = flagValue(name);
      if (value === null) delete saved.flags[name]; else saved.flags[name] = value;
      persist();
      return { name, value: flagValue(name), changed: before !== flagValue(name), source: flagSource(name) };
    },
    setGame(id, value) {
      checkGame(id);
      if (value !== null && typeof value !== 'boolean') throw Object.assign(new Error('Bitte an oder aus angeben'), { status: 400 });
      const before = gameOn(id);
      if (value === null) delete saved.games[id]; else saved.games[id] = value;
      persist();
      return { id, enabled: gameOn(id), changed: before !== gameOn(id), source: gameSource(id) };
    },
  };
}
