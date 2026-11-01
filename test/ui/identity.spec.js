// V2-01: Game-ID unter „Ich“, zweites Gerät verbinden, alte Statistik übernehmen.
import { io } from 'socket.io-client';
import { test, expect, login } from './helpers.js';

async function openIdentity(page) {
  await page.locator('#profile-avatar:visible, #profile-chip:visible').first().click();
  await page.locator('#p-identity > summary').click();
  await expect(page.locator('#p-game-id')).toHaveText(/^#[A-HJKMNP-Z2-9]{4,6}$/);
}
const closeProfile = (page) => page.locator('#p-cancel').click();

test('Ich: die Game-ID ist sichtbar und bleibt nach dem Neuladen und einer Namensänderung gleich', async ({ page, app }) => {
  await login(page, app, 'Anna');
  await openIdentity(page);
  const id = await page.locator('#p-game-id').textContent();
  await page.locator('#p-name').fill('Anna Neu'); await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.reload();
  await openIdentity(page);
  await expect(page.locator('#p-game-id')).toHaveText(id);
  await closeProfile(page);
});

test('Gerät verbinden: Code am ersten Gerät erzeugen, am zweiten eingeben – beide sind dieselbe Person', async ({ page, app, browser }) => {
  await login(page, app, 'Laptop');
  await openIdentity(page);
  const id = await page.locator('#p-game-id').textContent();
  await page.locator('#p-link-create').click();
  await expect(page.locator('#p-link-code')).toHaveText(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  const code = (await page.locator('#p-link-code').textContent()).replace('-', '');
  const context = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const phone = await context.newPage();
    await login(phone, app, 'Handy');
    await openIdentity(phone);
    expect(await phone.locator('#p-game-id').textContent()).not.toBe(id);
    await phone.locator('#p-link-input').fill('AAAAAA');
    await phone.locator('#p-link-redeem').click();
    await expect(phone.locator('#p-error')).toContainText('Code stimmt nicht');
    await phone.locator('#p-link-input').fill(code);
    await Promise.all([phone.waitForNavigation(), phone.locator('#p-link-redeem').click()]);
    await expect(phone.locator('#hub')).toBeVisible();
    await openIdentity(phone);
    await expect(phone.locator('#p-game-id')).toHaveText(id);
    await closeProfile(phone);
  } finally { await context.close(); }
});

test('Alte Statistiken übernehmen: der erste Klick gewinnt, der Name erscheint als übernommen', async ({ page, app }) => {
  // Alter Bestand: zwei Clients ohne Konto-Cookie spielen eine Partie und werden unter ihrem Namen gewertet
  const login1 = await fetch(app.url + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: app.password }) });
  const auth = login1.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const connect = () => { const s = io(app.url, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: auth } }); const ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r)); return { s, ask }; };
  const a = connect(), b = connect();
  try {
    const made = await a.ask('create', { game: 'viergewinnt', name: 'Altmeier' });
    expect(made.ok).toBe(true);
    expect((await b.ask('join', { code: made.code, name: 'Gegner' })).ok).toBe(true);
    await a.ask('sit'); await b.ask('sit'); await a.ask('start');
    const players = [a, b]; let first = 0;
    if (!(await a.ask('drop', { col: 0 })).ok) { first = 1; await b.ask('drop', { col: 0 }); }
    for (let i = 1; i < 7; i++) expect((await players[(first + i) % 2].ask('drop', { col: i % 2 === 1 ? 1 : 0 })).ok).toBe(true);
    await expect.poll(async () => (await (await fetch(`${app.url}/api/leaderboard?game=viergewinnt`, { headers: { cookie: auth } })).json()).rows.length).toBe(2);
  } finally { a.s.close(); b.s.close(); }

  await login(page, app, 'Neuer Name');
  await openIdentity(page);
  await page.locator('#p-legacy-load').click();
  await expect(page.locator('#p-legacy-list li')).toHaveCount(2);
  await page.locator('[data-legacy-claim="Altmeier"], [data-legacy-claim="Gegner"]').first().click();
  await expect(page.locator('#p-identity-body')).toContainText('Schon übernommen');
  await page.locator('#p-legacy-load').click();
  await expect(page.locator('#p-legacy-list li')).toHaveCount(1);
  await closeProfile(page);
});
