-- CreateEnum: UserStatus — replaces the isActive boolean with a 3-state enum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- AddColumn: status with default ACTIVE so every existing row gets ACTIVE
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Migrate existing archived users (isActive = false → ARCHIVED)
UPDATE "User" SET "status" = 'ARCHIVED' WHERE "isActive" = false;

-- DropColumn: isActive is now superseded by status
ALTER TABLE "User" DROP COLUMN "isActive";

-- Index for fast status-filtered queries (admin user list, login check)
CREATE INDEX "User_status_idx" ON "User"("status");
