// Zugangsschutz und Missbrauchsschutz.
// - Seitenpasswort (SITE_PASSWORD): ohne Passwort keine Seite und keine Socket-Verbindung.
// - Nach dem Login merkt sich der Browser das per signiertem Cookie (180 Tage, verlängert sich bei jedem Besuch).
// - Rate-Limits gegen Passwort-Raten, Code-Raten, Tisch-Spam und Event-Fluten.
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const COOKIE = 'pa_auth';
const COOKIE_DAYS = 180;

export function loadSecret(dataDir) {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = join(dataDir, 'secret.key');
  try {
    if (existsSync(file)) return readFileSync(file, 'utf8').trim();
    mkdirSync(dataDir, { recursive: true });
    const s = randomBytes(32).toString('hex');
    writeFileSync(file, s, { mode: 0o600 });
    return s;
  } catch {
    return randomBytes(32).toString('hex'); // Notfall: Cookies gelten nur bis zum Neustart
  }
}

export function createAuth({ password, secret }) {
  const enabled = !!password;
  // Passwort fließt in die Signatur ein: Passwort ändern = alle alten Cookies ungültig
  const pwTag = createHash('sha256').update('pw:' + (password || '')).digest('hex').slice(0, 16);
  const sign = (exp) => createHmac('sha256', secret).update(`${exp}.${pwTag}`).digest('base64url');

  function issue() {
    const exp = Date.now() + COOKIE_DAYS * 864e5;
    return `${exp}.${sign(exp)}`;
  }

  function valid(token) {
    if (!enabled) return true;
    if (typeof token !== 'string') return false;
    const [expStr, sig] = token.split('.');
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
    const a = Buffer.from(sig); const b = Buffer.from(sign(exp));
    return a.length === b.length && timingSafeEqual(a, b);
  }

  function checkPassword(input) {
    const a = createHash('sha256').update(String(input ?? '')).digest();
    const b = createHash('sha256').update(password || '').digest();
    return timingSafeEqual(a, b);
  }

  return { enabled, issue, valid, checkPassword };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* kaputtes Cookie */ }
  }
  return out;
}

export function cookieHeader(value, { secure, maxAgeDays = COOKIE_DAYS }) {
  return [
    `${COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${Math.round(maxAgeDays * 86400)}`, secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

// Einfaches Fenster-Limit pro Schlüssel (z. B. IP)
export function limiter({ windowMs, max }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs);
  timer.unref();
  return {
    blocked(key) { const v = hits.get(key); return !!v && v.reset > Date.now() && v.count >= max; },
    hit(key) {
      const now = Date.now();
      let v = hits.get(key);
      if (!v || v.reset < now) { v = { count: 0, reset: now + windowMs }; hits.set(key, v); }
      v.count++;
      return v.count <= max;
    },
    reset(key) { hits.delete(key); },
    retryAfter(key) { const v = hits.get(key); return v ? Math.max(1, Math.ceil((v.reset - Date.now()) / 1000)) : 0; },
  };
}

// Token-Bucket pro Verbindung gegen Event-Fluten
export function bucket({ capacity, perSecond }) {
  let tokens = capacity; let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * perSecond);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'",
    "frame-ancestors 'none'", "frame-src 'none'", "base-uri 'none'", "form-action 'self'", "object-src 'none'", "manifest-src 'self'", "worker-src 'self'",
    ...(req?.secure ? ['upgrade-insecure-requests'] : []),
  ].join('; '));
  // Nur über HTTPS (hinter dem Proxy): Browser merken sich, die Seite künftig nur verschlüsselt aufzurufen
  if (req?.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}

// Nur Verbindungen von der eigenen Seite (gegen fremde Webseiten, die Sockets aufmachen)
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Nicht-Browser-Clients senden oft keinen Origin – die brauchen trotzdem das Cookie
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try { return new URL(origin).host === host; } catch { return false; }
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

// Nur interne Weiterleitungen nach dem Login (kein Open Redirect)
export function safeNext(next) {
  const n = String(next || '/');
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/';
}

// Text ohne Steuerzeichen und unsichtbare Tricks (Zeilenumbrüche fliegen auch raus)
export function cleanText(text, max) {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').trim().slice(0, max);
}
export const cleanName = (name) => cleanText(name, 16);
