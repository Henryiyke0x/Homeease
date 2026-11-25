CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

ALTER TABLE "BookingRequest"
    ADD COLUMN "serviceId" TEXT;

CREATE INDEX "BookingRequest_serviceId_idx" ON "BookingRequest"("serviceId");

ALTER TABLE "BookingRequest"
    ADD CONSTRAINT "BookingRequest_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
