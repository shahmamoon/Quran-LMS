-- Add optional teacherId to StudentSubject (assigned teacher for this enrollment)
ALTER TABLE "StudentSubject" ADD COLUMN "teacherId" TEXT;

ALTER TABLE "StudentSubject" ADD CONSTRAINT "StudentSubject_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StudentSubject_teacherId_idx" ON "StudentSubject"("teacherId");
