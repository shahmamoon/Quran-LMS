import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// The seed subject for Alex Mentor (teacher) / Jamie (student) — has 2-week curriculum
const SEED_SUBJECT  = 'Early Reading & Phonics';
const WEEK_1_TITLE  = 'Week 1: Letters & Sounds';
const WEEK_2_TITLE  = 'Week 2: Reading Skills';
const LESSON_1_1    = 'Alphabet Recognition';
const LESSON_1_2    = 'Letter Sounds (Phonics)';
const WEEK_2_LESSON = 'Sight Words';

test.describe('Curriculum — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    // Navigate into the seed subject
    await expect(page.getByText(SEED_SUBJECT).first()).toBeVisible({ timeout: 10_000 });
    const detailLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects/') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.getByText(SEED_SUBJECT).first().click();
    await detailLoaded;
    await expect(page).toHaveURL(/lms\/subjects\/.+/, { timeout: 10_000 });
    await expect(page.getByText(WEEK_1_TITLE)).toBeVisible({ timeout: 10_000 });
  });

  test('subject detail shows weeks and lessons', async ({ page }) => {
    await expect(page.getByText(WEEK_1_TITLE)).toBeVisible();
    await expect(page.getByText(LESSON_1_1)).toBeVisible();
    await expect(page.getByText(LESSON_1_2)).toBeVisible();
    await expect(page.getByText(WEEK_2_TITLE)).toBeVisible();
    await expect(page.getByText(WEEK_2_LESSON, { exact: true })).toBeVisible();
  });

  test('teacher can add a new week', async ({ page }) => {
    await page.getByRole('button', { name: /add week/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Week' })).toBeVisible();

    const weekTitle = `Week E2E ${Date.now()}: Playwright`;
    await page.getByLabel('Week Title').fill(weekTitle);
    await page.getByLabel('Description').fill('Added by Playwright');
    // Use form-scoped locator to avoid matching the "Add Week" page button
    await page.locator('form').getByRole('button', { name: 'Add Week' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Week added' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(weekTitle)).toBeVisible();
  });

  test('teacher can add a lesson to Week 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Lesson' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Lesson' })).toBeVisible();

    const lessonTitle = `E2E Lesson ${Date.now()}`;
    await page.getByLabel('Lesson Title').fill(lessonTitle);
    await page.getByLabel('Content (markdown)').fill('## Test\n\nCreated by Playwright.');
    await page.getByRole('button', { name: 'Add Lesson' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Lesson added' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(lessonTitle)).toBeVisible();
  });

  test('cancel add week modal', async ({ page }) => {
    await page.getByRole('button', { name: /add week/i }).click();
    await expect(page.getByRole('heading', { name: 'Add Week' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Week' })).not.toBeVisible();
  });
});

test.describe('Curriculum — Student (lesson completion)', () => {
  test.use({ storageState: authFile('student') });

  test.beforeEach(async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/subjects');
    await subjectsLoaded;
    // Jamie is enrolled in Early Reading & Phonics
    await expect(page.getByText(SEED_SUBJECT).first()).toBeVisible({ timeout: 10_000 });
    const detailLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects/') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.getByText(SEED_SUBJECT).first().click();
    await detailLoaded;
    await expect(page).toHaveURL(/lms\/subjects\/.+/, { timeout: 10_000 });
    await expect(page.getByText(WEEK_1_TITLE)).toBeVisible({ timeout: 10_000 });
  });

  test('student sees lesson list but no mark-complete buttons', async ({ page }) => {
    await expect(page.getByText(LESSON_1_1)).toBeVisible();
    await expect(page.getByText(LESSON_1_2)).toBeVisible();
    // Mark-complete circles are teacher-only — students should NOT see them
    const circleBtn = page.locator('li').filter({ hasText: LESSON_1_1 }).locator('button').first();
    await expect(circleBtn).not.toBeVisible();
  });

  test('student cannot see Add Week or Lesson buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add week/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Lesson' })).not.toBeVisible();
  });
});
