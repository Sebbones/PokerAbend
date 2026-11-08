// Päckchen 7: ein Abendprogramm verbindet vorhandene Partyspiele. Spielregeln und geheime
// Antworten bleiben in den jeweiligen Räumen; hier zählen nur abgeschlossene Ergebnisse.
import { GAMES } from '../games/index.js';
import { cleanText } from './security.js';
import { shuffle } from './random.js';
import { BOTS } from '../games/bots.js';
import { DEFAULT_SETTINGS as POKER_DEFAULTS } from '../games/poker/room.js';
import { randomUUID, createHash } from 'node:crypto';
import { variantOf } from '../games/variants.js';

export const PROGRAM_MODES = ['mix', 'turnier', 'playlist', 'team', 'abend'];
export const MAX_PROGRAM_GAMES = 12;
const NO_TEAM = new Set(['werwolf', 'wer-bin-ich', 'doppelagent', 'jaeger-schatten', 'infektionsjagd']);
export const programGames = (team = false) => Object.values(GAMES).filter((g) => g.category === 'party' && (!team || !NO_TEAM.has(g.id)));
export const eveningGames = () => Object.values(GAMES);
export const programSeats = (room) => room.table ? room.table.seats.filter(Boolean).map((s) => s.id) : [...room.seats];
const POKER_OPTIONS = [
  { key: 'startStack', label: 'Startchips (gleicher Start je Station)', type: 'number', min: 100, max: 1000000 },
  { key: 'smallBlind', label: 'Small Blind', type: 'number', min: 1, max: 10000 },
  { key: 'bigBlind', label: 'Big Blind', type: 'number', min: 2, max: 10000 },
  { key: 'turnTime', label: 'Sekunden pro Zug (0 = ohne)', type: 'number', min: 0, max: 300 },
];
export const programOptions = (game, variant = 'classic') => ['poker', 'omaha'].includes(game.id) ? POKER_OPTIONS : game.variants?.find((v) => v.id === variant)?.options || game.options || [];
export const programDefaults = () => Object.fromEntries(eveningGames().map((game) => {
  const room = game.create('DEFAULTS', {}, () => {});
  const settings = Object.fromEntries(programOptions(game).map((o) => [o.key, room.settings[o.key]]));
  room.dispose();
  return [game.id, settings];
}));
export const programActive = (room) => ['running', 'between'].includes(room.partyProgram?.status);
const clone = (value) => JSON.parse(JSON.stringify(value));

export function normalizeProgram(input) {
  if (!input || !PROGRAM_MODES.includes(input.mode)) throw new Error('Wähle einen gültigen Programm-Modus');
  if (!Array.isArray(input.entries) || !input.entries.length || input.entries.length > MAX_PROGRAM_GAMES) throw new Error('Ein Programm braucht 1 bis 12 Spiele');
  const allowed = new Set((input.mode === 'abend' ? eveningGames() : programGames(input.mode === 'team')).map((g) => g.id));
  const entries = input.entries.map((entry) => {
    if (!entry || !allowed.has(entry.game)) throw new Error('Dieses Spiel eignet sich nicht für diesen Party-Modus');
    const game = GAMES[entry.game], settings = {}, variant = entry.variant || 'classic';
    variantOf(game.id, variant);
    if (variant !== 'classic' && !game.variants?.some((v) => v.id === variant)) throw new Error('Diese Variante ist noch nicht verfügbar');
    const values = entry.settings && typeof entry.settings === 'object' ? entry.settings : {};
    for (const option of programOptions(game, variant)) {
      if (!Object.hasOwn(values, option.key)) continue;
      const value = values[option.key];
      if (option.type === 'bool') {
        if (typeof value !== 'boolean') throw new Error(`Ungültige Einstellung: ${option.label}`);
        settings[option.key] = value;
      } else if (option.type === 'select') {
        if (!option.values.some((v) => v.value === value)) throw new Error(`Ungültige Einstellung: ${option.label}`);
        settings[option.key] = value;
      } else {
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < option.min || n > option.max) throw new Error(`Ungültige Einstellung: ${option.label}`);
        settings[option.key] = n;
      }
    }
    if (['poker', 'omaha'].includes(game.id)) {
      const s = { ...POKER_DEFAULTS, ...settings };
      if (s.smallBlind > s.bigBlind || s.startStack < s.bigBlind) throw new Error('Poker: Small Blind höchstens Big Blind, Startchips mindestens Big Blind');
    }
    return { game: game.id, settings, ...(variant !== 'classic' ? { variant } : {}) };
  });
  const teams = {};
  if (input.mode === 'team' && input.teams && typeof input.teams === 'object') for (const [id, team] of Object.entries(input.teams).slice(0, 30)) {
    if (/^(?:[a-f0-9]{12}|bot_[a-f0-9]{10})$/.test(id) && ['a', 'b'].includes(team)) teams[id] = team;
  }
  return { name: cleanText(typeof input.name === 'string' ? input.name : '', 40) || (input.mode === 'abend' ? 'Unser Spieleabend' : 'Unser Party-Abend'), mode: input.mode, entries, teams };
}

export function configureProgram(room, id, input) {
  room.requireHost(id);
  if (room.busy || programActive(room)) throw new Error('Beende zuerst das laufende Programm');
  const config = normalizeProgram(input);
  room.partyProgram = { id: randomUUID(), config, status: 'ready', index: 0, plan: [], roster: [], results: [], scores: {}, saved: {}, startedAt: null, endedAt: null };
  room.say(`Abendprogramm „${config.name}“ vorbereitet`);
}

export function validateProgramPlayers(room, config, ids = programSeats(room)) {
  if (!ids?.length) throw new Error('Erst am Tisch mitspielen, dann das Programm starten');
  for (const entry of config.entries) {
    const game = GAMES[entry.game];
    const v = game.variants?.find((v) => v.id === (entry.variant || 'classic')) || game;
    if (ids.length < v.minPlayers || ids.length > v.maxPlayers) throw new Error(`${game.name} braucht ${v.minPlayers}–${v.maxPlayers} Mitspieler; es sitzen ${ids.length} am Tisch`);
    if (!BOTS[entry.game] && ids.some((id) => room.players.get(id)?.bot)) throw new Error(`${game.name} braucht menschliche Mitspieler; wähle ein anderes Spiel oder entferne die Bots`);
  }
  if (config.mode === 'team') {
    if (ids.some((id) => !['a', 'b'].includes(config.teams[id]))) throw new Error('Ordne jeden Mitspieler einem Team zu');
    if (!ids.some((id) => config.teams[id] === 'a') || !ids.some((id) => config.teams[id] === 'b')) throw new Error('Beide Teams brauchen mindestens einen Mitspieler');
  }
}

export function beginProgram(room, id) {
  room.requireHost(id);
  const p = room.partyProgram;
  if (!p || p.status !== 'ready' || room.busy) throw new Error('Bereite zuerst ein neues Programm vor');
  validateProgramPlayers(room, p.config);
  const next = clone(p);
  next.plan = p.config.mode === 'mix' ? shuffle(clone(p.config.entries)) : clone(p.config.entries);
  next.roster = programSeats(room).map((id) => {
    const person = room.players.get(id);
    return { id, name: person.name, avatar: person.avatar, team: p.config.mode === 'team' ? p.config.teams[id] || null : null };
  });
  next.scores = Object.fromEntries(next.roster.map((person) => [person.id, 0]));
  next.status = 'running';
  next.startedAt = Date.now();
  return next;
}

export function nextProgramStep(room, id) {
  room.requireHost(id);
  if (room.busy) throw new Error('Die aktuelle Partie läuft noch');
  const p = room.partyProgram;
  if (!p || !['running', 'between'].includes(p.status)) throw new Error('Gerade wartet kein Programm auf die nächste Partie');
  const next = clone(p);
  if (p.status === 'between') next.index++;
  if (!next.plan[next.index]) throw new Error('Das Programm ist bereits beendet');
  const seated = programSeats(room);
  const remaining = next.roster.filter((person) => seated.includes(person.id)).map((person) => person.id);
  const entry = next.plan[next.index];
  validateProgramPlayers(room, { ...next.config, entries: [entry] }, remaining);
  next.status = 'running';
  return next;
}

function resultForProgram(room) {
  if (!room.table) return room.result;
  // Die Pokerschnittstelle bleibt unverändert; hier zählen nur IDs und Netto-Chipgewinne.
  const h = room.table.hand;
  if (!h?.done || !h.result || !room.handIds) return null;
  const seats = h.seats.filter((seat) => room.handIds[seat]);
  const winners = new Set(h.result.pots.flatMap((pot) => pot.winners));
  return { players: seats.map((seat) => room.handIds[seat]), winners: seats.filter((seat) => winners.has(seat)).map((seat) => room.handIds[seat]),
    points: Object.fromEntries(seats.map((seat) => [room.handIds[seat], h.result.pots.reduce((sum, pot) => sum + (pot.payouts[seat] || 0), 0) - h.players[seat].total])) };
}

export function recordProgramResult(room) {
  const p = room.partyProgram, result = resultForProgram(room);
  if (!p || p.status !== 'running' || !result || p.plan[p.index]?.game !== room.game || p.results.some((row) => row.index === p.index)) return false;
  const members = [...new Set(result.players.filter((id) => p.roster.some((person) => person.id === id)))];
  const value = (id) => Number.isFinite(Number(result.points[id])) ? Number(result.points[id]) : 0;
  const dir = room.opts?.lowWins ? 1 : -1;
  const compare = (a, b) => (value(a) - value(b)) * dir || (room.table ? 0 : Number(result.winners.includes(b)) - Number(result.winners.includes(a)));
  const ordered = [...members].sort(compare);
  // Gleichstände teilen den Platz. Eine Partie ohne Sieger und ohne Punkte zählt null.
  const hasResult = result.winners.length || members.some((id) => value(id) !== 0);
  const points = Object.fromEntries(ordered.map((id) => [id, hasResult ? members.length - ordered.filter((other) => compare(other, id) < 0).length : 0]));
  for (const [id, value] of Object.entries(points)) p.scores[id] = (p.scores[id] || 0) + value;
  p.results.push({ index: p.index, game: room.game, ...(room.variant && room.variant !== 'classic' ? { variant: room.variant } : {}), points, raw: Object.fromEntries(members.map((id) => [id, value(id)])), at: Date.now(), lowWins: !!room.opts?.lowWins,
    scoreLabel: room.table ? 'Chips netto' : room.opts?.scoreLabel || 'Punkte', winners: result.winners.filter((id) => members.includes(id)) });
  p.status = p.index === p.plan.length - 1 ? 'done' : 'between';
  if (p.status === 'done') p.endedAt = Date.now();
  room.say(p.status === 'done' ? `Abendprogramm „${p.config.name}“ beendet: ${p.roster.map((person) => `${person.name} ${p.scores[person.id] || 0}`).join(' · ')}` : `Abendprogramm: ${p.index + 1} von ${p.plan.length} Spielen gewertet`, 'summary');
  return true;
}

export function publicProgram(room) {
  const p = room.partyProgram;
  if (!p) return null;
  const standings = p.roster.map((person) => ({ ...person, team: p.config.mode === 'team' ? person.team : null, points: p.scores[person.id] || 0 })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'de'));
  const teams = ['a', 'b'].map((id, i) => ({ id, name: `Team ${i + 1}`, points: standings.filter((person) => person.team === id).reduce((sum, person) => sum + person.points, 0) }));
  const ranking = p.config.mode === 'team' ? teams : standings;
  const best = Math.max(0, ...ranking.map((row) => row.points));
  return { id: p.id, startedAt: p.startedAt || null, endedAt: p.endedAt || null, config: clone(p.config), status: p.status, index: p.index, plan: clone(p.plan), results: clone(p.results), standings, teams,
    winners: p.status === 'done' ? ranking.filter((row) => row.points === best && best > 0).map((row) => row.name) : [] };
}

export function restoreProgram(data) {
  if (!data || typeof data !== 'object') return null;
  try {
    const config = normalizeProgram(data.config);
    if (!['ready', 'running', 'between', 'done', 'stopped'].includes(data.status)) return null;
    if (!Array.isArray(data.plan) || data.plan.length > MAX_PROGRAM_GAMES || !Array.isArray(data.roster) || !Array.isArray(data.results)) return null;
    if (['running', 'between', 'done'].includes(data.status) && !data.plan.length) return null;
    if (data.roster.length > 30 || data.results.length > MAX_PROGRAM_GAMES || !data.scores || typeof data.scores !== 'object') return null;
    if (data.roster.some((person) => !person || typeof person.id !== 'string' || typeof person.name !== 'string')) return null;
    if (Object.values(data.scores).some((n) => !Number.isFinite(n))) return null;
    if (data.results.some((row) => !row || !Number.isInteger(row.index) || row.index < 0 || row.index >= data.plan.length || !row.points || typeof row.points !== 'object')) return null;
    if (!data.saved || typeof data.saved !== 'object') return null;
    if (data.plan.length) normalizeProgram({ ...config, entries: data.plan });
    if (!Number.isInteger(data.index) || data.index < 0 || data.index >= Math.max(1, data.plan.length)) return null;
    // Altbestände bekommen eine reproduzierbare Archiv-ID; keine erfundenen Spieldaten.
    const hash = createHash('sha256').update(JSON.stringify([config, data.roster.map((p) => p.id), data.plan])).digest('hex').slice(0, 32);
    const id = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(data.id || '') ? data.id : `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
    return clone({ ...data, config, id });
  } catch { return null; }
}
