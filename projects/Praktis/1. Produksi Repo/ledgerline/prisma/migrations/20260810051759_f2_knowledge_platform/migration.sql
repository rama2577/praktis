-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('NONE', 'LEARNING', 'REVIEW', 'READY');

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "changeNote" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "coaMapping" JSONB NOT NULL DEFAULT '{}',
    "reportTemplates" JSONB NOT NULL DEFAULT '{}',
    "rules" JSONB NOT NULL DEFAULT '{}',
    "mappingStatus" "ProfileStatus" NOT NULL DEFAULT 'NONE',
    "sourcePeriod" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeItem_supersedesId_key" ON "KnowledgeItem"("supersedesId");

-- CreateIndex
CREATE INDEX "KnowledgeItem_category_name_status_idx" ON "KnowledgeItem"("category", "name", "status");

-- CreateIndex
CREATE INDEX "KnowledgeItem_effectiveDate_idx" ON "KnowledgeItem"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeItem_category_name_version_key" ON "KnowledgeItem"("category", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_clientId_key" ON "ClientProfile"("clientId");

-- CreateIndex
CREATE INDEX "ClientProfile_firmId_idx" ON "ClientProfile"("firmId");

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "KnowledgeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
