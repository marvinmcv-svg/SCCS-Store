// Dev helper: node scripts/screenshot.mjs <url> <out.png> [width] [height] [dark] [fullPage]
// LOGIN=email:password to sign in first. ACTIONS="click:selector;wait:ms" for simple steps.
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
const origin = new URL(url).origin;
if (process.env.LOGIN) {
  const [email, password] = process.env.LOGIN.split(':');
  await page.goto(`${origin}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });
}
await page.goto(url, { waitUntil: 'networkidle' });
for (const step of (process.env.ACTIONS || '').split(';').filter(Boolean)) {
  const [kind, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (kind === 'click') await page.click(arg);
  if (kind === 'wait') await page.waitForTimeout(+arg);
  if (kind === 'scroll') await page.evaluate((y) => window.scrollTo(0, +y), arg);
}
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: !!full });
await browser.close();
