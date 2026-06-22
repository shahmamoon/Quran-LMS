/**
 * seed-students.ts — Create a fixed set of STUDENT accounts.
 *
 * Idempotent and non-destructive. Safe to run on production.
 *   - Upserts each user by email (the @unique key).
 *   - Existing users keep their current passwordHash / name / role —
 *     re-running never clobbers an account or resets a password.
 *   - New users get role STUDENT, grade "Upskill", isActive true, and a
 *     bcrypt hash of the default password below.
 *
 * Run:  npm run db:seed:students
 *   or via the "👥 Seed Students" GitHub Actions workflow on prod.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '123456';

const STUDENTS = [
  { email: 'urooj31205@gmail.com',         firstName: 'Urooj',   lastName: 'Student' },
  { email: 'fatimamuddsar786@gmail.com',   firstName: 'Fatima',  lastName: 'Muddsar' },
  { email: 'rana.madi110@gmail.com',       firstName: 'Rana',    lastName: 'Madi' },
  { email: 'awais.muddsar@icloud.com',     firstName: 'Awais',   lastName: 'Muddsar' },
  { email: 'mahnooraliyaseen88@gmail.com', firstName: 'Mahnoor', lastName: 'Ali Yaseen' },
];

async function main() {
  console.log('\n👥  Seeding student accounts…\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  for (const s of STUDENTS) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) {
      console.log(`   • skip (exists): ${s.email} [role=${existing.role}]`);
      continue;
    }
    const u = await prisma.user.create({
      data: {
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        role: 'STUDENT',
        grade: 'Upskill',
        passwordHash,
      },
    });
    created++;
    console.log(`   ✓ created: ${s.email} (${u.id})`);
  }

  console.log(`\n✅  Done. ${created} new student(s); ${STUDENTS.length - created} already present.`);
  console.log(`   Default password for new accounts: ${DEFAULT_PASSWORD}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
