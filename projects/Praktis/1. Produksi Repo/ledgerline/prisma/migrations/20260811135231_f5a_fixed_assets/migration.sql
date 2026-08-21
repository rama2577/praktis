-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'DISPOSED');

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "assetId" TEXT;

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseCost" DECIMAL(65,30) NOT NULL,
    "residualValue" DECIMAL(65,30) NOT NULL,
    "method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "commercialLifeMonths" INTEGER NOT NULL,
    "fiscalGroup" TEXT NOT NULL,
    "notes" TEXT,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationSchedule" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "commercialAmount" DECIMAL(65,30) NOT NULL,
    "fiscalAmount" DECIMAL(65,30) NOT NULL,
    "accumulatedCommercial" DECIMAL(65,30) NOT NULL,
    "accumulatedFiscal" DECIMAL(65,30) NOT NULL,
    "bookValueCommercial" DECIMAL(65,30) NOT NULL,
    "bookValueFiscal" DECIMAL(65,30) NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedAsset_firmId_clientId_idx" ON "FixedAsset"("firmId", "clientId");

-- CreateIndex
CREATE INDEX "DepreciationSchedule_period_idx" ON "DepreciationSchedule"("period");

-- CreateIndex
CREATE UNIQUE INDEX "DepreciationSchedule_assetId_period_key" ON "DepreciationSchedule"("assetId", "period");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationSchedule" ADD CONSTRAINT "DepreciationSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationSchedule" ADD CONSTRAINT "DepreciationSchedule_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
