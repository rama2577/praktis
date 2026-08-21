-- CreateTable
CREATE TABLE "OcrMetric" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "usedVision" BOOLEAN NOT NULL DEFAULT false,
    "usedStrong" BOOLEAN NOT NULL DEFAULT false,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "textChars" INTEGER NOT NULL DEFAULT 0,
    "estTokens" INTEGER NOT NULL DEFAULT 0,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrMetric_firmId_createdAt_idx" ON "OcrMetric"("firmId", "createdAt");

-- CreateIndex
CREATE INDEX "OcrMetric_engine_idx" ON "OcrMetric"("engine");
