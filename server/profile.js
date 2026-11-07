// Spielerprofile (V2-04): öffentliche Sicht nur auf freigegebene Felder, eigene Sicht mit Freigabe-Schaltern.
// Quelle sind ausschließlich echte Serverdaten (Konto, Bestenliste, Rundenablage, Erfolge) – nie Clientangaben.
// Nie nach außen: Konto-ID, Discord-ID, Tokens, Cookies. Die Game-ID ist öffentlich und kein Geheimnis.
import express from 'express';
import { sameOrigin, clientIp, limiter } from './security.js';
import { GAME_ID, PRIVACY_KEYS } from './account-store.js';

const RECENT = 10, FAVORITES = 3;
const NOT_PUBLIC = 'Dieses Profil ist nicht öffentlich.';
// Eingabe wie „k7q2“, „#K7Q2“ oder „%23K7Q2“ → „#K7Q2“; sonst null
export function normalizeGameId(input) {
  const raw = String(input ?? '').trim().toUpperCase().replace(/^#/, '');
  const id = `#${raw}`;
  return GAME_ID.test(id) ? id : null;
}

export function createProfiles({ accounts, leaderboard, achievements, games }) {
  const names = new Map(games.map((g) => [g.id, g.name]));
  function build(account, { self }) {
    const privacy = accounts.privacyOf(account.id), show = (key) => self || privacy[key];
    const detail = achievements.detailFor(account.id, account.name), unlockedAt = accounts.achievementTimes(account.id);
    const stats = detail.stats;
    const favorites = leaderboard.profile({ accountId: account.id, name: account.name }).games
      .filter((g) => names.has(g.id) && g.played > 0)
      .sort((a, b) => b.played - a.played || names.get(a.id).localeCompare(names.get(b.id), 'de')).slice(0, FAVORITES)
      .map((g) => ({ id: g.id, name: names.get(g.id), played: g.played, wins: Math.min(g.played, g.wins) }));
    const ranked = leaderboard.accountSummary(account.id);
    const out = {
      gameId: account.gameId, name: account.name || account.gameId, avatar: account.avatar || '', self: !!self,
      registered: accounts.isRegistered(account.id),
      discord: show('showDiscord') && account.discord?.name ? { name: account.discord.name } : null,
      stats: show('showStats') ? { played: stats.played, wins: stats.wins, winRate: stats.played ? Math.round((1000 * stats.wins) / stats.played) / 10 : null, rankedPlayed: ranked.played, rankedWins: ranked.wins } : null,
      favorites: show('showFavorites') ? favorites : null,
      recent: show('showRecent') ? leaderboard.accountRounds(account.id, RECENT).map((r) => ({ ...r, gameName: names.get(r.game.split('~')[0]) || r.game })) : null,
      achievements: show('showAchievements') ? { unlocked: detail.unlocked, total: detail.total, badges: detail.badges.filter((b) => b.unlocked).map((b) => ({ id: b.id, title: b.title, description: b.description, tier: b.tier, icon: b.icon, at: unlockedAt[b.id] || null })) } : null,
      shared: { discord: !!privacy.showDiscord, stats: !!privacy.showStats, favorites: !!privacy.showFavorites, recent: !!privacy.showRecent, achievements: !!privacy.showAchievements },
    };
    if (self) out.privacy = privacy;
    return out;
  }
  return {
    own: (accountId) => { const a = accounts.get(accountId); return a ? build(a, { self: true }) : null; },
    // Öffentlich: nur registrierte (Discord-verknüpfte) Konten, die ihr Profil nicht versteckt haben. Gäste haben kein öffentliches Profil.
    publicByGameId(gameId, viewerAccountId = null) {
      const id = normalizeGameId(gameId), a = id && accounts.byGameId(id);
      if (!a) return null;
      if (viewerAccountId && accounts.resolve(viewerAccountId) === a.id) return build(a, { self: true });
      if (!accounts.isRegistered(a.id) || accounts.privacyOf(a.id).hidden) return null;
      return build(a, { self: false });
    },
  };
}

export function createProfileAPI({ profiles, accounts, trustProxy = false, onChange = () => {} }) {
  const router = express.Router(), hits = limiter({ windowMs: 60000, max: 60 }), writes = limiter({ windowMs: 60000, max: 20 });
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && (!sameOrigin(req) || req.headers['x-requested-with'] !== 'spieleabend')) return res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' });
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Bitte JSON senden' });
    next();
  });
  router.use(express.json({ limit: '1kb' }));
  router.use((req, res, next) => {
    if (!hits.hit(clientIp(req, trustProxy))) { res.setHeader('Retry-After', 60); return res.status(429).json({ error: 'Zu viele Abfragen. Bitte warte kurz' }); }
    next();
  });
  router.get('/me', (req, res) => {
    const own = req.accountId && profiles.own(req.accountId);
    if (!own) return res.status(409).json({ error: 'Dein Browser nimmt keine Cookies an; ohne sie gibt es kein eigenes Profil' });
    res.json(own);
  });
  router.post('/privacy', (req, res) => {
    if (!req.accountId || !accounts.get(req.accountId)) return res.status(409).json({ error: 'Kein Konto' });
    if (!writes.hit(req.accountId)) return res.status(429).json({ error: 'Zu viele Änderungen. Bitte warte kurz' });
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.entries(body).some(([k, v]) => !PRIVACY_KEYS.includes(k) || typeof v !== 'boolean')) return res.status(400).json({ error: 'Ungültige Freigabe' });
    accounts.setPrivacy(req.accountId, body);
    onChange();
    res.json(profiles.own(req.accountId));
  });
  router.get('/:id', (req, res) => {
    const profile = profiles.publicByGameId(req.params.id, req.accountId);
    // 200 mit available:false statt 404: Browser melden 404 als Fehler, obwohl „nicht öffentlich“ ein normaler Zustand ist; die Antwort verrät nicht, ob es das Konto gibt
    if (!profile) return res.json({ available: false, error: NOT_PUBLIC });
    res.json(profile);
  });
  router.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({ error: error.type === 'entity.parse.failed' ? 'Ungültiges JSON' : status === 500 ? 'Das hat nicht geklappt' : error.message });
  });
  return router;
}
