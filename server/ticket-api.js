import express from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { parseCookies, sameOrigin, clientIp, limiter } from './security.js';
import { createTicketStore, ticketError, TICKET_STATUS, TICKET_TYPES } from './tickets.js';

const VISITOR = 'pa_ticket_visitor', ADMIN = 'pa_ticket_admin';
const equal = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
// Fester Akteur für Änderungen aus /admin. Er ist keine Spieler-ID und kann nie einem Cookie entsprechen.
export const ADMIN_ACTOR = Object.freeze({ id: '0'.repeat(31) + 'a', name: 'Admin', avatar: '🦉', admin: true });
export function createTicketAPI({ dir, games, secret, adminPassword = '', secure = () => false, trustProxy = false, personOf = () => null }) {
  const router = express.Router();
  const passwordHash = createHash('sha256').update(adminPassword).digest('hex');
  const sign = (name, payload) => createHmac('sha256', secret).update(`${name}:${name === ADMIN ? passwordHash : ''}:${payload}`).digest('base64url');
  const issue = (name, hours) => {
    const payload = `${randomBytes(16).toString('hex')}.${Date.now() + hours * 3600000}`;
    return `${payload}.${sign(name, payload)}`;
  };
  const identity = (name, value) => {
    if (typeof value !== 'string') return null;
    const parts = value.split('.');
    if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[0]) || !/^\d{13}$/.test(parts[1]) || Number(parts[1]) <= Date.now()) return null;
    return equal(parts[2], sign(name, `${parts[0]}.${parts[1]}`)) ? parts[0] : null;
  };
  const cookie = (req, name, value, seconds) => `${name}=${encodeURIComponent(value)}; Path=/api/tickets; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure(req) ? '; Secure' : ''}`;
  const clearAdmin = (req, res) => res.append('Set-Cookie', cookie(req, ADMIN, '', 0));
  const limits = {
    login: limiter({ windowMs: 15 * 60000, max: 8 }),
    create: limiter({ windowMs: 3600000, max: 12 }),
    comment: limiter({ windowMs: 3600000, max: 60 }),
    vote: limiter({ windowMs: 10 * 60000, max: 120 }),
    change: limiter({ windowMs: 10 * 60000, max: 120 }),
  };
  const limit = (name, req) => {
    const key = clientIp(req, trustProxy);
    if (!limits[name].hit(key)) throw ticketError(429, 'Zu viele Anfragen. Bitte versuche es später erneut');
  };
  let store, unavailable = false;
  try { store = createTicketStore({ dir, games: games.map((g) => g.id) }); }
  catch (e) { unavailable = true; console.error('Ticket-Board:', e.message); }
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend')) return res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' });
    if (!['GET', 'HEAD', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
    next();
  });
  router.use(express.json({ limit: '16kb' }));
  router.use((req, res, next) => {
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'Ungültige Anfrage' });
    req.body ||= {};
    const cookies = parseCookies(req.headers.cookie);
    let id = identity(VISITOR, cookies[VISITOR]);
    if (req.accountId) {
      // V2-01: die Konto-ID ersetzt die Besucher-ID; frühere Tickets und Stimmen wandern einmalig mit
      if (id && store) { store.rebind(id, req.accountId); res.append('Set-Cookie', cookie(req, VISITOR, '', 0)); }
      id = req.accountId;
    } else if (!id) {
      const token = issue(VISITOR, 24 * 365); id = identity(VISITOR, token);
      res.append('Set-Cookie', cookie(req, VISITOR, token, 365 * 86400));
    }
    // V2-07: Mit Konto kommen Anzeigename, Avatar und öffentliche Spieler-ID vom Server, nicht aus der Anfrage.
    const known = req.accountId ? personOf(req.accountId) : null;
    req.ticketActor = { id, admin: !!adminPassword && !!identity(ADMIN, cookies[ADMIN]), name: known?.name || req.body?.name, avatar: known?.name ? known.avatar : req.body?.avatar, gameId: known?.gameId };
    next();
  });
  const call = (fn) => (req, res, next) => { try { fn(req, res); } catch (e) { next(e); } };
  router.post('/admin/login', call((req, res) => {
    if (!adminPassword) throw ticketError(503, 'Die Verwaltung ist noch nicht eingerichtet');
    const ip = clientIp(req, trustProxy);
    if (limits.login.blocked(ip)) throw ticketError(429, 'Zu viele Anmeldeversuche. Bitte später erneut versuchen');
    const input = createHash('sha256').update(typeof req.body.password === 'string' ? req.body.password : '').digest('hex');
    if (!equal(input, passwordHash)) { limits.login.hit(ip); throw ticketError(401, 'Das Admin-Passwort stimmt nicht'); }
    limits.login.reset(ip);
    res.append('Set-Cookie', cookie(req, ADMIN, issue(ADMIN, 8), 8 * 3600));
    res.json({ ok: true });
  }));
  router.post('/admin/logout', (req, res) => { clearAdmin(req, res); res.json({ ok: true }); });
  router.use((_req, res, next) => unavailable ? res.status(503).json({ error: 'Die Ticket-Datei ist nicht lesbar. Bitte die Server-Verwaltung informieren; die gespeicherten Daten bleiben erhalten' }) : next());
  const metadata = (req) => ({ viewer: { admin: req.ticketActor.admin, adminEnabled: !!adminPassword }, statuses: TICKET_STATUS, types: TICKET_TYPES, games: games.map(({ id, name }) => ({ id, name })) });
  const markdown = (req, res, id = null) => {
    const name = id === null ? 'spieleabend-tickets.md' : `spieleabend-ticket-${id}.md`;
    res.type('text/markdown; charset=utf-8').setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(store.markdown(req.query, id));
  };
  router.get('/export.md', call((req, res) => markdown(req, res)));
  router.get('/', call((req, res) => res.json({ ...store.list(req.query, req.ticketActor), ...metadata(req) })));
  router.post('/', call((req, res) => { limit('create', req); res.status(201).json({ ticket: store.create(req.body, req.ticketActor) }); }));
  router.param('id', (req, res, next, id) => /^[1-9]\d{0,8}$/.test(id) ? next() : res.status(404).json({ error: 'Ticket nicht gefunden' }));
  router.get('/:id/export.md', call((req, res) => markdown(req, res, req.params.id)));
  router.get('/:id', call((req, res) => res.json({ ticket: store.detail(req.params.id, req.ticketActor), ...metadata(req) })));
  router.patch('/:id', call((req, res) => { limit('change', req); res.json({ ticket: store.update(req.params.id, req.body, req.ticketActor) }); }));
  router.put('/:id/vote', call((req, res) => { limit('vote', req); res.json({ ticket: store.vote(req.params.id, req.body.active, req.ticketActor) }); }));
  router.post('/:id/comments', call((req, res) => { limit('comment', req); res.status(201).json({ ticket: store.comment(req.params.id, req.body.text, req.ticketActor) }); }));
  router.delete('/:id/comments/:comment', call((req, res) => { limit('change', req); res.json({ ticket: store.removeComment(req.params.id, req.params.comment, req.ticketActor) }); }));
  router.delete('/:id', call((req, res) => { limit('change', req); store.remove(req.params.id, req.ticketActor); res.json({ ok: true }); }));
  router.use((_req, res) => res.status(404).json({ error: 'Diese Ticket-Aktion gibt es nicht' }));
  router.use((err, _req, res, _next) => {
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status === 500) console.error('Ticket-Board:', err.message);
    res.status(status).json({ error: status === 413 ? 'Die Anfrage ist zu groß' : status === 500 ? 'Die Änderung konnte nicht gespeichert werden. Bitte versuche es später erneut' : err.type === 'entity.parse.failed' ? 'Ungültiges JSON' : err.message });
  });
  // Verwaltung über /admin (V2-17): eigener Akteur, kein Cookie-Zugang
  const must = () => { if (!store) throw ticketError(503, 'Die Ticket-Datei ist nicht lesbar'); return store; };
  const admin = {
    list: (query = {}) => ({ ...must().list({ sort: 'updated', ...query }, ADMIN_ACTOR), statuses: TICKET_STATUS, types: TICKET_TYPES }),
    detail: (id) => must().detail(id, ADMIN_ACTOR),
    update: (id, data) => must().update(id, data, ADMIN_ACTOR),
    comment: (id, text) => must().comment(id, text, ADMIN_ACTOR),
    removeComment: (id, commentId) => must().removeComment(id, commentId, ADMIN_ACTOR),
    remove: (id) => must().remove(id, ADMIN_ACTOR),
  };
  return { router, clearAdmin, admin, rebind: (from, to) => store?.rebind(from, to) || 0, rebindGameId: (from, to) => store?.rebindGameId(from, to) || 0 };
}
