// Bestenliste über alle Abende (data/leaderboard.json): pro Person und Spiel gespielte Partien, Siege und Punkte –
// insgesamt und je Monat. Seit V2-01 hängt die Statistik an der internen Konto-ID (schemaVersion 2): gleiche Namen sind zwei Personen,
// eine Namensänderung behält die Statistik. Einträge ohne Konto (alter Bestand, Clients ohne Cookie) bleiben unter dem Namen liegen
// (Groß/Klein egal, Leerzeichen am Rand egal) und lassen sich einmalig einem Konto zuordnen (claimedBy) – das ist umkehrbar.
// Eine Partie ist beim Poker eine Hand (Punkte = gewonnene/verlorene Chips), sonst eine Runde (Punkte der Runde).
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreKey } from '../games/variants.js';
import { ACCOUNT_ID } from './account-store.js';

export const LEADERBOARD_SCHEMA = 2;

export const nameKey = (name) => String(name ?? '').trim().toLowerCase();
const monthOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const empty = () => ({ played: 0, wins: 0, points: 0 });
function add(t, e) {
  t.played++;
  if (e.win) t.wins++;
  t.points += Number(e.points) || 0;
}

export function createLeaderboard(dataDir, { now = () => new Date() } = {}) {
  const file = join(dataDir, 'leaderboard.json');
  let data = { players: {} };
  let unreadable = null;
  try { if (existsSync(file)) data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { unreadable = e.message; }
  if (!data || !data.players || typeof data.players !== 'object' || Array.isArray(data.players)) { unreadable ||= 'unerwartete Struktur'; data = { players: {} }; }
  // Die nächste Speicherung ersetzt die Datei: eine unlesbare Datei vorher sichern, damit kein Verlauf verloren geht.
  if (unreadable) {
    console.error('Bestenliste nicht lesbar:', unreadable);
    try { copyFileSync(file, `${file}.unlesbar-${new Date().toISOString().replace(/[:.]/g, '-')}`); }
    catch (e) { console.error('Sicherung der Bestenliste fehlgeschlagen:', e.message); }
  }
  // Spielernamen dürfen auch „constructor“ oder „__proto__“ heißen – ebenso nach dem Laden.
  data.players = Object.assign(Object.create(null), data.players);
  let dirty = false;
  // Wem gehört ein Eintrag? Einem Konto zugeordnete oder zusammengeführte Einträge zählen zu diesem Konto.
  const ownerOf = (key) => data.players[key]?.claimedBy || key;
  const nameOfOwner = (key) => data.players[ownerOf(key)]?.name ?? data.players[key].name;
  const ownerRows = (period, game) => {
    const rows = new Map();
    for (const [key, p] of Object.entries(data.players)) {
      const g = p.games?.[game];
      const t = g && (period === 'all' ? g : g.months?.[period]);
      if (!t?.played) continue;
      const owner = ownerOf(key), row = rows.get(owner) || { name: nameOfOwner(key), played: 0, wins: 0, points: 0 };
      row.played += t.played; row.wins += t.wins; row.points += t.points; rows.set(owner, row);
    }
    return [...rows.values()];
  };

  return {
    // Nur Statistik-Kopien: Erfolge benutzen dieselbe Identität und keine zweite Ergebnisdatei.
    // ref: ein Name (alle gleichnamigen Personen zusammen) oder { accountId, name } (genau dieses Konto)
    profile(ref) {
      const byAccount = ref && typeof ref === 'object' && ACCOUNT_ID.test(ref.accountId) ? ref.accountId : null;
      const name = ref && typeof ref === 'object' ? ref.name : ref;
      const wanted = nameKey(name), games = new Map();
      let shown = null;
      for (const [key, p] of Object.entries(data.players)) {
        const owner = ownerOf(key);
        if (byAccount ? owner !== byAccount : nameKey(nameOfOwner(key)) !== wanted) continue;
        shown ||= nameOfOwner(key);
        for (const [gameKey, g] of Object.entries(p.games || {})) {
          const id = gameKey.split('~')[0], row = games.get(id) || { id, played: 0, wins: 0, months: [] };
          row.played += g.played; row.wins += g.wins; row.months = [...new Set([...row.months, ...Object.entries(g.months || {}).filter(([, s]) => s.played > 0).map(([m]) => m)])]; games.set(id, row);
        }
      }
      const given = String(name || '').trim();
      return { name: byAccount ? given || data.players[byAccount]?.name || shown || '' : shown || given, games: [...games.values()] };
    },
    names(query = '') {
      const q = nameKey(query);
      return [...new Set(Object.keys(data.players).map(nameOfOwner))].filter((name) => nameKey(name).includes(q)).sort((a, b) => a.localeCompare(b, 'de'));
    },
    // Alter Bestand ohne Konto, den noch niemand übernommen hat
    legacyNames() {
      return Object.entries(data.players).filter(([, p]) => !p.accountId && !p.claimedBy).map(([, p]) => {
        let played = 0, wins = 0;
        for (const g of Object.values(p.games || {})) { played += g.played || 0; wins += g.wins || 0; }
        return { name: p.name, played, wins };
      }).filter((row) => row.played > 0).sort((a, b) => b.played - a.played || a.name.localeCompare(b.name, 'de'));
    },
    // Wer zuerst übernimmt, bekommt den alten Namen; der Eintrag selbst bleibt unverändert liegen.
    claim(name, accountId, accountName = '') {
      const key = nameKey(name), p = data.players[key];
      if (!ACCOUNT_ID.test(accountId) || !p || p.accountId) return { ok: false, error: 'Diesen alten Namen gibt es nicht' };
      if (p.claimedBy) return { ok: false, error: 'Dieser alte Name wurde schon übernommen' };
      p.claimedBy = accountId; p.claimedAt = now().getTime(); p.claimKind = 'legacy';
      data.players[accountId] ||= { name: String(accountName || p.name).trim(), games: {}, accountId };
      dirty = true;
      return { ok: true, name: p.name };
    },
    claims() {
      return Object.entries(data.players).filter(([, p]) => p.claimKind === 'legacy' && p.claimedBy)
        .map(([key, p]) => ({ key, name: p.name, claimedBy: p.claimedBy, claimedAt: p.claimedAt, by: data.players[p.claimedBy]?.name || '' }));
    },
    // Verwaltung: falsche Zuordnung rückgängig machen (der Eintrag war nie verändert)
    unclaim(key) {
      const p = data.players[key];
      if (!p || p.claimKind !== 'legacy' || !p.claimedBy) return null;
      const info = { name: p.name, claimedBy: p.claimedBy };
      delete p.claimedBy; delete p.claimedAt; delete p.claimKind; dirty = true;
      return info;
    },
    // Zweites Gerät: alles, was dem alten Konto gehörte, gehört danach dem Ziel
    merge(from, to, toName = '') {
      if (!ACCOUNT_ID.test(from) || !ACCOUNT_ID.test(to) || from === to) return false;
      for (const [key, p] of Object.entries(data.players)) if (p.claimedBy === from) p.claimedBy = to;
      const own = data.players[from];
      if (own) { own.claimedBy = to; own.claimKind = 'merge'; own.claimedAt = now().getTime(); }
      data.players[to] ||= { name: String(toName || own?.name || '').trim(), games: {}, accountId: to };
      dirty = true;
      return true;
    },
    // entries: [{ name, win, points }] – alle, die die Partie mitgespielt haben
    record(game, entries, variant = 'classic') {
      game = scoreKey(game, variant);
      const m = monthOf(now());
      for (const e of entries || []) {
        if (e?.bot) continue; // Computer-Mitspieler sind nie Personen
        const account = ACCOUNT_ID.test(e?.accountId) ? e.accountId : null;
        const k = account || nameKey(e?.name);
        if (!k || !nameKey(e?.name)) continue;
        const p = (data.players[k] ||= account ? { name: e.name, games: {}, accountId: account } : { name: e.name, games: {} });
        p.name = String(e.name).trim(); // zuletzt benutzte Schreibweise
        const g = (p.games[game] ||= { ...empty(), months: {} });
        add(g, e);
        add((g.months[m] ||= empty()), e);
      }
      dirty = true;
    },

    // Zeilen für ein Spiel – insgesamt (period 'all') oder für einen Monat ('2026-10')
    table(game, period = 'all') { return ownerRows(period, game); },

    // Monate mit Einträgen, neueste zuerst
    months() {
      const set = new Set();
      for (const p of Object.values(data.players)) for (const g of Object.values(p.games || {})) for (const m of Object.keys(g.months || {})) set.add(m);
      return [...set].sort().reverse();
    },

    currentMonth: () => monthOf(now()),

    save() {
      if (!dirty) return;
      mkdirSync(dataDir, { recursive: true });
      data.schemaVersion = LEADERBOARD_SCHEMA;
      writeFileSync(file + '.tmp', JSON.stringify(data));
      renameSync(file + '.tmp', file);
      dirty = false;
    },
  };
}
