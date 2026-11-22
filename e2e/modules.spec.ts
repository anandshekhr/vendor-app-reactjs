import { expect, test } from '@playwright/test';
import { login, openNav } from './helpers';

test('hybrid vendor: products and services in one portal', async ({ page }) => {
  const errors = await login(page, { businessType: 'hybrid' });
  await openNav(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' }).last();
  for (const name of ['Point of Sale', 'Products', 'Bookings', 'Employees']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('categories: adding a service category makes a product shop hybrid', async ({ page }) => {
  await login(page);
  await openNav(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' }).last();
  await expect(nav.getByRole('link', { name: 'Bookings' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.goto('/profile');
  await expect(page.getByText('Your shop offers')).toBeVisible();
  await page.getByRole('button', { name: 'Change categories' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Salon/).check();
  await expect(dialog.getByText('Products and services')).toBeVisible();
  await expect(dialog.getByText(/\+₹300\.00/)).toBeVisible(); // ₹70/week ≈ ₹300 per month
  await dialog.getByRole('button', { name: /Save 3 categories/ }).click();
  await expect(page.getByText('Categories saved')).toBeVisible();
  await openNav(page);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).last().getByRole('link', { name: 'Bookings' })).toBeVisible();
});

test('self-registration: a hybrid application needs a product and a service category, then hours & staff', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Register your business' }).click();
  await page.getByLabel('Mobile number').fill('9812345679');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByLabel('OTP').fill('1234');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('Phone verified')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Your name').fill('Asha Rao');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Business / shop name').fill('Asha Mobiles & Repairs');
  await page.getByText('Both products and services').click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Both kinds are listed; one kind alone is not enough.
  await page.getByRole('checkbox', { name: /Grocery/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Choose at least one product category and one service category.' })).toBeVisible();
  await page.getByRole('checkbox', { name: /Home repair/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Shop address')).toBeVisible();
  // Hybrid applications get both extra steps.
  await expect(page.getByText('Hours & staff').first()).toBeVisible();
  await expect(page.getByText('Starter products').first()).toBeVisible();
});

test('customers: server directory with masked contacts and a detail page', async ({ page }) => {
  await login(page);
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  const priya = page.getByRole('row').filter({ hasText: 'Priya Sharma' });
  await expect(priya).toBeVisible();
  await page.getByRole('combobox', { name: 'Sort customers' }).selectOption('-spend');
  await page.getByLabel('Search customers').fill('Priya');
  await expect(page.getByRole('row').filter({ hasText: 'Priya Sharma' })).toHaveCount(1);
  await page.getByRole('row').filter({ hasText: 'Priya Sharma' }).click();
  await expect(page.getByRole('heading', { name: 'Priya Sharma' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
});

test('notifications: server feed, unread filter, open and mark all read', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('link', { name: /Notifications, \d+ unread/ })).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Withdrawal paid')).toBeVisible();
  await page.getByRole('tab', { name: /Unread/ }).click();
  await expect(page.getByText('Withdrawal paid')).toHaveCount(0);
  await expect(page.getByText('Subscription paid')).toBeVisible();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByText('No unread notifications')).toBeVisible();
  await page.getByRole('tab', { name: 'All' }).click();
  await page.getByText('Order Created').click();
  await expect(page).toHaveURL(/\/orders\/1094$/);
});

test('reports: date range presets, custom range and best sellers', async ({ page }) => {
  await login(page);
  await page.goto('/reports');
  await expect(page.getByText('Order revenue')).toBeVisible();
  await expect(page.getByText(/compared with/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Best sellers' })).toBeVisible();
  await page.getByLabel('Period').selectOption('custom');
  await expect(page.getByLabel('From')).toBeVisible();
  await page.getByLabel('Period').selectOption('yesterday');
  await expect(page.getByText(/\(1 day\)/)).toBeVisible();
});

test('reports: hybrid vendor gets sales and bookings & staff tabs', async ({ page }) => {
  await login(page, { businessType: 'hybrid' });
  await page.goto('/reports');
  await expect(page.getByRole('tab', { name: 'Sales' })).toBeVisible();
  await page.getByRole('tab', { name: 'Bookings & staff' }).click();
  await expect(page.getByRole('heading', { name: 'Staff performance' })).toBeVisible();
});
