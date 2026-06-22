import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// The seed subject taught by Alex Mentor (teacher) and enrolled by Jamie (student)
const SEED_SUBJECT       = 'Early Reading & Phonics';
const SEED_SUBJECT_WEEK1 = 'Week 1: Letters & Sounds';
const SEED_SUBJECT_WEEK2 = 'Week 2: Reading Skills';

const TEST_SUBJECT = `Playwright Subject ${Date.now()}`;

// Helper: scope heading checks to <main> to avoid the TopBar <h1> duplicate
const mainHeading = (page: any, name: string) =>
  page.locator('main').getByRole('heading', { name, exact: true });

test.describe('Subjects — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test.beforeEach(async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('subjects page loads', async ({ page }) => {
    // Scope to main to avoid matching the TopBar <h1>Subjects</h1>
    await expect(mainHeading(page, 'Subjects')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Subject' })).toBeVisible();
  });

  test('seed subject is displayed', async ({ page }) => {
    await expect(page.getByText(SEED_SUBJECT).first()).toBeVisible();
  });

  test('subject card shows published/draft badge', async ({ page }) => {
    // At least one Published or Draft badge should appear on the subject cards
    const count = await page.getByText(/^(Published|Draft)$/).count();
    expect(count).toBeGreaterThan(0);
  });

  test('subject card shows assigned teacher', async ({ page }) => {
    // Early Reading & Phonics should show Alex Mentor as teacher
    await expect(page.getByText('Alex Mentor').first()).toBeVisible();
  });

  test('create a new subject with multi-teacher picker', async ({ page }) => {
    await page.getByRole('button', { name: 'New Subject' }).click();
    await expect(page.getByRole('heading', { name: 'New Subject' })).toBeVisible();

    await page.getByLabel('Title').fill(TEST_SUBJECT);
    await page.getByLabel('Description').fill('Created by Playwright E2E test');

    // Teacher picker is a checkbox list — click the label for Alex Mentor
    const teacherLabel = page.locator('label').filter({ hasText: 'Alex Mentor' });
    await expect(teacherLabel).toBeVisible({ timeout: 8_000 });
    await teacherLabel.click();

    // Verify the checkbox is now checked
    const checkbox = teacherLabel.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Subject created' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(TEST_SUBJECT)).toBeVisible();
  });

  test('requires at least one teacher when creating subject', async ({ page }) => {
    await page.getByRole('button', { name: 'New Subject' }).click();
    await page.getByLabel('Title').fill('No Teacher Subject');

    // Do NOT select any teacher, click Create
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Please assign at least one teacher' })).toBeVisible({ timeout: 6_000 });
    // Modal should still be open
    await expect(page.getByRole('heading', { name: 'New Subject' })).toBeVisible();
  });

  test('edit a subject opens pre-filled modal', async ({ page }) => {
    // Click the edit (pencil) icon on the seed subject card
    const card = page.locator('.rounded-xl, [class*="Card"]').filter({ hasText: SEED_SUBJECT }).first();
    await card.locator('button[title="Edit subject"]').click();

    await expect(page.getByRole('heading', { name: 'Edit Subject' })).toBeVisible({ timeout: 6_000 });
    // Title field should be pre-filled
    await expect(page.getByLabel('Title')).toHaveValue(SEED_SUBJECT);
    // Alex Mentor checkbox should already be checked
    const teacherLabel = page.locator('label').filter({ hasText: 'Alex Mentor' });
    await expect(teacherLabel.locator('input[type="checkbox"]')).toBeChecked();

    // Close without saving
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Subject' })).not.toBeVisible();
  });

  test('subject detail page shows curriculum', async ({ page }) => {
    await page.getByText(SEED_SUBJECT).first().click();
    await expect(page).toHaveURL(/lms\/subjects\/.+/);
    await expect(page.getByText(SEED_SUBJECT_WEEK1)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(SEED_SUBJECT_WEEK2)).toBeVisible();
  });

  test('subject detail shows Publish/Unpublish button for staff', async ({ page }) => {
    await page.getByText(SEED_SUBJECT).first().click();
    await expect(page).toHaveURL(/lms\/subjects\/.+/);
    // Either "Publish" or "Unpublish" button should be visible (staff only)
    const publishBtn = page.getByRole('button', { name: /^(Publish|Unpublish)$/ });
    await expect(publishBtn).toBeVisible({ timeout: 10_000 });
  });

  test('subject detail shows teachers list', async ({ page }) => {
    await page.getByText(SEED_SUBJECT).first().click();
    await expect(page).toHaveURL(/lms\/subjects\/.+/);
    // Teacher name should appear somewhere in the subject detail
    await expect(page.getByText('Alex Mentor').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Subjects — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test('teacher sees their subjects', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SEED_SUBJECT)).toBeVisible();
  });

  test('teacher can access New Subject button', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await expect(page.getByRole('button', { name: 'New Subject' })).toBeVisible();
  });

  test('teacher does not see edit/delete icons on subject cards', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // Edit button (title="Edit subject") should not be visible for teachers
    await expect(page.locator('button[title="Edit subject"]')).not.toBeVisible();
  });

  test('teacher subject detail shows Publish/Unpublish button', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.getByText(SEED_SUBJECT).first().click();
    await expect(page).toHaveURL(/lms\/subjects\/.+/);
    const publishBtn = page.getByRole('button', { name: /^(Publish|Unpublish)$/ });
    await expect(publishBtn).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Subjects — Student', () => {
  test.use({ storageState: authFile('student') });

  test('student sees enrolled subjects', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // Jamie is enrolled in Early Reading & Phonics
    await expect(page.getByText(SEED_SUBJECT)).toBeVisible();
  });

  test('student does not see New Subject button', async ({ page }) => {
    await page.goto('/lms/subjects');
    await expect(page.getByRole('button', { name: 'New Subject' })).not.toBeVisible();
  });

  test('student does not see Publish/Unpublish button on subject detail', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    await page.getByText(SEED_SUBJECT).first().click();
    await expect(page).toHaveURL(/lms\/subjects\/.+/);
    await expect(page.getByRole('button', { name: /^(Publish|Unpublish)$/ })).not.toBeVisible({ timeout: 5_000 });
  });
});
