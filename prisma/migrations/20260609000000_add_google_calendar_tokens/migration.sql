-- AlterTable: add Google Calendar OAuth tokens to User
ALTER TABLE "User" ADD COLUMN "googleAccessToken" TEXT,
                   ADD COLUMN "googleRefreshToken" TEXT,
                   ADD COLUMN "googleTokenExpiry" TIMESTAMP(3);

-- AlterTable: add Google Calendar event ID to Session
ALTER TABLE "Session" ADD COLUMN "googleCalendarEventId" TEXT;
