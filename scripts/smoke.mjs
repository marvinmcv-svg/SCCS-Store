// Dev helper: LOGIN=email:pass node scripts/smoke.mjs <path...>  → status + console errors per page
import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3000';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
let errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 220)));
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 220)));
if (process.env.LOGIN) {
  const [email, password] = process.env.LOGIN.split(':');
  await p.goto(`${base}/login`);
  await p.fill('#email', email);
  await p.fill('#password', password);
  await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });
}
for (const path of process.argv.slice(2)) {
  errs = [];
  const res = await p.goto(base + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const h1 = await p.locator('h1').first().textContent().catch(() => '');
  console.log(`${res?.status()} ${path} — ${h1?.trim().slice(0, 50)}${errs.length ? '\n   ⚠ ' + errs.join('\n   ⚠ ') : ''}`);
}
await b.close();
