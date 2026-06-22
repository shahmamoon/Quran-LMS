-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('QUEUED', 'DRAFTING', 'DRAFTED', 'PUBLISHED', 'ERROR');

-- CreateTable
CREATE TABLE "BlogTopic" (
    "id" TEXT NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "seoKeyword" TEXT,
    "geoQuery" TEXT,
    "cluster" TEXT,
    "intent" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "status" "TopicStatus" NOT NULL DEFAULT 'QUEUED',
    "notes" TEXT,
    "lastError" TEXT,
    "postId" TEXT,
    "draftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogTopic_postId_key" ON "BlogTopic"("postId");

-- CreateIndex
CREATE INDEX "BlogTopic_status_priority_idx" ON "BlogTopic"("status", "priority");

-- AddForeignKey
ALTER TABLE "BlogTopic" ADD CONSTRAINT "BlogTopic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
