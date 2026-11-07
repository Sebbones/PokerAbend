// /api/identity: Game-ID anzeigen, zweites Gerät verbinden, alte Statistik übernehmen.
// Alles bezieht sich auf das signierte Gast-Cookie (req.accountId); der Client nennt nie eine Konto-ID.
import express from 'express';
import { sameOrigin, clientIp, limiter } from './security.js';
import { GUEST_COOKIE, LINK_CODE_MINUTES } from './identity.js';

const MAX_CLAIMS_PER_ACCOUNT = 10;

export function createIdentityAPI({ identity, accounts, leaderboard, secure = () => false, trustProxy = false, onMerge = () => {}, onChange = () => {}, discordEnabled = false }) {
  const router = express.Router();
  const linkFails = limiter({ windowMs: 10 * 60000, max: 8 });        // falsche Codes je IP
  const linkFailsAll = limiter({ windowMs: 10 * 60000, max: 60 });    // falsche Codes insgesamt (verteiltes Raten)
  const linkCreates = limiter({ windowMs: 10 * 60000, max: 10 });     // neue Codes je Konto
  const claimHits = limiter({ windowMs: 10 * 60000, max: 20 });       // Übernahmeversuche je IP

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend')) return res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' });
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
    next();
  });
  router.use(express.json({ limit: '2kb' }));
  router.use((req, res, next) => {
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'Ungültige Anfrage' });
    req.body ||= {};
    if (!req.accountId) return res.status(409).json({ error: 'Dein Browser nimmt keine Cookies an; ohne sie gibt es keine feste Identität' });
    next();
  });
  const mine = (req) => accounts.get(req.accountId);
  const claimed = (id) => leaderboard.claims().filter((c) => c.claimedBy === id);
  const call = (fn) => (req, res, next) => { try { fn(req, res); } catch (error) { next(error); } };

  router.get('/', call((req, res) => {
    const a = mine(req);
    res.json({ gameId: a.gameId, name: a.name, claimed: claimed(a.id).map((c) => c.name), legacyAvailable: leaderboard.legacyNames().length, linkMinutes: LINK_CODE_MINUTES, discord: !!discordEnabled });
  }));

  router.post('/link/create', call((req, res) => {
    if (!linkCreates.hit(req.accountId)) return res.status(429).json({ error: 'Zu viele Codes. Bitte warte ein paar Minuten' });
    const { code, expiresAt } = identity.createLinkCode(req.accountId);
    res.json({ code, expiresAt, minutes: LINK_CODE_MINUTES });
  }));

  router.post('/link/redeem', call((req, res) => {
    const ip = clientIp(req, trustProxy);
    if (linkFails.blocked(ip) || linkFailsAll.blocked('all')) { res.setHeader('Retry-After', linkFails.retryAfter(ip) || 60); return res.status(429).json({ error: 'Zu viele falsche Codes. Bitte warte ein paar Minuten' }); }
    const target = identity.redeemLinkCode(typeof req.body.code === 'string' ? req.body.code : '');
    if (!target || !accounts.has(target)) { linkFails.hit(ip); linkFailsAll.hit('all'); return res.status(400).json({ error: 'Der Code stimmt nicht oder ist abgelaufen' }); }
    const to = accounts.get(target), from = mine(req);
    if (to.id === from.id) return res.status(400).json({ error: 'Dieses Gerät gehört schon zu dieser Person' });
    const fromGameId = from.gameId;
    accounts.merge(from.id, to.id);
    leaderboard.merge(from.id, to.id, to.name);
    onMerge(from.id, to.id, { fromGameId, toGameId: to.gameId });
    onChange();
    res.append('Set-Cookie', identity.cookie(identity.issue(to.id), { secure: secure(req) }));
    res.json({ ok: true, gameId: to.gameId });
  }));

  router.get('/legacy', call((_req, res) => res.json({ names: leaderboard.legacyNames().slice(0, 200) })));

  router.post('/claim', call((req, res) => {
    const ip = clientIp(req, trustProxy);
    if (!claimHits.hit(ip)) return res.status(429).json({ error: 'Zu viele Versuche. Bitte warte ein paar Minuten' });
    const a = mine(req);
    if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 16) return res.status(400).json({ error: 'Bitte einen alten Namen wählen' });
    if (claimed(a.id).length >= MAX_CLAIMS_PER_ACCOUNT) return res.status(409).json({ error: `Du kannst höchstens ${MAX_CLAIMS_PER_ACCOUNT} alte Namen übernehmen` });
    const result = leaderboard.claim(req.body.name, a.id, a.name);
    if (!result.ok) return res.status(409).json({ error: result.error });
    accounts.audit('Statistik übernommen', `${a.gameId}: ${result.name}`);
    onChange();
    res.json({ ok: true, name: result.name });
  }));

  router.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({ error: error.type === 'entity.parse.failed' ? 'Ungültiges JSON' : status === 500 ? 'Das hat nicht geklappt' : error.message });
  });
  return router;
}

export { GUEST_COOKIE };
