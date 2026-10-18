import { expect, type Page } from '@playwright/test';

export async function login(page: Page, opts: { businessType?: 'product' | 'service' } = {}) {
  await page.addInitScript((type) => {
    if (type === 'service') localStorage.setItem('tnbs.mock.type', 'service');
  }, opts.businessType ?? 'product');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9876500000');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByLabel('One-time password').fill('1234');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  return errors;
}

export async function openNav(page: Page) {
  const menu = page.getByRole('button', { name: 'Open navigation' });
  if (await menu.isVisible()) await menu.click();
}
