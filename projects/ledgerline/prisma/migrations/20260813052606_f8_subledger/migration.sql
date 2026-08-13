-- CreateEnum
CREATE TYPE "SubledgerType" AS ENUM ('CUSTOMER', 'VENDOR', 'SHAREHOLDER', 'OTHER');

-- CreateEnum
CREATE TYPE "SubledgerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Subledger" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SubledgerType" NOT NULL DEFAULT 'OTHER',
    "status" "SubledgerStatus" NOT NULL DEFAULT 'ACTIVE',
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subledger_firmId_clientId_type_idx" ON "Subledger"("firmId", "clientId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Subledger_clientId_code_key" ON "Subledger"("clientId", "code");

-- AddForeignKey
ALTER TABLE "Subledger" ADD CONSTRAINT "Subledger_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subledger" ADD CONSTRAINT "Subledger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
