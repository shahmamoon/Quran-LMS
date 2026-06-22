/**
 * diagnose-ai-fundamentals.ts — READ-ONLY. Dumps every subject whose title
 * contains "fundamental" plus its weeks and lesson counts, so we can see the
 * exact production structure. Makes no changes.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    where: { title: { contains: 'undamental' } },
    include: {
      weeks: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } } },
      },
      _count: { select: { weeks: true } },
    },
  });

  console.log(`\n🔎  Found ${subjects.length} subject(s) matching "*undamental*":\n`);
  for (const s of subjects) {
    console.log(`SUBJECT  id=${s.id}`);
    console.log(`  title:       "${s.title}"`);
    console.log(`  isPublished: ${s.isPublished}`);
    console.log(`  grade:       ${s.grade}`);
    console.log(`  weeks:       ${s.weeks.length}`);
    for (const w of s.weeks) {
      console.log(`    └ WEEK order=${w.order} "${w.title}" — ${w.lessons.length} lesson(s)`);
      for (const l of w.lessons) {
        console.log(`        · [${l.order}] ${l.title}`);
      }
    }
    console.log('');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
