-- CreateEnum
CREATE TYPE "IslamicContentType" AS ENUM ('DUA', 'SALAH', 'WUDU', 'KALIMA');

-- CreateTable: IslamicCategory
CREATE TABLE "IslamicCategory" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "type"        "IslamicContentType" NOT NULL,
    "description" TEXT,
    "icon"        TEXT,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IslamicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IslamicItem — unified content model
CREATE TABLE "IslamicItem" (
    "id"                 TEXT NOT NULL,
    "categoryId"         TEXT NOT NULL,
    "type"               "IslamicContentType" NOT NULL,
    "title"              TEXT NOT NULL,
    "arabicText"         TEXT,
    "transliteration"    TEXT,
    "englishTranslation" TEXT,
    "urduTranslation"    TEXT,
    "stepNumber"         INTEGER,
    "prayerName"         TEXT,
    "rakatCount"         INTEGER,
    "rakatType"          TEXT,
    "imageUrl"           TEXT,
    "audioUrl"           TEXT,
    "order"              INTEGER NOT NULL DEFAULT 0,
    "isActive"           BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IslamicItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IslamicProgress — student completion tracking
CREATE TABLE "IslamicProgress" (
    "id"          TEXT NOT NULL,
    "studentId"   TEXT NOT NULL,
    "teacherId"   TEXT,
    "itemId"      TEXT NOT NULL,
    "completed"   BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IslamicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IslamicBookmark
CREATE TABLE "IslamicBookmark" (
    "id"        TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "itemId"    TEXT NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IslamicBookmark_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "IslamicCategory_slug_key"           ON "IslamicCategory"("slug");
CREATE UNIQUE INDEX "IslamicProgress_studentId_itemId_key" ON "IslamicProgress"("studentId", "itemId");

-- Indexes
CREATE INDEX "IslamicItem_categoryId_idx" ON "IslamicItem"("categoryId");
CREATE INDEX "IslamicItem_type_idx"       ON "IslamicItem"("type");

CREATE INDEX "IslamicProgress_studentId_idx" ON "IslamicProgress"("studentId");
CREATE INDEX "IslamicProgress_itemId_idx"    ON "IslamicProgress"("itemId");

CREATE INDEX "IslamicBookmark_studentId_idx" ON "IslamicBookmark"("studentId");
CREATE INDEX "IslamicBookmark_itemId_idx"    ON "IslamicBookmark"("itemId");

-- Foreign keys
ALTER TABLE "IslamicItem"
    ADD CONSTRAINT "IslamicItem_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "IslamicCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IslamicProgress"
    ADD CONSTRAINT "IslamicProgress_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "IslamicProgress_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "IslamicProgress_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "IslamicItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IslamicBookmark"
    ADD CONSTRAINT "IslamicBookmark_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "IslamicBookmark_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "IslamicBookmark_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "IslamicItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
