import { expect, test } from '@playwright/test';
import { login } from './helpers';

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('vendor can ask for the photo background to be removed', async ({ page }) => {
  const errors = await login(page);
  await page.goto('/products/new');

  const removeBg = page.getByRole('checkbox', { name: /Remove background/ });
  await expect(removeBg).toBeDisabled();
  await expect(page.getByText('Choose a new photo to use this.')).toBeVisible();
  await expect(page.getByText('Photos are saved as WebP under 250 KB.')).toBeVisible();

  await page.locator('input[type=file]').setInputFiles({ name: 'kettle.png', mimeType: 'image/png', buffer: PNG });
  await expect(removeBg).toBeEnabled();
  await expect(page.getByText(/plain white background/)).toBeVisible();
  await removeBg.check();
  await expect(removeBg).toBeChecked();

  // Photos up to 15 MB are accepted now (the server shrinks them).
  await page.locator('input[type=file]').setInputFiles({
    name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(16 * 1024 * 1024),
  });
  await expect(page.getByText('Image is larger than 15 MB')).toBeVisible();
  expect(errors).toEqual([]);
});
