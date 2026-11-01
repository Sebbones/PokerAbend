// V2-02: Login-Seite mit beiden Wegen und Discord-Verknüpfung unter „Ich“ (gegen einen nachgebauten Discord-Server).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from './helpers.js';
import { fakeDiscord, GUILD, CLIENT, SECRET } from '../discord-fake.js';
import { freePort } from '../free-port.js';

const PASSWORD = 'Gruppen-Passwort-UI';
let fake, server, url;
test.beforeAll(async () => {
  fake = await fakeDiscord();
  fake.user('100000000000000011', 'Disco Dora'); fake.members.add('100000000000000011');
  const port = await freePort(); url = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: mkdtempSync(join(tmpdir(), 'discord-ui-')), POKER_NO_DOTENV: '1', SITE_PASSWORD: PASSWORD, SESSION_SECRET: 'ui-secret', PUBLIC_URL: url, CREATE_LIMIT: '500', DISCORD_RATE_MAX: '1000', DISCORD_CLIENT_ID: CLIENT, DISCORD_CLIENT_SECRET: SECRET, DISCORD_GUILD_ID: GUILD, DISCORD_API_BASE: fake.base + '/api', DISCORD_AUTHORIZE_URL: fake.base + '/oauth2/authorize' }, stdio: 'pipe' });
  await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); }); server.on('exit', (c) => rej(new Error('Server beendet: ' + c))); });
});
test.afterAll(async () => { server?.kill(); fake?.server.close(); });

const intro = (page) => page.addInitScript(() => { localStorage.setItem('poker:prefs', JSON.stringify({ intros: false })); });
async function openIdentity(page) {
  await page.locator('#profile-avatar:visible, #profile-chip:visible').first().click();
  await page.locator('#p-identity > summary').click();
  await expect(page.locator('#p-game-id')).toBeVisible();
}

test('Login-Seite zeigt Passwort und Discord; Discord-Mitglieder kommen ohne Passwort hinein', async ({ page }) => {
  fake.autoUser = '100000000000000011';
  await intro(page);
  await page.goto(url + '/login?next=%2F');
  await expect(page.getByLabel('Passwort')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mit Discord anmelden' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Mit Discord anmelden' }).click();
  await expect(page.locator('#hub')).toBeVisible();
  await page.evaluate(() => { localStorage.setItem('poker:name', JSON.stringify('Dora')); localStorage.setItem('poker:avatar', JSON.stringify('🦉')); });
  await page.reload();
  await openIdentity(page);
  await expect(page.locator('#p-identity-body')).toContainText('Disco Dora');
  await expect(page.locator('#p-discord-sync')).toBeChecked();
  await expect(page.locator('#p-discord-unlink')).toBeVisible();
  await page.locator('#p-discord-logout-all').click();
  await page.goto(url + '/');
  await expect(page.getByLabel('Passwort')).toBeVisible();
});

test('Nicht-Mitglied sieht eine klare Meldung und bleibt draußen', async ({ page }) => {
  fake.user('100000000000000012', 'Fremder Fritz'); fake.autoUser = '100000000000000012';
  await page.goto(url + '/login');
  await page.getByRole('link', { name: 'Mit Discord anmelden' }).click();
  await expect(page.locator('.error')).toContainText('nicht Mitglied');
  await expect(page.getByLabel('Passwort')).toBeVisible();
});

test('Ich: Discord verknüpfen, Namen übernehmen, bei bestehendem Konto zusammenführen, trennen', async ({ page, browser }) => {
  fake.user('100000000000000013', 'Disco Dora'); fake.members.add('100000000000000013'); fake.autoUser = '100000000000000013';
  await intro(page);
  const login = async (p) => { await p.goto(url + '/login'); await p.getByLabel('Passwort').fill(PASSWORD); await p.getByRole('button', { name: 'Reinkommen' }).click(); await expect(p.locator('#hub')).toBeVisible(); };
  await page.addInitScript(() => { if (!localStorage.getItem('poker:name')) { localStorage.setItem('poker:name', JSON.stringify('Pia')); localStorage.setItem('poker:avatar', JSON.stringify('🦉')); } });
  await login(page);
  await openIdentity(page);
  const id = await page.locator('#p-game-id').textContent();
  await expect(page.locator('#p-identity-body')).toContainText('Mit Discord verknüpfen heißt');
  await page.locator('#p-discord-link').click();
  await expect(page.locator('#hub')).toBeVisible();
  await expect(page.locator('#profile-chip:visible, #profile-avatar:visible').first()).toContainText('Disco Dora');   // Discord-Name einmal übernommen
  await openIdentity(page);
  await expect(page.locator('#p-identity-body')).toContainText('Disco Dora');
  expect(await page.locator('#p-game-id').textContent()).toBe(id);
  // zweites Gerät mit eigenem Konto verknüpft dieselbe Discord-ID → Nachfrage → dieselbe Person
  const context = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const other = await context.newPage();
    await intro(other);
    await other.addInitScript(() => { localStorage.setItem('poker:name', JSON.stringify('Tim')); localStorage.setItem('poker:avatar', JSON.stringify('🦊')); });
    await login(other);
    await openIdentity(other);
    expect(await other.locator('#p-game-id').textContent()).not.toBe(id);
    await other.locator('#p-discord-link').click();
    await expect(other.locator('#dlg')).toBeVisible();
    await expect(other.locator('#dlg')).toContainText('zusammenführen');
    await Promise.all([other.waitForNavigation(), other.locator('#dlg-ok').click()]);
    await expect(other.locator('#hub')).toBeVisible();
    await openIdentity(other);
    await expect(other.locator('#p-game-id')).toHaveText(id);
  } finally { await context.close(); }
  await page.reload();
  await openIdentity(page);
  await page.locator('#p-discord-unlink').click();
  await expect(page.locator('#p-discord-link')).toBeVisible();
});
