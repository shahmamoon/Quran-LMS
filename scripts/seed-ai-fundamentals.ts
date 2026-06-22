/**
 * seed-ai-fundamentals.ts — Add the "AI Fundamentals" subject + lessons.
 *
 * Idempotent and non-destructive. Safe to run on production.
 *   - Upserts a Subject titled "AI Fundamentals" (matched by title).
 *   - Ensures a single Week/module under it.
 *   - Creates each lesson if it does not already exist (matched by title
 *     within the week), assigning `order` by list position. Existing lessons
 *     keep whatever order an admin has since set — re-running never clobbers
 *     a manual reorder.
 *
 * Run:  npm run db:seed:ai-fundamentals
 *   or via the "📚 Seed AI Fundamentals" GitHub Actions workflow on prod.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SUBJECT_TITLE = 'AI Fundamentals';
const MODULE_TITLE  = 'AI Fundamentals';

const LESSONS = [
  'Introduction to AI/ML',
  'AI/ML Types',
  'Prompt Engineering',
  'Server/Client/API',
  'Database Essentials for Beginners',
  'Personal Assistant (Get Weather, RSS)',
  'Personal Assistant (Gmail, Calendar)',
  'Personal Assistant (RAG)',
  'Integrate Telegram or Whatsapp',
  'Voice Assistant (n8n)',
  'Integrate Chatwidget with Website',
  'AI for Social Media (Instagram/TikTok/YouTube)',
  'Scheduling/Content Posting',
  'Introduce N8n nodes',
  'Project Assignment and Guidance',
  'Project Demo',
  'Voice Agent Part 1',
  'Voice Agent Part 2',
  'Voice Agent Integration n8n',
  'Project Assignment and Guidance (Voice Agent)',
  'Project Demo (Voice Agent)',
  'AI Google Studio Part 1',
  'AI Google Studio Part 2',
];

async function main() {
  console.log('\n📚  Seeding "AI Fundamentals" subject…\n');

  // 1. Subject (match by title so re-runs are idempotent)
  let subject = await prisma.subject.findFirst({ where: { title: SUBJECT_TITLE } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        title: SUBJECT_TITLE,
        description: 'Hands-on AI fundamentals — from core ML concepts to building personal assistants, voice agents, and automations with n8n.',
        grade: 'Upskill',
        color: '#8b5cf6',
        isPublished: true,
      },
    });
    console.log(`   ✓ created subject "${SUBJECT_TITLE}" (${subject.id})`);
  } else {
    console.log(`   • subject "${SUBJECT_TITLE}" already exists (${subject.id})`);
  }

  // 2. Module / Week
  let week = await prisma.week.findFirst({
    where: { subjectId: subject.id, title: MODULE_TITLE },
  });
  if (!week) {
    week = await prisma.week.create({
      data: { subjectId: subject.id, title: MODULE_TITLE, order: 0 },
    });
    console.log(`   ✓ created module "${MODULE_TITLE}" (${week.id})`);
  } else {
    console.log(`   • module "${MODULE_TITLE}" already exists (${week.id})`);
  }

  // 3. Lessons — create any that are missing, preserve order of existing ones
  const existing = await prisma.lesson.findMany({
    where: { weekId: week.id },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((l) => l.title));

  let created = 0;
  for (let i = 0; i < LESSONS.length; i++) {
    const title = LESSONS[i];
    if (existingTitles.has(title)) {
      console.log(`     • skip (exists): ${title}`);
      continue;
    }
    await prisma.lesson.create({
      data: { weekId: week.id, title, order: i },
    });
    created++;
    console.log(`     ✓ added [${i}]: ${title}`);
  }

  console.log(`\n✅  Done. ${created} new lesson(s) added; ${existing.length} already present.`);
  console.log('   Reorder them anytime from the subject page (Move up / down).\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
