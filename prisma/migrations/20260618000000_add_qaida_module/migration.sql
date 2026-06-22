-- CreateEnum
CREATE TYPE "QaidaProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVISION_REQUIRED');

-- CreateTable: QaidaBook — registry of books (Noorani Qaida, Madani Qaida, …)
CREATE TABLE "QaidaBook" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "totalPages"  INTEGER NOT NULL,
    "imageFolder" TEXT NOT NULL DEFAULT 'Qaida',
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaidaBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QaidaStudentProgress — upsertable current lesson state
CREATE TABLE "QaidaStudentProgress" (
    "id"                   TEXT NOT NULL,
    "studentId"            TEXT NOT NULL,
    "teacherId"            TEXT,
    "bookId"               TEXT NOT NULL,
    "currentPage"          INTEGER NOT NULL DEFAULT 1,
    "completedPages"       INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"               "QaidaProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastLessonDate"       TIMESTAMP(3),
    "teacherNotes"         TEXT,
    "nextPage"             INTEGER,
    "revisionRequired"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaidaStudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QaidaBookmark — teacher bookmarks for a student's page
CREATE TABLE "QaidaBookmark" (
    "id"         TEXT NOT NULL,
    "teacherId"  TEXT NOT NULL,
    "studentId"  TEXT NOT NULL,
    "bookId"     TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaidaBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QaidaLessonNote — teacher notes per teaching event
CREATE TABLE "QaidaLessonNote" (
    "id"               TEXT NOT NULL,
    "studentId"        TEXT NOT NULL,
    "teacherId"        TEXT NOT NULL,
    "bookId"           TEXT NOT NULL,
    "pageNumber"       INTEGER NOT NULL,
    "lessonDate"       TIMESTAMP(3) NOT NULL,
    "note"             TEXT NOT NULL,
    "nextPage"         INTEGER,
    "revisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaidaLessonNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QaidaLessonHistory — append-only history, one row per page taught
CREATE TABLE "QaidaLessonHistory" (
    "id"         TEXT NOT NULL,
    "studentId"  TEXT NOT NULL,
    "teacherId"  TEXT NOT NULL,
    "bookId"     TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "lessonDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note"       TEXT,
    "nextPage"   INTEGER,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaidaLessonHistory_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "QaidaBook_slug_key" ON "QaidaBook"("slug");
CREATE UNIQUE INDEX "QaidaStudentProgress_studentId_bookId_key" ON "QaidaStudentProgress"("studentId", "bookId");

-- Indexes for common query patterns
CREATE INDEX "QaidaStudentProgress_studentId_idx"  ON "QaidaStudentProgress"("studentId");
CREATE INDEX "QaidaStudentProgress_bookId_idx"     ON "QaidaStudentProgress"("bookId");
CREATE INDEX "QaidaStudentProgress_teacherId_idx"  ON "QaidaStudentProgress"("teacherId");

CREATE INDEX "QaidaBookmark_teacherId_studentId_idx" ON "QaidaBookmark"("teacherId", "studentId");
CREATE INDEX "QaidaBookmark_studentId_idx"            ON "QaidaBookmark"("studentId");
CREATE INDEX "QaidaBookmark_bookId_idx"               ON "QaidaBookmark"("bookId");

CREATE INDEX "QaidaLessonNote_studentId_bookId_idx" ON "QaidaLessonNote"("studentId", "bookId");
CREATE INDEX "QaidaLessonNote_teacherId_idx"         ON "QaidaLessonNote"("teacherId");
CREATE INDEX "QaidaLessonNote_pageNumber_idx"        ON "QaidaLessonNote"("pageNumber");

CREATE INDEX "QaidaLessonHistory_studentId_bookId_idx" ON "QaidaLessonHistory"("studentId", "bookId");
CREATE INDEX "QaidaLessonHistory_teacherId_idx"         ON "QaidaLessonHistory"("teacherId");

-- Foreign keys
ALTER TABLE "QaidaStudentProgress"
    ADD CONSTRAINT "QaidaStudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaStudentProgress_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaStudentProgress_bookId_fkey"    FOREIGN KEY ("bookId")    REFERENCES "QaidaBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QaidaBookmark"
    ADD CONSTRAINT "QaidaBookmark_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaBookmark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaBookmark_bookId_fkey"    FOREIGN KEY ("bookId")    REFERENCES "QaidaBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QaidaLessonNote"
    ADD CONSTRAINT "QaidaLessonNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaLessonNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaLessonNote_bookId_fkey"    FOREIGN KEY ("bookId")    REFERENCES "QaidaBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QaidaLessonHistory"
    ADD CONSTRAINT "QaidaLessonHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaLessonHistory_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "QaidaLessonHistory_bookId_fkey"    FOREIGN KEY ("bookId")    REFERENCES "QaidaBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
