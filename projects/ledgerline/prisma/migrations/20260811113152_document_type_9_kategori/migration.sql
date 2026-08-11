-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'FINANCIAL_STATEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'GENERAL_JOURNAL';
ALTER TYPE "DocumentType" ADD VALUE 'PAYABLES_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'RECEIVABLES_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'INVENTORY_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'PAYROLL_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'TAX_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'OTHER';
