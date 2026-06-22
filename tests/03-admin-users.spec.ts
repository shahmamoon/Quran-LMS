import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

test.use({ storageState: authFile('admin') });

test.describe('Admin — User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Capture the users API response BEFORE navigating so we don't miss it
    const usersLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/users');
    await usersLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('users page loads with table', async ({ page }) => {
    // The page <h1> says "User Management" (not "Users" — that is the sidebar nav label)
    await expect(page.locator('main h1').filter({ hasText: 'User Management' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('table')).toBeVisible();
    // Wait for table to be populated
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows seed users in table', async ({ page }) => {
    // Wait for table rows to render
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Admin User').first()).toBeVisible();
    await expect(page.getByText('Alex Mentor').first()).toBeVisible();
    await expect(page.getByText('Jamie Learner').first()).toBeVisible();
  });

  test('student rows show grade under their badge', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    // Jamie Learner is a Kindergarten student — grade should appear somewhere in their row
    const row = page.locator('table tbody tr').filter({ hasText: 'Jamie Learner' }).first();
    await expect(row.getByText('Kindergarten')).toBeVisible({ timeout: 8_000 });
  });

  test('role badges are displayed correctly', async ({ page }) => {
    // Wait for table rows to be populated
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    // Check each role badge appears in the table
    await expect(page.locator('table').getByText('ADMIN').first()).toBeVisible();
    await expect(page.locator('table').getByText('TEACHER').first()).toBeVisible();
    await expect(page.locator('table').getByText('STUDENT').first()).toBeVisible();
  });

  test('search filters users by name', async ({ page }) => {
    const searchLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200
    );
    await page.getByPlaceholder('Search users...').fill('Jamie');
    await searchLoaded;
    await expect(page.getByText('Jamie Learner').first()).toBeVisible();
    await expect(page.getByText('Alex Mentor')).not.toBeVisible({ timeout: 2000 });
  });

  test('filter by role shows only matching users', async ({ page }) => {
    const filterLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200
    );
    await page.getByRole('combobox').selectOption('TEACHER');
    await filterLoaded;
    await expect(page.getByText('Alex Mentor').first()).toBeVisible();
    await expect(page.getByText('Jamie Learner')).not.toBeVisible({ timeout: 2000 });
  });

  test('create new student user with grade', async ({ page }) => {
    await page.getByRole('button', { name: 'New User' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();

    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Playwright');
    await page.getByLabel('Email').fill(`test.playwright.${Date.now()}@test.com`);
    await page.getByLabel('Password').fill('Test@1234!');
    // Role defaults to STUDENT — grade dropdown should be visible
    // Select Grade 5 from the grade picker
    const gradeSelect = page.getByLabel('Grade');
    if (await gradeSelect.isVisible().catch(() => false)) {
      await gradeSelect.selectOption('Grade 5');
    }
    await page.getByRole('button', { name: 'Create User' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'User created' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Test Playwright').first()).toBeVisible();
  });

  test('grade dropdown only appears when role is STUDENT', async ({ page }) => {
    await page.getByRole('button', { name: 'New User' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();

    // Default role is STUDENT — grade should be visible
    const gradeSelect = page.getByLabel('Grade');
    await expect(gradeSelect).toBeVisible({ timeout: 5_000 });

    // Switch to TEACHER — grade should disappear
    await page.getByLabel('Role').selectOption('TEACHER');
    await expect(gradeSelect).not.toBeVisible({ timeout: 3_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('cancel button closes the create modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New User' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).not.toBeVisible();
  });

  test('admin can open Edit Grade modal for a student', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Find Jamie Learner's row — they are a STUDENT so should have the Edit Grade button
    const jamieRow = page.locator('table tbody tr').filter({ hasText: 'Jamie Learner' }).first();
    await expect(jamieRow).toBeVisible({ timeout: 8_000 });

    // Click the Edit Grade button (text content — no title attribute on the button)
    const editGradeBtn = jamieRow.getByRole('button', { name: 'Edit Grade' });
    await expect(editGradeBtn).toBeVisible({ timeout: 6_000 });
    await editGradeBtn.click();

    // Modal should open with Jamie's name in the title
    await expect(page.getByRole('heading', { name: /Edit Grade/i })).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText(/Jamie/i).first()).toBeVisible();
  });

  test('Edit Grade modal shows grade dropdown and can be cancelled', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    const jamieRow = page.locator('table tbody tr').filter({ hasText: 'Jamie Learner' }).first();
    await jamieRow.getByRole('button', { name: 'Edit Grade' }).click();

    await expect(page.getByRole('heading', { name: /Edit Grade/i })).toBeVisible({ timeout: 6_000 });

    // "New Grade" select should be visible inside the modal
    const gradeSelect = page.getByLabel('New Grade');
    await expect(gradeSelect).toBeVisible({ timeout: 5_000 });

    // Cancel closes without saving
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Edit Grade/i })).not.toBeVisible();
  });

  test('admin can update a student grade', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    const jamieRow = page.locator('table tbody tr').filter({ hasText: 'Jamie Learner' }).first();
    await jamieRow.getByRole('button', { name: 'Edit Grade' }).click();

    await expect(page.getByRole('heading', { name: /Edit Grade/i })).toBeVisible({ timeout: 6_000 });

    // Change grade to Grade 1
    await page.getByLabel('New Grade').selectOption('Grade 1');

    // Save
    await page.getByRole('button', { name: 'Save Grade' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /grade updated/i })).toBeVisible({ timeout: 8_000 });

    // Restore back to Kindergarten so tests remain idempotent
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    const jamieRowRestored = page.locator('table tbody tr').filter({ hasText: 'Jamie Learner' }).first();
    await jamieRowRestored.getByRole('button', { name: 'Edit Grade' }).click();
    await expect(page.getByRole('heading', { name: /Edit Grade/i })).toBeVisible({ timeout: 6_000 });
    await page.getByLabel('New Grade').selectOption('Kindergarten');
    await page.getByRole('button', { name: 'Save Grade' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /grade updated/i })).toBeVisible({ timeout: 8_000 });
  });

  test('Edit Grade button does not appear on admin/teacher rows', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Filter to TEACHER role via the role dropdown, then verify no Edit Grade button
    const filterLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200
    );
    await page.getByRole('combobox').selectOption('TEACHER');
    await filterLoaded;

    await expect(page.getByText('Alex Mentor').first()).toBeVisible({ timeout: 8_000 });
    const alexRow = page.locator('table tbody tr').filter({ hasText: 'Alex Mentor' }).first();
    await expect(alexRow.getByRole('button', { name: 'Edit Grade' })).not.toBeVisible({ timeout: 2_000 });
  });
});
