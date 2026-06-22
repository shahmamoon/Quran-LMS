import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Wiping database…');
  await prisma.payment.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.blogTopic.deleteMany({});
  await prisma.post.deleteMany({});
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
  console.log('   ✓ Done');

  const adminHash   = await bcrypt.hash('Admin@123!',   10);
  const teacherHash = await bcrypt.hash('Teacher@123!', 10);
  const studentHash = await bcrypt.hash('Student@123!', 10);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@quranacademy.com',
        passwordHash: adminHash,
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
        emailVerified: true,
      },
      {
        email: 'teacher@quranacademy.com',
        passwordHash: teacherHash,
        firstName: 'Teacher',
        lastName: 'User',
        role: Role.TEACHER,
        emailVerified: true,
      },
      {
        email: 'student@quranacademy.com',
        passwordHash: studentHash,
        firstName: 'Student',
        lastName: 'User',
        role: Role.STUDENT,
        emailVerified: true,
      },
    ],
  });

  console.log('✅  Created 3 accounts:');
  console.log('   admin@quranacademy.com    — Admin@123!');
  console.log('   teacher@quranacademy.com  — Teacher@123!');
  console.log('   student@quranacademy.com  — Student@123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
