import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@sccs.edu.bo', password: 'Sccs2026!' };

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'));
}

test('browse → add → checkout → admin verify → pickup', async ({ page, browser }) => {
  // 1 · Browse
  await page.goto('/shop/uniforms');
  await expect(page.getByRole('heading', { level: 1, name: 'Uniformes' })).toBeVisible();
  await page.getByRole('link', { name: /Chompa roja con escudo/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Chompa roja con escudo' })).toBeVisible();

  // 2 · Add to bag (size 12)
  await page.locator('label:has(input[name="size"][value="12"])').click();
  await page.getByRole('button', { name: 'Agregar a la bolsa' }).first().click();
  await expect(page.getByText('Agregado a la bolsa').first()).toBeVisible();

  // 3 · Checkout as guest, pay by bank QR
  await page.goto('/checkout');
  await page.fill('#name', 'Prueba E2E');
  await page.fill('#email', 'e2e@example.com');
  await page.fill('#phone', '70001122');
  await page.getByRole('radio', { name: /QR bancario/ }).check({ force: true });
  await page.getByRole('button', { name: /Confirmar pedido/ }).first().click();
  await page.waitForURL(/\/orders\/SC-/);
  const code = page.url().match(/orders\/(SC-[A-Z0-9]+)/)![1];
  const orderUrl = page.url();
  await expect(page.getByText('¡Gracias! Recibimos su pedido')).toBeVisible();

  // Upload a transaction number as proof
  await page.fill('#reference', 'BNB-E2E-0001');
  await page.getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(page.getByText('Comprobante en revisión').first()).toBeVisible();

  // 4 · Admin verifies payment and prepares the order
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/orders?q=${code}`);
  await admin.getByRole('link', { name: code }).click();
  await admin.getByRole('button', { name: 'Verificar pago' }).first().click();
  await expect(admin.getByText('Pago verificado').first()).toBeVisible();
  await admin.getByRole('button', { name: /Mover a: Preparando/ }).click();
  await expect(admin.getByRole('button', { name: /Mover a: Listo para recoger/ })).toBeVisible();
  await admin.getByRole('button', { name: /Mover a: Listo para recoger/ }).click();
  await expect(admin.getByRole('button', { name: /Mover a: Recogido/ })).toBeVisible();

  // Family now sees the pickup QR
  await page.goto(orderUrl);
  await expect(page.getByRole('img', { name: new RegExp(`Código de recojo ${code}`) })).toBeVisible();

  // 5 · Pickup desk: manual code lookup + handover
  await admin.goto('/admin/pickup');
  await admin.fill('input[aria-label="Código de pedido"]', code);
  await admin.getByRole('button', { name: 'Buscar' }).click();
  await admin.getByRole('button', { name: 'Confirmar entrega' }).click();
  await expect(admin.getByText(/Entregado a/).first()).toBeVisible();

  await page.goto(orderUrl);
  await expect(page.getByText(/Recogido por Prueba E2E/)).toBeVisible();
  await adminCtx.close();
});

test('stock never oversells: concurrent checkouts for the last unit', async ({ browser }) => {
  // Two shoppers race for a low-stock size; at most one order may succeed.
  const ctxs = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(ctxs.map((c) => c.newPage()));
  for (const p of pages) {
    await p.goto('/p/lonchera-termica');
    await p.getByRole('button', { name: 'Agregar a la bolsa' }).first().click();
    await expect(p.getByText('Agregado a la bolsa').first()).toBeVisible();
    await p.goto('/bag');
  }
  // Bump both to 2 units (seeded stock for this SKU is 2).
  for (const p of pages) {
    await p.getByRole('button', { name: 'Agregar uno' }).first().click();
    await p.waitForTimeout(500);
  }
  const results = await Promise.all(
    pages.map(async (p, i) => {
      await p.goto('/checkout');
      await p.fill('#name', `Carrera ${i}`);
      await p.fill('#email', `race${i}@example.com`);
      await p.fill('#phone', `7000330${i}`);
      await p.getByRole('radio', { name: /Pagar en el colegio/ }).check({ force: true });
      await p.getByRole('button', { name: /Confirmar pedido/ }).first().click();
      return p
        .waitForURL(/\/orders\/SC-/, { timeout: 10_000 })
        .then(() => 'ok')
        .catch(() => 'blocked');
    }),
  );
  expect(results.filter((r) => r === 'ok').length).toBeLessThanOrEqual(1);
  await Promise.all(ctxs.map((c) => c.close()));
});
