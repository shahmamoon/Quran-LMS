import { PrismaClient, Role, SessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const NOW = Date.now();
const DAY = 86_400_000;

// ─── WIPE ─────────────────────────────────────────────────────────────────────

async function wipeDatabase() {
  console.log('🗑️  Wiping all existing data…');
  // Recitation tables first — PageAttempt/RecitationSession have ON DELETE RESTRICT
  // FKs on User, so they must be cleared before user.deleteMany() or wipe fails with P2003.
  // QuranPage and TajweedRule are reference data — intentionally NOT wiped here.
  await prisma.pageError.deleteMany({});
  await prisma.pageAttempt.deleteMany({});
  await prisma.recitationSession.deleteMany({});
  // Payments — Payment.studentId is ON DELETE RESTRICT, same reason.
  await prisma.payment.deleteMany({});
  await prisma.plan.deleteMany({});
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
  console.log('   ✓ Database wiped clean');
}

// ─── SUBJECTS ────────────────────────────────────────────────────────────────
// Core Quran courses only — created via seed-core-courses.ts (idempotent upsert)
// The old generic grade-level subjects have been removed.

const ALL_SUBJECTS = [
  { id: 'noorani-qaida-english', grade: null, title: 'Noorani Qaida (English)', description: 'Foundation Arabic reading with English-medium pages: alphabet, vowels, Tajweed basics.', color: '#059669' },
  { id: 'noorani-qaida-urdu',    grade: null, title: 'Noorani Qaida (Urdu)',    description: 'Foundation Arabic reading with Urdu-medium pages: alphabet, vowels, Tajweed basics.',    color: '#0d9488' },
  { id: 'quran-with-tajweed',    grade: null, title: 'Quran with Tajweed',      description: 'Track student progress page-by-page across all 604 pages of the Madani Mushaf.',      color: '#0e91e9' },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database…\n');
  await wipeDatabase();

  // ── Settings ──────────────────────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      { key: 'site_name',                 value: 'Quran Academy', isPublic: true },
      { key: 'allow_self_registration',   value: 'false',            isPublic: false },
      { key: 'notifications_enabled',     value: 'true',             isPublic: false },
      { key: 'meeting_provider',          value: 'zoom',             isPublic: true },
      { key: 'recording_upload_enabled',  value: 'false',            isPublic: true },
    ],
  });

  // ── Hashes ────────────────────────────────────────────────────────────────
  const adminHash   = await bcrypt.hash('Admin@123!',   10);
  const teacherHash = await bcrypt.hash('Teacher@123!', 10);
  const studentHash = await bcrypt.hash('Student@123!', 10);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@quranacademy.com', passwordHash: adminHash,
      firstName: 'Admin', lastName: 'User', role: Role.ADMIN,
      phone: '+60 11-9999 0000', emailVerified: true,
    },
  });

  // ── Blog posts (cornerstone SEO/GEO articles) ─────────────────────────────
  console.log('📰 Creating blog posts…');
  await prisma.post.create({
    data: {
      slug: 'what-age-should-kids-learn-ai',
      title: 'What Age Should Kids Learn AI? A Parent’s Honest Guide',
      excerpt: 'Most kids can start exploring AI concepts around age 8, and build real AI projects by 11–12. Here’s what’s age-appropriate at every stage — and how to start safely.',
      metaDescription: 'A clear, parent-friendly guide to the right age for kids to learn AI — what’s appropriate from ages 5 to 17, and how to begin safely with 1:1 mentorship.',
      keywords: 'what age should kids learn ai, ai for kids, teach ai to kids, ai for 10 year old, is ai safe for kids',
      tags: ['ai-for-kids', 'parents', 'getting-started'],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
      content: `There is no single "right" age to start — but there *is* a right **approach** for each age. The short answer: most children can begin exploring AI ideas through play around **age 8**, and start building real AI projects (chatbots, simple apps) around **ages 11–12**, once they can reason about cause and effect.

## Ages 5–7: AI as magic and play
At this stage, skip the coding. Kids learn best through AI-enhanced *play* — talking to a voice assistant, watching an image classifier guess drawings, or training a "teachable machine" to recognize objects. The goal is wonder, not syntax.

## Ages 8–10: How does it actually work?
Children begin to grasp that AI learns from examples. Block-based tools (Scratch with AI extensions, Teachable Machine) let them *train* a model and see how data shapes its answers. This is the ideal age to plant the idea that AI is built by people — and can be wrong.

## Ages 11–13: Building real things
Once kids understand instructions and logic, they can build their first **chatbot** or simple AI app. This is where 1:1 mentorship shines: a mentor matches the project to your child’s interests (games, art, sports) so motivation stays high.

## Ages 14–17: Python, APIs, and shipping projects
Teens can move into text-based code, call real AI APIs, and ship genuine projects — a portfolio that stands out for high school and beyond.

## The most important factor isn’t age — it’s guidance
Research is consistent: AI helps young learners most when it **supports their thinking rather than replacing it**. A good mentor keeps your child *building and questioning*, not just consuming.

> Curious where your child fits? A free assessment call maps out a personalized starting point.`,
      faqs: [
        { q: 'Is my 10-year-old too young to learn AI?', a: 'Not at all. Ten is a great age to start with hands-on, block-based tools and simple model training. Text coding can come a year or two later.' },
        { q: 'Is AI safe for kids?', a: 'AI is safe when kids are guided and boundaries are set — much like the internet. The best protection is education with an involved adult or mentor, not avoidance.' },
        { q: 'Does my child need to know how to code first?', a: 'No. Younger kids start with visual, no-code tools. Coding is introduced gradually as they’re ready.' },
      ],
    },
  });

  await prisma.post.create({
    data: {
      slug: '1-on-1-vs-group-ai-classes-for-kids',
      title: '1:1 AI Mentorship vs. Group AI Classes: Which Is Right for Your Child?',
      excerpt: 'Group AI camps are affordable and social; 1:1 mentorship is personalized and project-driven. Here’s an honest comparison to help you choose.',
      metaDescription: 'An honest comparison of 1:1 AI mentorship versus group AI classes for kids and teens — cost, pace, projects, and which fits your child best.',
      keywords: '1:1 ai mentorship for kids, private ai tutor for kids, ai classes for kids, group vs private ai class',
      tags: ['ai-for-kids', 'mentorship', 'parents'],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
      content: `Both formats can teach a child AI — but they optimize for very different things. Here’s how to decide.

## Group AI classes & camps
**Best for:** social learning, exposure, and budget.
- Lower cost per session
- Kids learn alongside peers
- Fixed curriculum and pace

The trade-off: a set pace means some kids are bored while others fall behind, and projects are one-size-fits-all.

## 1:1 AI mentorship
**Best for:** depth, motivation, and a real finished project.
- The pace and topics flex to *your* child
- Projects are built around their interests — a game, a chatbot, an app
- A mentor relationship that builds confidence over time

The trade-off: it costs more per hour than a large group class — but kids typically progress faster and actually *ship* something.

## How to choose
Pick **group** if your goal is low-cost exposure and your child thrives socially. Pick **1:1** if you want your child to build something real, move at their own pace, or they’ve found group classes too slow or too fast.

> At Quran Academy, every student works 1:1 toward a real, shipped project — an app, a chatbot, even their first iPhone app.`,
      faqs: [
        { q: 'Is 1:1 AI mentorship worth the higher cost?', a: 'For most families seeking real progress and a finished project, yes — personalized pacing and project choice usually mean faster learning and higher motivation than a fixed group class.' },
        { q: 'What can my child actually build in 1:1 mentorship?', a: 'Depending on age and interest: chatbots, simple games, AI-powered web apps, and even a first iPhone app — chosen around what excites your child.' },
      ],
    },
  });

  // ── Teachers (5) ─────────────────────────────────────────────────────────
  const teacherRows = await Promise.all([
    prisma.user.create({ data: { email: 'teacher@quranacademy.com',  passwordHash: teacherHash, firstName: 'Alex',   lastName: 'Mentor',  role: Role.TEACHER, bio: 'Early childhood and primary educator with 12+ years in the classroom.', phone: '+60 11-1234 5678', emailVerified: true } }),
    prisma.user.create({ data: { email: 'teacher2@quranacademy.com', passwordHash: teacherHash, firstName: 'Sarah',  lastName: 'Wilson',  role: Role.TEACHER, bio: 'Middle school STEM specialist passionate about inquiry-based learning.', phone: '+60 11-2345 6789', emailVerified: true } }),
    prisma.user.create({ data: { email: 'teacher3@quranacademy.com', passwordHash: teacherHash, firstName: 'James',  lastName: 'Chen',    role: Role.TEACHER, bio: 'High school science and mathematics teacher and curriculum designer.', phone: '+60 11-3456 7890', emailVerified: true } }),
    prisma.user.create({ data: { email: 'teacher4@quranacademy.com', passwordHash: teacherHash, firstName: 'Maya',   lastName: 'Patel',   role: Role.TEACHER, bio: 'Senior secondary educator specialising in advanced sciences and university prep.', phone: '+60 11-4567 8901', emailVerified: true } }),
    prisma.user.create({ data: { email: 'teacher5@quranacademy.com', passwordHash: teacherHash, firstName: 'David',  lastName: 'Smith',   role: Role.TEACHER, bio: 'Technology and AI educator with 10+ years in industry before teaching.', phone: '+60 11-5678 9012', emailVerified: true } }),
  ]);
  const [t1, t2, t3, t4, t5] = teacherRows;

  // ── Students (2) ─────────────────────────────────────────────────────────
  const studentRows = await Promise.all([
    prisma.user.create({ data: { email: 'student@quranacademy.com',  passwordHash: studentHash, firstName: 'Ahmed', lastName: 'Ali',  role: Role.STUDENT, emailVerified: true } }),
    prisma.user.create({ data: { email: 'student2@quranacademy.com', passwordHash: studentHash, firstName: 'Sara',  lastName: 'Khan', role: Role.STUDENT, emailVerified: true } }),
  ]);
  const [st1, st2] = studentRows;

  // ── Subjects (2 core Quran courses) ──────────────────────────────────────
  console.log('📚 Creating 2 core subjects…');
  await prisma.subject.createMany({
    data: ALL_SUBJECTS.map(s => ({ ...s, isPublished: true })),
    skipDuplicates: true,
  });

  // Assign all teachers to both subjects
  await prisma.subjectTeacher.createMany({
    data: [t1, t2, t3, t4, t5].flatMap(t =>
      ALL_SUBJECTS.map(s => ({ subjectId: s.id, teacherId: t.id }))
    ),
    skipDuplicates: true,
  });

  // ── Enrollments ──────────────────────────────────────────────────────────
  await prisma.studentSubject.createMany({
    data: [
      { userId: st1.id, subjectId: 'quran-with-tajweed', teacherId: t1.id },
      { userId: st2.id, subjectId: 'noorani-qaida-english', teacherId: t1.id },
    ],
  });

  // ── Sessions (sample) ────────────────────────────────────────────────────
  await prisma.session.createMany({
    data: [
      { title: 'Quran Recitation — Week 1',   hostId: t1.id, subjectId: 'quran-with-tajweed', scheduledAt: new Date(NOW + 3 * DAY), durationMinutes: 60, status: SessionStatus.SCHEDULED },
      { title: 'Noorani Qaida — Intro Class', hostId: t1.id, subjectId: 'noorani-qaida-english', scheduledAt: new Date(NOW + 5 * DAY), durationMinutes: 45, status: SessionStatus.SCHEDULED },
    ],
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('  Admin:    admin@quranacademy.com   / Admin@123!');
  console.log('  Teachers (Teacher@123!): teacher@quranacademy.com … teacher5@quranacademy.com');
  console.log('  Students (Student@123!):');
  console.log('    student@quranacademy.com  — Ahmed Ali  → Quran with Tajweed');
  console.log('    student2@quranacademy.com — Sara Khan  → Noorani Qaida (English)');
  console.log('\n  Run pnpm db:seed:noorani-qaida to add Noorani Qaida English + Urdu lessons');
  console.log('  Login: http://localhost:3000/lms/login\n');

  // Seed Quran reference data (idempotent upserts — QuranPage + TajweedRule)
  // Must run after wipe since the tables are not wiped above.
  const { main: seedQuran } = await import('../scripts/seed-quran-data.js');
  await seedQuran();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
