// Terminfindung und Spielewahl: Namen sind Anzeige, Rechte gehören zur Browser-Kennung.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { rebindIds, rebindGameIds } from './rebind.js';
import { GAME_ID } from './account-store.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanName, cleanText } from './security.js';
import { AVATARS } from './base-room.js';

export const PLAN_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const planError = (status, message) => Object.assign(new Error(message), { status });
const fail = (message) => { throw planError(400, message); };
const validActor = (a) => {
  if (!a || !/^[a-f0-9]{32}$/.test(a.id || '') || typeof a.name !== 'string' || !cleanName(a.name)) fail('Lege zuerst deinen Namen im Profil fest');
  return { id: a.id, name: cleanName(a.name), avatar: AVATARS.includes(a.avatar) ? a.avatar : '🦉', ...(typeof a.gameId === 'string' && GAME_ID.test(a.gameId) ? { gameId: a.gameId } : {}) }; // V2-07: gameId nur zur Anzeige
};
const text = (v, max, min = 0) => {
  if (typeof v !== 'string' || v.length > max || cleanText(v, max).length < min) fail(`Bitte ${min} bis ${max} Zeichen eingeben`);
  return v.replace(/\r\n?/g, '\n').split('\n').map((s) => cleanText(s, max)).join('\n').trim();
};
const atomic = (file, state) => { writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600 }); renameSync(file + '.tmp', file); };
const unique = (a) => new Set(a).size === a.length;

export function createPlanStore({ dir, games, now = Date.now, persist = atomic }) {
  const catalog = new Map(games.map((g) => [g.id, g]));
  const file = join(dir, 'evening-plans.json');
  let state = { version: 1, plans: [] };
  function gameIds(ids, max) {
    if (!Array.isArray(ids) || ids.length > max || !unique(ids) || ids.some((id) => typeof id !== 'string' || !catalog.has(id))) fail(`Wähle höchstens ${max} unterschiedliche verfügbare Spiele`);
    return [...ids];
  }
  function answers(data, p) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length > p.slots.length || Object.entries(data).some(([slot, value]) => !p.slots.some((s) => s.id === slot) || !['yes', 'maybe', 'no'].includes(value))) fail('Ungültige Terminantwort');
    return { ...data };
  }
  function selection(p, slot, ids) {
    const selected = gameIds(ids, 12);
    if (!p.slots.some((s) => s.id === slot) || !selected.length || selected.some((id) => !p.games.some((g) => g.id === id))) fail('Wähle einen vorgeschlagenen Termin und 1 bis 12 vorgeschlagene Spiele');
    const min = Math.max(...selected.map((id) => catalog.get(id).minPlayers)), max = Math.min(...selected.map((id) => catalog.get(id).maxPlayers));
    if (min > max) fail('Diese Spiele haben keine gemeinsame Spielerzahl. Passe die Auswahl an');
    return { slot, games: selected };
  }
  function validateSaved(data) {
    if (data?.version !== 1 || !Array.isArray(data.plans) || data.plans.length > 300 || !unique(data.plans.map((p) => p?.id))) throw new Error('Ungültige Planungsdatei');
    for (const p of data.plans) {
      if (!PLAN_ID.test(p?.id || '') || !['open', 'fixed', 'cancelled'].includes(p.status) || typeof p.private !== 'boolean' || !Number.isSafeInteger(p.revision) || p.revision < 1 || !Number.isSafeInteger(p.createdAt) || !Number.isSafeInteger(p.updatedAt)) throw new Error('Ungültiger Plan');
      text(p.title, 80, 3); text(p.description, 1000); validActor(p.owner);
      if (!Array.isArray(p.slots) || !p.slots.length || p.slots.length > 8 || !unique(p.slots.map((s) => s.id)) || p.slots.some((s) => !PLAN_ID.test(s.id || '') || !Number.isSafeInteger(s.at) || s.at <= 0 || s.at > 8640000000000000)) throw new Error('Ungültige Termine');
      if (!Array.isArray(p.games)) throw new Error('Ungültige Spiele'); gameIds(p.games.map((g) => g.id), 30);
      if (p.games.some((g) => !/^[a-f0-9]{32}$/.test(g.by || ''))) throw new Error('Ungültiger Vorschlag');
      if (!Array.isArray(p.ballots) || p.ballots.length > 200 || !unique(p.ballots.map((b) => b.person.id))) throw new Error('Ungültige Stimmen');
      for (const b of p.ballots) { validActor(b.person); answers(b.answers, p); gameIds(b.games, 30); if (b.games.some((id) => !p.games.some((g) => g.id === id)) || !Number.isSafeInteger(b.revision) || b.revision < 1) throw new Error('Ungültige Stimme'); }
      if (p.status === 'fixed') selection(p, p.selected?.slot, p.selected?.games); else if (p.selected !== null) throw new Error('Ungültige Festlegung');
    }
  }
  if (existsSync(file)) {
    try { const data = JSON.parse(readFileSync(file, 'utf8')); validateSaved(data); state = data; }
    catch { throw new Error('Planungsdatei ist nicht lesbar; vorhandene Datei bleibt erhalten'); }
  }
  const get = (id, source = state) => { const p = source.plans.find((p) => p.id === id); if (!p) throw planError(404, 'Planung nicht gefunden'); return p; };
  const own = (p, actor) => { if (p.owner.id !== actor?.id) throw planError(403, 'Nur der Ersteller darf diese Planung verwalten'); };
  const open = (p) => { if (p.status !== 'open') throw planError(409, 'Die Abstimmung ist geschlossen'); };
  const mutate = (id, fn, actor) => {
    const next = structuredClone(state), p = get(id, next); fn(p);
    p.updatedAt = now(); p.revision++;
    mkdirSync(dir, { recursive: true }); persist(file, next); state = next; return view(p, actor);
  };
  function view(p, actor, detail = true) {
    const mine = p.ballots.find((b) => b.person.id === actor?.id);
    const summary = { id: p.id, title: p.title, description: p.description, private: p.private, status: p.status, revision: p.revision, createdAt: p.createdAt, updatedAt: p.updatedAt,
      owner: { name: p.owner.name, avatar: p.owner.avatar, ...(p.owner.gameId ? { gameId: p.owner.gameId } : {}) }, canManage: p.owner.id === actor?.id, participants: p.ballots.length,
      slots: p.slots.map((s) => ({ id: s.id, at: s.at, yes: p.ballots.filter((b) => b.answers[s.id] === 'yes').length, maybe: p.ballots.filter((b) => b.answers[s.id] === 'maybe').length, no: p.ballots.filter((b) => b.answers[s.id] === 'no').length })),
      games: p.games.map((g) => ({ id: g.id, name: catalog.get(g.id).name, votes: p.ballots.filter((b) => b.games.includes(g.id)).length })).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'de')), selected: p.selected ? { slot: p.selected.slot, games: [...p.selected.games] } : null };
    return detail ? { ...summary, mine: mine ? { answers: { ...mine.answers }, games: [...mine.games], revision: mine.revision } : { answers: {}, games: [], revision: 0 },
      people: p.ballots.map((b) => ({ name: b.person.name, avatar: b.person.avatar, ...(b.person.gameId ? { gameId: b.person.gameId } : {}), mine: b.person.id === actor?.id, answers: { ...b.answers }, games: [...b.games] })) } : summary;
  }
  return {
    list({ known = [], q = '', status = '', page = 1 } = {}, actor) {
      const query = cleanText(typeof q === 'string' ? q : '', 80).toLocaleLowerCase('de');
      const ids = new Set(known.slice(0, 100).filter((id) => typeof id === 'string' && PLAN_ID.test(id)));
      const matches = state.plans.filter((p) => (!p.private || p.owner.id === actor?.id || ids.has(p.id)) && (!status || status === 'all' || p.status === status) && (!query || `${p.title} ${p.description} ${p.owner.name}`.toLocaleLowerCase('de').includes(query))).sort((a, b) => b.updatedAt - a.updatedAt);
      const pages = Math.max(1, Math.ceil(matches.length / 20)), n = Number(page), at = Math.max(1, Math.min(pages, Number.isSafeInteger(n) ? n : 1));
      return { items: matches.slice((at - 1) * 20, at * 20).map((p) => view(p, actor, false)), total: matches.length, page: at, pages };
    },
    detail: (id, actor) => view(get(id), actor),
    create(data, actor) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Ungültige Planung');
      const owner = validActor(actor), title = text(data.title, 80, 3), description = text(data.description ?? '', 1000);
      if (data.private !== undefined && typeof data.private !== 'boolean') fail('Ungültige Sichtbarkeit');
      const at = now();
      if (!Array.isArray(data.slots) || !data.slots.length || data.slots.length > 8 || !unique(data.slots) || data.slots.some((n) => !Number.isSafeInteger(n) || n <= at || n > at + 366 * 86400000)) fail('Wähle 1 bis 8 unterschiedliche zukünftige Termine innerhalb eines Jahres');
      const ids = gameIds(data.games ?? [], 30);
      if (state.plans.length >= 300) throw planError(409, 'Die Planung ist voll. Entferne zuerst eine eigene alte Planung');
      const p = { id: randomUUID(), title, description, owner, private: data.private === true, createdAt: at, updatedAt: at, revision: 1, status: 'open', selected: null,
        slots: [...data.slots].sort((a, b) => a - b).map((at) => ({ id: randomUUID(), at })), games: ids.map((id) => ({ id, by: owner.id })), ballots: [] };
      const next = { version: 1, plans: [...state.plans, p] }; mkdirSync(dir, { recursive: true }); persist(file, next); state = next; return view(p, actor);
    },
    vote(id, data, actor) {
      const person = validActor(actor);
      return mutate(id, (p) => {
        open(p); const old = p.ballots.find((b) => b.person.id === actor.id);
        if (data.voteRevision !== (old?.revision || 0)) throw planError(409, 'Deine Stimme wurde in einem anderen Tab geändert. Aktualisiere die Ansicht');
        const answer = answers(data.answers, p), ids = gameIds(data.games, 30);
        if (ids.some((id) => !p.games.some((g) => g.id === id))) fail('Stimme nur für vorgeschlagene Spiele');
        if (!old && p.ballots.length >= 200) throw planError(409, 'Diese Planung hat bereits 200 Teilnehmer');
        const ballot = { person, answers: answer, games: ids, revision: (old?.revision || 0) + 1 };
        p.ballots = [...p.ballots.filter((b) => b.person.id !== actor.id), ballot];
      }, actor);
    },
    propose(id, game, actor) {
      const person = validActor(actor); gameIds([game], 1);
      return mutate(id, (p) => { open(p); if (p.games.some((g) => g.id === game)) throw planError(409, 'Dieses Spiel ist bereits vorgeschlagen'); if (p.games.length >= 30) throw planError(409, 'Höchstens 30 Spielvorschläge pro Abend'); p.games.push({ id: game, by: person.id }); }, actor);
    },
    manage(id, data, actor) {
      return mutate(id, (p) => {
        own(p, actor);
        if (data.revision !== p.revision) throw planError(409, 'Die Planung wurde inzwischen geändert. Aktualisiere die Ansicht');
        if (data.action === 'fix') { open(p); const selected = selection(p, data.slot, data.games); if (p.slots.find((s) => s.id === selected.slot).at <= now()) fail('Der Termin liegt bereits in der Vergangenheit'); p.selected = selected; p.status = 'fixed'; }
        else if (data.action === 'reopen') { if (p.status === 'open') fail('Die Abstimmung ist bereits offen'); p.status = 'open'; p.selected = null; }
        else if (data.action === 'cancel') { p.status = 'cancelled'; p.selected = null; }
        else fail('Unbekannte Planungsaktion');
      }, actor);
    },
    remove(id, revision, actor) {
      const p = get(id); own(p, actor); if (p.revision !== revision) throw planError(409, 'Die Planung wurde inzwischen geändert. Aktualisiere die Ansicht');
      const next = { version: 1, plans: state.plans.filter((v) => v.id !== id) }; persist(file, next); state = next;
    },
    // V2-01: Besucher-ID → Konto-ID (Ersteller, Stimmen, Spielvorschläge)
    rebind(from, to) {
      const { value, count } = rebindIds(structuredClone(state), from, to);
      if (count) { mkdirSync(dir, { recursive: true }); persist(file, value); state = value; }
      return count;
    },
    rebindGameId(from, to) {
      const { value, count } = rebindGameIds(structuredClone(state), from, to);
      if (count) { mkdirSync(dir, { recursive: true }); persist(file, value); state = value; }
      return count;
    },
    program(id) {
      const p = get(id); if (p.status !== 'fixed') throw planError(409, 'Lege zuerst Termin und Spiele fest');
      return { name: p.title.slice(0, 40), games: [...p.selected.games], private: p.private };
    },
  };
}
