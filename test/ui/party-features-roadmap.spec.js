import { test, expect, login } from './helpers.js';

test('Party features: completed roadmap, authored DE/EN descriptions and no standalone game host buttons', async ({ page, app }, info) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#roadmap'; });
  await page.locator('[data-roadmap-stage="erledigt"] > summary').click();
  await expect(page.getByText('Party-Extras', { exact: true })).toBeVisible();
  await expect(page.getByText('Modifikatoren', { exact: true })).toBeVisible();
  await page.evaluate(() => I18n.select('en'));
  await expect(page.getByText('Party extras', { exact: true })).toBeVisible();
  await expect(page.getByText('Modifiers', { exact: true })).toBeVisible();
  await expect(page.getByText('Chaos Mode', { exact: true })).toBeVisible();
  await expect(page.getByText('Survival Evening', { exact: true })).toBeVisible();
  const sections = await (await page.request.get(app.url + '/roadmap')).json();
  for (const id of ['party-brett','modifikatoren','chaos-modus','survival-abend']) {
    const points = sections.flatMap((s) => s.punkte).filter((p) => p.id === id);
    expect(points).toHaveLength(1); expect(points[0].erledigt).toBe(true); expect(points[0].art).toBe('funktion');
    await expect(page.locator(`[data-plan="${id}"], [data-host="${id}"]`)).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('party-features-roadmap-en.png'), fullPage: true });
});
