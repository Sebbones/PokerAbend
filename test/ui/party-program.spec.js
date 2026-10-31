import { test, expect, login, selectGame } from './helpers.js';

async function start(page, app) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, app);
  await selectGame(page, 'schaetzmeister');
  await page.locator('#host-form button[type=submit]').click();
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
  await page.locator('[data-kit-panel="host"]').first().click();
  await page.getByRole('button', { name: 'Bot hinzufügen', exact: true }).click();
  await expect(page.locator('.bot-controls')).toContainText('Bot 1');
  await page.evaluate(() => new Promise((resolve) => socket.emit('custom', { text: 'Wie viele Testpunkte? | 10 | Punkte' }, resolve)));
  await page.getByRole('button', { name: 'Abendprogramm planen', exact: true }).click();
  await expect(page.locator('#program-dlg')).toBeVisible();
}
async function finishEstimate(page) {
  await page.locator('#kg-panel .icon-btn[data-kit="close"]').click();
  await page.locator('#pk-in').fill('10');
  await page.locator('.pk-send').click();
  await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeVisible({ timeout: 6000 });
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
}

test('Playlist: Vorlagen, Regeln, Wechsel im selben Raum, Reconnect, Gesamtwertung und Siegerehrung', async ({ page, app }, info) => {
  await start(page, app);
  await page.getByLabel('Programmname', { exact: true }).fill('Unser Test-Turnier');
  await page.getByRole('combobox', { name: 'Modus', exact: true }).selectOption('turnier');
  await page.getByRole('button', { name: 'Spiel hinzufügen', exact: true }).click();
  await page.locator('[data-program-game="1"]').selectOption('zahlenzoo');
  await page.locator('.program-entry').first().locator('summary').click();
  await page.locator('[data-program-setting="rounds"][data-index="0"]').fill('1');
  await page.getByRole('button', { name: 'Als Vorlage speichern', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Gespeicherte Playlist', exact: true })).toContainText('Unser Test-Turnier');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).last().click();
  await page.getByRole('button', { name: 'Abendprogramm planen', exact: true }).click();
  await page.getByRole('button', { name: 'Vorlage laden', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Modus', exact: true })).toHaveValue('turnier');
  await expect(page.locator('[data-program-game="1"]')).toHaveValue('zahlenzoo');
  await page.screenshot({ path: info.outputPath('party-program-plan.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Programm übernehmen', exact: true }).click();
  await expect(page.locator('#program-dlg')).not.toBeVisible();
  const url = page.url();
  await page.getByRole('button', { name: 'Programm starten', exact: true }).click();
  await expect(page.locator('.program-banner')).toContainText('Spiel 1 von 2');
  await finishEstimate(page);
  await expect(page.locator('.kg-over')).toBeVisible();
  await page.locator('.kg-over [data-kit="start"]').click();
  await expect(page.locator('#kg-meta .blinds')).toHaveText('Zahlenzoo');
  await expect(page.locator('.program-banner')).toContainText('Spiel 2 von 2');
  expect(page.url()).toBe(url);
  // Gemeinsamen Baustein anhalten: Auch bei schneller Anmeldung darf das Spiel
  // erst laden, wenn die gemeinsamen Skripte fertig sind.
  let releaseKit;
  await page.route('**/games/solo/solo-kit.js', async (route) => {
    await new Promise((resolve) => { releaseKit = resolve; });
    await route.continue();
  });
  try {
    await page.reload({ waitUntil: 'commit' });
    await expect.poll(() => typeof releaseKit).toBe('function');
    await expect.poll(() => page.evaluate(() => typeof account === 'undefined' ? 0 : account.games.length)).toBeGreaterThan(0);
    // Auch eine vorzeitig eintreffende Wiederanmeldung muss sicher warten;
    // der normale Seitenstart wartet inzwischen selbst auf die Hub-Skripte.
    await page.evaluate(() => openRoomByUrl());
    await expect.poll(() => page.evaluate(() => lastState?.game)).toBe('zahlenzoo');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(await page.evaluate(() => Object.hasOwn(gameLoads, 'zahlenzoo'))).toBe(false);
  } finally { releaseKit?.(); }
  await expect(page.locator('.program-banner')).toContainText('Spiel 2 von 2');
  await page.unroute('**/games/solo/solo-kit.js');
  await page.getByRole('button', { name: 'Alle fertig – weiter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('.kg-over')).toContainText('Siegerehrung');
  await expect(page.locator('.kg-over')).toContainText('Programmpunkte');
  await expect(page.locator('.program-banner')).toContainText('Programm beendet');
  await page.screenshot({ path: info.outputPath('party-program-result.png'), fullPage: true });
  await page.locator('.kg-over').getByRole('button', { name: 'Neues Programm planen', exact: true }).click();
  await page.getByRole('button', { name: 'Programm übernehmen', exact: true }).click();
  await expect(page.locator('.kg-over')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Abendprogramm starten', exact: true })).toBeVisible();
});

test('Team-Duell: Spieler zuordnen, ungeeignete Spiele fehlen, Teamwertung ist sichtbar', async ({ page, app }, info) => {
  await start(page, app);
  await page.getByRole('combobox', { name: 'Modus', exact: true }).selectOption('team');
  await expect(page.locator('[data-program-game="0"] option[value="werwolf"]')).toHaveCount(0);
  await expect(page.locator('[data-program-game="0"] option[value="wer-bin-ich"]')).toHaveCount(0);
  const teams = page.locator('[data-program-team]');
  await expect(teams).toHaveCount(2);
  await expect(teams.first()).toHaveValue('a');
  await expect(teams.last()).toHaveValue('b');
  await page.getByRole('button', { name: 'Programm übernehmen', exact: true }).click();
  await page.getByRole('button', { name: 'Programm starten', exact: true }).click();
  await finishEstimate(page);
  await expect(page.locator('.kg-over')).toContainText('Siegerehrung');
  await expect(page.locator('.kg-over .program-stand')).toContainText('Team 1');
  await expect(page.locator('.kg-over .program-stand')).toContainText('Team 2');
  await page.screenshot({ path: info.outputPath('party-program-team.png'), fullPage: true });
});
