// Dev helper: node scripts/screenshot.mjs <url> <out.png> [width] [height] [dark] [fullPage]
import { chromium } from '@playwright/test';
const [url, out, w = '390', h = '844', dark = '', full = ''] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 2,
  colorScheme: dark ? 'dark' : 'light',
  isMobile: +w < 768,
  hasTouch: +w < 768,
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: !!full });
await browser.close();
