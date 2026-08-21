-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Industry" ADD VALUE 'MANUFACTURING';
ALTER TYPE "Industry" ADD VALUE 'CONSTRUCTION';
ALTER TYPE "Industry" ADD VALUE 'PROPERTY';
ALTER TYPE "Industry" ADD VALUE 'HOSPITALITY';
ALTER TYPE "Industry" ADD VALUE 'HEALTHCARE';
ALTER TYPE "Industry" ADD VALUE 'EDUCATION';
ALTER TYPE "Industry" ADD VALUE 'COOPERATIVE';
ALTER TYPE "Industry" ADD VALUE 'NONPROFIT';
ALTER TYPE "Industry" ADD VALUE 'AGRICULTURE';
ALTER TYPE "Industry" ADD VALUE 'TRANSPORT';
ALTER TYPE "Industry" ADD VALUE 'TECHNOLOGY';
ALTER TYPE "Industry" ADD VALUE 'FINANCE';
ALTER TYPE "Industry" ADD VALUE 'EVENT';
ALTER TYPE "Industry" ADD VALUE 'OTHER';
