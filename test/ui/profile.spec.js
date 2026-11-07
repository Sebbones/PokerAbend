// V2-04: Spielerprofile im Browser – aus Bestenliste, Gerade online und Offenen Tischen; Freigaben; leere und nicht öffentliche Profile.
import { test, expect, login, selectGame } from './helpers.js';
import { createIdentity } from '../../server/identity.js';

const A = 'a'.repeat(32), B = 'b'.repeat(32), D = 'd'.repeat(32);
const NOW = Date.now(), month = new Date(NOW).toISOString().slice(0, 7);
const stat = (played, wins) => ({ played, wins, points: 0, months: { [month]: { played, wins, points: 0 } } });
const pl = (a, n, win, pts, place) => ({ a, n, bot: false, win, pts, place });
const account = (id, gameId, name, extra = {}) => ({ id, gameId, createdAt: NOW, lastSeen: NOW, name, avatar: '🦊', mergedInto: null, discord: null, ...extra });
// Das Gast-Cookie wird mit demselben Schlüssel signiert wie auf dem Server; „secret.key“ steht JSON-codiert (mit Anführungszeichen) in der Datei.
const SECRET = '"ui-test-secret-profile"';
const files = {
  'secret.key': 'ui-test-secret-profile',
  'accounts.json': {
    schemaVersion: 1,
    accounts: {
      [A]: account(A, '#AAAA', 'Anna', { discord: { name: 'AnnaDiscord' }, privacy: { showDiscord: true } }),
      [B]: account(B, '#BBBB', 'Ben'),
      [D]: account(D, '#DDDD', 'Dora', { discord: { name: 'DoraDiscord' }, privacy: { showStats: false, showFavorites: false, showRecent: false, showAchievements: false } }),
    },
    externals: { 'discord:1': A, 'discord:4': D }, audit: [],
  },
  'leaderboard.json': {
    schemaVersion: 3,
    players: { [A]: { name: 'Anna', accountId: A, games: { maumau: stat(6, 4), hearts: stat(2, 1) } }, [D]: { name: 'Dora', accountId: D, games: { maumau: stat(3, 1) } } },
    rounds: {
      '1000000000000001': { id: '1000000000000001', game: 'maumau', variant: 'classic', at: NOW - 3000, ranked: true, reason: '', players: [pl(A, 'Anna', true, 0, 1), pl(D, 'Dora', false, 5, 2)] },
      '1000000000000002': { id: '1000000000000002', game: 'maumau', variant: 'classic', at: NOW - 2000, ranked: true, reason: '', players: [pl(D, 'Dora', true, 0, 1), pl(A, 'Anna', false, 7, 2)] },
    },
  },
};
test.use({ seedFiles: files, createLimit: '100' });

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const dialogFits = (page) => page.locator('#player-profile-dlg').evaluate((el) => { const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 1 && b.top >= 0 && b.bottom <= innerHeight + 1; });

async function board(page, app) {
  await login(page, app, 'Viewer');
  await page.evaluate(() => { location.hash = '#bestenliste'; });
  await expect(page.locator('#board-body')).toBeVisible();
  await page.locator('#lbp-game').selectOption('maumau');
}

test('Bestenliste: Name öffnet das Profil mit echten Zahlen, Favoriten, letzten Partien und Erfolgen', async ({ page, app }, info) => {
  await board(page, app);
  await page.locator('.lb-table [data-profile="#AAAA"]').click();
  const dlg = page.locator('#player-profile-dlg');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('#player-profile-title')).toHaveText('Anna');
  await expect(dlg.locator('[data-profile-id]')).toHaveText('#AAAA');
  await expect(dlg.locator('[data-profile-discord]')).toHaveText('AnnaDiscord');
  await expect(dlg.locator('.profile-stats')).toContainText('8');          // Partien
  await expect(dlg.locator('.profile-stats')).toContainText('62,5 %');     // Siegquote 5 von 8
  await expect(dlg.locator('[data-profile-favorites] li').first()).toContainText('Mau-Mau');
  await expect(dlg.locator('[data-profile-recent] li')).toHaveCount(2);
  await expect(dlg.locator('[data-profile-badges] li').first()).toBeVisible();
  await expect(dlg.locator('[data-profile-privacy]')).toHaveCount(0);      // fremde Sicht: keine Schalter
  expect(await dialogFits(page)).toBe(true); expect(await overflow(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('profil-fremd.png'), fullPage: true });
  await dlg.locator('[data-profile-close]').click();
  await expect(dlg).toBeHidden();
});

test('Profil: Nicht freigegebenes wird nicht gezeigt, nicht öffentliche Profile melden das ehrlich', async ({ page, app }) => {
  await board(page, app);
  await page.locator('.lb-table [data-profile="#DDDD"]').click();
  const dlg = page.locator('#player-profile-dlg');
  await expect(dlg.locator('#player-profile-title')).toHaveText('Dora');
  await expect(dlg.locator('[data-profile-discord]')).toHaveCount(0);       // Dora hat Discord nicht freigegeben
  await expect(dlg.locator('.profile-hidden')).toHaveCount(4);              // Statistik, Favoriten, Letzte Partien, Erfolge
  await expect(dlg.locator('.profile-stats')).toHaveCount(0);
  await dlg.locator('[data-profile-close]').click();
  await page.evaluate(() => Profile.open('#BBBB'));                         // Gast: kein öffentliches Profil
  await expect(dlg.locator('.profile-error')).toHaveText('Dieses Profil ist nicht öffentlich.');
  await page.evaluate(() => Profile.open('#ZZZZ'));
  await expect(dlg.locator('.profile-error')).toHaveText('Dieses Profil ist nicht öffentlich.');
});

test('Eigenes Profil: Gast sieht alles, Freigaben lassen sich ändern und bleiben nach dem Neuladen', async ({ page, app }, info) => {
  await login(page, app, 'Selbst');
  await page.evaluate(() => Profile.open('me'));
  const dlg = page.locator('#player-profile-dlg');
  await expect(dlg.locator('#player-profile-title')).toContainText('Selbst');
  await expect(dlg.locator('.profile-guest')).toContainText('nicht öffentlich');
  await expect(dlg.locator('[data-profile-privacy]')).toHaveCount(6);
  await expect(dlg.locator('[data-profile-privacy=showStats]')).toBeChecked();
  await expect(dlg.locator('[data-profile-privacy=showDiscord]')).not.toBeChecked();
  expect(await dialogFits(page)).toBe(true);
  await dlg.locator('[data-profile-privacy=showStats]').uncheck();
  await expect(dlg.locator('[data-profile-privacy=showStats]')).not.toBeChecked();
  await page.screenshot({ path: info.outputPath('profil-eigen.png'), fullPage: true });
  await page.reload();
  await page.evaluate(() => Profile.open('me'));
  await expect(page.locator('#player-profile-dlg [data-profile-privacy=showStats]')).not.toBeChecked();
  await page.evaluate(() => { I18n.select('en'); });
  await expect(page.locator('#player-profile-dlg')).toContainText('Who sees what?');
});

test('Gerade online und Offene Tische: Personen mit Game-ID öffnen ihr Profil', async ({ page, app, browser }, info) => {
  const identity = createIdentity({ secret: SECRET });
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await context.addCookies([{ name: 'pa_guest', value: encodeURIComponent(identity.issue(A)), url: app.url }]);
  const anna = await context.newPage();
  try {
    await login(anna, app, 'Anna');
    await selectGame(anna, 'viergewinnt');
    await anna.locator('#host-form button[type=submit]').click();
    expect((await anna.evaluate(() => send('sit'))).ok).toBe(true);
    await login(page, app, 'Viewer');
    if (info.project.name === 'mobil') await page.locator('#presence-slot .presence-mobile summary').click();
    const online = page.locator('#presence-slot [data-profile="#AAAA"]:visible').first();
    await expect(online).toBeVisible({ timeout: 15000 });
    await online.click();
    await expect(page.locator('#player-profile-dlg #player-profile-title')).toHaveText('Anna');
    await page.locator('#player-profile-dlg [data-profile-close]').click();
    await page.evaluate(() => { location.hash = '#tische'; });
    await expect(page.locator('.tc-seat [data-profile="#AAAA"]').first()).toBeVisible({ timeout: 15000 });
    await page.locator('.tc-seat [data-profile="#AAAA"]').first().click();
    await expect(page.locator('#player-profile-dlg [data-profile-id]')).toHaveText('#AAAA');
    expect(await overflow(page)).toBe(true);
  } finally { await context.close(); }
});
