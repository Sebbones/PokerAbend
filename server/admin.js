// Admin-Seite (/admin): eigener Zugang über ADMIN_PASSWORD, nicht über das Gruppenpasswort.
// Ohne ADMIN_PASSWORD wird die Seite gar nicht eingehängt. Alle Aktionen landen im Admin-Protokoll.
import express from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCookies, sameOrigin, clientIp, limiter } from './security.js';
import { maintenance, MAX_UPDATE_MINUTES } from './maintenance.js';
import { dataFiles } from './ops.js';

export const ADMIN_COOKIE = 'pa_admin';
const HOURS = 8;
const dir = join(dirname(fileURLToPath(import.meta.url)), 'admin');
const equal = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

export function createAdmin({ password, secret, dataDir, secure = () => false, trustProxy = false, log, errors, system, version, rooms, closeRoom, online, announce, cancelUpdate, claims = () => [], undoClaim = () => null, tools = null, tickets = null }) {
  const router = express.Router();
  const pwHash = createHash('sha256').update('admin:' + password).digest('hex');
  const sign = (payload) => createHmac('sha256', secret).update(`admin:${pwHash}:${payload}`).digest('base64url');
  const issue = () => { const payload = `${randomBytes(12).toString('hex')}.${Date.now() + HOURS * 3600000}`; return `${payload}.${sign(payload)}`; };
  const valid = (value) => {
    if (typeof value !== 'string') return false;
    const parts = value.split('.');
    if (parts.length !== 3 || !/^[a-f0-9]{24}$/.test(parts[0]) || !/^\d{13}$/.test(parts[1]) || Number(parts[1]) <= Date.now()) return false;
    return equal(parts[2], sign(`${parts[0]}.${parts[1]}`));
  };
  const cookie = (req, value, seconds) => `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure(req) ? '; Secure' : ''}`;
  const loginLimit = limiter({ windowMs: 15 * 60000, max: 8 });
  const actionLimit = limiter({ windowMs: 60000, max: 60 });
  const html = readFileSync(join(dir, 'admin.html'), 'utf8');
  const script = readFileSync(join(dir, 'admin.js'), 'utf8');

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    next();
  });
  router.get('/', (_req, res) => res.type('html').send(html));
  router.get('/app.js', (_req, res) => res.type('js').send(script));

  const api = express.Router();
  api.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend')) return res.status(403).json({ error: 'Diese Aktion muss von der Admin-Seite kommen' });
    if (!['GET', 'HEAD', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
    next();
  });
  api.use(express.json({ limit: '8kb' }));
  api.use((req, _res, next) => { req.body ||= {}; req.admin = valid(parseCookies(req.headers.cookie)[ADMIN_COOKIE]); next(); });

  api.post('/login', (req, res) => {
    const ip = clientIp(req, trustProxy);
    if (loginLimit.blocked(ip)) { res.setHeader('Retry-After', loginLimit.retryAfter(ip)); return res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen' }); }
    const input = createHash('sha256').update('admin:' + (typeof req.body.password === 'string' ? req.body.password : '')).digest('hex');
    if (!equal(input, pwHash)) {
      loginLimit.hit(ip);
      log.add('Anmeldung fehlgeschlagen');
      return res.status(401).json({ error: 'Das Admin-Passwort stimmt nicht' });
    }
    loginLimit.reset(ip);
    log.add('Angemeldet');
    res.setHeader('Set-Cookie', cookie(req, issue(), HOURS * 3600));
    res.json({ ok: true });
  });
  api.post('/logout', (req, res) => { res.setHeader('Set-Cookie', cookie(req, '', 0)); res.json({ ok: true }); });

  // Alles ab hier nur mit gültigem Admin-Cookie
  api.use((req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Nicht als Admin angemeldet' });
    if (!actionLimit.hit(clientIp(req, trustProxy))) return res.status(429).json({ error: 'Zu viele Anfragen' });
    next();
  });
  api.get('/status', (_req, res) => {
    const list = rooms(), data = dataFiles(dataDir);
    res.json({
      version: version.version, commit: version.commit, now: Date.now(), system: system.stats(), online: online(), rooms: list,
      data, claims: claims(), errors: errors.list(50), log: log.recent(50), update: maintenance.state(), maxUpdateMinutes: MAX_UPDATE_MINUTES,
    });
  });
  api.post('/rooms/:code/close', (req, res) => {
    const info = closeRoom(String(req.params.code || '').toUpperCase());
    if (!info) return res.status(404).json({ error: 'Diesen Tisch gibt es nicht (mehr)' });
    log.add('Raum geschlossen', `${info.code} (${info.gameName}, ${info.humans} Spieler)`);
    res.json({ ok: true });
  });
  // Falsche Zuordnung einer alten Statistik zu einem Konto rückgängig machen (V2-01); der alte Eintrag war nie verändert
  api.post('/identity/claims/undo', (req, res) => {
    const key = typeof req.body.key === 'string' && req.body.key.length <= 40 ? req.body.key : '';
    const info = key && undoClaim(key);
    if (!info) return res.status(404).json({ error: 'Diese Zuordnung gibt es nicht (mehr)' });
    log.add('Statistik-Zuordnung rückgängig', `${info.name}${info.gameId ? ' von ' + info.gameId : ''}`);
    res.json({ ok: true });
  });
  // ---- V2-17: Moderation. Jede Änderung steht im Admin-Protokoll; lesende Aufrufe nicht.
  const guard = (fn) => (req, res) => {
    try { res.json(fn(req, res)); }
    catch (error) { res.status(error.status >= 400 && error.status < 600 ? error.status : 500).json({ error: error.status ? error.message : 'Das hat nicht geklappt' }); }
  };
  const q = (req, key, max = 80) => (typeof req.query[key] === 'string' ? req.query[key].slice(0, max) : '');
  if (tools) {
    api.get('/reviews', guard(() => tools.reviews.list()));
    api.get('/reviews/:id', guard((req) => tools.reviews.get(req.params.id)));
    api.post('/reviews/:id/hide', guard((req) => { const info = tools.reviews.hide(req.params.id, req.body.hidden); log.add(info.hidden ? 'Rückblick ausgeblendet' : 'Rückblick eingeblendet', info.name); return { ok: true, ...info }; }));
    api.get('/leaderboard', guard((req) => tools.leaderboard(q(req, 'game', 40) || 'all', q(req, 'period', 10) || 'all')));
    api.get('/rounds', guard((req) => tools.rounds.list({ game: q(req, 'game', 40) || 'all', hidden: req.query.hidden === '1', limit: Number(req.query.limit) || 50 })));
    api.post('/rounds/:id/hide', guard((req) => { const info = tools.rounds.hide(req.params.id, req.body.hidden); log.add(info.hidden ? 'Partie ausgeblendet' : 'Partie eingeblendet', `${info.game} ${info.id}`); return { ok: true, ...info }; }));
    api.get('/players', guard((req) => tools.players.search(q(req, 'q', 40))));
    api.post('/players/merge', guard((req) => { const info = tools.players.merge(req.body.from, req.body.to); log.add('Spieler zusammengeführt', `${info.from} → ${info.to}`); return { ok: true, ...info }; }));
  }
  if (tickets) {
    api.get('/tickets', guard((req) => tickets.list({ q: q(req, 'q', 100), status: q(req, 'status', 12), type: q(req, 'type', 8), page: Number(req.query.page) || 1 })));
    api.get('/tickets/:id', guard((req) => ({ ticket: tickets.detail(req.params.id) })));
    api.patch('/tickets/:id', guard((req) => { const t = tickets.update(req.params.id, req.body); log.add('Ticket bearbeitet', `#${t.id} ${t.title} (${t.status})`); return { ticket: t }; }));
    api.post('/tickets/:id/comments', guard((req) => { const t = tickets.comment(req.params.id, req.body.text); log.add('Ticket kommentiert', `#${t.id} ${t.title}`); return { ticket: t }; }));
    api.delete('/tickets/:id/comments/:comment', guard((req) => { const t = tickets.removeComment(req.params.id, req.params.comment); log.add('Ticket-Kommentar gelöscht', `#${t.id} Kommentar ${req.params.comment}`); return { ticket: t }; }));
    api.delete('/tickets/:id', guard((req) => { const before = tickets.detail(req.params.id); tickets.remove(req.params.id); log.add('Ticket gelöscht', `#${before.id} ${before.title}`); return { ok: true }; }));
  }
  api.get('/log', (req, res) => res.json({ entries: log.recent(Math.max(1, Math.min(500, Number(req.query.limit) || 200))) }));
  api.post('/update', (req, res) => {
    try { const state = announce(req.body.minutes, 'admin'); log.add('Update angekündigt', `in ${req.body.minutes} Minuten`); res.json({ ok: true, update: state }); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });
  api.delete('/update', (_req, res) => { if (cancelUpdate()) log.add('Update-Ankündigung zurückgenommen'); res.json({ ok: true }); });
  api.use((_req, res) => res.status(404).json({ error: 'Diese Admin-Aktion gibt es nicht' }));
  api.use((err, _req, res, _next) => res.status(err.status >= 400 && err.status < 500 ? err.status : 500).json({ error: err.type === 'entity.parse.failed' ? 'Ungültiges JSON' : 'Das hat nicht geklappt' }));
  router.use('/api', api);
  return { router, valid, cookieName: ADMIN_COOKIE };
}
