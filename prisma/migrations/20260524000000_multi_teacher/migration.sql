-- CreateTable: SubjectTeacher junction
CREATE TABLE "SubjectTeacher" (
    "subjectId"  TEXT NOT NULL,
    "teacherId"  TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectTeacher_pkey" PRIMARY KEY ("subjectId", "teacherId")
);

-- CreateIndex
CREATE INDEX "SubjectTeacher_teacherId_idx" ON "SubjectTeacher"("teacherId");
CREATE INDEX "SubjectTeacher_subjectId_idx"  ON "SubjectTeacher"("subjectId");

-- Migrate existing single-teacher assignments into the junction table
INSERT INTO "SubjectTeacher" ("subjectId", "teacherId")
SELECT "id", "teacherId" FROM "Subject" WHERE "teacherId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- AddForeignKey
ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectTeacher" ADD CONSTRAINT "SubjectTeacher_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old column (data already migrated above)
ALTER TABLE "Subject" DROP COLUMN "teacherId";
