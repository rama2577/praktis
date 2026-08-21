-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_clientId_key" ON "ClientPortalToken"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_token_key" ON "ClientPortalToken"("token");

-- CreateIndex
CREATE INDEX "ClientPortalToken_token_idx" ON "ClientPortalToken"("token");

-- AddForeignKey
ALTER TABLE "ClientPortalToken" ADD CONSTRAINT "ClientPortalToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
