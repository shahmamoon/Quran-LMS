-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('NOORANI_QAIDA', 'QURAN_LEARNING', 'ISLAMIC_LEARNING');

-- AlterTable: add nullable courseType column to Subject
ALTER TABLE "Subject" ADD COLUMN "courseType" "CourseType";

-- Backfill known core course IDs to their correct type
UPDATE "Subject" SET "courseType" = 'NOORANI_QAIDA'    WHERE id IN ('noorani-qaida-english', 'noorani-qaida-urdu', 'noorani-qaida');
UPDATE "Subject" SET "courseType" = 'QURAN_LEARNING'   WHERE id = 'quran-with-tajweed';
UPDATE "Subject" SET "courseType" = 'ISLAMIC_LEARNING' WHERE id IN ('daily-prayers', 'general-islamic-education');
