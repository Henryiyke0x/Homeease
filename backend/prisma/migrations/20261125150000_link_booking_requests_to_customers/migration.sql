ALTER TABLE "BookingRequest"
    ADD COLUMN "customerId" TEXT;

CREATE INDEX "BookingRequest_customerId_createdAt_idx"
    ON "BookingRequest"("customerId", "createdAt");

ALTER TABLE "BookingRequest"
    ADD CONSTRAINT "BookingRequest_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
