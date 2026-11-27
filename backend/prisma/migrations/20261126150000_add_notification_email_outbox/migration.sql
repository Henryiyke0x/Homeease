ALTER TABLE "Notification"
    ADD COLUMN "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "emailAttemptCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "emailLastAttemptAt" TIMESTAMP(3),
    ADD COLUMN "emailSentAt" TIMESTAMP(3),
    ADD COLUMN "emailLastError" TEXT;

CREATE INDEX "Notification_emailStatus_emailLastAttemptAt_idx"
ON "Notification"("emailStatus", "emailLastAttemptAt");
