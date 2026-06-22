/**
 * reset-prod.ts — Production database reset
 *
 * Wipes ALL data and creates a single admin account.
 * Run via the "🔄 Reset Production Database" GitHub Actions workflow.
 *
 * ⚠️  DESTRUCTIVE — never run against a database with real data you want to keep.
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log('🗑️  Wiping all existing data…');
  await prisma.quizSubmission.deleteMany({});
  await prisma.quizAssignment.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.lessonProgress.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.week.deleteMany({});
  await prisma.studentSubject.deleteMany({});
  await prisma.subjectTeacher.deleteMany({});
  await prisma.groupSubject.deleteMany({});
  await prisma.sessionAttendance.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.userSetting.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});
  console.log('   ✓ Database wiped clean');
}

async function createAdminAccount() {
  console.log('👤  Creating admin account…');
  const hash = await bcrypt.hash('pass@word786', 10);
  const admin = await prisma.user.create({
    data: {
      email:        'muddsar@quranacademy.com',
      passwordHash: hash,
      firstName:    'Muddsar',
      lastName:     'Admin',
      role:         Role.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`   ✓ Admin created: ${admin.email}`);
  return admin;
}

async function main() {
  console.log('\n🔄  Production database reset starting…\n');
  await wipeDatabase();
  await createAdminAccount();
  console.log('\n✅  Reset complete!');
  console.log('   Login: muddsar@quranacademy.com / pass@word786\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
