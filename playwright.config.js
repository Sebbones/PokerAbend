import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/ui', // spielbezogene Prüfungen (games/<spiel>/ui.spec.js) werden von den backlog-*.spec.js eingebunden
  fullyParallel: false,
  workers: 1,
  // Auf der CI (langsamere, geteilte Rechner) mehr Luft und ein Wiederholungsversuch gegen Einzelwackler; lokal bleibt alles streng
  timeout: process.env.CI ? 60000 : 30000,
  expect: { timeout: process.env.CI ? 10000 : 5000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    // Lokales Chrome; PLAYWRIGHT_CHANNEL=chromium nutzt alternativ Playwright-Chromium.
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
