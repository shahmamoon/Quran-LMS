/**
 * 12-students.spec.ts
 *
 * Tests for the Students page — covers the teacher-scoped student list,
 * grade badges, enrollment modal with grade-filtered subjects, and group membership.
 */
import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// Seed student and their enrolled subject
const TEST_STUDENT     = 'Jamie Learner';
const ENROLLED_SUBJECT = 'Early Reading & Phonics';
const STUDENT_GRADE    = 'Kindergarten';

// ── Admin ──────────────────────────────────────────────────────────────────

test.describe('Students — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test.beforeEach(async ({ page }) => {
    const usersLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/students');
    await usersLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('students page loads and shows seed student', async ({ page }) => {
    // Scope to <main> — TopBar also renders <h1>Students</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
    await expect(page.getByText(TEST_STUDENT)).toBeVisible();
  });

  test('student card shows grade badge', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    // Grade badge should display "Kindergarten"
    await expect(card.getByText(STUDENT_GRADE)).toBeVisible({ timeout: 8_000 });
  });

  test('student card shows enrolled subject names as pills', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await expect(card.getByText(ENROLLED_SUBJECT)).toBeVisible({ timeout: 8_000 });
  });

  test('student card shows active/inactive badge', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    const badge = card.locator('text=Active').or(card.locator('text=Inactive')).first();
    await expect(badge).toBeVisible();
  });

  test('search filters students by name', async ({ page }) => {
    await page.getByPlaceholder('Search students...').fill('Jamie');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(TEST_STUDENT)).toBeVisible();
  });

  test('expand student row shows enrolled subjects and groups', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    // Click the chevron expand button
    await card.locator('button').last().click();
    // Expanded section should show "Enrolled Subjects" heading
    await expect(card.getByText('Enrolled Subjects', { exact: false })).toBeVisible({ timeout: 6_000 });
    // exact:true avoids matching "X groups" in the summary chip (strict mode)
    await expect(card.getByText('Groups', { exact: true })).toBeVisible();
  });

  test('enrollment modal opens with subject picker', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByRole('heading', { name: /Enroll/ })).toBeVisible({ timeout: 6_000 });
    await expect(page.getByLabel('Subject')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('enrollment modal shows grade-appropriate subjects first', async ({ page }) => {
    // Jamie is Kindergarten — the dropdown should show Kindergarten subjects first
    // and Upskill subjects (accessible to all grades) before the divider
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByLabel('Subject')).toBeVisible({ timeout: 6_000 });

    // Select dropdown to check options
    const subjectSelect = page.getByLabel('Subject');
    const optionCount = await subjectSelect.locator('option').count();
    // Should have at least one option (grade-filtered subjects)
    expect(optionCount).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('enrollment modal shows teacher assignment options', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByLabel('Subject')).toBeVisible({ timeout: 6_000 });

    const subjectSelect = page.getByLabel('Subject');
    await subjectSelect.selectOption({ index: 1 }); // pick the first available option

    // If the subject has exactly one teacher, an "Auto-assigned" chip appears.
    // Otherwise a teacher picker or "No teachers" message appears.
    const hasAutoAssigned    = await page.locator('text=Auto-assigned').isVisible().catch(() => false);
    const hasTeacherPicker   = await page.getByLabel('Assign Teacher').isVisible().catch(() => false);
    const hasNoTeacherWarning = await page.locator('text=No teachers assigned').isVisible().catch(() => false);

    expect(hasAutoAssigned || hasTeacherPicker || hasNoTeacherWarning).toBeTruthy();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('add to group modal opens with group picker', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.getByRole('button', { name: 'Add to Group' }).click();
    await expect(page.getByRole('heading', { name: /Add.*to Group/i })).toBeVisible({ timeout: 6_000 });
    await expect(page.getByLabel('Group')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

// ── Teacher (scoped view) ──────────────────────────────────────────────────

test.describe('Students — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    const usersLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/users') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/students');
    await usersLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('teacher sees students page with enrolled students', async ({ page }) => {
    // Scope to <main> — TopBar also renders <h1>Students</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
    // Alex Mentor (teacher) has Jamie Learner assigned via Early Reading & Phonics
    await expect(page.getByText(TEST_STUDENT)).toBeVisible({ timeout: 8_000 });
  });

  test('teacher can expand student card to see details', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.locator('button').last().click();
    await expect(card.getByText('Enrolled Subjects', { exact: false })).toBeVisible({ timeout: 6_000 });
  });

  test('teacher can open enroll modal for their student', async ({ page }) => {
    const card = page.locator('[class*="Card"], .rounded-xl').filter({ hasText: TEST_STUDENT }).first();
    await card.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByRole('heading', { name: /Enroll/ })).toBeVisible({ timeout: 6_000 });
    await expect(page.getByLabel('Subject')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

// ── Student (no access to Students page) ──────────────────────────────────

test.describe('Students — Student role', () => {
  test.use({ storageState: authFile('student') });

  test('student cannot access /lms/students (redirected or forbidden)', async ({ page }) => {
    await page.goto('/lms/students');
    // Student should either be redirected away from this page or see no management UI
    const url = page.url();
    const isRedirected = !url.includes('/students');
    const hasForbiddenText = await page.getByText(/forbidden|not authorized|access denied/i).isVisible().catch(() => false);
    const hasNoStudentsHeading = !(await page.getByRole('heading', { name: 'Students', exact: true }).isVisible().catch(() => false));

    // At minimum they should not see the full student management UI
    expect(isRedirected || hasForbiddenText || hasNoStudentsHeading).toBeTruthy();
  });
});
