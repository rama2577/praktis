-- CreateTable
CREATE TABLE "JournalCorrection" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "userId" TEXT,
    "stage" "ReviewStage" NOT NULL,
    "field" TEXT NOT NULL,
    "accountCode" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalCorrection_firmId_createdAt_idx" ON "JournalCorrection"("firmId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalCorrection_journalEntryId_idx" ON "JournalCorrection"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalCorrection_firmId_accountCode_idx" ON "JournalCorrection"("firmId", "accountCode");

-- AddForeignKey
ALTER TABLE "JournalCorrection" ADD CONSTRAINT "JournalCorrection_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCorrection" ADD CONSTRAINT "JournalCorrection_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCorrection" ADD CONSTRAINT "JournalCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
