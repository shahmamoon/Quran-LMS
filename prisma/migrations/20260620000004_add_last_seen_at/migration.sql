-- Add lastSeenAt to User for online presence tracking
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
