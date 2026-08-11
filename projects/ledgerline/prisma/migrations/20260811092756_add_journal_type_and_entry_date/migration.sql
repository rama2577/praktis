-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('AI', 'MANUAL', 'ADJUSTING');

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "journalType" "JournalType" NOT NULL DEFAULT 'AI';
