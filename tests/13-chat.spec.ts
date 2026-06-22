/**
 * 13-chat.spec.ts
 *
 * Tests for the Chat page — covers conversation list, new conversation modal
 * (student picker + group picker), and basic message sending.
 */
import { test, expect } from '@playwright/test';
import { authFile } from './helpers/paths';

// ── Teacher ────────────────────────────────────────────────────────────────

test.describe('Chat — Teacher', () => {
  test.use({ storageState: authFile('teacher') });

  test.beforeEach(async ({ page }) => {
    const convLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/chat/conversations') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/chat');
    await convLoaded;
    await page.waitForLoadState('networkidle');
  });

  test('chat page loads with Messages sidebar', async ({ page }) => {
    await expect(page.getByText('Messages')).toBeVisible();
    // "Select a conversation" placeholder visible when no conversation is active
    await expect(page.getByText('Select a conversation')).toBeVisible();
  });

  test('+ button opens New Conversation modal for staff', async ({ page }) => {
    // The + button should be visible for teacher (staff)
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });
  });

  test('New Conversation modal shows Student and Group tabs', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });

    // Two toggle buttons: Student and Group — use exact match to avoid collision
    // with student list buttons whose accessible name contains "student@email"
    await expect(page.getByRole('button', { name: 'Student', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Group', exact: true })).toBeVisible();
  });

  test('student picker lists assigned students', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });

    // Default tab is "Student" — wait for the student list to populate
    await expect(page.getByText('Select Student')).toBeVisible();
    // Jamie Learner is assigned to Alex Mentor (teacher)
    // Use first() — name may also appear in the conversation sidebar if a chat already exists
    await expect(page.getByText('Jamie Learner').first()).toBeVisible({ timeout: 8_000 });
  });

  test('switching to Group tab shows group picker', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });

    // Click Group tab
    await page.getByRole('button', { name: /Group/i }).click();
    await expect(page.getByText('Select Group')).toBeVisible({ timeout: 6_000 });
  });

  test('Start Chat button is disabled until a student is selected', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });

    const startBtn = page.getByRole('button', { name: 'Start Chat' });
    await expect(startBtn).toBeDisabled();

    // Scope to the modal (.max-w-lg) — "Jamie Learner" may also appear in the sidebar
    // conversation list, which is behind the modal backdrop and not clickable.
    const modal = page.locator('.max-w-lg');
    await expect(modal.getByText('Jamie Learner')).toBeVisible({ timeout: 8_000 });
    await modal.getByText('Jamie Learner').click();

    await expect(startBtn).toBeEnabled();
  });

  test('can start a conversation with a student', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });

    // Scope to the modal (.max-w-lg) — "Jamie Learner" may also appear in the sidebar
    // conversation list, which is behind the modal backdrop and not clickable.
    const modal = page.locator('.max-w-lg');
    await expect(modal.getByText('Jamie Learner')).toBeVisible({ timeout: 8_000 });
    await modal.getByText('Jamie Learner').click();

    await page.getByRole('button', { name: 'Start Chat' }).click();

    // Modal should close; conversation with Jamie should become active
    await expect(page.getByRole('heading', { name: 'New Conversation' })).not.toBeVisible({ timeout: 8_000 });
    // Chat header should show Jamie's name
    await expect(page.getByText('Jamie Learner').first()).toBeVisible({ timeout: 8_000 });
    // Message input should be visible
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
  });

  test('can send a message in an active conversation', async ({ page }) => {
    // First ensure there is at least one conversation (re-use or create)
    const convList = page.locator('ul li button');
    const count = await convList.count();

    if (count > 0) {
      await convList.first().click();
      await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 6_000 });

      const msg = `Test message ${Date.now()}`;
      await page.getByPlaceholder('Type a message...').fill(msg);
      await page.getByRole('button', { name: 'Send' }).click();

      // Message appears in both conversation list preview and message body — use first()
      await expect(page.getByText(msg).first()).toBeVisible({ timeout: 6_000 });
    } else {
      // No conversations — skip gracefully
      test.skip();
    }
  });

  test('close New Conversation modal with Cancel', async ({ page }) => {
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).not.toBeVisible();
  });
});

// ── Admin ──────────────────────────────────────────────────────────────────

test.describe('Chat — Admin', () => {
  test.use({ storageState: authFile('admin') });

  test('admin sees + button and can open New Conversation modal', async ({ page }) => {
    const convLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/chat/conversations') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/chat');
    await convLoaded;
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button[title="New conversation"]')).toBeVisible();
    await page.locator('button[title="New conversation"]').click();
    await expect(page.getByRole('heading', { name: 'New Conversation' })).toBeVisible({ timeout: 6_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

// ── Student ────────────────────────────────────────────────────────────────

test.describe('Chat — Student', () => {
  test.use({ storageState: authFile('student') });

  test('student sees chat page but no + button', async ({ page }) => {
    const convLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/chat/conversations') && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto('/lms/chat');
    await convLoaded;
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Messages')).toBeVisible();
    // Students cannot start conversations — + button should not be visible
    await expect(page.locator('button[title="New conversation"]')).not.toBeVisible();
  });
});
