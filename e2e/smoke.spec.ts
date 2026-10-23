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

test('self-registration: apply, pick 5 starter products, then check status', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.getByRole('link', { name: 'Register your business' }).click();

  await page.getByLabel('Mobile number').fill('9812345678');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByLabel('OTP').fill('1234');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('Phone verified')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Your name').fill('Ravi Kumar');
  await page.getByLabel('Email').fill('ravi@example.com');
  await page.getByLabel('Business / shop name').fill('Ravi Stores');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('checkbox', { name: 'Grocery' }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Shop address').fill('12 MG Road, Indiranagar');
  await page.getByLabel('City').fill('Bengaluru');
  await page.getByLabel('State').fill('Karnataka');
  await page.getByLabel('PIN code').fill('560001');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Account number').fill('12AB');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('IFSC is 11 characters')).toBeVisible();
  await page.getByLabel('Account number').fill('123456789012');
  await page.getByLabel('IFSC').fill('hdfc0001234');
  await page.getByLabel('Account holder name').fill('Ravi Kumar');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('•••• 9012 · HDFC0001234')).toBeVisible();
  await page.getByRole('checkbox', { name: /I confirm/ }).check();
  await page.getByRole('button', { name: 'Submit application' }).click();

  await expect(page.getByRole('heading', { name: 'Choose at least 5 products to start selling' })).toBeVisible();
  const catalogue = page.getByRole('list', { name: 'Catalogue products' });
  for (const name of ['Tata Salt 1kg', 'Aashirvaad Atta 5kg', 'Fortune Sunflower Oil 1L', 'Amul Taaza Milk 500ml']) {
    await catalogue.getByRole('checkbox', { name: `Select ${name}` }).check();
  }
  await page.getByRole('button', { name: 'Save and finish' }).click();
  await expect(page.getByText('Select 1 more product (at least 5).')).toBeVisible();

  await catalogue.getByRole('checkbox', { name: 'Select Maggi Noodles 280g' }).check();
  await page.getByLabel('Selling price for Maggi Noodles 280g').fill('65');
  await page.getByRole('button', { name: 'Save and finish' }).click();
  await expect(page.getByText(/need a valid price|needs a valid price/)).toBeVisible();
  await page.getByLabel('Selling price for Maggi Noodles 280g').fill('58');
  await page.getByLabel('Opening stock for Maggi Noodles 280g').fill('24');
  await page.getByRole('button', { name: 'Save and finish' }).click();

  await expect(page.getByRole('heading', { name: 'Application submitted' })).toBeVisible();
  await expect(page.getByText('5 starter products saved')).toBeVisible();
  await expect(page.getByText('You will start selling once the team approves your application.')).toBeVisible();

  // In-app navigation keeps the in-memory mock's saved application.
  await page.getByRole('button', { name: 'Check application status' }).click();
  await page.getByLabel('Mobile number').fill('9812345678');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByLabel('OTP').fill('1234');
  await page.getByRole('button', { name: 'Check status' }).click();
  await expect(page.getByText('Ravi Stores')).toBeVisible();
  await expect(page.getByText(/start selling once the TheNearByShop team approves/)).toBeVisible();
  await expect(page.getByText('Starter products (5)')).toBeVisible();
  await expect(page.getByText('₹58.00 · stock 24')).toBeVisible();

  await page.getByRole('button', { name: 'Change products' }).click();
  await page.getByRole('list', { name: 'Catalogue products' }).getByRole('checkbox', { name: 'Select Parle-G 800g' }).check();
  await page.getByRole('button', { name: 'Save starter products' }).click();
  await expect(page.getByText('Starter products (6)')).toBeVisible();
  expect(errors).toEqual([]);
});
