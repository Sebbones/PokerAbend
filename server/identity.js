// Gast-Identität: signiertes Cookie mit der internen AccountId und Kurzcodes zum Verbinden eines zweiten Geräts.
// Die AccountId verlässt den Server nie (nicht in view(), Lobby, Presence oder API-Antworten an andere).
// Der Client behauptet keine Identität: nur ein vom Server signiertes Cookie zählt.
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ACCOUNT_ID, CODE_ALPHABET } from './account-store.js';

export const GUEST_COOKIE = 'pa_guest';
export const GUEST_DAYS = 180;
export const LINK_CODE_LENGTH = 6;
export const LINK_CODE_MINUTES = 10;
const LINK_CODE = new RegExp(`^[${CODE_ALPHABET}]{${LINK_CODE_LENGTH}}$`);

export function createIdentity({ secret, now = Date.now }) {
  const sign = (payload) => createHmac('sha256', secret).update(`guest:${payload}`).digest('base64url');
  const hash = (code) => createHash('sha256').update(`link:${code}`).digest('hex');
  const codes = new Map(); // sha256(Code) → { accountId, expires }; nur im Speicher: ein Neustart macht offene Codes ungültig

  function issue(accountId) {
    if (!ACCOUNT_ID.test(accountId)) throw new Error('Ungültige Konto-ID');
    const payload = `${accountId}.${now() + GUEST_DAYS * 864e5}`;
    return `${payload}.${sign(payload)}`;
  }
  // Liefert die AccountId oder null (fehlt, falsch signiert, abgelaufen, falsch aufgebaut)
  function verify(value) {
    if (typeof value !== 'string' || value.length > 120) return null;
    const parts = value.split('.');
    if (parts.length !== 3 || !ACCOUNT_ID.test(parts[0]) || !/^\d{13}$/.test(parts[1]) || Number(parts[1]) <= now()) return null;
    const a = Buffer.from(parts[2]), b = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
    return a.length === b.length && timingSafeEqual(a, b) ? parts[0] : null;
  }
  const cookie = (value, { secure = false, maxAgeDays = GUEST_DAYS } = {}) => [
    `${GUEST_COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.round(maxAgeDays * 86400)}`, secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');

  function sweep() { for (const [k, v] of codes) if (v.expires <= now()) codes.delete(k); }
  return {
    issue, verify, cookie,
    // Ein aktiver Code je Konto: ein neuer ersetzt den alten
    createLinkCode(accountId) {
      sweep();
      for (const [k, v] of codes) if (v.accountId === accountId) codes.delete(k);
      if (codes.size > 5000) throw new Error('Gerade sind zu viele Codes offen');
      let code;
      do { code = Array.from({ length: LINK_CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (codes.has(hash(code)));
      codes.set(hash(code), { accountId, expires: now() + LINK_CODE_MINUTES * 60000 });
      return { code, expiresAt: now() + LINK_CODE_MINUTES * 60000 };
    },
    // Einmalig: der Code ist nach dem ersten Treffer weg. Eingabe wie „k7q-2xm“ wird gesäubert
    redeemLinkCode(input) {
      const code = String(input ?? '').toUpperCase().replace(/[\s-]/g, '');
      if (!LINK_CODE.test(code)) return null;
      const entry = codes.get(hash(code));
      if (!entry) return null;
      codes.delete(hash(code));
      return entry.expires > now() ? entry.accountId : null;
    },
    openCodes: () => { sweep(); return codes.size; },
  };
}
