ALTER TABLE "Payment" ADD COLUMN "checkoutUrl" TEXT;

CREATE INDEX "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");
