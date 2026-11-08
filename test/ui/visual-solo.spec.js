// VIS-099 … VIS-107: die neun lokalen Solo-Spiele (Snake, Memory, Minesweeper, Nonogramm, Sokoban, Block Puzzle, Solitaire, Mahjong Solitaire, Match-3).
// Zustände: Start, Spiel, Pause, Wiederladen, Englisch, sechs Größen ohne seitliches Überlaufen. Screenshots: VIS_P1_CAPTURE=1 → docs/design/screenshots/<spiel>/ (JPEG).
import { test, expect, login } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const GAMES = { snake: '.snake-field', memory: '.memory-field', minesweeper: '.mine-field', nonogramm: '.ng-field', sokoban: '.warehouse-field', 'block-puzzle': '.bp-board', solitaire: '.sol-board', 'mahjong-solitaire': '.mj-board', 'match-3': '.m3-board' };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const only = process.env.VIS_P1_ONLY ? process.env.VIS_P1_ONLY.split(',') : Object.keys(GAMES);

for (const id of only) {
  test(`${id}: Solo-Spielwelt – Start, Spiel, Pause, Wiederladen, Englisch und sechs Größen`, async ({ page, app }, info) => {
    test.setTimeout(120000);
    const shot = async (name) => {
      let path = info.outputPath(`${id}-${name}.jpg`);
      if (process.env.VIS_P1_CAPTURE === '1') { const dir = `docs/design/screenshots/${id}`; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.jpg`; }
      await page.screenshot({ path, fullPage: true, type: 'jpeg', quality: 70 });
    };
    await login(page, app);
    await page.evaluate((game) => { location.hash = '#solo/' + game; }, id);
    await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible();
    await shot('start');
    await page.locator('[data-setup] button[type=submit]').click();
    await expect(page.locator(GAMES[id]).first()).toBeVisible();
    await page.waitForTimeout(500);
    await shot('playing');
    expect(await overflow(page), 'kein seitliches Überlaufen').toBe(true);
    await page.locator('.sp-common [data-action=pause]').click(); await page.waitForTimeout(300); await shot('paused');
    await page.reload(); await expect(page.locator(`[data-solo="${id}"]`)).toBeVisible(); await shot('reconnect');
    if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(200);
      expect(await overflow(page), `${width}x${height}`).toBe(true); await shot(`table-${width}x${height}`);
    }
    await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize());
    await page.evaluate(() => I18n.select('en'));
    await page.locator('.sp-details').first().evaluate((el) => { el.open = true; }); // die Kurzregeln aufklappen (Pause-Ebene kann die Kopfzeile überdecken)
    await expect(page.locator('.sp-details').first()).toHaveAttribute('open', '');
    await shot('english-rules');
  });
}
