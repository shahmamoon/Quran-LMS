-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('NOT_STARTED', 'EXCELLENT', 'COMPLETED', 'REVISION', 'WEAK');

-- CreateTable QuranStudentProgress
CREATE TABLE "QuranStudentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lastTeacherId" TEXT,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "currentSurah" INTEGER,
    "currentAyah" INTEGER,
    "currentJuz" INTEGER,
    "lessonStatus" "LessonStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "teacherNotes" TEXT,
    "nextLessonPage" INTEGER,
    "nextLessonAyah" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuranStudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuranBookmark
CREATE TABLE "QuranBookmark" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "surahNumber" INTEGER,
    "ayahNumber" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuranBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuranStudentProgress_studentId_key" ON "QuranStudentProgress"("studentId");
CREATE INDEX "QuranStudentProgress_studentId_idx" ON "QuranStudentProgress"("studentId");
CREATE INDEX "QuranBookmark_teacherId_studentId_idx" ON "QuranBookmark"("teacherId", "studentId");
CREATE INDEX "QuranBookmark_studentId_idx" ON "QuranBookmark"("studentId");

-- AddForeignKey
ALTER TABLE "QuranStudentProgress" ADD CONSTRAINT "QuranStudentProgress_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuranStudentProgress" ADD CONSTRAINT "QuranStudentProgress_lastTeacherId_fkey"
  FOREIGN KEY ("lastTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuranBookmark" ADD CONSTRAINT "QuranBookmark_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuranBookmark" ADD CONSTRAINT "QuranBookmark_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuranBookmark" ADD CONSTRAINT "QuranBookmark_pageNumber_fkey"
  FOREIGN KEY ("pageNumber") REFERENCES "QuranPage"("pageNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
