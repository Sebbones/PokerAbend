// Archiviert ausschließlich öffentliche Wertungen, keine Raum-Tokens, Hände, Rollen oder Freitext-Spielzüge.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cleanText } from './security.js';
import { AVATARS } from './base-room.js';
import { GAME_ID } from './account-store.js';
import { rebindGameIds } from './rebind.js';
import { variantName } from '../games/variants.js';

export const REVIEW_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const MAX_REVIEWS = 500;
const modes = ['abend', 'mix', 'turnier', 'playlist', 'team'];
const statuses = ['running', 'between', 'done', 'stopped'];
const timestamp = (v) => Number.isSafeInteger(v) && v > 0 ? v : null;
const value = (v) => Number.isFinite(v) && Math.abs(v) <= 1e12 ? v : 0;
const clone = (v) => structuredClone(v);
const error = (status, message) => Object.assign(new Error(message), { status });

function cleanReview(r) {
  if (!r || !REVIEW_ID.test(r.id || '') || !modes.includes(r.mode) || !statuses.includes(r.status) || !Array.isArray(r.players) || r.players.length > 30 || !Array.isArray(r.stations) || !r.stations.length || r.stations.length > 12) throw new Error('Ungültiger Abend-Rückblick');
  const players = r.players.map((p, i) => ({ key: 'p' + i, name: cleanText(p.name, 32) || 'Mitspieler', avatar: AVATARS.includes(p.avatar) ? p.avatar : '🦉', team: r.mode === 'team' && ['a', 'b'].includes(p.team) ? p.team : null,
    ...(typeof p.gameId === 'string' && GAME_ID.test(p.gameId) ? { gameId: p.gameId } : {}) })); // V2-07: öffentliche Spieler-ID statt nur Freitextname; alte Rückblicke haben keine
  const keys = new Set(players.map((p) => p.key));
  const stations = r.stations.map((s) => {
    if (!s || !Number.isInteger(s.index) || s.index < 0 || s.index >= 12 || !/^[a-z0-9-]{1,30}$/.test(s.game || '') || !Array.isArray(s.values) || s.values.length > players.length) throw new Error('Ungültige Spielwertung');
    const seen = new Set();
    const values = s.values.map((v) => {
      if (!keys.has(v.player) || seen.has(v.player)) throw new Error('Ungültiger Teilnehmer'); seen.add(v.player);
      return { player: v.player, raw: value(v.raw), points: Math.max(0, Math.min(30, value(v.points))), won: v.won === true };
    });
    return { index: s.index, game: s.game, gameName: cleanText(s.gameName, 60) || s.game, at: timestamp(s.at), scoreLabel: cleanText(s.scoreLabel, 40) || 'Punkte', lowWins: s.lowWins === true, values };
  }).sort((a, b) => a.index - b.index);
  if (new Set(stations.map((s) => s.index)).size !== stations.length) throw new Error('Doppelte Spielwertung');
  return { id: r.id, name: cleanText(r.name, 40) || 'Unser Spieleabend', mode: r.mode, status: r.status, private: r.private === true, ...(r.hidden === true ? { hidden: true } : {}), // V2-17: von der Verwaltung ausgeblendet, aber nicht gelöscht
    startedAt: timestamp(r.startedAt), endedAt: timestamp(r.endedAt), updatedAt: timestamp(r.updatedAt), planned: Math.max(stations.length, Math.min(12, Number.isInteger(r.planned) ? r.planned : stations.length)), players, stations };
}

// gameIdOf(raumSpielerId) → öffentliche Spieler-ID oder null (versteckte Konten liefern null)
export function reviewFromRoom(room, games, now = Date.now(), gameIdOf = () => null) {
  const p = room.partyProgram;
  if (!p?.results?.length || !REVIEW_ID.test(p.id || '') || !p.roster?.length) return null;
  const keys = new Map(p.roster.map((person, i) => [person.id, 'p' + i]));
  return cleanReview({ id: p.id, name: p.config.name, mode: p.config.mode, status: p.results.length === p.plan.length ? 'done' : p.status, private: !!room.unlisted, startedAt: p.startedAt, endedAt: p.endedAt, updatedAt: now, planned: p.plan.length,
    players: p.roster.map((person) => ({ name: person.name, avatar: person.avatar, team: person.team, gameId: gameIdOf(person.id) })),
    stations: p.results.map((r) => ({ index: r.index, game: r.game, gameName: variantName(r.game, games[r.game]?.name || r.game, r.variant), at: r.at, scoreLabel: r.scoreLabel, lowWins: r.lowWins,
      values: p.roster.filter((person) => Object.hasOwn(r.points, person.id)).map((person) => ({ player: keys.get(person.id), raw: r.raw?.[person.id], points: r.points[person.id], won: r.winners?.includes(person.id) })) })) });
}

export function summarizeReview(r) {
  const totals = Object.fromEntries(r.players.map((p) => [p.key, 0]));
  const timeline = [{ station: 0, scores: { ...totals } }], moments = [];
  let previous = [];
  for (const s of r.stations) {
    for (const v of s.values) totals[v.player] += v.points;
    timeline.push({ station: s.index + 1, scores: { ...totals } });
    const best = Math.max(0, ...Object.values(totals)), leaders = r.players.filter((p) => totals[p.key] === best && best > 0).map((p) => p.key);
    if (leaders.length === 1 && previous.length && !previous.includes(leaders[0])) moments.push({ kind: 'lead', station: s.index + 1, players: leaders });
    if (!previous.length && best > 0) moments.push({ kind: 'opening', station: s.index + 1, players: leaders });
    previous = leaders;
  }
  const standings = r.players.map((p) => ({ ...p, points: totals[p.key], place: 1 + Object.values(totals).filter((n) => n > totals[p.key]).length })).sort((a, b) => a.place - b.place || a.name.localeCompare(b.name, 'de'));
  const teams = ['a', 'b'].map((key, i) => ({ key, name: `Team ${i + 1}`, points: standings.filter((p) => p.team === key).reduce((n, p) => n + p.points, 0) }));
  const ranking = r.mode === 'team' ? teams : standings, best = Math.max(0, ...ranking.map((p) => p.points));
  const winners = r.status === 'done' && best > 0 ? ranking.filter((p) => p.points === best).map((p) => p.name) : [];
  if (r.mode === 'team') moments.length = 0; // Individuelle Führungswechsel wären keine Teamführung.
  if (winners.length > 1) moments.push({ kind: 'tie', players: r.mode === 'team' ? [] : standings.filter((p) => p.points === best).map((p) => p.key) });
  if (r.status === 'done' && r.mode !== 'team' && standings.length > 1 && standings[0].points > standings[1].points && standings[0].points - standings[1].points <= 2) moments.push({ kind: 'close', players: [standings[0].key, standings[1].key], gap: standings[0].points - standings[1].points });
  if (r.status === 'done' && r.mode !== 'team') for (const winner of standings.filter((p) => p.points === best && best > 0)) {
    const deficit = Math.max(0, ...timeline.map((t) => Math.max(...Object.values(t.scores)) - t.scores[winner.key]));
    if (deficit > 0) moments.push({ kind: 'comeback', players: [winner.key], gap: deficit });
  }
  return { ...clone(r), standings, teams, timeline, winners, moments: moments.slice(-12) };
}

export function createReviewStore({ dir, games, now = Date.now, gameIdOf = () => null }) {
  const file = join(dir, 'evening-reviews.json'); let rows = [];
  if (existsSync(file)) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.evenings) || data.evenings.length > MAX_REVIEWS) throw new Error('Ungültiges Rückblick-Archiv');
    rows = data.evenings.map(cleanReview);
    if (new Set(rows.map((r) => r.id)).size !== rows.length) throw new Error('Doppelte Archiv-ID');
  }
  function write(next) {
    mkdirSync(dir, { recursive: true }); writeFileSync(file + '.tmp', JSON.stringify({ version: 1, evenings: next }), { mode: 0o600 }); renameSync(file + '.tmp', file); rows = next;
  }
  return {
    capture(room, { restoring = false } = {}) {
      let r = reviewFromRoom(room, games, now(), (id) => gameIdOf(room, id)); if (!r) return null;
      const old = rows.find((s) => s.id === r.id);
      // rooms.json wird verzögert gespeichert. Ein älterer Raumstand nach einem
      // Absturz darf einen bereits archivierten Abschluss nicht zurückdrehen.
      if (old && (old.stations.length > r.stations.length || ['done', 'stopped'].includes(old.status) && !['done', 'stopped'].includes(r.status))) {
        r = { ...old, private: old.private || r.private, updatedAt: r.updatedAt };
      } else if (old && ['done', 'stopped'].includes(old.status)) {
        r = { ...old, private: r.private, updatedAt: r.updatedAt };
      }
      if (old?.hidden) r.hidden = true;
      if (old && restoring) r.private ||= old.private;
      if (old && JSON.stringify({ ...old, updatedAt: null }) === JSON.stringify({ ...r, updatedAt: null })) return r.id;
      write([r, ...rows.filter((s) => s.id !== r.id)].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, MAX_REVIEWS)); return r.id;
    },
    list({ known = [], query = '', page = 1 } = {}) {
      const allowed = new Set(known.slice(0, 100).filter((id) => REVIEW_ID.test(id))), q = cleanText(query, 80).toLocaleLowerCase('de');
      const selected = rows.filter((r) => !r.hidden && ['done', 'stopped'].includes(r.status) && (!r.private || allowed.has(r.id)) && (!q || [r.name, ...r.players.map((p) => p.name), ...r.stations.map((s) => s.gameName)].join(' ').toLocaleLowerCase('de').includes(q)));
      const at = Math.max(1, Math.min(25, Number.isSafeInteger(page) ? page : 1));
      return { total: selected.length, page: at, items: selected.slice((at - 1) * 20, at * 20).map((r) => ({ id: r.id, name: r.name, mode: r.mode, status: r.status, private: r.private, startedAt: r.startedAt, endedAt: r.endedAt,
        games: r.stations.map((s) => s.gameName), players: r.players.length, completed: r.stations.length, planned: r.planned, winners: summarizeReview(r).winners })) };
    },
    get(id) { if (!REVIEW_ID.test(id || '')) throw error(404, 'Rückblick nicht gefunden'); const r = rows.find((r) => r.id === id); if (!r || r.hidden) throw error(404, 'Rückblick nicht gefunden'); return summarizeReview(r); },
    // V2-17: Verwaltung sieht alles, auch private und ausgeblendete Abende
    adminList({ limit = 100 } = {}) {
      return rows.slice(0, Math.max(1, Math.min(MAX_REVIEWS, Number(limit) | 0 || 100))).map((r) => ({ id: r.id, name: r.name, mode: r.mode, status: r.status, private: r.private, hidden: !!r.hidden, updatedAt: r.updatedAt, endedAt: r.endedAt,
        players: r.players.map((p) => ({ name: p.name, gameId: p.gameId || '' })), games: r.stations.map((s) => s.gameName), completed: r.stations.length, planned: r.planned, winners: summarizeReview(r).winners }));
    },
    adminGet(id) { const r = REVIEW_ID.test(id || '') && rows.find((x) => x.id === id); if (!r) throw error(404, 'Rückblick nicht gefunden'); return { ...summarizeReview(r), hidden: !!r.hidden }; },
    setHidden(id, hidden) {
      const r = REVIEW_ID.test(id || '') && rows.find((x) => x.id === id); if (!r) return null;
      if (!!r.hidden !== !!hidden) write(rows.map((x) => { if (x.id !== id) return x; const y = { ...x }; if (hidden) y.hidden = true; else delete y.hidden; return y; }));
      return { id, name: r.name, hidden: !!hidden };
    },
    // Konten zusammengeführt (to = neue Game-ID) oder gelöscht (to = null)
    rebindGameId(from, to) {
      const { value, count } = rebindGameIds(clone(rows), from, to);
      if (count) write(value);
      return count;
    },
  };
}

const md = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}[\]()#+.!|~-]/g, '\\$&').replace(/[\r\n]+/g, ' ');
export function reviewMarkdown(r) {
  const names = new Map(r.players.map((p) => [p.key, p.name]));
  return `# ${md(r.name)}\n\n${r.status === 'done' ? 'Abgeschlossen' : r.status === 'stopped' ? 'Vorzeitig beendet' : 'Noch nicht abgeschlossen'} · ${r.stations.length}/${r.planned} Stationen\n\n## Gesamtwertung\n\n| Platz | Name | Abendpunkte |\n| --- | --- | ---: |\n${r.standings.map((p) => `| ${p.place} | ${md(p.name)} | ${p.points} |`).join('\n')}\n\n${r.mode === 'team' ? `## Teamwertung\n\n${r.teams.map((p) => `- ${p.name}: ${p.points}`).join('\n')}\n\n` : ''}## Spiele\n\n${r.stations.map((s) => `### ${s.index + 1}. ${md(s.gameName)}\n\nRohwert: ${md(s.scoreLabel)}${s.lowWins ? ' (wenig ist gut)' : ''}\n\n| Name | Rohwert | Abendpunkte |\n| --- | ---: | ---: |\n${s.values.map((v) => `| ${md(names.get(v.player))} | ${v.raw} | ${v.points} |`).join('\n')}\n`).join('\n')}\n`;
}
