// Nachgebauter Discord-Server für die Tests (kein echtes Discord, keine echten Secrets).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

export const GUILD = '900000000000000001', CLIENT = '1563578924007694346', SECRET = 'fake-client-secret-xyz';
const sha = (v) => createHash('sha256').update(v).digest('base64url');

// ---------- nachgebautes Discord ----------
export function fakeDiscord() {
  const f = { users: new Map(), members: new Set(), codes: new Map(), access: new Map(), refresh: new Map(), down: false, expireCodes: false, tokenCalls: 0 };
  f.user = (id, name) => { f.users.set(id, { id, username: name, global_name: name }); return id; };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (f.down) { res.destroy(); return; }
    if (url.pathname === '/oauth2/authorize') {
      if (!f.autoUser) { res.writeHead(404); return res.end(); }
      const back = f.authorize(req.url.startsWith('http') ? req.url : f.base + req.url, { user: f.autoUser });
      res.writeHead(302, { location: back.toString() }); return res.end();
    }
    let body = ''; for await (const chunk of req) body += chunk;
    const form = Object.fromEntries(new URLSearchParams(body));
    if (url.pathname === '/api/oauth2/token') {
      f.tokenCalls++;
      if (form.client_id !== CLIENT || form.client_secret !== SECRET) return json(401, { error: 'invalid_client' });
      if (form.grant_type === 'authorization_code') {
        const c = f.codes.get(form.code); f.codes.delete(form.code);
        if (!c || f.expireCodes || c.redirect !== form.redirect_uri || sha(form.code_verifier || '') !== c.challenge) return json(400, { error: 'invalid_grant' });
        const at = 'AT-' + randomBytes(6).toString('hex'), rt = 'RT-' + randomBytes(6).toString('hex');
        f.access.set(at, c.user); f.refresh.set(rt, c.user);
        return json(200, { access_token: at, refresh_token: rt, scope: 'identify guilds.members.read', token_type: 'Bearer' });
      }
      const user = f.refresh.get(form.refresh_token);
      if (!user) return json(400, { error: 'invalid_grant' });
      f.refresh.delete(form.refresh_token);
      const at = 'AT-' + randomBytes(6).toString('hex'), rt = 'RT-' + randomBytes(6).toString('hex');
      f.access.set(at, user); f.refresh.set(rt, user);
      return json(200, { access_token: at, refresh_token: rt });
    }
    const user = f.access.get(String(req.headers.authorization || '').replace('Bearer ', ''));
    if (!user) return json(401, { message: '401: Unauthorized' });
    if (url.pathname === '/api/users/@me') return json(200, f.users.get(user));
    if (url.pathname === `/api/users/@me/guilds/${GUILD}/member`) return f.members.has(user) ? json(200, { roles: ['1'] }) : json(404, { message: 'Unknown Member' });
    json(404, {});
  });
  // Der „Browser des Nutzers“ bei Discord: bestätigt oder bricht ab und liefert die Rücksprung-Adresse
  f.authorize = (location, { user, approve = true } = {}) => {
    const u = new URL(location), p = u.searchParams;
    assert.equal(p.get('code_challenge_method'), 'S256'); assert.equal(p.get('response_type'), 'code'); assert.equal(p.get('client_id'), CLIENT);
    const back = new URL(p.get('redirect_uri'));
    back.searchParams.set('state', p.get('state'));
    if (!approve) { back.searchParams.set('error', 'access_denied'); return back; }
    const code = 'CODE-' + randomBytes(6).toString('hex');
    f.codes.set(code, { user, challenge: p.get('code_challenge'), redirect: p.get('redirect_uri') });
    back.searchParams.set('code', code);
    return back;
  };
  return new Promise((resolve) => server.listen(0, () => { f.base = `http://localhost:${server.address().port}`; f.server = server; resolve(f); }));
}

