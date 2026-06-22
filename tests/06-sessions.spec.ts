import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// ── Helpers ────────────────────────────────────────────────────────────────

function futureDate(daysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for type="date" input
}

async function openSessionsPage(page: any) {
  const sessionsLoaded = page.waitForResponse(
    (r: any) => r.url().includes('/api/sessions') && r.status() === 200,
    { timeout: 15_000 }
  );
  await page.goto('/lms/sessions');
  await sessionsLoaded;
  await page.waitForLoadState('networkidle');
}

// The Modal component is a fixed div with class max-w-lg — use it to scope
// button lookups so we don't accidentally hit session-card Cancel buttons.
const modalCancel = (page: any) =>
  page.locator('.max-w-lg').getByRole('button', { name: 'Cancel' });

// ── Teacher ────────────────────────────────────────────────────────────────

test.describe('Sessions — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    await openSessionsPage(page);
  });

  test('sessions page loads', async ({ page }) => {
    // Scope to <main> — TopBar also renders <h1>Sessions</h1> causing strict-mode failure
    await expect(page.locator('main').getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
    await expect(page.getByText('Zoom-powered live learning sessions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Session' })).toBeVisible();
  });

  test('create a group session without subject (teacher shortcut)', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    await expect(page.getByRole('heading', { name: 'New Zoom Session' })).toBeVisible();

    const sessionTitle = `Playwright Session ${Date.now()}`;
    await page.getByLabel('Session Title').fill(sessionTitle);
    await page.getByLabel('Description (optional)').fill('Auto-created by E2E test');
    await page.getByLabel('Date & Time').fill(futureDate(1));
    await page.getByLabel('Duration').selectOption('60');
    await page.getByRole('button', { name: 'Create + Generate Zoom Link' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /session created/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(sessionTitle).first()).toBeVisible();
  });

  test('create a 1-on-1 session by selecting subject and student', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    const sessionTitle = `1-on-1 Session ${Date.now()}`;

    await page.getByLabel('Session Title').fill(sessionTitle);
    await page.getByLabel('Date & Time').fill(futureDate(2));

    // The student-enrollment query fires when subjectId is set (enabled: !!subjectId && showModal).
    // Register the response listener BEFORE selecting the subject so we don't miss the request.
    const studentsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/curriculum/') && r.url().includes('/students') && r.status() === 200,
      { timeout: 10_000 }
    );

    // Select subject to unlock session type toggle
    const subjectSelect = page.getByLabel('Subject');
    await expect(subjectSelect).toBeVisible({ timeout: 8_000 });
    await subjectSelect.selectOption({ label: 'Early Reading & Phonics' });

    // Wait for enrolled-students API to respond
    await studentsLoaded;

    // Wait for session type buttons to appear
    await expect(page.getByRole('button', { name: '👤 1-on-1' })).toBeVisible({ timeout: 6_000 });
    await page.getByRole('button', { name: '👤 1-on-1' }).click();

    // Find the student select specifically by its placeholder option text.
    // (.last() would wrongly pick the Duration select — 3 selects: Subject, Student, Duration)
    const studentSelect = page.locator('.max-w-lg select').filter({ hasText: /Select student/ });
    await expect(studentSelect).toBeVisible({ timeout: 8_000 });
    // Select the first available student (index 1, skipping placeholder)
    const optionCount = await studentSelect.locator('option').count();
    if (optionCount > 1) {
      await studentSelect.selectOption({ index: 1 });
    } else {
      // No students enrolled in this subject — skip gracefully
      await modalCancel(page).click();
      return;
    }

    await page.getByRole('button', { name: 'Create + Generate Zoom Link' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /session created/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(sessionTitle).first()).toBeVisible();
  });

  test('session type toggle appears only after subject is selected', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();

    // Session type buttons should NOT be visible before subject selection
    await expect(page.getByRole('button', { name: '👥 Group' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '👤 1-on-1' })).not.toBeVisible();

    // Select a subject
    const subjectSelect = page.getByLabel('Subject');
    await subjectSelect.selectOption({ label: 'Early Reading & Phonics' });

    // Now they should appear
    await expect(page.getByRole('button', { name: '👥 Group' })).toBeVisible({ timeout: 6_000 });
    await expect(page.getByRole('button', { name: '👤 1-on-1' })).toBeVisible();

    await modalCancel(page).click();
  });

  test('created session shows SCHEDULED badge', async ({ page }) => {
    await expect(page.getByText('SCHEDULED').first()).toBeVisible();
  });

  test('teacher can open and close edit modal', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: 'Edit' }).first();
    await editBtn.click();
    await expect(page.getByRole('heading', { name: 'Edit Session' })).toBeVisible();
    // Scope Cancel to the modal (avoids matching session card Cancel buttons)
    await modalCancel(page).click();
    await expect(page.getByRole('heading', { name: 'Edit Session' })).not.toBeVisible();
  });

  test('create then cancel a session', async ({ page }) => {
    const sessionTitle = `Delete-me ${Date.now()}`;

    await page.getByRole('button', { name: 'New Session' }).click();
    await page.getByLabel('Session Title').fill(sessionTitle);
    await page.getByLabel('Date & Time').fill(futureDate(3));
    await page.getByRole('button', { name: 'Create + Generate Zoom Link' }).click();
    await expect(page.getByText(sessionTitle)).toBeVisible({ timeout: 8_000 });

    // Find the session card by its title and click its Cancel session button
    const card = page.locator('.rounded-xl').filter({ hasText: sessionTitle });
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'cancelled' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(sessionTitle)).not.toBeVisible();
  });

  test('teacher does not see teacher picker in session form', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();

    // Select a subject so all form steps are revealed
    const subjectSelect = page.getByLabel('Subject');
    await subjectSelect.selectOption({ label: 'Early Reading & Phonics' });

    // The "Teacher" label (admin-only step) should NOT appear for teacher role
    // Scope to modal to avoid false positives from session card content
    await expect(page.locator('.max-w-lg label').filter({ hasText: /^Teacher$/ })).not.toBeVisible();

    await modalCancel(page).click();
  });

  test('recurring toggle appears and day chips are clickable', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    await expect(page.getByRole('heading', { name: 'New Zoom Session' })).toBeVisible();

    // Toggle should be visible
    await expect(page.getByText('Repeat on specific days')).toBeVisible();

    // Day chips should NOT be visible before toggle is on
    await expect(page.getByRole('button', { name: 'Mon' })).not.toBeVisible();

    // Turn on recurring
    await page.getByText('Repeat on specific days').click();

    // Day chips appear
    await expect(page.getByRole('button', { name: 'Mon' })).toBeVisible({ timeout: 4_000 });
    await expect(page.getByRole('button', { name: 'Wed' })).toBeVisible();

    // Select Mon and Wed
    await page.getByRole('button', { name: 'Mon' }).click();
    await page.getByRole('button', { name: 'Wed' }).click();

    // Button label changes
    await expect(page.getByRole('button', { name: 'Create Recurring Sessions' })).toBeVisible();

    await modalCancel(page).click();
  });

  test('recurring session count preview shows correct number', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();

    // Set a start date (next Monday)
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    await page.getByLabel('Date & Time').fill(nextMonday.toISOString().slice(0, 10));

    // Enable recurring
    await page.getByText('Repeat on specific days').click();
    await page.getByRole('button', { name: 'Mon' }).click();

    // Set end date 2 weeks out
    const endDate = new Date(nextMonday);
    endDate.setDate(endDate.getDate() + 13);
    await page.getByLabel('Repeat until').fill(endDate.toISOString().slice(0, 10));

    // Should show "2 sessions will be created"
    await expect(page.getByText(/2 sessions? will be created/)).toBeVisible({ timeout: 4_000 });

    await modalCancel(page).click();
  });
});

// ── Admin ──────────────────────────────────────────────────────────────────

test.describe('Sessions — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test.beforeEach(async ({ page }) => {
    await openSessionsPage(page);
  });

  test('admin sees sessions with create button', async ({ page }) => {
    // Scope to <main> — TopBar also renders <h1>Sessions</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Session' })).toBeVisible();
  });

  test('admin session form shows teacher step after subject selection', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    await expect(page.getByRole('heading', { name: 'New Zoom Session' })).toBeVisible();

    // Before subject selection: placeholder text appears in Teacher step
    await expect(page.getByText('Select a subject first')).toBeVisible();

    // Select a subject
    const subjectSelect = page.getByLabel('Subject');
    await expect(subjectSelect).toBeVisible({ timeout: 8_000 });
    await subjectSelect.selectOption({ label: 'Early Reading & Phonics' });

    // Early Reading & Phonics has one teacher (Alex Mentor) → Auto-assigned chip appears
    await expect(page.getByText('Auto-assigned')).toBeVisible({ timeout: 8_000 });

    await modalCancel(page).click();
  });

  test('admin can create a group session with subject and auto-assigned teacher', async ({ page }) => {
    const sessionTitle = `Admin Group Session ${Date.now()}`;

    await page.getByRole('button', { name: 'New Session' }).click();
    await page.getByLabel('Session Title').fill(sessionTitle);
    await page.getByLabel('Date & Time').fill(futureDate(1));

    // Select subject — teacher auto-assigned
    const subjectSelect = page.getByLabel('Subject');
    await subjectSelect.selectOption({ label: 'Early Reading & Phonics' });

    // Session type toggle appears; default is Group
    await expect(page.getByRole('button', { name: '👥 Group' })).toBeVisible({ timeout: 6_000 });

    await page.getByRole('button', { name: 'Create + Generate Zoom Link' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /session created/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(sessionTitle).first()).toBeVisible();
  });

  test('admin sees validation error if no subject selected', async ({ page }) => {
    await page.getByRole('button', { name: 'New Session' }).click();
    await page.getByLabel('Session Title').fill('No subject session');
    await page.getByLabel('Date & Time').fill(futureDate(1));

    // Submit without selecting a subject
    await page.getByRole('button', { name: 'Create + Generate Zoom Link' }).click();

    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Please select a subject' })).toBeVisible({ timeout: 6_000 });
    // Modal remains open
    await expect(page.getByRole('heading', { name: 'New Zoom Session' })).toBeVisible();

    await modalCancel(page).click();
  });
});

// ── Student ────────────────────────────────────────────────────────────────

test.describe('Sessions — Student', () => {
  test.use({ storageState: authFile('student') });

  test('student sees sessions page without create button', async ({ page }) => {
    await openSessionsPage(page);
    // Scope to <main> — TopBar also renders <h1>Sessions</h1>
    await expect(page.locator('main').getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Session' })).not.toBeVisible();
  });
});
