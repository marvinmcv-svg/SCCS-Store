// Dev helper: print console errors/warnings for a URL.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(`[${m.type()}]`, m.text().slice(0, 600)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const url of process.argv.slice(2)) { console.log('==', url); await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(800); }
await browser.close();
