-- CreateEnum
CREATE TYPE "TajweedCategory" AS ENUM ('NUN_SAKINA_TANWEEN', 'MEEM_SAKINA', 'MADD', 'HEAVY_LIGHT', 'STOPPING_WAQF', 'RECITATION_STYLE');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('RECITATION', 'HIFZ', 'REVISION');

-- CreateEnum
CREATE TYPE "RecitationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR');

-- CreateTable: QuranPage (reference data, seeded once)
CREATE TABLE "QuranPage" (
    "pageNumber"     INTEGER NOT NULL,
    "juzNumber"      INTEGER NOT NULL,
    "hizbNumber"     INTEGER NOT NULL,
    "surahNumber"    INTEGER NOT NULL,
    "surahNameEn"    TEXT NOT NULL,
    "surahNameAr"    TEXT NOT NULL,
    "ayahStart"      INTEGER NOT NULL,
    "isStartOfSurah" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuranPage_pkey" PRIMARY KEY ("pageNumber")
);

CREATE INDEX "QuranPage_juzNumber_idx" ON "QuranPage"("juzNumber");
CREATE INDEX "QuranPage_surahNumber_idx" ON "QuranPage"("surahNumber");

-- CreateTable: TajweedRule (lookup, seeded once)
CREATE TABLE "TajweedRule" (
    "id"          TEXT NOT NULL,
    "nameEn"      TEXT NOT NULL,
    "nameAr"      TEXT NOT NULL,
    "category"    "TajweedCategory" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TajweedRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecitationSession
CREATE TABLE "RecitationSession" (
    "id"            TEXT NOT NULL,
    "studentId"     TEXT NOT NULL,
    "teacherId"     TEXT NOT NULL,
    "zoomSessionId" TEXT,
    "trackType"     "TrackType" NOT NULL DEFAULT 'RECITATION',
    "status"        "RecitationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt"   TIMESTAMP(3) NOT NULL,
    "startedAt"     TIMESTAMP(3),
    "endedAt"       TIMESTAMP(3),
    "durationMins"  INTEGER,
    "overallNotes"  TEXT,
    "audioUrl"      TEXT,

    CONSTRAINT "RecitationSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecitationSession_studentId_scheduledAt_idx" ON "RecitationSession"("studentId", "scheduledAt");
CREATE INDEX "RecitationSession_teacherId_scheduledAt_idx" ON "RecitationSession"("teacherId", "scheduledAt");
CREATE INDEX "RecitationSession_studentId_status_idx" ON "RecitationSession"("studentId", "status");

-- CreateTable: PageAttempt (append-only event log)
CREATE TABLE "PageAttempt" (
    "id"           TEXT NOT NULL,
    "sessionId"    TEXT NOT NULL,
    "studentId"    TEXT NOT NULL,
    "teacherId"    TEXT NOT NULL,
    "pageNumber"   INTEGER NOT NULL,
    "attemptOrder" INTEGER NOT NULL,
    "status"       "PageStatus" NOT NULL,
    "masteryScore" INTEGER,
    "teacherNotes" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageAttempt_studentId_pageNumber_idx" ON "PageAttempt"("studentId", "pageNumber");
CREATE INDEX "PageAttempt_studentId_createdAt_idx" ON "PageAttempt"("studentId", "createdAt");
CREATE INDEX "PageAttempt_teacherId_createdAt_idx" ON "PageAttempt"("teacherId", "createdAt");
CREATE INDEX "PageAttempt_pageNumber_idx" ON "PageAttempt"("pageNumber");
CREATE INDEX "PageAttempt_sessionId_attemptOrder_idx" ON "PageAttempt"("sessionId", "attemptOrder");

-- CreateTable: PageError (normalized Tajweed errors)
CREATE TABLE "PageError" (
    "id"         TEXT NOT NULL,
    "attemptId"  TEXT NOT NULL,
    "ruleId"     TEXT NOT NULL,
    "ayahNumber" INTEGER,
    "wordNumber" INTEGER,
    "severity"   "ErrorSeverity" NOT NULL,
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageError_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageError_attemptId_idx" ON "PageError"("attemptId");
CREATE INDEX "PageError_ruleId_idx" ON "PageError"("ruleId");
CREATE INDEX "PageError_attemptId_ruleId_idx" ON "PageError"("attemptId", "ruleId");

-- AddForeignKey
ALTER TABLE "RecitationSession" ADD CONSTRAINT "RecitationSession_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecitationSession" ADD CONSTRAINT "RecitationSession_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageAttempt" ADD CONSTRAINT "PageAttempt_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "RecitationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PageAttempt" ADD CONSTRAINT "PageAttempt_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PageAttempt" ADD CONSTRAINT "PageAttempt_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PageAttempt" ADD CONSTRAINT "PageAttempt_pageNumber_fkey"
    FOREIGN KEY ("pageNumber") REFERENCES "QuranPage"("pageNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageError" ADD CONSTRAINT "PageError_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "PageAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageError" ADD CONSTRAINT "PageError_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "TajweedRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Materialized view: student_page_progress ─────────────────────────────────
-- Prisma uses camelCase column names (quoted). All column references must match.
-- Refreshed after every RecitationSession is closed (status → COMPLETED).
-- Do NOT dual-write to this — it is always derived from PageAttempt rows.

CREATE MATERIALIZED VIEW student_page_progress AS
SELECT
    pa."studentId"                                          AS "studentId",
    pa."pageNumber"                                         AS "pageNumber",
    qp."juzNumber"                                         AS "juzNumber",
    qp."surahNameEn"                                       AS "surahNameEn",
    qp."surahNameAr"                                       AS "surahNameAr",
    -- Most recent status for this student × page
    (
        SELECT inner_pa."status"
        FROM "PageAttempt" inner_pa
        WHERE inner_pa."studentId" = pa."studentId"
          AND inner_pa."pageNumber" = pa."pageNumber"
        ORDER BY inner_pa."createdAt" DESC
        LIMIT 1
    )                                                       AS "currentStatus",
    -- Most recent non-null mastery score
    (
        SELECT inner_pa."masteryScore"
        FROM "PageAttempt" inner_pa
        WHERE inner_pa."studentId" = pa."studentId"
          AND inner_pa."pageNumber" = pa."pageNumber"
          AND inner_pa."masteryScore" IS NOT NULL
        ORDER BY inner_pa."createdAt" DESC
        LIMIT 1
    )                                                       AS "masteryScore",
    COUNT(*)                                               AS "attemptCount",
    MIN(pa."createdAt")                                    AS "firstTaughtAt",
    MAX(pa."createdAt")                                    AS "lastTaughtAt",
    -- Count of MAJOR errors across all attempts (unresolved indicator)
    (
        SELECT COUNT(*)
        FROM "PageError" pe
        JOIN "PageAttempt" err_pa ON err_pa."id" = pe."attemptId"
        WHERE err_pa."studentId" = pa."studentId"
          AND err_pa."pageNumber" = pa."pageNumber"
          AND pe."severity" = 'MAJOR'
    )                                                       AS "majorErrorCount"

FROM "PageAttempt" pa
JOIN "QuranPage" qp ON qp."pageNumber" = pa."pageNumber"
GROUP BY
    pa."studentId",
    pa."pageNumber",
    qp."juzNumber",
    qp."surahNameEn",
    qp."surahNameAr";

-- Unique index required for REFRESH CONCURRENTLY (used in prod so reads aren't blocked)
CREATE UNIQUE INDEX spp_student_page_uidx ON student_page_progress ("studentId", "pageNumber");
CREATE INDEX spp_student_juz_idx          ON student_page_progress ("studentId", "juzNumber");
CREATE INDEX spp_student_status_idx       ON student_page_progress ("studentId", "currentStatus");
CREATE INDEX spp_page_status_idx          ON student_page_progress ("pageNumber", "currentStatus");

-- Helper function: refresh without blocking reads
CREATE OR REPLACE FUNCTION refresh_student_page_progress()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY student_page_progress;
END;
$$;
