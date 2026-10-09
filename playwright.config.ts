import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: critical flow browse → add → checkout → admin verify → pickup.
 * Locally: run `npm run dev` (or start) and `npm run e2e`.
 * CI: builds and starts the app on :3100 against a freshly seeded DB.
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', locale: 'es-BO', timezoneId: 'America/La_Paz', launchOptions: { executablePath } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
