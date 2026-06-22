/**
 * scripts/cleanup-playwright-data.ts
 *
 * Removes data created by Playwright E2E tests without touching seed data.
 * Run with:  npx tsx scripts/cleanup-playwright-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up Playwright test data…\n');

  // ── 1. Users ───────────────────────────────────────────────────────────────
  // Created by 03-admin-users.spec.ts:
  //   firstName="Test", lastName="Playwright", email like test.playwright.%@test.com
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: 'test.playwright.' } },
  });
  console.log(`✓ Users deleted:        ${deletedUsers.count}`);

  // ── 2. Subjects ────────────────────────────────────────────────────────────
  // Created by 04-subjects.spec.ts:  title = "Playwright Subject <timestamp>"
  // Cascade: SubjectTeacher, StudentSubject, Week → Lesson → LessonProgress,
  //          Quiz → QuizAssignment, QuizSubmission
  const deletedSubjects = await prisma.subject.deleteMany({
    where: { title: { startsWith: 'Playwright Subject' } },
  });
  console.log(`✓ Subjects deleted:     ${deletedSubjects.count}`);

  // ── 3. Sessions ────────────────────────────────────────────────────────────
  // Created by 06-sessions.spec.ts:
  //   "Playwright Session <ts>", "1-on-1 Session <ts>",
  //   "Delete-me <ts>",          "Admin Group Session <ts>"
  const sessionWhere = {
    OR: [
      { title: { startsWith: 'Playwright Session' } },
      { title: { startsWith: '1-on-1 Session' } },
      { title: { startsWith: 'Delete-me' } },
      { title: { startsWith: 'Admin Group Session' } },
    ],
  };
  // SessionAttendance has no cascade → delete children first
  const testSessionIds = (
    await prisma.session.findMany({ where: sessionWhere, select: { id: true } })
  ).map((s) => s.id);

  if (testSessionIds.length > 0) {
    await prisma.sessionAttendance.deleteMany({
      where: { sessionId: { in: testSessionIds } },
    });
  }

  const deletedSessions = await prisma.session.deleteMany({ where: sessionWhere });
  console.log(`✓ Sessions deleted:     ${deletedSessions.count}`);

  // ── 4. Groups ──────────────────────────────────────────────────────────────
  // Created by 07-groups.spec.ts:  name = "E2E Group <timestamp>"
  const deletedGroups = await prisma.group.deleteMany({
    where: { name: { startsWith: 'E2E Group' } },
  });
  console.log(`✓ Groups deleted:       ${deletedGroups.count}`);

  // ── 5. Weeks & Lessons added to seed subjects ──────────────────────────────
  // Created by 05-curriculum.spec.ts:
  //   week  title = "Week E2E <ts>: Playwright"
  //   lesson title = "E2E Lesson <ts>"
  const deletedWeeks = await prisma.week.deleteMany({
    where: { title: { startsWith: 'Week E2E' } },
  });
  console.log(`✓ Weeks deleted:        ${deletedWeeks.count}`);

  const deletedLessons = await prisma.lesson.deleteMany({
    where: { title: { startsWith: 'E2E Lesson' } },
  });
  console.log(`✓ Lessons deleted:      ${deletedLessons.count}`);

  // ── 6. 1-on-1 conversations ────────────────────────────────────────────────
  // Created by 13-chat.spec.ts; seed only creates group conversations (groupId set).
  // Safe to delete all conversations with no groupId.
  const testConvIds = (
    await prisma.conversation.findMany({ where: { groupId: null }, select: { id: true } })
  ).map((c) => c.id);

  if (testConvIds.length > 0) {
    await prisma.message.deleteMany({ where: { conversationId: { in: testConvIds } } });
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: { in: testConvIds } },
    });
  }

  const deletedConvs = await prisma.conversation.deleteMany({ where: { groupId: null } });
  console.log(`✓ Conversations deleted: ${deletedConvs.count}`);

  console.log('\n✅ Done. Seed data is untouched.');
}

main()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
