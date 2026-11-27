CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'INITIALIZING',
    "customerNote" TEXT,
    "merchantNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Refund_providerRef_key" ON "Refund"("providerRef");
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");
CREATE INDEX "Refund_paymentId_status_createdAt_idx" ON "Refund"("paymentId", "status", "createdAt");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
