/**
 * Idempotent seed: ensure the 2 remaining core Quran Academy courses exist.
 * - Prayers                → placeholder, ready for content
 * - General Islamic Education → placeholder, ready for content
 *
 * NOTE: Noorani Qaida (English/Urdu) and Quran with Tajweed have been removed
 * from this seed so they are not recreated after manual deletion.
 *
 * Safe to re-run — uses upsert on stable IDs.
 */

import { PrismaClient, CourseType } from '@prisma/client';

const prisma = new PrismaClient();

const COURSES = [
  {
    id:          'daily-prayers',
    title:       'Prayers',
    description: 'Learn the five daily prayers (Salah) and additional prayers of Islam. Covers proper recitation of each prayer, the rules of Wudu and Ghusl, Salat timings, and the etiquettes of worship. Also includes Jummah, Eid, Janazah, Taraweeh, and voluntary prayers.',
    color:       '#7c3aed',   // violet
    courseType:  CourseType.ISLAMIC_LEARNING,
    isPublished: true,
  },
  {
    id:          'general-islamic-education',
    title:       'General Islamic Education',
    description: 'A comprehensive introduction to Islamic beliefs and practice. Topics include the Six Pillars of Iman, Five Pillars of Islam, the Six Kalmas, selected Hadith, Duas and supplications, Islamic history, and answers to common questions about the faith.',
    color:       '#d97706',   // amber
    courseType:  CourseType.ISLAMIC_LEARNING,
    isPublished: true,
  },
];

async function main() {
  console.log('Seeding core courses…');

  for (const course of COURSES) {
    const result = await prisma.subject.upsert({
      where:  { id: course.id },
      create: { ...course, grade: null },
      update: {
        title:       course.title,
        description: course.description,
        color:       course.color,
        courseType:  course.courseType,
        isPublished: course.isPublished,
      },
    });
    console.log(`  ${result.isPublished ? '✓' : '○'} ${result.title} (${result.id})`);
  }

  console.log('\nDone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
