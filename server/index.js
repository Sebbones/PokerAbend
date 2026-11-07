// Webserver + Echtzeit-Verbindung – die gemeinsame Plattform für alle Spiele: Login, Lobby, Raumcodes,
// Spielerverwaltung, Reconnect, Speichern, Verlauf und Sicherheit. Die Spiele selbst liegen in games/.
import './env.js'; // .env zuerst einlesen – alles danach liest process.env
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRanked } from './ranked.js';
import { fileURLToPath } from 'node:url';
import { GAMES, DEFAULT_GAME, gameList, singleplayerGameList, gameEvents, PLANNED, plannedGames } from '../games/index.js';
import { maintenance, assertNewRoundAllowed } from './maintenance.js';
import { versionInfo, createAdminLog, createClientErrors, createSystemSampler, cleanClientError } from './ops.js';
import { createAdmin } from './admin.js';
import { resolvedRoadmap, whatsNew } from '../games/roadmap.js';
import { createPresence } from './presence.js';
import { createTicketAPI } from './ticket-api.js';
import { configureProgram, beginProgram, nextProgramStep, recordProgramResult, publicProgram, restoreProgram, programActive, programGames, programDefaults, programOptions, programSeats, validateProgramPlayers } from './party-program.js';
import {
  COOKIE, loadSecret, createAuth, parseCookies, cookieHeader, limiter, bucket,
  securityHeaders, sameOrigin, clientIp, safeNext,
} from './security.js';
import { createCodes, normalize } from './codes.js';
import { createLeaderboard, RANK_PERIODS } from './leaderboard.js';
import { createAccountStore } from './account-store.js';
import { createIdentity, GUEST_COOKIE } from './identity.js';
import { createIdentityAPI } from './identity-api.js';
import { backupBeforeIdentityMigration } from './data-migration.js';
import { createDiscordAuth, discordConfig } from './auth-discord.js';
import { addBot, removeBot, setBotDifficulty, createBotRunner } from './bots.js';
import {botMetadata,savedBotLevel} from '../games/bot-levels.js';
import { BOTS } from '../games/bots.js';
import { configureBoards, boardStore } from '../games/monopoly/boards.js';
import { createReviewStore, reviewMarkdown } from './evening-reviews.js';
import { createPlanAPI } from './plan-api.js';
import { createAchievements } from './achievements.js';
import { createProfiles, createProfileAPI } from './profile.js';
import { createMeAPI } from './settings-api.js';
import { variantOf, variantName, scoreKey } from '../games/variants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
// V2-01: vor der ersten Nutzung des neuen Formats die vorhandenen Dateien einmalig sichern (nur kopieren)
try {
  const backup = backupBeforeIdentityMigration(DATA_DIR);
  if (backup.created) console.log(`Sicherung vor der Konto-Umstellung: ${backup.files.length} Datei(en) in backups/pre-v2-01`);
} catch (error) { console.error('Sicherung vor der Konto-Umstellung fehlgeschlagen:', error.message); }
configureBoards(DATA_DIR);
let reviews = null;
try { reviews = createReviewStore({ dir: DATA_DIR, games: GAMES }); }
catch (error) { console.error('Abend-Rückblicke konnten nicht geladen werden:', error.message); }
function archiveReview(room, { stopped = false, restoring = false } = {}) {
  const p = room.partyProgram;
  if (!p?.results?.length) return;
  if (stopped && p.status !== 'done') { p.status = 'stopped'; p.endedAt ||= Date.now(); }
  try { reviews?.capture(room, { restoring }); } catch (error) { console.error('Abend-Rückblick konnte nicht gespeichert werden:', error.message); }
}
const SAVE_FILE = join(DATA_DIR, 'rooms.json');
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 50);
const ROOM_TTL_MIN = 30; // Notbremse: Tische ohne Verbindung werden spätestens nach 30 Minuten geschlossen
const AWAY_MIN = Number(process.env.PLAYER_TIMEOUT_MIN || 5); // wer so lange offline ist, fliegt raus

const PUBLIC_DIR = join(__dirname, '..', 'public');
const SITE_PASSWORD = process.env.SITE_PASSWORD || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''; // eigener Zugang für /admin; leer = Admin-Seite aus
const VERSION = versionInfo();
const UPDATE_DEFAULT_MIN = Number(process.env.UPDATE_ANNOUNCE_MIN || 5); // Vorlauf bei Ankündigung per Signal (SIGUSR2)
const UPDATE_DRAIN_MAX_MIN = Number(process.env.UPDATE_DRAIN_MAX_MIN || 15); // so lange darf eine laufende Runde nach Fristende noch fertig werden
const TRUST_PROXY = ['1', 'true', 'yes'].includes(String(process.env.TRUST_PROXY || '').toLowerCase());
const MAX_CONN_PER_IP = Number(process.env.MAX_CONN_PER_IP || 30);

// Anmeldung: Seitenpasswort (SITE_PASSWORD), ohne Passwort offen (nur lokal zum Testen)
const MODE = SITE_PASSWORD ? 'password' : 'open';
const SECRET = loadSecret(DATA_DIR);
const auth = createAuth({ password: SITE_PASSWORD, secret: SECRET });
const accounts = createAccountStore(DATA_DIR, { onChange: () => save() });   // interne Konto-IDs und öffentliche Game-IDs
const identity = createIdentity({ secret: SECRET });
const leaderboard = createLeaderboard(DATA_DIR); // Bestenliste über alle Abende
const ticketAPI = createTicketAPI({ dir: DATA_DIR, games: Object.values(GAMES), secret: SECRET, adminPassword: process.env.TICKET_ADMIN_PASSWORD || '', secure: (req) => isSecure(req), trustProxy: TRUST_PROXY });
if (MODE === 'password') console.log('Anmeldung: Seitenpasswort');
else console.warn('⚠ Kein SITE_PASSWORD eingerichtet – jeder mit dem Link kommt auf die Seite. Nur lokal zum Testen!');

// Grenzen gegen Raten und Spam (pro IP)
const limits = {
  login: limiter({ windowMs: 15 * 60e3, max: 8 }),     // falsche Passwörter
  create: limiter({ windowMs: 10 * 60e3, max: Number(process.env.CREATE_LIMIT || 6) }),    // neue Tische (Tests setzen CREATE_LIMIT höher)    // neue Tische
  badCode: limiter({ windowMs: 10 * 60e3, max: 20 }),  // falsche Tisch-Codes
  newPlayer: limiter({ windowMs: 10 * 60e3, max: 15 }), // neue Namen
};
const connections = new Map(); // IP → offene Verbindungen

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.use(securityHeaders);
app.get('/health', (_req, res) => res.json({ ok: true, version: VERSION.version, commit: VERSION.short, uptime: Math.round(process.uptime()) }));

const isSecure = (req) => req.secure || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
const passwordOk = (req) => auth.valid(parseCookies(req.headers.cookie)[COOKIE]);
// Zugang: Gruppenpasswort-Cookie oder eine gültige Discord-Sitzung (nur mit DISCORD_GUILD_ID und Mitgliedschaft; nie Admin)
const hasAccess = (cookieHeader) => auth.valid(parseCookies(cookieHeader)[COOKIE]) || !!discord?.hasAccess(cookieHeader);
const loggedIn = (req) => hasAccess(req.headers.cookie);
const discord = createDiscordAuth({
  config: discordConfig(), secret: SECRET, dataDir: DATA_DIR, accounts, identity, accountOf: (cookieHeader) => accountOf(cookieHeader),
  siteAccess: (req) => loggedIn(req), secure: (req) => isSecure(req), trustProxy: TRUST_PROXY, onChange: () => save(),
  merge: (from, to) => { accounts.merge(from, to); leaderboard.merge(from, to, accounts.get(to)?.name || ''); mergeAccounts(from, to); save(); },
});
if (discord) console.log(`Discord-Anmeldung: an${discord.config.guildId ? ' (Zugang für Mitglieder des Servers)' : ' (nur Konto verknüpfen)'}`);
const DISCORD_ERRORS = {
  nomember: 'Du bist nicht Mitglied des Discord-Servers (oder dir fehlt die nötige Rolle). Nutze das Gruppenpasswort.',
  denied: 'Die Discord-Anmeldung wurde abgebrochen.',
  state: 'Die Discord-Anmeldung ist abgelaufen oder ungültig. Bitte versuche es noch einmal.',
  expired: 'Der Discord-Code ist abgelaufen. Bitte versuche es noch einmal.',
  failed: 'Die Discord-Anmeldung hat nicht geklappt. Du kannst das Gruppenpasswort nutzen.',
};
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loginTpl = readFileSync(join(__dirname, 'login.html'), 'utf8');
function renderLogin(res, status, error, next) {
  res.status(status).type('html').setHeader('Cache-Control', 'no-store');
  const n = safeNext(next);
  const button = discord?.config.guildId ? `<div class="lobby-alt"><a class="btn btn-big" id="discord-login" href="/auth/discord/login?next=${escHtml(encodeURIComponent(n))}" data-i18n>Mit Discord anmelden</a></div>` : '';
  res.send(loginTpl.replace('{{ERROR}}', escHtml(error)).replace('{{NEXT}}', escHtml(n)).replace('{{DISCORD}}', button));
}

// ---------- Anmelde-Routen ----------
app.get('/login', (req, res) => {
  if (MODE === 'open' || loggedIn(req)) return res.redirect(safeNext(req.query.next));
  renderLogin(res, 200, DISCORD_ERRORS[req.query.discord] || '', req.query.next);
});
app.post('/login', express.urlencoded({ extended: false, limit: '2kb' }), (req, res) => {
  if (MODE !== 'password') return res.redirect(303, '/');
  const ip = clientIp(req, TRUST_PROXY);
  const next = req.body?.next;
  if (limits.login.blocked(ip)) {
    const wait = limits.login.retryAfter(ip);
    res.setHeader('Retry-After', wait);
    return renderLogin(res, 429, `Zu viele Versuche. Probier es in ${Math.ceil(wait / 60)} Minuten nochmal.`, next);
  }
  if (!auth.checkPassword(req.body?.password)) {
    limits.login.hit(ip);
    return renderLogin(res, 401, 'Das Passwort stimmt nicht.', next);
  }
  limits.login.reset(ip);
  res.setHeader('Set-Cookie', cookieHeader(auth.issue(), { secure: isSecure(req) }));
  res.redirect(303, safeNext(next));
});

app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', cookieHeader('', { secure: isSecure(req), maxAgeDays: 0 }));
  if (discord) { discord.revokeCurrent(req.headers.cookie); discord.clearCookie(req, res); }
  ticketAPI.clearAdmin(req, res);
  res.redirect(303, '/login');
});

// Discord: Anmelde- und Rückkehr-Routen müssen vor der Anmeldeprüfung liegen (eigene Prüfungen darin). Ohne Einrichtung: 404.
app.use('/auth/discord', discord ? discord.router : (_req, res) => res.status(404).type('text').send('Nicht gefunden'));

// Alles ab hier nur angemeldet. Offen bleibt nur, was die Login-Seite braucht.
// Manifest und Icons auch ohne Login – sonst kann das Handy die Seite nicht als App ablegen (sie verraten nichts)
const OPEN = new Set(['/style.css', '/login.js', '/i18n.js', '/i18n-en.js', '/discord-en.js', '/fonts/bricolage.woff2', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']);
const isPage = (req) => req.method === 'GET' && (req.path === '/' || req.path === '/index.html');
app.use((req, res, next) => {
  if (MODE === 'open' || OPEN.has(req.path)) return next();
  if (loggedIn(req)) {
    // Bei jedem Seitenaufruf verlängern – wer regelmäßig spielt, muss nie neu eingeben
    if (isPage(req) && passwordOk(req)) res.setHeader('Set-Cookie', cookieHeader(auth.issue(), { secure: isSecure(req) }));
    return next();
  }
  if (req.method === 'GET' && !req.path.includes('.') && req.path !== '/me') {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  res.status(401).json({ error: 'Nicht angemeldet' });
});
// Gast-Identität: signiertes Cookie mit der internen Konto-ID. Es entsteht beim Seitenaufruf (nicht bei Bildern oder Skripten,
// die parallel kommen) und wird bei jedem Besuch erneuert. Ohne gültiges Cookie gibt es keine Konto-ID – der Client kann keine behaupten.
const accountOf = (cookieHeader) => { const id = identity.verify(parseCookies(cookieHeader)[GUEST_COOKIE]); return id ? accounts.ensure(id) : null; };
app.use((req, res, next) => {
  let account = accountOf(req.headers.cookie);
  const issues = isPage(req) || req.path.startsWith('/api/identity');
  if (!account && issues) account = accounts.ensure(accounts.newId());
  if (account) {
    req.accountId = account.id;
    if (issues) res.append('Set-Cookie', identity.cookie(identity.issue(account.id), { secure: isSecure(req) }));
  }
  next();
});
app.get('/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ mode: MODE, discord: { enabled: !!discord, login: !!discord?.config.guildId }, version: VERSION.version, commit: VERSION.short, games: gameList(), singleplayerGames: singleplayerGameList(), planned: plannedGames(), partyTeamGames: programGames(true).map((g) => g.id), partyDefaults: programDefaults(), programOptions: Object.fromEntries(Object.values(GAMES).map((g) => [g.id, programOptions(g)])) });
});
app.get('/api/whats-new', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ version: VERSION.version, commit: VERSION.short, entries: whatsNew() });
});
// Admin-Seite: nur mit ADMIN_PASSWORD, eigener Cookie – das Gruppenpasswort gibt hier keinen Zugang
const adminLog = createAdminLog(DATA_DIR);
const clientErrors = createClientErrors();
const sampler = createSystemSampler();
if (ADMIN_PASSWORD) {
  app.use('/admin', createAdmin({
    password: ADMIN_PASSWORD, secret: SECRET, dataDir: DATA_DIR, secure: isSecure, trustProxy: TRUST_PROXY, log: adminLog, errors: clientErrors,
    system: sampler, version: VERSION, rooms: () => adminRooms(), closeRoom: (code) => adminCloseRoom(code), online: () => adminOnline(),
    announce: (minutes, by) => announceUpdate(minutes, by), cancelUpdate: () => cancelUpdate(),
    claims: () => leaderboard.claims().map((c) => ({ key: c.key, name: c.name, by: c.by, gameId: accounts.get(c.claimedBy)?.gameId || '', claimedAt: c.claimedAt })),
    undoClaim: (key) => { const info = leaderboard.unclaim(key); if (!info) return null; save(); return { name: info.name, gameId: accounts.get(info.claimedBy)?.gameId || '' }; },
  }).router);
} else console.log('Admin-Seite aus (kein ADMIN_PASSWORD gesetzt)');
app.get('/roadmap', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(resolvedRoadmap());
});
app.use('/api/tickets', ticketAPI.router);
const planAPI = createPlanAPI({ dir: DATA_DIR, games: Object.values(GAMES), secret: SECRET, secure: isSecure, trustProxy: TRUST_PROXY });
app.use('/api/plans', planAPI);
// Zwei Geräte werden eine Person: alles, was dem alten Konto gehörte, gehört danach dem Ziel
function mergeAccounts(from, to) {
  ticketAPI.rebind(from, to); planAPI.rebind(from, to); boardStore().rebind(from, to);
  for (const room of rooms.values()) for (const p of room.players.values()) if (p.accountId === from) p.accountId = to;
  for (const s of io.sockets.sockets.values()) if (s.data.accountId === from) s.data.accountId = to;
  presence.changed();
}
app.use('/api/identity', createIdentityAPI({ identity, accounts, leaderboard, secure: isSecure, trustProxy: TRUST_PROXY, onMerge: mergeAccounts, onChange: () => save(), discordEnabled: !!discord }));
// V2-04: Spielerprofile (Router wird erst nach Bestenliste und Erfolgen angelegt)
let profileRouter = (_req, _res, next) => next();
let meRouter = (_req, _res, next) => next();
app.use('/api/me', (req, res, next) => meRouter(req, res, next));
app.use('/api/profile', (req, res, next) => profileRouter(req, res, next));
app.get('/api/achievements/players', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ names: achievements.players(req.query.q, req.accountId) });
});
app.get('/api/achievements', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    // me=1: die Erfolge genau dieses Kontos (gleiche Namen bleiben getrennt); sonst nach Name
    const account = req.query.me === '1' ? accounts.get(req.accountId) : null;
    if (account) { const { detail } = achievements.reconcile(account.id, account.name || req.query.name); accounts.save(); res.json(detail); }
    else res.json(achievements.detail(req.query.name, { viewer:req.accountId }));
  }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});
app.get('/api/evenings', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!reviews) return res.status(503).json({ error: 'Das Rückblick-Archiv ist derzeit nicht lesbar. Die Spiele funktionieren weiterhin.' });
  res.json(reviews.list({ query: String(req.query.q || '').slice(0, 80), page: Number(req.query.page) || 1, known: String(req.query.known || '').split(',').slice(0, 100) }));
});
app.get(['/api/evenings/:id', '/api/evenings/:id/export'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!reviews) return res.status(503).json({ error: 'Das Rückblick-Archiv ist derzeit nicht lesbar. Die Spiele funktionieren weiterhin.' });
  try {
    const review = reviews.get(req.params.id);
    if (req.path.endsWith('/export')) return res.attachment(`spieleabend-${review.id}.md`).type('text/markdown; charset=utf-8').send(reviewMarkdown(review));
    res.json(review);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});
// Bestenliste über alle Abende: ?game=maumau&period=all|2026-10 (nur angemeldet)
// Nur echte Spiel-IDs – „__proto__“ oder „constructor“ sind keine Spiele
const gameById = (id) => (typeof id === 'string' && Object.hasOwn(GAMES, id) ? GAMES[id] : null);
const GAME_INFO = Object.fromEntries(Object.values(GAMES).map((g) => {
  const r = g.create('INFO', {}, () => {}); const info = { id: g.id, name: g.name, lowWins: !!r.opts?.lowWins, scoreLabel: r.opts?.scoreLabel || 'Chips' }; r.dispose?.();
  return [g.id, info];
}));
for (const game of Object.values(GAMES)) for (const v of game.variants || []) if (v.id !== 'classic') {
  const room = game.create('INFO', { variant: v.id }, () => {});
  GAME_INFO[scoreKey(game.id, v.id)] = { id: scoreKey(game.id, v.id), name: variantName(game.id, game.name, v.id), lowWins: !!room.opts.lowWins, scoreLabel: room.opts.scoreLabel }; room.dispose();
}
app.get('/api/leaderboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const game = typeof req.query.game === 'string' && Object.hasOwn(GAME_INFO, req.query.game) ? req.query.game : DEFAULT_GAME;
  const months = leaderboard.months();
  const period = req.query.period === 'all' || months.includes(req.query.period) ? String(req.query.period) : 'all';
  const info = GAME_INFO[game];
  // Sortiert nach Siegen, dann Siegquote, dann Punkten (je nach Spiel wenig oder viel besser)
  const rows = leaderboard.table(game, period).sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played || (info.lowWins ? a.points / a.played - b.points / b.played : b.points - a.points));
  res.json({ game, period, months, current: leaderboard.currentMonth(), games: Object.values(GAME_INFO), rows });
});
// V2-03: nur qualifizierte (Ranked-)Ergebnisse; period: week | month | all. Die alte Namensstatistik bleibt unter /api/leaderboard.
app.get('/api/ranked', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const game = typeof req.query.game === 'string' && Object.hasOwn(GAME_INFO, req.query.game) ? req.query.game : 'all';
  const period = RANK_PERIODS.includes(req.query.period) ? req.query.period : 'all';
  res.json({ view: 'ranked', game, period, games: Object.values(GAME_INFO), rows: leaderboard.rankedTable(game, period, !!GAME_INFO[game]?.lowWins, { withOwner: true }).map(({ owner, ...row }) => ({ ...row, gameId: accounts.get(owner)?.gameId || null })), summary: leaderboard.rankedSummary(game, period) });
});
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
app.use((_req, res) => res.status(404).send('Nicht gefunden'));

const http = createServer(app);
const io = new Server(http, {
  pingInterval: 10000,
  pingTimeout: 8000,
  maxHttpBufferSize: 16 * 1024, // keine großen Pakete
  allowRequest: (req, cb) => {
    if (!sameOrigin(req)) return cb('Fremde Herkunft', false);
    const ip = clientIp(req, TRUST_PROXY);
    if ((connections.get(ip) || 0) >= MAX_CONN_PER_IP) return cb('Zu viele Verbindungen', false);
    if (!hasAccess(req.headers.cookie)) return cb('Nicht angemeldet', false);
    cb(null, true);
  },
});

/** @type {Map<string, import('./base-room.js').BaseRoom>} */
const rooms = new Map();
const presence = createPresence({
  emit: (list) => io.to('lobby').emit('presence', list),
  visibleFor: (key) => !key.startsWith('#') || !!accounts.byGameId(key) && accounts.privacyOf(accounts.byGameId(key).id).showOnline,
  identityOf: (id) => accounts.get(io.sockets.sockets.get(id)?.data.accountId)?.gameId || `session:${id}`,
  location: (id) => {
    const socket = io.sockets.sockets.get(id);
    if (!socket) return null;
    const r = rooms.get(socket.data.code), p = r?.players.get(socket.data.playerId);
    if (p?.bot) return { bot: true };
    if (!p || p.kicked || p.socketId !== id) return { kind: 'home' };
    const info = r.lobbyInfo?.();
    const seated = r.seats ? r.seats.includes(p.id) : p.seat !== null && p.seat !== undefined;
    return { kind: !r.busy ? 'lobby' : seated ? 'playing' : 'watching', private: !!r.unlisted, code: r.code, game: r.game, gameName: GAMES[r.game].name,
      canJoin: !r.busy && !!info && info.seats.length < info.max };
  },
});
const bots = createBotRunner({ isCurrent: (r) => rooms.get(r.code) === r, notify: (r) => { broadcast(r); if (!r.busy) save(); } });
setInterval(() => presence.changed(), 30000).unref(); // lease expiry also updates idle observers
const codes = createCodes(); // gemeinsam für alle Spiele
const achievements = createAchievements({ leaderboard, games: Object.values(GAMES), accounts });
const profiles = createProfiles({ accounts, leaderboard, achievements, games: Object.values(GAMES) });
profileRouter = createProfileAPI({ profiles, accounts, trustProxy: TRUST_PROXY, onChange: () => { presence.changed(); save(); } });
// V2-05: Konto-Daten löschen. Ergebnisse anderer bleiben anonymisiert; Tickets/Planungen/Bretter verlieren nur die Zuordnung zum Konto.
const DELETED_ACCOUNT = '0'.repeat(32);
function eraseAccount(accountId) {
  const removed = accounts.deleteAccount(accountId);
  leaderboard.forgetAccounts(removed);
  for (const id of removed) { ticketAPI.rebind(id, DELETED_ACCOUNT); planAPI.rebind(id, DELETED_ACCOUNT); boardStore().rebind(id, DELETED_ACCOUNT); discord?.revokeAccount(id); }
  for (const room of rooms.values()) for (const p of room.players.values()) if (removed.includes(p.accountId)) p.accountId = null;
  for (const s of io.sockets.sockets.values()) if (removed.includes(s.data.accountId)) s.data.accountId = null;
  leaderboard.save(); presence.changed(); save();
}
meRouter = createMeAPI({ accounts, leaderboard, achievements, games: Object.values(GAMES), erase: eraseAccount, secure: isSecure, trustProxy: TRUST_PROXY, onChange: () => save() });

// ---------- Speichern ----------
// Verlauf pro Tisch in eigener Datei – der Spielstand bleibt klein, der Verlauf wird nur bei Änderungen geschrieben
const historyFile = (code) => join(DATA_DIR, `history-${code}.json`); // Codes bestehen nur aus A–Z und 2–9
function saveHistory(r) {
  if (!r.historyDirty) return;
  writeFileSync(historyFile(r.code) + '.tmp', JSON.stringify(r.log));
  renameSync(historyFile(r.code) + '.tmp', historyFile(r.code));
  r.historyDirty = false;
}
function dropHistory(code) { try { unlinkSync(historyFile(code)); } catch { /* gab keine */ } }
let saveTimer = null;
achievements.backfill(); accounts.save();
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      // Nur Räume ohne laufende Runde haben einen sauberen Stand – alle anderen bleiben beim letzten Stand
      for (const r of rooms.values()) { if (!r.busy) r.lastSnapshot = snapshotOf(r); else if (r.lastSnapshot) r.lastSnapshot.unlisted = !!r.unlisted; } // Privat-Schalter gilt auch mitten in der Runde
      const data = [...rooms.values()].map((r) => r.lastSnapshot).filter(Boolean);
      writeFileSync(SAVE_FILE + '.tmp', JSON.stringify(data));
      renameSync(SAVE_FILE + '.tmp', SAVE_FILE);
      for (const r of rooms.values()) saveHistory(r);
      leaderboard.save();
      accounts.save();
      discord?.save();
    } catch (e) { console.error('Speichern fehlgeschlagen:', e.message); }
  }, 300);
}

function load() {
  if (!existsSync(SAVE_FILE)) return true;
  try {
    for (const d of JSON.parse(readFileSync(SAVE_FILE, 'utf8'))) {
      const game = GAMES[d.game || DEFAULT_GAME];
      if (!game) { console.error(`Raum ${d.code}: unbekanntes Spiel ${d.game}`); continue; }
      if (!codes.claim(d.code, game.id)) continue; // doppelter Code in der Datei: zweiten Raum nicht laden
      const r = game.restore(d, (kind, data) => onRoomChange(r, kind, data));
      r.game = game.id;
      r.unlisted = d.unlisted === true;
      for (const [pid, accountId] of Object.entries(d.playerAccounts && typeof d.playerAccounts === 'object' ? d.playerAccounts : {})) {
        const p = r.players.get(pid), resolved = accounts.resolve(accountId);
        if (p && !p.bot && resolved) p.accountId = resolved;
      }
      r.openedAt = Date.now();
      r.partyProgram = restoreProgram(d.partyProgram);
      r.lastSnapshot = d;
      archiveReview(r, { restoring: true });
      if (existsSync(historyFile(r.code))) {
        try { r.loadHistory(JSON.parse(readFileSync(historyFile(r.code), 'utf8'))); r.say('Server neu gestartet – Host startet weiter'); }
        catch (e) { console.error(`Verlauf ${r.code} nicht lesbar:`, e.message); }
      }
      rooms.set(r.code, r);
    }
    console.log(`${rooms.size} Tisch(e) wiederhergestellt`);
    return true;
  } catch (e) {
    console.error('Laden fehlgeschlagen:', e.message);
    // Die nächste Speicherung ersetzt die Datei: vorher sichern, falls sie nur teilweise lesbar war
    try { copyFileSync(SAVE_FILE, `${SAVE_FILE}.unlesbar-${new Date().toISOString().replace(/[:.]/g, '-')}`); }
    catch (error) { console.error('Sicherung von rooms.json fehlgeschlagen:', error.message); }
    return false;
  }
}

// Verlaufsdateien ohne zugehörigen Raum (nach Absturz oder Tisch-Schließen mitten im Speichern) räumen wir beim Start auf
function removeOrphanHistory() {
  try {
    for (const name of readdirSync(DATA_DIR)) {
      const m = /^history-([A-Z0-9]+)\.json(\.tmp)?$/.exec(name);
      if (m && (m[2] || !rooms.has(m[1]))) unlinkSync(join(DATA_DIR, name));
    }
  } catch { /* Datenordner fehlt noch: nichts aufzuräumen */ }
}

// Meldungen eines Raums: mit data.to nur an diesen Spieler (z. B. Anstupsen), sonst alle neu zeichnen
function onRoomChange(room, kind, data) {
  if (kind === 'frame') { broadcastFrame(room); return; }
  if (kind === 'roundStart') { ranked.freeze(room, data?.ids); return; }
  if (kind === 'roundAbort') { ranked.abort(room); return; }
  // Ergebnis einer Partie: in die Bestenliste (gespeichert wird mit dem nächsten Speichern)
  if (kind === 'result') {
    const frozen = room.rankedRound;
    if (!frozen || leaderboard.round(frozen.id)) return; // replayed completion is never counted twice
    if (recordProgramResult(room)) archiveReview(room);
    // Computer-Mitspieler sind keine Personen; Menschen werden über ihr Konto gezählt (ohne Konto: wie früher über den Namen)
    const participants = (data?.entries || []).map((entry,i) => ({ entry, player:room.players.get(data.ids?.[i]) || [...room.players.values()].find(p=>p.name===entry.name) })).filter(p=>p.player && !p.player.bot);
    const entries = participants.map(({entry,player})=>({...entry,accountId:frozen.accounts[player.id] || null}));
    const detailOf = (entry) => (entry.accountId ? achievements.detailFor(entry.accountId, entry.name) : achievements.detail(entry.name));
    const before = new Map(entries.map((p) => [p.name, new Set(detailOf(p).badges.filter((b) => b.unlocked).map((b) => b.id))]));
    leaderboard.record(room.game, entries, room.variant || 'classic');
    ranked.record(room, data);
    // Erst dauerhaft speichern, dann die neuen Abzeichen melden.
    try {
      leaderboard.save();
      const notices = entries.map((entry,i) => ({ entry, player:participants[i].player, earned:entry.accountId ? achievements.reconcile(entry.accountId,entry.name).fresh : detailOf(entry).badges.filter(b=>b.unlocked && !before.get(entry.name).has(b.id)) }));
      accounts.save();
      for (const { entry,player,earned } of notices) if (earned.length && player.socketId) io.to(player.socketId).emit('achievements', { names:earned.map(b=>b.title), name:entry.name });
    } catch (error) { console.error('Abzeichen konnten nicht gespeichert werden:', error.message); }
    save(); return;
  }
  if (data?.to) {
    const p = room.players.get(data.to);
    const { to, ...rest } = data;
    if (p?.socketId) io.to(p.socketId).emit(kind, rest);
    return;
  }
  if (kind === 'handDone') save();
  broadcast(room);
}
// playerAccounts: welcher Spieler zu welchem Konto gehört (nur Menschen), damit die Bindung einen Neustart überlebt

// ---------- Ranked-Wertung (V2-03): Logik in server/ranked.js ----------
const ranked = createRanked({ accounts, leaderboard, lowWins: (room) => GAME_INFO[scoreKey(room.game, room.variant || 'classic')]?.lowWins, newId: () => randomBytes(8).toString('hex') });
const accountsOf = (r) => Object.fromEntries([...r.players.values()].filter((p) => p.accountId && !p.bot).map((p) => [p.id, p.accountId]));
const snapshotOf = (r) => ({ ...r.snapshot(), game: r.game, code: r.code, unlisted: !!r.unlisted, playerAccounts: accountsOf(r), ...(r.partyProgram ? { partyProgram: r.partyProgram } : {}) });

function broadcastFrame(room) {
  if (!room.frame || rooms.get(room.code) !== room) return;
  const frame = room.frame();
  for (const p of room.players.values()) if (p.socketId && !p.kicked) io.to(p.socketId).emit('arena', frame);
}

// ---------- Spiel wechseln (gleicher Raum, gleicher Code, alle bleiben drin) ----------
// Gleiche Spieler-IDs und Tokens, damit Reconnect weiter klappt. Wer mitgespielt hat, sitzt wieder.
function switchRoom(old, game, settings = {}, prepare = null) {
  const before = GAMES[old.game]?.name || old.game;
  // Abendstand des alten Spiels als eine Zeile in den Verlauf (Poker: Plus/Minus, Rundenspiele: Punkte und Siege)
  const summary = old.standingsList().map((s) => ('net' in s ? `${s.name} ${s.net > 0 ? '+' : ''}${s.net}` : `${s.name} ${s.score} (${s.wins} gewonnen)`)).join(', ');
  const playing = old.seats ? [...old.seats] : [...old.players.values()].filter((p) => p.seat !== null && !p.kicked).sort((a, b) => a.seat - b.seat).map((p) => p.id);
  const next = game.create(old.code, settings, (kind, data) => onRoomChange(next, kind, data));
  next.game = game.id;
  next.loadHistory(old.log);
  for (const op of old.players.values()) {
    if (op.kicked) continue;
    next.players.set(op.id, { ...next.playerFields(op), id: op.id, token: op.token, name: op.name, avatar: op.avatar,
      bot: !!op.bot, ...(op.bot?{botDifficulty:savedBotLevel(op)}:{}), connected: op.connected, socketId: op.socketId, offlineSince: op.offlineSince, ...(op.accountId ? { accountId: op.accountId } : {}) });
  }
  next.hostId = next.players.has(old.hostId) ? old.hostId : [...next.players.keys()][0];
  next.unlisted = !!old.unlisted;
  next.openedAt = old.openedAt || Date.now();
  next.say(`Jetzt: ${variantName(game.id, game.name, next.variant)} (vorher ${before}${summary ? ` – ${summary}` : ''})`, 'summary');
  // Menschen zuerst hinsetzen; Bots, für die kein Platz mehr ist, verlassen den Raum (zuschauen bringt ihnen nichts)
  const isBot = (id) => next.players.get(id)?.bot;
  let seat = 0;
  for (const id of [...playing.filter((id) => !isBot(id)), ...playing.filter(isBot)]) {
    if (isBot(id) && !BOTS[game.id]) continue;
    try { if (next.table) next.sit(id, seat++); else next.sit(id); } catch { /* Tisch voll: schaut zu */ }
  }
  const seated = (id) => (next.table ? next.table.seats.some((s) => s?.id === id) : next.seats.includes(id));
  for (const p of [...next.players.values()]) if (p.bot && !seated(p.id)) next.players.delete(p.id);
  try { prepare?.(next); } catch (error) { next.dispose(); throw error; }
  bots.stop(old);
  old.dispose();
  rooms.set(old.code, next);
  codes.retag(old.code, game.id);
  return next;
}

function startProgramStep(room, id, program) {
  const entry = program.plan[program.index];
  const extra = room.saveExtra?.();
  program.saved[scoreKey(room.game, room.variant || 'classic')] = { settings: { ...room.settings }, extra: program.config.mode === 'abend' ? extra?.custom ? { custom: extra.custom } : null : extra };
  const saved = program.saved[scoreKey(entry.game, entry.variant || 'classic')];
  const poker = ['poker', 'omaha'].includes(entry.game);
  const next = switchRoom(room, GAMES[entry.game], { ...(poker ? programDefaults()[entry.game] : saved?.settings || {}), ...entry.settings, variant: entry.variant || 'classic', ...(poker ? { autoNext: false, rebuy: 'off', gifts: false } : {}) }, (r) => {
    if (saved?.extra) r.loadExtra(saved.extra);
    r.partyProgram = program;
    if (!r.table) r.roundNo = Number.isInteger(room.roundNo) ? room.roundNo : 0;
    validateProgramPlayers(r, { ...program.config, entries: [entry] }, programSeats(r));
    r.validateStart?.(programSeats(r));
  });
  // Beim Neustart wird nur die noch nicht gewertete Partie wiederholt.
  next.lastSnapshot = snapshotOf(next);
  next.start(id);
  return next;
}

// ---------- Hilfen ----------
// Geplante Spiele und Funktionen (games/planned.js) lassen sich nicht hosten oder auswählen
const notPlayable = (id) => (PLANNED.some((e) => e.id === String(id)) ? 'Das gibt es noch nicht – es steht auf der Liste der geplanten Spiele' : 'Dieses Spiel gibt es nicht');
function broadcast(room) {
  presence.changed();
  bots.sync(room);
  const botPlayers = [...room.players.values()].filter((p) => p.bot && !p.kicked).map((p) => botMetadata(room,p));
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('state', { ...room.view(p.id), game: room.game, bots: botPlayers, ranked: ranked.state(room), unlisted: !!room.unlisted, ...(room.partyProgram ? { partyProgram: publicProgram(room) } : {}) });
  }
  scheduleLobby();
}

// ---------- Offene Tische (Startseite) ----------
// Pro Tisch nur: Spiel, Code, Host, wer sitzt (Name, Avatar), Plätze, Stand. Keine Tokens, IDs, Karten oder Spielstände.
// Private Tische (Host-Schalter) und Tische ohne einen verbundenen Menschen fehlen. Wer die Liste abonniert, bekommt Änderungen höchstens einmal pro Sekunde.
// V2-04: Game-ID nur für registrierte Menschen, die ihr Profil nicht versteckt haben (sonst gibt es nichts anzuklicken)
function publicGameId(room, seat) {
  if (seat.bot) return {};
  const p = [...room.players.values()].find((x) => !x.bot && !x.kicked && x.name === seat.name), a = p?.accountId && accounts.get(p.accountId);
  return a && accounts.isRegistered(a.id) && !accounts.privacyOf(a.id).hidden ? { gameId: a.gameId } : {};
}
function lobbyList() {
  const out = [];
  for (const r of rooms.values()) {
    if (r.unlisted || r.abandoned) continue;
    if (![...r.players.values()].some((p) => !p.bot && !p.kicked && p.connected)) continue;
    const info = r.lobbyInfo?.();
    if (!info) continue;
    const game = GAMES[r.game];
    const host = r.players.get(r.hostId);
    out.push({
      code: r.code, game: r.game, gameName: game.name, category: game.category || 'karten',
      host: host ? { name: host.name, avatar: host.avatar } : null,
      seats: info.seats.map((s) => ({ name: s.name, avatar: s.avatar, bot: !!s.bot, ...publicGameId(r, s) })), max: info.max, watchers: info.watchers, status: info.status,
    });
  }
  return out.sort((a, b) => a.gameName.localeCompare(b.gameName, 'de') || a.code.localeCompare(b.code));
}
let lobbyTimer = null;
let lobbyLast = '';
function scheduleLobby() {
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => {
    lobbyTimer = null;
    const list = lobbyList();
    const json = JSON.stringify(list);
    if (json === lobbyLast) return;
    lobbyLast = json;
    io.to('lobby').emit('lobby', list);
  }, 1000);
  lobbyTimer.unref?.();
}

function getRoom(code) {
  const r = rooms.get(normalize(code));
  if (!r) throw new Error('Diesen Tisch gibt es nicht (mehr). Prüf den Code.');
  return r;
}

// Spieler gilt als offline (Verbindungsabbruch oder „Platz behalten“): Zug-Timer verkürzt sich, Host-Rolle wandert nach 30 s weiter
function goOffline(room, p, message) {
  p.connected = false;
  p.socketId = null;
  p.offlineSince = Date.now();
  room.say(message);
  room.afterChange();
  broadcast(room);
  if (room.hostId === p.id) {
    setTimeout(() => {
      if (room.hostId === p.id && !p.connected) { room.transferHost(); broadcast(room); }
    }, 30000).unref();
  }
}
// Die Verbindung gehört danach zu keinem Tisch mehr (Startseite, Raum verlassen)
function detach(socket, room) {
  socket.leave(room.code);
  socket.data.code = null;
  socket.data.playerId = null;
  presence.changed();
}
// Raum endgültig schließen: Timer und Bots stoppen, Code frei, Verlauf und Stand weg. Die Bestenliste bleibt (wird beim Rundenende geschrieben).
function closeRoom(room) {
  archiveReview(room, { stopped: true });
  bots.stop(room);
  room.dispose();
  rooms.delete(room.code);
  codes.release(room.code);
  dropHistory(room.code);
  scheduleLobby();
  presence.changed();
  save();
}
// Alle am Tisch landen mit einer Meldung auf der Startseite
function sendHome(room, text) {
  for (const sid of [...(io.sockets.adapter.rooms.get(room.code) || [])]) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    s.emit('closed', { text });
    s.leave(room.code);
    s.data.code = null; s.data.playerId = null;
  }
}
const humansIn = (room) => [...room.players.values()].filter((p) => !p.bot && !p.kicked);

// Spieler an das Konto der Verbindung binden (nur Menschen; Bots haben nie ein Konto)
function bindAccount(socket, player) {
  const account = accounts.get(socket.data.accountId);
  if (!account || player.bot) return;
  player.accountId = account.id;
  accounts.touch(account.id, { name: player.name, avatar: player.avatar });
}
function attach(socket, room, player) {
  if (player.socketId && player.socketId !== socket.id) {
    // Zweiter Tab: nur die neueste Verbindung darf spielen
    io.to(player.socketId).emit('replaced');
    io.sockets.sockets.get(player.socketId)?.disconnect(true);
  }
  player.socketId = socket.id;
  player.connected = true;
  socket.data.code = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);
}

// ---------- Socket-Ereignisse ----------
io.on('connection', (socket) => {
  const ip = clientIp(socket.request, TRUST_PROXY);
  // Version und laufende Update-Ankündigung gleich beim Verbinden (auch nach einem Neustart)
  socket.emit('version', { version: VERSION.version, commit: VERSION.short });
  // Konto aus dem signierten Cookie der Verbindung; Clients ohne Cookie (z. B. Skripte) haben keins und spielen wie früher
  socket.data.accountId = accountOf(socket.request.headers.cookie)?.id || null;
  if (maintenance.active) socket.emit('maintenance', maintenance.state());
  connections.set(ip, (connections.get(ip) || 0) + 1);
  socket.on('disconnect', () => {
    presence.disconnect(socket.id);
    const n = (connections.get(ip) || 1) - 1;
    if (n <= 0) connections.delete(ip); else connections.set(ip, n);
  });

  // Event-Flut bremsen: kurz 40 Nachrichten, dauerhaft 8 pro Sekunde
  const allow = bucket({ capacity: 40, perSecond: 8 });
  let strikes = 0;
  socket.use((packet, next) => {
    if (allow()) return next();
    const cb = packet[packet.length - 1];
    if (typeof cb === 'function') cb({ ok: false, error: 'Langsam – zu viele Anfragen' });
    if (++strikes > 100) socket.disconnect(true);
    next(new Error('rate'));
  });
  socket.on('error', () => { /* abgelehnte Pakete – nichts zu tun */ });

  // Jeder Handler: Fehler gehen als Antwort an den Spieler, danach bekommen alle den neuen Stand
  const on = (event, fn, { needRoom = true } = {}) => {
    socket.on(event, (payload = {}, cb = () => {}) => {
      if (typeof cb !== 'function') cb = () => {};
      try {
        let room = null; let player = null;
        if (needRoom) {
          room = rooms.get(socket.data.code);
          player = room?.players.get(socket.data.playerId);
          if (!room || !player) throw new Error('Du bist an keinem Tisch');
        }
        // Auch direkte Socket-Aufrufe dürfen die gemeinsame Pause nicht umgehen.
        if (room?.gamePaused && !['gamePause', 'freeze', 'park', 'leave', 'closeTable', 'abortRound', 'makeHost', 'unlisted'].includes(event)) throw new Error('Das Spiel ist angehalten – der Host setzt es fort');
        const res = fn(payload || {}, room, player);
        const r = res?.closed ? null : (res?.room || room);
        if (r) { r.afterChange(); if (!res?.frameOnly) broadcast(r); if (!r.busy) save(); }
        cb({ ok: true, ...(res?.reply || {}) });
      } catch (e) {
        cb({ ok: false, error: e.message, ...(e.extra || {}) }); // extra: z. B. ein Namensvorschlag
      }
    });
  };

  on('create', ({ game: gameId = DEFAULT_GAME, name, avatar, settings, unlisted, variant }) => {
    const game = gameById(gameId);
    if (!game) throw new Error(notPlayable(gameId));
    if (rooms.size >= MAX_ROOMS) throw new Error('Gerade sind zu viele Tische offen');
    if (!limits.create.hit(ip)) throw new Error('Du hast gerade sehr viele Tische erstellt. Warte ein paar Minuten.');
    const cfg = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
    const code = codes.take(game.id);
    let room, p;
    try {
      room = game.create(code, variant ? { ...cfg, variant } : cfg, (kind, data) => onRoomChange(room, kind, data));
      room.game = game.id;
      room.unlisted = unlisted === true;
      p = room.addPlayer(name, avatar);
      bindAccount(socket, p);
    } catch (e) { codes.release(code); throw e; }
    room.openedAt = Date.now();
    rooms.set(code, room);
    attach(socket, room, p);
    return { room, reply: { code, token: p.token, game: game.id } };
  }, { needRoom: false });

  on('join', ({ code, name, avatar, token }) => {
    if (limits.badCode.blocked(ip)) throw new Error('Zu viele falsche Codes. Warte ein paar Minuten.');
    let room;
    try { room = getRoom(code); } catch (e) { limits.badCode.hit(ip); throw e; }
    // Wiedererkennung über das Token aus dem Browser (localStorage) – und über die Konto-ID, wenn das Token fehlt (z. B. zweites Gerät).
    // Gehört der Platz zu einem anderen Konto, gilt das Token nicht: kein fremder Platz.
    let p = typeof token === 'string' && token ? room.byToken(token) : null;
    if (p?.bot) throw new Error('Computer-Mitspieler haben keinen Browser-Zugang');
    if (p?.accountId && socket.data.accountId && p.accountId !== socket.data.accountId) p = null;
    if (!p && socket.data.accountId) p = [...room.players.values()].find((x) => !x.bot && !x.kicked && x.accountId === socket.data.accountId) || null;
    if (p) {
      if (!p.accountId) bindAccount(socket, p); // Platz aus der Zeit vor den Konten: jetzt binden
      if (!p.connected) room.say(`${p.name} ist wieder online`);
    } else {
      if (limits.newPlayer.blocked(ip)) throw new Error('Zu viele neue Namen von deinem Anschluss. Warte ein paar Minuten.');
      p = room.addPlayer(name, avatar);
      bindAccount(socket, p);
      limits.newPlayer.hit(ip);
    }
    attach(socket, room, p);
    return { room, reply: { code: room.code, token: p.token, game: room.game } };
  }, { needRoom: false });

  // Startseite: Liste der offenen Tische abonnieren (Antwort = aktueller Stand, danach kommen Änderungen als „lobby“)
  on('lobby', ({ off }) => {
    if (off) { socket.leave('lobby'); return {}; }
    socket.join('lobby');
    return { reply: { tables: lobbyList(), presence: presence.snapshot() } };
  }, { needRoom: false });

  on('presence', (data) => {
    const account = accounts.get(socket.data.accountId);
    // V2-05: „Online zeigen“ ist eine Freigabe des Kontos und gilt serverseitig, nicht nur im Browser
    const shown = !account || accounts.privacyOf(account.id).showOnline;
    const accepted = presence.update(socket.id, shown ? data : { ...data, visible: false }, account?.gameId || `session:${socket.id}`);
    if (accepted && account) accounts.touch(account.id, data);
    return { reply: { accepted } };
  }, { needRoom: false });

  // Startseite „Weiterspielen“: gibt es meinen Tisch noch? Nur mit gültigem Token, zeigt dasselbe wie die Liste
  on('peek', ({ code, token }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    const p = room && typeof token === 'string' && token ? room.byToken(token) : null;
    if (!p || p.bot || p.kicked) return { reply: { found: false } };
    const info = room.lobbyInfo?.();
    if (!info) return { reply: { found: false } };
    const host = room.players.get(room.hostId);
    return { reply: { found: true, code: room.code, game: room.game, gameName: GAMES[room.game].name, category: GAMES[room.game].category || 'karten',
      host: host ? { name: host.name, avatar: host.avatar } : null, seats: info.seats, max: info.max, watchers: info.watchers, status: info.status } };
  }, { needRoom: false });

  // Host: Tisch privat machen (nicht in der Liste der offenen Tische)
  on('unlisted', ({ value }, room, p) => { room.requireHost(p.id); room.unlisted = !!value; archiveReview(room); save(); });

  on('gamePause', ({ paused }, room, p) => { room.setGamePaused(p.id, paused); });

  // Ereignisse der Spiele: jedes Spiel bekommt nur seine eigenen
  for (const event of gameEvents()) {
    on(event, (d, room, p) => {
      if (NEW_ROUND_EVENTS.includes(event)) assertNewRoundAllowed(); // Update angekündigt
      const program = room.partyProgram;
      if (event === 'start' && (program?.status === 'ready' || programActive(room))) {
        const next = program.status === 'ready' ? beginProgram(room, p.id) : nextProgramStep(room, p.id);
        return { room: startProgramStep(room, p.id, next) };
      }
      if (programActive(room) && ['newGame', 'settings', 'adjust', 'gift', 'giftAnswer', 'rebuy', 'nextHand', 'sitOut', 'boardChoose', 'boardSave'].includes(event)) throw new Error('Beende zuerst das Abendprogramm, um diese Einstellungen zu ändern');
      if (programActive(room) && event === 'sit' && !program.roster.some((person) => person.id === p.id)) throw new Error('Dieses Programm läuft schon; du kannst zuschauen und beim nächsten mitspielen');
      const fn = GAMES[room.game]?.events[event];
      if (!fn) throw new Error('Das gibt es in diesem Spiel nicht');
      return fn(room, p, d && typeof d === 'object' ? d : {});
    });
  }

  // Für alle Spiele gleich: Spiel wechseln (nur zwischen zwei Runden)
  on('switchGame', ({ game: gameId }, room, p) => {
    room.requireHost(p.id);
    if (programActive(room)) throw new Error('Nutze „Nächstes Programm-Spiel“ oder beende zuerst das Abendprogramm');
    const game = gameById(gameId);
    if (!game) throw new Error(notPlayable(gameId));
    if (game.id === room.game) throw new Error('Das wird hier schon gespielt');
    if (room.busy) throw new Error('Wechseln geht erst, wenn die Runde vorbei ist');
    return { room: switchRoom(room, game) };
  });

  on('programSave', (data, room, p) => { configureProgram(room, p.id, data); });
  on('setVariant', ({ variant }, room, p) => {
    room.requireHost(p.id);
    if (room.busy || programActive(room)) throw new Error('Variantenwechsel nur zwischen Partien und außerhalb eines laufenden Programms');
    const v = variantOf(room.game, variant), seated = programSeats(room);
    if (seated.length > (v.maxPlayers || GAMES[room.game].maxPlayers)) throw new Error('Für diese Variante sitzen zu viele Spieler am Tisch');
    return { room: switchRoom(room, GAMES[room.game], { variant, ...(room.game === 'monopoly' && variant !== 'junior' ? { board: room.settings.board || 'default', theme: room.settings.theme || 'modern' } : {}) }) };
  });
  on('programStart', (_data, room, p) => (assertNewRoundAllowed(), { room: startProgramStep(room, p.id, beginProgram(room, p.id)) }));
  on('programNext', (_data, room, p) => (assertNewRoundAllowed(), { room: startProgramStep(room, p.id, nextProgramStep(room, p.id)) }));
  on('programStop', (_data, room, p) => {
    room.requireHost(p.id);
    if (room.busy) throw new Error('Beende oder brich zuerst die laufende Partie ab');
    if (room.partyProgram) { room.partyProgram.status = 'stopped'; room.partyProgram.endedAt ||= Date.now(); archiveReview(room); room.say('Abendprogramm beendet; die bisherige Gesamtwertung bleibt sichtbar', 'summary'); }
  });

  // Für alle Spiele gleich: Host-Rechte
  // Zur Startseite, Platz behalten: wie ein Verbindungsabbruch (Zug-Timer, Pause), der Tisch bleibt unter „Weiterspielen“.
  // Zurück an den Tisch geht mit dem Token (join).
  on('park', (_d, room, p) => {
    detach(socket, room);
    goOffline(room, p, `${p.name} ist kurz auf der Startseite`);
    presence.park(socket.id);
    return { closed: true }; // goOffline hat schon neu gezeichnet
  });

  // Tisch endgültig verlassen: aus der Runde aussteigen (wie Aufstehen), Host-Rolle weitergeben, Ergebnisse bleiben in der Bestenliste.
  // Sind danach alle anderen offline oder weg, schließt der Raum sofort.
  on('leave', (_d, room, p) => {
    room.remove(p.id, `${p.name} hat den Tisch verlassen`);
    detach(socket, room);
    if (!humansIn(room).some((h) => h.connected)) { closeRoom(room); return { closed: true }; }
    return {};
  });

  // Host: laufende Runde ohne Wertung abbrechen (Einsätze zurück)
  on('abortRound', (_d, room, p) => { room.abortRound(p.id); if (room.gamePaused) room.setGamePaused(p.id, false); });

  // Host: Tisch schließen. Alle landen auf der Startseite, der Raum ist weg und der Code frei. Ergebnisse stehen schon in der Bestenliste.
  on('closeTable', (_d, room, p) => {
    room.requireHost(p.id);
    sendHome(room, 'Der Host hat den Tisch geschlossen');
    closeRoom(room);
    return { closed: true };
  }, { needRoom: true });

  on('kick', ({ id }, room, p) => { room.requireHost(p.id); if (id === p.id) throw new Error('Du kannst dich nicht selbst entfernen'); const target = room.players.get(id); room.remove(id); if (target?.socketId && !room.players.has(id)) io.to(target.socketId).emit('kicked'); });
  on('makeHost', ({ id }, room, p) => { room.requireHost(p.id); const t = room.players.get(id); if (!t || t.bot) throw new Error('Ein Mensch muss Host bleiben'); room.hostId = id; room.say(`${t.name} ist jetzt Host`); });
  on('addBot', ({difficulty='medium'}, room, p) => { if (programActive(room)) throw new Error('Während des Programms bleiben die Mitspieler fest'); addBot(room, p.id, difficulty); });
  on('setBotDifficulty', ({id,difficulty},room,p)=>{if(programActive(room))throw new Error('Beende zuerst das Abendprogramm');setBotDifficulty(room,p.id,id,difficulty);});
  on('removeBot', ({ id }, room, p) => { if (programActive(room)) throw new Error('Beende zuerst das Abendprogramm'); removeBot(room, p.id, id); });

  // Ganzer Verlauf auf Anfrage (nicht in jedem Update – der kann lang werden). Ohne Neuzeichnen für alle.
  socket.on('history', (data, cb) => {
    if (typeof cb !== 'function') return;
    const room = rooms.get(socket.data.code);
    if (!room?.players.get(socket.data.playerId)) return cb({ ok: false, error: 'Du bist an keinem Tisch' });
    cb({ ok: true, entries: room.historyAfter(data?.after), seq: room.logSeq });
  });

  // Fehler aus dem Browser: höchstens 10 pro Minute und Verbindung, Text gekürzt, ohne Namen
  let errorTimes = [];
  socket.on('clientError', (data) => {
    const now = Date.now();
    errorTimes = errorTimes.filter((t) => now - t < 60000);
    if (errorTimes.length >= 10 || !data || typeof data !== 'object' || typeof data.message !== 'string') return;
    errorTimes.push(now);
    const room = rooms.get(socket.data.code);
    const names = room ? [...room.players.values()].map((pl) => pl.name) : [];
    const message = cleanClientError(data.message, names);
    const where = typeof data.where === 'string' ? cleanClientError(data.where.split(/[?#]/)[0].split('/').pop(), names, 60) : '';
    const claimed = typeof data.game === 'string' ? data.game : '';
    const game = room?.game || (gameById(claimed) || singleplayerGameList().some((g) => g.id === claimed) ? claimed : 'hub');
    clientErrors.record({ message, where, game });
  });

  // Kleine Reaktionen am Tisch
  const REACTIONS = ['👍', '😂', '😮', '😬', '🔥', '🙈', 'GG', 'Nice Hand', 'Glück gehabt', 'Respekt'];
  let lastReaction = 0;
  socket.on('react', (data) => {
    const text = data?.text;
    const room = rooms.get(socket.data.code);
    const p = room?.players.get(socket.data.playerId);
    if (!p || !REACTIONS.includes(text) || Date.now() - lastReaction < 1500) return;
    lastReaction = Date.now();
    io.to(room.code).emit('reaction', { id: p.id, seat: p.seat, text });
    room.react(p.id, text);
    broadcast(room);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.code);
    const p = room?.players.get(socket.data.playerId);
    if (!p || p.socketId !== socket.id) return;
    goOffline(room, p, `${p.name} ist offline`);
  });
});

// Weggebliebene Spieler entfernen, verlassene Tische löschen
setInterval(() => {
  let changed = false;
  for (const [code, r] of rooms) {
    if (!r.gamePaused && r.dropAway(AWAY_MIN * 60000)) { r.afterChange(); broadcast(r); changed = true; }
    const anyone = [...r.players.values()].some((p) => p.connected && !p.bot);
    if (!anyone && (r.abandoned || Date.now() - r.lastActivity > ROOM_TTL_MIN * 60000)) {
      closeRoom(r); changed = true;
    }
  }
  if (changed) save();
}, Math.max(500, Math.min(30000, (AWAY_MIN * 60000) / 4))).unref();

// Ein Fehler in einem Handler soll nicht alle laufenden Tische mitreißen
process.on('uncaughtException', (e) => console.error('Unerwarteter Fehler:', e));
process.on('unhandledRejection', (e) => console.error('Unerwarteter Fehler:', e));

// Ereignisse, mit denen eine neue Runde beginnt – während einer Update-Ankündigung gesperrt
const NEW_ROUND_EVENTS = ['start', 'nextHand'];

// Ein Spiel darf keine Plattform-Ereignisse überschreiben
const RESERVED = ['create', 'join', 'kick', 'makeHost', 'history', 'react', 'switchGame', 'setVariant', 'disconnect', 'addBot', 'removeBot', 'setBotDifficulty', 'lobby', 'peek', 'unlisted', 'park', 'leave', 'abortRound', 'closeTable', 'look', 'presence', 'programSave', 'programStart', 'programNext', 'programStop', 'clientError'];
for (const g of Object.values(GAMES)) {
  const clash = Object.keys(g.events).filter((e) => RESERVED.includes(e));
  if (clash.length) throw new Error(`Spiel ${g.id}: Ereignisse ${clash.join(', ')} gehören der Plattform`);
}

if (load()) removeOrphanHistory(); // nach einem Lesefehler bleiben alle Verlaufsdateien liegen
http.listen(PORT, () => console.log(`Spieleabend läuft auf http://localhost:${PORT}`));

// ---------- Admin-Hilfen ----------
function adminRooms() {
  return [...rooms.values()].map((r) => {
    const humans = [...r.players.values()].filter((p) => !p.bot && !p.kicked);
    return {
      code: r.code, game: r.game, gameName: GAMES[r.game]?.name || r.game, private: !!r.unlisted,
      humans: humans.length, online: humans.filter((p) => p.connected).length, bots: [...r.players.values()].filter((p) => p.bot && !p.kicked).length,
      names: humans.map((p) => p.name), openedAt: r.openedAt || Date.now(), lastActivity: r.lastActivity, busy: !!r.busy, paused: !!r.gamePaused,
    };
  }).sort((a, b) => b.lastActivity - a.lastActivity);
}
function adminOnline() {
  const players = [...rooms.values()].reduce((n, r) => n + [...r.players.values()].filter((p) => !p.bot && p.connected).length, 0);
  return { connections: io.of('/').sockets.size, players };
}
function adminCloseRoom(code) {
  const room = rooms.get(code);
  if (!room) return null;
  const info = { code: room.code, gameName: GAMES[room.game]?.name || room.game, humans: humansIn(room).length };
  sendHome(room, 'Der Admin hat den Tisch geschlossen');
  closeRoom(room);
  return info;
}

// ---------- Update-Ankündigung und sauberes Beenden ----------
let updateDueSent = false;
function announceUpdate(minutes, by) {
  const state = maintenance.announce(minutes, by);
  updateDueSent = false;
  io.emit('maintenance', state);
  return state;
}
function cancelUpdate() {
  const was = maintenance.cancel();
  if (was) io.emit('maintenance', null);
  return was;
}
// Nach Fristende: sobald keine Runde mehr läuft (höchstens UPDATE_DRAIN_MAX_MIN danach) speichern und beenden
setInterval(() => {
  if (!maintenance.active || shuttingDown) return;
  const now = Date.now();
  if (!maintenance.due(now)) return;
  if (!updateDueSent) { updateDueSent = true; io.emit('maintenance', maintenance.state(now)); }
  const running = [...rooms.values()].some((r) => r.busy && [...r.players.values()].some((p) => !p.bot && p.connected));
  if (!running || now >= maintenance.at + UPDATE_DRAIN_MAX_MIN * 60000) {
    adminLog.add('Update: Server beendet', running ? 'Frist für laufende Runden abgelaufen' : 'keine Runde mehr aktiv');
    shutdown('update');
  }
}, 2000).unref();

function saveNow() {
  for (const r of rooms.values()) { if (!r.busy) r.lastSnapshot = snapshotOf(r); else if (r.lastSnapshot) r.lastSnapshot.unlisted = !!r.unlisted; } // Privat-Schalter gilt auch mitten in der Runde
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SAVE_FILE + '.tmp', JSON.stringify([...rooms.values()].map((r) => r.lastSnapshot).filter(Boolean)));
    renameSync(SAVE_FILE + '.tmp', SAVE_FILE);
    for (const r of rooms.values()) saveHistory(r);
    leaderboard.save();
    accounts.save();
    discord?.save();
  } catch (e) { console.error('Speichern fehlgeschlagen:', e.message); }
}
let shuttingDown = false;
// Alles speichern, allen Verbindungen Bescheid geben, dann beenden. Die Browser verbinden sich nach dem Neustart selbst neu.
function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Server wird beendet (${reason})`);
  saveNow();
  io.emit('restarting', { text: 'Server startet neu – gleich wieder da' });
  setTimeout(() => process.exit(0), 400);
}

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => shutdown(sig));
// Update per Signal ankündigen (docker kill -s USR2 <container>): Standard-Vorlauf UPDATE_ANNOUNCE_MIN
if (process.platform !== 'win32') {
  process.on('SIGUSR2', () => {
    try { announceUpdate(UPDATE_DEFAULT_MIN, 'signal'); adminLog.add('Update angekündigt', `per Signal, in ${UPDATE_DEFAULT_MIN} Minuten`); }
    catch (e) { console.error('Update-Ankündigung per Signal:', e.message); }
  });
}

export { app, http, rooms, codes };
