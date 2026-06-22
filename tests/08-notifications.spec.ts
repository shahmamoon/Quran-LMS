import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

test.describe('Notifications — Student', () => {
  test.use({ storageState: authFile('student') });

  test('notifications page loads', async ({ page }) => {
    const notifsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/notifications') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/notifications');
    await notifsLoaded;
    await page.waitForLoadState('networkidle');
    // Scope to <main> — TopBar also renders <h1>Notifications</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
  });

  test('shows empty state or notification list', async ({ page }) => {
    const notifsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/notifications') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/notifications');
    await notifsLoaded;
    await page.waitForLoadState('networkidle');
    // Use count() to avoid strict mode violation (multiple matching elements)
    const hasEmpty = (await page.getByText(/no notifications|all caught up/i).count()) > 0;
    const hasItems = await page.locator('ul li').first().isVisible();
    expect(hasEmpty || hasItems).toBe(true);
  });

  test('notification bell is visible in topbar', async ({ page }) => {
    const authDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/me') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await authDone;
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header')).toBeVisible();
    // Bell SVG icon in header
    await expect(page.locator('header svg').first()).toBeVisible();
  });
});

test.describe('Notifications — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test('admin notifications page loads', async ({ page }) => {
    const notifsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/notifications') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/notifications');
    await notifsLoaded;
    await page.waitForLoadState('networkidle');
    // Scope to <main> — TopBar also renders <h1>Notifications</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
  });
});
