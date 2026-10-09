import { test, expect } from '@playwright/test';

test('mobile: tab bar navigation and one-handed PDP', async ({ page }) => {
  await page.goto('/');
  const tabs = page.getByRole('navigation', { name: 'Pestañas' });
  await expect(tabs).toBeVisible();
  await tabs.getByRole('link', { name: 'Tienda' }).click();
  await expect(page).toHaveURL(/\/shop/);
  await page.goto('/p/polo-blanca-manga-corta');
  // Sticky add-to-bag bar sits in the thumb zone (bottom 40% of the screen).
  const bar = page.locator('div.fixed button', { hasText: 'Agregar a la bolsa' });
  const box = await bar.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box!.y).toBeGreaterThan(vh * 0.6);
  await bar.click();
  await expect(page.getByText('Elija una talla para continuar')).toBeVisible();
});

test('english toggle keeps the page', async ({ page }) => {
  await page.goto('/info/faq');
  await page.getByRole('radio', { name: 'English' }).first().click();
  await expect(page).toHaveURL(/\/en\/info\/faq/);
  await expect(page.getByRole('heading', { level: 1, name: 'FAQ' })).toBeVisible();
});
