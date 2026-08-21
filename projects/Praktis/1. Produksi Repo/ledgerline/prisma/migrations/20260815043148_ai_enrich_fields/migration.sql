-- CreateEnum
CREATE TYPE "EnrichSource" AS ENUM ('MANUAL', 'RULE', 'AI');

-- AlterTable
ALTER TABLE "JournalLine" ADD COLUMN     "aiDescription" TEXT,
ADD COLUMN     "descriptionSource" "EnrichSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "enrichConfidence" DOUBLE PRECISION,
ADD COLUMN     "enrichedAt" TIMESTAMP(3);
