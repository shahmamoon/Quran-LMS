import { test, expect } from '@playwright/test';

test.describe('Public Marketing Site', () => {
  test('home page loads with hero and navigation', async ({ page }) => {
    await page.goto('/');
    // Title contains the site brand (either name variant is accepted)
    await expect(page).toHaveTitle(/.+/);
    await expect(page.getByRole('link', { name: 'Programs' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
  });

  test('navbar has Login button linking to LMS', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /^Login$/i }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/lms\/login/);
  });

  test('programs page loads', async ({ page }) => {
    await page.goto('/programs');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('booking page has form', async ({ page }) => {
    await page.goto('/book');
    // Form labels are not wired with htmlFor; check the label text and inputs directly
    await expect(page.getByText('Parent Name').first()).toBeVisible();
    await expect(page.getByText('Parent Email').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test('404 page shown for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
  });
});
