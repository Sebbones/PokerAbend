// Bestenliste über alle Abende (data/leaderboard.json): pro Person und Spiel gespielte Partien, Siege und Punkte –
// insgesamt und je Monat. Wiedererkennung über den Namen (Groß/Klein egal, Leerzeichen am Rand egal).
// Eine Partie ist beim Poker eine Hand (Punkte = gewonnene/verlorene Chips), sonst eine Runde (Punkte der Runde).
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreKey } from '../games/variants.js';

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

  return {
    // Nur Statistik-Kopien: Erfolge benutzen dieselbe Identität und keine zweite Ergebnisdatei.
    profile(name) {
      const p = data.players[nameKey(name)];
      const games = new Map();
      for (const [key, g] of Object.entries(p?.games || {})) {
        const id = key.split('~')[0], row = games.get(id) || { id, played: 0, wins: 0, months: [] };
        row.played += g.played; row.wins += g.wins; row.months = [...new Set([...row.months, ...Object.entries(g.months || {}).filter(([, s]) => s.played > 0).map(([m]) => m)])]; games.set(id, row);
      }
      return { name: p?.name || String(name || '').trim(), games: [...games.values()] };
    },
    names(query = '') {
      const q = nameKey(query);
      return Object.values(data.players).map((p) => p.name).filter((name) => nameKey(name).includes(q)).sort((a, b) => a.localeCompare(b, 'de'));
    },
    // entries: [{ name, win, points }] – alle, die die Partie mitgespielt haben
    record(game, entries, variant = 'classic') {
      game = scoreKey(game, variant);
      const m = monthOf(now());
      for (const e of entries || []) {
        const k = nameKey(e?.name);
        if (!k) continue;
        const p = (data.players[k] ||= { name: e.name, games: {} });
        p.name = String(e.name).trim(); // zuletzt benutzte Schreibweise
        const g = (p.games[game] ||= { ...empty(), months: {} });
        add(g, e);
        add((g.months[m] ||= empty()), e);
      }
      dirty = true;
    },

    // Zeilen für ein Spiel – insgesamt (period 'all') oder für einen Monat ('2026-10')
    table(game, period = 'all') {
      const rows = [];
      for (const p of Object.values(data.players)) {
        const g = p.games?.[game];
        const t = g && (period === 'all' ? g : g.months?.[period]);
        if (t?.played) rows.push({ name: p.name, played: t.played, wins: t.wins, points: t.points });
      }
      return rows;
    },

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
      writeFileSync(file + '.tmp', JSON.stringify(data));
      renameSync(file + '.tmp', file);
      dirty = false;
    },
  };
}
