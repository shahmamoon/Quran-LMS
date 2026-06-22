-- AlterTable
ALTER TABLE "User" ADD COLUMN     "zoomAccessToken" TEXT,
ADD COLUMN     "zoomRefreshToken" TEXT,
ADD COLUMN     "zoomTokenExpiry" TIMESTAMP(3);
