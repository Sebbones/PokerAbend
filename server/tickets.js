// Persistentes Ticket-Board. Browser-Identitäten sind privat; Namen verleihen keine Rechte.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { rebindIds, rebindGameIds } from './rebind.js';
import { GAME_ID } from './account-store.js';
import { join } from 'node:path';
import { cleanName, cleanText } from './security.js';
import { AVATARS } from './base-room.js';

export const TICKET_STATUS = { new: 'Neu', planned: 'Geplant', progress: 'In Arbeit', done: 'Erledigt', rejected: 'Abgelehnt' };
export const TICKET_TYPES = { idea: 'Idee', bug: 'Fehler' };
const MAX_TICKETS = 1000, MAX_COMMENTS = 100, MAX_VOTERS = 200;
export const ticketError = (status, message) => Object.assign(new Error(message), { status });
const has = (obj, key) => Object.hasOwn(obj, key);
const clone = (value) => structuredClone(value);
const person = (actor) => {
  const name = cleanName(typeof actor?.name === 'string' ? actor.name : '');
  if (!name || typeof actor?.id !== 'string' || !/^[a-f0-9]{32}$/.test(actor.id)) throw ticketError(400, 'Lege zuerst deinen Namen im Profil fest');
  // V2-07: gameId = öffentliche Spieler-ID des Kontos (optional; alte Tickets haben keine). Sie verleiht nie Rechte, dafür zählt nur id.
  return { id: actor.id, name, avatar: AVATARS.includes(actor.avatar) ? actor.avatar : '🦉', ...(typeof actor.gameId === 'string' && GAME_ID.test(actor.gameId) ? { gameId: actor.gameId } : {}) };
};
const plain = (value, max) => {
  if (typeof value !== 'string' || value.length > max) throw ticketError(400, `Bitte höchstens ${max} Zeichen eingeben`);
  return value.replace(/\r\n?/g, '\n').split('\n').map((s) => cleanText(s, max)).join('\n').trim();
};
const fields = (data, games) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw ticketError(400, 'Ungültiges Ticket');
  const title = cleanText(typeof data.title === 'string' ? data.title : '', 100);
  if (title.length < 4 || typeof data.title !== 'string' || data.title.length > 100) throw ticketError(400, 'Der Titel braucht 4 bis 100 Zeichen');
  const description = plain(data.description, 4000);
  if (description.length < 10) throw ticketError(400, 'Beschreibe die Idee oder den Fehler mit mindestens 10 Zeichen');
  if (!has(TICKET_TYPES, data.type)) throw ticketError(400, 'Wähle Idee oder Fehler');
  const game = data.game === undefined ? '' : data.game;
  if (typeof game !== 'string' || game && !games.includes(game)) throw ticketError(400, 'Dieses Spiel gibt es nicht');
  return { title, description, type: data.type, game };
};
function atomic(file, state) {
  writeFileSync(file + '.tmp', JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(file + '.tmp', file);
}
function validSaved(state, games) {
  if (state?.version !== 1 || !Array.isArray(state.tickets) || state.tickets.length > MAX_TICKETS || !Number.isSafeInteger(state.nextId) || state.nextId < 1) return false;
  const ids = new Set();
  for (const t of state.tickets) {
    if (!Number.isSafeInteger(t?.id) || t.id < 1 || ids.has(t.id) || t.id >= state.nextId || !has(TICKET_STATUS, t.status) || !Number.isSafeInteger(t.revision) || t.revision < 1) return false;
    ids.add(t.id);
    try { fields(t, games); person(t.author); } catch { return false; }
    if (!Number.isFinite(t.createdAt) || !Number.isFinite(t.updatedAt) || !Array.isArray(t.voters) || t.voters.length > MAX_VOTERS || t.voters.some((id) => typeof id !== 'string') || new Set(t.voters).size !== t.voters.length) return false;
    if (!Array.isArray(t.comments) || t.comments.length > MAX_COMMENTS || !Array.isArray(t.history) || t.history.length > 100 || !Number.isSafeInteger(t.nextComment) || t.nextComment < 1) return false;
    const comments = new Set();
    for (const c of t.comments) {
      try { person(c.author); if (!plain(c.text, 2000)) return false; } catch { return false; }
      if (!Number.isSafeInteger(c.id) || c.id < 1 || c.id >= t.nextComment || comments.has(c.id) || !Number.isFinite(c.at)) return false;
      comments.add(c.id);
    }
    if (t.history.some((h) => !h || !Number.isFinite(h.at) || !has(TICKET_STATUS, h.from) || !has(TICKET_STATUS, h.to) || typeof h.by !== 'string')) return false;
  }
  return true;
}

export function createTicketStore({ dir, games = [], now = Date.now, persist = atomic }) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'tickets.json');
  let state = { version: 1, nextId: 1, tickets: [] };
  if (existsSync(file)) {
    try { state = JSON.parse(readFileSync(file, 'utf8')); }
    catch { throw new Error('Ticket-Datei ist nicht lesbar; vorhandene Datei bleibt erhalten'); }
    if (!validSaved(state, games)) throw new Error('Ticket-Datei ist ungültig; vorhandene Datei bleibt erhalten');
  }
  const get = (id, data = state) => {
    const t = data.tickets.find((t) => t.id === Number(id));
    if (!t) throw ticketError(404, 'Ticket nicht gefunden');
    return t;
  };
  const mutate = (fn) => {
    const next = clone(state), result = fn(next);
    persist(file, next); state = next;
    return result;
  };
  const publicPerson = (p) => ({ name: p.name, avatar: p.avatar, ...(p.gameId ? { gameId: p.gameId } : {}) });
  function view(t, actor, detail = true) {
    const base = { id: t.id, title: t.title, type: t.type, game: t.game, status: t.status, author: publicPerson(t.author), createdAt: t.createdAt, updatedAt: t.updatedAt, revision: t.revision,
      votes: t.voters.length, voted: t.voters.includes(actor?.id), commentCount: t.comments.length, canEdit: !!actor?.admin || actor?.id === t.author.id, canDelete: !!actor?.admin };
    if (!detail) return { ...base, excerpt: t.description.slice(0, 180) };
    return { ...base, description: t.description, comments: t.comments.map((c) => ({ id: c.id, text: c.text, at: c.at, author: publicPerson(c.author), canDelete: !!actor?.admin || actor?.id === c.author.id })), history: clone(t.history) };
  }
  function selected(query = {}) {
    const q = cleanText(typeof query.q === 'string' ? query.q : '', 100).toLocaleLowerCase('de');
    const matches = state.tickets.filter((t) => (!has(TICKET_TYPES, query.type) || t.type === query.type) && (!has(TICKET_STATUS, query.status) || t.status === query.status) && (!games.includes(query.game) || t.game === query.game) && (!q || `${t.title}\n${t.description}`.toLocaleLowerCase('de').includes(q)));
    const by = query.sort === 'new' ? (a, b) => b.createdAt - a.createdAt : query.sort === 'updated' ? (a, b) => b.updatedAt - a.updatedAt : (a, b) => b.voters.length - a.voters.length || b.createdAt - a.createdAt;
    return matches.sort((a, b) => by(a, b) || b.id - a.id);
  }
  const touch = (t) => { t.updatedAt = now(); t.revision++; };
  return {
    list(query, actor) {
      const all = selected(query), pages = Math.max(1, Math.ceil(all.length / 20));
      const n = Number(query?.page), page = Math.max(1, Math.min(pages, Number.isSafeInteger(n) ? n : 1));
      return { tickets: all.slice((page - 1) * 20, page * 20).map((t) => view(t, actor, false)), page, pages, total: all.length,
        counts: { total: state.tickets.length, open: state.tickets.filter((t) => !['done', 'rejected'].includes(t.status)).length, done: state.tickets.filter((t) => t.status === 'done').length } };
    },
    detail: (id, actor) => view(get(id), actor),
    // V2-01: Besucher-ID → Konto-ID (Autoren, Stimmen); gibt die Zahl der ersetzten Stellen zurück
    rebind(from, to) {
      const { value, count } = rebindIds(clone(state), from, to);
      if (count) { persist(file, value); state = value; }
      return count;
    },
    rebindGameId(from, to) {
      const { value, count } = rebindGameIds(clone(state), from, to);
      if (count) { persist(file, value); state = value; }
      return count;
    },
    create(data, actor) {
      const who = person(actor), content = fields(data, games);
      return mutate((next) => {
        if (next.tickets.length >= MAX_TICKETS) throw ticketError(409, 'Das Board ist voll; die Verwaltung kann alte Tickets entfernen');
        const at = now();
        const t = { id: next.nextId++, ...content, status: 'new', author: who, createdAt: at, updatedAt: at, revision: 1, voters: [], comments: [], nextComment: 1, history: [] };
        next.tickets.push(t); return view(t, actor);
      });
    },
    vote(id, active, actor) {
      if (typeof active !== 'boolean') throw ticketError(400, 'Ungültige Stimme');
      person(actor);
      return mutate((next) => {
        const t = get(id, next), on = t.voters.includes(actor.id);
        if (active !== on) {
          if (active && t.voters.length >= MAX_VOTERS) throw ticketError(409, 'Dieses Ticket hat bereits die maximale Stimmenzahl');
          t.voters = active ? [...t.voters, actor.id] : t.voters.filter((v) => v !== actor.id); touch(t);
        }
        return view(t, actor);
      });
    },
    comment(id, text, actor) {
      const who = person(actor), clean = plain(text, 2000);
      if (!clean) throw ticketError(400, 'Schreib zuerst einen Kommentar');
      return mutate((next) => {
        const t = get(id, next);
        if (t.comments.length >= MAX_COMMENTS) throw ticketError(409, 'Dieses Ticket hat bereits 100 Kommentare');
        t.comments.push({ id: t.nextComment++, author: who, text: clean, at: now() }); touch(t);
        return view(t, actor);
      });
    },
    update(id, data, actor) {
      const who = person(actor);
      return mutate((next) => {
        const t = get(id, next);
        if (!actor.admin && t.author.id !== actor.id) throw ticketError(403, 'Du darfst nur eigene Tickets bearbeiten');
        if (has(data, 'status') && !actor.admin) throw ticketError(403, 'Nur die Verwaltung darf den Status ändern');
        if (data.revision !== t.revision) throw ticketError(409, 'Das Ticket wurde inzwischen geändert. Lade es neu und prüfe deine Änderung');
        if (has(data, 'status') && !has(TICKET_STATUS, data.status)) throw ticketError(400, 'Ungültiger Ticket-Status');
        Object.assign(t, fields({ ...t, ...data }, games));
        if (has(data, 'status') && data.status !== t.status) {
          if (t.history.length >= 100) throw ticketError(409, 'Dieses Ticket hat bereits 100 Statusänderungen');
          t.history.push({ from: t.status, to: data.status, by: who.name, at: now() }); t.status = data.status;
        }
        touch(t); return view(t, actor);
      });
    },
    remove(id, actor) {
      if (!actor?.admin) throw ticketError(403, 'Nur die Verwaltung darf Tickets löschen');
      mutate((next) => { get(id, next); next.tickets = next.tickets.filter((t) => t.id !== Number(id)); });
    },
    removeComment(id, commentId, actor) {
      return mutate((next) => {
        const t = get(id, next), c = t.comments.find((c) => c.id === Number(commentId));
        if (!c) throw ticketError(404, 'Kommentar nicht gefunden');
        if (!actor?.admin && c.author.id !== actor?.id) throw ticketError(403, 'Du darfst nur eigene Kommentare löschen');
        t.comments = t.comments.filter((row) => row.id !== Number(commentId)); touch(t);
        return view(t, actor);
      });
    },
    markdown(query = {}, id = null) {
      const md = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&');
      const date = (n) => new Date(n).toISOString();
      const rows = id === null ? selected(query) : [get(id)];
      return `# Spieleabend – Tickets\n\nExport: ${date(now())}\n\n${rows.length} Ticket(s)\n\n` + rows.map((t) => `## #${t.id} · ${md(t.title)}\n\n- Art: ${TICKET_TYPES[t.type]}\n- Status: ${TICKET_STATUS[t.status]}\n- Spiel: ${md(t.game || 'Allgemein')}\n- Autor: ${md(t.author.name)}\n- Stimmen: ${t.voters.length}\n- Erstellt: ${date(t.createdAt)}\n- Aktualisiert: ${date(t.updatedAt)}\n\n${md(t.description)}\n\n### Kommentare\n\n${t.comments.map((c) => `**${md(c.author.name)}** · ${date(c.at)}\n\n> ${md(c.text).replaceAll('\n', '\n> ')}\n`).join('\n') || 'Keine Kommentare.\n'}\n### Statusverlauf\n\n${t.history.map((h) => `- ${date(h.at)} · ${TICKET_STATUS[h.from]} → ${TICKET_STATUS[h.to]} · ${md(h.by)}`).join('\n') || 'Noch keine Statusänderungen.'}\n`).join('\n---\n\n');
    },
  };
}
