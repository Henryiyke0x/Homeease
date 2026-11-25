CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

ALTER TABLE "BookingRequest"
    ADD COLUMN "savedAddressId" TEXT;

CREATE INDEX "BookingRequest_savedAddressId_idx" ON "BookingRequest"("savedAddressId");

ALTER TABLE "BookingRequest"
    ADD CONSTRAINT "BookingRequest_savedAddressId_fkey"
    FOREIGN KEY ("savedAddressId") REFERENCES "Address"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
