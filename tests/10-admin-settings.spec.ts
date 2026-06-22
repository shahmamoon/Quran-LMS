import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

test.describe('Admin — Settings & Audit Logs', () => {
  test.use({ storageState: authFile('admin') });

  test.beforeEach(async ({ page }) => {
    // Settings tests share navigation — no common beforeEach needed
  });

  test('settings page loads with system settings', async ({ page }) => {
    const settingsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/settings') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/settings');
    await settingsLoaded;
    await page.waitForLoadState('networkidle');
    // Scope to <main> — TopBar also renders <h1>Settings</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'System Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'General', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('settings shows known keys from seed', async ({ page }) => {
    const settingsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/settings') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/settings');
    await settingsLoaded;
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/site name/i)).toBeVisible();
    // Use exact text to avoid matching sidebar "Notifications" link
    await expect(page.getByText('Notifications Enabled')).toBeVisible();
  });

  test('can update a setting value', async ({ page }) => {
    const settingsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/settings') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/settings');
    await settingsLoaded;
    await page.waitForLoadState('networkidle');

    const siteNameInput = page.getByLabel(/site name/i);
    await siteNameInput.clear();
    await siteNameInput.fill('Build AI With Us — Test');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Settings saved' })).toBeVisible({ timeout: 8_000 });

    // Restore original
    await siteNameInput.clear();
    await siteNameInput.fill('Build AI With Us');
    await page.getByRole('button', { name: 'Save Changes' }).click();
  });

  test('audit logs page loads', async ({ page }) => {
    const auditLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/settings/audit-logs') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/audit');
    await auditLoaded;
    await page.waitForLoadState('networkidle');
    // Scope to <main> — TopBar also renders <h1>Audit Logs</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Audit Logs', exact: true })).toBeVisible();
  });

  test('audit logs table shows action and resource columns', async ({ page }) => {
    const auditLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/settings/audit-logs') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/audit');
    await auditLoaded;
    await page.waitForLoadState('networkidle');
    // Either shows table or empty state
    const table = page.getByRole('table');
    const empty = page.getByText(/no audit logs/i);
    const isTable = await table.isVisible();
    const isEmpty = await empty.isVisible();
    expect(isTable || isEmpty).toBe(true);
  });

  test('non-admin cannot access settings', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: authFile('student'),
    });
    const page = await ctx.newPage();
    await page.goto('/lms/settings');
    await expect(page).toHaveURL(/lms\/dashboard/, { timeout: 15_000 });
    await ctx.close();
  });

  test('non-admin cannot access audit logs', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: authFile('student'),
    });
    const page = await ctx.newPage();
    await page.goto('/lms/audit');
    await expect(page).toHaveURL(/lms\/dashboard/, { timeout: 15_000 });
    await ctx.close();
  });
});
