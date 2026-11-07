// /api/me: Einstellungen (V2-05/V2-15), Datenexport und Löschen. Alles bezieht sich auf das signierte Gast-Cookie (req.accountId);
// der Client nennt nie eine Konto-ID. Einstellungen sind reine Anzeige – sie ändern nie Rechte, Regeln oder die Privatsphäre (die liegt in /api/profile/privacy).
import express from 'express';
import { sameOrigin, clientIp, limiter } from './security.js';
import { GUEST_COOKIE } from './identity.js';
import { patchProblem, SETTINGS_DEFAULTS } from './settings.js';

export const EXPORT_SCHEMA = 1;

export function createMeAPI({ accounts, leaderboard, achievements, games, erase, secure = () => false, trustProxy = false, onChange = () => {} }) {
  const router = express.Router(), reads = limiter({ windowMs: 60000, max: 120 }), writes = limiter({ windowMs: 60000, max: 40 }), exports_ = limiter({ windowMs: 10 * 60000, max: 10 }), deletes = limiter({ windowMs: 10 * 60000, max: 5 });
  const names = new Map(games.map((g) => [g.id, g.name]));
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend')) return res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' });
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
    next();
  });
  router.use(express.json({ limit: '2kb' }));
  router.use((req, res, next) => {
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) && req.method !== 'GET') return res.status(400).json({ error: 'Ungültige Anfrage' });
    if (!req.accountId || !accounts.get(req.accountId)) return res.status(409).json({ error: 'Dein Browser nimmt keine Cookies an; ohne sie gibt es keine festen Einstellungen' });
    const limit = req.method === 'GET' ? reads : writes;
    if (!limit.hit(clientIp(req, trustProxy) + ':' + req.accountId)) { res.setHeader('Retry-After', 60); return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warte kurz' }); }
    next();
  });
  const view = (id) => ({ ...accounts.settingsOf(id), defaults: SETTINGS_DEFAULTS, privacy: accounts.privacyOf(id), registered: accounts.isRegistered(id) });

  router.get('/settings', (req, res) => res.json(view(req.accountId)));
  router.put('/settings', (req, res) => {
    const problem = patchProblem(req.body);
    if (problem) return res.status(400).json({ error: problem });
    accounts.setSettings(req.accountId, req.body); onChange();
    res.json(view(req.accountId));
  });
  router.post('/settings/reset', (req, res) => { accounts.resetSettings(req.accountId); onChange(); res.json(view(req.accountId)); });

  // Alle gespeicherten Daten dieses Kontos. Mitspieler tauchen nur als Anzahl auf, nie mit Name oder Konto.
  router.get('/export', (req, res) => {
    if (!exports_.hit(req.accountId)) { res.setHeader('Retry-After', 600); return res.status(429).json({ error: 'Zu viele Exporte. Bitte warte ein paar Minuten' }); }
    const a = accounts.get(req.accountId), id = a.id, detail = achievements.detailFor(id, a.name), times = accounts.achievementTimes(id);
    const profile = leaderboard.profile({ accountId: id, name: a.name });
    const payload = {
      schemaVersion: EXPORT_SCHEMA, exportedAt: new Date().toISOString(),
      account: { gameId: a.gameId, name: a.name, avatar: a.avatar, createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null, discord: accounts.isRegistered(id) ? { linked: true, name: a.discord?.name || '' } : { linked: false } },
      settings: accounts.settingsOf(id), privacy: accounts.privacyOf(id),
      statistics: { games: profile.games.filter((g) => g.played > 0).map((g) => ({ game: g.id, name: names.get(g.id) || g.id, played: g.played, wins: g.wins })), ranked: leaderboard.accountSummary(id) },
      achievements: detail.badges.filter((b) => b.unlocked).map((b) => ({ id: b.id, title: b.title, unlockedAt: times[b.id] ? new Date(times[b.id]).toISOString() : null })),
      rounds: leaderboard.accountRounds(id, 5000).map((r) => ({ game: r.game, at: new Date(r.at).toISOString(), ranked: r.ranked, won: r.win, place: r.place, points: r.points, players: r.players })),
      claimedLegacyNames: leaderboard.claims().filter((c) => c.claimedBy === id).map((c) => c.name),
    };
    res.setHeader('Content-Disposition', `attachment; filename="spieleabend-daten-${a.gameId.slice(1)}.json"`);
    res.type('application/json').send(JSON.stringify(payload, null, 2));
  });

  // Löschen: nur mit eingetippter Game-ID. Entfernt Konto, Einstellungen, Freigaben, Erfolge, Discord-Verknüpfung und alte Namensstatistik;
  // Runden anderer bleiben, das Konto darin wird zu „Gelöschtes Konto“. Das Gast-Cookie wird gelöscht.
  router.post('/delete', (req, res) => {
    if (!deletes.hit(req.accountId)) { res.setHeader('Retry-After', 600); return res.status(429).json({ error: 'Zu viele Versuche. Bitte warte ein paar Minuten' }); }
    const a = accounts.get(req.accountId), typed = typeof req.body.confirm === 'string' ? req.body.confirm.trim().toUpperCase().replace(/^#?/, '#') : '';
    if (typed !== a.gameId) return res.status(400).json({ error: 'Zur Bestätigung bitte die eigene Game-ID eingeben' });
    erase(a.id); onChange();
    res.append('Set-Cookie', `${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure(req) ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  router.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({ error: error.type === 'entity.parse.failed' ? 'Ungültiges JSON' : status === 500 ? 'Das hat nicht geklappt' : error.message });
  });
  return router;
}
