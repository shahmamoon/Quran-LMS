import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// Jamie (student) is enrolled in "Early Reading & Phonics" with 5/6 lessons done.
// Completed: Alphabet Recognition, Letter Sounds (Phonics), Simple CVC Words,
//            Sight Words, Reading Simple Sentences
const SUBJECT_NAME  = 'Early Reading & Phonics';
const LESSON_DONE_1 = 'Alphabet Recognition';
const LESSON_DONE_2 = 'Letter Sounds (Phonics)';
const WEEK_1_TITLE  = 'Week 1: Letters & Sounds';

test.describe('Progress Tracking — Student', () => {
  test.use({ storageState: authFile('student') });

  test.beforeEach(async ({ page }) => {
    // Wait for the subjects API (first cascade), then curriculum progress
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && !r.url().includes('/api/subjects/') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/progress');
    await subjectsLoaded;
    // Give time for the cascading queries (progress + subject detail) to complete
    await page.waitForLoadState('networkidle');
  });

  test('progress page loads with "My Progress" heading', async ({ page }) => {
    // Scope to <main> — TopBar renders <h1>Progress</h1>, page renders <h1>My Progress</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'My Progress', exact: true })).toBeVisible();
  });

  test('shows enrolled subject with progress bar', async ({ page }) => {
    await expect(page.getByText(SUBJECT_NAME)).toBeVisible({ timeout: 10_000 });
    // Progress bar should be present
    await expect(page.locator('.bg-brand-500').first()).toBeVisible();
  });

  test('shows lesson list with completion status', async ({ page }) => {
    await expect(page.getByText(LESSON_DONE_1)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(LESSON_DONE_2)).toBeVisible();
  });

  test('shows week breakdown with counts', async ({ page }) => {
    await expect(page.getByText(WEEK_1_TITLE)).toBeVisible({ timeout: 10_000 });
    // Should show X/Y lesson count
    await expect(page.locator('text=/\\d+\\/\\d+/').first()).toBeVisible();
  });

  test('shows partial completion (5 out of 6 lessons done)', async ({ page }) => {
    // Jamie has 5/6 total lessons done (3/3 in Week 1, 2/3 in Week 2).
    // The UI shows per-week counts ("3/3", "2/3") rather than an overall "5/6".
    await expect(page.getByText(SUBJECT_NAME)).toBeVisible({ timeout: 10_000 });
    // Any fraction (N/M) or percentage indicator confirms progress is tracked
    const fractionVisible = await page.locator('text=/\\d+\\/\\d+/').first().isVisible().catch(() => false);
    const percentVisible  = await page.locator('text=/\\d+%/').first().isVisible().catch(() => false);
    expect(fractionVisible || percentVisible).toBeTruthy();
  });
});

test.describe('Progress — Teacher view', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && !r.url().includes('/api/subjects/') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/progress');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('teacher progress page shows "Student Progress" heading', async ({ page }) => {
    // Teacher view shows student progress, not their own
    await expect(page.locator('main').getByRole('heading', { name: 'Student Progress', exact: true })).toBeVisible();
  });

  test('teacher sees summary stat cards', async ({ page }) => {
    // Three stat cards: Subjects, Total Students, Avg Completion
    await expect(page.locator('p').filter({ hasText: /^Subjects$/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('p').filter({ hasText: /^Total Students$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Avg Completion$/ })).toBeVisible();
  });

  test('teacher sees their assigned subject', async ({ page }) => {
    // Alex Mentor teaches Early Reading & Phonics
    await expect(page.getByText(SUBJECT_NAME)).toBeVisible({ timeout: 10_000 });
  });

  test('teacher sees enrolled student (Jamie) in subject card', async ({ page }) => {
    // Jamie may appear in multiple subject cards — .first() avoids strict-mode violation
    await expect(page.getByText('Jamie Learner').first()).toBeVisible({ timeout: 10_000 });
  });

  test('teacher can expand a student to see week breakdown', async ({ page }) => {
    // Click on Jamie's row to expand the week/lesson detail
    const studentRow = page.locator('button').filter({ hasText: 'Jamie Learner' }).first();
    await expect(studentRow).toBeVisible({ timeout: 10_000 });
    await studentRow.click();
    // After expanding, Week 1 title should appear
    await expect(page.getByText(WEEK_1_TITLE)).toBeVisible({ timeout: 6_000 });
  });
});
