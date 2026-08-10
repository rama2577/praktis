-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "eventTypes" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT,
    "webhookId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "statusCode" INTEGER,
    "response" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookSubscription_firmId_enabled_idx" ON "WebhookSubscription"("firmId", "enabled");

-- CreateIndex
CREATE INDEX "NotificationLog_outboxId_idx" ON "NotificationLog"("outboxId");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "OutboxEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
