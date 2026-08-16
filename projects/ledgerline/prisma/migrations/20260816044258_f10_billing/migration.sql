-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('QUOTA_ONLY');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "quotaMonthly" INTEGER;

-- AlterTable
ALTER TABLE "Firm" ADD COLUMN     "annualPaidAt" TIMESTAMP(3),
ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'QUOTA_ONLY';

-- CreateTable
CREATE TABLE "UsageMeter" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "overQuota" INTEGER NOT NULL DEFAULT 0,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageMeter_firmId_period_idx" ON "UsageMeter"("firmId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMeter_clientId_period_key" ON "UsageMeter"("clientId", "period");

-- AddForeignKey
ALTER TABLE "UsageMeter" ADD CONSTRAINT "UsageMeter_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMeter" ADD CONSTRAINT "UsageMeter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
