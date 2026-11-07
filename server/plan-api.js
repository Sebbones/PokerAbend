import express from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { parseCookies, sameOrigin, clientIp, limiter } from './security.js';
import { createPlanStore, PLAN_ID } from './evening-plans.js';
import { normalizeProgram, programDefaults, programOptions } from './party-program.js';

export function createPlanAPI({ dir, games, secret, secure = () => false, trustProxy = false, personOf = () => null }) {
  const router = express.Router(), cookieName = 'pa_plan_visitor';
  const sign = (payload) => createHmac('sha256', secret).update('evening-plan:' + payload).digest('base64url');
  function identity(value) {
    if (typeof value !== 'string') return null;
    const [id, expires, mac, extra] = value.split('.');
    if (extra !== undefined || !/^[a-f0-9]{32}$/.test(id || '') || !/^\d{13}$/.test(expires || '') || Number(expires) <= Date.now() || !mac) return null;
    const expected = Buffer.from(sign(id + '.' + expires)), actual = Buffer.from(mac);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
  }
  let store;
  try { store = createPlanStore({ dir, games }); } catch (error) { console.error('Abendplanung:', error.message); }
  const creates = limiter({ windowMs: 3600000, max: 12 }), changes = limiter({ windowMs: 10 * 60000, max: 120 });
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend') return res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' });
      if (!req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
      const limit = req.method === 'POST' && req.path === '/' ? creates : changes;
      if (!limit.hit(clientIp(req, trustProxy))) return res.status(429).json({ error: 'Zu viele Anfragen. Bitte versuche es später erneut' });
    }
    if (!store) return res.status(503).json({ error: 'Die Planungsdatei ist nicht lesbar. Vorhandene Daten bleiben erhalten; informiere die Server-Verwaltung' });
    next();
  });
  router.use(express.json({ limit: '16kb' }));
  router.use((req, res, next) => {
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'Ungültige Anfrage' });
    req.body ||= {};
    let id = identity(parseCookies(req.headers.cookie)[cookieName]);
    if (req.accountId) {
      // V2-01: die Konto-ID ersetzt die Besucher-ID; eigene Planungen und Stimmen wandern einmalig mit
      if (id) { store.rebind(id, req.accountId); res.append('Set-Cookie', `${cookieName}=; Path=/api/plans; HttpOnly; SameSite=Strict; Max-Age=0${secure(req) ? '; Secure' : ''}`); }
      id = req.accountId;
    } else if (!id) {
      const payload = randomBytes(16).toString('hex') + '.' + (Date.now() + 365 * 86400000), token = payload + '.' + sign(payload); id = identity(token);
      res.append('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; Path=/api/plans; HttpOnly; SameSite=Strict; Max-Age=31536000${secure(req) ? '; Secure' : ''}`);
    }
    // V2-07: mit Konto zählen Name, Avatar und Spieler-ID des Servers, nie die Angaben der Anfrage
    const known = req.accountId ? personOf(req.accountId) : null;
    req.planActor = { id, name: known?.name || req.body.name, avatar: known?.name ? known.avatar : req.body.avatar, gameId: known?.gameId }; next();
  });
  const call = (fn) => (req, res, next) => { try { fn(req, res); } catch (error) { next(error); } };
  router.get('/', call((req, res) => res.json(store.list({ ...req.query, known: String(req.query.known || '').split(',').slice(0, 100) }, req.planActor))));
  router.post('/', call((req, res) => res.status(201).json({ plan: store.create(req.body, req.planActor) })));
  router.param('id', (req, res, next, id) => PLAN_ID.test(id) ? next() : res.status(404).json({ error: 'Planung nicht gefunden' }));
  router.get('/:id', call((req, res) => res.json({ plan: store.detail(req.params.id, req.planActor) })));
  router.put('/:id/vote', call((req, res) => res.json({ plan: store.vote(req.params.id, req.body, req.planActor) })));
  router.post('/:id/games', call((req, res) => res.json({ plan: store.propose(req.params.id, req.body.game, req.planActor) })));
  router.patch('/:id', call((req, res) => res.json({ plan: store.manage(req.params.id, req.body, req.planActor) })));
  router.delete('/:id', call((req, res) => { store.remove(req.params.id, req.body.revision, req.planActor); res.json({ ok: true }); }));
  const defaults = programDefaults();
  router.get('/:id/program', call((req, res) => {
    const plan = store.program(req.params.id);
    const entries = plan.games.map((id) => {
      const settings = { ...defaults[id] }; if ('rounds' in settings) settings.rounds = 1;
      if (programOptions(games.find((g) => g.id === id)).some((o) => o.key === 'target' && o.min === 0)) settings.target = 0;
      return { game: id, settings };
    });
    res.json({ config: normalizeProgram({ name: plan.name, mode: 'abend', entries }), private: plan.private });
  }));
  router.use((_req, res) => res.status(404).json({ error: 'Diese Planungsaktion gibt es nicht' }));
  router.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status === 500) console.error('Abendplanung:', error.message);
    res.status(status).json({ error: status === 500 ? 'Die Änderung konnte nicht gespeichert werden. Bitte versuche es später erneut' : error.type === 'entity.parse.failed' ? 'Ungültiges JSON' : status === 413 ? 'Die Anfrage ist zu groß' : error.message });
  });
  router.rebind = (from, to) => store?.rebind(from, to) || 0;
  router.rebindGameId = (from, to) => store?.rebindGameId(from, to) || 0;
  return router;
}
