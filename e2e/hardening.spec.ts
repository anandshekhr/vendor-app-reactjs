import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('stock history: an adjustment is recorded with its type and reason', async ({ page }) => {
  await login(page);
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Adjust', exact: true }).first().click();
  await page.getByLabel('Movement type').selectOption('damaged');
  await page.getByLabel('Quantity').fill('1');
  await page.getByLabel('Reason').fill('Torn packet');
  await page.getByRole('button', { name: 'Confirm adjustment' }).click();
  await expect(page.getByText('Authoritative quantity from the server')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  // In-app navigation: a full reload would reset the in-browser mock API.
  await page.getByRole('link', { name: 'Stock history' }).first().click();
  await expect(page.getByRole('heading', { name: 'Stock history' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Torn packet' });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Damaged')).toBeVisible();
  await expect(row.getByText('−1')).toBeVisible();
});

test('POS: discount and pay-later sale, then mark it paid', async ({ page }) => {
  await login(page);
  await page.goto('/pos');
  await expect(page.getByText(/Catalogue: \d+ products/)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Barcode').fill('890100000100');
  await page.getByRole('button', { name: 'Look up' }).click();
  // Wait until the item is in the cart (desktop shows the cart; mobile shows a "View cart" button).
  await expect(page.getByLabel('Quantity of Amul Taaza Milk 500ml').first().or(page.getByRole('button', { name: /View cart/ }))).toBeVisible();
  const cartButton = page.getByRole('button', { name: /View cart/ });
  if (await cartButton.isVisible()) await cartButton.click();
  // The cart is rendered twice (desktop panel and mobile drawer); act on the visible one.
  await page.getByLabel('Payment method').locator('visible=true').selectOption('upi');
  await page.getByLabel('Discount (₹)').locator('visible=true').fill('5');
  await page.getByText(/Not paid yet/).locator('visible=true').click();
  await page.getByRole('button', { name: /Charge/ }).locator('visible=true').click();
  const heading = page.getByRole('heading', { name: /Sale #\d+ completed/ });
  await expect(heading).toBeVisible();
  const saleId = (await heading.textContent())!.match(/#(\d+)/)![1];
  // In-app navigation: a full reload would reset the in-browser mock API.
  await page.evaluate(`window.history.pushState({}, '', '/pos/sales/${saleId}'); window.dispatchEvent(new PopStateEvent('popstate'));`);
  await expect(page.getByText('Payment pending')).toBeVisible();
  await page.getByLabel('Payment reference').fill('UPI-778899');
  await page.getByRole('button', { name: 'Mark as paid' }).click();
  await expect(page.getByText('Marked as paid')).toBeVisible();
});

test('bookings: accept a new booking, then cancelling needs a reason', async ({ page }) => {
  await login(page, { businessType: 'service' });
  await page.goto('/bookings/300');
  await page.getByRole('button', { name: 'Accept booking' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Accept booking' }).click();
  await expect(page.getByText(/You accepted this booking/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel booking' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Cancel booking' })).toBeDisabled();
  await dialog.getByLabel('Reason').fill('Stylist is unwell today');
  await dialog.getByRole('button', { name: 'Cancel booking' }).click();
  await expect(page.getByText('Stylist is unwell today')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark in progress' })).toHaveCount(0);
});

test('employees: add a staff member with just name and phone', async ({ page }) => {
  await login(page, { businessType: 'service' });
  await page.goto('/employees');
  await page.getByRole('button', { name: 'Add employee' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Sunita Verma');
  await dialog.getByLabel('Mobile number').fill('98765 12345');
  await dialog.getByLabel('Email').fill('sunita@example.com');
  await dialog.getByRole('button', { name: 'Add employee' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Sunita Verma' })).toHaveCount(1);
});

test('printer: auto-print a POS receipt and see it in the print log', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'tnbs.printer.settings',
      JSON.stringify({ autoPrint: true, connection: 'browser', paper: '80mm', copies: 1, events: { newOrder: true, acceptedOrder: false, posSale: true, newBooking: false } }),
    );
  });
  await login(page);
  await page.goto('/pos');
  await expect(page.getByText(/Catalogue: \d+ products/)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Barcode').fill('890100000100');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByLabel('Quantity of Amul Taaza Milk 500ml').first().or(page.getByRole('button', { name: /View cart/ }))).toBeVisible();
  const cartButton = page.getByRole('button', { name: /View cart/ });
  if (await cartButton.isVisible()) await cartButton.click();
  await page.getByRole('button', { name: /Charge/ }).locator('visible=true').click();
  const heading = page.getByRole('heading', { name: /Sale #\d+ completed/ });
  await expect(heading).toBeVisible();
  const saleId = (await heading.textContent())!.match(/#(\d+)/)![1];
  await page.getByRole('button', { name: 'New sale' }).click();
  // In-app navigation keeps the mock API's state.
  await page.evaluate(`window.history.pushState({}, '', '/settings/printer'); window.dispatchEvent(new PopStateEvent('popstate'));`);
  await expect(page.getByRole('heading', { name: 'Printer', exact: true })).toBeVisible();
  const entry = page.getByRole('listitem').filter({ hasText: `Receipt #${saleId}` });
  await expect(entry).toBeVisible();
  await expect(entry.getByText('Auto')).toBeVisible();
  await expect(entry.getByLabel('Printed')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Print automatically on this device' })).toBeChecked();
  await entry.getByRole('button', { name: 'Reprint' }).click();
  await expect(page.getByText('Sent to the printer')).toBeVisible();
});

test('settings: push notification status is shown for this device', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await expect(page.getByText('Push notifications on this device')).toBeVisible();
  // The e2e build has no Firebase config, so push reports itself as not set up instead of failing.
  await expect(page.getByText('Not set up')).toBeVisible();
});
