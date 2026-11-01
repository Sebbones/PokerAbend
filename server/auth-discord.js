// Optionale Discord-Anmeldung (V2-02). Discord ist eine zweite Anmeldung, die sich an das V2-01-Konto hängt;
// das Gruppenpasswort bleibt unverändert, und Discord ist nie Admin (/admin und Ticket-Verwaltung haben eigene Passwörter).
//
// Ablauf: Authorization Code mit PKCE (S256). Der „state“ ist einmalig, kurzlebig und an den Browser gebunden (Cookie pa_oauth).
// Code-Austausch und alle Provider-Aufrufe laufen nur auf dem Server; der Browser sieht nie ein Discord-Token.
// Eigene Sitzung: Cookie pa_discord (zufälliges Token, gespeichert nur als SHA-256), Rotation bei jedem Login, Ablauf, Widerruf.
// Den Refresh-Token hält der Server verschlüsselt (AES-256-GCM, Schlüssel aus SESSION_SECRET abgeleitet) für die 24-h-Prüfung der Mitgliedschaft.
// Discord nicht erreichbar → niemand wird ausgesperrt; nur eine bestätigte Nicht-Mitgliedschaft nimmt den Zugang.
import express from 'express';
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCookies, sameOrigin, clientIp, limiter, safeNext, cleanName } from './security.js';

export const SESSION_COOKIE = 'pa_discord', STATE_COOKIE = 'pa_oauth';
const DAY = 864e5;
const SESSION_DAYS = 30, IDLE_DAYS = 14, STATE_MINUTES = 10, RETRY_MS = 5 * 60000;
const sha = (value) => createHash('sha256').update(String(value)).digest('hex');
const b64 = (buffer) => Buffer.from(buffer).toString('base64url');
const cookieLine = (name, value, { path = '/', seconds, secure }) => [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly', 'SameSite=Lax', `Max-Age=${seconds}`, secure ? 'Secure' : ''].filter(Boolean).join('; ');

// Einstellungen aus der Umgebung; ohne Client-ID, Secret und PUBLIC_URL ist Discord komplett aus
export function discordConfig(env = process.env) {
  const clientId = String(env.DISCORD_CLIENT_ID || '').trim(), clientSecret = String(env.DISCORD_CLIENT_SECRET || '').trim();
  const publicUrl = String(env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!clientId || !clientSecret || !/^https?:\/\/[^/\s]+$/.test(publicUrl)) return null;
  const minutes = Number(env.DISCORD_RECHECK_MIN);
  return {
    clientId, clientSecret, publicUrl, redirectUri: `${publicUrl}/auth/discord/callback`,
    guildId: /^\d{5,25}$/.test(String(env.DISCORD_GUILD_ID || '').trim()) ? String(env.DISCORD_GUILD_ID).trim() : '',
    roleId: /^\d{5,25}$/.test(String(env.DISCORD_ROLE_ID || '').trim()) ? String(env.DISCORD_ROLE_ID).trim() : '',
    apiBase: String(env.DISCORD_API_BASE || 'https://discord.com/api/v10').replace(/\/+$/, ''),   // nur für Tests mit nachgebautem Discord
    authorizeUrl: String(env.DISCORD_AUTHORIZE_URL || 'https://discord.com/oauth2/authorize'),
    rateMax: Number(env.DISCORD_RATE_MAX) > 0 ? Number(env.DISCORD_RATE_MAX) : 60,
    recheckMs: (Number.isFinite(minutes) && minutes > 0 ? minutes : 24 * 60) * 60000,
  };
}

export function createDiscordAuth({ config, secret, dataDir, accounts, identity, accountOf, siteAccess, merge, secure = () => false, trustProxy = false, onChange = () => {}, now = Date.now, fetchImpl = fetch }) {
  if (!config) return null;
  const key = Buffer.from(hkdfSync('sha256', Buffer.from(String(secret)), Buffer.from('spieleabend-discord'), Buffer.from('refresh-token'), 32));
  const encrypt = (text) => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), ct = Buffer.concat([c.update(text, 'utf8'), c.final()]); return [iv, c.getAuthTag(), ct].map(b64).join('.'); };
  const decrypt = (packed) => {
    const [iv, tag, ct] = String(packed).split('.').map((p) => Buffer.from(p, 'base64url'));
    const d = createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  };

  // ---- Sitzungen (nur als Hash gespeichert) ----
  const file = join(dataDir, 'discord-sessions.json');
  let sessions = Object.create(null), dirty = false;
  try {
    if (existsSync(file)) { const data = JSON.parse(readFileSync(file, 'utf8')); if (data && typeof data.sessions === 'object' && !Array.isArray(data.sessions)) sessions = Object.assign(Object.create(null), data.sessions); else throw new Error('unerwartete Struktur'); }
  } catch {
    console.error('Discord-Sitzungen nicht lesbar; alle müssen sich neu anmelden');
    try { copyFileSync(file, `${file}.unlesbar-${new Date().toISOString().replace(/[:.]/g, '-')}`); } catch { /* keine Datei */ }
  }
  const touched = () => { dirty = true; onChange(); };
  const checking = new Set();
  const retryMs = Math.min(RETRY_MS, config.recheckMs); // nach einem Ausfall bald wieder versuchen

  // ---- Provider-Aufrufe (nur serverseitig) ----
  async function call(path, { method = 'GET', token, form } = {}) {
    const res = await fetchImpl(config.apiBase + path, {
      method, signal: AbortSignal.timeout(8000),
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), accept: 'application/json' },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    let body = null; try { body = await res.json(); } catch { /* leer */ }
    return { status: res.status, body };
  }
  const tokenRequest = (form) => call('/oauth2/token', { method: 'POST', form: { client_id: config.clientId, client_secret: config.clientSecret, ...form } });
  // 'member' | 'not-member' | 'unknown' (Discord nicht erreichbar oder Fehler: nie aussperren)
  async function membership(accessToken) {
    if (!config.guildId) return 'member';
    let r;
    try { r = await call(`/users/@me/guilds/${config.guildId}/member`, { token: accessToken }); } catch { return 'unknown'; }
    if (r.status === 200) return !config.roleId || (Array.isArray(r.body?.roles) && r.body.roles.includes(config.roleId)) ? 'member' : 'not-member';
    if ([401, 403, 404].includes(r.status)) return 'not-member';
    return 'unknown';
  }

  const hasSession = (cookieHeader) => {
    const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
    if (typeof raw !== 'string' || raw.length > 80) return null;
    const hash = sha(raw), s = sessions[hash];
    if (!s) return null;
    if (s.expires <= now() || now() - s.lastSeen > IDLE_DAYS * DAY) { delete sessions[hash]; touched(); return null; }
    return { hash, s };
  };
  const revoke = (hash) => { if (sessions[hash]) { delete sessions[hash]; touched(); } };
  const revokeAll = (predicate) => { let n = 0; for (const [h, s] of Object.entries(sessions)) if (predicate(s)) { delete sessions[h]; n++; } if (n) touched(); return n; };

  // Mitgliedschaft nach recheckMs im Hintergrund prüfen
  async function recheck(hash) {
    const s = sessions[hash];
    if (!s || checking.has(hash)) return;
    checking.add(hash);
    try {
      let r;
      try { r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(s.rt) }); } catch { s.nextTry = now() + retryMs; return; }
      if (r.status === 400 || r.status === 401) { revoke(hash); return; }  // Freigabe zurückgezogen oder Token ungültig
      if (r.status !== 200 || !r.body?.access_token) { s.nextTry = now() + retryMs; return; }
      const state = await membership(r.body.access_token);
      if (state === 'not-member') { revoke(hash); return; }
      if (state === 'unknown') { s.nextTry = now() + retryMs; return; }
      if (r.body.refresh_token) s.rt = encrypt(r.body.refresh_token);
      s.lastCheck = now(); s.nextTry = 0; touched();
    } finally { checking.delete(hash); }
  }

  const pending = new Map();   // sha(state) → { verifier, nonce, purpose, accountId, next, expires }
  const merges = new Map();    // Konto → { to, expires }: wartet auf die Bestätigung im Browser
  const sweep = () => { for (const [k, v] of pending) if (v.expires <= now()) pending.delete(k); for (const [k, v] of merges) if (v.expires <= now()) merges.delete(k); };
  const hits = limiter({ windowMs: 10 * 60000, max: config.rateMax });

  // ---- Anmelden, Verknüpfen ----
  const profileOf = (user) => ({ name: cleanName(user.global_name || user.username || ''), sync: true, pending: true });
  function startSession(res, req, { accountId, discordId, refreshToken }) {
    const token = b64(randomBytes(32)), t = now();
    // Rotation: ältere Sitzungen desselben Browsers/Nutzers gelten nicht weiter
    const old = hasSession(req.headers.cookie); if (old) revoke(old.hash);
    sessions[sha(token)] = { accountId, discordId, created: t, lastSeen: t, expires: t + SESSION_DAYS * DAY, lastCheck: t, nextTry: 0, rt: encrypt(refreshToken || '') };
    if (Object.keys(sessions).length > 5000) for (const [h, s] of Object.entries(sessions).sort((a, b) => a[1].lastSeen - b[1].lastSeen).slice(0, 500)) delete sessions[h];
    touched();
    res.append('Set-Cookie', cookieLine(SESSION_COOKIE, token, { seconds: SESSION_DAYS * 86400, secure: secure(req) }));
  }
  const clearSession = (req, res) => res.append('Set-Cookie', cookieLine(SESSION_COOKIE, '', { seconds: 0, secure: secure(req) }));
  const setGuest = (req, res, accountId) => res.append('Set-Cookie', identity.cookie(identity.issue(accountId), { secure: secure(req) }));

  const router = express.Router();
  const fail = (req, res, code, next = '/') => res.redirect(303, `/login?discord=${code}&next=${encodeURIComponent(safeNext(next))}`);

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    sweep();
    if (!hits.hit(clientIp(req, trustProxy))) { res.setHeader('Retry-After', hits.retryAfter(clientIp(req, trustProxy))); return res.status(429).type('text').send('Zu viele Versuche. Bitte warte ein paar Minuten.'); }
    next();
  });
  const csrf = (req, res, next) => (sameOrigin(req) && req.headers['x-requested-with'] === 'spieleabend' ? next() : res.status(403).json({ error: 'Diese Aktion muss von der Spieleabend-Seite kommen' }));
  const needAccess = (req, res, next) => (siteAccess(req) ? next() : res.status(401).json({ error: 'Nicht angemeldet' }));

  function begin(req, res, purpose) {
    const verifier = b64(randomBytes(48)), state = b64(randomBytes(24)), nonce = b64(randomBytes(16));
    const account = accountOf(req.headers.cookie);
    pending.set(sha(state), { verifier, nonce: sha(nonce), purpose, accountId: account?.id || null, next: safeNext(req.query.next), expires: now() + STATE_MINUTES * 60000 });
    if (pending.size > 2000) pending.delete(pending.keys().next().value);
    res.append('Set-Cookie', cookieLine(STATE_COOKIE, nonce, { path: '/auth/discord', seconds: STATE_MINUTES * 60, secure: secure(req) }));
    const url = new URL(config.authorizeUrl);
    for (const [k, v] of Object.entries({ client_id: config.clientId, response_type: 'code', redirect_uri: config.redirectUri, scope: config.guildId ? 'identify guilds.members.read' : 'identify', state, code_challenge: b64(createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', prompt: 'none' })) url.searchParams.set(k, v);
    res.redirect(303, url.toString());
  }
  // Wer ohne Gruppenpasswort kommt, braucht die Mitgliedschaft; ohne DISCORD_GUILD_ID gibt Discord keinen Zugang
  router.get('/login', (req, res) => (config.guildId ? begin(req, res, 'login') : res.status(404).type('text').send('Nicht gefunden')));
  router.get('/link', (req, res) => (siteAccess(req) ? begin(req, res, 'link') : res.redirect(303, '/login')));

  router.get('/callback', async (req, res) => {
    const clearNonce = () => res.append('Set-Cookie', cookieLine(STATE_COOKIE, '', { path: '/auth/discord', seconds: 0, secure: secure(req) }));
    const stateValue = typeof req.query.state === 'string' ? req.query.state : '';
    const entry = pending.get(sha(stateValue));
    pending.delete(sha(stateValue));          // einmalig: auch ein Fehlversuch verbraucht den state
    clearNonce();
    const nonce = parseCookies(req.headers.cookie)[STATE_COOKIE];
    if (!entry || entry.expires <= now() || typeof nonce !== 'string' || sha(nonce) !== entry.nonce) return fail(req, res, 'state');
    const back = entry.purpose === 'link' ? '/' : entry.next;
    if (req.query.error) return entry.purpose === 'link' ? res.redirect(303, '/?discord=denied') : fail(req, res, 'denied', back);
    if (typeof req.query.code !== 'string' || !req.query.code || req.query.code.length > 300) return fail(req, res, 'failed', back);
    try {
      const t = await tokenRequest({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: config.redirectUri, code_verifier: entry.verifier });
      if (t.status !== 200 || !t.body?.access_token) return entry.purpose === 'link' ? res.redirect(303, '/?discord=failed') : fail(req, res, 'expired', back);
      const me = await call('/users/@me', { token: t.body.access_token });
      if (me.status !== 200 || !/^\d{5,25}$/.test(String(me.body?.id))) return fail(req, res, 'failed', back);
      const discordId = String(me.body.id);
      const member = entry.purpose === 'login' ? await membership(t.body.access_token) : 'member';
      if (member !== 'member') return fail(req, res, member === 'unknown' ? 'failed' : 'nomember', back);

      const linked = accounts.findExternal('discord', discordId);
      const current = entry.purpose === 'link' ? accounts.get(entry.accountId) : accountOf(req.headers.cookie);
      if (entry.purpose === 'link') {
        if (!siteAccess(req) || !current) return res.redirect(303, '/login');
        if (linked && linked !== current.id) {                  // schon an ein anderes Konto gebunden: erst nachfragen
          merges.set(current.id, { to: linked, expires: now() + STATE_MINUTES * 60000 });
          return res.redirect(303, '/?discord=conflict');
        }
        if (!linked) accounts.linkExternal(current.id, 'discord', discordId);
        accounts.setExternalProfile(current.id, { ...profileOf(me.body), ...(accounts.get(current.id).discord?.sync === false ? { sync: false, pending: false } : {}) });
        return res.redirect(303, '/?discord=linked');
      }
      // Anmelden: dasselbe Konto wie vor einem Cookie-Verlust; sonst hängt sich Discord an dieses Gerät
      let account = linked ? accounts.get(linked) : current;
      if (!account) account = accounts.ensure(accounts.newId());
      if (!linked) accounts.linkExternal(account.id, 'discord', discordId);
      accounts.setExternalProfile(account.id, { ...profileOf(me.body), ...(account.discord?.sync === false ? { sync: false, pending: false } : {}) });
      startSession(res, req, { accountId: account.id, discordId, refreshToken: t.body.refresh_token });
      setGuest(req, res, account.id);
      return res.redirect(303, back);
    } catch {
      return entry.purpose === 'link' ? res.redirect(303, '/?discord=failed') : fail(req, res, 'failed', back);  // keine Details nach außen
    }
  });

  // Nach der Rückfrage im Browser: dieses Gerät mit dem bestehenden Konto zusammenführen
  router.post('/merge', csrf, needAccess, express.json({ limit: '1kb' }), (req, res) => {
    const current = accountOf(req.headers.cookie), offer = current && merges.get(current.id);
    merges.delete(current?.id);
    if (!offer || offer.expires <= now() || !accounts.has(offer.to)) return res.status(409).json({ error: 'Die Rückfrage ist abgelaufen. Bitte verknüpfe Discord noch einmal' });
    if (req.body?.confirm !== true) return res.json({ ok: true, merged: false });
    merge(current.id, offer.to);
    setGuest(req, res, accounts.get(offer.to).id);
    res.json({ ok: true, merged: true });
  });

  router.get('/status', needAccess, (req, res) => {
    const a = accountOf(req.headers.cookie), d = a?.discord;
    const linked = !!(a && d);
    res.json({ enabled: true, login: !!config.guildId, linked, name: linked ? d.name : '', sync: linked ? d.sync !== false : true, adopt: linked && d.sync !== false && d.pending ? d.name : '' });
  });
  router.post('/profile', csrf, needAccess, express.json({ limit: '1kb' }), (req, res) => {
    const a = accountOf(req.headers.cookie);
    if (!a?.discord) return res.status(409).json({ error: 'Discord ist nicht verknüpft' });
    const sync = typeof req.body?.sync === 'boolean' ? req.body.sync : a.discord.sync !== false;
    accounts.setExternalProfile(a.id, { ...a.discord, sync, pending: sync && req.body?.ack !== true && a.discord.pending });
    res.json({ ok: true });
  });
  router.post('/unlink', csrf, needAccess, (req, res) => {
    const a = accountOf(req.headers.cookie);
    if (!a || !accounts.unlinkExternal(a.id, 'discord')) return res.status(409).json({ error: 'Discord ist nicht verknüpft' });
    revokeAll((s) => s.accountId === a.id);   // der Discord-Zugang endet; das Gruppenpasswort-Cookie bleibt
    clearSession(req, res);
    res.json({ ok: true });
  });
  router.post('/logout', csrf, (req, res) => { const s = hasSession(req.headers.cookie); if (s) revoke(s.hash); clearSession(req, res); res.json({ ok: true }); });
  router.post('/logout-all', csrf, needAccess, (req, res) => {
    const a = accountOf(req.headers.cookie), s = hasSession(req.headers.cookie);
    const ids = new Set([a?.id, s?.s.accountId].filter(Boolean));
    const n = revokeAll((x) => ids.has(x.accountId) || (s && x.discordId === s.s.discordId));
    clearSession(req, res);
    res.json({ ok: true, revoked: n });
  });
  router.use((_req, res) => res.status(404).type('text').send('Nicht gefunden'));

  return {
    router, config,
    // Gilt die Discord-Sitzung dieser Anfrage (Mitglied, nicht abgelaufen, nicht widerrufen)?
    hasAccess(cookieHeader) {
      const found = hasSession(cookieHeader);
      if (!found) return false;
      const { hash, s } = found, t = now();
      if (t - s.lastSeen > 60000) { s.lastSeen = t; dirty = true; }
      if (t - s.lastCheck >= config.recheckMs && t >= (s.nextTry || 0)) recheck(hash);
      return true;
    },
    revokeCurrent(cookieHeader) { const s = hasSession(cookieHeader); if (s) revoke(s.hash); },
    clearCookie: clearSession,
    recheckNow: (cookieHeader) => { const f = hasSession(cookieHeader); return f ? recheck(f.hash) : Promise.resolve(); },
    save() {
      if (!dirty) return;
      for (const [h, s] of Object.entries(sessions)) if (s.expires <= now()) delete sessions[h];
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(file + '.tmp', JSON.stringify({ schemaVersion: 1, sessions }), { mode: 0o600 });
      renameSync(file + '.tmp', file);
      dirty = false;
    },
  };
}
