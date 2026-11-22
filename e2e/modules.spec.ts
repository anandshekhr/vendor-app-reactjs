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
