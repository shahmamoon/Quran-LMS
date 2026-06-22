-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- AlterTable: add status, completedAt, enrolledById to StudentSubject
ALTER TABLE "StudentSubject"
    ADD COLUMN "status"       "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "completedAt"  TIMESTAMP(3),
    ADD COLUMN "enrolledById" TEXT;

-- Index on enrolledById
CREATE INDEX "StudentSubject_enrolledById_idx" ON "StudentSubject"("enrolledById");

-- FK for enrolledById → User
ALTER TABLE "StudentSubject"
    ADD CONSTRAINT "StudentSubject_enrolledById_fkey"
        FOREIGN KEY ("enrolledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
