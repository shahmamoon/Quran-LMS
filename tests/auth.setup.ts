import { test as setup, expect } from '@playwright/test';
import { login } from './helpers/actions';
import { ADMIN, TEACHER, STUDENT } from './helpers/credentials';
import { authFile } from './helpers/paths';

setup('save admin auth state', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/lms\/dashboard/);
  await page.context().storageState({ path: authFile('admin') });
});

setup('save teacher auth state', async ({ page }) => {
  await login(page, TEACHER.email, TEACHER.password);
  await expect(page).toHaveURL(/lms\/dashboard/);
  await page.context().storageState({ path: authFile('teacher') });
});

setup('save student auth state', async ({ page }) => {
  await login(page, STUDENT.email, STUDENT.password);
  await expect(page).toHaveURL(/lms\/dashboard/);
  await page.context().storageState({ path: authFile('student') });
});
