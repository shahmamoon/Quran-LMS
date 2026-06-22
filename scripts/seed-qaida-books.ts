/**
 * Idempotent seed — upserts the QaidaBook registry.
 * Safe to re-run any number of times. Does NOT wipe any data.
 *
 * Usage:
 *   npx tsx scripts/seed-qaida-books.ts
 *   (or via package.json: pnpm db:seed:qaida-books)
 *
 * Add a new book entry here when a new Qaida / Islamic reader is introduced.
 * The imageFolder must match the actual folder under the project root
 * (e.g.  NooraniQaida/  →  served at  /qaida-pages/NooraniQaida/001.png).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOOKS = [
  {
    slug:        'noorani-qaida',
    title:       'Noorani Qaida',
    description: 'Foundational Arabic reading book used to teach Quran recitation to beginners.',
    totalPages:  32,
    imageFolder: 'NooraniQaida',
    order:       1,
  },
  // Future books — uncomment and adjust totalPages / imageFolder when ready:
  // {
  //   slug:        'madani-qaida',
  //   title:       'Madani Qaida',
  //   description: 'Madani Qaida for advanced Tajweed learners.',
  //   totalPages:  64,
  //   imageFolder: 'MadaniQaida',
  //   order:       2,
  // },
  // {
  //   slug:        'qaida-baghdadi',
  //   title:       'Qaida Baghdadi',
  //   description: 'Classical Baghdadi Qaida.',
  //   totalPages:  48,
  //   imageFolder: 'BaghdadiQaida',
  //   order:       3,
  // },
  // {
  //   slug:        'tajweed-book',
  //   title:       'Tajweed Book',
  //   description: 'Dedicated Tajweed rule reference.',
  //   totalPages:  120,
  //   imageFolder: 'TajweedBook',
  //   order:       4,
  // },
  // {
  //   slug:        'hifz-manual',
  //   title:       'Hifz Manual',
  //   description: 'Memorisation manual for Quran Hifz students.',
  //   totalPages:  200,
  //   imageFolder: 'HifzManual',
  //   order:       5,
  // },
];

async function main() {
  console.log('Seeding QaidaBook registry…');

  for (const book of BOOKS) {
    const result = await prisma.qaidaBook.upsert({
      where:  { slug: book.slug },
      create: { ...book, isActive: true },
      update: {
        title:       book.title,
        description: book.description,
        totalPages:  book.totalPages,
        imageFolder: book.imageFolder,
        order:       book.order,
        isActive:    true,
      },
    });
    console.log(`  ✓ ${result.slug} (id: ${result.id}, ${result.totalPages} pages)`);
  }

  console.log(`Done — ${BOOKS.length} book(s) upserted.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
