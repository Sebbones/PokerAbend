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

export function createAdmin({ password, secret, dataDir, secure = () => false, trustProxy = false, log, errors, system, version, rooms, closeRoom, online, announce, cancelUpdate }) {
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
  api.use(express.json({ limit: '2kb' }));
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
      data, errors: errors.list(50), log: log.recent(50), update: maintenance.state(), maxUpdateMinutes: MAX_UPDATE_MINUTES,
    });
  });
  api.post('/rooms/:code/close', (req, res) => {
    const info = closeRoom(String(req.params.code || '').toUpperCase());
    if (!info) return res.status(404).json({ error: 'Diesen Tisch gibt es nicht (mehr)' });
    log.add('Raum geschlossen', `${info.code} (${info.gameName}, ${info.humans} Spieler)`);
    res.json({ ok: true });
  });
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
