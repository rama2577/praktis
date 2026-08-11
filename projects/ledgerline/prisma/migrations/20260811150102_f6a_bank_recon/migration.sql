-- CreateEnum
CREATE TYPE "BankMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'MANUAL');

-- CreateTable
CREATE TABLE "BankMutation" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "documentId" TEXT,
    "matchedJournalId" TEXT,
    "matchStatus" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankMutation_firmId_clientId_period_idx" ON "BankMutation"("firmId", "clientId", "period");

-- AddForeignKey
ALTER TABLE "BankMutation" ADD CONSTRAINT "BankMutation_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMutation" ADD CONSTRAINT "BankMutation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMutation" ADD CONSTRAINT "BankMutation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMutation" ADD CONSTRAINT "BankMutation_matchedJournalId_fkey" FOREIGN KEY ("matchedJournalId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
