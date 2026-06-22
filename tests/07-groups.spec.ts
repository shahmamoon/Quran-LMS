import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// ── Teacher ────────────────────────────────────────────────────────────────

test.describe('Groups — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    const groupsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/groups') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/groups');
    await groupsLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('groups page loads', async ({ page }) => {
    // Scope to <main> — TopBar also renders <h1>Groups</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Group' })).toBeVisible();
  });

  test('seed group is displayed', async ({ page }) => {
    await expect(page.getByText('Junior Learners Cohort')).toBeVisible();
  });

  test('create a new group', async ({ page }) => {
    const groupName = `E2E Group ${Date.now()}`;
    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).toBeVisible();

    await page.getByLabel('Group Name').fill(groupName);
    await page.getByLabel('Description').fill('Created by Playwright tests');
    await page.getByRole('button', { name: 'Create Group' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Group created' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(groupName)).toBeVisible();
  });

  test('cancel group modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).not.toBeVisible();
  });

  test('New Group modal shows student picker with assigned students', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).toBeVisible();

    // Teacher should see their assigned students in the student picker
    // Jamie Learner is assigned to Alex Mentor (teacher)
    await expect(page.getByText('Add Students')).toBeVisible();
    await expect(page.getByText('Jamie Learner')).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('can select students via checkbox in New Group modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).toBeVisible();

    // Wait for student list to load
    await expect(page.getByText('Jamie Learner')).toBeVisible({ timeout: 8_000 });

    // Click on Jamie Learner to select them
    await page.locator('button').filter({ hasText: 'Jamie Learner' }).click();

    // "1 selected" badge should appear
    await expect(page.getByText('1 selected')).toBeVisible({ timeout: 4_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('New Group modal shows subject linking section', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).toBeVisible();

    // "Link Subjects" section should be present
    await expect(page.getByText('Link Subjects')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('can search students in group modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('heading', { name: 'New Group' })).toBeVisible();

    // Use the student search inside the modal
    const searchInput = page.getByPlaceholder('Search students...');
    await expect(searchInput).toBeVisible({ timeout: 6_000 });
    await searchInput.fill('Jamie');

    await expect(page.getByText('Jamie Learner')).toBeVisible({ timeout: 4_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

// ── Student ────────────────────────────────────────────────────────────────

test.describe('Groups — Student', () => {
  test.use({ storageState: authFile('student') });

  test('student sees their groups', async ({ page }) => {
    const groupsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/groups') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/groups');
    await groupsLoaded;
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Junior Learners Cohort')).toBeVisible();
  });

  test('student does not see New Group button', async ({ page }) => {
    await page.goto('/lms/groups');
    await expect(page.getByRole('button', { name: 'New Group' })).not.toBeVisible();
  });
});
