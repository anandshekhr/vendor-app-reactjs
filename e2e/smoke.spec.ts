import { expect, test } from '@playwright/test';
import { login, openNav } from './helpers';

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('product vendor: login, dashboard and product-only navigation', async ({ page }) => {
  const errors = await login(page);
  await expect(page.getByText('Revenue today')).toBeVisible();
  await openNav(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' }).last();
  await expect(nav.getByRole('link', { name: 'Point of Sale' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Bookings' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('service provider: service navigation, no product features', async ({ page }) => {
  const errors = await login(page, { businessType: 'service' });
  await expect(page.getByText("Today's bookings")).toBeVisible();
  await openNav(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' }).last();
  await expect(nav.getByRole('link', { name: 'Bookings' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Point of Sale' })).toHaveCount(0);
  await page.goto('/pos');
  await expect(page.getByText('Not available for your business type')).toBeVisible();
  expect(errors).toEqual([]);
});

test('order lifecycle: accept a pending order', async ({ page }) => {
  await login(page);
  await page.goto('/orders?status=created');
  await page.getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Accept order', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Accept order' }).click();
  await expect(page.getByText(/updated/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start preparing' })).toBeVisible();
});

test('POS: scan by barcode entry and check out with cash', async ({ page }) => {
  await login(page);
  await page.goto('/pos');
  await expect(page.getByText(/Catalogue: \d+ products/)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Barcode').fill('890100000100');
  await page.getByRole('button', { name: 'Look up' }).click();
  await page.getByLabel('Barcode').fill('890100000100');
  await page.getByRole('button', { name: 'Look up' }).click();
  const cartButton = page.getByRole('button', { name: /View cart/ });
  if (await cartButton.isVisible()) await cartButton.click();
  await expect(page.getByLabel('Quantity of Amul Taaza Milk 500ml').first()).toHaveValue('2');
  await page.getByRole('button', { name: /Charge/ }).first().click();
  await expect(page.getByRole('heading', { name: /Sale #\d+ completed/ })).toBeVisible();
  await expect(page.getByText('PAID')).toBeVisible();
});

test('POS offline: cash sale is queued with a provisional receipt and syncs when back online', async ({ page, context }) => {
  await login(page);
  await page.goto('/pos');
  await expect(page.getByText(/Catalogue: \d+ products/)).toBeVisible({ timeout: 15_000 });
  await context.setOffline(true);
  await expect(page.getByText('Offline: cash sales are queued')).toBeVisible();
  await page.getByRole('button', { name: /Add Brown Bread/ }).click();
  const cartButton = page.getByRole('button', { name: /View cart/ });
  if (await cartButton.isVisible()) await cartButton.click();
  await page.getByRole('button', { name: /Save offline sale/ }).first().click();
  await expect(page.getByText('PROVISIONAL RECEIPT — PENDING SYNC')).toBeVisible();
  await page.getByRole('button', { name: 'New sale' }).click();
  await page.goto('/pos/sales?tab=offline').catch(() => undefined);
  await context.setOffline(false);
  await page.goto('/pos/sales?tab=offline');
  await expect(page.getByText('Synced').first()).toBeVisible({ timeout: 20_000 });
});

test('inventory: adjust stock shows server before/after quantities', async ({ page }) => {
  await login(page);
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Adjust', exact: true }).first().click();
  await page.getByLabel('Quantity').fill('5');
  await page.getByRole('button', { name: 'Confirm adjustment' }).click();
  await expect(page.getByText('Authoritative quantity from the server')).toBeVisible();
});

test('withdrawal flow requires a verified account and confirms a request', async ({ page }) => {
  await login(page);
  await page.goto('/wallet/withdrawals?new=1');
  await page.getByLabel('Amount (₹)').fill('50');
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByText('Minimum withdrawal is ₹100')).toBeVisible();
  await page.getByLabel('Amount (₹)').fill('500');
  await page.getByRole('button', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Confirm withdrawal' }).click();
  await expect(page.getByText(/This is a request, not a completed payout/)).toBeVisible();
});

test('every main route renders without crashing', async ({ page }) => {
  const errors = await login(page);
  for (const path of ['/deliveries', '/products', '/products/new', '/inventory/low-stock', '/inventory/movements', '/scanner', '/customers', '/chat', '/wallet', '/wallet/transactions', '/bank-accounts', '/profile', '/profile/documents', '/settings', '/notifications', '/reports']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('This page failed to load')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('refreshing a nested route keeps the session', async ({ page }) => {
  await login(page);
  await page.goto('/orders');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
});

test('master catalogue: add products with own price and stock', async ({ page }) => {
  await login(page);
  await page.goto('/products');
  await page.getByRole('link', { name: 'Add from master catalogue' }).click();
  await page.getByLabel('Select Tata Salt 1kg').check();
  await page.getByLabel('Opening stock for Tata Salt 1kg').fill('24');
  await page.getByRole('button', { name: /Add 1 to my shop/ }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText('Tata Salt 1kg')).toBeVisible();
});

test('invoice: A4 invoice with delivery charges', async ({ page }) => {
  await login(page);
  await page.goto('/orders/1100');
  await page.getByRole('link', { name: /Print invoice/ }).click();
  await expect(page.getByText('INVOICE', { exact: true })).toBeVisible();
  await expect(page.getByText('Delivery charges')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
});

test('shop QR: create and open the print layout', async ({ page }) => {
  await login(page);
  await page.goto('/profile/qr');
  await page.getByRole('button', { name: 'Create my shop QR code' }).click();
  await page.getByRole('link', { name: 'Print', exact: true }).click();
  await expect(page.getByRole('radio', { name: /A4 poster/ })).toBeVisible();
  await page.getByRole('radio', { name: /4 cards/ }).click();
  await expect(page.getByAltText(/QR code .* for Sharma General Store/)).toBeVisible();
});
