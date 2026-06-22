import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// Jamie (student) is enrolled in this seed subject
const STUDENT_ENROLLED_SUBJECT = 'Early Reading & Phonics';

test.describe('Admin Dashboard', () => {
  test.use({ storageState: authFile('admin') });

  test('shows stat cards', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // StatCard labels — use paragraph filter to avoid sidebar link / section heading collisions
    await expect(page.locator('p').filter({ hasText: /^Students$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Teachers$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Subjects$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Upcoming Sessions$/ })).toBeVisible();
  });

  test('shows subjects panel', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // Any of the 42 seed subjects should appear in the dashboard panel
    await expect(page.getByText(STUDENT_ENROLLED_SUBJECT)).toBeVisible();
  });
});

test.describe('Teacher Dashboard', () => {
  test.use({ storageState: authFile('teacher') });

  test('shows welcome message and stat cards', async ({ page }) => {
    const sessionsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/sessions') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await sessionsLoaded;
    await page.waitForLoadState('networkidle');
    // Dashboard h1 = "{greeting()}, Alex!" — check main content h1 contains "Alex"
    await expect(page.locator('main h1').filter({ hasText: 'Alex' })).toBeVisible();
    // StatCard labels on teacher dashboard
    await expect(page.locator('p').filter({ hasText: /^My Subjects$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Upcoming Classes$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Live Now$/ })).toBeVisible();
  });
});

test.describe('Student Dashboard', () => {
  test.use({ storageState: authFile('student') });

  test('shows personalised greeting and panels', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // Dashboard h1 = "{greeting()}, Jamie!" — check main content h1 contains "Jamie"
    await expect(page.locator('main h1').filter({ hasText: 'Jamie' })).toBeVisible();
    // StatCard labels on student dashboard — use paragraph filter to avoid collisions
    await expect(page.locator('p').filter({ hasText: /^Enrolled Subjects$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Upcoming Classes$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Unread Notifications$/ })).toBeVisible();
  });

  test('shows enrolled subject in dashboard panel', async ({ page }) => {
    const subjectsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/subjects') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await subjectsLoaded;
    await page.waitForLoadState('networkidle');
    // exact:true avoids matching notification bodies that contain the subject name
    await expect(page.getByText(STUDENT_ENROLLED_SUBJECT, { exact: true }).first()).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test.use({ storageState: authFile('admin') });

  test('all admin nav items are visible', async ({ page }) => {
    const authDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/me') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await authDone;
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('aside');
    // Core nav
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Subjects' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Sessions' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Groups' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Quizzes' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Progress' })).toBeVisible();
    // Communication
    await expect(sidebar.getByRole('link', { name: 'Chat' })).toBeVisible();
    // Management (admin only)
    await expect(sidebar.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'AI Curriculum' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Audit Logs' })).toBeVisible();
  });

  test('student sidebar does not show admin-only or teacher-only links', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: authFile('student') });
    const page = await ctx.newPage();
    const authDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/me') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await authDone;
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('aside');
    // Admin-only links
    await expect(sidebar.getByRole('link', { name: 'Users' })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Settings' })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Audit Logs' })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'AI Curriculum' })).not.toBeVisible();
    // Teacher+Admin-only links
    await expect(sidebar.getByRole('link', { name: 'AI Assistant' })).not.toBeVisible();
    // Links students should see
    await expect(sidebar.getByRole('link', { name: 'Quizzes' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Subjects' })).toBeVisible();
    await ctx.close();
  });

  test('sidebar links navigate correctly', async ({ page }) => {
    const authDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/me') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/dashboard');
    await authDone;
    await page.waitForLoadState('networkidle');

    await page.locator('aside').getByRole('link', { name: 'Subjects' }).click();
    await expect(page).toHaveURL(/lms\/subjects/);

    await page.locator('aside').getByRole('link', { name: 'Sessions' }).click();
    await expect(page).toHaveURL(/lms\/sessions/);

    await page.locator('aside').getByRole('link', { name: 'Quizzes' }).click();
    await expect(page).toHaveURL(/lms\/quiz/);

    await page.locator('aside').getByRole('link', { name: 'Groups' }).click();
    await expect(page).toHaveURL(/lms\/groups/);
  });
});
