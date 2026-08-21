-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "firmId" TEXT;

-- CreateIndex
CREATE INDEX "OutboxEvent_firmId_status_idx" ON "OutboxEvent"("firmId", "status");

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
