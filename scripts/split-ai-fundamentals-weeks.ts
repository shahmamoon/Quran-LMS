/**
 * split-ai-fundamentals-weeks.ts — Reorganise "AI Fundamentals" into 12 weeks.
 *
 * Reads the CURRENT lesson order live from the database (so any manual
 * reordering an admin has done is preserved), then distributes the lessons
 * into 12 weeks of 2 lessons each. With 23 lessons, weeks 1–11 get 2 lessons
 * and week 12 gets the final 1.
 *
 * Safe to run once. If the subject already has more than one week it assumes
 * the split was already done and exits without changes.
 *
 * Run:  npm run db:split:ai-fundamentals
 *   or via the "🗂️ Split AI Fundamentals into Weeks" GitHub Actions workflow.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SUBJECT_TITLE = 'AI Fundamentals';
const PER_WEEK = 2;

async function main() {
  console.log('\n🗂️   Splitting "AI Fundamentals" into weeks…\n');

  const subject = await prisma.subject.findFirst({ where: { title: SUBJECT_TITLE } });
  if (!subject) {
    console.error(`   ✗ Subject "${SUBJECT_TITLE}" not found. Nothing to do.`);
    return;
  }

  const weeks = await prisma.week.findMany({
    where: { subjectId: subject.id },
    orderBy: { order: 'asc' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  });

  if (weeks.length > 1) {
    console.log(`   • Subject already has ${weeks.length} weeks — assuming already split. No changes made.`);
    return;
  }
  if (weeks.length === 0) {
    console.error('   ✗ Subject has no week/lessons. Nothing to do.');
    return;
  }

  // All lessons in their CURRENT live order (preserves manual reordering).
  const sourceWeek = weeks[0];
  const lessons = sourceWeek.lessons; // already ordered by `order` asc
  console.log(`   • Found ${lessons.length} lessons in current order:`);
  lessons.forEach((l, i) => console.log(`       ${String(i + 1).padStart(2)}. ${l.title}`));

  // Build buckets of PER_WEEK lessons each.
  const buckets: { id: string }[][] = [];
  for (let i = 0; i < lessons.length; i += PER_WEEK) {
    buckets.push(lessons.slice(i, i + PER_WEEK).map((l) => ({ id: l.id })));
  }
  console.log(`\n   • Will create ${buckets.length} weeks (` +
    `${buckets.filter((b) => b.length === PER_WEEK).length} full, ` +
    `${buckets.filter((b) => b.length < PER_WEEK).length} partial).`);

  await prisma.$transaction(async (tx) => {
    // 1. Park every lesson at a unique negative order so neither the
    //    [weekId, order] nor any later reassignment collides while we work.
    for (let i = 0; i < lessons.length; i++) {
      await tx.lesson.update({ where: { id: lessons[i].id }, data: { order: -(i + 1) } });
    }

    // 2. Rename the existing week → "Week 1" (keep its order = 0 to avoid the
    //    Week @@unique([subjectId, order]) collision), and create Weeks 2..N.
    await tx.week.update({ where: { id: sourceWeek.id }, data: { title: 'Week 1', order: 0 } });

    const weekIds: string[] = [sourceWeek.id];
    for (let w = 1; w < buckets.length; w++) {
      const created = await tx.week.create({
        data: { subjectId: subject.id, title: `Week ${w + 1}`, order: w },
      });
      weekIds.push(created.id);
    }

    // 3. Assign each bucket's lessons to its week with order 0..PER_WEEK-1.
    for (let w = 0; w < buckets.length; w++) {
      const bucket = buckets[w];
      for (let i = 0; i < bucket.length; i++) {
        await tx.lesson.update({
          where: { id: bucket[i].id },
          data: { weekId: weekIds[w], order: i },
        });
      }
    }
  });

  console.log(`\n✅  Done. "AI Fundamentals" now has ${buckets.length} weeks.`);
  console.log('   Reorder lessons within any week from the subject page (Move up / down).\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
