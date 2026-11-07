// Bestenliste über alle Abende (data/leaderboard.json): pro Person und Spiel gespielte Partien, Siege und Punkte –
// insgesamt und je Monat. Seit V2-01 hängt die Statistik an der internen Konto-ID (schemaVersion 2): gleiche Namen sind zwei Personen,
// eine Namensänderung behält die Statistik. Einträge ohne Konto (alter Bestand, Clients ohne Cookie) bleiben unter dem Namen liegen
// (Groß/Klein egal, Leerzeichen am Rand egal) und lassen sich einmalig einem Konto zuordnen (claimedBy) – das ist umkehrbar.
// Eine Partie ist beim Poker eine Hand (Punkte = gewonnene/verlorene Chips), sonst eine Runde (Punkte der Runde).
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreKey } from '../games/variants.js';
import { ACCOUNT_ID } from './account-store.js';

export const LEADERBOARD_SCHEMA = 3;
// V2-03: Ergebnisse je Runde (data.rounds) mit stabiler Runden-ID; Ranked-Wertung nur für eingefrorene, qualifizierte Runden.
export const ROUND_ID = /^[a-f0-9]{16}$/;
export const RANK_PERIODS = ['week', 'month', 'all'];
const WEEK_MS = 7 * 24 * 3600 * 1000;
const MAX_ROUNDS = 50000;

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
  let unreadable = null, migrated = false;
  try { if (existsSync(file)) data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { unreadable = e.message; }
  if (!data || !data.players || typeof data.players !== 'object' || Array.isArray(data.players)) { unreadable ||= 'unerwartete Struktur'; data = { players: {} }; }
  // Die nächste Speicherung ersetzt die Datei: eine unlesbare Datei vorher sichern, damit kein Verlauf verloren geht.
  if (unreadable) {
    console.error('Bestenliste nicht lesbar:', unreadable);
    try { copyFileSync(file, `${file}.unlesbar-${new Date().toISOString().replace(/[:.]/g, '-')}`); }
    catch (e) { console.error('Sicherung der Bestenliste fehlgeschlagen:', e.message); }
  }
  // V2-03: ältere Dateien (schemaVersion < 3) bekommen den Rundenspeicher; der alte Bestand bleibt unverändert und wird vorher einmalig gesichert.
  // Idempotent: ein zweiter Start findet rounds/alias schon vor und ändert nichts.
  if (!unreadable && existsSync(file) && !(data.schemaVersion >= LEADERBOARD_SCHEMA)) {
    const backup = `${file}.pre-v2-03`;
    try { if (!existsSync(backup)) copyFileSync(file, backup); migrated = true; }
    catch (e) { console.error('Sicherung vor V2-03 fehlgeschlagen:', e.message); }
  }
  data.rounds = Object.assign(Object.create(null), data.rounds && typeof data.rounds === 'object' && !Array.isArray(data.rounds) ? data.rounds : {});
  data.alias = Object.assign(Object.create(null), data.alias && typeof data.alias === 'object' && !Array.isArray(data.alias) ? data.alias : {});
  // Spielernamen dürfen auch „constructor“ oder „__proto__“ heißen – ebenso nach dem Laden.
  data.players = Object.assign(Object.create(null), data.players);
  let dirty = migrated;
  const rankedOwner = (id) => { for (let hops = 0; hops < 5 && id; hops++) { const next = data.players[id]?.claimedBy || data.alias[id]; if (!next || next === id) break; id = next; } return id; };
  const periodStart = (period) => (period === 'week' ? now().getTime() - WEEK_MS : period === 'month' ? new Date(now().getFullYear(), now().getMonth(), 1).getTime() : 0);
  const inRange = (r, period) => r.at >= periodStart(period);
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
      data.alias[from] = to;
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

    // V2-03: eine Runde mit Platzierungen. players: [{ accountId, name, bot, win, points }]. Doppelte Runden-IDs zählen nie zweimal.
    // ranked/reason kommen vom Server (beim Rundenstart eingefroren), nie vom Client. lowWins: wenige Punkte sind besser.
    recordRound({ id, game, variant = 'classic', ranked = false, reason = '', players = [], lowWins = false }) {
      if (!ROUND_ID.test(String(id)) || data.rounds[id] || !players.length) return false;
      const list = players.map((p) => ({ a: ACCOUNT_ID.test(p.accountId) && !p.bot ? p.accountId : null, n: String(p.name ?? '').trim().slice(0, 40), bot: !!p.bot, win: !!p.win, pts: Number(p.points) || 0 }));
      const order = [...list].sort((x, y) => (y.win - x.win) || (lowWins ? x.pts - y.pts : y.pts - x.pts));
      order.forEach((p, i) => { p.place = i > 0 && order[i - 1].win === p.win && order[i - 1].pts === p.pts ? order[i - 1].place : i + 1; });
      const humansOnly = list.every((p) => !p.bot), qualified = !!ranked && humansOnly && list.filter((p) => p.a).length >= 2;
      data.rounds[id] = { id, game: scoreKey(game, variant), variant, at: now().getTime(), ranked: qualified, reason: qualified ? '' : String(reason || (humansOnly ? 'zu-wenige' : 'bots')), players: list };
      const keys = Object.keys(data.rounds);
      if (keys.length > MAX_ROUNDS) for (const key of keys.sort((a, b) => data.rounds[a].at - data.rounds[b].at).slice(0, keys.length - MAX_ROUNDS)) delete data.rounds[key];
      dirty = true;
      return true;
    },
    roundCount: () => Object.keys(data.rounds).length,
    round: (id) => data.rounds[id] || null,
    // Nur qualifizierte Ergebnisse. game 'all' = alle Spiele zusammen (dann ohne Punkte, weil Spiele nicht vergleichbar sind).
    // V2-04: Auswertung für ein einzelnes Konto aus der Rundenablage (zusammengeführte Konten zählen mit)
    accountSummary(accountId) {
      const out = { played: 0, wins: 0 };
      for (const r of Object.values(data.rounds)) { if (!r.ranked) continue; for (const p of r.players) if (p.a && !p.bot && rankedOwner(p.a) === accountId) { out.played++; out.wins += p.win ? 1 : 0; } }
      return out;
    },
    accountRounds(accountId, limit = 10) {
      const rows = [];
      for (const r of Object.values(data.rounds)) { const p = r.players.find((x) => x.a && !x.bot && rankedOwner(x.a) === accountId); if (p) rows.push({ game: r.game, at: r.at, ranked: !!r.ranked, win: !!p.win, place: p.place, points: p.pts, players: r.players.length }); }
      return rows.sort((a, b) => b.at - a.at).slice(0, limit);
    },
    rankedTable(game = 'all', period = 'all', lowWins = false, { withOwner = false } = {}) {
      const rows = new Map();
      for (const r of Object.values(data.rounds)) {
        if (!r.ranked || !inRange(r, period) || (game !== 'all' && r.game !== game)) continue;
        for (const p of r.players) {
          if (!p.a || p.bot) continue;
          const owner = rankedOwner(p.a), row = rows.get(owner) || { name: '', played: 0, wins: 0, points: 0, placeSum: 0, at: 0 };
          if (r.at >= row.at) { row.at = r.at; row.name = data.players[owner]?.name || p.n; }
          row.played++; row.wins += p.win ? 1 : 0; row.points += p.pts; row.placeSum += p.place; rows.set(owner, row);
        }
      }
      return [...rows.entries()].map(([owner, { placeSum, at, ...row }]) => ({ ...(withOwner ? { owner } : {}), ...row, avgPlace: Math.round((placeSum / row.played) * 10) / 10, points: game === 'all' ? null : row.points }))
        .sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played || a.avgPlace - b.avgPlace || (game === 'all' ? 0 : lowWins ? a.points / a.played - b.points / b.played : b.points - a.points) || a.name.localeCompare(b.name, 'de'));
    },
    // Wie viele Runden im Zeitraum nicht gewertet wurden und warum (für die ehrliche Anzeige)
    rankedSummary(game = 'all', period = 'all') {
      const out = { ranked: 0, notRanked: 0, reasons: {} };
      for (const r of Object.values(data.rounds)) {
        if (!inRange(r, period) || (game !== 'all' && r.game !== game)) continue;
        if (r.ranked) out.ranked++; else { const k = r.reason || 'unbekannt'; out.notRanked++; out.reasons[k] = (out.reasons[k] || 0) + 1; }
      }
      return out;
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
