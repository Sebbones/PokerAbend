import { test, expect, login, selectGame } from './helpers.js';
import {achievementCatalog} from '../../server/achievements.js';
import {GAMES} from '../../games/index.js';
const TOTAL=achievementCatalog(Object.values(GAMES)).length;

async function openAchievements(page) {
  await page.evaluate(() => { location.hash = '#bestenliste'; });
  await page.getByRole('link', { name: 'Erfolge & Abzeichen ansehen', exact: true }).click();
  await expect(page.locator('.achievement-card')).toHaveCount(36);
}

test('Erfolge: erste Partie, Sieg, persönliche Meldung, Fortschritt, Mitspieler und Neuladen', async ({ page, app, browser }, info) => {
  test.setTimeout(60000); await login(page, app); await openAchievements(page);
  await expect(page.locator('.achievement-summary strong')).toHaveText(`0 von ${TOTAL} Abzeichen erreicht`);
  await selectGame(page, 'viergewinnt'); await page.locator('#host-form button[type=submit]').click(); await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
  const code = await page.evaluate(() => lastState.code), context = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const guest = await context.newPage(); await login(guest, app, 'Ben'); await guest.evaluate((code) => joinAndEnter(code, 'sit'), code);
    await expect.poll(() => page.evaluate(() => lastState.players.filter((p) => p.seated).length)).toBe(2);
    await page.evaluate(() => { window.badgeMessages = []; socket.on('achievements', (e) => window.badgeMessages.push(e)); });
    expect((await page.evaluate(() => send('start'))).ok).toBe(true);
    for (let i = 0; i < 7; i++) {
      const own = await page.evaluate(() => lastState.turnId === lastState.you.id);
      expect((await (own ? page : guest).evaluate((col) => send('drop', { col }), own ? 0 : 1)).ok).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => window.badgeMessages.length)).toBe(1);
    expect(await page.evaluate(() => window.badgeMessages[0].names)).toEqual(['Mit dabei', 'Erster Sieg', 'Am Zug']);
    await page.evaluate(() => parkRoom()); await openAchievements(page);
    await expect(page.locator('.achievement-summary strong')).toHaveText(`3 von ${TOTAL} Abzeichen erreicht`);
    await expect(page.locator('.achievement-card.earned')).toHaveCount(3);
    await expect(page.locator('[data-badge=stammgast] progress')).toHaveAttribute('value', '1');
    await page.getByLabel('Abzeichen-Fortschritt', { exact: true }).selectOption('unlocked'); await expect(page.locator('.achievement-card')).toHaveCount(3);
    await page.screenshot({ path: info.outputPath('erreichte-abzeichen.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Spielername', { exact: true }).fill('Ben'); await expect(page.locator('#achievement-players option[value=Ben]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Erfolge ansehen', exact: true }).click(); await expect(page.locator('.achievement-summary h2')).toHaveText('Ben');
    await expect(page.locator('.achievement-summary strong')).toHaveText(`1 von ${TOTAL} Abzeichen erreicht`);
    await page.getByRole('button', { name: 'Meine Erfolge', exact: true }).click(); await expect(page.locator('.achievement-summary h2')).toHaveText('Anna');
    await page.reload(); await expect(page.locator('.achievement-summary strong')).toHaveText(`3 von ${TOTAL} Abzeichen erreicht`);
    await page.getByLabel('Abzeichen-Bereich', { exact: true }).selectOption('entdecken'); await page.getByLabel('Abzeichen-Fortschritt', { exact: true }).selectOption('locked');
    await expect(page.locator('.achievement-card')).toHaveCount(4);
    await page.screenshot({ path: info.outputPath('offene-abzeichen.png'), fullPage: true });
  } finally { await context.close(); }
});

test('Erfolge: Abbruch und Bots zählen nicht; Profil-Einstieg, unbekannte Namen und sichere Textanzeige', async ({ page, app }) => {
  await login(page, app); await selectGame(page, 'zahlenzoo'); await page.locator('#host-form button[type=submit]').click();
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click(); await page.evaluate(() => send('addBot'));
  const botName = await page.evaluate(() => lastState.players.find((p) => p.bot).name);
  await page.evaluate(() => send('programSave', { name: 'Abzeichen-Test', mode: 'abend', entries: [{ game: 'zahlenzoo', settings: { rounds: 1 } }] }));
  await page.evaluate(() => send('programStart')); await page.evaluate(() => send('abortRound'));
  expect((await (await page.request.get(app.url + '/api/achievements?name=Anna')).json()).stats.played).toBe(0);
  await page.evaluate(() => send('programNext')); await page.getByRole('button', { name: 'Alle fertig – weiter', exact: true }).click(); await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('.kg-over')).toBeVisible();
  const botBadges = await (await page.request.get(app.url + '/api/achievements?' + new URLSearchParams({ name: botName }))).json(); expect(botBadges.recorded).toBe(false);
  await page.evaluate(() => parkRoom());
  await page.locator(page.viewportSize().width < 641 ? '#profile-avatar' : '#profile-chip').click();
  await page.getByRole('button', { name: 'Meine Erfolge & Abzeichen', exact: true }).click();
  await expect(page.locator('.achievement-summary strong')).toHaveText(`1 von ${TOTAL} Abzeichen erreicht`);
  // Die verzögerte Namenssuche abschließen, bevor der temporäre Testserver beendet werden kann.
  await Promise.all([
    page.waitForResponse((response) => { const url = new URL(response.url()); return url.pathname === '/api/achievements/players' && url.searchParams.get('q') === '<img src=x>'; }),
    page.getByLabel('Spielername', { exact: true }).fill('<img src=x>'),
  ]);
  await page.getByRole('button', { name: 'Erfolge ansehen', exact: true }).click();
  await expect(page.locator('.achievement-summary h2')).toHaveText('<img src=x>'); await expect(page.locator('.achievement-summary img')).toHaveCount(0);
  await expect(page.locator('.achievement-summary strong')).toHaveText(`0 von ${TOTAL} Abzeichen erreicht`);
  await page.getByLabel('Abzeichen-Fortschritt', { exact: true }).selectOption('unlocked'); await expect(page.locator('.achievement-card')).toHaveCount(0);
  await expect(page.locator('#achievement-cards')).toContainText('Für diesen Filter gibt es keine Abzeichen');
});
