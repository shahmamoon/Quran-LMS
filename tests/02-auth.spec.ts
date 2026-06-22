import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/actions';
import { ADMIN, TEACHER, STUDENT } from './helpers/credentials';

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/lms/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('quick-fill demo buttons populate fields', async ({ page }) => {
    await page.goto('/lms/login');
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByLabel('Email address')).toHaveValue(ADMIN.email);
    await expect(page.getByLabel('Password')).toHaveValue(ADMIN.password);
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/lms/login');
    await page.getByLabel('Email address').fill('wrong@email.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 8_000 });
  });

  test('shows error for empty form', async ({ page }) => {
    await page.goto('/lms/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Browser native validation or custom error
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeFocused();
  });

  test('admin can log in and see dashboard', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/lms\/dashboard/);
    // Dashboard h1 = "{greeting()}, Admin!" — check main content h1 contains "Admin"
    await expect(page.locator('main h1').filter({ hasText: 'Admin' })).toBeVisible();
  });

  test('teacher can log in and see teacher dashboard', async ({ page }) => {
    await login(page, TEACHER.email, TEACHER.password);
    await expect(page).toHaveURL(/lms\/dashboard/);
    // Dashboard h1 = "{greeting()}, Alex!" — check main content h1 contains "Alex"
    await expect(page.locator('main h1').filter({ hasText: 'Alex' })).toBeVisible();
  });

  test('student can log in and see student dashboard', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await expect(page).toHaveURL(/lms\/dashboard/);
    // Dashboard h1 = "{greeting()}, Jamie!" — check main content h1 contains "Jamie"
    await expect(page.locator('main h1').filter({ hasText: 'Jamie' })).toBeVisible();
  });

  test('unauthenticated user is redirected to login from /lms/dashboard', async ({ page }) => {
    await page.goto('/lms/dashboard');
    await expect(page).toHaveURL(/lms\/login/);
  });

  test('student cannot access admin-only /lms/users page', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto('/lms/users');
    // Should redirect to dashboard (role guard)
    await expect(page).toHaveURL(/lms\/dashboard/);
  });

  test('user can log out', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await logout(page);
    await expect(page).toHaveURL(/lms\/login/);
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/lms/login');
    const passInput = page.getByLabel('Password');
    await expect(passInput).toHaveAttribute('type', 'password');
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last().click();
    await expect(passInput).toHaveAttribute('type', 'text');
  });
});
