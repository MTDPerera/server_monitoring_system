-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "sslExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
