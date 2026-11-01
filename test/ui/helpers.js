import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const password = 'BlockA-Testpasswort';

// Jeder Test erhält einen eigenen Server, freien Port und temporäre Spieldaten.
// Passwortschutz und Rate-Limits laufen dabei unverändert mit.
export const test = base.extend({
  ticketAdminPassword: ['', { option: true }],
  adminPassword: ['', { option: true }],
  createLimit: ['6', { option: true }],
  app: async ({ ticketAdminPassword, adminPassword, createLimit }, use) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `
      const { http } = await import('./server/index.js');
      const ready = () => console.log('TEST_READY:' + http.address().port);
      if (http.listening) ready(); else http.once('listening', ready);
    `], {
      cwd: root,
      env: { ...process.env, PORT: '0', DATA_DIR: mkdtempSync(join(tmpdir(), 'spieleabend-ui-')), POKER_NO_DOTENV: '1', SITE_PASSWORD: password, TICKET_ADMIN_PASSWORD: ticketAdminPassword, ADMIN_PASSWORD: adminPassword, CREATE_LIMIT: createLimit },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stderr.on('data', (d) => { output += d; });
    try {
      const url = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Testserver startet nicht: ' + output)), 15000);
        child.once('error', (e) => { clearTimeout(timer); reject(e); });
        child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Testserver beendet (${code}): ${output}`)); });
        child.stdout.on('data', (d) => {
          output += d;
          const match = output.match(/TEST_READY:(\d+)/);
          if (match) { clearTimeout(timer); resolve('http://localhost:' + match[1]); }
        });
      });
      await use({ url, password, ticketAdminPassword, adminPassword });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const stopped = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await stopped;
      }
    }
  },
  page: async ({ page, app }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await use(page);
    // Keep the isolated server alive until the page is closed. Otherwise a
    // late presence/background request races app teardown and reports a false
    // ERR_CONNECTION_REFUSED in the browser-error assertion.
    if(!page.isClosed())await page.close();
    expect(errors, 'JavaScript- und Browserfehler').toEqual([]);
  },
});

export { expect };

export async function selectGame(page, id) {
  await page.evaluate(() => { location.hash = '#spiele'; });
  await page.locator(`[data-host="${id}"]`).first().click();
}

export async function login(page, app, name = 'Anna') {
  await page.addInitScript((name) => {
    if (!localStorage.getItem('poker:name')) {
      localStorage.setItem('poker:name', JSON.stringify(name));
      localStorage.setItem('poker:avatar', JSON.stringify('🦉'));
      localStorage.setItem('poker:prefs', JSON.stringify({ intros: false }));
    }
  }, name);
  // Die Einführung gehört nicht zum Lobby-Test; bei Bedarf wie ein Nutzer schließen.
  await page.addLocatorHandler(page.locator('#intro-dlg[open]'), async () => {
    await page.getByRole('button', { name: 'Überspringen', exact: true }).click();
  });
  await page.goto(app.url);
  await page.getByLabel('Passwort').fill(app.password);
  await page.getByRole('button', { name: 'Reinkommen' }).click();
  await expect(page.locator('#hub')).toBeVisible();
}

export async function screenshot(page, name) {
  const dir = join(root, 'artifacts', 'block-a');
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}-${page.viewportSize().width}.png`), fullPage: true });
}
