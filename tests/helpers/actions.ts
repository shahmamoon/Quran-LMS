import { Page, expect } from '@playwright/test';

/** Log in via the LMS login page and wait for the dashboard */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/lms/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Wait for redirect to dashboard
  await page.waitForURL('**/lms/dashboard', { timeout: 10_000 });
}

/** Log out via the sidebar Sign out button */
export async function logout(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/lms/login');
}

/** Navigate to an LMS section via sidebar */
export async function goTo(page: Page, label: string) {
  await page.getByRole('link', { name: label }).click();
  await page.waitForLoadState('networkidle');
}

/** Wait for a toast notification containing text */
export async function expectToast(page: Page, text: string) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text })).toBeVisible({ timeout: 8_000 });
}
