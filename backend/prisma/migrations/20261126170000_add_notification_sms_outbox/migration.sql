ALTER TABLE "Notification"
  ADD COLUMN "smsStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "smsAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "smsLastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "smsSentAt" TIMESTAMP(3),
  ADD COLUMN "smsLastError" TEXT;

UPDATE "Notification" SET "smsStatus" = 'SKIPPED' WHERE "smsStatus" = 'PENDING';
