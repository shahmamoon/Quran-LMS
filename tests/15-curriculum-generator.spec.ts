/**
 * 15-curriculum-generator.spec.ts
 *
 * Tests for the AI Curriculum Generator — admin-only feature.
 *
 * We test:
 *   - Admin can navigate to the page
 *   - The 3-step wizard is present (grade, subject, numWeeks inputs)
 *   - Teachers and students are blocked (ProtectedRoute redirect)
 *   - Sidebar "AI Curriculum" link works for admins
 *
 * We do NOT test AI generation end-to-end (requires a live DeepSeek call).
 */
import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

const CURRICULUM_URL = '/lms/curriculum-generator';

// ── Admin ──────────────────────────────────────────────────────────────────

test.describe('AI Curriculum Generator — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test.beforeEach(async ({ page }) => {
    await page.goto(CURRICULUM_URL);
    await page.waitForLoadState('networkidle');
  });

  test('curriculum generator page loads', async ({ page }) => {
    // Page should show a heading for the generator
    const heading = page.locator('main').getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('Step 1 shows grade level dropdown', async ({ page }) => {
    // First step should have a grade selector
    const gradeSelect = page.getByLabel(/grade/i).first();
    const gradeCombo  = page.getByRole('combobox', { name: /grade/i }).first();
    const hasGrade    = await gradeSelect.isVisible().catch(() => false)
                     || await gradeCombo.isVisible().catch(() => false);
    expect(hasGrade).toBeTruthy();
  });

  test('Step 1 shows subject dropdown', async ({ page }) => {
    // First step should have a subject selector
    const subjectSelect = page.getByLabel(/subject/i).first();
    const subjectCombo  = page.getByRole('combobox', { name: /subject/i }).first();
    const hasSubject    = await subjectSelect.isVisible().catch(() => false)
                       || await subjectCombo.isVisible().catch(() => false);
    expect(hasSubject).toBeTruthy();
  });

  test('Step 1 shows number of weeks input', async ({ page }) => {
    // The wizard has two number inputs (Number of Weeks + Lessons per Week).
    // Use .first() to avoid a strict-mode violation when multiple matches exist.
    const hasNumberInput = await page.locator('input[type="number"]').first().isVisible().catch(() => false);
    // Also look for the label text directly (the <label> element isn't ARIA-associated via htmlFor)
    const hasWeeksLabel  = await page.locator('label').filter({ hasText: /number of weeks/i }).first().isVisible().catch(() => false);
    expect(hasNumberInput || hasWeeksLabel).toBeTruthy();
  });

  test('Generate button is present', async ({ page }) => {
    const genBtn = page.getByRole('button', { name: /generate/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 8_000 });
  });

  test('sidebar "AI Curriculum" link navigates to the generator', async ({ page }) => {
    await page.goto('/lms/dashboard');
    await page.waitForLoadState('networkidle');
    await page.locator('aside').getByRole('link', { name: 'AI Curriculum' }).click();
    await expect(page).toHaveURL(/curriculum-generator/);
  });
});

// ── Teacher (should be blocked) ────────────────────────────────────────────

test.describe('AI Curriculum Generator — Teacher (blocked)', () => {
  test.use({ storageState: authFile('teacher') });

  test('teacher cannot access curriculum generator', async ({ page }) => {
    await page.goto(CURRICULUM_URL);
    await page.waitForLoadState('networkidle');
    // Teacher should be redirected (ProtectedRoute) or see a forbidden state
    const url           = page.url();
    const isRedirected  = !url.includes('curriculum-generator');
    const hasForbidden  = await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false);
    expect(isRedirected || hasForbidden).toBeTruthy();
  });

  test('teacher sidebar does not show AI Curriculum link', async ({ page }) => {
    await page.goto('/lms/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('aside').getByRole('link', { name: 'AI Curriculum' })).not.toBeVisible();
  });
});

// ── Student (should be blocked) ────────────────────────────────────────────

test.describe('AI Curriculum Generator — Student (blocked)', () => {
  test.use({ storageState: authFile('student') });

  test('student cannot access curriculum generator', async ({ page }) => {
    await page.goto(CURRICULUM_URL);
    await page.waitForLoadState('networkidle');
    const url           = page.url();
    const isRedirected  = !url.includes('curriculum-generator');
    const hasForbidden  = await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false);
    expect(isRedirected || hasForbidden).toBeTruthy();
  });

  test('student sidebar does not show AI Curriculum link', async ({ page }) => {
    await page.goto('/lms/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('aside').getByRole('link', { name: 'AI Curriculum' })).not.toBeVisible();
  });
});
